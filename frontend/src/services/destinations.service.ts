import { apiFetch } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import type {
  Destination,
  CreateDestinationData,
  UpdateDestinationData,
  ImageCleanupResponse,
  DestinationFilters,
} from "../types/destination.types";

class DestinationsService {
  private readonly baseUrl = import.meta.env.VITE_API_URL;

  // ── ROUTES PUBLIQUES ────────────────────────────────────────────────────────

  /**
   * GET /destinations/all
   * Backend retourne: {statusCode, message, data: Destination[]} avec imageUrl ajouté
   */
  async getAllDestinations(): Promise<Destination[]> {
    try {
      const url = `${this.baseUrl}/destinations/all`;
      const response = await apiFetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          "Erreur lors de la récupération des destinations";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Le backend retourne un objet enveloppé avec data contenant le tableau
      const result = await response.json();
      const data = result.data || result; // Fallback si format change
      return Array.isArray(data) ? data : [];
    } catch (error) {
      toast.error("Erreur lors du chargement des destinations");
      throw error;
    }
  }

  /**
   * GET /destinations/search?q=query
   * Backend retourne: {statusCode, message, data: Destination[]} avec imageUrl ajouté
   */
  async searchDestinations(query: string): Promise<Destination[]> {
    if (!query.trim()) return [];

    try {
      const response = await apiFetch(
        `${this.baseUrl}/destinations/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || "Erreur lors de la recherche des destinations";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Le backend retourne un objet enveloppé avec data contenant le tableau
      const result = await response.json();
      const data = result.data || result; // Fallback si format change
      return Array.isArray(data) ? data : [];
    } catch (error) {
      toast.error("Erreur lors de la recherche");
      throw error;
    }
  }

  // ── ROUTES ADMIN ────────────────────────────────────────────────────────────

  /**
   * POST /admin/destinations
   * Backend attend: FormData avec country, text, image (fichier)
   * Backend retourne: Destination avec imageUrl
   */
  async createDestination(data: CreateDestinationData): Promise<Destination> {
    const formData = new FormData();

    // Ajouter les champs requis selon le DTO
    formData.append("country", data.country);
    formData.append("text", data.text);

    // Ajouter imagePath si fourni (optionnel)
    if (data.imagePath) {
      formData.append("imagePath", data.imagePath);
    }

    // Ajouter l'image seulement si c'est un fichier valide
    if (data.image && data.image instanceof File) {
      formData.append("image", data.image);
    }

    try {
      // Utiliser fetch natif pour FormData avec auth via apiFetch
      const response = await fetch(`${this.baseUrl}/admin/destinations`, {
        method: "POST",
        credentials: "include",
        headers: {
          // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = "Erreur lors de la création de la destination";

        if (errorData.message) {
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(", ");
          } else {
            errorMessage = errorData.message;
          }
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Destination créée avec succès !");
      return result; // Le backend retourne directement la destination
    } catch (error) {
      toast.error("Erreur lors de la création de la destination");
      throw error;
    }
  }

  /**
   * GET /admin/destinations/:id
   * Backend retourne: Destination avec imageUrl
   */
  async getDestinationById(id: string): Promise<Destination> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/admin/destinations/${id}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Destination non trouvée";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result; // Le backend retourne directement la destination
    } catch (error) {
      toast.error("Erreur lors du chargement de la destination");
      throw error;
    }
  }

  /**
   * PUT /admin/destinations/:id
   * Backend attend: FormData avec champs optionnels + image
   * Backend retourne: Destination avec imageUrl
   */
  async updateDestination(
    id: string,
    data: UpdateDestinationData,
  ): Promise<Destination> {
    const formData = new FormData();

    // Ajouter les champs seulement s'ils sont présents (PartialType)
    if (data.country !== undefined) {
      formData.append("country", data.country);
    }
    if (data.text !== undefined) {
      formData.append("text", data.text);
    }
    if (data.imagePath !== undefined) {
      formData.append("imagePath", data.imagePath);
    }

    // Ajouter l'image si présente
    if (data.image) {
      formData.append("image", data.image);
    }

    try {
      // Utiliser fetch natif pour FormData
      const response = await fetch(`${this.baseUrl}/admin/destinations/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          // Ne pas définir Content-Type pour FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          "Erreur lors de la mise à jour de la destination";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Destination mise à jour avec succès");
      return result; // Le backend retourne directement la destination
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de la destination");
      throw error;
    }
  }

  /**
   * DELETE /admin/destinations/:id
   * Backend retourne: { message: string }
   */
  async deleteDestination(id: string): Promise<{ message: string }> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/admin/destinations/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          "Erreur lors de la suppression de la destination";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Destination supprimée avec succès");
      return result; // Le backend retourne { message: string }
    } catch (error) {
      toast.error("Erreur lors de la suppression de la destination");
      throw error;
    }
  }

  /**
   * POST /admin/destinations/cleanup-images
   * Backend retourne: { message: string, deletedFiles: string[] }
   */
  async cleanupOrphanedImages(): Promise<ImageCleanupResponse> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/admin/destinations/cleanup-images`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || "Erreur lors du nettoyage des images";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Nettoyage des images terminé");
      return result; // Le backend retourne { message, deletedFiles }
    } catch (error) {
      toast.error("Erreur lors du nettoyage des images");
      throw error;
    }
  }

  // ── MÉTHODES UTILITAIRES ─────────────────────────────────────────────────────

  // Récupérer les destinations avec filtres avancés
  async getDestinationsWithFilters(
    filters: DestinationFilters,
  ): Promise<Destination[]> {
    const allDestinations = await this.getAllDestinations();

    return allDestinations.filter((dest) => {
      // Filtre par pays
      if (
        filters.country &&
        !dest.country.toLowerCase().includes(filters.country.toLowerCase())
      ) {
        return false;
      }

      // Filtre par terme de recherche
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesCountry = dest.country.toLowerCase().includes(searchLower);
        const matchesText = dest.text.toLowerCase().includes(searchLower);
        if (!matchesCountry && !matchesText) {
          return false;
        }
      }

      // Filtre par présence d'image
      if (filters.hasImage !== undefined) {
        const hasImage = !!(dest.imagePath || dest.imageUrl);
        if (filters.hasImage !== hasImage) {
          return false;
        }
      }

      // Filtre par plage de dates
      if (filters.dateRange) {
        const createdDate = new Date(dest.createdAt);
        if (
          createdDate < filters.dateRange.start ||
          createdDate > filters.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }

  // Exporter les destinations en CSV
  async exportDestinationsToCSV(filters?: DestinationFilters): Promise<string> {
    const destinations = filters
      ? await this.getDestinationsWithFilters(filters)
      : await this.getAllDestinations();

    const headers = [
      "ID",
      "Pays",
      "Texte",
      "Chemin image",
      "URL image",
      "Date de création",
      "Date de mise à jour",
    ];

    const rows = destinations.map((dest) => [
      dest.id,
      dest.country,
      `"${dest.text.replace(/"/g, '""')}"`, // Échapper les guillemets dans le texte
      dest.imagePath || "",
      dest.imageUrl || "",
      new Date(dest.createdAt).toLocaleDateString(),
      new Date(dest.updatedAt).toLocaleDateString(),
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  // Obtenir des statistiques sur les destinations
  async getDestinationsStatistics(): Promise<{
    total: number;
    topCountries: { country: string; count: number }[];
    withImages: number;
    withoutImages: number;
    recentlyAdded: Destination[];
  }> {
    const destinations = await this.getAllDestinations();

    // Compter par pays
    const countryCounts: Record<string, number> = {};
    destinations.forEach((dest) => {
      countryCounts[dest.country] = (countryCounts[dest.country] || 0) + 1;
    });

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 pays

    // Compter avec/sans images
    const withImages = destinations.filter(
      (dest) => !!(dest.imagePath || dest.imageUrl),
    ).length;
    const withoutImages = destinations.length - withImages;

    // Récemment ajoutées (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyAdded = destinations
      .filter((dest) => new Date(dest.createdAt) >= sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    return {
      total: destinations.length,
      topCountries,
      withImages,
      withoutImages,
      recentlyAdded,
    };
  }

  // Valider les données de destination
  validateDestinationData(
    data: CreateDestinationData | UpdateDestinationData,
  ): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Validation du pays
    if ("country" in data) {
      if (!data.country || data.country.trim().length < 2) {
        errors.country = "Le pays doit contenir au moins 2 caractères";
      } else if (data.country.length > 100) {
        errors.country = "Le pays ne peut pas dépasser 100 caractères";
      }
    }

    // Validation du texte
    if ("text" in data) {
      if (!data.text || data.text.trim().length < 10) {
        errors.text = "Le texte doit contenir au moins 10 caractères";
      } else if (data.text.length > 2000) {
        errors.text = "Le texte ne peut pas dépasser 2000 caractères";
      }
    }

    // Validation de l'image
    if (data.image) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(data.image.type)) {
        errors.image = "Seuls les formats JPEG, PNG et WebP sont autorisés";
      } else if (data.image.size > 5 * 1024 * 1024) {
        // 5MB
        errors.image = "L'image ne peut pas dépasser 5MB";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export const destinationsService = new DestinationsService();
