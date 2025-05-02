
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';

// Mock ABI for the voting contract
const VotingContractABI = [
  "function registerVoter(address _voterAddress) public",
  "function addCandidate(string memory _name, string memory _party, string memory _imageUrl) public",
  "function castVote(uint256 _candidateId) public",
  "function getCandidateCount() public view returns(uint256)",
  "function getCandidate(uint256 _candidateId) public view returns(uint256, string memory, string memory, string memory, uint256)",
  "function getVoterStatus(address _voterAddress) public view returns(bool, bool)",
  "function isAdmin(address _address) public view returns(bool)"
];

interface Candidate {
  id: number;
  name: string;
  party: string;
  imageUrl: string;
  voteCount: number;
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
  fetchCandidates: () => Promise<void>;
  fetchKycStatus: () => Promise<void>;
  addCandidate: (name: string, party: string, imageUrl: string) => Promise<void>;
  castVote: (candidateId: number) => Promise<void>;
  registerVoter: (address: string) => Promise<void>;
  fetchVoterStatus: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextProps>({} as Web3ContextProps);

export const useWeb3 = () => useContext(Web3Context);

interface Web3ProviderProps {
  children: ReactNode;
}

// In a real dApp, you would replace this with your deployed contract address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Backend API URL - update this with your actual backend URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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
      // Try to fetch from real backend first
      try {
        const response = await fetch(`${API_URL}/kyc/status/${account}`);
        if (response.ok) {
          const data = await response.json();
          setKycStatus({
            status: data.status,
            feedback: data.feedback,
            submittedAt: new Date(data.submittedAt)
          });
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
      }

      // Fall back to mock data if API is not available
      // For demo purposes, randomly assign a status
      const statuses = ['not submitted', 'pending', 'approved', 'rejected'] as const;
      const randomIndex = Math.floor(Math.random() * statuses.length);
      setKycStatus({ 
        status: statuses[randomIndex], 
        feedback: randomIndex === 3 ? 'ID document not clear. Please resubmit.' : undefined 
      });
    } catch (error) {
      console.error("Error fetching KYC status:", error);
    }
  };

  const fetchCandidates = async () => {
    try {
      // Try to fetch from real backend first
      try {
        const response = await fetch(`${API_URL}/candidates`);
        if (response.ok) {
          const data = await response.json();
          const formattedCandidates = data.map((candidate: any, index: number) => ({
            id: candidate._id || index,
            name: candidate.name,
            party: candidate.party,
            imageUrl: candidate.imageUrl || '/placeholder.svg',
            voteCount: candidate.voteCount || 0
          }));
          setCandidates(formattedCandidates);
          return;
        }
      } catch (apiError) {
        console.log('Candidates API not available, using contract or mock data');
      }

      // If API fails, try to get from contract
      if (contract) {
        try {
          const count = await contract.getCandidateCount();
          const candidatesList: Candidate[] = [];
          
          for (let i = 0; i < count; i++) {
            const [id, name, party, imageUrl, voteCount] = await contract.getCandidate(i);
            candidatesList.push({
              id: id.toNumber(),
              name,
              party,
              imageUrl,
              voteCount: voteCount.toNumber()
            });
          }
          
          setCandidates(candidatesList);
          return;
        } catch (contractError) {
          console.error("Error fetching candidates from contract:", contractError);
        }
      }

      // If both API and contract fail, use mock data
      setTimeout(() => {
        const mockCandidates = [
          { id: 1, name: "Alex Johnson", party: "Progressive Party", imageUrl: "/placeholder.svg", voteCount: 125 },
          { id: 2, name: "Sam Wilson", party: "Conservative Union", imageUrl: "/placeholder.svg", voteCount: 108 },
          { id: 3, name: "Maria Rodriguez", party: "Liberty Alliance", imageUrl: "/placeholder.svg", voteCount: 96 },
        ];
        setCandidates(mockCandidates);
      }, 500);
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

  const addCandidate = async (name: string, party: string, imageUrl: string) => {
    if (!contract) {
      toast.error("Contract not initialized. Please connect your wallet.");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admins can add candidates.");
      return;
    }

    try {
      const tx = await contract.addCandidate(name, party, imageUrl);
      toast.info("Adding candidate... Please wait for confirmation.");
      
      await tx.wait();
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

  const castVote = async (candidateId: number) => {
    if (!contract) {
      toast.error("Contract not initialized. Please connect your wallet.");
      return;
    }

    if (!voterStatus.isRegistered) {
      toast.error("You are not registered to vote.");
      return;
    }

    if (voterStatus.hasVoted) {
      toast.error("You have already voted.");
      return;
    }

    if (kycStatus.status !== 'approved') {
      toast.error("Your KYC must be approved before voting.");
      return;
    }

    try {
      const tx = await contract.castVote(candidateId);
      toast.info("Casting your vote... Please wait for confirmation.");
      
      await tx.wait();
      toast.success("Vote cast successfully!");
      
      await fetchVoterStatus();
      await fetchCandidates();
    } catch (error) {
      console.error("Error casting vote:", error);
      toast.error("Failed to cast vote.");
    }
  };

  const value = {
    account,
    isAdmin,
    isConnecting,
    isConnected,
    connectWallet,
    candidates,
    voterStatus,
    kycStatus,
    fetchCandidates,
    fetchKycStatus,
    addCandidate,
    castVote,
    registerVoter,
    fetchVoterStatus,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider;
