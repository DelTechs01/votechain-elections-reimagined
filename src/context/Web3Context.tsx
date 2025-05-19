import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import axios from 'axios';
import { createMetaTransaction, executeMetaTransaction } from '@/utils/metaTransactions';

const VotingContractABI = [
  "function registerVoter(address _voterAddress) public",
  "function addCandidate(string memory _name, string memory _party, string memory _imageUrl, string memory _position) public returns(uint256)",
  "function castVote(uint256 _candidateId, string memory _position) public",
  "function getCandidateCount() public view returns(uint256)",
  "function getCandidate(uint256 _candidateId) public view returns(uint256, string memory, string memory, string memory, uint256, string memory, bool)",
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
  id: string;
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
  status: 'NotSubmitted' | 'Pending' | 'Approved' | 'Rejected' | 'Received';
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
  castVote: (candidateId: string, position: string, electionId: string) => Promise<void>;
  registerVoter: (address: string) => Promise<void>;
  fetchVoterStatus: () => Promise<void>;
  disqualifyCandidate: (candidateId: string) => Promise<void>;
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

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const RELAYER_URL = `${API_URL}/relay/vote`;

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterStatus, setVoterStatus] = useState<VoterStatus>({ isRegistered: false, hasVoted: false });
  const [kycStatus, setKycStatus] = useState<KycStatus>({ status: 'NotSubmitted' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [electionSettings, setElectionSettings] = useState<ElectionSettings | null>(null);
  const [canViewResults, setCanViewResults] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum === 'undefined') {
        toast.error("MetaMask is not installed.");
        return;
      }

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          fetchVoterStatus();
          fetchKycStatus();
          checkIfAdmin(accounts[0]);
        } else {
          setAccount(null);
          setIsAdmin(false);
          setIsConnected(false);
          setKycStatus({ status: 'NotSubmitted' });
        }
      });

      try {
        const accounts = await web3Provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          const signer = web3Provider.getSigner();
          const votingContract = new ethers.Contract(CONTRACT_ADDRESS, VotingContractABI, signer);
          setContract(votingContract);
          await Promise.all([
            fetchVoterStatus(),
            fetchKycStatus(),
            checkIfAdmin(accounts[0]),
            fetchCandidates(),
            fetchElectionSettings(),
            fetchCanViewResults(),
          ]);
        }
      } catch (error) {
        console.error("Failed to check existing connection:", error);
      }
    };

    init();

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error("MetaMask is not installed.");
      return;
    }

    if (isConnecting || isConnected) return;

    setIsConnecting(true);

    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await web3Provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        const signer = web3Provider.getSigner();
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, VotingContractABI, signer);
        setProvider(web3Provider);
        setContract(votingContract);
        await Promise.all([
          fetchVoterStatus(),
          fetchKycStatus(),
          checkIfAdmin(accounts[0]),
          fetchCandidates(),
          fetchElectionSettings(),
          fetchCanViewResults(),
        ]);
        toast.success("Wallet connected successfully!");
      }
    } catch (error: any) {
      if (error.code === -32002) {
        toast.error("MetaMask request already pending. Please check MetaMask.");
      } else {
        toast.error("Failed to connect wallet.");
      }
      console.error("Error connecting to MetaMask:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchKycStatus = async () => {
    if (!account) {
      setKycStatus({ status: 'NotSubmitted' });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/kyc/status/${account}`);
      setKycStatus({
        status: response.data.data.status,
        feedback: response.data.data.feedback,
        submittedAt: response.data.data.submittedAt ? new Date(response.data.data.submittedAt) : undefined,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        setKycStatus({ status: 'NotSubmitted' });
      } else {
        console.error("Error fetching KYC status:", error);
      }
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_URL}/candidates`);
      setCandidates(response.data.data.map((candidate: any) => ({
        id: candidate._id,
        name: candidate.name,
        party: candidate.party,
        imageUrl: candidate.imageUrl || '/placeholder.svg',
        voteCount: candidate.voteCount || 0,
        position: candidate.position?._id || '',
        isActive: candidate.isActive || true,
      })));
    } catch (error) {
      console.error("Error fetching candidates:", error);
      if (contract) {
        try {
          const count = await contract.getCandidateCount();
          const candidatesList: Candidate[] = [];
          for (let i = 0; i < count; i++) {
            const [id, name, party, imageUrl, voteCount, position, isActive] = await contract.getCandidate(i);
            candidatesList.push({
              id: id.toString(),
              name,
              party,
              imageUrl,
              voteCount: voteCount.toNumber(),
              position,
              isActive,
            });
          }
          setCandidates(candidatesList);
        } catch (contractError) {
          console.error("Error fetching candidates from contract:", contractError);
          toast.error("Failed to fetch candidates.");
        }
      } else {
        toast.error("Failed to fetch candidates.");
      }
    }
  };

  const fetchVoterStatus = async () => {
    if (!contract || !account) {
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
      const response = await axios.get(`${API_URL}/election/settings`);
      setElectionSettings({
        startTime: new Date(response.data.data.startTime).getTime() / 1000,
        endTime: new Date(response.data.data.endTime).getTime() / 1000,
        resultsPublished: response.data.data.resultsPublished,
        realTimeResults: response.data.data.realTimeResults,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        setElectionSettings({
          startTime: 0,
          endTime: 0,
          resultsPublished: false,
          realTimeResults: false,
        });
      } else if (contract && account) {
        try {
          const [startTime, endTime, resultsPublished, realTimeResults] = await contract.getElectionStatus();
          setElectionSettings({
            startTime: startTime.toNumber(),
            endTime: endTime.toNumber(),
            resultsPublished,
            realTimeResults,
          });
        } catch (contractError) {
          console.error("Error fetching election settings from contract:", contractError);
          toast.error("Failed to fetch election settings.");
        }
      } else {
        console.error("Error fetching election settings:", error);
        toast.error("Failed to fetch election settings.");
      }
    }
  };

  const fetchCanViewResults = async () => {
    if (!account) {
      setCanViewResults(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/election/can-view-results/${account}`);
      setCanViewResults(response.data.data.canView);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setCanViewResults(false);
      } else if (contract) {
        try {
          const canView = await contract.canViewResults(account);
          setCanViewResults(canView);
        } catch (contractError) {
          console.error("Error checking results visibility from contract:", contractError);
          setCanViewResults(false);
        }
      } else {
        console.error("Error checking results visibility:", error);
        setCanViewResults(false);
      }
    }
  };

  const addCandidate = async (name: string, party: string, position: string, imageUrl?: string) => {
    if (!isAdmin) {
      toast.error("Only admins can add candidates.");
      return;
    }

    if (!contract) {
      toast.error("Contract not initialized.");
      return;
    }

    try {
      const tx = await contract.addCandidate(name, party, imageUrl || '/placeholder.svg', position);
      toast.info("Adding candidate...");
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === 'CandidateAdded');
      const candidateId = event?.args?.candidateId.toString();
      if (!candidateId) throw new Error('Failed to get candidate ID');

      await axios.post(`${API_URL}/candidates`, {
        name,
        party,
        position,
        imageUrl: imageUrl || '/placeholder.svg',
        onChainId: candidateId,
      });

      toast.success("Candidate added successfully!");
      await fetchCandidates();
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate.");
    }
  };

  const registerVoter = async (address: string) => {
    if (!contract || !isAdmin) {
      toast.error("Only admins can register voters.");
      return;
    }

    try {
      const tx = await contract.registerVoter(address);
      toast.info("Registering voter...");
      await tx.wait();
      toast.success("Voter registered successfully!");
      if (address === account) await fetchVoterStatus();
    } catch (error) {
      console.error("Error registering voter:", error);
      toast.error("Failed to register voter.");
    }
  };

  const castVote = async (candidateId: string, position: string, electionId: string) => {
    if (!account || !provider || !contract) {
      toast.error("Please connect your wallet to vote.");
      return;
    }

    if (!voterStatus.isRegistered) {
      toast.error("You are not registered to vote.");
      return;
    }

    if (kycStatus.status !== 'Approved') {
      toast.error("Your KYC must be approved before voting.");
      return;
    }

    try {
      const signer = provider.getSigner();
      const functionSignature = contract.interface.encodeFunctionData('castVote', [candidateId, position]);
      const nonce = await contract.getNonce(account);
      const metaTx = await createMetaTransaction(signer, CONTRACT_ADDRESS, functionSignature, nonce.toNumber());
      toast.info("Casting vote...");
      const txHash = await executeMetaTransaction(metaTx, RELAYER_URL);

      await axios.post(`${API_URL}/votes`, {
        voterAddress: account,
        candidateId,
        position,
        electionId,
        txHash,
      });

      toast.success("Vote cast successfully!");
      await Promise.all([fetchVoterStatus(), fetchCandidates(), fetchCanViewResults()]);
    } catch (error) {
      console.error("Error casting vote:", error);
      toast.error("Failed to cast vote.");
    }
  };

  const disqualifyCandidate = async (candidateId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can disqualify candidates.");
      return;
    }

    if (!contract) {
      toast.error("Contract not initialized.");
      return;
    }

    try {
      const tx = await contract.disqualifyCandidate(candidateId);
      toast.info("Disqualifying candidate...");
      await tx.wait();
      await axios.put(`${API_URL}/candidates/${candidateId}/disqualify`);
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

    if (!contract) {
      toast.error("Contract not initialized.");
      return;
    }

    try {
      const tx = await contract.setElectionPeriod(startTime, endTime);
      toast.info("Setting election period...");
      await tx.wait();
      await axios.post(`${API_URL}/election/settings`, {
        startTime: new Date(startTime * 1000),
        endTime: new Date(endTime * 1000),
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

    if (!contract) {
      toast.error("Contract not initialized.");
      return;
    }

    try {
      const tx = await contract.setResultsPublished(published);
      toast.info(`${published ? 'Publishing' : 'Hiding'} results...`);
      await tx.wait();
      await axios.post(`${API_URL}/election/settings`, { resultsPublished: published });
      toast.success(`Results ${published ? 'published' : 'hidden'} successfully!`);
      await Promise.all([fetchElectionSettings(), fetchCanViewResults()]);
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

    if (!contract) {
      toast.error("Contract not initialized.");
      return;
    }

    try {
      const tx = await contract.setRealTimeResults(enabled);
      toast.info(`${enabled ? 'Enabling' : 'Disabling'} real-time results...`);
      await tx.wait();
      await axios.post(`${API_URL}/election/settings`, { realTimeResults: enabled });
      toast.success(`Real-time results ${enabled ? 'enabled' : 'disabled'} successfully!`);
      await Promise.all([fetchElectionSettings(), fetchCanViewResults()]);
    } catch (error) {
      console.error("Error setting real-time results:", error);
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} real-time results.`);
    }
  };

  useEffect(() => {
    if (account) fetchCanViewResults();
  }, [account, electionSettings]);

  useEffect(() => {
    if (account && contract) fetchElectionSettings();
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
    fetchCanViewResults,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export default Web3Provider;