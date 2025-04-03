import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Globe, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageGrid from "@/components/image-grid";
import { Button } from "@/components/ui/button";
import { Image } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function UserProfilePage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = parseInt(id || '0');

  // Fetch user profile data
  const { data: profile, isLoading: isProfileLoading, error } = useQuery({
    queryKey: [`/api/profile/${userId}`],
    queryFn: async () => {
      const res = await apiRequest(`/api/profile/${userId}`, "GET");
      return res.json();
    },
    enabled: !isNaN(userId)
  });

  // Fetch user's public images
  const { data: userImages, isLoading: isImagesLoading } = useQuery({
    queryKey: [`/api/users/${userId}/images`],
    queryFn: async () => {
      const res = await apiRequest(`/api/users/${userId}/images`, "GET");
      return res.json();
    },
    enabled: !isNaN(userId)
  });

  // Fetch user's public albums
  const { data: userAlbums, isLoading: isAlbumsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/albums`],
    queryFn: async () => {
      const res = await apiRequest(`/api/users/${userId}/albums`, "GET");
      return res.json();
    },
    enabled: !isNaN(userId)
  });

  const handleViewImage = (image: Image & { user: { name: string } }) => {
    // Navigate to image detail or open a modal
  };

  // Show error if user not found
  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-gray-600 mb-4">The user you are looking for does not exist or their profile is private.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  // Show loading while fetching profile
  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Avatar className="h-24 w-24">
              {profile?.profilePicture ? (
                <AvatarImage src={`/uploads/${profile.profilePicture}`} alt={profile?.name} />
              ) : (
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "")}`} alt={profile?.name} />
              )}
              <AvatarFallback>{profile?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile?.name}</CardTitle>
              {profile?.bio && (
                <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile?.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {profile.website}
                </a>
              </div>
            )}
            {profile?.socialLinks && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-gray-500" />
                <span>{profile.socialLinks}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
        </TabsList>
        
        <TabsContent value="images" className="py-4">
          {isImagesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userImages?.length > 0 ? (
            <ImageGrid images={userImages} onImageClick={handleViewImage} />
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">This user hasn't shared any images.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="albums" className="py-4">
          {isAlbumsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userAlbums?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userAlbums.map((album: any) => (
                <Card key={album.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/albums/${album.id}`)}>
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
                  <CardHeader>
                    <CardTitle>{album.title}</CardTitle>
                    <CardDescription>
                      {album.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">This user hasn't shared any albums.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}