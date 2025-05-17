import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Image, FileText, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const KYCPage = () => {
  const { account, fetchKycStatus, kycStatus }: { account: string; fetchKycStatus: () => void; kycStatus: { status: 'not submitted' | 'pending' | 'approved' | 'rejected' | 'received'; submittedAt?: string | Date; feedback?: string } } = useWeb3();
  const [files, setFiles] = useState({
    idFront: null,
    idBack: null,
    profilePicture: null,
  });
  const [previews, setPreviews] = useState({
    idFront: null,
    idBack: null,
    profilePicture: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentCaptureType, setCurrentCaptureType] = useState(null); // 'idFront', 'idBack', or 'profilePicture'
  const fileInputRefs = {
    idFront: useRef(null),
    idBack: useRef(null),
    profilePicture: useRef(null),
  };
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Fetch KYC status on component mount or when account changes
  useEffect(() => {
    if (account) {
      fetchKycStatus();
    }
  }, [account, fetchKycStatus]);

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle file selection
  const handleFileChange = (type) => (e) => {
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
      
      setFiles(prev => ({ ...prev, [type]: selectedFile }));
      
      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviews(prev => ({ ...prev, [type]: event.target?.result }));
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreviews(prev => ({ ...prev, [type]: null }));
      }
    }
  };

  // Handle camera access
  const startCamera = async (type) => {
    setIsCameraLoading(true);
    setCurrentCaptureType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Use front camera as requested
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
        toast.info(`Position your ${type === 'idFront' ? 'ID front' : type === 'idBack' ? 'ID back' : 'profile picture'} clearly within the frame`);
      }
    } catch (err) {
      toast.error('Failed to access camera. Please ensure camera permissions are enabled.');
      console.error('Error accessing camera:', err);
      setCurrentCaptureType(null);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Capture image from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current && currentCaptureType) {
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
            const capturedFile = new File([blob], `${currentCaptureType}-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFiles(prev => ({ ...prev, [currentCaptureType]: capturedFile }));
            setPreviews(prev => ({ ...prev, [currentCaptureType]: canvas.toDataURL('image/jpeg', 0.8) }));
            toast.success(`${currentCaptureType === 'idFront' ? 'ID front' : currentCaptureType === 'idBack' ? 'ID back' : 'Profile picture'} captured successfully!`);
            
            // Close camera
            stopCamera();
            setIsCameraOpen(false);
            setCurrentCaptureType(null);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCurrentCaptureType(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!files.idFront || !files.idBack) {
      toast.error('Please provide both front and back ID documents');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('idFront', files.idFront);
      formData.append('idBack', files.idBack);
      if (files.profilePicture) {
        formData.append('profilePicture', files.profilePicture);
      }
      formData.append('walletAddress', account);
      
      // Send to backend API
      const response = await axios.post(`${API_URL}/kyc/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success(response.data.message || 'KYC submitted successfully! Your ID is being verified.');
      fetchKycStatus();
      
      // Clear form
      setFiles({ idFront: null, idBack: null, profilePicture: null });
      setPreviews({ idFront: null, idBack: null, profilePicture: null });
      Object.values(fileInputRefs).forEach(ref => {
        if (ref.current) ref.current.value = '';
      });
      
    } catch (error) {
      console.error('Error submitting KYC:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit KYC. Please try again.';
      toast.error(errorMessage);
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

  const renderCameraModal = () => {
    if (!isCameraOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              Capture {currentCaptureType === 'idFront' ? 'ID Front' : currentCaptureType === 'idBack' ? 'ID Back' : 'Profile Picture'}
            </h3>
            <Button variant="ghost" onClick={stopCamera}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full rounded-lg"
            />
            <div className="absolute inset-0 border-2 border-dashed border-white/50 m-4 pointer-events-none" />
          </div>
          <div className="mt-4 flex space-x-2">
            <Button onClick={captureImage} className="flex-1">
              <Image className="mr-2 h-4 w-4" />
              Capture
            </Button>
            <Button onClick={stopCamera} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
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
            To vote in elections without paying gas fees, please upload or capture photos of both the front and back of your ID document. A profile picture is optional.
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
                <div className="space-y-6">
                  {/* ID Front */}
                  <div className="grid gap-2">
                    <Label htmlFor="idFront">ID Document (Front)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="idFront"
                        type="file"
                        ref={fileInputRefs.idFront}
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange('idFront')}
                        className="file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      />
                      <Button
                        type="button"
                        onClick={() => startCamera('idFront')}
                        disabled={isCameraLoading}
                        variant="outline"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Accepted formats: JPG, PNG, PDF (max 5MB)
                    </p>
                    {previews.idFront ? (
                      <div className="mt-2">
                        <img src={previews.idFront} alt="ID Front Preview" className="max-h-40 rounded-lg border" />
                      </div>
                    ) : files.idFront && (
                      <div className="mt-2 flex items-center p-2 rounded-lg border bg-muted">
                        <FileText className="h-6 w-6 mr-2 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{files.idFront.name}</p>
                          <p className="text-xs text-muted-foreground">{(files.idFront.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ID Back */}
                  <div className="grid gap-2">
                    <Label htmlFor="idBack">ID Document (Back)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="idBack"
                        type="file"
                        ref={fileInputRefs.idBack}
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange('idBack')}
                        className="file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      />
                      <Button
                        type="button"
                        onClick={() => startCamera('idBack')}
                        disabled={isCameraLoading}
                        variant="outline"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Accepted formats: JPG, PNG, PDF (max 5MB)
                    </p>
                    {previews.idBack ? (
                      <div className="mt-2">
                        <img src={previews.idBack} alt="ID Back Preview" className="max-h-40 rounded-lg border" />
                      </div>
                    ) : files.idBack && (
                      <div className="mt-2 flex items-center p-2 rounded-lg border bg-muted">
                        <FileText className="h-6 w-6 mr-2 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{files.idBack.name}</p>
                          <p className="text-xs text-muted-foreground">{(files.idBack.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Picture (Optional) */}
                  <div className="grid gap-2">
                    <Label htmlFor="profilePicture">Profile Picture (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="profilePicture"
                        type="file"
                        ref={fileInputRefs.profilePicture}
                        accept=".jpg,.jpeg,.png"
                        onChange={handleFileChange('profilePicture')}
                        className="file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      />
                      <Button
                        type="button"
                        onClick={() => startCamera('profilePicture')}
                        disabled={isCameraLoading}
                        variant="outline"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Accepted formats: JPG, PNG (max 5MB)
                    </p>
                    {previews.profilePicture && (
                      <div className="mt-2">
                        <img src={previews.profilePicture} alt="Profile Picture Preview" className="max-h-40 rounded-lg border" />
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Button 
                      type="submit" 
                      disabled={
                        !files.idFront || 
                        !files.idBack || 
                        isSubmitting || 
                        !account ||
                        kycStatus.status === 'received' || 
                        kycStatus.status === 'approved' || 
                        kycStatus.status === 'pending'
                      } 
                      className="w-full"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit ID for Verification'}
                    </Button>
                    
                    {!account && (
                      <p className="text-sm text-red-500 mt-2">
                        Please connect your wallet to submit KYC.
                      </p>
                    )}
                    
                    {kycStatus.status === 'received' && (
                      <p className="text-sm text-blue-500 mt-2">
                        Your KYC is under review. Please wait for approval.
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
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {renderCameraModal()}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default KYCPage;