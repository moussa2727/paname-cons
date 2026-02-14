# Frontend - Paname Consulting

Application React/TypeScript pour la gestion des consultations et procédures.

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
- [Composants](#composants)
- [Développement](#développement)
- [Build](#build)

---

## Installation

### Dépendances

```bash
npm install
```

### Outils

- **Vite** : Bundler/Dev server ultra-rapide
- **React 18+** : UI library
- **TypeScript** : Type safety
- **Tailwind CSS** : Styling
- **Axios** : HTTP client
- **Lucide React** : Icons

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
