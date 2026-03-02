# Système d'URLs Standardisées - Paname Consulting

## 🎯 Objectif

Centraliser et standardiser toutes les URLs du système pour assurer la cohérence entre le backend et le frontend.

## 🏗️ Architecture

### UrlService (Backend)
Service centralisé pour la génération d'URLs dans tout le backend.

**Localisation :** `src/shared/utils/url.service.ts`

**Fonctionnalités :**
- Génération d'URLs complètes pour les images
- Gestion des URLs par environnement (local/Vercel)
- Normalisation des chemins de fichiers
- URLs pour l'API, le frontend et les assets

## 📡 Format des URLs

### Images Uploadées

**Format standard :**
```
{BASE_URL}/api/destinations/uploads/{filename}
```

**Exemples :**
- **Local :** `http://localhost:10000/api/destinations/uploads/algerie.png`
- **Vercel :** `https://paname-consulting.vercel.app/api/destinations/uploads/algerie.png`

### Images par Défaut

**Format :**
```
{BASE_URL}/images/{filename}
```

**Exemples :**
- **Local :** `http://localhost:10000/images/paname-consulting.jpg`
- **Vercel :** `https://paname-consulting.vercel.app/images/paname-consulting.jpg`

### API Endpoints

**Format :**
```
{BASE_URL}/api/{endpoint}
```

## 🔧 Utilisation

### Backend

```typescript
// Injecter UrlService
constructor(private readonly urlService: UrlService) {}

// Générer une URL d'image
const imageUrl = this.urlService.getImageUrl('algerie.png');

// URL de l'API
const apiUrl = this.urlService.getApiUrl('destinations');

// URL du frontend
const frontendUrl = this.urlService.getFrontendUrl('/admin');
```

### Frontend

```typescript
// Utiliser la fonction utilitaire
import { getFullImageUrl } from '../api/admin/AdminDestinationService';

const imageUrl = getFullImageUrl('algerie.png');
// Résultat: http://localhost:10000/api/destinations/uploads/algerie.png
```

## 🌍 Environnements

### Local (Développement)
- **Base URL :** `http://localhost:10000`
- **Stockage :** Système de fichiers local
- **Servies par :** Backend NestJS

### Production (Vercel)
- **Base URL :** `https://paname-consulting.vercel.app`
- **Stockage :** Vercel Blob Storage
- **Servies par :** Redirection vers URLs publiques

## 📋 Flux Complet

### Upload d'une Image

1. **Frontend :** Formulaire d'upload → `POST /api/destinations`
2. **Backend :** StorageService.uploadFile() → Vercel Blob / FS local
3. **Stockage :** Fichier sauvegardé avec nom unique
4. **Retour :** Nom du fichier enregistré en BDD

### Affichage d'une Image

1. **Frontend :** `getFullImageUrl(filename)` → URL complète
2. **Affichage :** `<img src={imageUrl}>`
3. **Chargement :** Navigateur → `GET /api/destinations/uploads/{filename}`
4. **Backend :** DestinationController.serveUpload()
   - **Vercel :** Redirection vers URL blob publique
   - **Local :** Buffer du fichier local

## 🔄 Compatibilité

### Ancien Format → Nouveau Format

| Ancien | Nouveau |
|--------|---------|
| `/uploads/filename.jpg` | `/api/destinations/uploads/filename.jpg` |
| `http://localhost:10000/uploads/filename.jpg` | `http://localhost:10000/api/destinations/uploads/filename.jpg` |

### Support Arrière

Le système gère automatiquement :
- Les anciens chemins (`uploads/`)
- Les nouveaux chemins standardisés
- Les URLs complètes existantes

## 🛠️ Maintenance

### Ajouter un nouveau type d'URL

1. Ajouter une méthode dans `UrlService`
2. Utiliser la méthode dans les contrôleurs/services
3. Documenter le format ici

### Modifier une URL existante

1. Mettre à jour la méthode concernée dans `UrlService`
2. Vérifier la compatibilité frontend
3. Mettre à jour la documentation

## 📝 Notes

- **Toutes les URLs sont absolues** pour éviter les problèmes de chemins relatifs
- **Le système est environnement-aware** et s'adapte automatiquement
- **Les URLs sont normalisées** pour éviter les doublons et incohérences
- **Le support Vercel Blob est transparent** pour le développeur

---

*Mis à jour le 02/03/2026*
