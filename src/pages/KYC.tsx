
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Image, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const KYCPage = () => {
  const { account, fetchKycStatus, kycStatus } = useWeb3();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const navigate = useNavigate();

  // Fetch KYC status on component mount or when account changes
  useEffect(() => {
    if (account) {
      fetchKycStatus();
    }
  }, [account, fetchKycStatus]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid file (JPEG, PNG, or PDF)');
        return;
      }
      
      // Check file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File is too large. Maximum size is 5MB');
        return;
      }
      
      setFile(selectedFile);
      
      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // For PDF, show a generic icon
        setPreview(null);
      }
    }
  };

  // Handle camera access
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      toast.error('Failed to access camera');
      console.error('Error accessing camera:', err);
    }
  };

  // Capture image from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame on canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to file
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], 'id-capture.jpg', { type: 'image/jpeg' });
            setFile(capturedFile);
            setPreview(canvas.toDataURL('image/jpeg'));
            
            // Stop camera stream
            const stream = video.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              video.srcObject = null;
              setIsCameraActive(false);
            }
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!file) {
      toast.error('Please upload or capture an ID document');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('idDocument', file);
      formData.append('walletAddress', account);
      
      // Send to backend API
      const response = await axios.post(`${API_URL}/kyc/submit`, formData);
      
      toast.success('KYC submitted successfully! Your ID is being verified.');
      fetchKycStatus();
      
      // Clear form
      setFile(null);
      setPreview(null);
      
    } catch (error: any) {
      console.error('Error submitting KYC:', error);
      toast.error(error.response?.data?.message || 'Failed to submit KYC. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGaslessTransactionInfo = () => {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No gas fees required</AlertTitle>
        <AlertDescription>
          Our system uses gasless transactions, so you don't need ETH or any tokens to vote. Simply verify your identity through KYC, and you'll be able to vote without any transaction fees.
        </AlertDescription>
      </Alert>
    );
  };

  const renderKYCStatusTab = () => {
    return (
      <div className="space-y-6">
        {renderGaslessTransactionInfo()}

        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {kycStatus.status === 'approved' && <CheckCircle className="h-10 w-10 text-green-500" />}
            {kycStatus.status === 'rejected' && <AlertCircle className="h-10 w-10 text-red-500" />}
            {kycStatus.status === 'pending' && <Clock className="h-10 w-10 text-yellow-500" />}
            {kycStatus.status === 'not submitted' && <AlertCircle className="h-10 w-10 text-gray-400" />}
          </div>
          <div>
            <h3 className="text-lg font-medium">
              {kycStatus.status === 'approved' && 'KYC Approved'}
              {kycStatus.status === 'rejected' && 'KYC Rejected'}
              {kycStatus.status === 'pending' && 'KYC Pending Review'}
              {kycStatus.status === 'not submitted' && 'KYC Not Submitted'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {kycStatus.status === 'approved' && 'Your identity has been verified. You can now participate in elections without paying gas fees.'}
              {kycStatus.status === 'rejected' && 'Your KYC was rejected. Please see feedback below.'}
              {kycStatus.status === 'pending' && 'Your KYC is currently under review. This process may take 24-48 hours.'}
              {kycStatus.status === 'not submitted' && 'Please submit your KYC to participate in elections.'}
            </p>
          </div>
        </div>

        {kycStatus.submittedAt && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p>Submitted on: {new Date(kycStatus.submittedAt).toLocaleDateString()} at {new Date(kycStatus.submittedAt).toLocaleTimeString()}</p>
          </div>
        )}

        {kycStatus.feedback && (
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
            <p className="font-medium mb-1">Feedback:</p>
            <p>{kycStatus.feedback}</p>
          </div>
        )}

        {kycStatus.status === 'rejected' && (
          <div className="text-center pt-4">
            <Button onClick={() => document.getElementById('upload-tab')?.click()}>
              Submit New KYC
            </Button>
          </div>
        )}

        {kycStatus.status === 'not submitted' && (
          <div className="text-center pt-4">
            <Button onClick={() => document.getElementById('upload-tab')?.click()}>
              Submit KYC Now
            </Button>
          </div>
        )}

        {kycStatus.status === 'approved' && (
          <div className="text-center pt-4">
            <Button onClick={() => navigate('/elections')}>
              View Elections
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
        KYC Verification for Gasless Voting
      </h1>
      
      <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
          <CardDescription>
            To vote in elections without paying gas fees, we need to verify your identity. Please upload or capture a photo of your ID document.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue={kycStatus.status !== 'not submitted' ? 'status' : 'upload'}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="status" id="status-tab">
                <CheckCircle className="mr-2 h-4 w-4" />
                KYC Status
              </TabsTrigger>
              <TabsTrigger value="upload" id="upload-tab">
                <Upload className="mr-2 h-4 w-4" />
                Submit KYC
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="status">
              {renderKYCStatusTab()}
            </TabsContent>
            
            <TabsContent value="upload">
              {renderGaslessTransactionInfo()}
              
              <form onSubmit={handleSubmit}>
                <Tabs defaultValue="upload" className="mb-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload ID
                    </TabsTrigger>
                    <TabsTrigger value="camera">
                      <Camera className="mr-2 h-4 w-4" />
                      Use Camera
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="idDocument">Upload ID Document</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="idDocument"
                            type="file"
                            ref={fileInputRef}
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileChange}
                            className="file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Accepted formats: JPG, PNG, PDF (max 5MB)
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="camera">
                    <div className="space-y-4">
                      {!isCameraActive ? (
                        <Button type="button" onClick={startCamera} className="w-full">
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div className="relative bg-black rounded-lg overflow-hidden">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full rounded-lg"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button type="button" onClick={captureImage} className="flex-1">
                              <Image className="mr-2 h-4 w-4" />
                              Capture
                            </Button>
                            <Button type="button" onClick={stopCamera} variant="outline" className="flex-1">
                              Stop Camera
                            </Button>
                          </div>
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  </TabsContent>
                </Tabs>

                {preview && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Preview</h3>
                    <div className="relative max-h-80 w-full overflow-hidden rounded-lg border bg-muted">
                      <img src={preview} alt="ID Preview" className="object-contain w-full h-full" />
                    </div>
                  </div>
                )}
                
                {file && !preview && (
                  <div className="mt-6 flex items-center p-4 rounded-lg border bg-muted">
                    <FileText className="h-10 w-10 mr-2 text-blue-500" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-6">
                  <Button 
                    type="submit" 
                    disabled={!file || isSubmitting || !account || kycStatus.status === 'approved' || kycStatus.status === 'pending'} 
                    className="w-full"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit ID for Verification'}
                  </Button>
                  
                  {!account && (
                    <p className="text-sm text-red-500 mt-2">
                      Please connect your wallet to submit KYC.
                    </p>
                  )}
                  
                  {kycStatus.status === 'pending' && (
                    <p className="text-sm text-yellow-500 mt-2">
                      Your KYC is already under review. Please wait for approval.
                    </p>
                  )}
                  
                  {kycStatus.status === 'approved' && (
                    <p className="text-sm text-green-500 mt-2">
                      Your KYC is already approved. No need to submit again.
                    </p>
                  )}
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCPage;
