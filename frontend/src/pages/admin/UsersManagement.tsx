// UsersManagement.tsx - VERSION COMPLÈTE AVEC CONFORMITÉ BACKEND
import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  XCircle,
  X,
  Shield,
  AlertTriangle,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Key,
  Info,
  MoreVertical,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  adminUserService,
  User as UserType,
  UserStats,
  CreateUserDto,
  UpdateUserDto,
} from '../../api/admin/AdminUserService';
import { toast } from 'react-toastify';

interface User extends UserType {}

// 🔧 UTILITAIRES DE FORMATAGE AVEC GESTION D'ERREURS
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Date invalide';
  }
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Date invalide';
  }
};

const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return formatDate(dateString);
    }
  } catch {
    return 'Date invalide';
  }
};

// 🎯 COMPOSANT POPOVER DE CONFIRMATION
interface ConfirmationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationPopover: React.FC<ConfirmationPopoverProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-rose-500 hover:bg-rose-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  const iconColors = {
    danger: 'text-rose-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-xl border border-slate-200/60 max-w-sm w-full animate-in fade-in duration-200'>
        <div className='flex items-center justify-between p-4 border-b border-slate-200'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className={`w-5 h-5 ${iconColors[variant]}`} />
            <h3 className='text-lg font-bold text-slate-800'>{title}</h3>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
          >
            <X className='w-5 h-5 text-slate-500' />
          </button>
        </div>

        <div className='p-4'>
          <p className='text-sm text-slate-600 text-center'>{message}</p>
        </div>

        <div className='flex gap-3 p-4 border-t border-slate-200'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm text-white rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const UsersManagement: React.FC = () => {
  const { user: currentUser, logout } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<CreateUserDto>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    password: '',
    role: 'user',
  });

  const [editUser, setEditUser] = useState<UpdateUserDto>({});
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour la validation
  const [profileErrors, setProfileErrors] = useState<{ [key: string]: string }>(
    {}
  );
  const [profileTouched, setProfileTouched] = useState<{
    [key: string]: boolean;
  }>({});

  // États pour les confirmations
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({
    isOpen: false,
    user: null,
  });
  const [statusConfirmation, setStatusConfirmation] = useState<{
    isOpen: boolean;
    user: User | null;
    newStatus: boolean;
  }>({
    isOpen: false,
    user: null,
    newStatus: false,
  });
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({
    isOpen: false,
    user: null,
  });

  // ✅ CHARGEMENT DES UTILISATEURS AVEC GESTION D'ERREURS SÉCURISÉE
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await adminUserService.getAllUsers();
      setUsers(usersData);
      
      // ✅ LOG SÉCURISÉ SANS DONNÉES SENSIBLES
      console.log(`✅ ${usersData.length} utilisateurs chargés`);
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors du chargement des utilisateurs';
      
      // ✅ MASQUAGE DES DONNÉES SENSIBLES DANS LES MESSAGES D'ERREUR
      const safeErrorMessage = errorMessage
        .replace(/[a-f0-9]{24,}/gi, 'id_****')
        .replace(/(email|password|token)=[^&\s]+/gi, '$1=****');

      if (errorMessage.includes('Session expirée') || errorMessage.includes('401')) {
        toast.error('🔒 Session expirée - Redirection...');
        setTimeout(() => logout(), 2000);
      } else if (errorMessage.includes('Accès refusé') || errorMessage.includes('403')) {
        toast.error('🚫 Accès refusé - Droits administrateur requis');
      } else {
        toast.error(`❌ ${safeErrorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ CHARGEMENT DES STATISTIQUES
  const loadStats = async () => {
    try {
      const statsData = await adminUserService.getUserStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Erreur statistiques:', error.message);
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  // ✅ VALIDATION STRICTE COMME BACKEND
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return phone.trim().length >= 5;
  };

  const validatePassword = (password: string): boolean => {
    return (
      password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    );
  };

  // Validation en temps réel
  const validateProfileField = (name: string, value: string) => {
    let error = '';

    if (name === 'email' && value && !validateEmail(value)) {
      error = "Format d'email invalide";
    }

    if (name === 'telephone' && value && !validatePhone(value)) {
      error = 'Le téléphone doit contenir au moins 5 caractères';
    }

    setProfileErrors(prev => ({
      ...prev,
      [name]: error,
    }));

    return !error;
  };

  // Gestion des changements de profil
  const handleProfileChange = (field: keyof UpdateUserDto, value: string) => {
    const newData = {
      ...editUser,
      [field]: value,
    };

    setEditUser(newData);
    setProfileTouched(prev => ({ ...prev, [field]: true }));
    validateProfileField(field, value);
  };

  // Validation finale
  const validateProfileBeforeSubmit = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (editUser.email && !validateEmail(editUser.email)) {
      errors.email = "Format d'email invalide";
    }

    if (editUser.telephone && !validatePhone(editUser.telephone)) {
      errors.telephone = 'Le téléphone doit contenir au moins 5 caractères';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ CRÉATION AVEC VALIDATION STRICTE
  const handleAddUser = async () => {
    if (!newUser.firstName?.trim() || !newUser.lastName?.trim()) {
      toast.error('❌ Le prénom et le nom sont obligatoires');
      return;
    }

    if (!newUser.email || !validateEmail(newUser.email)) {
      toast.error("❌ Format d'email invalide");
      return;
    }

    if (!newUser.telephone || !validatePhone(newUser.telephone)) {
      toast.error('❌ Le téléphone doit contenir au moins 5 caractères');
      return;
    }

    if (!newUser.password || !validatePassword(newUser.password)) {
      toast.error(
        '❌ Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule et chiffre'
      );
      return;
    }

    try {
      const createdUser = await adminUserService.createUser(newUser);

      setUsers(prev => [...prev, createdUser]);
      await loadStats();

      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        telephone: '',
        password: '',
        role: 'user',
      });

      setIsAddModalOpen(false);
      toast.success('✅ Utilisateur créé avec succès');
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la création';

      if (errorMessage.includes('déjà utilisé')) {
        toast.error('❌ Cet email ou téléphone est déjà utilisé');
      } else if (errorMessage.includes('un seul administrateur')) {
        toast.error("❌ Il ne peut y avoir qu'un seul administrateur");
      } else {
        // ✅ MASQUAGE DES DONNÉES SENSIBLES
        const safeMessage = errorMessage.replace(/[a-f0-9]{24,}/gi, 'id_****');
        toast.error(`❌ ${safeMessage}`);
      }
    }
  };

  // ✅ MODIFICATION STRICTE SELON BACKEND
  const handleEditUser = async () => {
    if (!selectedUser) {
      toast.error('❌ Données manquantes');
      return;
    }

    if (!validateProfileBeforeSubmit()) {
      toast.error('❌ Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    const hasChanges =
      (editUser.email && editUser.email !== selectedUser.email) ||
      (editUser.telephone && editUser.telephone !== selectedUser.telephone);

    if (!hasChanges) {
      toast.error('❌ Aucune modification détectée');
      return;
    }

    try {
      const updateData: UpdateUserDto = {};

      if (editUser.email && editUser.email !== selectedUser.email) {
        updateData.email = editUser.email;
      }

      if (editUser.telephone && editUser.telephone !== selectedUser.telephone) {
        updateData.telephone = editUser.telephone;
      }

      const updatedUser = await adminUserService.updateUser(
        selectedUser._id,
        updateData
      );

      setUsers(prev =>
        prev.map(user =>
          user._id === selectedUser._id ? { ...user, ...updatedUser } : user
        )
      );

      await loadStats();
      setEditUser({});
      setProfileErrors({});
      setProfileTouched({});
      setIsEditModalOpen(false);
      setSelectedUser(null);

      toast.success('✅ Utilisateur modifié avec succès');
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la modification';

      if (errorMessage.includes('déjà utilisé')) {
        toast.error('❌ Cet email ou téléphone est déjà utilisé');
      } else {
        const safeMessage = errorMessage.replace(/[a-f0-9]{24,}/gi, 'id_****');
        toast.error(`❌ ${safeMessage}`);
      }
    }
  };

  // ✅ RÉINITIALISATION STRICTE SELON BACKEND
  const handleAdminResetPassword = async () => {
    if (!selectedUser) {
      toast.error('❌ Données manquantes');
      return;
    }

    if (
      !passwordData.newPassword ||
      !validatePassword(passwordData.newPassword)
    ) {
      toast.error(
        '❌ Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule et chiffre'
      );
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('❌ Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await adminUserService.adminResetPassword(selectedUser._id, {
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });

      setPasswordData({
        newPassword: '',
        confirmNewPassword: '',
      });
      setIsPasswordModalOpen(false);
      setSelectedUser(null);

      toast.success('✅ Mot de passe réinitialisé avec succès');
    } catch (error: any) {
      const safeMessage = error.message?.replace(/[a-f0-9]{24,}/gi, 'id_****') 
        || 'Erreur lors de la réinitialisation';
      toast.error(`❌ ${safeMessage}`);
    }
  };

  // 🎯 GESTIONNAIRES AVEC CONFIRMATION
  const requestDeleteUser = (user: User) => {
    setDeleteConfirmation({ isOpen: true, user });
    setShowMobileMenu(null);
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmation.user) return;

    try {
      await adminUserService.deleteUser(deleteConfirmation.user._id);
      setUsers(prev =>
        prev.filter(user => user._id !== deleteConfirmation.user!._id)
      );
      await loadStats();
      toast.success('✅ Utilisateur supprimé avec succès');
    } catch (error: any) {
      const safeMessage = error.message?.replace(/[a-f0-9]{24,}/gi, 'id_****') 
        || 'Erreur lors de la suppression';
      toast.error(`❌ ${safeMessage}`);
    } finally {
      setDeleteConfirmation({ isOpen: false, user: null });
    }
  };

  const requestToggleStatus = (user: User) => {
    setStatusConfirmation({
      isOpen: true,
      user,
      newStatus: !user.isActive,
    });
    setShowMobileMenu(null);
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmation.user) return;

    try {
      const updatedUser = await adminUserService.toggleUserStatus(
        statusConfirmation.user._id
      );
      setUsers(prev =>
        prev.map(u =>
          u._id === statusConfirmation.user!._id ? { ...u, ...updatedUser } : u
        )
      );
      await loadStats();
      toast.success(
        `✅ Utilisateur ${statusConfirmation.newStatus ? 'activé' : 'désactivé'} avec succès`
      );
    } catch (error: any) {
      const safeMessage = error.message?.replace(/[a-f0-9]{24,}/gi, 'id_****') 
        || 'Erreur lors du changement de statut';
      toast.error(`❌ ${safeMessage}`);
    } finally {
      setStatusConfirmation({ isOpen: false, user: null, newStatus: false });
    }
  };

  const requestPasswordReset = (user: User) => {
    setPasswordConfirmation({ isOpen: true, user });
    setShowMobileMenu(null);
  };

  const confirmPasswordReset = () => {
    if (!passwordConfirmation.user) return;
    setSelectedUser(passwordConfirmation.user);
    setPasswordConfirmation({ isOpen: false, user: null });
    setIsPasswordModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUser({
      email: user.email,
      telephone: user.telephone,
    });
    setProfileErrors({});
    setProfileTouched({});
    setIsEditModalOpen(true);
    setShowMobileMenu(null);
  };

  // Réinitialiser le formulaire d'édition
  const resetEditForm = () => {
    if (selectedUser) {
      setEditUser({
        email: selectedUser.email,
        telephone: selectedUser.telephone,
      });
    }
    setProfileErrors({});
    setProfileTouched({});
  };

  // Vérifier les modifications
  const hasEditChanges = () => {
    if (!selectedUser) return false;
    return (
      (editUser.email && editUser.email !== selectedUser.email) ||
      (editUser.telephone && editUser.telephone !== selectedUser.telephone)
    );
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.telephone.includes(searchTerm)
    );
  });

  // Icônes et couleurs pour les statuts
  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <UserCheck className='w-3 h-3 text-emerald-500' />
    ) : (
      <UserX className='w-3 h-3 text-rose-500' />
    );
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Actif' : 'Inactif';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? (
      <ShieldCheck className='w-3 h-3 text-blue-500' />
    ) : (
      <User className='w-3 h-3 text-gray-500' />
    );
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? 'Administrateur' : 'Utilisateur';
  };

  const getRoleColor = (role: string) => {
    return role === 'admin'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // 🎯 COMPOSANT CARTE DÉTAILS UTILISATEUR
  const UserDetailsCard: React.FC<{ user: User }> = ({ user }) => (
    <div className='bg-slate-50 rounded-lg p-3 mt-2 border border-slate-200'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-slate-600'>
            <Calendar className='w-3 h-3 text-slate-400' />
            <span>
              Créé le: <strong>{formatDateTime(user.createdAt)}</strong>
            </span>
          </div>
          <div className='flex items-center gap-2 text-slate-600'>
            <Clock className='w-3 h-3 text-slate-400' />
            <span>
              Modifié: <strong>{formatRelativeTime(user.updatedAt)}</strong>
            </span>
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-slate-600'>
            ID:{' '}
            <code className='text-xs bg-slate-200 px-1 rounded'>
              {user._id.substring(0, 8)}...
            </code>
          </div>
          {user.logoutUntil && (
            <div className='flex items-center gap-2 text-amber-600'>
              <AlertTriangle className='w-3 h-3' />
              <span>
                Déconnecté jusqu'au:{' '}
                <strong>{formatDateTime(user.logoutUntil)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 max-w-[1024px] mx-auto overflow-x-hidden'>
      {/* Header */}
      <div className='mb-4 px-4'>
        <div className='flex items-center gap-2 mb-1'>
          <div className='p-2 bg-blue-500 rounded-lg'>
            <Users className='w-5 h-5 text-white' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-slate-800'>
              Gestion des Utilisateurs
            </h1>
            <p className='text-slate-600 text-sm'>
              Administrez les comptes utilisateurs
            </p>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques compactes */}
      {stats && (
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4 px-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-blue-500 rounded-lg'>
                <Users className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Total</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-emerald-500 rounded-lg'>
                <UserCheck className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Actifs</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.activeUsers}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-rose-500 rounded-lg'>
                <UserX className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Inactifs</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.inactiveUsers}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-purple-500 rounded-lg'>
                <ShieldCheck className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Admins</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.adminUsers}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200/60 p-3 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-2 bg-slate-500 rounded-lg'>
                <User className='w-4 h-4 text-white' />
              </div>
              <div className='ml-2'>
                <p className='text-xs text-slate-600'>Utilisateurs</p>
                <p className='text-lg font-bold text-slate-800'>
                  {stats.regularUsers}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche et actions */}
      <div className='bg-white rounded-xl border border-slate-200/60 p-3 mb-4 shadow-sm mx-4'>
        <div className='flex flex-col space-y-3'>
          {/* Recherche avec icône */}
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Search className='w-4 h-4 text-slate-400' />
            </div>
            <input
              type='text'
              placeholder='Rechercher un utilisateur...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
            />
          </div>

          {/* Actions */}
          <div className='flex gap-2'>
            <button
              onClick={() => {
                loadUsers();
                loadStats();
                toast.info('🔄 Actualisation...');
              }}
              className='flex-1 px-3 py-2.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2'
            >
              <RefreshCw className='w-4 h-4' />
              <span className='text-sm'>Actualiser</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className='flex-1 px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2'
            >
              <Plus className='w-4 h-4' />
              <span className='text-sm'>Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className='bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm mx-4'>
        {/* En-tête */}
        <div className='px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <User className='w-4 h-4' />
              <h2 className='text-base font-semibold'>
                Liste des Utilisateurs
              </h2>
              <span className='bg-blue-400 text-blue-100 px-2 py-0.5 rounded-full text-xs'>
                {filteredUsers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Version mobile/tablette - Cartes améliorées */}
        <div className='lg:hidden'>
          {isLoading ? (
            <div className='p-4 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto'></div>
              <p className='text-slate-600 mt-2 text-sm'>
                Chargement sécurisé...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className='p-6 text-center text-slate-500'>
              <User className='w-12 h-12 mx-auto mb-2 text-slate-400' />
              <p className='text-slate-500'>Aucun utilisateur trouvé</p>
              {searchTerm && (
                <p className='text-slate-400 text-sm mt-1'>
                  Aucun résultat pour "{searchTerm}"
                </p>
              )}
            </div>
          ) : (
            <div className='divide-y divide-slate-200'>
              {filteredUsers.map(user => (
                <div
                  key={user._id}
                  className='p-4 hover:bg-slate-50 transition-colors'
                >
                  <div className='flex justify-between items-start mb-3'>
                    <div className='flex items-center flex-1 min-w-0'>
                      <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0'>
                        <User className='w-6 h-6 text-white' />
                      </div>
                      <div className='ml-3 flex-1 min-w-0'>
                        <h3 className='font-semibold text-slate-800 truncate'>
                          {user.firstName} {user.lastName}
                        </h3>
                        <div className='flex items-center gap-1 mt-1'>
                          <Mail className='w-3 h-3 text-slate-400 flex-shrink-0' />
                          <p className='text-xs text-slate-600 truncate'>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='relative flex-shrink-0'>
                      <button
                        onClick={() =>
                          setShowMobileMenu(
                            showMobileMenu === user._id ? null : user._id
                          )
                        }
                        className='p-2 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                      >
                        <MoreVertical className='w-4 h-4 text-slate-500' />
                      </button>

                      {showMobileMenu === user._id && (
                        <div className='absolute right-0 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[180px]'>
                          <button
                            onClick={() => openEditModal(user)}
                            className='w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-200 focus:outline-none focus:ring-none'
                          >
                            <Edit className='w-4 h-4' />
                            Modifier
                          </button>
                          <button
                            onClick={() => requestPasswordReset(user)}
                            className='w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 border-b border-slate-200 focus:outline-none focus:ring-none'
                          >
                            <Key className='w-4 h-4' />
                            Réinit. MDP
                          </button>
                          <button
                            onClick={() => requestToggleStatus(user)}
                            disabled={user._id === currentUser?._id}
                            className='w-full px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2 border-b border-slate-200 disabled:opacity-50 focus:outline-none focus:ring-none'
                          >
                            {user.isActive ? (
                              <EyeOff className='w-4 h-4' />
                            ) : (
                              <Eye className='w-4 h-4' />
                            )}
                            {user.isActive ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => requestDeleteUser(user)}
                            disabled={user._id === currentUser?._id}
                            className='w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-none'
                          >
                            <Trash2 className='w-4 h-4' />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2 mb-3'>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className='ml-1.5'>{getRoleText(user.role)}</span>
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(user.isActive)}`}
                    >
                      {getStatusIcon(user.isActive)}
                      <span className='ml-1.5'>
                        {getStatusText(user.isActive)}
                      </span>
                    </span>
                  </div>

                  <div className='flex items-center gap-2 text-sm text-slate-600 mb-2'>
                    <Phone className='w-4 h-4 text-slate-400 flex-shrink-0' />
                    <span className='truncate'>{user.telephone}</span>
                  </div>

                  {/* 🆕 AFFICHAGE DES DATES FORMATÉES */}
                  <UserDetailsCard user={user} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Version desktop - Tableau */}
        <div className='hidden lg:block overflow-x-auto'>
          <table className='w-full min-w-[800px]'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Utilisateur
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Contact
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Rôle & Statut
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Dates
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-slate-200'>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center'>
                    <div className='flex justify-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500'></div>
                    </div>
                    <p className='text-slate-600 mt-2 text-sm'>
                      Chargement sécurisé...
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center'>
                    <User className='w-16 h-16 mx-auto mb-4 text-slate-400' />
                    <p className='text-slate-500'>Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr
                    key={user._id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    <td className='px-4 py-4'>
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center'>
                          <User className='w-5 h-5 text-white' />
                        </div>
                        <div className='ml-3'>
                          <p className='text-sm font-medium text-slate-800'>
                            {user.firstName} {user.lastName}
                          </p>
                          <p className='text-xs text-slate-500'>
                            ID: {user._id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className='px-4 py-4'>
                      <div className='space-y-1'>
                        <div className='flex items-center gap-2 text-sm text-slate-700'>
                          <Mail className='w-4 h-4 text-slate-400' />
                          <span>{user.email}</span>
                        </div>
                        <div className='flex items-center gap-2 text-sm text-slate-700'>
                          <Phone className='w-4 h-4 text-slate-400' />
                          <span>{user.telephone}</span>
                        </div>
                      </div>
                    </td>

                    <td className='px-4 py-4'>
                      <div className='space-y-2'>
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}
                        >
                          {getRoleIcon(user.role)}
                          <span className='ml-1.5'>
                            {getRoleText(user.role)}
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(user.isActive)}`}
                        >
                          {getStatusIcon(user.isActive)}
                          <span className='ml-1.5'>
                            {getStatusText(user.isActive)}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* 🆕 COLONNE DATES */}
                    <td className='px-4 py-4'>
                      <div className='space-y-1 text-xs text-slate-600'>
                        <div className='flex items-center gap-1'>
                          <Calendar className='w-3 h-3 text-slate-400' />
                          <span>Créé: {formatDate(user.createdAt)}</span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <Clock className='w-3 h-3 text-slate-400' />
                          <span>
                            Modifié: {formatRelativeTime(user.updatedAt)}
                          </span>
                        </div>
                        {user.logoutUntil && (
                          <div className='flex items-center gap-1 text-amber-600'>
                            <AlertTriangle className='w-3 h-3' />
                            <span>Déco: {formatDate(user.logoutUntil)}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className='px-4 py-4'>
                      <div className='flex items-center gap-1'>
                        <button
                          onClick={() => openEditModal(user)}
                          className='p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                          title="Modifier l'utilisateur"
                        >
                          <Edit className='w-4 h-4' />
                        </button>

                        <button
                          onClick={() => requestPasswordReset(user)}
                          className='p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
                          title='Réinitialiser le mot de passe'
                        >
                          <Key className='w-4 h-4' />
                        </button>

                        <button
                          onClick={() => requestToggleStatus(user)}
                          disabled={user._id === currentUser?._id}
                          className={`p-2 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 ${
                            user._id === currentUser?._id
                              ? 'text-slate-400 cursor-not-allowed'
                              : user.isActive
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={
                            user._id === currentUser?._id
                              ? 'Impossible de modifier votre statut'
                              : user.isActive
                                ? 'Désactiver'
                                : 'Activer'
                          }
                        >
                          {user.isActive ? (
                            <EyeOff className='w-4 h-4' />
                          ) : (
                            <Eye className='w-4 h-4' />
                          )}
                        </button>

                        <button
                          onClick={() => requestDeleteUser(user)}
                          disabled={user._id === currentUser?._id}
                          className={`p-2 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 ${
                            user._id === currentUser?._id
                              ? 'text-slate-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          }`}
                          title={
                            user._id === currentUser?._id
                              ? 'Impossible de supprimer votre compte'
                              : 'Supprimer'
                          }
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎯 POPOVERS DE CONFIRMATION */}
      <ConfirmationPopover
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, user: null })}
        onConfirm={confirmDeleteUser}
        title='Confirmer la suppression'
        message={`Supprimer définitivement ${deleteConfirmation.user?.firstName} ${deleteConfirmation.user?.lastName} ? Cette action est irréversible.`}
        confirmText='Supprimer'
        variant='danger'
      />

      <ConfirmationPopover
        isOpen={statusConfirmation.isOpen}
        onClose={() =>
          setStatusConfirmation({ isOpen: false, user: null, newStatus: false })
        }
        onConfirm={confirmToggleStatus}
        title='Changer le statut'
        message={`${statusConfirmation.newStatus ? 'Activer' : 'Désactiver'} l'utilisateur ${statusConfirmation.user?.firstName} ${statusConfirmation.user?.lastName} ?`}
        confirmText={statusConfirmation.newStatus ? 'Activer' : 'Désactiver'}
        variant='warning'
      />

      <ConfirmationPopover
        isOpen={passwordConfirmation.isOpen}
        onClose={() => setPasswordConfirmation({ isOpen: false, user: null })}
        onConfirm={confirmPasswordReset}
        title='Réinitialiser le mot de passe'
        message={`Réinitialiser le mot de passe de ${passwordConfirmation.user?.firstName} ${passwordConfirmation.user?.lastName} ? L'utilisateur devra utiliser le nouveau mot de passe à sa prochaine connexion.`}
        confirmText='Continuer'
        variant='info'
      />

      {/* Modal d'ajout d'utilisateur */}
      {isAddModalOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 max-w-md w-full max-h-[85vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white'>
              <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                <User className='w-5 h-5 text-blue-500' />
                Nouvel Utilisateur
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className='p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
              >
                <X className='w-5 h-5 text-slate-500' />
              </button>
            </div>

            <div className='p-4 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                    <User className='w-4 h-4 text-slate-400' />
                    Prénom *
                  </label>
                  <input
                    type='text'
                    value={newUser.firstName}
                    onChange={e =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                    placeholder='Jean'
                    className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                    <User className='w-4 h-4 text-slate-400' />
                    Nom *
                  </label>
                  <input
                    type='text'
                    value={newUser.lastName}
                    onChange={e =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                    placeholder='Dupont'
                    className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Mail className='w-4 h-4 text-slate-400' />
                  Email *
                </label>
                <input
                  type='email'
                  value={newUser.email}
                  onChange={e =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder='jean.dupont@example.com'
                  className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Phone className='w-4 h-4 text-slate-400' />
                  Téléphone *
                </label>
                <input
                  type='tel'
                  value={newUser.telephone}
                  onChange={e =>
                    setNewUser({ ...newUser, telephone: e.target.value })
                  }
                  placeholder='+33 1 23 45 67 89'
                  className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Key className='w-4 h-4 text-slate-400' />
                  Mot de passe *
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={e =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder='Minimum 8 caractères'
                    className='w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-none'
                  >
                    {showPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
                <p className='text-xs text-slate-500'>
                  Doit contenir au moins 8 caractères avec majuscule, minuscule
                  et chiffre
                </p>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Shield className='w-4 h-4 text-slate-400' />
                  Rôle
                </label>
                <select
                  value={newUser.role}
                  onChange={e =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as 'admin' | 'user',
                    })
                  }
                  className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                >
                  <option value='user'>Utilisateur</option>
                  <option value='admin'>Administrateur</option>
                </select>
              </div>
            </div>

            <div className='flex gap-3 p-4 border-t border-slate-200 sticky bottom-0 bg-white'>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className='flex-1 px-4 py-2.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
              >
                Annuler
              </button>
              <button
                onClick={handleAddUser}
                className='flex-1 px-4 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2'
              >
                <User className='w-4 h-4' />
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification d'utilisateur */}
      {isEditModalOpen && selectedUser && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 max-w-md w-full max-h-[85vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white'>
              <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                <Edit className='w-5 h-5 text-blue-500' />
                Modifier l'utilisateur
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className='p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
              >
                <X className='w-5 h-5 text-slate-500' />
              </button>
            </div>

            <div className='p-4 space-y-4'>
              {/* Informations utilisateur */}
              <div className='bg-slate-50 rounded-lg p-3'>
                <p className='text-sm font-medium text-slate-700'>
                  Modification de:{' '}
                  <span className='font-semibold'>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </span>
                </p>
                <p className='text-xs text-slate-500 mt-1'>
                  ID: {selectedUser._id.substring(0, 8)}...
                </p>
              </div>

              {/* Champs non modifiables */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                    <User className='w-4 h-4 text-slate-400' />
                    Prénom
                  </label>
                  <input
                    type='text'
                    value={selectedUser.firstName}
                    disabled
                    className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed'
                  />
                  <p className='text-xs text-slate-500'>Non modifiable</p>
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                    <User className='w-4 h-4 text-slate-400' />
                    Nom
                  </label>
                  <input
                    type='text'
                    value={selectedUser.lastName}
                    disabled
                    className='w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed'
                  />
                  <p className='text-xs text-slate-500'>Non modifiable</p>
                </div>
              </div>

              {/* Email modifiable */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Mail className='w-4 h-4 text-slate-400' />
                  Email
                </label>
                <input
                  type='email'
                  value={editUser.email || ''}
                  onChange={e => handleProfileChange('email', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 ${
                    profileErrors.email ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder='nouvel@email.com'
                />
                {profileTouched.email && profileErrors.email && (
                  <p className='text-xs text-red-600 flex items-center gap-2'>
                    <XCircle className='w-3 h-3' />
                    {profileErrors.email}
                  </p>
                )}
                <p className='text-xs text-slate-500'>
                  Actuel: {selectedUser.email}
                </p>
              </div>

              {/* Téléphone modifiable */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Phone className='w-4 h-4 text-slate-400' />
                  Téléphone
                </label>
                <input
                  type='tel'
                  value={editUser.telephone || ''}
                  onChange={e =>
                    handleProfileChange('telephone', e.target.value)
                  }
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 ${
                    profileErrors.telephone
                      ? 'border-red-300'
                      : 'border-slate-300'
                  }`}
                  placeholder='+33 1 23 45 67 89'
                />
                {profileTouched.telephone && profileErrors.telephone && (
                  <p className='text-xs text-red-600 flex items-center gap-2'>
                    <XCircle className='w-3 h-3' />
                    {profileErrors.telephone}
                  </p>
                )}
                <p className='text-xs text-slate-500'>
                  Actuel: {selectedUser.telephone}
                </p>
              </div>

              {/* Information */}
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
                <div className='flex items-start'>
                  <Info className='w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0' />
                  <div>
                    <p className='text-xs text-blue-800 font-medium'>
                      Informations
                    </p>
                    <p className='text-xs text-blue-600 mt-0.5'>
                      Seuls l'email et le téléphone peuvent être modifiés.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex gap-3 p-4 border-t border-slate-200 sticky bottom-0 bg-white'>
              <button
                onClick={resetEditForm}
                disabled={!hasEditChanges()}
                className='flex-1 px-4 py-2.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Annuler
              </button>
              <button
                onClick={handleEditUser}
                disabled={
                  !hasEditChanges() ||
                  Object.keys(profileErrors).some(key => profileErrors[key])
                }
                className={`flex-1 px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 ${
                  !hasEditChanges() ||
                  Object.keys(profileErrors).some(key => profileErrors[key])
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Edit className='w-4 h-4' />
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réinitialisation du mot de passe */}
      {isPasswordModalOpen && selectedUser && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl border border-slate-200/60 max-w-md w-full'>
            <div className='flex items-center justify-between p-4 border-b border-slate-200'>
              <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                <Key className='w-5 h-5 text-green-500' />
                Réinitialiser le mot de passe
              </h2>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className='p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200'
              >
                <X className='w-5 h-5 text-slate-500' />
              </button>
            </div>

            <div className='p-4 space-y-4'>
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3'>
                <div className='flex items-start'>
                  <AlertTriangle className='w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0' />
                  <div>
                    <p className='text-sm font-medium text-amber-800'>
                      Réinitialisation
                    </p>
                    <p className='text-xs text-amber-700 mt-1'>
                      Modification du mot de passe de{' '}
                      <strong>
                        {selectedUser.firstName} {selectedUser.lastName}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Key className='w-4 h-4 text-slate-400' />
                  Nouveau mot de passe *
                </label>
                <div className='relative'>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={e =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder='Minimum 8 caractères'
                    className='w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                  />
                  <button
                    type='button'
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-none'
                  >
                    {showNewPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
                <p className='text-xs text-slate-500'>
                  Doit contenir au moins 8 caractères avec majuscule, minuscule
                  et chiffre
                </p>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 flex items-center gap-2'>
                  <Key className='w-4 h-4 text-slate-400' />
                  Confirmer le mot de passe *
                </label>
                <div className='relative'>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmNewPassword}
                    onChange={e =>
                      setPasswordData({
                        ...passwordData,
                        confirmNewPassword: e.target.value,
                      })
                    }
                    placeholder='Confirmer le mot de passe'
                    className='w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-none'
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className='flex gap-3 p-4 border-t border-slate-200'>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className='flex-1 px-4 py-2.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-all duration-200'
              >
                Annuler
              </button>
              <button
                onClick={handleAdminResetPassword}
                disabled={
                  !passwordData.newPassword ||
                  !passwordData.confirmNewPassword ||
                  passwordData.newPassword !==
                    passwordData.confirmNewPassword ||
                  !validatePassword(passwordData.newPassword)
                }
                className={`flex-1 px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 ${
                  !passwordData.newPassword ||
                  !passwordData.confirmNewPassword ||
                  passwordData.newPassword !==
                    passwordData.confirmNewPassword ||
                  !validatePassword(passwordData.newPassword)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Key className='w-4 h-4' />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;