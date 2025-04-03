import { Image } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ImageGridProps {
  images: (Image & { user: { name: string } })[];
  onImageClick: (image: Image & { user: { name: string } }) => void;
}

export default function ImageGrid({ images, onImageClick }: ImageGridProps) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
      {images.map((image) => (
        <div 
          key={image.id} 
          className="image-card group cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-lg"
          onClick={() => onImageClick(image)}
        >
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
            <img
              src={`/uploads/${image.filename}`}
              alt={image.title}
              className="h-full w-full object-cover object-center group-hover:opacity-75"
            />
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <h3 className="text-sm text-gray-700">{image.title}</h3>
              <p className="mt-1 text-sm text-gray-500">Uploaded by {image.user?.name || 'Unknown User'}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">
              {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
