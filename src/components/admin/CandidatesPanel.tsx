import { useState } from "react";
import { Candidate, Position } from "./adminTypes";
import { candidateSchema } from "./adminSchema";
import { z } from "node_modules/zod/lib/external";
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
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
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

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

//
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CandidatesPanel = () => {
  const queryClient = useQueryClient();
  const { address: account } = useAccount();
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      party: "Independent",
      position: "",
      imageUrl: "/placeholder.svg",
    },
  });

  //fetch data with react query
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => axios.get(`${API_URL}/position`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => axios.get(`${API_URL}/candidates`).then((res) => res.data),
    enabled: !!account,
  });

  //mutation for adding candidate
  const addCandidate = useMutation({
    mutationFn: (values: z.infer<typeof candidateSchema>) =>
      axios.post(`${API_URL}/candidates`, values),
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
    mutationFn: (candidateId: string) =>
      axios.delete(`${API_URL}/candidates/${candidateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete candidate");
    },
    onSettled: () => setIsDeletingCandidate(false),
  });
  return (
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
                onSubmit={candidateForm.handleSubmit((values) =>
                  addCandidate.mutate(values)
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
                                <DialogDescription>
                                  Update {candidate.name}'s details.
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...candidateForm}>
                                <form
                                  onSubmit={candidateForm.handleSubmit(
                                    (values) => updateCandidate.mutate(values)
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
                                      disabled={
                                        isEditingCandidate || !positions.length
                                      }
                                      className="w-full sm:w-auto"
                                    >
                                      {isEditingCandidate
                                        ? "Updating..."
                                        : "Update Candidate"}
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
                                  Are you sure you want to delete{" "}
                                  {candidate.name}?
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    deleteCandidate.mutate(candidate._id)
                                  }
                                  disabled={isDeletingCandidate}
                                  className="w-full sm:w-auto"
                                >
                                  {isDeletingCandidate
                                    ? "Deleting..."
                                    : "Delete"}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
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
                        <p className="text-sm text-slate-500">
                          {candidate.party}
                        </p>
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
                            <DialogDescription>
                              Update {candidate.name}'s details.
                            </DialogDescription>
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
                                  disabled={
                                    isEditingCandidate || !positions.length
                                  }
                                  className="w-full"
                                >
                                  {isEditingCandidate
                                    ? "Updating..."
                                    : "Update Candidate"}
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
                              onClick={() =>
                                deleteCandidate.mutate(candidate._id)
                              }
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
              <p className="text-center py-4 text-slate-500">
                No candidates found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default CandidatesPanel;
