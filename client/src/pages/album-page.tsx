import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Edit, Trash2, Share, ExternalLink, Lock, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import ImageGrid from "@/components/image-grid";
import { Image } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

export default function AlbumPage() {
  const { id } = useParams();
  const albumId = parseInt(id || '0');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch album data
  const { data: album, isLoading, error } = useQuery({
    queryKey: [`/api/albums/${albumId}`],
    queryFn: async () => {
      const res = await apiRequest(`/api/albums/${albumId}`, "GET");
      return res.json();
    },
    enabled: !isNaN(albumId)
  });

  // Delete album mutation
  const deleteAlbumMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/albums/${albumId}`, "DELETE");
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Album deleted",
        description: "Your album has been successfully deleted",
      });
      navigate("/albums");
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete album",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle album visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/albums/${albumId}/visibility`, "PATCH", {
        isPublic: !album.isPublic
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: album.isPublic ? "Album is now private" : "Album is now public",
        description: album.isPublic 
          ? "Your album is no longer visible to other users" 
          : "Your album is now visible to all users",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/albums/${albumId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update visibility",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDeleteAlbum = () => {
    deleteAlbumMutation.mutate();
  };

  const handleToggleVisibility = () => {
    toggleVisibilityMutation.mutate();
  };

  const handleViewImage = (image: Image & { user: { name: string } }) => {
    // Show image details
  };

  const handleShare = () => {
    // Copy album URL to clipboard
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied to clipboard",
        description: "Share this link with others to view this album",
      });
    });
  };

  // Show error if album not found
  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Album Not Found</h1>
        <p className="text-gray-600 mb-4">The album you are looking for does not exist or is private.</p>
        <Button onClick={() => navigate("/albums")}>Back to Albums</Button>
      </div>
    );
  }

  // Show loading while fetching album
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = user?.id === album?.userId;

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/albums")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Albums
      </Button>
      
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{album.title}</CardTitle>
                {album.isPublic ? (
                  <Globe className="h-4 w-4 text-gray-500" aria-label="Public album" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-500" aria-label="Private album" />
                )}
              </div>
              <CardDescription>
                Created {formatDistanceToNow(new Date(album.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
            
            {isOwner && (
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={handleToggleVisibility}>
                  {album.isPublic ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Make Public
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/albums/${albumId}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the album
                        and remove all images from it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAlbum}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        
        {album.description && (
          <CardContent>
            <p className="text-gray-600">{album.description}</p>
          </CardContent>
        )}
        
        <CardFooter>
          <div className="flex items-center">
            <Link href={`/profile/${album.user?.id || '#'}`}>
              <a className="flex items-center hover:underline">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(album.user?.name || 'User')}`} />
                  <AvatarFallback>{(album.user?.name || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{album.user?.name || 'Unknown User'}</span>
              </a>
            </Link>
          </div>
        </CardFooter>
      </Card>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Images in this Album</h2>
        {album.images && album.images.length > 0 ? (
          <ImageGrid images={album.images} onImageClick={handleViewImage} />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-lg text-gray-500">This album is empty.</p>
            {isOwner && (
              <Button onClick={() => navigate("/uploads")} className="mt-4">
                Upload Images
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}