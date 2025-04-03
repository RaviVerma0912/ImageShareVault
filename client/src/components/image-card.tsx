import { useState } from "react";
import { Image } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ImageCardProps {
  image: Image;
  onViewDetails: (image: Image) => void;
  showStatus?: boolean;
}

export default function ImageCard({ image, onViewDetails, showStatus = false }: ImageCardProps) {
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
    <div className="image-card group transform transition-transform hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
        <img
          src={`/uploads/${image.filename}`}
          alt={image.title}
          className="h-full w-full object-cover object-center group-hover:opacity-75 cursor-pointer"
          onClick={() => onViewDetails(image)}
        />
        {showStatus && (
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(image.status)}`}>
              {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between">
        <div>
          <h3 className="text-sm text-gray-700">{image.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-400 hover:text-gray-500">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(image)}>
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
  );
}
