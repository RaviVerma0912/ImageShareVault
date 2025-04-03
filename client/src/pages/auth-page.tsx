import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Redirect } from "wouter";
import { insertUserSchema } from "@shared/schema";
import { Loader2, User, Lock } from "lucide-react";
import Footer from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loginMutation, registerMutation, isLoading: isLoadingUser } = useAuth();
  const { toast } = useToast();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  
  // Create a very basic schema with minimal validation
  const registerFormSchema = z.object({
    name: z.string(),
    email: z.string(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters")
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });
  
  const registerForm = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    },
    mode: "onChange" // Update validation on change
  });
  
  // Log form errors for debugging
  useEffect(() => {
    const registerErrors = registerForm.formState.errors;
    if (Object.keys(registerErrors).length > 0) {
      console.log("Register form errors:", registerErrors);
    }
  }, [registerForm.formState.errors]);
  
  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };
  
  const onRegisterSubmit = (data: z.infer<typeof registerFormSchema>) => {
    console.log("Form submission data:", data);
    
    // Convert form data to the format expected by the API
    const userData = {
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      isVerified: false
    };
    
    registerMutation.mutate(userData);
    
    // Show toast for form submission
    toast({
      title: "Form submitted",
      description: "Processing your registration...",
    });
  };
  
  // Redirect to home if already logged in
  if (user && !isLoadingUser) {
    return <Redirect to="/" />;
  }
  
  const isPendingLogin = loginMutation.isPending;
  const isPendingRegister = registerMutation.isPending;
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col md:flex-row items-stretch">
        {/* Hero section */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-black to-primary/80 flex flex-col justify-center items-center p-8 text-white">
          <div className="max-w-md mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Modern Image Gallery
            </h1>
            <p className="text-lg md:text-xl opacity-90">
              Upload, organize, and share your favorite images with our moderated platform.
            </p>
            <div className="pt-4">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <div className="rounded-full bg-white/20 p-1 mr-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Professional moderation
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-white/20 p-1 mr-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Secure image storage
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-white/20 p-1 mr-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Community features
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Form section */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {isLogin ? (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold">Sign in</h2>
                  <p className="mt-2 text-muted-foreground">
                    Or{" "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className="font-medium text-primary hover:text-primary/90"
                    >
                      create a new account
                    </button>
                  </p>
                </div>
                
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4"></CardHeader>
                  <CardContent className="pt-4">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="login-email" className="text-sm font-medium">Email address</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">
                              <User size={18} />
                            </span>
                            <input 
                              id="login-email"
                              name="email"
                              type="text" 
                              className="pl-10 w-full h-10 px-3 py-2 border border-input rounded-md"
                              placeholder="name@example.com" 
                              autoComplete="email"
                              disabled={isPendingLogin}
                              onChange={(e) => loginForm.setValue('email', e.target.value)}
                              defaultValue={loginForm.getValues().email || ''}
                            />
                          </div>
                          {loginForm.formState.errors.email && (
                            <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="login-password" className="text-sm font-medium">Password</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">
                              <Lock size={18} />
                            </span>
                            <input 
                              id="login-password"
                              name="password"
                              type="password" 
                              className="pl-10 w-full h-10 px-3 py-2 border border-input rounded-md"
                              placeholder="••••••••" 
                              autoComplete="current-password"
                              disabled={isPendingLogin}
                              onChange={(e) => loginForm.setValue('password', e.target.value)}
                              defaultValue={loginForm.getValues().password || ''}
                            />
                          </div>
                          {loginForm.formState.errors.password && (
                            <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center">
                            <Checkbox id="remember-me" />
                            <label
                              htmlFor="remember-me"
                              className="ml-2 block text-sm"
                            >
                              Remember me
                            </label>
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full mt-2 bg-gradient-to-r from-primary to-primary/80" 
                          disabled={isPendingLogin}
                        >
                          {isPendingLogin ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Sign in
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold">Create account</h2>
                  <p className="mt-2 text-muted-foreground">
                    Or{" "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      className="font-medium text-primary hover:text-primary/90"
                    >
                      sign in to your existing account
                    </button>
                  </p>
                </div>
                
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4"></CardHeader>
                  <CardContent className="pt-4">
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium">Full name</label>
                          <input 
                            id="name"
                            name="name"
                            type="text"
                            placeholder="John Doe" 
                            autoComplete="name"
                            disabled={isPendingRegister}
                            className="w-full h-10 px-3 py-2 border border-input rounded-md"
                            maxLength={100}
                            onChange={(e) => registerForm.setValue('name', e.target.value)}
                            defaultValue={registerForm.getValues().name || ''}
                          />
                          {registerForm.formState.errors.name && (
                            <p className="text-sm text-red-500">{registerForm.formState.errors.name.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium">Email address</label>
                          <input 
                            id="email"
                            name="email"
                            type="text" 
                            placeholder="name@example.com" 
                            autoComplete="email"
                            disabled={isPendingRegister}
                            className="w-full h-10 px-3 py-2 border border-input rounded-md"
                            onChange={(e) => registerForm.setValue('email', e.target.value)}
                            defaultValue={registerForm.getValues().email || ''}
                          />
                          {registerForm.formState.errors.email && (
                            <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="register-password" className="text-sm font-medium">Password</label>
                          <input 
                            id="register-password"
                            name="password"
                            type="password" 
                            placeholder="••••••••" 
                            autoComplete="new-password"
                            disabled={isPendingRegister}
                            className="w-full h-10 px-3 py-2 border border-input rounded-md"
                            onChange={(e) => registerForm.setValue('password', e.target.value)}
                            defaultValue={registerForm.getValues().password || ''}
                          />
                          <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                          {registerForm.formState.errors.password && (
                            <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label>
                          <input 
                            id="confirm-password"
                            name="confirmPassword"
                            type="password" 
                            placeholder="••••••••" 
                            autoComplete="new-password"
                            disabled={isPendingRegister}
                            className="w-full h-10 px-3 py-2 border border-input rounded-md"
                            onChange={(e) => registerForm.setValue('confirmPassword', e.target.value)}
                            defaultValue={registerForm.getValues().confirmPassword || ''}
                          />
                          {registerForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full mt-2 bg-gradient-to-r from-primary to-primary/80" 
                          disabled={isPendingRegister}
                        >
                          {isPendingRegister ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Create account
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
