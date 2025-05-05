
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Check, AlertCircle, Shield, User, Users, Award } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Types
interface Position {
  _id: string;
  name: string;
  description?: string;
}

interface Candidate {
  _id: string;
  name: string;
  party: string;
  position: string;
  imageUrl: string;
  voteCount: number;
}

interface KYCSubmission {
  _id: string;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  feedback?: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Zod validation schemas
const positionSchema = z.object({
  name: z.string().min(1, "Position name is required"),
  description: z.string().optional()
});

const candidateSchema = z.object({
  name: z.string().min(1, "Candidate name is required"),
  party: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  imageUrl: z.string().url("Must be a valid URL").optional()
});

const kycUpdateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().optional()
});

const Admin = () => {
  const { account, isAdmin } = useWeb3();
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KYCSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<KYCSubmission | null>(null);

  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      party: "Independent",
      position: "",
      imageUrl: "/placeholder.svg"
    }
  });

  const kycForm = useForm<z.infer<typeof kycUpdateSchema>>({
    resolver: zodResolver(kycUpdateSchema),
    defaultValues: {
      status: "approved",
      feedback: ""
    }
  });

  useEffect(() => {
    document.title = "Admin | VoteChain";
    
    if (!account) {
      toast.error("Please connect your wallet to access admin panel");
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load positions
        try {
          const positionsResponse = await axios.get(`${API_URL}/positions`);
          setPositions(positionsResponse.data);
        } catch (err) {
          console.log("Could not fetch positions from API, using mock data");
          // Mock positions
          setPositions([
            { _id: "1", name: "President", description: "Head of state" },
            { _id: "2", name: "Senator", description: "Legislative representative" },
            { _id: "3", name: "Treasurer", description: "Financial officer" }
          ]);
        }
        
        // Load candidates
        try {
          const candidatesResponse = await axios.get(`${API_URL}/candidates`);
          setCandidates(candidatesResponse.data);
        } catch (err) {
          console.log("Could not fetch candidates from API, using mock data");
          // Mock candidates
          setCandidates([
            { _id: "1", name: "Jane Smith", party: "Progressive Party", position: "President", imageUrl: "/placeholder.svg", voteCount: 145 },
            { _id: "2", name: "John Doe", party: "Conservative Party", position: "President", imageUrl: "/placeholder.svg", voteCount: 120 },
            { _id: "3", name: "Alex Johnson", party: "Independent", position: "President", imageUrl: "/placeholder.svg", voteCount: 78 },
            { _id: "4", name: "Sarah Williams", party: "Progressive Party", position: "Senator", imageUrl: "/placeholder.svg", voteCount: 98 },
            { _id: "5", name: "Robert Brown", party: "Conservative Party", position: "Senator", imageUrl: "/placeholder.svg", voteCount: 112 },
            { _id: "6", name: "Michael Lee", party: "Progressive Party", position: "Treasurer", imageUrl: "/placeholder.svg", voteCount: 67 },
            { _id: "7", name: "Emily Davis", party: "Conservative Party", position: "Treasurer", imageUrl: "/placeholder.svg", voteCount: 89 },
            { _id: "8", name: "David Wilson", party: "Green Party", position: "Treasurer", imageUrl: "/placeholder.svg", voteCount: 45 }
          ]);
        }
        
        // Load KYC submissions
        try {
          const kycResponse = await axios.get(`${API_URL}/kyc/all`);
          setKycSubmissions(kycResponse.data);
        } catch (err) {
          console.log("Could not fetch KYC submissions from API, using mock data");
          // Mock KYC submissions
          setKycSubmissions([
            { _id: "1", walletAddress: "0x1234...5678", status: "pending", createdAt: new Date().toISOString() },
            { _id: "2", walletAddress: "0xabcd...efgh", status: "approved", createdAt: new Date().toISOString() },
            { _id: "3", walletAddress: "0x9876...5432", status: "rejected", createdAt: new Date().toISOString(), feedback: "Document unclear" }
          ]);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load admin data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [account]);

  const onPositionSubmit = async (values: z.infer<typeof positionSchema>) => {
    try {
      setIsAddingPosition(true);
      
      await axios.post(`${API_URL}/positions`, values);
      
      // Update positions list
      const positionsResponse = await axios.get(`${API_URL}/positions`);
      setPositions(positionsResponse.data);
      
      toast.success("Position added successfully!");
      positionForm.reset();
      setIsAddingPosition(false);
    } catch (error) {
      console.error("Error adding position:", error);
      toast.error("Failed to add position");
      setIsAddingPosition(false);
    }
  };

  const onCandidateSubmit = async (values: z.infer<typeof candidateSchema>) => {
    try {
      setIsAddingCandidate(true);
      
      await axios.post(`${API_URL}/candidates`, values);
      
      // Update candidates list
      const candidatesResponse = await axios.get(`${API_URL}/candidates`);
      setCandidates(candidatesResponse.data);
      
      toast.success("Candidate added successfully!");
      candidateForm.reset();
      setIsAddingCandidate(false);
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate");
      setIsAddingCandidate(false);
    }
  };

  const onKycUpdate = async (values: z.infer<typeof kycUpdateSchema>) => {
    if (!selectedKyc) return;
    
    try {
      await axios.put(`${API_URL}/kyc/${selectedKyc._id}`, values);
      
      // Update KYC submissions list
      const kycResponse = await axios.get(`${API_URL}/kyc/all`);
      setKycSubmissions(kycResponse.data);
      
      toast.success(`KYC ${values.status === "approved" ? "approved" : "rejected"} successfully!`);
      setSelectedKyc(null);
      kycForm.reset();
    } catch (error) {
      console.error("Error updating KYC status:", error);
      toast.error("Failed to update KYC status");
    }
  };

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

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access the admin panel.
            Only wallet addresses with admin privileges can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center mb-8">
          <Shield className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="candidates">
          <TabsList className="mb-8">
            <TabsTrigger value="candidates" className="flex gap-2 items-center">
              <Award className="h-4 w-4" />
              Manage Candidates
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex gap-2 items-center">
              <User className="h-4 w-4" />
              Manage Positions
            </TabsTrigger>
            <TabsTrigger value="kyc" className="flex gap-2 items-center">
              <Users className="h-4 w-4" />
              KYC Verification
            </TabsTrigger>
          </TabsList>

          {/* Candidates Management Tab */}
          <TabsContent value="candidates">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Candidates</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Candidate</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new candidate below.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...candidateForm}>
                    <form onSubmit={candidateForm.handleSubmit(onCandidateSubmit)} className="space-y-6">
                      <FormField
                        control={candidateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={candidateForm.control}
                        name="party"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Party</FormLabel>
                            <FormControl>
                              <Input placeholder="Party Name (or Independent)" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave empty for Independent
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={candidateForm.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a position" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {positions.map(position => (
                                  <SelectItem key={position._id} value={position.name}>
                                    {position.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={candidateForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave empty for default placeholder
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={isAddingCandidate}>
                          {isAddingCandidate ? "Adding..." : "Add Candidate"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Votes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.length > 0 ? (
                      candidates.map((candidate) => (
                        <TableRow key={candidate._id}>
                          <TableCell>
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                              <img 
                                src={candidate.imageUrl || "/placeholder.svg"} 
                                alt={candidate.name} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{candidate.name}</TableCell>
                          <TableCell>{candidate.party}</TableCell>
                          <TableCell>{candidate.position}</TableCell>
                          <TableCell>{candidate.voteCount}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-slate-500">
                          No candidates found. Add some candidates to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Positions Management Tab */}
          <TabsContent value="positions">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Positions</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Position
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Position</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new position below.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...positionForm}>
                    <form onSubmit={positionForm.handleSubmit(onPositionSubmit)} className="space-y-6">
                      <FormField
                        control={positionForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position Name</FormLabel>
                            <FormControl>
                              <Input placeholder="President" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={positionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Head of state" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={isAddingPosition}>
                          {isAddingPosition ? "Adding..." : "Add Position"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Candidates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.length > 0 ? (
                      positions.map((position) => {
                        const candidateCount = candidates.filter(c => c.position === position.name).length;
                        return (
                          <TableRow key={position._id}>
                            <TableCell className="font-medium">{position.name}</TableCell>
                            <TableCell>{position.description || "—"}</TableCell>
                            <TableCell>{candidateCount}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-slate-500">
                          No positions found. Add some positions to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Verification Tab */}
          <TabsContent value="kyc">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">KYC Verification</h2>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycSubmissions.length > 0 ? (
                      kycSubmissions.map((kyc) => (
                        <TableRow key={kyc._id}>
                          <TableCell className="font-mono">{kyc.walletAddress}</TableCell>
                          <TableCell>{new Date(kyc.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              kyc.status === 'approved' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : kyc.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {kyc.status === 'pending' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedKyc(kyc)}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Review
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Review KYC Submission</DialogTitle>
                                    <DialogDescription>
                                      Update the status of this KYC submission.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="py-4">
                                    <div className="mb-4">
                                      <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                                      <p className="font-mono">{kyc.walletAddress}</p>
                                    </div>
                                    
                                    <div className="mb-4">
                                      <Label className="text-sm text-muted-foreground">Submitted On</Label>
                                      <p>{new Date(kyc.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    
                                    {/* Note: In a real application, you would have a preview of the ID document here */}
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-md text-center text-sm text-muted-foreground">
                                      ID Document Preview would be displayed here
                                    </div>
                                  </div>
                                  
                                  <Form {...kycForm}>
                                    <form onSubmit={kycForm.handleSubmit(onKycUpdate)} className="space-y-6">
                                      <FormField
                                        control={kycForm.control}
                                        name="status"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                              onValueChange={field.onChange}
                                              defaultValue={field.value}
                                            >
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <FormField
                                        control={kycForm.control}
                                        name="feedback"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Feedback (Optional)</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Provide feedback to the user" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                              Add a reason if rejecting the submission
                                            </FormDescription>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <DialogFooter>
                                        <Button type="submit">
                                          <Check className="h-4 w-4 mr-2" />
                                          Submit Review
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                            )}
                            
                            {kyc.status !== 'pending' && (
                              <div className="text-sm text-muted-foreground">
                                {kyc.feedback || (kyc.status === 'approved' ? 'Verified' : 'Rejected')}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                          No KYC submissions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Admin;
