import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import DestinationForm from "./DestinationForm";
import type {
  Destination,
  CreateDestinationData,
  UpdateDestinationData,
} from "../../../types/destination.types";

interface DestinationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination?: Destination | null;
  isEdit?: boolean;
  onSubmit: (
    data: CreateDestinationData | UpdateDestinationData,
  ) => Promise<void>;
  loading?: boolean;
}

const DestinationFormModal: React.FC<DestinationFormModalProps> = ({
  isOpen,
  onClose,
  destination,
  isEdit = false,
  onSubmit,
  loading = false,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Update image preview when destination changes or modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && destination?.imageUrl) {
        setImagePreview(destination.imageUrl);
      } else if (!isOpen) {
        setImagePreview(null);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, destination?.imageUrl]);

  if (!isOpen) return null;

  return (
    // Overlay avec fond noir semi-transparent
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fond noir */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-sky-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? "Modifier la destination" : "Ajouter une destination"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {imagePreview && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aperçu de l'image
              </label>
              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <DestinationForm
            destination={destination || undefined}
            isEdit={isEdit}
            onSubmit={onSubmit}
            onCancel={onClose}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default DestinationFormModal;
