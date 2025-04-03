import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyPage() {
  const [, params] = useRoute("/verify/:token");
  const token = params?.token;
  const { user, resendVerificationMutation } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!token) return;
    
    const verifyToken = async () => {
      try {
        await apiRequest("GET", `/api/verify/${token}`);
        setIsVerified(true);
      } catch (err) {
        setError(err.message || "Failed to verify email");
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyToken();
  }, [token]);
  
  // Redirect to home if no token
  if (!token) {
    return <Redirect to="/" />;
  }
  
  // Show loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 items-center text-center">
            <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show success state
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 items-center text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-2" />
            <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now use all features of the platform.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <a href="/">Go to Gallery</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Show error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 items-center text-center">
          <XCircle className="h-16 w-16 text-red-500 mb-2" />
          <CardTitle className="text-2xl font-bold">Verification Failed</CardTitle>
          <CardDescription>
            {error || "The verification link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center flex-col space-y-3">
          {user && !user.isVerified && (
            <Button 
              onClick={() => resendVerificationMutation.mutate()} 
              disabled={resendVerificationMutation.isPending}
            >
              {resendVerificationMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Resend Verification Email
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href="/">Return to Home</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
