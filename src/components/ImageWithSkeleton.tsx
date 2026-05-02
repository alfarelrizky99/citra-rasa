import { useState, ImgHTMLAttributes } from 'react';
import { ImageIcon } from 'lucide-react';

interface ImageWithSkeletonProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackIcon?: React.ReactNode;
}

export default function ImageWithSkeleton({ src, alt, className, fallbackIcon, ...props }: ImageWithSkeletonProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-padang-100 ${className}`}>
        {fallbackIcon || <ImageIcon className="w-8 h-8 text-padang-300" />}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-padang-100 ${!isLoaded ? 'animate-pulse' : ''} ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </div>
  );
}
