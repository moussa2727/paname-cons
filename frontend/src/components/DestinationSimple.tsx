import React from 'react';

interface DestinationType {
  _id: string;
  country: string;
  imagePath: string;
  text: string;
}

interface DestinationProps {
  destination: DestinationType;
  className?: string;
}

export const Destination: React.FC<DestinationProps> = ({ destination, className = '' }) => {
  // Générer l'URL complète de l'image selon l'environnement
  const getImageUrl = (imagePath: string): string => {
    // Si c'est une image par défaut (commence par /images/)
    if (imagePath.startsWith('/images/')) {
      return `${process.env.VITE_API_URL || 'https://paname-consulting.vercel.app'}${imagePath}`;
    }
    
    // Si c'est une image uploadée (commence par uploads/)
    if (imagePath.startsWith('uploads/')) {
      const filename = imagePath.replace('uploads/', '');
      return `${process.env.VITE_API_URL || 'https://paname-consulting.vercel.app'}/api/destinations/uploads/${filename}`;
    }
    
    // Fallback
    return imagePath;
  };

  return (
    <div className={`relative h-52 overflow-hidden rounded-lg border border-slate-200 shadow-sm ${className}`}>
      <img
        src={getImageUrl(destination.imagePath)}
        alt={destination.country}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
          e.currentTarget.src = '/images/paname-consulting.jpg';
        }}
      />
    </div>
  );
};

export default Destination;
