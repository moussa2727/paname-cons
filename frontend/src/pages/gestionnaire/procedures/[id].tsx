import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useProcedures } from "../../../hooks/useProcedures";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../../components/shared/admin/Loader";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Play,
  ChevronDown,
  User,
  Ban,
} from "lucide-react";
import type {
  ProcedureStatus,
  StepName,
  StepStatus,
  UpdateProcedureDto,
  UpdateStepDto,
} from "../../../types/procedures.types";

// Configuration
const STATUS_LABELS: Record<ProcedureStatus, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

const STATUS_COLORS: Record<ProcedureStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
};

const STEP_LABELS: Record<StepName, string> = {
  DEMANDE_ADMISSION: "Demande d'admission",
  ENTRETIEN_MOTIVATION: "Entretien de motivation",
  DEMANDE_VISA: "Demande de visa",
  PREPARATIF_VOYAGE: "Préparatifs voyage",
};

const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

const STEP_STATUS_COLORS: Record<StepStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-orange-100 text-orange-700",
};

// Types
interface ModalState {
  type: "edit" | "editStep" | "addStep" | "cancel" | "delete" | null;
  stepName?: StepName;
}

export default function ProcedureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const {
    selectedProcedure,
    loading,
    error,
    loadById,
    update,
    updateStep,
    addStep,
    remove,
    cancelProcedure,
  } = useProcedures();

  const [modal, setModal] = useState<ModalState>({ type: null });
  const [editForm, setEditForm] = useState<UpdateProcedureDto>({});
  const [stepForm, setStepForm] = useState<UpdateStepDto>({});
  const [cancelReason, setCancelReason] = useState("");
  const [showStepMenu, setShowStepMenu] = useState(false);

  // Charger la procédure
  useEffect(() => {
    if (id && isAdmin) {
      loadById(id);
    }
  }, [id, isAdmin, loadById]);

  // Fermer le menu déroulant quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => {
      if (showStepMenu) {
        setShowStepMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showStepMenu]);

  // Handlers
  const handleUpdate = async () => {
    if (!selectedProcedure) return;

    try {
      await update(selectedProcedure.id, editForm);
      setModal({ type: null });
      await loadById(selectedProcedure.id);
    } catch (error) {
      console.error("Erreur mise à jour:", error);
    }
  };

  const handleUpdateStep = async () => {
    if (!selectedProcedure || !modal.stepName) return;

    try {
      await updateStep(selectedProcedure.id, modal.stepName, stepForm);
      setModal({ type: null });
      await loadById(selectedProcedure.id);
    } catch (error) {
      console.error("Erreur mise à jour étape:", error);
    }
  };

  const handleAddStep = async () => {
    if (!selectedProcedure || !modal.stepName) return;

    try {
      await addStep(selectedProcedure.id, modal.stepName);
      setModal({ type: null });
      await loadById(selectedProcedure.id);
    } catch (error) {
      console.error("Erreur ajout étape:", error);
    }
  };

  const handleCancel = async () => {
    if (!selectedProcedure) return;

    try {
      await cancelProcedure(selectedProcedure.id, cancelReason);
      setModal({ type: null });
      setCancelReason("");
      await loadById(selectedProcedure.id);
    } catch (error) {
      console.error("Erreur annulation:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedProcedure) return;

    try {
      await remove(selectedProcedure.id);
      navigate("/gestionnaire/procedures");
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  const openModal = (type: ModalState["type"], stepName?: StepName) => {
    if (type === "edit" && selectedProcedure) {
      setEditForm({
        prenom: selectedProcedure.prenom,
        nom: selectedProcedure.nom,
        telephone: selectedProcedure.telephone,
        destination: selectedProcedure.destination,
        destinationAutre: selectedProcedure.destinationAutre || undefined,
        filiere: selectedProcedure.filiere,
        filiereAutre: selectedProcedure.filiereAutre || undefined,
        niveauEtude: selectedProcedure.niveauEtude,
        niveauEtudeAutre: selectedProcedure.niveauEtudeAutre || undefined,
      });
    }
    setModal({ type, stepName });
  };

  const closeModal = () => {
    setModal({ type: null });
    setEditForm({});
    setStepForm({});
    setCancelReason("");
  };

  if (loading.details) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Erreur: {error}</div>
      </div>
    );
  }

  if (!selectedProcedure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Procédure non trouvée</div>
      </div>
    );
  }

  const canBeModified = !["COMPLETED", "CANCELLED", "REJECTED"].includes(
    selectedProcedure.statut,
  );
  const canBeCancelled = !["COMPLETED", "CANCELLED"].includes(
    selectedProcedure.statut,
  );
  const getEffectiveValue = (value: string, autre?: string | null) => {
    return value === "Autre" && autre ? autre : value;
  };

  return (
    <>
      <Helmet>
        <title>Procédure #{selectedProcedure.id} - Paname Consulting</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/gestionnaire/procedures")}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </button>
                <h1 className="text-xl font-semibold text-gray-900">
                  Procédure #{selectedProcedure.id.slice(-8)}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[selectedProcedure.statut]}`}
                >
                  {STATUS_LABELS[selectedProcedure.statut]}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canBeModified && (
                  <button
                    onClick={() => openModal("edit")}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-sky-300 text-sky-700 rounded-lg hover:bg-sky-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                )}
                {canBeCancelled && (
                  <button
                    onClick={() => openModal("cancel")}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50"
                  >
                    <Ban className="w-4 h-4" />
                    Annuler
                  </button>
                )}
                <button
                  onClick={() => openModal("delete")}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations personnelles */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {selectedProcedure.prenom} {selectedProcedure.nom}
                      </div>
                      <div className="text-sm text-gray-500">Nom complet</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {selectedProcedure.email}
                      </div>
                      <div className="text-sm text-gray-500">Email</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {selectedProcedure.telephone}
                      </div>
                      <div className="text-sm text-gray-500">Téléphone</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {new Date(
                          selectedProcedure.createdAt,
                        ).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Date de création
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations académiques */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations académiques
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {getEffectiveValue(
                          selectedProcedure.destination,
                          selectedProcedure.destinationAutre,
                        )}
                      </div>
                      <div className="text-sm text-gray-500">Destination</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {getEffectiveValue(
                          selectedProcedure.niveauEtude,
                          selectedProcedure.niveauEtudeAutre,
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Niveau d'étude
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {getEffectiveValue(
                          selectedProcedure.filiere,
                          selectedProcedure.filiereAutre,
                        )}
                      </div>
                      <div className="text-sm text-gray-500">Filière</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Étapes de la procédure */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Étapes de la procédure
                  </h2>
                  {canBeModified && (
                    <div className="relative">
                      <button
                        onClick={() => setShowStepMenu(!showStepMenu)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                      >
                        <Play className="w-4 h-4" />
                        Ajouter une étape
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {showStepMenu && (
                        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
                          <div className="py-1">
                            {Object.entries(STEP_LABELS).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  openModal("addStep", key as StepName);
                                  setShowStepMenu(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedProcedure.steps?.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {STEP_LABELS[step.nom]}
                          </div>
                          <div className="text-sm text-gray-500">
                            Créée le{" "}
                            {new Date(step.dateCreation).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${STEP_STATUS_COLORS[step.statut]}`}
                        >
                          {STEP_STATUS_LABELS[step.statut]}
                        </span>
                        {canBeModified && (
                          <button
                            onClick={() => openModal("editStep", step.nom)}
                            className="text-sky-600 hover:text-sky-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progression */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Progression
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Étapes complétées</span>
                    <span className="font-medium">
                      {
                        selectedProcedure.steps?.filter(
                          (s) => s.statut === "COMPLETED",
                        ).length
                      }{" "}
                      / {selectedProcedure.steps?.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-sky-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${((selectedProcedure.steps?.filter((s) => s.statut === "COMPLETED").length || 0) / (selectedProcedure.steps?.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Historique */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Historique
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Création</span>
                    <span>
                      {new Date(
                        selectedProcedure.createdAt,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedProcedure.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Dernière modification
                      </span>
                      <span>
                        {new Date(
                          selectedProcedure.updatedAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedProcedure.dateCompletion && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de complétion</span>
                      <span>
                        {new Date(
                          selectedProcedure.dateCompletion,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      {modal.type === "edit" && (
        <ConfirmationModal
          open={true}
          onCancel={closeModal}
          onConfirm={handleUpdate}
          title="Modifier la procédure"
          content="Êtes-vous sûr de vouloir modifier cette procédure ?"
        />
      )}

      {/* Modal d'édition d'étape */}
      {modal.type === "editStep" && (
        <ConfirmationModal
          open={true}
          onCancel={closeModal}
          onConfirm={handleUpdateStep}
          title={`Modifier l'étape: ${modal.stepName && STEP_LABELS[modal.stepName]}`}
          content="Êtes-vous sûr de vouloir modifier cette étape ?"
        />
      )}

      {/* Modal d'ajout d'étape */}
      {modal.type === "addStep" && (
        <ConfirmationModal
          open={true}
          onCancel={closeModal}
          onConfirm={handleAddStep}
          title={`Ajouter une étape: ${modal.stepName && STEP_LABELS[modal.stepName]}`}
          content={`Vous allez ajouter l'étape "${modal.stepName && STEP_LABELS[modal.stepName]}" à cette procédure.`}
        />
      )}

      {/* Modal d'annulation */}
      {modal.type === "cancel" && (
        <ConfirmationModal
          open={true}
          onCancel={closeModal}
          onConfirm={handleCancel}
          title="Annuler la procédure"
          content="Êtes-vous sûr de vouloir annuler cette procédure ? Cette action est irréversible."
        />
      )}

      {/* Modal de suppression */}
      {modal.type === "delete" && (
        <ConfirmationModal
          open={true}
          onCancel={closeModal}
          onConfirm={handleDelete}
          title="Supprimer la procédure"
          content="Êtes-vous sûr de vouloir supprimer cette procédure ? Cette action est irréversible et toutes les données seront perdues."
        />
      )}
    </>
  );
}
