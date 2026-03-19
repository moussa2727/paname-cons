#!/bin/bash

# ==================== SCRIPT DE DÉMARRAGE AVEC BACKUPS ====================
# Lance l'application NestJS et le service cron pour les backups

set -e

echo "🚀 Démarrage de l'application Paname Consulting Backend..."

# Configuration des backups
if [ "$ENABLE_BACKUPS" = "true" ]; then
    echo "📦 Activation des backups automatiques..."
    
    # Configuration de cron si demandé
    if [ "$SETUP_CRON" = "true" ]; then
        echo "⚙️  Configuration de cron..."
        /app/scripts/setup-cron.sh
        
        # Démarrage du service cron en arrière-plan
        echo "🕐 Démarrage du service cron..."
        crond -b -l 2
        
        echo "✅ Cron démarré avec les backups automatiques"
    fi
    
    # Backup initial si demandé
    if [ "$INITIAL_BACKUP" = "true" ]; then
        echo "🔄 Exécution d'un backup initial..."
        /app/scripts/backup.sh
    fi
else
    echo "⏸️  Backups désactivés"
fi

echo "🌐 Démarrage du serveur NestJS..."

# Démarrage de l'application principale
exec node dist/src/main.js
