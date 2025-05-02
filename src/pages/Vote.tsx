
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const Vote = () => {
  const { account, candidates, voterStatus, castVote } = useWeb3();
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
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
    }
  }, [account, navigate]);

  const handleVoteSubmit = async () => {
    if (selectedCandidate === null) {
      toast.error("Please select a candidate");
      return;
    }

    setIsVoting(true);
    
    try {
      await castVote(selectedCandidate);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error casting vote:", error);
      toast.error("Failed to cast vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleCandidateSelect = (candidateId: number) => {
    setSelectedCandidate(candidateId);
  };

  if (!account) {
    return null; // Will redirect in useEffect
  }

  if (voterStatus.hasVoted) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Thank You For Voting!</h1>
          <p className="text-lg mb-6 text-slate-600 dark:text-slate-400">
            Your vote has been securely recorded on the blockchain.
            The results will be available once the election is complete.
          </p>
          <Button asChild>
            <a href="/elections">View All Elections</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!voterStatus.isRegistered) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Registered</AlertTitle>
          <AlertDescription>
            Your wallet address is not registered to vote in this election. 
            Please contact the election administrator for assistance.
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Button asChild variant="outline">
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
          Select a candidate below and submit your vote. Your vote is anonymous and secured by blockchain technology.
        </p>
      </motion.div>

      <Alert className="max-w-3xl mx-auto mb-8 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4" />
        <AlertTitle>Important Information</AlertTitle>
        <AlertDescription>
          You can only vote once. Your selection cannot be changed after submission.
          Please review your choice carefully before confirming your vote.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {candidates.map((candidate) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={`cursor-pointer transition-all ${
                selectedCandidate === candidate.id 
                  ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50" 
                  : "hover:border-blue-200"
              }`}
              onClick={() => handleCandidateSelect(candidate.id)}
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
                {selectedCandidate === candidate.id ? (
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
      </div>

      <div className="text-center mt-12">
        <Button 
          size="lg"
          disabled={selectedCandidate === null} 
          onClick={() => setShowConfirmDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
        >
          Submit My Vote
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              You are about to cast your vote. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate !== null && candidates[selectedCandidate - 1] && (
            <div className="py-4">
              <div className="text-center mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mx-auto">
                  <img 
                    src={candidates[selectedCandidate - 1].imageUrl || "/placeholder.svg"} 
                    alt={candidates[selectedCandidate - 1].name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-lg">{candidates[selectedCandidate - 1].name}</h4>
                <p className="text-slate-600 dark:text-slate-400">{candidates[selectedCandidate - 1].party}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleVoteSubmit} 
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
              Your vote has been securely recorded on the blockchain.
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
              onClick={() => navigate("/elections")}
              className="w-full"
            >
              View All Elections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vote;
