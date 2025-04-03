import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Starting upload with formData:", formData);
      // Log the formData contents for debugging
      for (const pair of (formData as any).entries()) {
        console.log(`FormData contains: ${pair[0]}, ${pair[1]}`);
      }
      const res = await apiRequest("/api/images", "POST", formData);
      return await res.json();
    },
    onSuccess: () => {
      // Reset form
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      
      // Close modal
      onClose();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-images"] });
      
      // Show success message
      toast({
        title: "Image uploaded successfully",
        description: "Your image has been submitted for review",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please provide a title for your image",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFile) {
      toast({
        title: "Image required",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("data", JSON.stringify({ 
      title, 
      description: description.trim() || undefined 
    }));
    
    uploadMutation.mutate(formData);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };
  
  const isPending = uploadMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload New Image</DialogTitle>
          <DialogDescription>
            Upload an image to share with the community. Your image will be reviewed by a moderator before appearing in the gallery.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-title">Image Title</Label>
              <Input
                id="image-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a title for your image"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-description">Description (optional)</Label>
              <Textarea
                id="image-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your image"
                rows={3}
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Image</Label>
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
                  dragActive ? "border-primary border-dashed bg-primary/5" : "border-gray-300 border-dashed"
                } rounded-md`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <Upload className="mx-auto h-12 w-12 text-primary" />
                      <p className="mt-2 text-sm text-gray-600">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-sm text-primary hover:text-primary/80"
                        onClick={() => setSelectedFile(null)}
                        disabled={isPending}
                      >
                        Select a different file
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleFileChange}
                            disabled={isPending}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF, WEBP up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedFile}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
