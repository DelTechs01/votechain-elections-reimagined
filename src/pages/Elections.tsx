import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/components/admin/config";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWeb3 } from "@/context/Web3Context";
import axios from "axios";
import { toast } from "sonner";


interface Election {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "ended";
  participantsCount: number;
  votersCount: number;
  participation: number;
}

const ElectionCard = ({ election }: { election: Election }) => {
  const { isConnected } = useWeb3();
  const [timeLeft, setTimeLeft] = useState<string>("");

  const updateTimeLeft = useCallback(() => {
    const endDate = new Date(election.endDate);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    if (diff <= 0) {
      setTimeLeft("Ended");
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    setTimeLeft(`${days}d ${hours}h ${minutes}m`);
  }, [election.endDate]);

  useEffect(() => {
    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [updateTimeLeft]);

  const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    upcoming: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    ended: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  };

  const isVoteDisabled = election.status === "ended" || (!isConnected && election.status === "active");
  const buttonText = election.status === "active"
    ? isConnected
      ? "Vote Now"
      : "Connect Wallet to Vote"
    : election.status === "upcoming"
    ? "View Details"
    : "See Results";
  const buttonTooltip = isVoteDisabled
    ? election.status === "ended"
      ? "This election has ended"
      : "Please connect your wallet to vote"
    : "";
  const linkTo = election.status === "active" && isConnected && election._id
    ? `/vote/${election._id}`
    : `/elections/${election._id || ""}`; // Fallback to /elections if no ID

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{election.title}</CardTitle>
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium ${
                statusColors[election.status]
              }`}
              aria-label={`Election status: ${election.status}`}
            >
              {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
            </span>
          </div>
          <CardDescription>{election.description || "No description available"}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Start Date</div>
              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-4 w-4 text-blue-600" aria-hidden="true" />
                {new Date(election.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">End Date</div>
              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-4 w-4 text-red-600" aria-hidden="true" />
                {new Date(election.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {election.status === "active" || election.status === "upcoming"
                ? "Time Remaining"
                : "Status"}
            </div>
            <div className="font-medium">{timeLeft}</div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Participation</span>
              <span>{election.participation || 0}%</span>
            </div>
            <Progress value={election.participation || 0} className="h-2" />
          </div>

          <div className="text-sm flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>
              {(election.votersCount || 0).toLocaleString()} voters • {election.participantsCount || 0} candidates
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  className="w-full"
                  disabled={isVoteDisabled}
                  aria-label={buttonText}
                >
                  <Link to={linkTo}>
                    {buttonText}
                    <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </TooltipTrigger>
              {buttonTooltip && <TooltipContent>{buttonTooltip}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const Elections = () => {
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "ended">("all");
  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Elections | VoteChain";

    const fetchElections = async (retries = 3) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/elections`, {
          timeout: 10000,
        });
        setElections(response.data);
        console.log("Fetched elections:", response.data);
      } catch (err) {
        console.error("Error fetching elections:", err);
        if (retries > 0 && axios.isAxiosError(err) && err.code === "ECONNABORTED") {
          setTimeout(() => fetchElections(retries - 1), 2000);
        } else {
          setError("Failed to load elections. Please try again later.");
          toast.error("Failed to load elections");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchElections();
  }, []);

  const filteredElections = filter === "all"
    ? elections
    : elections.filter((election) => election.status === filter);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <Card className="h-80">
                <CardHeader>
                  <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded mt-4"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        className="text-center max-w-3xl mx-auto mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Elections</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Explore current, upcoming, and past elections powered by VoteChain’s secure blockchain
          technology.
        </p>
      </motion.div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {["all", "active", "upcoming", "ended"].map((status) => (
            <Button
              key={status}
              onClick={() => setFilter(status as "all" | "active" | "upcoming" | "ended")}
              className={`px-4 py-2 text-sm font-medium ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              aria-pressed={filter === status}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredElections.map((election) => (
          <ElectionCard key={election._id} election={election} />
        ))}

        {filteredElections.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No elections found for the selected filter.
            </p>
            <Button variant="outline" asChild>
              <Link to="/elections">View All Elections</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Elections;