
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3 } from "@/context/Web3Context";

// Mock election data
const elections = [
  {
    id: "presidential-2024",
    title: "2024 Presidential Election",
    description: "Vote for the next president of the country.",
    startDate: "2024-10-05",
    endDate: "2024-11-05",
    status: "active",
    participantsCount: 3,
    votersCount: 8523,
    participation: 64,
  },
  {
    id: "senate-2024",
    title: "2024 Senate Election",
    description: "Vote for your state senators.",
    startDate: "2024-10-05",
    endDate: "2024-11-05",
    status: "active",
    participantsCount: 12,
    votersCount: 6149,
    participation: 42,
  },
  {
    id: "local-council-2024",
    title: "Local Council Election",
    description: "Vote for your local council representatives.",
    startDate: "2024-09-15",
    endDate: "2024-10-15",
    status: "upcoming",
    participantsCount: 24,
    votersCount: 0,
    participation: 0,
  },
  {
    id: "referendum-2024",
    title: "National Referendum",
    description: "Vote on the proposed constitutional amendments.",
    startDate: "2024-08-01",
    endDate: "2024-09-01",
    status: "ended",
    participantsCount: 2,
    votersCount: 12047,
    participation: 78,
  },
];

const ElectionCard = ({ election }: { election: typeof elections[0] }) => {
  const { isConnected } = useWeb3();
  const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    upcoming: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    ended: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  };

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
                statusColors[election.status as keyof typeof statusColors]
              }`}
            >
              {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
            </span>
          </div>
          <CardDescription>{election.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Start Date</div>
              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-4 w-4 text-blue-600" />
                {new Date(election.startDate).toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">End Date</div>
              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-4 w-4 text-red-600" />
                {new Date(election.endDate).toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </div>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Participation</span>
              <span>{election.participation}%</span>
            </div>
            <Progress value={election.participation} className="h-2" />
          </div>

          <div className="text-sm flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Users className="h-4 w-4" />
            <span>{election.votersCount.toLocaleString()} voters • {election.participantsCount} candidates</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            asChild 
            className="w-full"
            disabled={election.status === "ended" || (!isConnected && election.status === "active")}
          >
            <Link to={election.status === "active" && isConnected ? "/vote" : `/elections/${election.id}`}>
              {election.status === "active" 
                ? (isConnected ? "Vote Now" : "View Details") 
                : (election.status === "upcoming" ? "View Details" : "See Results")}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const Elections = () => {
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "ended">("all");
  const filteredElections = filter === "all" 
    ? elections 
    : elections.filter(election => election.status === filter);

  useEffect(() => {
    document.title = "Elections | VoteChain";
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="text-center max-w-3xl mx-auto mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Active Elections</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Browse all current, upcoming, and past elections powered by VoteChain's secure blockchain technology.
        </p>
      </motion.div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium ${
              filter === "all" 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("active")}
            className={`px-4 py-2 text-sm font-medium ${
              filter === "active" 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Active
          </button>
          <button 
            onClick={() => setFilter("upcoming")}
            className={`px-4 py-2 text-sm font-medium ${
              filter === "upcoming" 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setFilter("ended")}
            className={`px-4 py-2 text-sm font-medium ${
              filter === "ended" 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Ended
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredElections.map((election) => (
          <ElectionCard key={election.id} election={election} />
        ))}
        
        {filteredElections.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No elections found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Elections;
