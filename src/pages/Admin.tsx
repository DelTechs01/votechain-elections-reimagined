
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, UserPlus, Users, Plus, Trash } from "lucide-react";
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { toast } from "sonner";

const Admin = () => {
  const { account, isAdmin, candidates, addCandidate, registerVoter } = useWeb3();
  const navigate = useNavigate();
  
  // Form states
  const [candidateName, setCandidateName] = useState("");
  const [candidateParty, setCandidateParty] = useState("");
  const [candidateImage, setCandidateImage] = useState("");
  const [voterAddress, setVoterAddress] = useState("");
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isRegisteringVoter, setIsRegisteringVoter] = useState(false);
  
  // Mock voters for UI display
  const [voters, setVoters] = useState([
    { address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", registered: true, hasVoted: true },
    { address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", registered: true, hasVoted: false },
    { address: "0xbda5747bfd65f08deb54cb465eb87d40e51b197e", registered: true, hasVoted: false },
    { address: "0xdd2fd4581271e230360230f9337d5c0430bf44c0", registered: true, hasVoted: true },
    { address: "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", registered: true, hasVoted: false },
  ]);

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
      setCandidateImage("");
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
        { address: voterAddress, registered: true, hasVoted: false },
        ...voters
      ]);
      toast.success("Voter registered successfully!");
      setVoterAddress("");
    } catch (error) {
      console.error("Error registering voter:", error);
    } finally {
      setIsRegisteringVoter(false);
    }
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
          Manage the election, candidates, and voters.
        </p>
      </motion.div>

      <Tabs defaultValue="candidates" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="voters">Voters</TabsTrigger>
          <TabsTrigger value="settings">Election Settings</TabsTrigger>
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
                  <DialogContent>
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
                          <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                          <Input
                            id="imageUrl"
                            value={candidateImage}
                            onChange={(e) => setCandidateImage(e.target.value)}
                            placeholder="https://example.com/candidate-image.jpg"
                          />
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
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash className="h-4 w-4" />
                      </Button>
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
                <div className="grid grid-cols-3 p-3 text-sm font-medium border-b">
                  <div>Address</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                {voters.map((voter, index) => (
                  <div 
                    key={index}
                    className="grid grid-cols-3 p-3 text-sm border-b last:border-b-0 items-center"
                  >
                    <div className="font-mono">{voter.address.substring(0, 6) + '...' + voter.address.substring(voter.address.length - 4)}</div>
                    <div>
                      {voter.hasVoted ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Not Voted
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
        
        {/* Election Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Election Settings</CardTitle>
              <CardDescription>Configure the parameters for the current election.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="election-name">Election Name</Label>
                  <Input id="election-name" defaultValue="2024 Presidential Election" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="election-desc">Description</Label>
                  <Input id="election-desc" defaultValue="Vote for the next president of the country." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input id="start-date" type="date" defaultValue="2024-10-05" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input id="end-date" type="date" defaultValue="2024-11-05" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>Save Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
