export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// Hiérarchie des rôles (pour les permissions)
export const RoleHierarchy = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 5,
};

// Permissions par rôle
const userPermissions = [
  'read:own_profile',
  'update:own_profile',
  'create:rendezvous',
  'read:own_rendezvous',
  'cancel:own_rendezvous',
  'create:contact',
  'read:own_procedures',
] as const;

export const Permissions = {
  [UserRole.USER]: userPermissions,
  [UserRole.ADMIN]: [
    ...userPermissions,
    'create:user',
    'update:user',
    'delete:user',
    'manage:system',
    'read:audit_logs',
    'manage:files',
    'manage:backups',
    'manage:admins',
    'manage:roles',
    'system:config',
    'delete:any',
    'manage:system_logs',
  ],
} as const;

// Couleurs pour les badges UI
export const RoleColors = {
  [UserRole.USER]: 'blue',
  [UserRole.ADMIN]: 'red',
} as const;

// Libellés pour l'affichage
export const RoleLabels = {
  [UserRole.USER]: 'Utilisateur',
  [UserRole.ADMIN]: 'Administrateur',
} as const;
