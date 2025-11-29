import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminContactService, {
  Contact,
  ContactStats,
} from '../../api/admin/AdminContactService';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';

// Icons corrigés pour accepter className
const Icon = {
  Eye: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
      />
    </svg>
  ),
  Reply: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
      />
    </svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M5 13l4 4L19 7'
      />
    </svg>
  ),
  Trash: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
      />
    </svg>
  ),
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
      />
    </svg>
  ),
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
      />
    </svg>
  ),
  Refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
      />
    </svg>
  ),
  User: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
      />
    </svg>
  ),
  Email: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
      />
    </svg>
  ),
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
      />
    </svg>
  ),
};

const AdminMessages: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const contactService = AdminContactService();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  // États pour la pagination et filtres
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    isRead: undefined as boolean | undefined,
  });

  const [totalContacts, setTotalContacts] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Vérifier l'accès administrateur
  const canAccessAdmin =
    isAuthenticated && (user?.isAdmin || user?.role === 'admin');

  // Charger les contacts
  const loadContacts = async () => {
    if (!canAccessAdmin) {
      toast.error('Accès non autorisé');
      return;
    }

    try {
      const response = await contactService.getAllContacts(filters);
      setContacts(response.data);
      setTotalContacts(response.total);
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des contacts:', error);
      if (
        (error as any).message.includes('Accès refusé') ||
        (error as any).message.includes('Authentification requise')
      ) {
        toast.error("Problème d'authentification. Veuillez vous reconnecter.");
      }
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    if (!canAccessAdmin) return;

    try {
      const statsData = await contactService.getContactStats();
      setStats(statsData);
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des statistiques:', error);
      if (
        (error as any).message.includes('Accès refusé') ||
        (error as any).message.includes('Authentification requise')
      ) {
        toast.error("Problème d'authentification. Veuillez vous reconnecter.");
      }
    }
  };

  useEffect(() => {
    if (canAccessAdmin && !isInitialized) {
      loadContacts();
      loadStats();
      setIsInitialized(true);
    }
  }, [canAccessAdmin, isInitialized]);

  useEffect(() => {
    if (canAccessAdmin) {
      loadContacts();
    }
  }, [filters, canAccessAdmin]);

  // Gestionnaires d'actions avec gestion d'erreur d'authentification
  const handleMarkAsRead = async (id: string) => {
    if (!canAccessAdmin) {
      toast.error('Accès non autorisé');
      return;
    }

    try {
      await contactService.markAsRead(id);
      await loadContacts();
      await loadStats();
      toast.success('Message marqué comme lu');
    } catch (error: unknown) {
      console.error('Erreur markAsRead:', error);
      if (
        (error as any).message.includes('Accès refusé') ||
        (error as any).message.includes('Authentification requise')
      ) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        toast.error('Erreur lors du marquage du message');
      }
    }
  };

  const handleReply = async () => {
    if (!canAccessAdmin || !selectedContact || !replyMessage.trim()) {
      toast.error('Accès non autorisé ou message vide');
      return;
    }

    try {
      await contactService.replyToMessage(selectedContact._id, replyMessage);
      await loadContacts();
      await loadStats();
      setIsReplyModalOpen(false);
      setReplyMessage('');
      toast.success('Réponse envoyée avec succès');
    } catch (error: unknown) {
      console.error('Erreur replyToMessage:', error);
      if (
        (error as any).message.includes('Accès refusé') ||
        (error as any).message.includes('Authentification requise')
      ) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        toast.error("Erreur lors de l'envoi de la réponse");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!canAccessAdmin) {
      toast.error('Accès non autorisé');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      await contactService.deleteContact(id);
      await loadContacts();
      await loadStats();
      toast.success('Message supprimé avec succès');
    } catch (error: unknown) {
      console.error('Erreur deleteContact:', error);
      if (
        (error as any).message.includes('Accès refusé') ||
        (error as any).message.includes('Authentification requise')
      ) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        toast.error('Erreur lors de la suppression du message');
      }
    }
  };

  const handleViewDetails = async (contact: Contact) => {
    if (!canAccessAdmin) {
      toast.error('Accès non autorisé');
      return;
    }

    setSelectedContact(contact);
    setIsDetailModalOpen(true);

    // Marquer comme lu si ce n'est pas déjà fait
    if (!contact.isRead) {
      await handleMarkAsRead(contact._id);
    }
  };

  const handleOpenReply = (contact: Contact) => {
    if (!canAccessAdmin) {
      toast.error('Accès non autorisé');
      return;
    }

    setSelectedContact(contact);
    setIsReplyModalOpen(true);
  };

  // Formatage de la date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination
  const totalPages = Math.ceil(totalContacts / filters.limit);
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Si l'utilisateur n'a pas accès
  if (!canAccessAdmin) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center'>
        <div className='text-center'>
          <div className='p-4 bg-red-100 rounded-full inline-block mb-4'>
            <Icon.Email className='w-12 h-12 text-red-500' />
          </div>
          <h2 className='text-xl font-bold text-slate-800 mb-2'>
            Accès refusé
          </h2>
          <p className='text-slate-600'>
            Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <Helmet>
      <title>Page de gestion des Messages - Paname Consulting</title>
      <meta
        name='description'
        content="Interface dadministration pour gérer les messages des utilisateurs sur Paname Consulting. Accès réservé aux administrateurs."
      />
      <meta name='robots' content='noindex, nofollow' />
      <meta name='googlebot' content='noindex, nofollow' />
      <meta name='bingbot' content='noindex, nofollow' />
      <meta name='yandexbot' content='noindex, nofollow' />
    </Helmet>
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-x-hidden'>
      {/* Header */}
      <div className='mb-4 px-4'>
        <div className='flex items-center gap-2 mb-1'>
          <div className='p-2 bg-blue-500 rounded-lg'>
            <Icon.Email className='w-5 h-5 text-white' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-slate-800'>
              Gestion des Messages
            </h1>
            <p className='text-slate-600 text-sm'>Messages des utilisateurs</p>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques compactes */}
      {stats && (
        <div className='grid grid-cols-2 gap-2 mb-4 px-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-blue-500 rounded-lg'>
                <Icon.Email className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Total</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-red-500 rounded-lg'>
                <Icon.Email className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Non lus</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.unread}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-green-500 rounded-lg'>
                <Icon.Check className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Répondu</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.responded}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-purple-500 rounded-lg'>
                <Icon.Calendar className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Ce mois</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.thisMonth}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className='bg-white rounded-xl border border-slate-200/60 p-3 mb-4 shadow-sm mx-4'>
        <div className='space-y-3'>
          {/* Recherche */}
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Icon.Search className='w-4 h-4 text-slate-400' />
            </div>
            <input
              type='text'
              placeholder='Rechercher...'
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  search: e.target.value,
                  page: 1,
                }))
              }
              className='w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
            />
          </div>

          {/* Filtres et actions */}
          <div className='flex gap-2'>
            <select
              value={
                filters.isRead === undefined ? '' : filters.isRead.toString()
              }
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  isRead:
                    e.target.value === ''
                      ? undefined
                      : e.target.value === 'true',
                  page: 1,
                }))
              }
              className='flex-1 px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
            >
              <option value=''>Tous les statuts</option>
              <option value='false'>Non lus</option>
              <option value='true'>Lus</option>
            </select>

            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 10,
                  search: '',
                  isRead: undefined,
                });
              }}
              className='px-3 py-2.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center'
            >
              <Icon.Refresh className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Liste des messages */}
      <div className='bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm mx-4'>
        {/* En-tête */}
        <div className='px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Icon.Email className='w-4 h-4' />
              <h2 className='text-base font-semibold'>Messages</h2>
              <span className='bg-blue-400 text-blue-100 px-2 py-0.5 rounded-full text-xs'>
                {contacts.length}
              </span>
            </div>
          </div>
        </div>

        {/* Version mobile - Cartes */}
        <div className='md:hidden'>
          {contacts.length === 0 ? (
            <div className='p-6 text-center text-slate-500'>
              <Icon.Email className='w-12 h-12 mx-auto mb-2 text-slate-400' />
              <p className='text-slate-500'>Aucun message trouvé</p>
              {filters.search && (
                <p className='text-slate-400 text-sm mt-1'>
                  Aucun résultat pour "{filters.search}"
                </p>
              )}
            </div>
          ) : (
            <div className='divide-y divide-slate-200'>
              {contacts.map(contact => (
                <div
                  key={contact._id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    !contact.isRead ? 'bg-blue-25' : ''
                  }`}
                >
                  <div className='flex justify-between items-start mb-3'>
                    <div className='flex items-center flex-1 min-w-0'>
                      <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center'>
                        <Icon.User className='w-5 h-5 text-white' />
                      </div>
                      <div className='ml-3 flex-1 min-w-0'>
                        <h3 className='font-semibold text-slate-800 truncate'>
                          {contact.firstName} {contact.lastName}
                        </h3>
                        <p className='text-xs text-slate-600 truncate'>
                          {contact.email}
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-col items-end gap-1'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          contact.isRead
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {contact.isRead ? 'Lu' : 'Non lu'}
                      </span>
                      <p className='text-xs text-slate-500 whitespace-nowrap'>
                        {formatDate(contact.createdAt)}
                      </p>
                    </div>
                  </div>

                  <p className='text-sm text-slate-600 line-clamp-2 mb-3'>
                    {contact.message}
                  </p>

                  <div className='flex gap-2'>
                    <button
                      onClick={() => handleViewDetails(contact)}
                      className='flex-1 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 text-sm'
                    >
                      <Icon.Eye className='w-4 h-4' />
                      Voir
                    </button>

                    <button
                      onClick={() => handleOpenReply(contact)}
                      className='flex-1 px-3 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 text-sm'
                    >
                      <Icon.Reply className='w-4 h-4' />
                      Répondre
                    </button>

                    <button
                      onClick={() => handleDelete(contact._id)}
                      className='flex-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 text-sm'
                    >
                      <Icon.Trash className='w-4 h-4' />
                      Suppr.
                    </button>
                  </div>

                  {!contact.isRead && (
                    <div className='mt-2 flex justify-center'>
                      <button
                        onClick={() => handleMarkAsRead(contact._id)}
                        className='text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1'
                      >
                        <Icon.Check className='w-3 h-3' />
                        Marquer comme lu
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Version desktop - Tableau (caché sur mobile) */}
        <div className='hidden md:block overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Utilisateur
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Message
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Date
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Statut
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-slate-200'>
              {contacts.map(contact => (
                <tr
                  key={contact._id}
                  className={`hover:bg-slate-50 transition-colors ${
                    !contact.isRead ? 'bg-blue-25' : ''
                  }`}
                >
                  <td className='px-4 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center'>
                        <Icon.User className='w-5 h-5 text-white' />
                      </div>
                      <div className='ml-3'>
                        <p className='text-sm font-medium text-slate-800'>
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className='text-sm text-slate-600'>
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-4'>
                    <p className='text-sm text-slate-600 line-clamp-2'>
                      {contact.message}
                    </p>
                  </td>
                  <td className='px-4 py-4 whitespace-nowrap'>
                    <p className='text-sm text-slate-600'>
                      {formatDate(contact.createdAt)}
                    </p>
                  </td>
                  <td className='px-4 py-4 whitespace-nowrap'>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contact.isRead
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {contact.isRead ? 'Lu' : 'Non lu'}
                    </span>
                  </td>
                  <td className='px-4 py-4 whitespace-nowrap'>
                    <div className='flex items-center gap-1'>
                      <button
                        onClick={() => handleViewDetails(contact)}
                        className='p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                        title='Voir les détails'
                      >
                        <Icon.Eye className='w-4 h-4' />
                      </button>

                      <button
                        onClick={() => handleOpenReply(contact)}
                        className='p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                        title='Répondre'
                      >
                        <Icon.Reply className='w-4 h-4' />
                      </button>

                      {!contact.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(contact._id)}
                          className='p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                          title='Marquer comme lu'
                        >
                          <Icon.Check className='w-4 h-4' />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(contact._id)}
                        className='p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                        title='Supprimer'
                      >
                        <Icon.Trash className='w-4 h-4' />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='px-4 py-3 bg-slate-50 border-t border-slate-200'>
            <div className='flex flex-col sm:flex-row items-center justify-between'>
              <p className='text-sm text-slate-600 mb-2 sm:mb-0'>
                Page {filters.page} sur {totalPages} • {totalContacts} messages
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className='px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Précédent
                </button>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                  className='px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {isDetailModalOpen && selectedContact && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 max-w-md w-full max-h-[85vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-4 border-b border-slate-200'>
              <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                <Icon.Eye className='w-5 h-5 text-blue-500' />
                Détails du message
              </h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className='p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
              >
                <svg
                  className='w-5 h-5 text-slate-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            <div className='p-4 space-y-4'>
              <div>
                <label className='text-sm font-medium text-slate-700 mb-1 flex items-center gap-2'>
                  <Icon.User className='w-4 h-4 text-slate-400' />
                  Expéditeur
                </label>
                <p className='text-slate-800 font-medium'>
                  {selectedContact.firstName} {selectedContact.lastName}
                </p>
                <p className='text-slate-600 text-sm'>
                  {selectedContact.email}
                </p>
              </div>

              <div>
                <label className='text-sm font-medium text-slate-700 mb-1 flex items-center gap-2'>
                  <Icon.Calendar className='w-4 h-4 text-slate-400' />
                  Date d&apos;envoi
                </label>
                <p className='text-slate-800'>
                  {formatDate(selectedContact.createdAt)}
                </p>
              </div>

              <div>
                <label className='text-sm font-medium text-slate-700 mb-1 flex items-center gap-2'>
                  <Icon.Email className='w-4 h-4 text-slate-400' />
                  Message
                </label>
                <div className='bg-slate-50 p-3 rounded-lg'>
                  <p className='text-slate-800 whitespace-pre-wrap text-sm'>
                    {selectedContact.message}
                  </p>
                </div>
              </div>

              {selectedContact.adminResponse && (
                <div>
                  <label className='text-sm font-medium text-green-700 mb-1 flex items-center gap-2'>
                    <Icon.Check className='w-4 h-4 text-green-500' />
                    Votre réponse
                  </label>
                  <div className='bg-green-50 p-3 rounded-lg'>
                    <p className='text-green-800 whitespace-pre-wrap text-sm'>
                      {selectedContact.adminResponse}
                    </p>
                    <p className='text-green-600 text-xs mt-2'>
                      Répondu le {formatDate(selectedContact.respondedAt!)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className='flex gap-3 p-4 border-t border-slate-200'>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className='flex-1 px-4 py-2.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
              >
                Fermer
              </button>
              {!selectedContact.adminResponse && (
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenReply(selectedContact);
                  }}
                  className='flex-1 px-4 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2'
                >
                  <Icon.Reply className='w-4 h-4' />
                  Répondre
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de réponse */}
      {isReplyModalOpen && selectedContact && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 max-w-md w-full'>
            <div className='flex items-center justify-between p-4 border-b border-slate-200'>
              <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                <Icon.Reply className='w-5 h-5 text-green-500' />
                Répondre
              </h2>
              <button
                onClick={() => {
                  setIsReplyModalOpen(false);
                  setReplyMessage('');
                }}
                className='p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
              >
                <svg
                  className='w-5 h-5 text-slate-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            <div className='p-4 space-y-4'>
              <div>
                <p className='text-sm font-medium text-slate-700'>
                  À : {selectedContact.firstName} {selectedContact.lastName}
                </p>
                <p className='text-slate-600 text-xs'>
                  {selectedContact.email}
                </p>
              </div>

              <div>
                <label className='text-sm font-medium text-slate-700 mb-2 flex items-center gap-2'>
                  <Icon.Email className='w-4 h-4 text-slate-400' />
                  Votre réponse
                </label>
                <textarea
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  rows={4}
                  className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 resize-none'
                  placeholder='Tapez votre réponse ici...'
                />
              </div>
            </div>

            <div className='flex gap-3 p-4 border-t border-slate-200'>
              <button
                onClick={() => {
                  setIsReplyModalOpen(false);
                  setReplyMessage('');
                }}
                className='flex-1 px-4 py-2.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
              >
                Annuler
              </button>
              <button
                onClick={handleReply}
                disabled={!replyMessage.trim()}
                className={`flex-1 px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 ${
                  !replyMessage.trim()
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Icon.Reply className='w-4 h-4' />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminMessages;
