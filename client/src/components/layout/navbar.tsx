import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, AlertCircle, Camera } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation, resendVerificationMutation } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const resendVerification = () => {
    resendVerificationMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Verification email sent",
          description: "Please check your inbox for the verification link",
        });
      }
    });
  };
  
  const navLinks = [
    { href: "/", label: "Gallery", showAlways: true },
    { href: "/uploads", label: "My Uploads", requiresAuth: true },
    { href: "/albums", label: "Albums", requiresAuth: true },
    { href: "/profile", label: "My Profile", requiresAuth: true },
    { href: "/moderation", label: "Moderation", requiresModerator: true },
    { href: "/admin", label: "Admin", requiresAdmin: true },
  ];
  
  const filteredLinks = navLinks.filter(link => {
    if (link.showAlways) return true;
    if (link.requiresAuth && user) return true;
    if (link.requiresModerator && user?.isModerator) return true;
    if (link.requiresAdmin && user?.isAdmin) return true;
    return false;
  });
  
  return (
    <nav className="bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-white font-bold text-xl cursor-pointer flex items-center">
                  <span className="bg-primary p-1 rounded mr-2">
                    <Camera size={20} className="text-white" />
                  </span>
                  <span className="bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                    ImageShare
                  </span>
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredLinks.map(link => (
                <div key={link.href} className="inline-block">
                  <Link href={link.href}>
                    <span
                      className={`${
                        location === link.href
                          ? "border-primary text-white"
                          : "border-transparent text-muted-foreground hover:border-muted hover:text-foreground"
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}
                    >
                      {link.label}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                {!user.isVerified && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resendVerification}
                    disabled={resendVerificationMutation.isPending}
                    className="flex items-center"
                  >
                    <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
                    Verify Email
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-0">
                      <Avatar className="h-8 w-8 bg-primary/10 border border-primary/20">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=e11d48&color=fff`} />
                        <AvatarFallback className="bg-primary text-primary-foreground">{(user.name || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="font-medium">
                      {user.name || 'User'}
                      {user.isAdmin ? (
                        <Badge className="ml-2 bg-purple-500/20 text-purple-500">Admin</Badge>
                      ) : user.isModerator && (
                        <Badge className="ml-2 bg-blue-500/20 text-blue-500">Moderator</Badge>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/profile">
                        <span className="w-full cursor-pointer">My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/uploads">
                        <span className="w-full cursor-pointer">My Uploads</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/albums">
                        <span className="w-full cursor-pointer">My Albums</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <DropdownMenuItem>
                        <Link href="/admin">
                          <span className="w-full cursor-pointer">Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div>
                <Link href="/auth">
                  <Button className="bg-gradient-to-r from-primary to-primary/80">Sign In</Button>
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background">
                <div className="flex flex-col h-full py-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-bold text-xl">ImageShare</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1 mt-6">
                    {filteredLinks.map(link => (
                      <div key={link.href} className="block" onClick={() => setIsMenuOpen(false)}>
                        <Link href={link.href}>
                          <span 
                            className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
                              location === link.href 
                                ? "bg-primary/10 text-primary" 
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            {link.label}
                          </span>
                        </Link>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-border">
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 bg-primary/10 border border-primary/20">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=e11d48&color=fff`} />
                            <AvatarFallback className="bg-primary text-primary-foreground">{(user.name || 'U').charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <p className="text-base font-medium text-foreground">{user.name || 'User'}</p>
                            <p className="text-sm text-muted-foreground">{user.email || ''}</p>
                          </div>
                        </div>
                        
                        {!user.isVerified && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={resendVerification}
                            disabled={resendVerificationMutation.isPending}
                            className="w-full flex items-center justify-center"
                          >
                            <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                            Verify Email
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => {
                            handleLogout();
                            setIsMenuOpen(false);
                          }}
                          className="w-full bg-gradient-to-r from-primary to-primary/80"
                        >
                          Sign out
                        </Button>
                      </div>
                    ) : (
                      <div onClick={() => setIsMenuOpen(false)}>
                        <Link href="/auth">
                          <Button className="w-full bg-gradient-to-r from-primary to-primary/80">Sign In</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
