# Backend - Paname Consulting API

API REST NestJS pour la gestion des consultations et procédures d'études à l'international.

## 🚀 Démarrage rapide

```bash
cd backend
npm install
npm run start:dev
```

**L'API est accessible sur** : `http://localhost:10000`
**Documentation Swagger** : `http://localhost:10000/api`

---

## 📋 Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Services](#services)
- [Système de Rendez-vous](#système-de-rendez-vous)
- [Logs](#logs)
- [Déploiement](#déploiement)

---

## Installation

### Dépendances

```bash
npm install
```

### Structure du projet

```
src/
├── auth/              # Authentification (JWT, Register, Login)
├── users/             # Gestion des utilisateurs
├── contact/           # Formulaires de contact
├── procedures/        # Procédures administratives
├── rendezvous/        # Gestion rendez-vous
├── config/            # Configuration globale
│   ├── smtp.service.ts       # Service email (SMTP Gmail)
│   ├── logger.service.ts     # Service logging
│   └── database.module.ts    # Configuration MongoDB
├── shared/            # Code partagé
│   ├── guards/        # JWT, Roles guards
│   ├── decorators/    # @Roles, @Auth
│   ├── interfaces/    # Types TypeScript
│   └── enums/         # Énums (UserRole, etc)
└── main.ts            # Point d'entrée NestJS
```

---

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet backend :

```env
# Application
NODE_ENV=development
APP_NAME=panameconsulting
PORT=10000

# Database
MONGODB_URI=mongodb://localhost:27017/panameconsultingDb

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=3600s
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRATION=7d
JWT_ISSUER=PanameConsulting-API

# SMTP Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_FILE_NAME=app.log
LOG_RETENTION_DAYS=3

# Security
BCRYPT_SALT_ROUNDS=12
ENCRYPTION_KEY=your_encryption_key

# Session
SESSION_TIMEOUT=3600
MAX_SESSIONS=2
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPTS_TTL=900000

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://panameconsulting.vercel.app
FRONTEND_URL=https://panameconsulting.vercel.app

# Maintenance
MAINTENANCE_MODE=false
```

### Configuration MongoDB

L'application supporte :
- ✅ MongoDB local
- ✅ MongoDB Atlas (cloud)
- ✅ Docker Compose

```bash
# Avec Docker Compose
docker compose up -d mongodb
```

---

## Architecture

### Modules principaux

#### Auth Module
- Authentification JWT
- Enregistrement et connexion
- Gestion des tokens

#### Users Module
- CRUD utilisateurs
- Gestion des rôles (USER/ADMIN)
- Tableau de bord admin

#### Contact Module
- Formulaires de contact
- Notifications email
- Historique messages

#### Procedures Module
- Gestion des procédures
- Suivi des statuts
- API admin et user

#### Rendezvous Module
- Réservation rendez-vous
- Gestion des créneaux
- Calendrier

### Patterns utilisés

- **Dependency Injection** : NestJS IoC container
- **Guards** : JWT auth, Roles-based access
- **Decorators** : @Roles, @UseGuards
- **Services** : Logique métier
- **DTOs** : Validation des inputs
- **Schemas** : Mongoose models

---

## API Endpoints

### Authentication (Public)

```
POST   /api/auth/register       # Créer compte
POST   /api/auth/login          # Connexion
POST   /api/auth/refresh        # Renouveler token
POST   /api/auth/logout         # Déconnexion
POST   /api/auth/logout-all     # Déconnecter tous les appareils
GET    /api/auth/me             # Profil connecté
```

### Users (Admin only)

```
GET    /api/users               # Liste utilisateurs
POST   /api/users               # Créer utilisateur
GET    /api/users/stats         # Statistiques
DELETE /api/users/:id           # Supprimer utilisateur
PATCH  /api/users/:id           # Modifier utilisateur
PATCH  /api/users/:id/toggle-status    # Activer/Désactiver
```

### Profile (Authenticated)

```
GET    /api/users/profile/me    # Mon profil
PATCH  /api/users/profile/me    # Modifier mon profil
POST   /api/auth/update-password       # Changer mot de passe
```

### Contact (Public/Admin)

```
POST   /api/contact             # Soumettre formulaire
GET    /api/contact             # Liste (admin only)
GET    /api/contact/:id         # Détails message
PATCH  /api/contact/:id/read    # Marquer comme lu
POST   /api/contact/:id/reply   # Répondre
DELETE /api/contact/:id         # Supprimer
GET    /api/contact/stats       # Statistiques (admin)
```

### Procedures

```
GET    /api/procedures/user     # Mes procédures
GET    /api/procedures/:id      # Détails
PUT    /api/procedures/:id/cancel    # Annuler

# Admin only
POST   /api/procedures/admin/create        # Créer
GET    /api/procedures/admin/all           # Liste
PUT    /api/procedures/admin/:id           # Modifier
DELETE /api/procedures/admin/:id           # Supprimer
GET    /api/procedures/admin/stats         # Stats
```

### Rendezvous

```
POST   /api/rendezvous          # Réserver
GET    /api/rendezvous/user     # Mes rendez-vous
GET    /api/rendezvous/:id      # Détails
PUT    /api/rendezvous/:id      # Modifier
PUT    /api/rendezvous/:id/status          # Changer statut
DELETE /api/rendezvous/:id      # Supprimer

# Admin only
GET    /api/rendezvous          # Tous RDV
GET    /api/rendezvous/available-slots    # Créneaux
GET    /api/rendezvous/available-dates    # Dates
GET    /api/rendezvous/stats/overview     # Statistiques
```

### Admin (Admin only)

```
GET    /api/users/maintenance-mode/status      # Statut
PATCH  /api/users/maintenance-mode/toggle      # Basculer mode
GET    /api/dashboard/stats                    # Dashboard stats
```

---

## Services

### SmtpService

Service d'envoi d'emails via Gmail SMTP.

**Features:**
- ✅ Support SMTP Gmail
- ✅ Masquage des données sensibles dans les logs
- ✅ Gestion automatique des erreurs
- ✅ Test de connexion
- ✅ Méthodes helpers

**Utilisation:**

```typescript
// Envoyer un email simple
await this.smtpService.sendSimpleEmail(
  'user@example.com',
  'Sujet',
  '<p>Contenu HTML</p>'
);

// Envoyer email personnalisé
await this.smtpService.sendEmail({
  to: 'user@example.com',
  subject: 'Sujet',
  html: '<p>HTML</p>',
  text: 'Texte brut',
  replyTo: 'reply@example.com',
  priority: 'high'
});

// Tester la connexion
const result = await this.smtpService.testConnection();
```

### LoggerService

Service logging centralisé avec rotation de fichiers.

**Features:**
- ✅ Fichiers datés (YYYY-MM-DD-app.log)
- ✅ Rétention automatique (3j par défaut)
- ✅ Couleurs console
- ✅ Logs sans couleurs en fichier
- ✅ 3 lignes vides entre chaque log

**Utilisation:**

```typescript
this.loggerService.log('Message', 'Context');
this.loggerService.error('Erreur', 'Context', stack);
this.loggerService.warn('Attention', 'Context');
this.loggerService.debug('Debug', 'Context');
```

---

## Logs

### Localisation

```
backend/
└── logs/
    ├── 2026-01-18-app.log
    ├── 2026-01-19-app.log
    └── ...
```

### Configuration

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `LOG_DIR` | `./logs` | Dossier des logs |
| `LOG_FILE_NAME` | `app.log` | Nom du fichier |
| `LOG_RETENTION_DAYS` | `3` | Rétention en jours |
| `LOG_LEVEL` | `info` | Niveau minimum |

### Format

```
[2026-01-18T14:25:30.504Z] [INFO] [SmtpService] Service SMTP initialisé
```

---

## Docker

### Build et exécution

```bash
# Build image
docker build -t panameconsulting-backend .

# Exécuter
docker run -p 10000:10000 \
  --env-file .env \
  panameconsulting-backend

# Avec Docker Compose
docker compose up --build
```

### Dockerfile

Multi-stage build :
- Stage 1 : Build
- Stage 2 : Production (sans devDependencies)

---

## Déploiement

### Checklist pré-production

- [ ] Variables d'environnement configurées
- [ ] MongoDB Atlas en ligne
- [ ] Emails SMTP testés
- [ ] JWT secrets uniques
- [ ] Logs configurés
- [ ] CORS configuré
- [ ] Tests passent
- [ ] Build réussi

### Commandes

```bash
# Build production
npm run build

# Démarrer production
npm run start:prod

# Avec Docker
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

| Problème | Solution |
|----------|----------|
| Port 10000 en utilisation | Changer `PORT` dans `.env` |
| MongoDB timeout | Vérifier `MONGODB_URI` |
| Emails ne s'envoient pas | Vérifier `EMAIL_USER`, `EMAIL_PASS` |
| CORS error | Ajouter origin dans `ALLOWED_ORIGINS` |
| Logs ne s'écrivent pas | Vérifier dossier `logs/` existe |
| URL reset-password invalide | Le token est maintenant automatiquement nettoyé des URLs complètes |

---

## Support & Documentation

- 📚 [Documentation NestJS](https://docs.nestjs.com)
- 🗄️ [Documentation Mongoose](https://mongoosejs.com)
- 📧 [Documentation Nodemailer](https://nodemailer.com)
- 🔐 [Documentation JWT](https://jwt.io)

---

**Version** : 1.0.0
**Dernière mise à jour** : 18 Janvier 2026
