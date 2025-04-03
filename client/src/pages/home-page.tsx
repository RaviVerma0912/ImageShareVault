import { useQuery } from "@tanstack/react-query";
import { Image } from "@shared/schema";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ImageGrid from "@/components/image-grid";
import { useState } from "react";
import ImagePreviewModal from "@/components/image-preview-modal";
import UploadModal from "@/components/upload-modal";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<null | (Image & { user: { name: string } })>(null);
  
  const { data: images, isLoading, error } = useQuery<(Image & { user: { name: string } })[]>({
    queryKey: ["/api/images"],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="mx-auto py-6 px-4 max-w-7xl sm:px-6 lg:px-8">
          <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Gallery</h2>
            {user && (
              <div className="mt-3 sm:mt-0 sm:ml-4">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Upload New Image
                </button>
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center mt-8 text-red-500">
              Failed to load images: {error.message}
            </div>
          ) : !images?.length ? (
            <div className="text-center mt-8 text-gray-500">
              No images have been approved yet. Be the first to upload!
            </div>
          ) : (
            <ImageGrid 
              images={images} 
              onImageClick={(image) => setSelectedImage(image)}
            />
          )}
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
        />
      )}
    </div>
  );
}
