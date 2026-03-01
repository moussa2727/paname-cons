/* eslint-disable no-undef */

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDestinationService, type Destination, type CreateDestinationData, type UpdateDestinationData } from '../../api/admin/AdminDestionService';
import { Helmet } from 'react-helmet-async';
import RequireAdmin from '../../context/RequireAdmin';

const initialForm = {
  country: '',
  text: '',
};

const AdminDestinations: React.FC = (): React.JSX.Element => {
  const { access_token, user, isAuthenticated } = useAuth();
  const destinationService = useDestinationService();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [popover, setPopover] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const popoverTimeout = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Affiche un popover animé
  const showPopover = (message: string, type: 'success' | 'error'): void => {
    setPopover({ message, type });
    if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
    popoverTimeout.current = window.setTimeout(() => setPopover(null), 3000);
  };

  // Récupérer les destinations
  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const response = await destinationService.getAllDestinationsWithoutPagination();
      setDestinations(response);
    } catch (error) {
      console.error('Erreur lors de la récupération des destinations:', error);
      showPopover('Erreur lors du chargement des destinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier les droits admin
  const hasAdminRights = (): boolean => {
    if (!isAuthenticated || !user || !access_token) {
      return false;
    }

    return user.role === 'admin' || user.isAdmin === true;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAdminRights()) {
      showPopover('Droits administrateur requis', 'error');
      return;
    }

    // Validation pour la création : une image est obligatoire
    if (!editingId && !imageFile) {
      showPopover('Veuillez sélectionner une image', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // Mise à jour destination existante
        const updateData: UpdateDestinationData = {
          country: form.country.trim(),
          text: form.text.trim(),
          ...(imageFile && { imageFile }),
        };

        await destinationService.updateDestination(editingId, updateData);
        showPopover('Destination modifiée avec succès', 'success');
      } else {
        // Création nouvelle destination
        const createData: CreateDestinationData = {
          country: form.country.trim(),
          text: form.text.trim(),
          imageFile: imageFile!, // Safe car on a validé au début
        };

        await destinationService.createDestination(createData);
        showPopover('Destination ajoutée avec succès', 'success');
      }
      
      // Réinitialiser le formulaire
      resetForm();
      fetchDestinations();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une destination
  const handleDelete = async (id: string) => {
    if (!hasAdminRights()) {
      showPopover('Droits administrateur requis', 'error');
      return;
    }

    setLoading(true);
    try {
      await destinationService.deleteDestination(id);
      showPopover('Destination supprimée avec succès', 'error');
      setShowDeleteConfirm(null);
      fetchDestinations();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer les changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Gérer le changement d'image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation basique du fichier
      if (!file.type.startsWith('image/')) {
        showPopover('Veuillez sélectionner une image valide', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        showPopover('L\'image ne doit pas dépasser 5MB', 'error');
        return;
      }

      setImageFile(file);
    }
  };

  // Modifier une destination
  const handleEdit = (destination: Destination) => {
    setForm({
      country: destination.country,
      text: destination.text,
    });
    setEditingId(destination._id);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Nettoyer les timeouts
  useEffect(() => {
    return () => {
      if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
    };
  }, [access_token, user, isAuthenticated]);

  const isAdmin = hasAdminRights();

  useEffect(() => {
    if (isAdmin) {
      fetchDestinations();
    }
  }, [isAdmin]);

  return (
    <RequireAdmin>
      <Helmet>
        <title>Gestion des Destinations - Paname Consulting</title>
        <meta name="description" content="Gérez les destinations de voyages proposées par Paname Consulting" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Destinations</h1>
            <p className="mt-2 text-gray-600">Ajoutez, modifiez ou supprimez des destinations de voyage</p>
          </div>

          {/* Popover */}
          {popover && (
            <div
              className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
                popover.type === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {popover.message}
            </div>
          )}

          {/* Formulaire */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Modifier une destination' : 'Ajouter une destination'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom du pays"
                />
              </div>

              <div>
                <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="text"
                  name="text"
                  value={form.text}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description de la destination (10-2000 caractères)"
                  minLength={10}
                  maxLength={2000}
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                  Image
                </label>
                <input
                  type="file"
                  id="image"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {imageFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Image sélectionnée: {imageFile.name}
                  </p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'En cours...' : (editingId ? 'Modifier' : 'Ajouter')}
                </button>
                
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Liste des destinations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Destinations existantes</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Chargement...</p>
              </div>
            ) : destinations.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Aucune destination trouvée</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {destinations.map((destination) => (
                  <div key={destination._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-lg mb-2">{destination.country}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{destination.text}</p>
                    
                    {destination.imagePath && (
                      <div className="mb-4">
                        <img
                          src={`${import.meta.env.VITE_API_URL}/${destination.imagePath}`}
                          alt={destination.country}
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/paname-consulting.png';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(destination)}
                        className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(destination._id)}
                        className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de confirmation de suppression */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirmer la suppression</h3>
                <p className="text-gray-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer cette destination ? Cette action est irréversible.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'Suppression...' : 'Supprimer'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
};

export default AdminDestinations;
