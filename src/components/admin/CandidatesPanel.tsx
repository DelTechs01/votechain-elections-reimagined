import { useState } from "react";
import { Candidate, Position } from "../admin/adminTypes";
import { candidateSchema } from "../admin/adminSchema";
import { z } from "zod";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { TabsContent } from "../ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { API_URL } from "./config";
import { useApi } from "../utils/api";

interface CandidatesPanelProps {
  candidates: Candidate[];
  positions: Position[];
  isLoading: boolean;
}

const CandidatesPanel = ({ candidates, positions = [], isLoading }: CandidatesPanelProps) => {
  const { address: account } = useAccount();
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const { mutate } = useApi();

  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      party: "Independent",
      position: "",
      imageUrl: "/placeholder.svg",
    },
  });

  // Mutations
  const addCandidate = mutate<void, z.infer<typeof candidateSchema>>(
    `${API_URL}/candidates`,
    "post",
    "Candidate added successfully"
  );

  const updateCandidate = mutate<void, z.infer<typeof candidateSchema>>(
    `${API_URL}/candidates/${selectedCandidate?._id}`,
    "put",
    "Candidate updated successfully"
  );

  const deleteCandidate = mutate<void, void>(
    `${API_URL}/candidates/${selectedCandidate?._id}`,
    "delete",
    "Candidate deleted successfully"
  );

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
                  addCandidate.mutate(values, {
                    onSettled: () => {
                      setIsAddingCandidate(false);
                      candidateForm.reset();
                    },
                  });
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
                    disabled={addCandidate.isLoading || !positions.length}
                    className="w-full sm:w-auto"
                  >
                    {addCandidate.isLoading ? "Adding..." : "Add Candidate"}
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
                                    updateCandidate.mutate(values, {
                                      onSettled: () => {
                                        setIsEditingCandidate(false);
                                        setSelectedCandidate(null);
                                        candidateForm.reset();
                                      },
                                    });
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
                                      disabled={updateCandidate.isLoading || !positions.length}
                                      className="w-full sm:w-auto"
                                    >
                                      {updateCandidate.isLoading ? "Updating..." : "Update Candidate"}
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
                                  onClick={() => {
                                    deleteCandidate.mutate(undefined, {
                                      onSettled: () => {
                                        setIsDeletingCandidate(false);
                                        setSelectedCandidate(null);
                                      },
                                    });
                                  }}
                                  disabled={deleteCandidate.isLoading}
                                  className="w-full sm:w-auto"
                                >
                                  {deleteCandidate.isLoading ? "Deleting..." : "Delete"}
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
                                updateCandidate.mutate(values, {
                                  onSettled: () => {
                                    setIsEditingCandidate(false);
                                    setSelectedCandidate(null);
                                    candidateForm.reset();
                                  },
                                });
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
                                  disabled={updateCandidate.isLoading || !positions.length}
                                  className="w-full"
                                >
                                  {updateCandidate.isLoading ? "Updating..." : "Update Candidate"}
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
                              onClick={() => {
                                deleteCandidate.mutate(undefined, {
                                  onSettled: () => {
                                    setIsDeletingCandidate(false);
                                    setSelectedCandidate(null);
                                  },
                                });
                              }}
                              disabled={deleteCandidate.isLoading}
                              className="w-full"
                            >
                              {deleteCandidate.isLoading ? "Deleting..." : "Delete"}
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