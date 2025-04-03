import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image, UpdateImageStatus } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PendingImage extends Image {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface ModerationStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function ModerationPage() {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<PendingImage | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
  const { data: pendingImages, isLoading: isLoadingImages } = useQuery<PendingImage[]>({
    queryKey: ["/api/moderation"],
  });
  
  const { data: stats, isLoading: isLoadingStats } = useQuery<ModerationStats>({
    queryKey: ["/api/moderation/stats"],
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ imageId, data }: { imageId: number; data: UpdateImageStatus }) => {
      const res = await apiRequest("PATCH", `/api/images/${imageId}/status`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/stats"] });
      toast({
        title: "Status updated",
        description: "The image status has been updated successfully",
      });
      setIsRejectDialogOpen(false);
      setSelectedImage(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleApprove = (image: PendingImage) => {
    updateStatusMutation.mutate({
      imageId: image.id,
      data: { status: "approved" }
    });
  };
  
  const handleReject = () => {
    if (!selectedImage) return;
    
    updateStatusMutation.mutate({
      imageId: selectedImage.id,
      data: {
        status: "rejected",
        rejectionReason: rejectionReason
      }
    });
  };
  
  const handleRejectClick = (image: PendingImage) => {
    setSelectedImage(image);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  if (isLoadingImages || isLoadingStats) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="mx-auto py-6 px-4 max-w-7xl sm:px-6 lg:px-8">
          <div className="pb-5 border-b border-gray-200">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Moderation Queue</h2>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Review and approve or reject submitted images before they appear in the public gallery.
            </p>
          </div>
          
          {/* Moderation Stats */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.pending || 0}</dd>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved Today</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">{stats?.approvedToday || 0}</dd>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Rejected Today</dt>
                  <dd className="mt-1 text-3xl font-semibold text-red-600">{stats?.rejectedToday || 0}</dd>
                </dl>
              </CardContent>
            </Card>
          </div>
          
          {/* Pending Images Table */}
          <div className="mt-8">
            {!pendingImages?.length ? (
              <div className="bg-white py-8 px-4 shadow sm:rounded-lg text-center">
                <h3 className="text-lg font-medium text-gray-900">No images pending review</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All images have been moderated. Check back later for new submissions.
                </p>
              </div>
            ) : (
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingImages.map((image) => (
                      <TableRow key={image.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-16">
                              <img 
                                className="h-16 w-16 rounded object-cover" 
                                src={`/uploads/${image.filename}`} 
                                alt={image.title} 
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{image.title}</div>
                              <div className="text-sm text-gray-500">
                                {image.description?.length > 50
                                  ? `${image.description.substring(0, 50)}...`
                                  : image.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(image.user.name)}`} />
                              <AvatarFallback>{image.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{image.user.name}</div>
                              <div className="text-sm text-gray-500">{image.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex space-x-3 justify-end">
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(image)} 
                              disabled={updateStatusMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleRejectClick(image)} 
                              disabled={updateStatusMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Image</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this image. This will be shared with the user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
