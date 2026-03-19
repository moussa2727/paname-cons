import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import type {
  CreateDestinationData,
  UpdateDestinationData,
  Destination,
} from "../../../types/destination.types";

interface DestinationFormProps {
  destination?: Destination;
  onSubmit: (
    data: CreateDestinationData | UpdateDestinationData,
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

const DestinationForm: React.FC<DestinationFormProps> = ({
  destination,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    country: destination?.country || "",
    text: destination?.text || "",
  });

  const [selectedImage, setSelectedImage] = useState<File | undefined>();
  const [imagePreview, setImagePreview] = useState<string>(
    destination?.imageUrl || "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          image:
            "Type de fichier invalide. Types autorisés: JPEG, PNG, WEBP, AVIF, SVG",
        }));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Le fichier ne doit pas dépasser 5MB",
        }));
        return;
      }

      setSelectedImage(file);
      setErrors((prev) => ({ ...prev, image: "" }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setSelectedImage(undefined);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.country.trim()) {
      newErrors.country = "Le pays est obligatoire";
    } else if (formData.country.trim().length < 2) {
      newErrors.country = "Le pays doit contenir au moins 2 caractères";
    } else if (formData.country.trim().length > 100) {
      newErrors.country = "Le pays ne doit pas dépasser 100 caractères";
    }

    if (!formData.text.trim()) {
      newErrors.text = "La description est obligatoire";
    } else if (formData.text.trim().length < 10) {
      newErrors.text = "La description doit contenir au moins 10 caractères";
    } else if (formData.text.trim().length > 2000) {
      newErrors.text = "La description ne doit pas dépasser 2000 caractères";
    }

    // Validation de l'image (obligatoire pour la création)
    if (!destination && !selectedImage && !imagePreview) {
      newErrors.image =
        "Une image est requise pour la création d'une destination";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateDestinationData | UpdateDestinationData = {
        country: formData.country.trim(),
        text: formData.text.trim(),
      };

      if (selectedImage) {
        submitData.image = selectedImage;
      } else if (!destination && !imagePreview) {
        // Pour la création, si aucune image n'est sélectionnée et pas d'image de prévisualisation
        // on utilise une image par défaut (le backend s'en occupera)
        // submitData.image = null; // Le backend utilisera l'image par défaut
      }

      await onSubmit(submitData);
    } catch (error) {
      // L'erreur est gérée par le composant parent
      console.error("Form submission error:", error);
    }
  };

  return (
    <>
      {/* Backdrop cliquable */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 z-9998"
        onClick={onCancel}
      />
      <div className="fixed inset-0 flex items-center justify-center z-9999 p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {destination
                ? "Modifier la destination"
                : "Ajouter une destination"}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Pays */}
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Pays <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  errors.country ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Ex: France"
                disabled={loading}
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="text"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                rows={6}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none ${
                  errors.text ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Décrivez la destination, les avantages, les opportunités..."
                disabled={loading}
              />
              <div className="flex justify-between mt-1">
                <p className="text-sm text-gray-500">
                  {formData.text.length}/2000 caractères
                </p>
                {errors.text && (
                  <p className="text-sm text-red-600">{errors.text}</p>
                )}
              </div>
            </div>

            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="w-full h-64 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Cliquez pour uploader une image ou glissez-déposez
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    JPEG, PNG, WEBP, AVIF, SVG (Max 5MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2 mx-auto"
                    disabled={loading}
                  >
                    <Upload className="w-4 h-4" />
                    Choisir une image
                  </button>
                </div>
              )}

              {errors.image && (
                <p className="mt-2 text-sm text-red-600">{errors.image}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {destination ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default DestinationForm;
