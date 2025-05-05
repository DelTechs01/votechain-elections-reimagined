
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Info, CheckCircle } from "lucide-react";
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import axios from "axios";

// Types
interface Position {
  _id: string;
  name: string;
  description?: string;
}

interface Candidate {
  _id: string;
  id?: number;
  name: string;
  party: string;
  position: string;
  imageUrl: string;
  voteCount: number;
}

interface VoteStatus {
  position: string;
  hasVoted: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Vote = () => {
  const { account, kycStatus } = useWeb3();
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<{ [key: string]: Candidate[] }>({});
  const [selectedCandidates, setSelectedCandidates] = useState<{ [key: string]: string }>({});
  const [voteStatus, setVoteStatus] = useState<VoteStatus[]>([]);
  const [currentPosition, setCurrentPosition] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Vote | VoteChain";
    
    // If user is not connected, redirect to elections page
    if (!account) {
      navigate("/elections");
      toast.error("Please connect your wallet to vote");
      return;
    }

    // Load positions, candidates, and vote status
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load positions
        let positionsData: Position[] = [];
        try {
          const positionsResponse = await axios.get(`${API_URL}/positions`);
          positionsData = positionsResponse.data;
          setPositions(positionsData);
          
          // Set current position to the first one
          if (positionsData.length > 0) {
            setCurrentPosition(positionsData[0].name);
          }
        } catch (err) {
          console.log("Could not fetch positions from API, using mock data");
          // Mock positions
          positionsData = [
            { _id: "1", name: "President", description: "Head of state" },
            { _id: "2", name: "Senator", description: "Legislative representative" },
            { _id: "3", name: "Treasurer", description: "Financial officer" }
          ];
          setPositions(positionsData);
          setCurrentPosition("President");
        }
        
        // Load candidates for each position
        const candidatesByPosition: { [key: string]: Candidate[] } = {};
        
        for (const position of positionsData) {
          try {
            const candidatesResponse = await axios.get(`${API_URL}/candidates/position/${position.name}`);
            candidatesByPosition[position.name] = candidatesResponse.data;
          } catch (err) {
            console.log(`Could not fetch candidates for position ${position.name}, using mock data`);
            // Mock candidates for each position
            if (position.name === "President") {
              candidatesByPosition[position.name] = [
                { _id: "1", name: "Jane Smith", party: "Progressive Party", position: "President", imageUrl: "/placeholder.svg", voteCount: 145 },
                { _id: "2", name: "John Doe", party: "Conservative Party", position: "President", imageUrl: "/placeholder.svg", voteCount: 120 },
                { _id: "3", name: "Alex Johnson", party: "Independent", position: "President", imageUrl: "/placeholder.svg", voteCount: 78 }
              ];
            } else if (position.name === "Senator") {
              candidatesByPosition[position.name] = [
                { _id: "4", name: "Sarah Williams", party: "Progressive Party", position: "Senator", imageUrl: "/placeholder.svg", voteCount: 98 },
                { _id: "5", name: "Robert Brown", party: "Conservative Party", position: "Senator", imageUrl: "/placeholder.svg", voteCount: 112 }
              ];
            } else if (position.name === "Treasurer") {
              candidatesByPosition[position.name] = [
                { _id: "6", name: "Michael Lee", party: "Progressive Party", position: "Treasurer", imageUrl: "/placeholder.svg", voteCount: 67 },
                { _id: "7", name: "Emily Davis", party: "Conservative Party", position: "Treasurer", imageUrl: "/placeholder.svg", voteCount: 89 },
                { _id: "8", name: "David Wilson", party: "Green Party", position: "Treasurer", imageUrl: "/placeholder.svg", voteCount: 45 }
              ];
            }
          }
        }
        
        setCandidates(candidatesByPosition);
        
        // Load vote status for the user
        try {
          const voteStatusResponse = await axios.get(`${API_URL}/votes/status/${account}`);
          setVoteStatus(voteStatusResponse.data);
        } catch (err) {
          console.log("Could not fetch vote status from API, using mock data");
          // Mock vote status
          setVoteStatus(
            positionsData.map(position => ({
              position: position.name,
              hasVoted: false
            }))
          );
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load voting data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [account, navigate]);

  const handleCandidateSelect = (position: string, candidateId: string) => {
    setSelectedCandidates({
      ...selectedCandidates,
      [position]: candidateId
    });
  };

  const handleVoteSubmit = async (position: string) => {
    if (!selectedCandidates[position]) {
      toast.error("Please select a candidate");
      return;
    }

    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (kycStatus.status !== 'approved') {
      toast.error("Your KYC must be approved before voting");
      return;
    }

    setIsVoting(true);
    
    try {
      // Submit vote to API
      await axios.post(`${API_URL}/votes`, {
        voterAddress: account,
        candidateId: selectedCandidates[position],
        position: position
      });

      // Update local vote status
      setVoteStatus(prevStatus => 
        prevStatus.map(status => 
          status.position === position ? { ...status, hasVoted: true } : status
        )
      );

      toast.success(`Vote for ${position} cast successfully!`);
      
      // Close confirm dialog and show success
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Error casting vote:", error);
      toast.error(error.response?.data?.message || "Failed to cast vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  const openConfirmDialog = (position: string) => {
    setCurrentPosition(position);
    setShowConfirmDialog(true);
  };

  if (!account) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center">
          <Button asChild variant="outline">
            <a href="/elections">View All Elections</a>
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has voted for all positions
  const hasVotedForAll = voteStatus.every(status => status.hasVoted);

  if (hasVotedForAll) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Thank You For Voting!</h1>
          <p className="text-lg mb-6 text-slate-600 dark:text-slate-400">
            You have voted for all available positions. Your votes have been securely recorded on the blockchain.
            The results will be available once the election is complete.
          </p>
          <Button asChild>
            <a href="/elections">View All Elections</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="text-center max-w-3xl mx-auto mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-4">Cast Your Vote</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Select candidates for each position below. You can vote once for each position.
          Your votes are anonymous and secured by blockchain technology.
        </p>
      </motion.div>

      <Alert className="max-w-3xl mx-auto mb-8 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4" />
        <AlertTitle>Important Information</AlertTitle>
        <AlertDescription>
          You can only vote once per position. Your selection cannot be changed after submission.
          Please review your choice carefully before confirming your vote.
        </AlertDescription>
      </Alert>

      <div className="max-w-5xl mx-auto">
        <Tabs defaultValue={positions.length > 0 ? positions[0].name : ""} className="mb-8">
          <TabsList className="w-full flex justify-center mb-6">
            {positions.map((position) => {
              const status = voteStatus.find(s => s.position === position.name);
              return (
                <TabsTrigger 
                  key={position._id} 
                  value={position.name}
                  className="flex items-center gap-2"
                  disabled={status?.hasVoted}
                >
                  {position.name}
                  {status?.hasVoted && <CheckCircle className="h-4 w-4 text-green-500" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {positions.map((position) => {
            const status = voteStatus.find(s => s.position === position.name);
            const positionCandidates = candidates[position.name] || [];
            
            return (
              <TabsContent key={position._id} value={position.name}>
                {status?.hasVoted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-2xl font-semibold mb-2">Vote Submitted</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You have already voted for this position.
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-4 text-center">{position.name} Candidates</h2>
                    {position.description && (
                      <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                        {position.description}
                      </p>
                    )}

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {positionCandidates.map((candidate) => (
                        <motion.div
                          key={candidate._id || candidate.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card 
                            className={`cursor-pointer transition-all ${
                              selectedCandidates[position.name] === (candidate._id || candidate.id?.toString())
                                ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50" 
                                : "hover:border-blue-200"
                            }`}
                            onClick={() => handleCandidateSelect(position.name, candidate._id || candidate.id?.toString() || "")}
                          >
                            <CardHeader>
                              <CardTitle>{candidate.name}</CardTitle>
                              <CardDescription>{candidate.party}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <img 
                                  src={candidate.imageUrl || "/placeholder.svg"} 
                                  alt={candidate.name} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </CardContent>
                            <CardFooter className="flex justify-center">
                              {selectedCandidates[position.name] === (candidate._id || candidate.id?.toString()) ? (
                                <div className="text-blue-600 font-medium flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Selected
                                </div>
                              ) : (
                                <div className="text-slate-500">Click to select</div>
                              )}
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}

                      {positionCandidates.length === 0 && (
                        <div className="col-span-full text-center py-8 text-slate-500">
                          No candidates found for this position.
                        </div>
                      )}
                    </div>

                    <div className="text-center mt-8">
                      <Button 
                        size="lg"
                        disabled={!selectedCandidates[position.name]} 
                        onClick={() => openConfirmDialog(position.name)}
                        className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                      >
                        Submit Vote for {position.name}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              You are about to cast your vote for {currentPosition}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {currentPosition && selectedCandidates[currentPosition] && candidates[currentPosition]?.find(c => 
            (c._id || c.id?.toString()) === selectedCandidates[currentPosition]
          ) && (
            <div className="py-4">
              <div className="text-center mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mx-auto">
                  {(() => {
                    const selectedCandidate = candidates[currentPosition].find(c => 
                      (c._id || c.id?.toString()) === selectedCandidates[currentPosition]
                    );
                    return (
                      <img 
                        src={selectedCandidate?.imageUrl || "/placeholder.svg"} 
                        alt={selectedCandidate?.name} 
                        className="w-full h-full object-cover"
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="text-center">
                {(() => {
                  const selectedCandidate = candidates[currentPosition].find(c => 
                    (c._id || c.id?.toString()) === selectedCandidates[currentPosition]
                  );
                  return (
                    <>
                      <h4 className="font-semibold text-lg">{selectedCandidate?.name}</h4>
                      <p className="text-slate-600 dark:text-slate-400">{selectedCandidate?.party}</p>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => handleVoteSubmit(currentPosition)} 
              disabled={isVoting}
              className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
            >
              {isVoting ? "Casting Vote..." : "Confirm Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Vote Successful
            </DialogTitle>
            <DialogDescription>
              Your vote for {currentPosition} has been securely recorded.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <p className="mb-4">
              Thank you for participating in this election. Your vote helps shape our future.
            </p>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm">
              A transaction receipt has been created on the blockchain as proof of your participation.
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowSuccessDialog(false)}
              className="w-full"
            >
              Continue Voting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vote;
