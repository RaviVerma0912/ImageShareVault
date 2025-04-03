import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, ShieldAlert, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type User = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isModerator: boolean;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [banReason, setBanReason] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });
  
  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; isModerator?: boolean; isAdmin?: boolean }) => {
      const { userId, ...roleData } = data;
      return apiRequest(`/api/admin/users/${userId}/role`, "PATCH", roleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User role updated",
        description: "The user's role has been updated successfully",
      });
      setShowRoleDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async (data: { userId: number; isBanned: boolean; banReason?: string }) => {
      const { userId, ...banData } = data;
      return apiRequest(`/api/admin/users/${userId}/ban`, "PATCH", banData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User ban status updated",
        description: "The user's ban status has been updated successfully",
      });
      setShowBanDialog(false);
      setBanReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update ban status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle role update
  const handleRoleUpdate = () => {
    if (!selectedUserId || !selectedRole) return;
    
    const roleData: { isModerator?: boolean; isAdmin?: boolean } = {};
    
    if (selectedRole === "user") {
      roleData.isModerator = false;
      roleData.isAdmin = false;
    } else if (selectedRole === "moderator") {
      roleData.isModerator = true;
      roleData.isAdmin = false;
    } else if (selectedRole === "admin") {
      roleData.isModerator = true;
      roleData.isAdmin = true;
    }
    
    updateRoleMutation.mutate({
      userId: selectedUserId,
      ...roleData,
    });
  };
  
  // Handle ban/unban
  const handleBanUpdate = (isBanned: boolean) => {
    if (!selectedUserId) return;
    
    banUserMutation.mutate({
      userId: selectedUserId,
      isBanned,
      banReason: isBanned ? banReason : undefined,
    });
  };
  
  // Open role dialog
  const openRoleDialog = (user: User) => {
    setSelectedUserId(user.id);
    if (user.isAdmin) {
      setSelectedRole("admin");
    } else if (user.isModerator) {
      setSelectedRole("moderator");
    } else {
      setSelectedRole("user");
    }
    setShowRoleDialog(true);
  };
  
  // Open ban dialog
  const openBanDialog = (user: User) => {
    setSelectedUserId(user.id);
    setBanReason(user.banReason || "");
    setShowBanDialog(true);
  };
  
  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, roles, and access permissions</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage user accounts, roles, and access permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {user.isVerified ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                Unverified
                              </Badge>
                            )}
                            {user.isBanned && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                Banned
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {user.isAdmin ? (
                              <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                Admin
                              </Badge>
                            ) : user.isModerator ? (
                              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                Moderator
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                User
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRoleDialog(user)}
                              className="flex items-center"
                            >
                              <Shield className="mr-1 h-4 w-4" />
                              Role
                            </Button>
                            <Button
                              variant={user.isBanned ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => openBanDialog(user)}
                              className="flex items-center"
                            >
                              <UserX className="mr-1 h-4 w-4" />
                              {user.isBanned ? "Unban" : "Ban"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the user's role and permissions in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole || ""} onValueChange={setSelectedRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleRoleUpdate} 
              disabled={updateRoleMutation.isPending}
              className="flex items-center"
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {users?.find(u => u.id === selectedUserId)?.isBanned 
                ? "Unban User" 
                : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {users?.find(u => u.id === selectedUserId)?.isBanned
                ? "Remove ban restrictions from this user account."
                : "Restrict this user from accessing the platform."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!users?.find(u => u.id === selectedUserId)?.isBanned && (
              <div className="space-y-2">
                <Label htmlFor="banReason">Reason for ban (optional)</Label>
                <Textarea
                  id="banReason"
                  placeholder="Explain why this user is being banned..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>Cancel</Button>
            <Button 
              variant={users?.find(u => u.id === selectedUserId)?.isBanned ? "default" : "destructive"}
              onClick={() => handleBanUpdate(!users?.find(u => u.id === selectedUserId)?.isBanned)}
              disabled={banUserMutation.isPending}
              className="flex items-center"
            >
              {banUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {users?.find(u => u.id === selectedUserId)?.isBanned ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}