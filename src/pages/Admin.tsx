import CandidatesPanel from "../components/admin/CandidatesPanel";
import PositionsPanel from "../components/admin/PositionsPanel";
import KycPanel from "../components/admin/KycPanel";
import ElectionsPanel from "../components/admin/ElectionsPanel";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Shield,
  User,
  Users,
  Award,
  Calendar,
} from "lucide-react";
import { useWeb3 } from "@/context/Web3Context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../components/admin/config";

const Admin = () => {
  const { account, isAdmin } = useWeb3();

  //Fetch data with React Query
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => axios.get(`${API_URL}/positions`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => axios.get(`${API_URL}/candidates`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: kycSubmissions = [], isLoading: isLoadingKyc } = useQuery({
    queryKey: ["kycSubmissions"],
    queryFn: () => axios.get(`${API_URL}/kyc/all`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: elections = [], isLoading: isLoadingElections } = useQuery({
    queryKey: ["elections"],
    queryFn: () => axios.get(`${API_URL}/elections`).then((res) => res.data),
    enabled: !!account,
  });

  useEffect(() => {
    document.title = "Admin | VoteChain";
    if (!account) {
      toast.error("Please connect your wallet to access admin panel");
    }
  }, [account]);

  if (
    isLoadingPositions ||
    isLoadingCandidates ||
    isLoadingKyc ||
    isLoadingElections
  ) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have admin privileges to access this panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-12">
        <motion.div
          className="max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center mb-8">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>

          <Tabs defaultValue="candidates" className="space-y-6">
            <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent p-0">
              {[
                { value: "candidates", label: "Candidates", icon: Award },
                { value: "positions", label: "Positions", icon: User },
                { value: "kyc", label: "KYC Verification", icon: Users },
                { value: "elections", label: "Elections", icon: Calendar },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Candidates Management */}
            <TabsContent value="candidates">
              <CandidatesPanel />
            </TabsContent>

            {/* Positions Management */}
            <TabsContent value="positions">
              <PositionsPanel />
            </TabsContent>

            {/* KYC Management */}
            <TabsContent value="kyc">
              <KycPanel />
            </TabsContent>

            {/* Elections Management */}
            <TabsContent value="elections">
              <ElectionsPanel />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </TooltipProvider>
  );
};

export default Admin;
