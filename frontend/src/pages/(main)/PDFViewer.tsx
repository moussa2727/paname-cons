import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MinimalLayout from "../../components/shared/Layouts/MiniLayout";
import { Helmet } from "react-helmet-async";

const PDFViewer: React.FC = () => {
  const { documentName: rawDocumentName } = useParams<{ documentName: string }>();
  // Extraire le nom sans l'extension .pdf
  const documentName = rawDocumentName?.replace(/\.pdf$/i, '') || undefined;
  const navigate = useNavigate();
  const [documentExists, setDocumentExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si le document existe dans le dossier public/documents
  const checkDocumentExists = async (docName: string): Promise<boolean> => {
    try {
      const response = await fetch(`/documents/${docName}.pdf`, {
        method: "HEAD",
      });
      return response.ok;
    } catch {
      return false;
    }
  };

// Liste des documents disponibles (en dehors du composant pour stabilité)
const AVAILABLE_DOCUMENTS = [
  "russie",
  "turquie",
  "chine",
  "chypre",
  "algerie",
  "maroc",
  "france",
];

  useEffect(() => {
    const verifyDocument = async () => {
      if (!documentName) {
        setDocumentExists(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Vérification dynamique d'abord
      const exists = await checkDocumentExists(documentName.toLowerCase());

      // Si la vérification échoue, utiliser la liste statique comme fallback
      if (!exists) {
        const fallbackExists = AVAILABLE_DOCUMENTS.includes(
          documentName.toLowerCase(),
        );
        setDocumentExists(fallbackExists);
      } else {
        setDocumentExists(true);
      }

      setIsLoading(false);
    };

    verifyDocument();
  }, [documentName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Si le document existe, l'ouvrir automatiquement dans un nouvel onglet
    // mais ne pas rediriger - laisser l'utilisateur sur la page
    if (documentExists && documentName) {
      const pdfUrl = `/documents/${documentName}.pdf`;
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  }, [documentExists, documentName]);

  // Si le document n'existe pas, afficher le message d'erreur
  if (isLoading || documentExists === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Chargement...
          </h2>
          <p className="text-gray-600 mb-6">
            Vérification de la disponibilité du document...
          </p>
        </div>
      </div>
    );
  }

  if (!documentExists) {
    return (
      <>
        <Helmet>
          <title>
            {documentName
              ? `Document ${documentName} - Paname Consulting`
              : "Documents Informatifs - Paname Consulting"}
          </title>
          <meta name="robots" content="index, follow" />
          <meta name="googlebot" content="index, follow" />
        </Helmet>
        <MinimalLayout>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Document en cours de préparation
              </h2>
              <p className="text-gray-600 mb-6">
                Nous faisons tout notre possible pour rendre ce document
                disponible dans les plus brefs délais. Nos équipes travaillent
                actuellement à sa finalisation.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Bientôt disponible :</strong> Ce document sera mis à
                  jour dès que possible.
                </p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="bg-sky-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-sky-700 transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        </MinimalLayout>
      </>
    );
  }

  // Si le document existe, ouvrir dans nouvel onglet et retourner à l'accueil
  if (documentExists) {
    navigate("/");
    return null;
  }
};

export default PDFViewer;
