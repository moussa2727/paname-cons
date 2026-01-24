# Paname Consulting

🌍 Plateforme de consultation et d'accompagnement pour les études à l'international.

## 📋 Table des matières

- [À propos](#à-propos)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Documentation](#documentation)
- [Pages Légales](#pages-légales)
- [Support](#support)

---

## À propos

Paname Consulting est une plateforme complète permettant aux utilisateurs de :
- 📅 Prendre rendez-vous avec des conseillers
- 📋 Gérer leurs procédures administratives
- 💬 Contacter l'équipe via des formulaires de contact
- 👤 Gérer leur profil et préférences
- 🌍 Accéder à des services d'orientation académique internationale
- 📄 Consulter les documents légaux et politiques

### Caractéristiques principales

- ✅ Authentification JWT sécurisée
- ✅ Tableaux de bord administrateur avancés
- ✅ Système d'email SMTP intégré
- ✅ Logs centralisés et sécurisés
- ✅ Mode maintenance configurable
- ✅ API REST documentée
- ✅ Interface responsive (mobile-first)
- ✅ Pages légales conformes (RGPD)
- ✅ SEO optimisé avec meta tags
- ✅ Système de routage avancé

---

## Architecture

### Structure du projet

```
panameconsulting/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── auth/           # Authentification
│   │   ├── users/          # Gestion des utilisateurs
│   │   ├── contact/        # Formulaires de contact
│   │   ├── procedures/     # Procédures
│   │   ├── rendezvous/     # Rendez-vous
│   │   ├── destination/    # Destinations d'études
│   │   ├── config/         # Configuration (SMTP, Logger)
│   │   └── shared/         # Utilitaires partagés
│   ├── .env                # Variables d'environnement
│   ├── docker-compose.yml  # Configuration Docker
│   └── Dockerfile          # Image Docker
│
├── frontend/                # Application React/TypeScript
│   ├── src/
│   │   ├── pages/          # Pages principales
│   │   │   ├── admin/      # Dashboard admin
│   │   │   ├── user/       # Pages utilisateur
│   │   │   ├── politiques/ # Pages légales
│   │   │   └── ...         # Autres pages publiques
│   │   ├── components/     # Composants réutilisables
│   │   ├── context/        # Context API (Auth)
│   │   ├── api/            # Appels API
│   │   └── assets/         # Images/ressources
│   ├── .env                # Variables d'environnement
│   └── vite.config.ts      # Configuration Vite
│
└── README.md               # Ce fichier
```

### Stack technique

**Backend:**
- NestJS 10+
- MongoDB avec Mongoose
- Nodemailer (SMTP)
- JWT (Authentification)
- Bcrypt (Hachage mots de passe)
- Logs centralisés

**Frontend:**
- React 19+ avec TypeScript
- Tailwind CSS 4.1.18
- Vite 7.3.0
- Axios 1.13.2
- React Router DOM 7.11.0
- React Helmet Async (SEO)
- Framer Motion (Animations)
- AOS (Animations on scroll)
- Context API (Gestion d'état)

**DevOps:**
- Docker & Docker Compose
- Git/GitHub
- Vercel (Déploiement)

---

## Pages Légales

L'application inclut des pages légales complètes et conformes :

### 📄 Pages disponibles

1. **Politique de Confidentialité** (`/politique-de-confidentialite`)
   - Protection des données personnelles
   - Conformité RGPD
   - Droits des utilisateurs
   - Gestion des cookies

2. **Conditions Générales d'Utilisation** (`/conditions-generales`)
   - CGU complètes
   - Obligations des parties
   - Services proposés
   - Gestion des litiges

3. **Mentions Légales** (`/mentions-legales`)
   - Informations éditeur
   - Hébergeur (Vercel)
   - Propriété intellectuelle
   - Contact légal

### 🎨 Caractéristiques

- **Design cohérent** : Thème sky-50/sky-100 identique au reste du site
- **Sans Header/Footer** : Layout minimal pour lecture optimale
- **SEO optimisé** : Meta tags `noindex, nofollow` appropriés
- **Responsive** : Adapté mobile/desktop
- **Accessibilité** : Structure sémantique HTML5

### 📝 Contenu

Les pages incluent :
- Informations légales complètes
- Coordonnées de l'entreprise
- Politiques de protection des données
- Conditions d'utilisation des services
- Mentions obligatoires (hébergeur, éditeur)

---

## Prérequis

### Système

- **Node.js** : v22.13.1 ou supérieur
- **Docker** : Latest version (optionnel mais recommandé)
- **MongoDB** : v5.0+ (local ou cloud)
- **Git**

### Variables d'environnement

#### Backend (.env)
```env
NODE_ENV=development
PORT=10000
MONGODB_URI=mongodb://localhost:27017/panameconsultingDb
RESEND_API_KEY=your_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
JWT_SECRET=your_jwt_secret
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:10000
VITE_APP_NAME=Paname-Consulting
```

---

## Installation

### Option 1 : Avec Docker (Recommandé)

```bash
# Clone le repository
git clone https://github.com/yourusername/panameconsulting.git
cd panameconsulting

# Démarrer les services
docker compose up --build
```

### Option 2 : Installation locale

#### Backend

```bash
cd backend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run start:dev

# Démarrer en production
npm run build
npm run start:prod
```

#### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build pour production
npm run build
```

---

## Configuration

### Backend - Variables essentielles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NODE_ENV` | Environnement | `development`, `production` |
| `PORT` | Port du serveur | `10000` |
| `MONGODB_URI` | URI MongoDB | `mongodb://localhost:27017/db` |
| `JWT_SECRET` | Secret JWT | `random_secret_key` |
| `EMAIL_USER` | Email SMTP | `your_email@gmail.com` |
| `LOG_DIR` | Dossier logs | `./logs` |
| `LOG_RETENTION_DAYS` | Rétention logs | `3` |

### Frontend - Variables essentielles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL API backend | `http://localhost:10000` |
| `VITE_APP_NAME` | Nom app | `Paname-Consulting` |

---

## Démarrage

### Avec Docker Compose

```bash
# Démarrer en arrière-plan
docker compose up -d

# Consulter les logs
docker compose logs -f ts-app

# Arrêter les services
docker compose down
```

### En local (développement)

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
# Serveur disponible sur http://localhost:10000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App disponible sur http://localhost:5173
```

### Accès aux services

- **API Backend** : http://localhost:10000
- **Frontend** : http://localhost:5173
- **Admin Dashboard** : http://localhost:5173/gestionnaire/statistiques
- **API Docs** : http://localhost:10000/api
- **Pages légales** :
  - Politique de confidentialité : http://localhost:5173/politique-de-confidentialite
  - Conditions générales : http://localhost:5173/conditions-generales
  - Mentions légales : http://localhost:5173/mentions-legales

---

## Documentation

### Documentation spécifique

- [Backend Documentation](./backend/README.md) - API, architecture, configuration
- [Frontend Documentation](./frontend/README.md) - Composants, structure, développement

### Points clés

#### Authentification

L'application utilise JWT pour l'authentification :
- Tokens stockés dans les cookies HTTP-only
- Refresh token pour renouvellement automatique
- Rôles : `USER`, `ADMIN`

#### Service SMTP

Configuration email via Gmail SMTP :
- Supporté : Bienvenue, Réinitialisation mot de passe, Vérification email
- Logs centralisés dans `./backend/logs/`
- Masquage automatique des données sensibles

#### Logs

Tous les logs sont centralisés dans `backend/logs/` :
- Fichiers datés : `YYYY-MM-DD-app.log`
- Rétention automatique : 3 jours par défaut
- Suppression des fichiers anciens au démarrage

#### Mode Maintenance

Gérable depuis le tableau de bord admin :
- Endpoint : `PATCH /api/users/maintenance-mode/toggle`
- Logs dans les fichiers centralisés
- Accessible pour les admins uniquement

#### Pages Légales

Conformité légale complète :
- Politique de confidentialité RGPD
- Conditions générales d'utilisation
- Mentions légales complètes
- SEO optimisé avec meta tags
- Layout minimal pour lecture optimale

---

## Structure des répertoires

### Backend

```
backend/
├── src/
│   ├── auth/              # Authentification JWT
│   ├── users/             # Gestion utilisateurs
│   ├── contact/           # Formulaires contact
│   ├── procedures/        # Procédures
│   ├── rendezvous/        # Rendez-vous
│   ├── destination/       # Destinations d'études
│   ├── config/
│   │   ├── smtp.service.ts      # Service email SMTP
│   │   └── logger.service.ts    # Service logging
│   ├── shared/
│   │   ├── guards/        # Guards JWT, Roles
│   │   ├── decorators/    # Décorateurs custom
│   │   └── interfaces/    # Types TypeScript
│   └── main.ts            # Point d'entrée
├── logs/                  # Fichiers de logs
├── uploads/               # Fichiers uploadés
├── .env                   # Variables d'environnement
└── docker-compose.yml     # Configuration Docker
```

### Frontend

```
frontend/
├── src/
│   ├── pages/            # Pages principales
│   │   ├── admin/        # Dashboard admin
│   │   ├── user/         # Pages utilisateur
│   │   ├── politiques/   # Pages légales
│   │   ├── auth/         # Login, Register
│   │   └── ...           # Autres pages publiques
│   ├── components/       # Composants réutilisables
│   │   ├── Header.tsx    # Navigation principale
│   │   ├── Footer.tsx    # Pied de page avec liens légaux
│   │   └── ...           # Autres composants
│   ├── context/          # Context API (Auth)
│   ├── api/              # Appels API
│   ├── styles/           # Global styles
│   └── main.tsx          # Point d'entrée
├── .env                  # Variables d'environnement
└── vite.config.ts        # Configuration Vite
```

---

## Développement

### Commits

Suivez le format conventional commits :
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: formatage
refactor: refactoring
test: tests
```

### Workflow

1. Créer une branche : `git checkout -b feature/ma-feature`
2. Committer : `git commit -m "feat: description"`
3. Pousser : `git push origin feature/ma-feature`
4. Créer une PR

### Tests

```bash
# Backend
cd backend
npm run test

# Frontend
cd frontend
npm run test
```

---

## Déploiement

### Préparation

1. Mettre à jour les versions dans `package.json`
2. Tester en local : `npm run build`
3. Vérifier les variables d'environnement production
4. Créer un tag : `git tag v1.0.0`

### Production

```bash
# Backend
npm run build
npm run start:prod

# Frontend
npm run build
# Servir le dossier dist/
```

### Déploiement sur Vercel

Le frontend est configuré pour Vercel :
- Build automatique via GitHub
- Variables d'environnement configurées
- Domaine personnalisé : `panameconsulting.vercel.app`

---

## Troubleshooting

### Problèmes courants

**Backend refuse de démarrer**
- ✅ Vérifier MongoDB est actif
- ✅ Vérifier les variables `.env`
- ✅ Vérifier le port 10000 est disponible

**Frontend ne se connecte pas**
- ✅ Vérifier `VITE_API_URL` dans `.env`
- ✅ Vérifier backend est en ligne
- ✅ Vérifier CORS dans backend

**Emails ne s'envoient pas**
- ✅ Vérifier `EMAIL_USER` et `EMAIL_PASS`
- ✅ Consulter logs : `backend/logs/`
- ✅ Vérifier les filtres spam

**Logs ne s'écrivent pas**
- ✅ Vérifier dossier `backend/logs/` existe
- ✅ Vérifier permissions d'écriture
- ✅ Redémarrer le backend

**Pages légales non accessibles**
- ✅ Vérifier les routes dans `App.tsx`
- ✅ Vérifier les imports des composants
- ✅ Consulter la console pour erreurs JavaScript

---

## Support

### Resources

- 📚 [Documentation NestJS](https://docs.nestjs.com)
- ⚛️ [Documentation React](https://react.dev)
- 🎨 [Documentation Tailwind](https://tailwindcss.com/docs)
- 🐳 [Documentation Docker](https://docs.docker.com)
- 🌐 [Documentation Vercel](https://vercel.com/docs)

### Contact

Pour les questions ou bugs, créez une issue sur GitHub.

**Paname Consulting**
- 📧 Email : panameconsulting906@gmail.com
- 📞 Téléphone : +223 91 83 09 41
- 📍 Adresse : Kalaban Coura, Imm.Bore en face de l'hôtel Wassulu, Bamako, Mali

---

**Dernière mise à jour** : Janvier 2026
**Version** : 1.0.0
**Licence** : MIT
