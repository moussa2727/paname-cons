# Frontend - Paname Consulting

Application React/TypeScript pour la gestion des consultations et procédures d'études à l'international.

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
- [Services API](#services-api)
- [Composants](#composants)
- [Système de Rendez-vous](#système-de-rendez-vous)
- [Développement](#développement)
- [Build](#build)

---

## Installation

### Dépendances

```bash
npm install
```

### Outils

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
│   │   └── AdminDashboard.tsx
│   ├── auth/              # Authentification
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── procedures/        # Procédures
│   ├── rendezvous/        # Rendez-vous
│   ├── contact/           # Contact
│   ├── user/              # Espace utilisateur (profil, rendez-vous, procédures)
│   ├── politiques/        # Pages légales (CGU, Mentions légales, Politique de confidentialité)
│   └── profile/           # Profil utilisateur
│
├── components/            # Composants réutilisables
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   └── ...
│
├── context/              # Context API
│   └── AuthContext.tsx   # Gestion authentification
│
├── api/                  # Services API
│   ├── auth/
│   ├── admin/
│   ├── contact/
│   ├── user/
│   └── ...
│
├── styles/               # Styles globaux
│   └── globals.css
│
├── utils/                # Utilitaires
│   ├── validators.ts
│   ├── formatters.ts
│   └── helpers.ts
│
└── main.tsx              # Point d'entrée
```

### Pages légales

Les pages légales sont exposées via les routes suivantes :

- `/politique-de-confidentialite` : Politique de confidentialité
- `/conditions-generales` : Conditions Générales d'utilisation
- `/mentions-legales` : Mentions légales

---

## Composants

### Composants principaux

#### Header
Barre de navigation avec :
- Logo
- Menu navigation
- Authenticaton (Login/Logout)
- Profil utilisateur

#### Footer
Pied de page avec :
- Informations entreprise
- Liens rapides
- Social links

#### Sidebar (Admin)
Navigation admin avec :
- Statistiques
- Contrôles système
- Bouton mode maintenance

#### Dashboard
Tableau de bord avec :
- Cards statistiques
- Graphiques
- Activités récentes
- Gestion mode maintenance

### Patterns

- **React Hooks** : useState, useEffect, useContext
- **Custom Hooks** : useAuth, useDashboardData
- **Context API** : Gestion état global
- **Composition** : Props-based components

---

## Développement

### Démarrage

```bash
npm run dev
```

L'app recharge automatiquement les modifications (HMR).

### Structure d'une page

```tsx
import { useAuth } from '@/context/AuthContext';
import { Helmet } from 'react-helmet-async';

const MyPage = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Veuillez vous connecter</div>;
  }

  return (
    <>
      <Helmet>
        <title>Ma Page - Paname Consulting</title>
      </Helmet>
      <div className="p-8">
        {/* Contenu */}
      </div>
    </>
  );
};

export default MyPage;
```

### Appels API

```tsx
import axios from 'axios';

// Dans un composant
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await axios.get('/api/endpoint');
      setData(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  fetchData();
}, []);
```

### Styling avec Tailwind

```tsx
// Classes Tailwind
<div className="p-4 md:p-6 lg:p-8 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Titre</h1>
  <p className="text-gray-600 mt-2">Descriptif</p>
</div>
```

---

## Features

### Authentification

- Inscription (Register)
- Connexion (Login)
- Réinitialisation mot de passe
- Vérification email
- Renouvellement automatique token

### Pages utilisateur

- Dashboard personnel
- Mes procédures
- Mes rendez-vous (gestion complète avec statuts)
- Profil
- Contact

### Système de rendez-vous

#### **Statuts disponibles**
- **En attente** : Création en attente de confirmation admin
- **Confirmé** : Validé et programmé
- **Terminé** : Effectué avec avis administratif
- **Annulé** : Supprimé (soft delete)

#### **Fonctionnalités**
- **Prise de RDV** : Créneaux disponibles en temps réel
- **Gestion** : Modification/annulation selon permissions
- **Notifications** : Emails automatiques de confirmation/rappel
- **Validation** : Vérification disponibilité et règles métier
- **Avis admin** : Obligatoire pour terminer un RDV

### Pages admin

- Tableau de bord analytics
- Gestion utilisateurs
- Gestion procédures
- Gestion rendez-vous
- Mode maintenance
- Statistiques

---

## Build

### Build production

```bash
npm run build
```

Génère un dossier `dist/` optimisé.

### Preview production

```bash
npm run preview
```

---

## Performance

### Optimisations

- ✅ Code splitting automatique (Vite)
- ✅ Lazy loading routes
- ✅ Image optimization
- ✅ CSS purging (Tailwind)
- ✅ Minification

### Checklist

- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 500KB

---

## SEO

### Meta tags

```tsx
<Helmet>
  <title>Page Title - Paname Consulting</title>
  <meta name="description" content="..." />
  <meta name="robots" content="noindex, nofollow" /> {/* Pour admin */}
</Helmet>
```

---

## Troubleshooting

| Problème | Solution |
|----------|----------|
| API 404 | Vérifier `VITE_API_URL` |
| Erreur CORS | Vérifier backend CORS config |
| Style non appliqué | Vérifier Tailwind purge config |
| Auth non persistante | Vérifier cookies HTTP-only |

---

## Stack & Libraries

| Package | Usage |
|---------|-------|
| **react** | UI library |
| **typescript** | Type safety |
| **vite** | Bundler |
| **tailwindcss** | Styling |
| **axios** | HTTP client |
| **react-router** | Routing |
| **react-toastify** | Notifications |
| **lucide-react** | Icons |

---

**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
