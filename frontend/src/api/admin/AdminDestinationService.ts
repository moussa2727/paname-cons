const API_URL = import.meta.env.VITE_API_URL;

export interface Destination {
  _id: string;
  country: string;
  text: string;
  imagePath: string;
}

export const destinationService = {
  // Générer l'URL complète d'une image
  getFullImageUrl: (imagePath: string): string => {
    // Si c'est une image par défaut (commence par /images/)
    if (imagePath.startsWith('/images/')) {
      return `${API_URL || 'https://paname-consulting.vercel.app'}${imagePath}`;
    }
    
    // Si c'est une image uploadée (commence par uploads/)
    if (imagePath.startsWith('uploads/')) {
      const filename = imagePath.replace('uploads/', '');
      return `${API_URL || 'https://paname-consulting.vercel.app'}/api/destinations/uploads/${filename}`;
    }
    
    // Fallback
    return imagePath;
  },

  // Obtenir toutes les destinations
  getAllDestinations: async (): Promise<Destination[]> => {
    const response = await fetch(`${API_URL}/api/destinations/all`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des destinations');
    }
    const data = await response.json();
    return data.map((dest: Destination) => ({
      ...dest,
      imagePath: destinationService.getFullImageUrl(dest.imagePath),
    }));
  },
};

export default destinationService;
