import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AlbumsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch user's albums
  const { data: userAlbums, isLoading: isUserAlbumsLoading } = useQuery({
    queryKey: ["/api/albums"],
    queryFn: async () => {
      const res = await apiRequest("/api/albums", "GET");
      return res.json();
    },
  });

  // Fetch public albums
  const { data: publicAlbums, isLoading: isPublicAlbumsLoading } = useQuery({
    queryKey: ["/api/public-albums"],
    queryFn: async () => {
      const res = await apiRequest("/api/public-albums", "GET");
      return res.json();
    },
  });

  const handleCreateAlbum = () => {
    navigate("/albums/new");
  };

  const renderAlbumGrid = (albums: any[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!albums || albums.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-500">No albums found.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums.map((album: any) => (
          <Card 
            key={album.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/albums/${album.id}`)}
          >
            <div className="relative aspect-video overflow-hidden rounded-t-lg">
              {album.coverImage ? (
                <img 
                  src={`/uploads/${album.coverImage}`} 
                  alt={album.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-500">No cover image</p>
                </div>
              )}
            </div>
            <CardHeader className="pb-2">
              <CardTitle>{album.title}</CardTitle>
              <CardDescription>
                {album.description?.length > 100
                  ? `${album.description.substring(0, 100)}...`
                  : album.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-gray-500">
                Created {formatDistanceToNow(new Date(album.createdAt), { addSuffix: true })}
              </p>
            </CardContent>
            <CardFooter>
              <div className="flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(album.user?.name || 'User')}`} 
                    alt={album.user?.name || 'User'} 
                  />
                  <AvatarFallback>{(album.user?.name || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{album.user?.name || 'Unknown User'}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Albums</h1>
        <Button onClick={handleCreateAlbum}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Album
        </Button>
      </div>

      <Tabs defaultValue="my-albums" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-albums">My Albums</TabsTrigger>
          <TabsTrigger value="public-albums">Public Albums</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-albums" className="py-4">
          <div className="mb-4">
            <p className="text-gray-600">Manage your personal photo collections.</p>
          </div>
          {renderAlbumGrid(userAlbums || [], isUserAlbumsLoading)}
        </TabsContent>
        
        <TabsContent value="public-albums" className="py-4">
          <div className="mb-4">
            <p className="text-gray-600">Explore albums shared by the community.</p>
          </div>
          {renderAlbumGrid(publicAlbums || [], isPublicAlbumsLoading)}
        </TabsContent>
      </Tabs>
    </div>
  );
}