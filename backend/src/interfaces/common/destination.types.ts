// =================================
// TYPES DESTINATIONS (Gestion des destinations)
// =================================

export interface DestinationData {
  id: string;
  name: string;
  description: string;
  country: string;
  city: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
