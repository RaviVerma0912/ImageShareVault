import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ImagePreviewModalProps {
  image: Image & { user?: { id: number; name: string } };
  onClose: () => void;
  showRejectionReason?: boolean;
}

export default function ImagePreviewModal({ 
  image, 
  onClose,
  showRejectionReason = false
}: ImagePreviewModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/uploads/${image.filename}`;
    link.download = image.title || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{image.title}</DialogTitle>
          {image.user && (
            <div className="mt-1 flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(image.user.name)}`} />
                <AvatarFallback>{image.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="ml-2 text-sm text-gray-500">
                Uploaded by {image.user.name} • {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })}
              </p>
            </div>
          )}
        </DialogHeader>
        
        <div className="aspect-w-16 aspect-h-9 overflow-hidden rounded-lg">
          <img 
            src={`/uploads/${image.filename}`} 
            alt={image.title} 
            className="w-full h-full object-contain"
          />
        </div>
        
        {image.description && (
          <div className="mt-2">
            <p className="text-sm text-gray-500">{image.description}</p>
          </div>
        )}
        
        {showRejectionReason && image.status === "rejected" && image.rejectionReason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Rejection Reason</AlertTitle>
            <AlertDescription>
              {image.rejectionReason}
            </AlertDescription>
          </Alert>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
