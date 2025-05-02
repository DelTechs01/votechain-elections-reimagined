
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';

const KYCPage = () => {
  const { account } = useWeb3();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const navigate = useNavigate();

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
      
      // In a real implementation, send to your backend API
      // const response = await fetch('http://localhost:5000/api/kyc/submit', {
      //   method: 'POST',
      //   body: formData
      // });
      
      // Mock successful submission for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // if (!response.ok) throw new Error('Failed to submit KYC');
      
      toast.success('KYC submitted successfully! Your ID is being verified.');
      navigate('/elections'); // Redirect to elections page
      
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast.error('Failed to submit KYC. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
        KYC Verification
      </h1>
      
      <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
        <CardHeader>
          <CardTitle>Submit Your ID Document</CardTitle>
          <CardDescription>
            To vote in elections, we need to verify your identity. Please upload or capture a photo of your ID document.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2 mb-6">
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
            </Tabs>
            
            <div className="mt-6">
              <Button 
                type="submit" 
                disabled={!file || isSubmitting || !account} 
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit ID for Verification'}
              </Button>
              
              {!account && (
                <p className="text-sm text-red-500 mt-2">
                  Please connect your wallet to submit KYC.
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCPage;
