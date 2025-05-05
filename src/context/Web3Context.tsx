import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import axios from 'axios';
import { createMetaTransaction, executeMetaTransaction } from '@/utils/metaTransactions';

// Enhanced ABI for the voting contract
const VotingContractABI = [
  "function registerVoter(address _voterAddress) public",
  "function addCandidate(string memory _name, string memory _party, string memory _imageUrl) public",
  "function castVote(uint256 _candidateId) public",
  "function getCandidateCount() public view returns(uint256)",
  "function getCandidate(uint256 _candidateId) public view returns(uint256, string memory, string memory, string memory, uint256)",
  "function getVoterStatus(address _voterAddress) public view returns(bool, bool)",
  "function isAdmin(address _address) public view returns(bool)",
  "function getNonce(address user) public view returns(uint256)",
  "function executeMetaTransaction(address userAddress, bytes memory functionSignature, bytes32 sigR, bytes32 sigS, uint8 sigV) public returns (bytes memory)",
  "function setElectionPeriod(uint256 _startTime, uint256 _endTime) public",
  "function setResultsPublished(bool _published) public",
  "function setRealTimeResults(bool _enabled) public",
  "function disqualifyCandidate(uint256 _candidateId) public",
  "function canViewResults(address _voterAddress) public view returns(bool)",
  "function getElectionStatus() public view returns(uint256 startTime, uint256 endTime, bool resultsPublished, bool realTimeResults)"
];

interface ElectionSettings {
  startTime: number;
  endTime: number;
  resultsPublished: boolean;
  realTimeResults: boolean;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  imageUrl: string;
  voteCount: number;
  position: string;
  isActive: boolean;
}

interface VoterStatus {
  isRegistered: boolean;
  hasVoted: boolean;
}

interface KycStatus {
  status: 'not submitted' | 'pending' | 'approved' | 'rejected';
  feedback?: string;
  submittedAt?: Date;
}

interface Web3ContextProps {
  account: string | null;
  isAdmin: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  candidates: Candidate[];
  voterStatus: VoterStatus;
  kycStatus: KycStatus;
  electionSettings: ElectionSettings | null;
  canViewResults: boolean;
  fetchCandidates: () => Promise<void>;
  fetchKycStatus: () => Promise<void>;
  addCandidate: (name: string, party: string, position: string, imageUrl?: string) => Promise<void>;
  castVote: (candidateId: number, position: string) => Promise<void>;
  registerVoter: (address: string) => Promise<void>;
  fetchVoterStatus: () => Promise<void>;
  disqualifyCandidate: (candidateId: number) => Promise<void>;
  setElectionPeriod: (startTime: number, endTime: number) => Promise<void>;
  setResultsPublished: (published: boolean) => Promise<void>;
  setRealTimeResults: (enabled: boolean) => Promise<void>;
  fetchElectionSettings: () => Promise<void>;
  fetchCanViewResults: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextProps>({} as Web3ContextProps);

export const useWeb3 = () => useContext(Web3Context);

interface Web3ProviderProps {
  children: ReactNode;
}

// In a real dApp, you would replace this with your deployed contract address
const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Backend API URL - update this with your actual backend URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
// Relayer URL
const RELAYER_URL = `${API_URL}/relay/vote`;

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterStatus, setVoterStatus] = useState<VoterStatus>({ isRegistered: false, hasVoted: false });
  const [kycStatus, setKycStatus] = useState<KycStatus>({ status: 'not submitted' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [electionSettings, setElectionSettings] = useState<ElectionSettings | null>(null);
  const [canViewResults, setCanViewResults] = useState(false);

  // Initialize provider when window loads
  useEffect(() => {
    const init = async () => {
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        // Create provider
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            fetchVoterStatus();
            fetchKycStatus();
            checkIfAdmin(accounts[0]);
          } else {
            setAccount(null);
            setIsAdmin(false);
            setKycStatus({ status: 'not submitted' });
          }
        });
        
        // Check if already connected
        try {
          const accounts = await web3Provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            // Create contract instance
            const signer = web3Provider.getSigner();
            const votingContract = new ethers.Contract(CONTRACT_ADDRESS, VotingContractABI, signer);
            setContract(votingContract);
            
            await fetchVoterStatus();
            await fetchKycStatus();
            await checkIfAdmin(accounts[0]);
            await fetchCandidates();
          }
        } catch (error) {
          console.error("Failed to check existing connection:", error);
        }
      } else {
        toast.error("MetaMask is not installed. Please install MetaMask to use this application.");
      }
    };
    
    init();
    
    return () => {
      // Clean up listeners when component unmounts
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error("MetaMask is not installed. Please install MetaMask to use this application.");
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Create contract instance
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = web3Provider.getSigner();
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, VotingContractABI, signer);
        
        setProvider(web3Provider);
        setContract(votingContract);
        
        await fetchVoterStatus();
        await fetchKycStatus();
        await checkIfAdmin(accounts[0]);
        await fetchCandidates();
        
        toast.success("Wallet connected successfully!");
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      toast.error("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchKycStatus = async () => {
    if (!account) {
      setKycStatus({ status: 'not submitted' });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/kyc/status/${account}`);
      if (response.status === 200) {
        setKycStatus({
          status: response.data.status,
          feedback: response.data.feedback,
          submittedAt: new Date(response.data.submittedAt)
        });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // 404 means no KYC found, which is a normal state
        setKycStatus({ status: 'not submitted' });
      } else {
        console.error("Error fetching KYC status:", error);
        // Keep the current status in case of error
      }
    }
  };

  const fetchCandidates = async () => {
    try {
      // Try to fetch from real backend
      try {
        const response = await axios.get(`${API_URL}/candidates`);
        if (response.status === 200) {
          setCandidates(response.data.map((candidate: any, index: number) => ({
            id: candidate._id || index + 1,
            name: candidate.name,
            party: candidate.party,
            imageUrl: candidate.imageUrl || '/placeholder.svg',
            voteCount: candidate.voteCount || 0,
            position: candidate.position || '',
            isActive: candidate.isActive || true
          })));
          return;
        }
      } catch (apiError) {
        console.log('Candidates API not available, trying contract');
      }

      // If API fails, try to get from contract
      if (contract) {
        try {
          const count = await contract.getCandidateCount();
          const candidatesList: Candidate[] = [];
          
          for (let i = 0; i < count; i++) {
            const [id, name, party, imageUrl, voteCount, position, isActive] = await contract.getCandidate(i);
            candidatesList.push({
              id: id.toNumber(),
              name,
              party,
              imageUrl,
              voteCount: voteCount.toNumber(),
              position,
              isActive
            });
          }
          
          setCandidates(candidatesList);
          return;
        } catch (contractError) {
          console.error("Error fetching candidates from contract:", contractError);
        }
      }

      toast.error("Failed to fetch candidates. Please try again later.");
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to fetch candidates.");
    }
  };

  const fetchVoterStatus = async () => {
    if (!contract || !account) {
      // For demo purposes, use mock data
      setVoterStatus({ isRegistered: true, hasVoted: false });
      return;
    }

    try {
      const [isRegistered, hasVoted] = await contract.getVoterStatus(account);
      setVoterStatus({ isRegistered, hasVoted });
    } catch (error) {
      console.error("Error fetching voter status:", error);
      toast.error("Failed to fetch voter status.");
    }
  };

  const checkIfAdmin = async (address: string) => {
    if (!contract) {
      // For demo purposes, use mock admin status (make the connected wallet admin)
      setIsAdmin(true);
      return;
    }

    try {
      const admin = await contract.isAdmin(address);
      setIsAdmin(admin);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const fetchElectionSettings = async () => {
    try {
      // Try to fetch from API first
      try {
        const response = await axios.get(`${API_URL}/election/settings`);
        if (response.status === 200) {
          setElectionSettings({
            startTime: new Date(response.data.startTime).getTime() / 1000,
            endTime: new Date(response.data.endTime).getTime() / 1000,
            resultsPublished: response.data.resultsPublished,
            realTimeResults: response.data.realTimeResults
          });
          return;
        }
      } catch (apiError) {
        console.log('Election settings API not available, using contract');
      }

      // Fallback to contract
      if (contract && account) {
        const [startTime, endTime, resultsPublished, realTimeResults] = await contract.getElectionStatus();
        setElectionSettings({
          startTime: startTime.toNumber(),
          endTime: endTime.toNumber(),
          resultsPublished,
          realTimeResults
        });
      }
    } catch (error) {
      console.error('Error fetching election settings:', error);
      toast.error('Failed to fetch election settings');
    }
  };

  const fetchCanViewResults = async () => {
    if (!account) {
      setCanViewResults(false);
      return;
    }

    try {
      // Try API first
      try {
        const response = await axios.get(`${API_URL}/election/can-view-results/${account}`);
        if (response.status === 200) {
          setCanViewResults(response.data.canView);
          return;
        }
      } catch (apiError) {
        console.log('Results visibility API not available, using contract');
      }

      // Fallback to contract
      if (contract && account) {
        const canView = await contract.canViewResults(account);
        setCanViewResults(canView);
      }
    } catch (error) {
      console.error('Error checking results visibility:', error);
      setCanViewResults(false);
    }
  };

  const addCandidate = async (name: string, party: string, position: string, imageUrl?: string) => {
    if (!isAdmin) {
      toast.error("Only admins can add candidates.");
      return;
    }

    try {
      if (!contract) {
        toast.error("Contract not initialized. Please connect your wallet.");
        return;
      }

      // Add candidate to blockchain first
      const tx = await contract.addCandidate(name, party, position);
      toast.info("Adding candidate... Please wait for confirmation.");
      
      const receipt = await tx.wait();
      
      // Get the candidate ID from the event
      const event = receipt.events?.find(e => e.event === 'CandidateAdded');
      const candidateId = event?.args?.candidateId.toNumber();
      
      if (!candidateId) {
        throw new Error('Failed to get candidate ID from event');
      }
      
      // Then add to API with the on-chain ID
      await axios.post(`${API_URL}/candidates`, { 
        name, 
        party, 
        position, 
        imageUrl: imageUrl || '/placeholder.svg',
        onChainId: candidateId
      });
      
      toast.success("Candidate added successfully!");
      await fetchCandidates();
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate.");
    }
  };

  const registerVoter = async (address: string) => {
    if (!contract) {
      toast.error("Contract not initialized. Please connect your wallet.");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admins can register voters.");
      return;
    }

    try {
      const tx = await contract.registerVoter(address);
      toast.info("Registering voter... Please wait for confirmation.");
      
      await tx.wait();
      toast.success("Voter registered successfully!");
      
      if (address === account) {
        await fetchVoterStatus();
      }
    } catch (error) {
      console.error("Error registering voter:", error);
      toast.error("Failed to register voter.");
    }
  };

  const castVote = async (candidateId: number, position: string) => {
    if (!account || !provider) {
      toast.error("Please connect your wallet to vote.");
      return;
    }

    if (!voterStatus.isRegistered) {
      toast.error("You are not registered to vote.");
      return;
    }

    if (voterStatus.hasVoted) {
      toast.error("You have already voted for this position.");
      return;
    }

    if (kycStatus.status !== 'approved') {
      toast.error("Your KYC must be approved before voting.");
      return;
    }

    try {
      // Use gasless transactions
      if (contract) {
        // Get the signer
        const signer = provider.getSigner();
        
        // Encode the function call
        const functionSignature = contract.interface.encodeFunctionData(
          'vote', [candidateId, position]
        );
        
        // Get the nonce for the user
        const nonce = await contract.getNonce(account);
        
        // Create meta transaction
        const metaTx = await createMetaTransaction(
          signer,
          CONTRACT_ADDRESS,
          functionSignature,
          nonce.toNumber()
        );
        
        // Send the meta transaction to the relayer
        toast.info("Casting your vote... Please wait for confirmation.");
        const txHash = await executeMetaTransaction(metaTx, RELAYER_URL);
        
        toast.success("Vote cast successfully!");
        
        await fetchVoterStatus();
        await fetchCandidates();
        await fetchCanViewResults();
      } else {
        toast.error("Contract not initialized. Please connect your wallet.");
      }
    } catch (error) {
      console.error("Error casting vote:", error);
      toast.error("Failed to cast vote.");
    }
  };

  const disqualifyCandidate = async (candidateId: number) => {
    if (!isAdmin) {
      toast.error("Only admins can disqualify candidates.");
      return;
    }

    try {
      if (!contract) {
        toast.error("Contract not initialized. Please connect your wallet.");
        return;
      }

      // Disqualify on blockchain
      const tx = await contract.disqualifyCandidate(candidateId);
      toast.info("Disqualifying candidate... Please wait for confirmation.");
      
      await tx.wait();
      
      // Find the candidate in our list
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        // Update in API
        await axios.put(`${API_URL}/candidates/${candidate.id}/disqualify`);
      }
      
      toast.success("Candidate disqualified successfully!");
      await fetchCandidates();
    } catch (error) {
      console.error("Error disqualifying candidate:", error);
      toast.error("Failed to disqualify candidate.");
    }
  };

  const setElectionPeriod = async (startTime: number, endTime: number) => {
    if (!isAdmin) {
      toast.error("Only admins can set election periods.");
      return;
    }

    try {
      if (!contract) {
        toast.error("Contract not initialized. Please connect your wallet.");
        return;
      }

      // Update on blockchain
      const tx = await contract.setElectionPeriod(startTime, endTime);
      toast.info("Setting election period... Please wait for confirmation.");
      
      await tx.wait();
      
      // Update in API
      await axios.post(`${API_URL}/election/settings`, { 
        startTime: new Date(startTime * 1000),
        endTime: new Date(endTime * 1000)
      });
      
      toast.success("Election period set successfully!");
      await fetchElectionSettings();
    } catch (error) {
      console.error("Error setting election period:", error);
      toast.error("Failed to set election period.");
    }
  };

  const setResultsPublished = async (published: boolean) => {
    if (!isAdmin) {
      toast.error("Only admins can publish results.");
      return;
    }

    try {
      if (!contract) {
        toast.error("Contract not initialized. Please connect your wallet.");
        return;
      }

      // Update on blockchain
      const tx = await contract.setResultsPublished(published);
      toast.info(`${published ? 'Publishing' : 'Hiding'} results... Please wait for confirmation.`);
      
      await tx.wait();
      
      // Update in API
      await axios.post(`${API_URL}/election/settings`, { resultsPublished: published });
      
      toast.success(`Results ${published ? 'published' : 'hidden'} successfully!`);
      await fetchElectionSettings();
      await fetchCanViewResults();
    } catch (error) {
      console.error("Error setting results publication:", error);
      toast.error(`Failed to ${published ? 'publish' : 'hide'} results.`);
    }
  };

  const setRealTimeResults = async (enabled: boolean) => {
    if (!isAdmin) {
      toast.error("Only admins can change real-time results settings.");
      return;
    }

    try {
      if (!contract) {
        toast.error("Contract not initialized. Please connect your wallet.");
        return;
      }

      // Update on blockchain
      const tx = await contract.setRealTimeResults(enabled);
      toast.info(`${enabled ? 'Enabling' : 'Disabling'} real-time results... Please wait for confirmation.`);
      
      await tx.wait();
      
      // Update in API
      await axios.post(`${API_URL}/election/settings`, { realTimeResults: enabled });
      
      toast.success(`Real-time results ${enabled ? 'enabled' : 'disabled'} successfully!`);
      await fetchElectionSettings();
      await fetchCanViewResults();
    } catch (error) {
      console.error("Error setting real-time results:", error);
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} real-time results.`);
    }
  };

  useEffect(() => {
    if (account) {
      fetchCanViewResults();
    }
  }, [account, electionSettings]);

  useEffect(() => {
    if (account && contract) {
      fetchElectionSettings();
    }
  }, [account, contract]);

  const value = {
    account,
    isAdmin,
    isConnecting,
    isConnected,
    connectWallet,
    candidates,
    voterStatus,
    kycStatus,
    electionSettings,
    canViewResults,
    fetchCandidates,
    fetchKycStatus,
    addCandidate,
    castVote,
    registerVoter,
    fetchVoterStatus,
    disqualifyCandidate,
    setElectionPeriod,
    setResultsPublished,
    setRealTimeResults,
    fetchElectionSettings,
    fetchCanViewResults
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider;
