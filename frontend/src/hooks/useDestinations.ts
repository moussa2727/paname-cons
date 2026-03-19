import { useState, useEffect, useCallback } from "react";
import { destinationsService } from "../services/destinations.service";
import type {
  Destination,
  CreateDestinationData,
  UpdateDestinationData,
} from "../types/destination.types";
import { toast } from "react-toastify";

export const useDestinations = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger toutes les destinations
  const loadDestinations = useCallback(async () => {
    console.log("[useDestinations] loadDestinations called");
    setLoading(true);
    setError(null);
    try {
      console.log(
        "[useDestinations] Calling destinationsService.getAllDestinations()",
      );
      const data = await destinationsService.getAllDestinations();
      console.log("[useDestinations] Destinations loaded from API:", data); // Debug
      console.log(
        "[useDestinations] Type of data:",
        typeof data,
        "Is array:",
        Array.isArray(data),
      ); // Debug
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[useDestinations] Error loading destinations:", err);
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
      setDestinations([]); // S'assurer que c'est un tableau
    } finally {
      setLoading(false);
    }
  }, []);

  // Rechercher des destinations
  const searchDestinations = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        await loadDestinations();
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await destinationsService.searchDestinations(query);
        setDestinations(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadDestinations],
  );

  // Créer une destination
  const createDestination = useCallback(
    async (data: CreateDestinationData) => {
      setLoading(true);
      setError(null);
      try {
        const newDestination =
          await destinationsService.createDestination(data);
        // Rafraîchir la liste pour s'assurer d'avoir les données à jour
        await loadDestinations();
        return newDestination;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadDestinations],
  );

  // Mettre à jour une destination
  const updateDestination = useCallback(
    async (id: string, data: UpdateDestinationData) => {
      setLoading(true);
      setError(null);
      try {
        const updatedDestination = await destinationsService.updateDestination(
          id,
          data,
        );
        // Rafraîchir la liste pour s'assurer d'avoir les données à jour
        await loadDestinations();
        return updatedDestination;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadDestinations],
  );

  // Dans useDestinations.ts
  const getDestinationsStatistics = useCallback(async () => {
    return await destinationsService.getDestinationsStatistics();
  }, []);

  // Supprimer une destination
  const deleteDestination = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await destinationsService.deleteDestination(id);
      setDestinations((prev) => prev.filter((dest) => dest.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Nettoyer les images orphelines
  const cleanupImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await destinationsService.cleanupOrphanedImages();
      toast.success(
        `${result.deletedFiles.length} images orphelines supprimées`,
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  return {
    destinations,
    loading,
    error,
    loadDestinations,
    searchDestinations,
    createDestination,
    updateDestination,
    deleteDestination,
    cleanupImages,
    getDestinationsStatistics,
  };
};
