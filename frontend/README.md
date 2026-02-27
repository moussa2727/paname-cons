# Frontend - Paname Consulting

Application React/TypeScript moderne pour la gestion des consultations et procédures d'études à l'international.

## 🚀 Démarrage rapide

```bash
cd frontend
npm install
npm run dev
```

**L'app est accessible sur** : `http://localhost:5173`

---

## 📋 Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Structure](#structure)
- [Nouvelles fonctionnalités](#nouvelles-fonctionnalités)
- [Services API](#services-api)
- [Composants](#composants)
- [Système de Rendez-vous](#système-de-rendez-vous)
- [Lecteur PDF](#lecteur-pdf)
- [Développement](#développement)
- [Build](#build)

---

## Installation

### Dépendances

```bash
npm install
```

### Outils principaux

- **React 19.2.4** : UI library avec TypeScript 5.9.3
- **Vite 7.3.1** : Bundler/Dev server ultra-rapide
- **Tailwind CSS 4.1.18** : Framework CSS utilitaire
- **React Router DOM 7.13.0** : Routage client-side
- **Axios 1.13.4** : HTTP client pour les appels API
- **React Helmet Async 2.0.5** : Gestion des meta tags
- **Framer Motion 12.34.0** : Animations fluides
- **AOS 2.3.4** : Animations au scroll
- **React Toastify 11.0.5** : Notifications toast
- **JWT-decode 4.0.0** : Décodage tokens JWT
- **Lucide React 0.563.0** : Icônes modernes
- **Date-fns 4.1.0** : Manipulation des dates
- **Context API** : Gestion d'état globale

---

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du dossier frontend :

```env
VITE_API_URL=http://localhost:10000
VITE_APP_NAME=Paname-Consulting
```

### Fichiers de config

- `vite.config.ts` : Configuration Vite
- `tailwind.config.js` : Configuration Tailwind
- `tsconfig.json` : Configuration TypeScript

---

## Structure

```
src/
├── pages/                  # Pages principales
│   ├── admin/             # Dashboard admin
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminDestinations.tsx
│   │   ├── AdminMessages.tsx
│   │   ├── AdminProfile.tsx
│   │   ├── AdminProcedure.tsx
│   │   ├── AdminRendez-Vous.tsx
│   │   └── UsersManagement.tsx
│   ├── user/              # Espace utilisateur
│   │   ├── UserProfile.tsx
│   │   ├── UserProcedure.tsx
│   │   ├── auth/
│   │   │   ├── Connexion.tsx
│   │   │   ├── Inscription.tsx
│   │   │   └── MotdePasseoublie.tsx
│   │   └── rendezvous/
│   │       ├── RendezVous.tsx
│   │       └── MesRendezVous.tsx
│   ├── politiques/        # Pages légales
│   │   ├── ConditionsGenerales.tsx
│   │   ├── MentionsLegales.tsx
│   │   └── PolitiqueConfidentialite.tsx
│   ├── Accueil.tsx        # Page d'accueil
│   ├── Contact.tsx         # Contact
│   ├── Notfound.tsx        # Page 404
│   ├── PDFViewer.tsx       # Lecteur PDF
│   ├── Propos.tsx          # À propos
│   └── Services.tsx        # Services
│
├── components/            # Composants réutilisables
│   ├── admin/
│   │   └── AdminSidebar.tsx
│   ├── auth/
│   │   ├── ForgotPassword.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ResetPassword.tsx
│   ├── user/
│   │   └── UserHeader.tsx
│   ├── About.tsx
│   ├── CtaSection.tsx
│   ├── Destination.tsx
│   ├── DestinationQuiz.tsx
│   ├── ErrorBoundary.tsx
│   ├── Faq.tsx
│   ├── Footer.tsx
│   ├── Form.tsx
│   ├── FrenchSchool.tsx
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Loader.tsx
│   ├── ServicesGrid.tsx
│   ├── Valeur.tsx
│   └── partners.tsx
│
├── api/                  # Services API
│   ├── admin/
│   │   ├── AdminContactService.ts
│   │   ├── AdminDashboardService.ts
│   │   ├── AdminDestionService.ts
│   │   ├── AdminProcedureService.ts
│   │   ├── AdminRendezVousService.ts
│   │   └── AdminUserService.ts
│   └── user/
│       ├── Profile/
│       │   └── userProfileApi.ts
│       ├── Rendezvous/
│       │   └── UserRendezvousService.ts
│       └── procedures/
│           └── ProcedureService.ts
│
├── context/              # Context API
│   ├── AuthContext.tsx   # Gestion authentification
│   └── RequireAdmin.tsx   # Protection routes admin
│
├── types/                # Types TypeScript
│   ├── global.d.ts
│   ├── react-router.d.ts
│   └── vite-env.d.ts
│
├── AdminLayout.tsx       # Layout admin
├── App.tsx               # Router principal
├── index.css             # Styles globaux
└── main.tsx              # Point d'entrée
```

---

## Architecture des Services API

### **Services Admin**
- **AdminDashboardService** : Statistiques et analytics
- **AdminContactService** : Gestion des messages contact
- **AdminDestionService** : Gestion destinations
- **AdminProcedureService** : Gestion procédures
- **AdminRendezVousService** : Gestion rendez-vous
- **AdminUserService** : Gestion utilisateurs

### **Services User**
- **userProfileApi** : Profil utilisateur
- **UserRendezvousService** : Rendez-vous utilisateur
- **ProcedureService** : Procédures utilisateur

### **Pattern d'architecture**
- **Services centralisés** : Chaque entité a son service dédié
- **TypeScript** : Types forts pour toutes les API
- **Error handling** : Gestion d'erreurs unifiée
- **Authentification** : Tokens JWT automatiques

---

## Routes et Layouts

### **Structure des routes**
```tsx
// Pages publiques
/                    # Accueil
/services            # Services
/contact             # Contact
/a-propos            # À propos
/info/:documentName  # Lecteur PDF (/info/russie, /info/chine...)

// Pages légales
/conditions-generales    # CGU
/mentions-legales        # Mentions légales
// politique-de-confidentialite # Commentée

// Authentification
/connexion              # Login
/inscription            # Register
/mot-de-passe-oublie    # Forgot password
/reset-password         # Reset password

// Routes utilisateur (protégées)
/rendez-vous           # Prise de rendez-vous
/mes-rendez-vous       # Gestion rendez-vous
/mon-profil            # Profil utilisateur
/ma-procedure          # Procédures utilisateur

// Routes admin (protégées)
/gestionnaire           # Dashboard admin
/gestionnaire/*        # Toutes les routes admin
```

### **Layouts disponibles**
- **AccueilLayout** : Layout avec loader pour l'accueil
- **PublicLayout** : Layout standard pour pages publiques
- **MinimalLayout** : Layout minimaliste (PDF, auth, profil)
- **AdminLayout** : Layout admin avec sidebar

---

## Nouvelles fonctionnalités

### 🎨 **Design moderne**
- Interface responsive et accessible
- Animations fluides avec Framer Motion et AOS
- Design system cohérent avec Tailwind CSS
- Support dark/light mode (préparé)

### 📄 **Lecteur PDF intégré**
- Lecture des documents depuis `/info/nomdudocument`
- Support des formats PDF standards
- Navigation intuitive avec téléchargement
- Gestion d'erreur pour documents indisponibles

### 🌍 **Destinations multiples**
- Affichage dynamique des pays disponibles
- Images optimisées dans `/images/`
- Informations détaillées par destination
- Fallbacks pour images manquantes

### 📱 **Expérience utilisateur**
- Notifications toast uniques
- Formulaire de contact multi-étapes
- Système de rendez-vous complet
- Profil utilisateur personnalisé

---

## Système de Rendez-vous

### **Statuts disponibles**
- **En attente** : Création en attente de confirmation admin
- **Confirmé** : Validé et programmé
- **Terminé** : Effectué avec avis administratif
- **Annulé** : Supprimé (soft delete)

### **Fonctionnalités**
- **Prise de RDV** : Créneaux disponibles en temps réel
- **Gestion** : Modification/annulation selon permissions
- **Notifications** : Emails automatiques de confirmation/rappel
- **Validation** : Vérification disponibilité et règles métier
- **Avis admin** : Obligatoire pour terminer un RDV

---

## Lecteur PDF

### **URL Structure**
- Format : `/info/nomdudocument`
- Exemples : `/info/russie`, `/info/turquie`, `/info/chine`

### **Documents disponibles**
- `russie.pdf` - Informations sur les études en Russie
- `turquie.pdf` - Guide études en Turquie
- `chine.pdf` - Documentation Chine
- `chypre.pdf` - Informations Chypre
- `algerie.pdf` - Guide Algérie
- `maroc.pdf` - Documentation Maroc
- `france.pdf` - Informations France

### **Fonctionnalités**
- 📖 Lecture plein écran
- ⬇️ Téléchargement direct
- 🔙 Navigation retour
- ❌ Gestion d'erreur élégante

---

## Assets et Images

### **Structure des images**
```
public/images/
├── Heroimage.avif           # Image hero
├── CEOPANAME.webp           # Photo CEO
├── paname-consulting.*      # Logo et favicons
├── russie.png               # Drapeau Russie
├── chine.jpg                # Drapeau Chine
├── maroc.webp               # Drapeau Maroc
├── algerie.png              # Drapeau Algérie
├── turquie.webp             # Drapeau Turquie
├── france.svg               # Drapeau France
├── supemir.webp             # Partenaire Supemir
├── hecf.webp                # Partenaire HECF
├── inted.webp               # Partenaire Inted
└── ...                      # Autres partenaires
```

### **Optimisations**
- ✅ Images au format WebP/AVIF
- ✅ Lazy loading automatique
- ✅ Fallbacks pour erreurs
- ✅ Responsive avec srcset

---

## SEO et Performance

### **Meta tags optimisés**
```tsx
<Helmet>
  <title>Page Title - Paname Consulting</title>
  <meta name="description" content="..." />
  <meta property="og:image" content="/images/paname-consulting.jpg" />
  <meta name="robots" content="index, follow" />
</Helmet>
```

### **Sitemap complet**
- URLs principales indexées
- Dates de modification à jour
- Priorités appropriées
- Fréquences de crawl optimisées

### **Robots.txt optimisé**
- Autorisation des pages publiques
- Blocage des pages admin/auth
- Protection des documents
- Crawl-delay configuré

---

## Build

### Build production

```bash
npm run build
```

Génère un dossier `dist/` optimisé avec toutes les images et assets.

### Preview production

```bash
npm run preview
```

---

## Performance

### Optimisations implémentées
- ✅ Code splitting automatique (Vite)
- ✅ Lazy loading routes et images
- ✅ Image optimization (WebP/AVIF)
- ✅ CSS purging (Tailwind)
- ✅ Minification et compression
- ✅ Service Worker prêt

### Métriques cibles
- 🎯 Lighthouse score > 95
- 🎯 Time to Interactive < 2s
- 🎯 Bundle size < 400KB
- 🎯 Core Web Vitals verts

---

## Stack & Technologies

| Package | Usage |
|---------|-------|
| **react** | UI library |
| **typescript** | Type safety |
| **vite** | Build tool |
| **tailwindcss** | Styling |
| **axios** | HTTP client |
| **react-router** | Routing |
| **framer-motion** | Animations |
| **react-toastify** | Notifications |
| **lucide-react** | Icons |

---

**Version** : 2.0.0
**Dernière mise à jour** : 27 Février 2026
**Auteur** : Paname Consulting Team
