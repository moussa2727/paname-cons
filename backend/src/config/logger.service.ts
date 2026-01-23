// LoggerService supprimé - utilisation des logs par défaut de NestJS
// Ce fichier est conservé pour éviter les erreurs d'import mais ne fait rien
export class LoggerService {
  log(message: string, context?: string) {
    console.log(`[${context || 'App'}] ${message}`);
  }

  error(message: string, context?: string, stack?: string) {
    console.error(`[${context || 'App'}] ${message}`, stack || '');
  }

  warn(message: string, context?: string) {
    console.warn(`[${context || 'App'}] ${message}`);
  }

  debug(message: string, context?: string) {
    console.debug(`[${context || 'App'}] ${message}`);
  }

  verbose(message: string, context?: string) {
    console.log(`[${context || 'App'}] ${message}`);
  }
}
