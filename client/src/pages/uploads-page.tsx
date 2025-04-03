import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import UploadModal from "@/components/upload-modal";
import ImagePreviewModal from "@/components/image-preview-modal";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UploadsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: images, isLoading, error } = useQuery<Image[]>({
    queryKey: ["/api/my-images"],
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const filteredImages = images?.filter(image => {
    if (activeTab === "all") return true;
    return image.status === activeTab;
  });
  
  const getStatusCount = (status: string) => {
    return images?.filter(image => image.status === status).length || 0;
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="mx-auto py-6 px-4 max-w-7xl sm:px-6 lg:px-8">
          <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">My Uploads</h2>
            <div className="mt-3 sm:mt-0 sm:ml-4">
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Upload New Image
              </Button>
            </div>
          </div>
          
          <div className="mt-6">
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">
                  All
                  <Badge variant="secondary" className="ml-2">{images?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  <Badge variant="secondary" className="ml-2">{getStatusCount("pending")}</Badge>
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                  <Badge variant="secondary" className="ml-2">{getStatusCount("approved")}</Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected
                  <Badge variant="secondary" className="ml-2">{getStatusCount("rejected")}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="pt-6">
                {error ? (
                  <div className="text-center text-red-500">
                    Failed to load your images: {error.message}
                  </div>
                ) : !filteredImages?.length ? (
                  <div className="text-center text-gray-500 p-8">
                    No images found in this category. Upload some images to get started!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredImages.map((image) => (
                      <div key={image.id} className="group relative">
                        <div className="relative aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                          <img
                            src={`/uploads/${image.filename}`}
                            alt={image.title}
                            className="h-full w-full object-cover object-center group-hover:opacity-75 cursor-pointer"
                            onClick={() => setSelectedImage(image)}
                          />
                          <div className="absolute top-2 right-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(image.status)}`}>
                              {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between">
                          <div>
                            <h3 className="text-sm text-gray-700">{image.title}</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {new Date(image.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-gray-400 hover:text-gray-500">
                                <MoreVertical className="h-5 w-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedImage(image)}>
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {image.status === "rejected" && image.rejectionReason && (
                          <p className="mt-2 text-sm text-red-500">
                            Reason: {image.rejectionReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
      
      {selectedImage && (
        <ImagePreviewModal 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
          showRejectionReason={true}
        />
      )}
    </div>
  );
}
