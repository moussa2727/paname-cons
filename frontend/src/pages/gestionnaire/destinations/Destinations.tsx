import { useState, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Globe,
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Download,
  Image,
  Calendar,
} from "lucide-react";
import { useDestinations } from "../../../hooks/useDestinations";
import { destinationsService } from "../../../services/destinations.service";
import type {
  Destination,
  CreateDestinationData,
  UpdateDestinationData,
} from "../../../types/destination.types";
import DestinationFormModal from "../../../components/admin/destinations/DestinationFormModal";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";

const Destinations = () => {
  console.log("[Destinations] Component mounting...");

  const {
    destinations,
    loading,
    searchDestinations,
    createDestination,
    updateDestination,
    deleteDestination,
    getDestinationsStatistics,
  } = useDestinations();

  console.log(
    "[Destinations] Hook state - destinations:",
    destinations,
    "loading:",
    loading,
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteData, setConfirmDeleteData] = useState<{
    id: string;
    country: string;
  } | null>(null);
  const [sortBy, setSortBy] = useState<"country" | "createdAt" | "updatedAt">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statistics, setStatistics] = useState<{
    total: number;
    topCountries: { country: string; count: number }[];
    withImages: number;
    withoutImages: number;
    recentlyAdded: Destination[];
  } | null>(null);

  // Charger les statistiques
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await getDestinationsStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Erreur chargement statistiques:", error);
    }
  }, [getDestinationsStatistics]);

  // Charger les stats au montage et quand les destinations changent
  useMemo(() => {
    if (destinations.length > 0) {
      loadStatistics();
    }
  }, [destinations, loadStatistics]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchTerm(query);
      searchDestinations(query);
    },
    [searchDestinations],
  );

  const handleCreate = useCallback(
    async (data: CreateDestinationData) => {
      try {
        await createDestination(data);
        setShowForm(false);
        await loadStatistics(); // Recharger les stats après création
      } catch (error) {
        console.error("Erreur création destination:", error);
      }
    },
    [createDestination, loadStatistics],
  );

  const handleUpdate = useCallback(
    async (data: UpdateDestinationData) => {
      if (editingDestination) {
        try {
          await updateDestination(editingDestination.id, data);
          setEditingDestination(null);
          await loadStatistics(); // Recharger les stats après mise à jour
        } catch (error) {
          console.error("Erreur mise à jour destination:", error);
        }
      }
    },
    [updateDestination, editingDestination, loadStatistics],
  );

  const handleEdit = useCallback((destination: Destination) => {
    setEditingDestination(destination);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const destination = destinations.find((d) => d.id === id);
      if (destination) {
        setConfirmDeleteData({ id, country: destination.country });
      }
    },
    [destinations],
  );

  const confirmDelete = useCallback(async () => {
    if (confirmDeleteData) {
      setDeletingId(confirmDeleteData.id);
      try {
        await deleteDestination(confirmDeleteData.id);
        setConfirmDeleteData(null);
        await loadStatistics(); // Recharger les stats après suppression
      } catch (error) {
        console.error("Erreur suppression destination:", error);
      } finally {
        setDeletingId(null);
      }
    }
  }, [confirmDeleteData, deleteDestination, loadStatistics]);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDestination(null);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const sortedDestinations = useMemo(() => {
    if (!Array.isArray(destinations)) return [];

    return [...destinations].sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "country") {
        compareValue = a.country.localeCompare(b.country);
      } else if (sortBy === "createdAt") {
        compareValue =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "updatedAt") {
        compareValue =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });
  }, [destinations, sortBy, sortOrder]);

  const handleExportCSV = useCallback(async () => {
    try {
      const csv = await destinationsService.exportDestinationsToCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `destinations_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erreur export CSV:", error);
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>Gestion Des Destinations - Paname Consulting</title>
        <meta
          name="description"
          content="Gérez les destinations d'études de Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Destinations
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  Gestion des destinations et procédures d'immigration
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || destinations.length === 0}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </button>

                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                  <span className="sm:hidden">Ajouter</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">
                  {statistics?.total ||
                    (Array.isArray(destinations) ? destinations.length : 0)}
                </span>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                Total Destinations
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">
                  {statistics?.topCountries?.length || 0}
                </span>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                Pays disponibles
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Image className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">
                  {statistics?.withImages || 0}
                </span>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">Avec images</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">
                  {statistics?.recentlyAdded?.length || 0}
                </span>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                Ajoutées récemment
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher une destination..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split("-");
                    setSortBy(sort as "country" | "createdAt" | "updatedAt");
                    setSortOrder(order as "asc" | "desc");
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-600"
                >
                  <option value="createdAt-desc">Plus récentes</option>
                  <option value="createdAt-asc">Plus anciennes</option>
                  <option value="country-asc">Pays (A-Z)</option>
                  <option value="country-desc">Pays (Z-A)</option>
                  <option value="updatedAt-desc">Récemment modifiées</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Destinations Grid */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {sortedDestinations.map((destination: Destination) => (
              <div
                key={destination.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="relative h-32 sm:h-40 bg-linear-to-br from-sky-400 to-indigo-600">
                  {destination.imageUrl ? (
                    <img
                      src={destination.imageUrl}
                      alt={destination.country}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {destination.country}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {destination.text}
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {/* Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-500">
                        Ajoutée le
                      </span>
                      <span className="text-xs sm:text-sm text-gray-900">
                        {formatDate(destination.createdAt)}
                      </span>
                    </div>

                    {/* Image status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-500">
                        Image
                      </span>
                      <span
                        className={`text-xs sm:text-sm ${destination.imageUrl ? "text-green-600" : "text-gray-400"}`}
                      >
                        {destination.imageUrl ? "Oui" : "Non"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4 sm:mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(destination)}
                      className="p-2 text-gray-600 hover:text-sky-600 transition-colors disabled:opacity-50"
                      disabled={loading}
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(destination.id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                      disabled={loading || deletingId === destination.id}
                      title="Supprimer"
                    >
                      {deletingId === destination.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!Array.isArray(destinations) || destinations.length === 0) &&
            !loading && (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Aucune destination trouvée
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm
                    ? "Essayez une autre recherche"
                    : "Commencez par ajouter une destination"}
                </p>
              </div>
            )}

          {loading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement...</p>
            </div>
          )}
        </div>

        {/* Form Modal */}
        <DestinationFormModal
          isOpen={showForm || !!editingDestination}
          onClose={handleCloseForm}
          destination={editingDestination}
          isEdit={!!editingDestination}
          onSubmit={async (data: UpdateDestinationData) => {
            if (editingDestination) {
              await handleUpdate(data);
            } else {
              await handleCreate(data as CreateDestinationData);
            }
          }}
          loading={loading}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          open={!!confirmDeleteData}
          onCancel={() => setConfirmDeleteData(null)}
          onConfirm={confirmDelete}
          title="Supprimer la destination"
          content={`Êtes-vous sûr de vouloir supprimer la destination "${confirmDeleteData?.country}" ? Cette action est irréversible.`}
        />
      </div>
    </>
  );
};

export default Destinations;
