import * as fs from 'fs';
import * as path from 'path';
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logDir: string;
  private logRetentionDays: number = 3;
  
  private readonly colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };

  constructor() {
    this.logDir = process.env.LOG_DIR || './logs';
    this.logRetentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '3', 10);
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Nettoyer les anciens logs au démarrage
    this.cleanOldLogs();
  }

  log(message: string, context?: string) {
    this.writeLog('INFO', message, context, this.colors.green);
  }

  error(message: string, context?: string, stack?: string) {
    this.writeLog('ERROR', message, context, this.colors.red, stack);
  }

  warn(message: string, context?: string) {
    this.writeLog('WARN', message, context, this.colors.yellow);
  }

  debug(message: string, context?: string) {
    this.writeLog('DEBUG', message, context, this.colors.blue);
  }

  verbose(message: string, context?: string) {
    this.writeLog('VERBOSE', message, context, this.colors.cyan);
  }

  /**
   * Nettoie les fichiers de log plus anciens que la période de rétention
   */
  private cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const retentionMs = this.logRetentionDays * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        // Si le fichier est plus vieux que la période de rétention, le supprimer
        if (now - stats.mtimeMs > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`${this.colors.yellow}[Logger] Fichier de log supprimé: ${file}${this.colors.reset}`);
        }
      });
    } catch (err) {
      console.error('Erreur lors du nettoyage des logs:', err);
    }
  }

  private writeLog(level: string, message: string, context?: string, colorCode?: string, stack?: string) {
    const timestamp = new Date().toISOString();
    
    // Message sans couleur pour le fichier
    const logMessagePlain = `[${timestamp}] [${level}] ${context ? `[${context}]` : ''} ${message}${stack ? '\n' + stack : ''}`;
    
    // Message coloré pour la console
    const logMessageColored = `${colorCode || this.colors.reset}[${timestamp}] [${level}] ${context ? `[${context}]` : ''} ${message}${stack ? '\n' + stack : ''}${this.colors.reset}`;
    
    // Générer le nom du fichier avec la date
    const dateStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const logFileName = `${dateStr}-${process.env.LOG_FILE_NAME || 'app.log'}`;
    const logFile = path.join(this.logDir, logFileName);
    
    try {
      const separator = '\n\n\n';
      fs.appendFileSync(logFile, separator + logMessagePlain + '\n');
    } catch (err) {
      console.error('Erreur d\'écriture dans les logs:', err);
    }
    
    // Afficher dans la console (avec couleurs)
    console.log(logMessageColored);
  }
}
