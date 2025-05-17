import { API_URL } from "./config";
import { kycUpdateSchema } from "./adminSchema";
import { KYCSubmission } from "./adminTypes";
import { useState, useCallback } from "react";
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
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

const KycPanel = () => {
  const queryClient = useQueryClient();
  const [account, setAccount] = useState<string | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<KYCSubmission | null>(null);

  //form
  const kycForm = useForm<z.infer<typeof kycUpdateSchema>>({
    resolver: zodResolver(kycUpdateSchema),
    defaultValues: { status: "Approved", feedback: "" }, // Fix: must match z.enum(["Approved", "rejected"])
  });

  //fetch data with react query
  const { data: kycSubmissions = [], isLoading: isLoadingKyc } = useQuery({
    queryKey: ["kycSubmissions"],
    queryFn: () => axios.get(`${API_URL}/kyc/all`).then((res) => res.data),
    enabled: !!account,
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
    onError: (error: unknown) => {
      // Fix: avoid 'any' type
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to update KYC");
      } else {
        toast.error("Failed to update KYC");
      }
    },
  });

  // KYC Documents
  const [documentPreviews, setDocumentPreviews] = useState<{
    [key: string]: string;
  }>({});
  const [documentError, setDocumentError] = useState<string | null>(null);
  const fetchKycDocuments = useCallback(async (kycId: string) => {
    setDocumentError(null);
    try {
      const response = await axios.get(`${API_URL}/kyc/${kycId}/documents`, {
        timeout: 10000,
      });
      const previews: { [key: string]: string } = {};
      response.data.forEach(
        (doc: { type: string; data: string; mimetype: string }) => {
          previews[doc.type] = `data:${doc.mimetype};base64,${doc.data}`;
        }
      );
      setDocumentPreviews(previews);
    } catch (error) {
      setDocumentError("Failed to load KYC documents");
      setDocumentPreviews({});
    }
  }, []);

  return (
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
                          {kyc.status.charAt(0).toUpperCase() +
                            kyc.status.slice(1)}
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
                                Review documents and update KYC status for{" "}
                                {kyc.walletAddress.slice(0, 6)}...
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col sm:flex-row gap-6 py-4">
                              {/* Documents Section */}
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-4">
                                  Documents
                                </h3>
                                {documentError ? (
                                  <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                      {documentError}
                                    </AlertDescription>
                                  </Alert>
                                ) : Object.keys(documentPreviews).length ? (
                                  <Carousel className="w-full">
                                    <CarouselContent>
                                      {[
                                        "idFront",
                                        "idBack",
                                        "profilePicture",
                                      ].map(
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
                                                    window.open(
                                                      documentPreviews[type],
                                                      "_blank"
                                                    )
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
                                  <h3 className="text-lg font-semibold mb-2">
                                    Details
                                  </h3>
                                  <div className="space-y-2">
                                    <div>
                                      <label className="text-sm text-muted-foreground">
                                        Wallet Address
                                      </label>
                                      <p className="font-mono text-sm break-all">
                                        {kyc.walletAddress}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm text-muted-foreground">
                                        Submitted On
                                      </label>
                                      <p>
                                        {new Date(
                                          kyc.createdAt
                                        ).toLocaleDateString("en-US", {
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
                                    <h3 className="text-lg font-semibold mb-2">
                                      Status History
                                    </h3>
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                      {kyc.history.map((entry, index) => (
                                        <div
                                          key={index}
                                          className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md"
                                        >
                                          <p className="text-sm">
                                            <span className="font-medium">
                                              {entry.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                entry.status.slice(1)}
                                            </span>{" "}
                                            -{" "}
                                            {new Date(
                                              entry.updatedAt
                                            ).toLocaleDateString()}
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
                                    onSubmit={kycForm.handleSubmit((values) =>
                                      updateKyc.mutate(values)
                                    )}
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
                                              <SelectItem value="approved">
                                                Approved
                                              </SelectItem>
                                              <SelectItem value="rejected">
                                                Rejected
                                              </SelectItem>
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
                                            <Input
                                              placeholder="Reason for rejection"
                                              {...field}
                                            />
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
                    <TableCell
                      colSpan={4}
                      className="text-center py-4 text-slate-500"
                    >
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
                      <p className="font-mono text-sm break-all">
                        {kyc.walletAddress}
                      </p>
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
                        {kyc.status.charAt(0).toUpperCase() +
                          kyc.status.slice(1)}
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
                            Review documents and update KYC status for{" "}
                            {kyc.walletAddress.slice(0, 6)}...
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          {/* Documents Section */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">
                              Documents
                            </h3>
                            {documentError ? (
                              <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                  {documentError}
                                </AlertDescription>
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
                                                window.open(
                                                  documentPreviews[type],
                                                  "_blank"
                                                )
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
                              <h3 className="text-lg font-semibold mb-2">
                                Details
                              </h3>
                              <div className="space-y-2">
                                <div>
                                  <label className="text-sm text-muted-foreground">
                                    Wallet Address
                                  </label>
                                  <p className="font-mono text-sm break-all">
                                    {kyc.walletAddress}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">
                                    Submitted On
                                  </label>
                                  <p>
                                    {new Date(kyc.createdAt).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}
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
                                <h3 className="text-lg font-semibold mb-2">
                                  Status History
                                </h3>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                  {kyc.history.map((entry, index) => (
                                    <div
                                      key={index}
                                      className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md"
                                    >
                                      <p className="text-sm">
                                        <span className="font-medium">
                                          {entry.status
                                            .charAt(0)
                                            .toUpperCase() +
                                            entry.status.slice(1)}
                                        </span>{" "}
                                        -{" "}
                                        {new Date(
                                          entry.updatedAt
                                        ).toLocaleDateString()}
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
                                onSubmit={kycForm.handleSubmit((values) =>
                                  updateKyc.mutate(values)
                                )}
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
                                          <SelectItem value="approved">
                                            Approved
                                          </SelectItem>
                                          <SelectItem value="rejected">
                                            Rejected
                                          </SelectItem>
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
                                        <Input
                                          placeholder="Reason for rejection"
                                          {...field}
                                        />
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
              <p className="text-center py-4 text-slate-500">
                No KYC submissions found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default KycPanel;

