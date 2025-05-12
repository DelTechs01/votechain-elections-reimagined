import { API_URL } from "./config";
import { electionSchema } from "./adminSchema";
import { useState } from "react";
import { useWeb3 } from "../../context/Web3Context";
import { z } from "zod";
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
  Loader2,
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
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

const ElectionsPanel = () => {
  const { account, isAdmin } = useWeb3();
  const queryClient = useQueryClient();
  const [isAddingElection, setIsAddingElection] = useState(false);

  const electionForm = useForm<z.infer<typeof electionSchema>>({
    resolver: zodResolver(electionSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      candidateIds: [],
    },
  });

  //fetch data with React query

  const { data: elections = [], isLoading: isLoadingElections } = useQuery({
    queryKey: ["elections"],
    queryFn: () => axios.get(`${API_URL}/elections`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => axios.get(`${API_URL}/candidates`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: () => axios.get(`${API_URL}/positions`).then((res) => res.data),
    enabled: !!account,
  });

  //Mutations
  const addElection = useMutation({
    mutationFn: (values: z.infer<typeof electionSchema>) =>
      axios.post(`${API_URL}/elections`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      toast.success("Election created successfully");
      electionForm.reset();
    },
    onError: (error: Error | unknown) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to create election");
      } else {
        toast.error("Failed to create election");
      }
    },
    onSettled: () => setIsAddingElection(false),
  });

  return (
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
                onSubmit={electionForm.handleSubmit((values) =>
                  addElection.mutate(values)
                )}
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
                            if (!current.includes(value))
                              field.onChange([...current, value]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select candidates" />
                          </SelectTrigger>
                          <SelectContent>
                            {candidates.map((candidate) => (
                              <SelectItem
                                key={candidate._id}
                                value={candidate._id}
                              >
                                {candidate.name} (
                                {typeof candidate.position === "object"
                                  ? candidate.position.name
                                  : positions.find(
                                      (p) => p._id === candidate.position
                                    )?.name}
                                )
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <div className="mt-2">
                        {field.value?.map((id: string) => {
                          const candidate = candidates.find(
                            (c) => c._id === id
                          );
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
                                  field.onChange(
                                    field.value.filter((v: string) => v !== id)
                                  )
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
                      <TableCell className="font-medium">
                        {election.title}
                      </TableCell>
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
                          {election.status.charAt(0).toUpperCase() +
                            election.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(election.startDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(election.endDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>{election.participantsCount}</TableCell>
                      <TableCell>{election.votersCount}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-4 text-slate-500"
                    >
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
                        {election.status.charAt(0).toUpperCase() +
                          election.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Start Date</p>
                      <p>
                        {new Date(election.startDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">End Date</p>
                      <p>
                        {new Date(election.endDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
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
              <p className="text-center py-4 text-slate-500">
                No elections found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
export default ElectionsPanel;

