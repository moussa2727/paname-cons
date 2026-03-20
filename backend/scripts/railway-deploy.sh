#!/bin/bash

echo "🚀 Déploiement du backend Paname Consulting sur Railway..."

# Vérifier si Railway CLI est installé
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI n'est pas installé. Installation en cours..."
    npm install -g @railway/cli
fi

# Se connecter à Railway (si nécessaire)
if ! railway whoami &> /dev/null; then
    echo "🔐 Veuillez vous connecter à Railway:"
    railway login
fi

# Créer le projet si nécessaire
echo "📦 Création du projet Railway..."
railway init --name "paname-consulting-backend"

# Ajouter les variables d'environnement requises
echo "⚙️ Configuration des variables d'environnement..."

# Variables obligatoires
railway variables set NODE_ENV=production
railway variables set PORT=10000
railway variables set HOST=0.0.0.0

# Database (Railway fournit automatiquement DATABASE_URL)
echo "🗄️ Configuration de la base de données PostgreSQL..."
railway add postgresql

# Redis pour les sessions et queues (optionnel mais recommandé)
echo "🔴 Configuration de Redis..."
railway add redis

# JWT secrets (générés automatiquement)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)

railway variables set JWT_SECRET=$JWT_SECRET
railway variables set JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
railway variables set COOKIE_SECRET=$COOKIE_SECRET
railway variables set JWT_EXPIRATION=15m
railway variables set JWT_REFRESH_EXPIRATION=7d

# Rate limiting
railway variables set THROTTLE_TTL=60
railway variables set THROTTLE_LIMIT=100

# Email (à configurer manuellement)
echo "📧 Configuration email (Nodemailer) - À configurer manuellement dans Railway Dashboard:"
echo "   - EMAIL_HOST"
echo "   - EMAIL_PORT"
echo "   - EMAIL_USER" 
echo "   - EMAIL_PASS"
echo "   - EMAIL_FROM"

# Cloudinary (à configurer manuellement)
echo "☁️ Configuration Cloudinary - À configurer manuellement dans Railway Dashboard:"
echo "   - CLOUDINARY_CLOUD_NAME"
echo "   - CLOUDINARY_API_KEY"
echo "   - CLOUDINARY_API_SECRET"

# Déployer
echo "🚀 Lancement du déploiement..."
railway up

echo "✅ Déploiement terminé!"
echo "🌐 URL du service: $(railway domain)"
echo "📊 Dashboard: https://railway.app/project/$(railway project id)"

# Attendre que le déploiement soit prêt
echo "⏳ Attente du démarrage du service..."
sleep 30

# Vérifier le health check
echo "🔍 Vérification du health check..."
HEALTH_URL="https://$(railway domain)/api/health"
if curl -f $HEALTH_URL; then
    echo "✅ Service déployé et fonctionnel!"
else
    echo "❌ Le service ne répond pas. Vérifiez les logs: railway logs"
fi
