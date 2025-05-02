
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, UserPlus, Users, Plus, Trash, Play, Pause, StopCircle, Clock, FileCheck, Filter, DownloadCloud, FileBarChart } from "lucide-react";
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Admin = () => {
  const { account, isAdmin, candidates, addCandidate, registerVoter } = useWeb3();
  const navigate = useNavigate();
  
  // Form states
  const [candidateName, setCandidateName] = useState("");
  const [candidateParty, setCandidateParty] = useState("");
  const [candidateBio, setCandidateBio] = useState("");
  const [candidateImage, setCandidateImage] = useState("");
  const [voterAddress, setVoterAddress] = useState("");
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isRegisteringVoter, setIsRegisteringVoter] = useState(false);
  const [electionActive, setElectionActive] = useState(true);
  const [timelockExpiry, setTimelockExpiry] = useState<Date | null>(null);
  const [selectedKYCStatus, setSelectedKYCStatus] = useState("all");

  // Election control states
  const [isStartingElection, setIsStartingElection] = useState(false);
  const [isStoppingElection, setIsStoppingElection] = useState(false);
  const [isPausingElection, setIsPausingElection] = useState(false);
  
  // KYC states
  const [kycApplications, setKycApplications] = useState([
    { id: 1, address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", email: "alice.student@university.edu", ipfsHash: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX", timestamp: "2025-04-30T14:22:33", status: "approved", comments: "Valid student ID" },
    { id: 2, address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", email: "bob.johnson@university.edu", ipfsHash: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxY", timestamp: "2025-05-01T09:45:12", status: "pending", comments: "" },
    { id: 3, address: "0xbda5747bfd65f08deb54cb465eb87d40e51b197e", email: "carol.zhang@university.edu", ipfsHash: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxZ", timestamp: "2025-05-01T16:32:44", status: "rejected", comments: "ID expired" },
    { id: 4, address: "0xdd2fd4581271e230360230f9337d5c0430bf44c0", email: "david.miller@university.edu", ipfsHash: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxA", timestamp: "2025-05-02T08:12:09", status: "pending", comments: "" },
    { id: 5, address: "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", email: "emma.wilson@university.edu", ipfsHash: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxB", timestamp: "2025-05-02T11:05:22", status: "pending", comments: "" },
  ]);
  
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [kycComment, setKycComment] = useState("");
  
  // Audit log states
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, action: "CandidateAdded", details: "Added candidate: Alex Johnson", actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", timestamp: "2025-04-28T10:22:33", txHash: "0x1234...5678" },
    { id: 2, action: "VoterRegistered", details: "Registered voter: 0x2546BcD3c84621e976D8185a91A922aE77ECEc30", actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", timestamp: "2025-04-29T14:45:12", txHash: "0xabcd...efgh" },
    { id: 3, action: "ElectionStarted", details: "Election started for 2025 Student Council", actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", timestamp: "2025-04-30T09:00:00", txHash: "0x9876...5432" },
    { id: 4, action: "KYCApproved", details: "Approved KYC for: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F", actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", timestamp: "2025-04-30T14:22:33", txHash: "0xijkl...mnop" },
    { id: 5, action: "KYCRejected", details: "Rejected KYC for: 0xbda5747bfd65f08deb54cb465eb87d40e51b197e", actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", timestamp: "2025-05-01T16:32:44", txHash: "0xqrst...uvwx" },
  ]);
  
  // Mock voters for UI display
  const [voters, setVoters] = useState([
    { address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", registered: true, hasVoted: true, email: "alice.student@university.edu", kycStatus: "approved" },
    { address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", registered: true, hasVoted: false, email: "bob.johnson@university.edu", kycStatus: "pending" },
    { address: "0xbda5747bfd65f08deb54cb465eb87d40e51b197e", registered: true, hasVoted: false, email: "carol.zhang@university.edu", kycStatus: "rejected" },
    { address: "0xdd2fd4581271e230360230f9337d5c0430bf44c0", registered: true, hasVoted: true, email: "david.miller@university.edu", kycStatus: "approved" },
    { address: "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", registered: true, hasVoted: false, email: "emma.wilson@university.edu", kycStatus: "pending" },
  ]);

  // Analytics data
  const voteDistributionData = candidates.map(c => ({
    name: c.name,
    votes: c.voteCount
  }));

  const kycStatusData = [
    { name: 'Approved', value: kycApplications.filter(k => k.status === 'approved').length },
    { name: 'Pending', value: kycApplications.filter(k => k.status === 'pending').length },
    { name: 'Rejected', value: kycApplications.filter(k => k.status === 'rejected').length },
  ];

  const COLORS = ['#0088FE', '#FFBB28', '#FF8042'];

  useEffect(() => {
    document.title = "Admin Panel | VoteChain";
    
    // If user is not an admin, redirect to home
    if (account && !isAdmin) {
      navigate("/");
      toast.error("You don't have permission to access the admin panel");
    } else if (!account) {
      navigate("/");
      toast.error("Please connect your wallet to access the admin panel");
    }
  }, [account, isAdmin, navigate]);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!candidateName || !candidateParty) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsAddingCandidate(true);
    
    try {
      await addCandidate(candidateName, candidateParty, candidateImage || "/placeholder.svg");
      toast.success("Candidate added successfully!");
      setCandidateName("");
      setCandidateParty("");
      setCandidateBio("");
      setCandidateImage("");
      
      // Log the action to audit log
      const newLog = {
        id: auditLogs.length + 1,
        action: "CandidateAdded",
        details: `Added candidate: ${candidateName}`,
        actor: account || "",
        timestamp: new Date().toISOString(),
        txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`, // Mock tx hash
      };
      setAuditLogs([newLog, ...auditLogs]);
    } catch (error) {
      console.error("Error adding candidate:", error);
    } finally {
      setIsAddingCandidate(false);
    }
  };

  const handleRegisterVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voterAddress || !voterAddress.startsWith("0x")) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }
    
    setIsRegisteringVoter(true);
    
    try {
      await registerVoter(voterAddress);
      // Update the local voters list for UI
      setVoters([
        { address: voterAddress, registered: true, hasVoted: false, email: "", kycStatus: "pending" },
        ...voters
      ]);
      toast.success("Voter registered successfully!");
      
      // Log the action to audit log
      const newLog = {
        id: auditLogs.length + 1,
        action: "VoterRegistered",
        details: `Registered voter: ${voterAddress}`,
        actor: account || "",
        timestamp: new Date().toISOString(),
        txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`, // Mock tx hash
      };
      setAuditLogs([newLog, ...auditLogs]);
      
      setVoterAddress("");
    } catch (error) {
      console.error("Error registering voter:", error);
    } finally {
      setIsRegisteringVoter(false);
    }
  };
  
  const handleElectionControl = async (action: 'start' | 'stop' | 'pause') => {
    // Implement actual contract calls here
    
    if (action === 'start') {
      setIsStartingElection(true);
      try {
        // Simulate contract call
        setTimeout(() => {
          setElectionActive(true);
          toast.success("Election started successfully!");
          
          // Log the action
          const newLog = {
            id: auditLogs.length + 1,
            action: "ElectionStarted",
            details: "Election started for 2025 Student Council",
            actor: account || "",
            timestamp: new Date().toISOString(),
            txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
          };
          setAuditLogs([newLog, ...auditLogs]);
          
          setIsStartingElection(false);
        }, 1000);
      } catch (error) {
        console.error("Error starting election:", error);
        setIsStartingElection(false);
      }
    }
    else if (action === 'pause') {
      setIsPausingElection(true);
      try {
        // Simulate contract call
        setTimeout(() => {
          setElectionActive(false);
          toast.success("Election paused successfully!");
          
          // Log the action
          const newLog = {
            id: auditLogs.length + 1,
            action: "ElectionPaused",
            details: "Election paused for 2025 Student Council",
            actor: account || "",
            timestamp: new Date().toISOString(),
            txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
          };
          setAuditLogs([newLog, ...auditLogs]);
          
          setIsPausingElection(false);
        }, 1000);
      } catch (error) {
        console.error("Error pausing election:", error);
        setIsPausingElection(false);
      }
    }
    else if (action === 'stop') {
      // Set timelock for stopping the election (24h)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
      setTimelockExpiry(expiryDate);
      
      setIsStoppingElection(true);
      try {
        // Simulate contract call with timelock
        setTimeout(() => {
          toast.info("Election stop request initiated with 24-hour timelock");
          
          // Log the action
          const newLog = {
            id: auditLogs.length + 1,
            action: "ElectionStopRequested",
            details: "Election stop requested with 24-hour timelock",
            actor: account || "",
            timestamp: new Date().toISOString(),
            txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
          };
          setAuditLogs([newLog, ...auditLogs]);
          
          setIsStoppingElection(false);
        }, 1000);
      } catch (error) {
        console.error("Error stopping election:", error);
        setIsStoppingElection(false);
      }
    }
  };
  
  const handleKYCAction = (applicationId: number, action: 'approve' | 'reject') => {
    const updatedApplications = kycApplications.map(app => {
      if (app.id === applicationId) {
        return {
          ...app,
          status: action === 'approve' ? 'approved' : 'rejected',
          comments: kycComment,
        };
      }
      return app;
    });
    
    setKycApplications(updatedApplications);
    
    // Update the corresponding voter's KYC status
    const application = kycApplications.find(app => app.id === applicationId);
    if (application) {
      const updatedVoters = voters.map(voter => {
        if (voter.address === application.address) {
          return {
            ...voter,
            kycStatus: action === 'approve' ? 'approved' : 'rejected',
          };
        }
        return voter;
      });
      setVoters(updatedVoters);
    }
    
    // Log the action
    const newLog = {
      id: auditLogs.length + 1,
      action: action === 'approve' ? "KYCApproved" : "KYCRejected",
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} KYC for: ${application?.address}`,
      actor: account || "",
      timestamp: new Date().toISOString(),
      txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
    };
    setAuditLogs([newLog, ...auditLogs]);
    
    toast.success(`KYC application ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    setSelectedKYC(null);
    setKycComment("");
  };
  
  const filteredKYCApplications = selectedKYCStatus === "all" 
    ? kycApplications 
    : kycApplications.filter(app => app.status === selectedKYCStatus);
  
  const exportAnalyticsData = () => {
    // In a real application, this would generate and download a CSV file
    toast.success("Analytics data exported to CSV");
  };

  if (!account || !isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="text-center max-w-3xl mx-auto mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Manage the election, candidates, voters, and KYC verification.
        </p>
      </motion.div>

      <Tabs defaultValue="candidates" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="voters">Voters</TabsTrigger>
          <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        
        {/* Candidates Tab */}
        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Manage Candidates</CardTitle>
                  <CardDescription>Add, edit, or remove candidates for the election.</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Candidate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add New Candidate</DialogTitle>
                      <DialogDescription>
                        Fill in the details to add a new candidate to the election.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCandidate}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            placeholder="e.g., John Smith"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="party">Party Affiliation</Label>
                          <Input
                            id="party"
                            value={candidateParty}
                            onChange={(e) => setCandidateParty(e.target.value)}
                            placeholder="e.g., Progressive Party"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="bio">Biography</Label>
                          <Textarea
                            id="bio"
                            value={candidateBio}
                            onChange={(e) => setCandidateBio(e.target.value)}
                            placeholder="Brief description of the candidate's background and platform..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="imageUrl">Image URL</Label>
                          <Input
                            id="imageUrl"
                            value={candidateImage}
                            onChange={(e) => setCandidateImage(e.target.value)}
                            placeholder="https://example.com/candidate-image.jpg"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter a URL or leave blank for default placeholder image
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isAddingCandidate}>
                          {isAddingCandidate ? "Adding..." : "Add Candidate"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {candidates.length > 0 ? (
                <div className="grid gap-4">
                  {candidates.map((candidate) => (
                    <div 
                      key={candidate.id} 
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        <img 
                          src={candidate.imageUrl || "/placeholder.svg"} 
                          alt={candidate.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium">{candidate.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{candidate.party}</p>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {candidate.voteCount} votes
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Removal</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {candidate.name} from the election? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex justify-between">
                            <Button variant="outline">Cancel</Button>
                            <Button variant="destructive">Remove Candidate</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No candidates added yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Voters Tab */}
        <TabsContent value="voters">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Manage Voters</CardTitle>
                  <CardDescription>Register and manage voters for the election.</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register Voter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Register New Voter</DialogTitle>
                      <DialogDescription>
                        Enter the Ethereum address of the voter you want to register.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterVoter}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="address">Ethereum Address</Label>
                          <Input
                            id="address"
                            value={voterAddress}
                            onChange={(e) => setVoterAddress(e.target.value)}
                            placeholder="0x..."
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isRegisteringVoter}>
                          {isRegisteringVoter ? "Registering..." : "Register Voter"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
                <Users className="h-4 w-4" />
                <span>Total Registered Voters: {voters.length}</span>
              </div>

              <div className="rounded-md border">
                <div className="grid grid-cols-4 p-3 text-sm font-medium border-b">
                  <div>Address</div>
                  <div>Email</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                {voters.map((voter, index) => (
                  <div 
                    key={index}
                    className="grid grid-cols-4 p-3 text-sm border-b last:border-b-0 items-center"
                  >
                    <div className="font-mono">{voter.address.substring(0, 6) + '...' + voter.address.substring(voter.address.length - 4)}</div>
                    <div>{voter.email || "—"}</div>
                    <div className="flex gap-2">
                      {voter.hasVoted ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Not Voted
                        </span>
                      )}
                      {voter.kycStatus && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          voter.kycStatus === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          voter.kycStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          KYC: {voter.kycStatus.charAt(0).toUpperCase() + voter.kycStatus.slice(1)}
                        </span>
                      )}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* KYC Verification Tab */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>KYC Verification</CardTitle>
                  <CardDescription>Review and approve or reject KYC applications.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex gap-2">
                        <Filter className="h-4 w-4" />
                        Filter: {selectedKYCStatus.charAt(0).toUpperCase() + selectedKYCStatus.slice(1)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedKYCStatus("all")}>All</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedKYCStatus("pending")}>Pending</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedKYCStatus("approved")}>Approved</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedKYCStatus("rejected")}>Rejected</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 p-3 text-sm font-medium border-b">
                  <div>Applicant</div>
                  <div>Email</div>
                  <div>Date Submitted</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                
                {filteredKYCApplications.length > 0 ? (
                  filteredKYCApplications.map((app) => (
                    <div 
                      key={app.id}
                      className="grid grid-cols-5 p-3 text-sm border-b last:border-b-0 items-center"
                    >
                      <div className="font-mono">{app.address.substring(0, 6) + '...' + app.address.substring(app.address.length - 4)}</div>
                      <div>{app.email}</div>
                      <div>{new Date(app.timestamp).toLocaleDateString()}</div>
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          app.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileCheck className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Review KYC Application</DialogTitle>
                              <DialogDescription>
                                Review the submitted documents and approve or reject the application.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <div className="grid gap-4 mb-4">
                                <div>
                                  <Label>Applicant Address</Label>
                                  <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm">
                                    {app.address}
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Email</Label>
                                  <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                                    {app.email}
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Submitted ID (IPFS)</Label>
                                  <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm">
                                    {app.ipfsHash}
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>ID Image Preview</Label>
                                  <div className="mt-1 border rounded overflow-hidden">
                                    <img 
                                      src="/placeholder.svg" 
                                      alt="ID Document" 
                                      className="w-full object-contain h-[200px]"
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    In a production application, this would fetch and display the image from IPFS
                                  </p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="kycComment">Comments</Label>
                                  <Textarea
                                    id="kycComment"
                                    value={kycComment}
                                    onChange={(e) => setKycComment(e.target.value)}
                                    placeholder="Add any notes or reasons for approval/rejection..."
                                    className="min-h-[100px] mt-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="mt-6 flex justify-between">
                                <Button 
                                  type="button" 
                                  variant="destructive"
                                  onClick={() => handleKYCAction(app.id, 'reject')}
                                  disabled={app.status === 'rejected'}
                                >
                                  Reject Application
                                </Button>
                                <Button 
                                  type="button"
                                  variant="default"
                                  onClick={() => handleKYCAction(app.id, 'approve')}
                                  disabled={app.status === 'approved'}
                                >
                                  Approve Application
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400">No KYC applications found with the selected filter.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Election Analytics</CardTitle>
                  <CardDescription>Monitor voting statistics and KYC status.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportAnalyticsData}>
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Vote Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={voteDistributionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="votes" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">KYC Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={kycStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {kycStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Voter Turnout</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="text-4xl font-bold">{
                        voters.filter(v => v.hasVoted).length
                      } / {voters.length}</div>
                      <div className="text-xl text-muted-foreground">voters</div>
                    </div>
                    <div className="mt-4 h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(voters.filter(v => v.hasVoted).length / voters.length) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground text-center">
                      {((voters.filter(v => v.hasVoted).length / voters.length) * 100).toFixed(1)}% turnout
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>View a log of all administrative actions.</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Input 
                    placeholder="Search logs..." 
                    className="w-60"
                  />
                  <Button variant="outline" size="icon">
                    <FileBarChart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 p-3 text-sm font-medium border-b">
                  <div>Action</div>
                  <div>Details</div>
                  <div>Actor</div>
                  <div>Timestamp</div>
                  <div>Transaction</div>
                </div>
                
                {auditLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="grid grid-cols-5 p-3 text-sm border-b last:border-b-0 items-center"
                  >
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.action.includes('Added') || log.action.includes('Approved') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        log.action.includes('Rejected') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {log.action}
                      </span>
                    </div>
                    <div>{log.details}</div>
                    <div className="font-mono">{log.actor.substring(0, 6) + '...' + log.actor.substring(log.actor.length - 4)}</div>
                    <div>{new Date(log.timestamp).toLocaleString()}</div>
                    <div>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${log.txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                      >
                        {log.txHash.substring(0, 6) + '...' + log.txHash.substring(log.txHash.length - 4)}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Election Control Tab - Now part of settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Election Settings</CardTitle>
              <CardDescription>Configure the parameters for the current election.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="election-name">Election Name</Label>
                  <Input id="election-name" defaultValue="2025 Presidential Election" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="election-desc">Description</Label>
                  <Input id="election-desc" defaultValue="Vote for the next president of the country." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input id="start-date" type="date" defaultValue="2025-10-05" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input id="end-date" type="date" defaultValue="2025-11-05" />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 mt-4">
                  <h3 className="text-lg font-medium mb-4">Election Control</h3>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">Election Status</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {electionActive ? "Active - Voting is currently open" : "Paused - Voting is currently suspended"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="election-status"
                        checked={electionActive}
                        onCheckedChange={() => handleElectionControl(electionActive ? 'pause' : 'start')}
                      />
                      <Label htmlFor="election-status">
                        {electionActive ? "Active" : "Paused"}
                      </Label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <Button 
                      variant="default" 
                      className="flex gap-2" 
                      onClick={() => handleElectionControl('start')}
                      disabled={electionActive || isStartingElection}
                    >
                      <Play className="h-4 w-4" />
                      {isStartingElection ? "Starting..." : "Start Election"}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex gap-2" 
                      onClick={() => handleElectionControl('pause')}
                      disabled={!electionActive || isPausingElection}
                    >
                      <Pause className="h-4 w-4" />
                      {isPausingElection ? "Pausing..." : "Pause Election"}
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="flex gap-2" 
                      onClick={() => handleElectionControl('stop')}
                      disabled={isStoppingElection}
                    >
                      <StopCircle className="h-4 w-4" />
                      {isStoppingElection ? "Processing..." : "Stop Election"}
                    </Button>
                  </div>
                  
                  {timelockExpiry && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-500">Timelock Active</p>
                        <p className="text-yellow-700 dark:text-yellow-400">
                          Election will stop at {timelockExpiry.toLocaleString()}, after the 24-hour timelock period.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button>Save Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
