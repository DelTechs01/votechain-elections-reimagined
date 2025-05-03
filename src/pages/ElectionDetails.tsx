
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, ChevronLeft, BarChart, Award } from "lucide-react";
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Bar,
  BarChart as RechartBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Types
interface Candidate {
  id: number;
  name: string;
  party: string;
  imageUrl: string;
  voteCount: number;
}

interface ElectionData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "ended";
  participantsCount: number;
  votersCount: number;
  participation: number;
  candidates?: Candidate[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ElectionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { account, voterStatus, kycStatus, isConnected } = useWeb3();
  const [election, setElection] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    const fetchElectionDetails = async () => {
      setLoading(true);
      try {
        // Try to fetch from API
        try {
          const response = await axios.get(`${API_URL}/elections/${id}`);
          if (response.status === 200) {
            setElection(response.data);
            
            // Calculate total votes
            const total = response.data.candidates?.reduce((sum: number, candidate: Candidate) => 
              sum + candidate.voteCount, 0) || 0;
            
            setTotalVotes(total);
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.log('Elections API not available, using mock data');
        }
        
        // Fallback to mock data
        const mockElections = [
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
            candidates: [
              { id: 1, name: "Jane Smith", party: "Progressive Party", imageUrl: "/placeholder.svg", voteCount: 3245 },
              { id: 2, name: "John Doe", party: "Conservative Party", imageUrl: "/placeholder.svg", voteCount: 2978 },
              { id: 3, name: "Sam Johnson", party: "Independent", imageUrl: "/placeholder.svg", voteCount: 2300 }
            ]
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
            candidates: [
              { id: 1, name: "Robert Williams", party: "Progressive Party", imageUrl: "/placeholder.svg", voteCount: 1245 },
              { id: 2, name: "Mary Johnson", party: "Conservative Party", imageUrl: "/placeholder.svg", voteCount: 1578 },
              { id: 3, name: "David Lee", party: "Independent", imageUrl: "/placeholder.svg", voteCount: 980 },
              { id: 4, name: "Patricia Davis", party: "Green Party", imageUrl: "/placeholder.svg", voteCount: 756 }
            ]
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
            candidates: []
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
            candidates: [
              { id: 1, name: "Yes", party: "In Favor", imageUrl: "/placeholder.svg", voteCount: 7824 },
              { id: 2, name: "No", party: "Against", imageUrl: "/placeholder.svg", voteCount: 4223 }
            ]
          }
        ];
        
        const foundElection = mockElections.find(e => e.id === id);
        
        if (foundElection) {
          setElection(foundElection);
          const total = foundElection.candidates?.reduce((sum, candidate) => 
            sum + candidate.voteCount, 0) || 0;
          
          setTotalVotes(total);
        } else {
          setError("Election not found");
        }
      } catch (err) {
        console.error("Error fetching election details:", err);
        setError("Failed to fetch election details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchElectionDetails();
    }

    // Set page title
    document.title = "Election Details | VoteChain";
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 w-full max-w-4xl">
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="mb-6">{error || "Election not found"}</p>
        <Button asChild>
          <Link to="/elections">Back to Elections</Link>
        </Button>
      </div>
    );
  }

  const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    upcoming: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    ended: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  // Generate chart data
  const chartData = election.candidates?.map(candidate => ({
    name: candidate.name,
    party: candidate.party,
    votes: candidate.voteCount,
    percentage: totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0
  })) || [];

  // Colors for pie chart
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  const canVote = isConnected && election.status === "active" && voterStatus.isRegistered && !voterStatus.hasVoted && kycStatus.status === "approved";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/elections">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{election.title}</h1>
        <span 
          className={`ml-4 px-2 py-1 text-xs rounded-full font-medium ${
            statusColors[election.status]
          }`}
        >
          {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
        </span>
      </div>

      <div className="mb-8">
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
          {election.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Election Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Start Date</div>
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {formatDate(election.startDate)}
                  </div>
                </div>
                <div className="text-slate-400">→</div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">End Date</div>
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar className="h-4 w-4 text-red-600" />
                    {formatDate(election.endDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Participation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Voter Turnout</span>
                  <span>{election.participation}%</span>
                </div>
                <Progress value={election.participation} className="h-2" />
              </div>
              <div className="text-sm flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Users className="h-4 w-4" />
                <span>{election.votersCount.toLocaleString()} voters • {election.participantsCount} candidates</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Votes Cast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalVotes.toLocaleString()}</div>
              {election.status === "active" && (
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Live counting in progress
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {election.candidates && election.candidates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Candidates Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                <CardTitle>Candidates</CardTitle>
              </div>
              <CardDescription>
                {election.status === "active" 
                  ? "Current results - updated in real-time" 
                  : election.status === "ended" 
                    ? "Final results" 
                    : "Registered candidates"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {election.candidates.map((candidate) => {
                    const percentage = totalVotes > 0 
                      ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) 
                      : "0.0";
                      
                    return (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                              <img 
                                src={candidate.imageUrl || "/placeholder.svg"} 
                                alt={candidate.name} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                            {candidate.name}
                          </div>
                        </TableCell>
                        <TableCell>{candidate.party}</TableCell>
                        <TableCell>{candidate.voteCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Vote Distribution Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-blue-500" />
                <CardTitle>Vote Distribution</CardTitle>
              </div>
              <CardDescription>
                Visual representation of vote distribution among candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  {chartData.length <= 3 ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="votes"
                        nameKey="name"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} votes`, 'Votes']}
                        labelFormatter={(name) => `${name}`}
                      />
                      <Legend />
                    </PieChart>
                  ) : (
                    <RechartBarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="votes" name="Votes" fill="#3b82f6" />
                    </RechartBarChart>
                  )}
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : election.status === "upcoming" ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>
              Candidate information will be available when the election starts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Candidate registration is in progress.</p>
              <p>Check back later for updates.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>No Candidates</CardTitle>
            <CardDescription>
              No candidates are currently registered for this election
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex justify-center mt-8">
        {election.status === "active" && (
          <Button 
            asChild 
            size="lg"
            disabled={!canVote}
            className={canVote ? "bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600" : ""}
          >
            <Link to={canVote ? "/vote" : "#"}>
              {canVote 
                ? "Vote Now" 
                : voterStatus.hasVoted 
                  ? "You've Already Voted" 
                  : !isConnected 
                    ? "Connect Wallet to Vote" 
                    : !voterStatus.isRegistered 
                      ? "Not Registered to Vote" 
                      : kycStatus.status !== "approved"
                        ? "Complete KYC to Vote"
                        : "Cannot Vote"}
            </Link>
          </Button>
        )}
        
        {election.status !== "active" && (
          <Button asChild variant="outline">
            <Link to="/elections">
              Back to Elections
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ElectionDetails;
