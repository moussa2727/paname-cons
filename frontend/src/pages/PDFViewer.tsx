import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';

const PDFReader: React.FC = () => {
  const { documentName } = useParams<{ documentName: string }>();
  const navigate = useNavigate();
  const [documentExists, setDocumentExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si le document existe dans le dossier public/documents
  const checkDocumentExists = async (docName: string): Promise<boolean> => {
    try {
      const response = await fetch(`/documents/${docName}.pdf`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Liste des documents disponibles (fallback si la vérification échoue)
  const availableDocuments = [
    'russie',
    'turquie',
    'chine',
    'chypre',
    'algerie',
    'maroc',
    'france'
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
        const fallbackExists = availableDocuments.includes(documentName.toLowerCase());
        setDocumentExists(fallbackExists);
      } else {
        setDocumentExists(true);
      }
      
      setIsLoading(false);
    };

    verifyDocument();
  }, [documentName]);

  const pdfUrl = documentExists && documentName ? `/documents/${documentName}.pdf` : null;
  const title = documentExists && documentName ? `Document - ${documentName.charAt(0).toUpperCase() + documentName.slice(1)}` : 'Document indisponible';

  const handleDownload = () => {
    if (pdfUrl && documentName) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${documentName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Si le document n'existe pas, afficher le message d'erreur
  if (isLoading || documentExists === null) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
        <div className='bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center'>
          <div className='w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <div className='w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin'></div>
          </div>
          <h2 className='text-2xl font-bold text-gray-800 mb-4'>Chargement...</h2>
          <p className='text-gray-600 mb-6'>
            Vérification de la disponibilité du document...
          </p>
        </div>
      </div>
    );
  }

  if (!documentExists) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
        <div className='bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg className='w-8 h-8 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z' />
            </svg>
          </div>
          <h2 className='text-2xl font-bold text-gray-800 mb-4'>Document indisponible</h2>
          <p className='text-gray-600 mb-6'>
            Nous nous excusons, mais ce document est actuellement indisponible. Nous vous assurons de le mettre à votre disposition dans les plus brefs délais.
          </p>
          <button
            onClick={handleBack}
            className='bg-sky-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-sky-700 transition-colors'
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100 flex flex-col'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={handleBack}
                className='flex items-center space-x-2 text-gray-600 hover:text-sky-600 hover:bg-sky-50 px-3 py-2 rounded-lg transition-colors'
              >
                <ArrowLeft className='w-5 h-5' />
                <span className='font-medium'>Retour</span>
              </button>
              <div className='h-6 w-px bg-gray-300'></div>
              <h1 className='text-xl font-semibold text-gray-800 truncate max-w-md'>
                {title}
              </h1>
            </div>
            <div className='flex items-center space-x-2'>
              <button
                onClick={handleDownload}
                className='flex items-center space-x-2 text-gray-600 hover:text-sky-600 hover:bg-sky-50 px-4 py-2 rounded-lg transition-colors'
              >
                <Download className='w-5 h-5' />
                <span className='font-medium'>Télécharger</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PDF Viewer - Pleine page */}
      <main className='flex-1 p-0'>
        <div className='w-full h-full bg-white'>
          <iframe
            src={pdfUrl!}
            className='w-full h-screen border-0'
            title='PDF Viewer'
            onError={() => {
              // Fallback si iframe ne fonctionne pas
              if (pdfUrl) window.open(pdfUrl, '_blank');
            }}
          />
        </div>
      </main>

      {/* Footer optionnel */}
      <footer className='bg-white border-t border-gray-200 py-4'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between text-sm text-gray-600'>
            <div>
              Document PDF - {documentName}
            </div>
            <div>
              Paname Consulting - Documents d'information
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PDFReader;
