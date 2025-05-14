import { API_URL } from "./config";
import { useState } from "react";
import { Candidate, Position } from "./adminTypes";
import { candidateSchema } from "./adminSchema";
import { z } from "zod";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { TabsContent } from "../ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

// Custom fetch function with exponential backoff for 429 errors
const fetchWithBackoff = async (url, retries = 3, delay = 1000) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithBackoff(url, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Custom mutation function with backoff
const mutateWithBackoff = async (url, method, data, retries = 3, delay = 1000) => {
  try {
    const response = await axios({ url, method, data });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return mutateWithBackoff(url, method, data, retries - 1, delay * 2);
    }
    throw error;
  }
};

const CandidatesPanel = () => {
  const queryClient = useQueryClient();
  const { address: account } = useAccount();
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      party: "Independent",
      position: "",
      imageUrl: "/placeholder.svg",
    },
  });

  // Fetch data with React Query
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => fetchWithBackoff(`${API_URL}/positions`),
    enabled: !!account,
    retry: 2,
    retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    onError: () => toast.error("Failed to fetch positions. Please try again later."),
  });

  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => fetchWithBackoff(`${API_URL}/candidates`),
    enabled: !!account,
    retry: 2,
    retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
    staleTime: 5 * 60 * 1000,
    onError: () => toast.error("Failed to fetch candidates. Please try again later."),
  });

  // Mutation for adding candidate
  const addCandidate = useMutation({
    mutationFn: (values: z.infer<typeof candidateSchema>) =>
      mutateWithBackoff(`${API_URL}/candidates`, "post", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate added successfully");
      candidateForm.reset();
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to add candidate");
      } else {
        toast.error("Failed to add candidate");
      }
    },
    onSettled: () => setIsAddingCandidate(false),
  });

  // Mutation for updating candidate
  const updateCandidate = useMutation({
    mutationFn: (values: z.infer<typeof candidateSchema>) =>
      mutateWithBackoff(`${API_URL}/candidates/${selectedCandidate?._id}`, "put", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate updated successfully");
      candidateForm.reset();
      setSelectedCandidate(null);
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to update candidate");
      } else {
        toast.error("Failed to update candidate");
      }
    },
    onSettled: () => setIsEditingCandidate(false),
  });

  // Mutation for deleting candidate
  const deleteCandidate = useMutation({
    mutationFn: (candidateId: string) =>
      mutateWithBackoff(`${API_URL}/candidates/${candidateId}`, "delete", null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted successfully");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to delete candidate");
      } else {
        toast.error("Failed to delete candidate");
      }
    },
    onSettled: () => setIsDeletingCandidate(false),
  });

  // Aggregate loading state
  const isLoading = isLoadingPositions || isLoadingCandidates;

  if (isLoading) {
    return (
      <TabsContent value="candidates">
        <div className="flex justify-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="candidates">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Candidates</h2>
        <Dialog open={isAddingCandidate} onOpenChange={setIsAddingCandidate}>
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
                onSubmit={candidateForm.handleSubmit((values) => {
                  setIsAddingCandidate(true);
                  addCandidate.mutate(values);
                })}
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
                      <FormDescription>
                        Optional, defaults to Independent.
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
                          <span className="text-destructive">
                            Create positions first.
                          </span>
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
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional, defaults to placeholder.
                      </FormDescription>
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
                      <TableCell className="font-medium">
                        {candidate.name}
                      </TableCell>
                      <TableCell>{candidate.party}</TableCell>
                      <TableCell>
                        {typeof candidate.position === "object"
                          ? candidate.position.name
                          : candidate.position}
                      </TableCell>
                      <TableCell>{candidate.voteCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog
                            open={isEditingCandidate && selectedCandidate?._id === candidate._id}
                            onOpenChange={(open) => {
                              setIsEditingCandidate(open);
                              if (!open) setSelectedCandidate(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCandidate(candidate);
                                      setIsEditingCandidate(true);
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
                                <DialogDescription>
                                  Update {candidate.name}'s details.
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...candidateForm}>
                                <form
                                  onSubmit={candidateForm.handleSubmit((values) => {
                                    setIsEditingCandidate(true);
                                    updateCandidate.mutate(values);
                                  })}
                                  className="space-y-6"
                                >
                                  <FormField
                                    control={candidateForm.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Jane Doe"
                                            {...field}
                                          />
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
                                          <Input
                                            placeholder="Independent"
                                            {...field}
                                          />
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
                                        <Select
                                          onValueChange={field.onChange}
                                          defaultValue={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select position" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {positions.map((position) => (
                                              <SelectItem
                                                key={position._id}
                                                value={position._id}
                                              >
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
                                          <Input
                                            placeholder="https://example.com/image.jpg"
                                            {...field}
                                          />
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
                          <Dialog
                            open={isDeletingCandidate && selectedCandidate?._id === candidate._id}
                            onOpenChange={(open) => {
                              setIsDeletingCandidate(open);
                              if (!open) setSelectedCandidate(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCandidate(candidate);
                                      setIsDeletingCandidate(true);
                                    }}
                                  >
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
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => setIsDeletingCandidate(false)}
                                >
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
                    <TableCell
                      colSpan={6}
                      className="text-center py-4 text-slate-500"
                    >
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
                      <Dialog
                        open={isEditingCandidate && selectedCandidate?._id === candidate._id}
                        onOpenChange={(open) => {
                          setIsEditingCandidate(open);
                          if (!open) setSelectedCandidate(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setIsEditingCandidate(true);
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
                            <DialogDescription>
                              Update {candidate.name}'s details.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...candidateForm}>
                            <form
                              onSubmit={candidateForm.handleSubmit((values) => {
                                setIsEditingCandidate(true);
                                updateCandidate.mutate(values);
                              })}
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
                                      <Input
                                        placeholder="Independent"
                                        {...field}
                                      />
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
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select position" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {positions.map((position) => (
                                          <SelectItem
                                            key={position._id}
                                            value={position._id}
                                          >
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
                                      <Input
                                        placeholder="https://example.com/image.jpg"
                                        {...field}
                                      />
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
                      <Dialog
                        open={isDeletingCandidate && selectedCandidate?._id === candidate._id}
                        onOpenChange={(open) => {
                          setIsDeletingCandidate(open);
                          if (!open) setSelectedCandidate(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setIsDeletingCandidate(true);
                            }}
                          >
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
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setIsDeletingCandidate(false)}
                            >
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
  );
};

export default CandidatesPanel;