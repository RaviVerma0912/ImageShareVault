import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Image } from "@shared/schema";

// Form schema
const albumFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  coverImageId: z.number().optional(),
});

type AlbumFormData = z.infer<typeof albumFormSchema>;

export default function CreateAlbumPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCoverImage, setSelectedCoverImage] = useState<number | null>(null);

  // Initialize form
  const form = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      title: "",
      description: "",
      isPublic: false,
    },
  });

  // Fetch user images to choose as cover
  const { data: userImages, isLoading: isImagesLoading } = useQuery({
    queryKey: ["/api/my-images"],
    queryFn: async () => {
      const res = await apiRequest("/api/my-images", "GET");
      return res.json();
    },
  });

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: async (data: AlbumFormData) => {
      const res = await apiRequest("/api/albums", "POST", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Album created",
        description: "Your album has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      navigate(`/albums/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create album",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AlbumFormData) => {
    // Add cover image id to form data if selected
    if (selectedCoverImage) {
      data.coverImageId = selectedCoverImage;
    }
    createAlbumMutation.mutate(data);
  };

  const handleSelectCoverImage = (imageId: number) => {
    setSelectedCoverImage(imageId);
    form.setValue("coverImageId", imageId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/profile")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Album</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="My Photo Collection" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add a description for your album"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Make Album Public</FormLabel>
                      <FormDescription>
                        Public albums can be viewed by anyone. Private albums are only visible to you.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={createAlbumMutation.isPending}
                >
                  {createAlbumMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Album
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose Cover Image</h2>
        <p className="text-gray-600 mb-4">Select an image to use as the album cover (optional).</p>
        
        {isImagesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userImages?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {userImages.map((image: any) => (
              <div
                key={image.id}
                className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${
                  selectedCoverImage === image.id ? "border-primary" : "border-transparent"
                }`}
                onClick={() => handleSelectCoverImage(image.id)}
              >
                <img
                  src={`/uploads/${image.filename}`}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
                {selectedCoverImage === image.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-white text-xs font-medium px-2 py-1 rounded">
                      Cover
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-lg text-gray-500">You haven't uploaded any images yet.</p>
            <p className="text-sm text-gray-500 mt-2">Upload images first to select a cover for your album.</p>
            <Button onClick={() => navigate("/uploads")} className="mt-4">
              Upload Images
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}