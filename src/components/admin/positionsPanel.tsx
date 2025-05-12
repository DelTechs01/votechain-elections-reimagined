import {positionSchema} from "./adminSchema";
import { API_URL } from "./config";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAccount } from "wagmi";


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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { TabsContent } from "../ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const PositionsPanel = () => {
  const queryClient = useQueryClient();
  const { address: account } = useAccount();
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [isAddingElection, setIsAddingElection] = useState(false);

  // Forms
  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: "", description: "" },
  });

  //fetch data with react query
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => axios.get(`${API_URL}/positions`).then((res) => res.data),
    enabled: !!account,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => axios.get(`${API_URL}/candidates`).then((res) => res.data),
    enabled: !!account,
  });

  // Add mutation
  const addPosition = useMutation({
    mutationFn: (values: z.infer<typeof positionSchema>) =>
      axios.post(`${API_URL}/positions`, values),
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

  return (
    <>
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
                  onSubmit={positionForm.handleSubmit((values) =>
                    addPosition.mutate(values)
                  )}
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
                    <Button
                      type="submit"
                      disabled={isAddingPosition}
                      className="w-full sm:w-auto"
                    >
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
                          <TableCell className="font-medium">
                            {position.name}
                          </TableCell>
                          <TableCell>{position.description || "—"}</TableCell>
                          <TableCell>{candidateCount}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-4 text-slate-500"
                      >
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
                <p className="text-center py-4 text-slate-500">
                  No positions found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
};

export default PositionsPanel;
