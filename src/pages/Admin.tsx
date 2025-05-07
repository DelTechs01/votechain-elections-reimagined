import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Check,
  AlertCircle,
  Shield,
  User,
  Users,
  Award,
  FileImage,
  Trash2,
  Calendar,
  ZoomIn,
} from "lucide-react";
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Zod validation schemas
const positionSchema = z.object({
  name: z.string().min(1, "Position name is required"),
  description: z.string().optional(),
});

const candidateSchema = z.object({
  name: z.string().min(1, "Candidate name is required"),
  party: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  imageUrl: z.string().url("Must be a valid URL").optional(),
});

const kycUpdateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().optional(),
});

const electionSchema = z.object({
  title: z.string().min(1, "Election title is required"),
  description: z.string().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  candidateIds: z.array(z.string()).min(1, "At least one candidate is required"),
});

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
  position: Position | string;
  imageUrl: string;
  voteCount: number;
}

interface KYCSubmission {
  _id: string;
  walletAddress: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  feedback?: string;
  history?: { status: string; feedback?: string; updatedAt: string }[];
}

interface Election {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "ended";
  candidates: Candidate[];
  votersCount: number;
  participantsCount: number;
}

const Admin = () => {
  const { account, isAdmin } = useWeb3();
  const queryClient = useQueryClient();
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [isAddingElection, setIsAddingElection] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<KYCSubmission | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Forms
  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: "", description: "" },
  });

  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { name: "", party: "Independent", position: "", imageUrl: "/placeholder.svg" },
  });

  const kycForm = useForm<z.infer<typeof kycUpdateSchema>>({
    resolver: zodResolver(kycUpdateSchema),
    defaultValues: { status: "approved", feedback: "" },
  });

  const electionForm = useForm<z.infer<typeof electionSchema>>({
    resolver: zodResolver(electionSchema),
    defaultValues: { title: "", description: "", startDate: "", endDate: "", candidateIds: [] },
  });

  // Fetch data with React Query
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

  // KYC Documents
  const [documentPreviews, setDocumentPreviews] = useState<{ [key: string]: string }>({});
  const [documentError, setDocumentError] = useState<string | null>(null);
  const fetchKycDocuments = useCallback(
    async (kycId: string) => {
      setDocumentError(null);
      try {
        const response = await axios.get(`${API_URL}/kyc/${kycId}/documents`, { timeout: 10000 });
        const previews: { [key: string]: string } = {};
        response.data.forEach((doc: { type: string; data: string; mimetype: string }) => {
          previews[doc.type] = `data:${doc.mimetype};base64,${doc.data}`;
        });
        setDocumentPreviews(previews);
      } catch (error) {
        setDocumentError("Failed to load KYC documents");
        setDocumentPreviews({});
      }
    },
    []
  );

  // Mutations
  const addPosition = useMutation({
    mutationFn: (values: z.infer<typeof positionSchema>) => axios.post(`${API_URL}/positions`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Position added successfully");
      positionForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add position");
    },
    onSettled: () => setIsAddingPosition(false),
  });

  const addCandidate = useMutation({
    mutationFn: (values: z.infer<typeof candidateSchema>) => axios.post(`${API_URL}/candidates`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate added successfully");
      candidateForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add candidate");
    },
    onSettled: () => setIsAddingCandidate(false),
  });

  const updateCandidate = useMutation({
    mutationFn: (values: z.infer<typeof candidateSchema>) =>
      axios.put(`${API_URL}/candidates/${selectedCandidate?._id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate updated successfully");
      candidateForm.reset();
      setSelectedCandidate(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update candidate");
    },
    onSettled: () => setIsEditingCandidate(false),
  });

  const deleteCandidate = useMutation({
    mutationFn: (candidateId: string) => axios.delete(`${API_URL}/candidates/${candidateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete candidate");
    },
    onSettled: () => setIsDeletingCandidate(false),
  });

  const updateKyc = useMutation({
    mutationFn: (values: z.infer<typeof kycUpdateSchema>) =>
      axios.put(`${API_URL}/kyc/${selectedKyc?._id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kycSubmissions"] });
      toast.success(`KYC ${kycForm.getValues("status")} successfully`);
      setSelectedKyc(null);
      setDocumentPreviews({});
      kycForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update KYC");
    },
  });

  const addElection = useMutation({
    mutationFn: (values: z.infer<typeof electionSchema>) => axios.post(`${API_URL}/elections`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      toast.success("Election created successfully");
      electionForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create election");
    },
    onSettled: () => setIsAddingElection(false),
  });

  useEffect(() => {
    document.title = "Admin | VoteChain";
    if (!account) {
      toast.error("Please connect your wallet to access admin panel");
    }
  }, [account]);

  if (isLoadingPositions || isLoadingCandidates || isLoadingKyc || isLoadingElections) {
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
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
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
                      <DialogTitle>Add Candidate</DialogTitle>
                      <DialogDescription>Enter candidate details.</DialogDescription>
                    </DialogHeader>
                    <Form {...candidateForm}>
                      <form
                        onSubmit={candidateForm.handleSubmit((values) => addCandidate.mutate(values))}
                        className="space-y-6"
                      >
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
                                <Input placeholder="Independent" {...field} />
                              </FormControl>
                              <FormDescription>Optional, defaults to Independent.</FormDescription>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {positions.map((position) => (
                                    <SelectItem key={position._id} value={position._id}>
                                      {position.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {!positions.length && (
                                  <span className="text-destructive">Create positions first.</span>
                                )}
                              </FormDescription>
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
                              <FormDescription>Optional, defaults to placeholder.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={isAddingCandidate || !positions.length}
                            className="w-full sm:w-auto"
                          >
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
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Photo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Votes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidates.length ? (
                          candidates.map((candidate) => (
                            <TableRow key={candidate._id}>
                              <TableCell>
                                <img
                                  src={candidate.imageUrl}
                                  alt={candidate.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{candidate.name}</TableCell>
                              <TableCell>{candidate.party}</TableCell>
                              <TableCell>
                                {typeof candidate.position === "object"
                                  ? candidate.position.name
                                  : candidate.position}
                              </TableCell>
                              <TableCell>{candidate.voteCount}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedCandidate(candidate);
                                              candidateForm.reset({
                                                name: candidate.name,
                                                party: candidate.party,
                                                position:
                                                  typeof candidate.position === "object"
                                                    ? candidate.position._id
                                                    : candidate.position,
                                                imageUrl: candidate.imageUrl,
                                              });
                                            }}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit</TooltipContent>
                                      </Tooltip>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Candidate</DialogTitle>
                                        <DialogDescription>Update {candidate.name}'s details.</DialogDescription>
                                      </DialogHeader>
                                      <Form {...candidateForm}>
                                        <form
                                          onSubmit={candidateForm.handleSubmit((values) =>
                                            updateCandidate.mutate(values)
                                          )}
                                          className="space-y-6"
                                        >
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
                                                  <Input placeholder="Independent" {...field} />
                                                </FormControl>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select position" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {positions.map((position) => (
                                                      <SelectItem key={position._id} value={position._id}>
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
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <DialogFooter>
                                            <Button
                                              type="submit"
                                              disabled={isEditingCandidate || !positions.length}
                                              className="w-full sm:w-auto"
                                            >
                                              {isEditingCandidate ? "Updating..." : "Update Candidate"}
                                            </Button>
                                          </DialogFooter>
                                        </form>
                                      </Form>
                                    </DialogContent>
                                  </Dialog>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete</TooltipContent>
                                      </Tooltip>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Delete Candidate</DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to delete {candidate.name}?
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button
                                          variant="destructive"
                                          onClick={() => deleteCandidate.mutate(candidate._id)}
                                          disabled={isDeletingCandidate}
                                          className="w-full sm:w-auto"
                                        >
                                          {isDeletingCandidate ? "Deleting..." : "Delete"}
                                        </Button>
                                        <Button variant="outline" className="w-full sm:w-auto">
                                          Cancel
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                              No candidates found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-4 p-4">
                    {candidates.length ? (
                      candidates.map((candidate) => (
                        <Card key={candidate._id}>
                          <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <img
                                src={candidate.imageUrl}
                                alt={candidate.name}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium">{candidate.name}</p>
                                <p className="text-sm text-slate-500">{candidate.party}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Position</p>
                              <p>
                                {typeof candidate.position === "object"
                                  ? candidate.position.name
                                  : candidate.position}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Votes</p>
                              <p>{candidate.voteCount}</p>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCandidate(candidate);
                                      candidateForm.reset({
                                        name: candidate.name,
                                        party: candidate.party,
                                        position:
                                          typeof candidate.position === "object"
                                            ? candidate.position._id
                                            : candidate.position,
                                        imageUrl: candidate.imageUrl,
                                      });
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Candidate</DialogTitle>
                                    <DialogDescription>Update {candidate.name}'s details.</DialogDescription>
                                  </DialogHeader>
                                  <Form {...candidateForm}>
                                    <form
                                      onSubmit={candidateForm.handleSubmit((values) =>
                                        updateCandidate.mutate(values)
                                      )}
                                      className="space-y-6"
                                    >
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
                                              <Input placeholder="Independent" {...field} />
                                            </FormControl>
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
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select position" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {positions.map((position) => (
                                                  <SelectItem key={position._id} value={position._id}>
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
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <DialogFooter>
                                        <Button
                                          type="submit"
                                          disabled={isEditingCandidate || !positions.length}
                                          className="w-full"
                                        >
                                          {isEditingCandidate ? "Updating..." : "Update Candidate"}
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Candidate</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete {candidate.name}?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="destructive"
                                      onClick={() => deleteCandidate.mutate(candidate._id)}
                                      disabled={isDeletingCandidate}
                                      className="w-full"
                                    >
                                      {isDeletingCandidate ? "Deleting..." : "Delete"}
                                    </Button>
                                    <Button variant="outline" className="w-full">
                                      Cancel
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center py-4 text-slate-500">No candidates found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Positions Management */}
            <TabsContent value="positions">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
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
                      <DialogTitle>Add Position</DialogTitle>
                      <DialogDescription>Enter position details.</DialogDescription>
                    </DialogHeader>
                    <Form {...positionForm}>
                      <form
                        onSubmit={positionForm.handleSubmit((values) => addPosition.mutate(values))}
                        className="space-y-6"
                      >
                        <FormField
                          control={positionForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
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
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Head of state" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={isAddingPosition} className="w-full sm:w-auto">
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
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Candidates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positions.length ? (
                          positions.map((position) => {
                            const candidateCount = candidates.filter(
                              (c) =>
                                (typeof c.position === "object"
                                  ? c.position._id
                                  : c.position) === position._id
                            ).length;
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
                              No positions found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-4 p-4">
                    {positions.length ? (
                      positions.map((position) => {
                        const candidateCount = candidates.filter(
                          (c) =>
                            (typeof c.position === "object"
                              ? c.position._id
                              : c.position) === position._id
                        ).length;
                        return (
                          <Card key={position._id}>
                            <CardContent className="p-4 flex flex-col gap-4">
                              <div>
                                <p className="text-sm text-slate-500">Name</p>
                                <p className="font-medium">{position.name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Description</p>
                                <p>{position.description || "—"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Candidates</p>
                                <p>{candidateCount}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <p className="text-center py-4 text-slate-500">No positions found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* KYC Verification */}
            <TabsContent value="kyc">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold">KYC Verification</h2>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="hidden md:block">
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
                        {kycSubmissions.length ? (
                          kycSubmissions.map((kyc) => (
                            <TableRow key={kyc._id}>
                              <TableCell className="font-mono text-sm truncate max-w-[200px]">
                                {kyc.walletAddress}
                              </TableCell>
                              <TableCell>
                                {new Date(kyc.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    kyc.status === "approved"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                      : kyc.status === "rejected"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                  }`}
                                >
                                  {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedKyc(kyc);
                                        fetchKycDocuments(kyc._id);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Review
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-[90vw] sm:max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>Review KYC Submission</DialogTitle>
                                      <DialogDescription>
                                        Review documents and update KYC status for {kyc.walletAddress.slice(0, 6)}...
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex flex-col sm:flex-row gap-6 py-4">
                                      {/* Documents Section */}
                                      <div className="flex-1">
                                        <h3 className="text-lg font-semibold mb-4">Documents</h3>
                                        {documentError ? (
                                          <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{documentError}</AlertDescription>
                                          </Alert>
                                        ) : Object.keys(documentPreviews).length ? (
                                          <Carousel className="w-full">
                                            <CarouselContent>
                                              {["idFront", "idBack", "profilePicture"].map(
                                                (type) =>
                                                  documentPreviews[type] && (
                                                    <CarouselItem key={type}>
                                                      <div className="relative group">
                                                        <img
                                                          src={documentPreviews[type]}
                                                          alt={`${type} Document`}
                                                          className="w-full max-h-[400px] object-contain rounded-lg border dark:border-slate-700"
                                                        />
                                                        <Button
                                                          variant="outline"
                                                          size="icon"
                                                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                          onClick={() =>
                                                            window.open(documentPreviews[type], "_blank")
                                                          }
                                                        >
                                                          <ZoomIn className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                      <p className="text-center mt-2 text-sm font-medium">
                                                        {type === "idFront"
                                                          ? "ID Front"
                                                          : type === "idBack"
                                                          ? "ID Back"
                                                          : "Profile Picture"}
                                                      </p>
                                                    </CarouselItem>
                                                  )
                                              )}
                                            </CarouselContent>
                                            <CarouselPrevious className="hidden sm:flex" />
                                            <CarouselNext className="hidden sm:flex" />
                                          </Carousel>
                                        ) : (
                                          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-md text-center text-sm text-muted-foreground flex items-center justify-center">
                                            <FileImage className="h-5 w-5 mr-2" />
                                            Loading documents...
                                          </div>
                                        )}
                                      </div>

                                      {/* KYC Form and Details */}
                                      <div className="flex-1 space-y-6">
                                        <div>
                                          <h3 className="text-lg font-semibold mb-2">Details</h3>
                                          <div className="space-y-2">
                                            <div>
                                              <label className="text-sm text-muted-foreground">
                                                Wallet Address
                                              </label>
                                              <p className="font-mono text-sm break-all">{kyc.walletAddress}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm text-muted-foreground">
                                                Submitted On
                                              </label>
                                              <p>
                                                {new Date(kyc.createdAt).toLocaleDateString("en-US", {
                                                  month: "long",
                                                  day: "numeric",
                                                  year: "numeric",
                                                })}
                                              </p>
                                            </div>
                                            {kyc.feedback && (
                                              <div>
                                                <label className="text-sm text-muted-foreground">
                                                  Current Feedback
                                                </label>
                                                <p>{kyc.feedback}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {kyc.history && kyc.history.length > 0 && (
                                          <div>
                                            <h3 className="text-lg font-semibold mb-2">Status History</h3>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                              {kyc.history.map((entry, index) => (
                                                <div
                                                  key={index}
                                                  className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md"
                                                >
                                                  <p className="text-sm">
                                                    <span className="font-medium">
                                                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                                    </span>{" "}
                                                    - {new Date(entry.updatedAt).toLocaleDateString()}
                                                  </p>
                                                  {entry.feedback && (
                                                    <p className="text-sm text-muted-foreground">
                                                      {entry.feedback}
                                                    </p>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <Form {...kycForm}>
                                          <form
                                            onSubmit={kycForm.handleSubmit((values) => updateKyc.mutate(values))}
                                            className="space-y-6"
                                          >
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
                                                  <FormLabel>Feedback</FormLabel>
                                                  <FormControl>
                                                    <Input placeholder="Reason for rejection" {...field} />
                                                  </FormControl>
                                                  <FormDescription>
                                                    Optional, recommended if rejecting.
                                                  </FormDescription>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                              <Button
                                                type="submit"
                                                disabled={updateKyc.isPending}
                                                className="w-full sm:w-auto"
                                              >
                                                {updateKyc.isPending ? (
                                                  <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Save Changes
                                                  </>
                                                )}
                                              </Button>
                                              <Button
                                                variant="outline"
                                                onClick={() => setSelectedKyc(null)}
                                                className="w-full sm:w-auto"
                                              >
                                                Cancel
                                              </Button>
                                            </DialogFooter>
                                          </form>
                                        </Form>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
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
                  </div>
                  <div className="md:hidden space-y-4 p-4">
                    {kycSubmissions.length ? (
                      kycSubmissions.map((kyc) => (
                        <Card key={kyc._id}>
                          <CardContent className="p-4 flex flex-col gap-4">
                            <div>
                              <p className="text-sm text-slate-500">Wallet Address</p>
                              <p className="font-mono text-sm break-all">{kyc.walletAddress}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Submission Date</p>
                              <p>
                                {new Date(kyc.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Status</p>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  kyc.status === "approved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : kyc.status === "rejected"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }`}
                              >
                                {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                              </span>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedKyc(kyc);
                                    fetchKycDocuments(kyc._id);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[90vw]">
                                <DialogHeader>
                                  <DialogTitle>Review KYC Submission</DialogTitle>
                                  <DialogDescription>
                                    Review documents and update KYC status for {kyc.walletAddress.slice(0, 6)}...
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                  {/* Documents Section */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-4">Documents</h3>
                                    {documentError ? (
                                      <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{documentError}</AlertDescription>
                                      </Alert>
                                    ) : Object.keys(documentPreviews).length ? (
                                      <Carousel className="w-full">
                                        <CarouselContent>
                                          {["idFront", "idBack", "profilePicture"].map(
                                            (type) =>
                                              documentPreviews[type] && (
                                                <CarouselItem key={type}>
                                                  <div className="relative group">
                                                    <img
                                                      src={documentPreviews[type]}
                                                      alt={`${type} Document`}
                                                      className="w-full max-h-[300px] object-contain rounded-lg border dark:border-slate-700"
                                                    />
                                                    <Button
                                                      variant="outline"
                                                      size="icon"
                                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      onClick={() =>
                                                        window.open(documentPreviews[type], "_blank")
                                                      }
                                                    >
                                                      <ZoomIn className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                  <p className="text-center mt-2 text-sm font-medium">
                                                    {type === "idFront"
                                                      ? "ID Front"
                                                      : type === "idBack"
                                                      ? "ID Back"
                                                      : "Profile Picture"}
                                                  </p>
                                                </CarouselItem>
                                              )
                                          )}
                                        </CarouselContent>
                                        <CarouselPrevious />
                                        <CarouselNext />
                                      </Carousel>
                                    ) : (
                                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-md text-center text-sm text-muted-foreground flex items-center justify-center">
                                        <FileImage className="h-5 w-5 mr-2" />
                                        Loading documents...
                                      </div>
                                    )}
                                  </div>

                                  {/* KYC Form and Details */}
                                  <div className="space-y-6">
                                    <div>
                                      <h3 className="text-lg font-semibold mb-2">Details</h3>
                                      <div className="space-y-2">
                                        <div>
                                          <label className="text-sm text-muted-foreground">
                                            Wallet Address
                                          </label>
                                          <p className="font-mono text-sm break-all">{kyc.walletAddress}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm text-muted-foreground">
                                            Submitted On
                                          </label>
                                          <p>
                                            {new Date(kyc.createdAt).toLocaleDateString("en-US", {
                                              month: "long",
                                              day: "numeric",
                                              year: "numeric",
                                            })}
                                          </p>
                                        </div>
                                        {kyc.feedback && (
                                          <div>
                                            <label className="text-sm text-muted-foreground">
                                              Current Feedback
                                            </label>
                                            <p>{kyc.feedback}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {kyc.history && kyc.history.length > 0 && (
                                      <div>
                                        <h3 className="text-lg font-semibold mb-2">Status History</h3>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                          {kyc.history.map((entry, index) => (
                                            <div
                                              key={index}
                                              className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md"
                                            >
                                              <p className="text-sm">
                                                <span className="font-medium">
                                                  {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                                </span>{" "}
                                                - {new Date(entry.updatedAt).toLocaleDateString()}
                                              </p>
                                              {entry.feedback && (
                                                <p className="text-sm text-muted-foreground">
                                                  {entry.feedback}
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <Form {...kycForm}>
                                      <form
                                        onSubmit={kycForm.handleSubmit((values) => updateKyc.mutate(values))}
                                        className="space-y-6"
                                      >
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
                                              <FormLabel>Feedback</FormLabel>
                                              <FormControl>
                                                <Input placeholder="Reason for rejection" {...field} />
                                              </FormControl>
                                              <FormDescription>
                                                Optional, recommended if rejecting.
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <DialogFooter className="flex flex-col gap-2">
                                          <Button
                                            type="submit"
                                            disabled={updateKyc.isPending}
                                            className="w-full"
                                          >
                                            {updateKyc.isPending ? (
                                              <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Saving...
                                              </>
                                            ) : (
                                              <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Save Changes
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={() => setSelectedKyc(null)}
                                            className="w-full"
                                          >
                                            Cancel
                                          </Button>
                                        </DialogFooter>
                                      </form>
                                    </Form>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center py-4 text-slate-500">No KYC submissions found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Elections Management */}
            <TabsContent value="elections">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold">Elections</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Election
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Election</DialogTitle>
                      <DialogDescription>Enter election details.</DialogDescription>
                    </DialogHeader>
                    <Form {...electionForm}>
                      <form
                        onSubmit={electionForm.handleSubmit((values) => addElection.mutate(values))}
                        className="space-y-6"
                      >
                        <FormField
                          control={electionForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="2025 Election" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={electionForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="General election" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={electionForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={electionForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={electionForm.control}
                          name="candidateIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Candidates</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(value) => {
                                    const current = field.value || [];
                                    if (!current.includes(value)) field.onChange([...current, value]);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select candidates" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {candidates.map((candidate) => (
                                      <SelectItem key={candidate._id} value={candidate._id}>
                                        {candidate.name} (
                                        {typeof candidate.position === "object"
                                          ? candidate.position.name
                                          : positions.find((p) => p._id === candidate.position)?.name}
                                        )
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <div className="mt-2">
                                {field.value?.map((id: string) => {
                                  const candidate = candidates.find((c) => c._id === id);
                                  return candidate ? (
                                    <div
                                      key={id}
                                      className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-md mb-2"
                                    >
                                      <span>{candidate.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          field.onChange(field.value.filter((v: string) => v !== id))
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={isAddingElection || !candidates.length}
                            className="w-full sm:w-auto"
                          >
                            {isAddingElection ? "Creating..." : "Create Election"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Candidates</TableHead>
                          <TableHead>Voters</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {elections.length ? (
                          elections.map((election) => (
                            <TableRow key={election._id}>
                              <TableCell className="font-medium">{election.title}</TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    election.status === "active"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                      : election.status === "upcoming"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                  }`}
                                >
                                  {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {new Date(election.startDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell>
                                {new Date(election.endDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell>{election.participantsCount}</TableCell>
                              <TableCell>{election.votersCount}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                              No elections found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-4 p-4">
                    {elections.length ? (
                      elections.map((election) => (
                        <Card key={election._id}>
                          <CardContent className="p-4 flex flex-col gap-4">
                            <div>
                              <p className="text-sm text-slate-500">Title</p>
                              <p className="font-medium">{election.title}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Status</p>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  election.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : election.status === "upcoming"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                }`}
                              >
                                {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Start Date</p>
                              <p>
                                {new Date(election.startDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">End Date</p>
                              <p>
                                {new Date(election.endDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Candidates</p>
                              <p>{election.participantsCount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Voters</p>
                              <p>{election.votersCount}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center py-4 text-slate-500">No elections found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </TooltipProvider>
  );
};

export default Admin;