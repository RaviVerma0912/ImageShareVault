import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Link as LinkIcon, PaintBucket, Globe, Instagram, Twitter, Facebook } from "lucide-react";
import ImageGrid from "@/components/image-grid";
import { Image } from "@shared/schema";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    website: "",
    socialLinks: "",
    themePreference: "light"
  });

  // Fetch user profile data
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("/api/profile", "GET");
      return res.json();
    },
    onSuccess: (data) => {
      setFormData({
        bio: data.bio || "",
        website: data.website || "",
        socialLinks: data.socialLinks || "",
        themePreference: data.themePreference || "light"
      });
    }
  });

  // Fetch user images
  const { data: userImages, isLoading: isImagesLoading } = useQuery({
    queryKey: ["/api/my-images"],
    queryFn: async () => {
      const res = await apiRequest("/api/my-images", "GET");
      return res.json();
    }
  });

  // Fetch user albums
  const { data: userAlbums, isLoading: isAlbumsLoading } = useQuery({
    queryKey: ["/api/albums"],
    queryFn: async () => {
      const res = await apiRequest("/api/albums", "GET");
      return res.json();
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/profile", "PATCH", data);
      return res.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("profilePicture", file);
      
      try {
        await apiRequest("/api/profile/picture", "POST", formData);
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been successfully updated",
        });
      } catch (error: any) {
        toast({
          title: "Update failed",
          description: error.message || "Failed to update profile picture",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleViewImage = (image: Image & { user: { name: string } }) => {
    // Navigate to image detail
  };

  const handleCreateAlbum = () => {
    navigate("/albums/new");
  };

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
            <div className="relative">
              <Avatar className="h-24 w-24">
                {profile?.profilePicture ? (
                  <AvatarImage src={`/uploads/${profile.profilePicture}`} alt={user?.name} />
                ) : (
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "")}`} alt={user?.name} />
                )}
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <label htmlFor="profile-picture" className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white rounded-full p-1 cursor-pointer">
                  <User className="h-4 w-4" />
                  <input
                    id="profile-picture"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                </label>
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              {profile?.bio && !isEditing && (
                <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
              )}
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        
        {!isEditing ? (
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
              {profile?.themePreference && (
                <div className="flex items-center gap-2">
                  <PaintBucket className="h-4 w-4 text-gray-500" />
                  <span>Theme: {profile.themePreference}</span>
                </div>
              )}
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself"
                    className="resize-none"
                  />
                </div>
                
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="socialLinks">Social Media</Label>
                  <Input
                    id="socialLinks"
                    name="socialLinks"
                    value={formData.socialLinks}
                    onChange={handleInputChange}
                    placeholder="Instagram, Twitter, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="themePreference">Theme Preference</Label>
                  <select
                    id="themePreference"
                    name="themePreference"
                    value={formData.themePreference}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
      
      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="images">My Images</TabsTrigger>
          <TabsTrigger value="albums">My Albums</TabsTrigger>
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
              <p className="text-lg text-gray-500">You haven't uploaded any images yet.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="albums" className="py-4">
          {isAlbumsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">My Albums</h2>
                <Button onClick={handleCreateAlbum}>Create Album</Button>
              </div>
              
              {userAlbums?.length > 0 ? (
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
                      <CardFooter>
                        <p className="text-sm text-gray-500">{album._count?.images || 0} images</p>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-500">You haven't created any albums yet.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}