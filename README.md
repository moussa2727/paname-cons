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
- [Système de Rendez-vous](#système-de-rendez-vous)
- [Mode Maintenance](#mode-maintenance)
- [Support](#support)

---

## À propos

Paname Consulting est une plateforme complète permettant aux utilisateurs de :
- 📅 Prendre rendez-vous avec des conseillers
- 📋 Gérer leurs procédures administratives
- 💬 Contacter l'équipe via des formulaires de contact
- 👤 Gérer leur profil et préférences
- 🌍 Accéder à des services d'orientation académique internationale

### Caractéristiques principales

- ✅ Authentification JWT sécurisée avec tokens d'accès et rafraîchissement
- ✅ Tableaux de bord administrateur avancés avec statistiques en temps réel
- ✅ Système d'email SMTP intégré (Gmail/Resend)
- ✅ Logs centralisés et sécurisés avec rotation automatique
- ✅ Mode maintenance configurable avec protection admin
- ✅ API REST documentée avec Swagger
- ✅ Interface responsive (mobile-first)
- ✅ SEO optimisé avec meta tags
- ✅ Système de rendez-vous avec gestion des créneaux horaires
- ✅ Système de procédures administratives multi-étapes
- ✅ Gestion des destinations d'études internationales
- ✅ Validation des données en temps réel

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
│   │   │   ├── auth/         # Login, Register
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
- NestJS 11.1.13
- MongoDB avec Mongoose 9.1.6
- JWT 11.0.2 (Authentification)
- Bcryptjs 3.0.3 (Hachage mots de passe)
- Nodemailer 7.0.13 (SMTP)
- Passport 0.7.0 (Stratégies d'authentification)
- Redis 5.10.0 (Cache)
- Winston 3.19.0 (Logs centralisés)
- Socket.io 4.8.3 (WebSockets)
- Resend 6.9.1 (Notifications email)
- Date-holidays 3.26.8 (Jours fériés)
- Rate limiting (Express-rate-limit 8.2.1)
- Compression, Helmet, CORS

**Frontend:**
- React 19.2.4 avec TypeScript 5.9.3
- Vite 7.3.1 (Build tool)
- Tailwind CSS 4.1.18 (Styling)
- React Router DOM 7.13.0 (Routing)
- Axios 1.13.4 (Appels API)
- React Helmet Async 2.0.5 (SEO)
- Framer Motion 12.33.0 (Animations)
- AOS 2.3.4 (Animations on scroll)
- React Toastify 11.0.5 (Notifications)
- JWT-decode 4.0.0 (Token parsing)
- Lucide React 0.563.0 (Icônes)
- Date-fns 4.1.0 (Manipulation dates)
- Context API (Gestion d'état)

**DevOps:**
- Docker & Docker Compose
- Git/GitHub
- Vercel (Déploiement)

---

## Système de Rendez-vous

L'application gère les rendez-vous avec un système complet et centralisé :

### **Statuts des rendez-vous**
- **En attente** : Rendez-vous créé en attente de confirmation
- **Confirmé** : Rendez-vous validé par l'administrateur
- **Terminé** : Rendez-vous terminé avec avis administratif
- **Annulé** : Rendez-vous annulé (soft delete)

### **Gestion des créneaux horaires**
- **Horaires** : 9h00 à 16h30 par créneaux de 30 minutes
- **Jours ouvrés** : Lundi au vendredi (week-end fermé)
- **Jours fériés** : Jours fériés du Mali automatiquement exclus
- **Limite quotidienne** : Maximum 24 rendez-vous par jour
- **Disponibilité** : Vérification en temps réel des créneaux

### **Destinations d'études disponibles**
- Russie, Chypre, Chine, Maroc, Algérie, Turquie, France
- Option "Autre" avec précision personnalisée

### **Filières d'études disponibles**
- Informatique, Médecine, Droit, Commerce, Ingénierie, Architecture
- Option "Autre" avec précision personnalisée

### **Niveaux d'étude supportés**
- Bac, Bac+1, Bac+2, Licence, Master I, Master II, Doctorat

### **Permissions et restrictions**
- **Utilisateurs** : Peuvent créer/modifier leurs propres rendez-vous
- **Administrateurs** : Gestion complète de tous les rendez-vous
- **Confirmation** : Réservée aux administrateurs
- **Terminaison** : Réservée aux administrateurs avec avis obligatoire
- **Annulation** : Possible jusqu'à 2 heures avant le RDV

---

## Prérequis

### Système

- **Node.js** : v22.13.1 ou supérieur
- **Docker** : Latest version (optionnel mais recommandé)
- **MongoDB** : v5.0+ (local ou cloud)
- **Git**

### Variables d'environnement

#### Backend (.env)
Copiez `.env.example` vers `.env` et configurez les variables :

```env
# ===== DATABASE =====
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/DATABASE_NAME

# ===== SERVER =====
PORT=10000
NODE_ENV=development
HOST=0.0.0.0

# ===== JWT =====
JWT_SECRET=votre_secret_jwt_tres_securise_minimum_32_caracteres
JWT_EXPIRES_IN=24h
COOKIE_SECRET=votre_cookie_secret_pour_la_securite

# ===== EMAIL/SMTP =====
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application_gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# ===== ADMIN CONFIGURATION =====
EMAIL_USER=admin@panameconsulting.com

# ===== MAINTENANCE MODE =====
MAINTENANCE_MODE=false

# ===== FRONTEND =====
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:10000

# ===== FILE UPLOAD =====
UPLOAD_DIR=./uploads
LOAD_DIR=./uploads

# ===== LOGGING =====
LOG_DIR=./logs
LOG_RETENTION_DAYS=3

# ===== REDIS (Optionnel) =====
REDIS_URL=redis://localhost:6379

# ===== SECURITY =====
CORS_ORIGIN=http://localhost:5173

# ===== NOTIFICATIONS =====
RESEND_API_KEY=votre_cle_api_resend
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

---

## Documentation

### Documentation spécifique

- [Backend Documentation](./backend/README.md) - API, architecture, configuration
- [Frontend Documentation](./frontend/README.md) - Composants, structure, développement

### Pages légales

Les pages légales suivantes sont disponibles côté frontend :

- **Politique de confidentialité** : route `/politique-de-confidentialite`
- **Conditions Générales d'utilisation** : route `/conditions-generales`
- **Mentions légales** : route `/mentions-legales`

### ✅ Cohérence Garantie

Le projet maintient une **cohérence stricte et automatique** entre backend et frontend :

#### Source de vérité unique
- **Backend** : `schemas/rendezvous.schema.ts` contient toutes les constantes
- **Frontend** : Services API importent et utilisent ces constantes
- **Composants** : Utilisation exclusive des constantes centralisées

#### Constantes synchronisées
- **Statuts** : `En attente`, `Confirmé`, `Terminé`, `Annulé`
- **Avis** : `Favorable`, `Défavorable`
- **Destinations** : Russie, Chypre, Chine, Maroc, Algérie, Turquie, France, Autre
- **Filières** : Informatique, Médecine, Droit, Commerce, Ingénierie, Architecture, Autre
- **Niveaux** : Bac à Doctorat
- **Créneaux** : 9h00-16h30 par pas de 30 minutes

#### Architecture centralisée
- **Services API** : `AdminRendezVousService` et `UserRendezvousService`
- **Validation** : Fonctions `validateRendezvousData()` partagées
- **Types** : Interfaces TypeScript identiques entre admin et user

### Points clés

### Système de Rendez-vous

L'application gère les rendez-vous avec un système complet :

#### **Statuts des rendez-vous**
- **En attente** : Rendez-vous créé en attente de confirmation
- **Confirmé** : Rendez-vous validé par l'administrateur
- **Terminé** : Rendez-vous terminé avec avis administratif
- **Annulé** : Rendez-vous annulé (soft delete)

#### **Gestion des créneaux**
- **Horaires** : 9h00 à 16h30 par créneaux de 30 minutes
- **Jours ouvrés** : Lundi au vendredi (week-end fermé)
- **Jours fériés** : Jours fériés du Mali automatiquement exclus
- **Limite quotidienne** : Maximum 24 rendez-vous par jour
- **Disponibilité** : Vérification en temps réel des créneaux

#### **Permissions**
- **Utilisateurs** : Peuvent créer/modifier leurs propres rendez-vous
- **Administrateurs** : Gestion complète de tous les rendez-vous
- **Confirmation** : Réservée aux administrateurs
- **Terminaison** : Réservée aux administrateurs avec avis obligatoire

#### **Restrictions**
- **Compte requis** : Un utilisateur doit avoir un compte pour prendre RDV
- **Email unique** : Un seul rendez-vous confirmé par utilisateur
- **Annulation** : Possible jusqu'à 2 heures avant le RDV
- **Modification** : Impossible pour les rendez-vous terminés

#### **Avis administratif**
- **Favorable** : Permet de créer automatiquement une procédure
- **Défavorable** : Refus de la demande
- **Obligatoire** : Pour tout rendez-vous terminé

#### **Notifications**
- **Email de confirmation** : À la création du RDV
- **Rappel quotidien** : 9h le jour du RDV
- **Rappel veille** : 18h la veille du RDV
- **Rappel 2h** : 2 heures avant le RDV
- **Changement de statut** : Notification des mises à jour

#### **Validation des données**
- **Destinations** : Russie, Chypre, Chine, Maroc, Algérie, Turquie, France, ou "Autre"
- **Filières** : Informatique, Médecine, Droit, Commerce, Ingénierie, Architecture, ou "Autre"
- **Niveaux d'étude** : Bac à Doctorat
- **Format téléphone** : International (+228...)

### Système d'authentification

L'application utilise un système JWT complet avec :
- **Tokens d'accès** : 15 minutes de durée de vie
- **Tokens de rafraîchissement** : 30 minutes de durée de vie
- **Session maximum** : 30 minutes d'inactivité
- **Déconnexion automatique** : Après 30 minutes d'inactivité
- **Gestion des sessions** : Tracking en base de données MongoDB
- **Rate limiting** : Protection contre les attaques brute force
- **Rôles** : `USER`, `ADMIN`
- **Cookies HTTP-only** : Sécurité renforcée
- **Refresh automatique** : 5 minutes avant la fin de validité du token
- **Nettoyage des sessions inactives** : Toutes les 15 minutes

#### Sécurité des tokens
- Stockage dans localStorage et cookies HTTP-only
- Masquage des données sensibles dans les logs
- Révocation des tokens lors de la déconnexion
- Protection CSRF avec sameSite=none
- Support des environnements de production HTTPS

#### Gestion des sessions

Système complet de gestion des sessions :
- **Durée de session** : 30 minutes maximum
- **Check d'inactivité** : Toutes les minutes
- **Déconnexion automatique** : Après la fin de session
- **Sessions simultanées** : Maximum 5 par utilisateur
- **Nettoyage automatique** : Sessions inactives supprimées toutes les 15 minutes
- **Tracking d'activité** : Dernière activité enregistrée
- **Révocation manuelle** : Admin peut révoquer des sessions

#### Service SMTP

Configuration email via Gmail SMTP :
- Supporté : Bienvenue, Réinitialisation mot de passe, Vérification email
- Logs centralisés dans `./backend/logs/`
- Masquage automatique des données sensibles
- Template emails HTML personnalisés
- Gestion des erreurs d'envoi

#### Logs

Tous les logs sont centralisés dans `backend/logs/` :
- Fichiers datés : `YYYY-MM-DD-app.log`
- Rétention automatique : 3 jours par défaut
- Suppression des fichiers anciens au démarrage
- Niveaux de log : ERROR, WARN, LOG, DEBUG
- Masquage des données sensibles (tokens, emails)
- Rotation automatique avec Winston Daily Rotate

#### Mode Maintenance

Gérable depuis le tableau de bord admin :
- Endpoint : `PATCH /api/users/maintenance-mode/toggle`
- Logs dans les fichiers centralisés
- Accessible pour les admins uniquement
- **Admin principal protégé** : L'admin avec `EMAIL_USER` a un accès illimité
- **Détection en temps réel** : `AdminSidebar` et `AdminDashboard` affichent l'état
- **Contrôle utilisateur** : Bloque les utilisateurs normaux, épargne les admins

---

### Système de Suppression

### Fonctionnalités

- **Suppression en cascade** : Les étapes en cours sont automatiquement annulées
- **Confirmation améliorée** : Résumé de l'impact avant validation
- **Animation de traitement** : Feedback visuel pendant l'annulation
- **Historique préservé** : Les procédures annulées restent consultables
- **Email de notification** : Utilisateur informé des changements

### Flux de suppression

1. **Clic sur "Supprimer"** → Calcul des étapes impactées
2. **Modal de résumé** → Affichage des étapes qui seront annulées
3. **Confirmation finale** → Raison optionnelle et validation
4. **Traitement avec animation** → Mise à jour en cascade
5. **Notification** → Confirmation du nombre d'étapes affectées

### Règles de suppression

- ✅ Utilisateurs ne peuvent supprimer que leurs propres procédures
- ✅ Les procédures terminées/annulées/rejetées ne peuvent plus être modifiées
- ✅ Les étapes `IN_PROGRESS` et `PENDING` deviennent `CANCELLED`
- ✅ Les étapes `COMPLETED` restent `COMPLETED`
- ✅ Email de notification envoyé à l'utilisateur

### Déconnexion Automatique

#### Fonctionnalités

- **Session timeout** : 30 minutes d'inactivité maximum
- **Check régulier** : Vérification toutes les minutes
- **Notification utilisateur** : Toast informant de l'expiration
- **Redirection automatique** : Vers page de connexion
- **Nettoyage complet** : Suppression des données locales
- **Protection admin** : Même les admins sont déconnectés après timeout

#### Implémentation

```typescript
// Frontend - AuthContext.tsx
const SESSION_CHECK_INTERVAL = 60 * 1000; // 1 minute
const MAX_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Vérification régulière de la session
sessionCheckIntervalRef.current = window.setInterval(() => {
  const sessionStart = localStorage.getItem('session_start');
  if (sessionStart) {
    const sessionAge = Date.now() - parseInt(sessionStart);
    if (sessionAge > MAX_SESSION_DURATION_MS) {
      cleanupAuthData();
      toast.info('Votre session a atteint sa durée maximale (30 minutes). Veuillez vous reconnecter.');
    }
  }
}, SESSION_CHECK_INTERVAL);
```

---

## Mode Maintenance

### Protection administrative

Le mode maintenance est conçu pour protéger l'accès administrateur tout en bloquant les utilisateurs :

#### **Admin principal (EMAIL_USER)**
- ✅ **Accès illimité** : Contourne toutes les restrictions
- ✅ **Accès permanent** : Jamais affecté par le mode maintenance
- ✅ **Contrôle total** : Peut activer/désactiver le mode maintenance

#### **Autres administrateurs**
- ⚠️ **Accès limité** : Peuvent être affectés selon la configuration
- 🔧 **Contrôle partagé** : Peuvent gérer le mode maintenance si autorisés

#### **Utilisateurs normaux**
- ❌ **Accès bloqué** : Redirection vers page d'accueil
- 📱 **Message clair** : Notification de maintenance
- 🔄 **État préservé** : Session maintenue

### Interface de contrôle

- **AdminSidebar** : Bouton toggle avec indicateur visuel
- **AdminDashboard** : Carte de statistique avec état temps réel
- **Confirmation** : Modal de validation avant changement
- **Logging** : Traçabilité complète des actions

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
│   │   ├── auth/         # Login, Register
│   │   └── ...           # Autres pages publiques
│   ├── components/       # Composants réutilisables
│   │   ├── Header.tsx    # Navigation principale
│   │   ├── Footer.tsx    # Pied de page
│   │   └── ...           # Autres composants
│   ├── context/          # Context API (Auth)
│   ├── api/              # Appels API centralisés
│   │   ├── admin/        # Services admin
│   │   └── user/         # Services utilisateur
│   ├── assets/           # Images/ressources
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

---

## Améliorations Possibles

### ✅ État Actuel du Projet

Le projet est actuellement **100% cohérent** entre backend et frontend :

#### Cohérence des constantes
- **Statuts des rendez-vous** : `En attente`, `Confirmé`, `Terminé`, `Annulé` (identiques partout)
- **Avis administratifs** : `Favorable`, `Défavorable` (identiques partout)
- **Destinations d'études** : Russie, Chypre, Chine, Maroc, Algérie, Turquie, France, Autre (identiques partout)
- **Filières d'études** : Informatique, Médecine, Droit, Commerce, Ingénierie, Architecture, Autre (identiques partout)
- **Niveaux d'étude** : Bac à Doctorat (identiques partout)
- **Créneaux horaires** : 9h00-16h30 par pas de 30 minutes (identiques partout)

#### Architecture centralisée
- **Backend** : Toutes les constantes définies dans `schemas/rendezvous.schema.ts`
- **Frontend** : Services API importent les constantes du backend
- **Composants** : Utilisation unique des constantes centralisées

### À court terme (1-2 semaines)

#### Sécurité renforcée
- **2FA/MFA** : Authentification à deux facteurs
- **Password policies** : Complexité renforcée avec historique
- **IP whitelisting** : Restriction par adresse IP
- **Device fingerprinting** : Détection d'appareils inhabituels

#### Performance
- **Caching Redis** : Mise en cache des requêtes fréquentes
- **Database indexing** : Optimisation des requêtes MongoDB
- **Image optimization** : Compression et WebP
- **Code splitting** : Chargement progressif des composants

#### UX/UI
- **Language switch** : Support multilingue (FR/EN)
- **Accessibility** : WCAG 2.1 AA compliance
- **Mobile PWA** : Application mobile progressive

### À moyen terme (1-2 mois)

#### Fonctionnalités avancées
- **File management** : Upload/Download de documents
- **Calendar integration** : Google Calendar/Outlook sync
- **Payment system** : Stripe/PayPal integration
- **Video conferencing** : Zoom/Teams integration
- **Chat system** : Messaging temps réel avec Socket.io
- **Advanced filtering** : Filtres multi-critères pour rendez-vous
- **Real-time updates** : Mises à jour en temps réel des statuts

#### Analytics & Monitoring
- **User analytics** : Tracking comportement utilisateur
- **Error monitoring** : Sentry integration
- **Performance monitoring** : APM (New Relic/DataDog)
- **Business intelligence** : Tableaux de bord analytiques

### À long terme (3-6 mois)

#### Architecture
- **Microservices** : Découpage en services indépendants
- **Event sourcing** : Architecture événementielle
- **CQRS pattern** : Séparation lecture/écriture
- **API Gateway** : Point d'entrée unique pour tous les services
- **Message Queue** : RabbitMQ/Apache Kafka pour les traitements asynchrones

#### DevOps & Scalabilité
- **Kubernetes** : Orchestration conteneurs
- **CI/CD pipeline** : GitHub Actions complet avec tests automatisés
- **Load balancing** : HAProxy/Nginx avec health checks
- **Auto-scaling** : Scaling automatique basé sur la charge
- **Monitoring avancé** : Prometheus + Grafana pour métriques détaillées
- **Security scanning** : Snyk/OWASP ZAP automatisé dans CI/CD

#### IA & Machine Learning
- **Recommendation engine** : Algorithmes de suggestion basés sur l'historique
- **Chatbot intelligent** : Bot conversationnel avec NLP pour support client
- **Predictive analytics** : Prédictions des tendances et comportements utilisateurs
- **Automated testing** : Tests E2E avec Playwright

## Support

### Resources

- 📚 [Documentation NestJS](https://docs.nestjs.com)
- ⚛️ [Documentation React](https://react.dev)
- 🎨 [Documentation Tailwind](https://tailwindcss.com/docs)
- 🐳 [Documentation Docker](https://docs.docker.com)
- 🌐 [Documentation Vercel](https://vercel.com/docs)
- 🔐 [Documentation JWT](https://jwt.io)
- 📧 [Documentation Nodemailer](https://nodemailer.com)
- 🗄️ [Documentation MongoDB](https://docs.mongodb.com)
- ⚡ [Documentation Redis](https://redis.io/docs)

### Contact

Pour les questions ou bugs, créez une issue sur GitHub.

**Paname Consulting**
- 📧 Email : panameconsulting906@gmail.com
- 📞 Téléphone : +223 91 83 09 41

---

**Dernière mise à jour** : Février 2026
**Version** : 2.1.0
**Licence** : MIT
