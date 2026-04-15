import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class DatabaseBackupCron {
  private readonly logger = new Logger(DatabaseBackupCron.name);
  private readonly backupPath: string;

  constructor(private configService: ConfigService) {
    this.backupPath = '/data/backups';

    this.createBackupDirectory();
  }

  private createBackupDirectory() {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
      this.logger.log(`Dossier backups créé: ${this.backupPath}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async backupDatabase() {
    this.logger.log(`💾 Début de la sauvegarde de la base de données...`);
    this.logger.log(`Chemin de sauvegarde: ${this.backupPath}`);

    try {
      const date = new Date();
      const filename = `backup-${date.toISOString().split('T')[0]}.sql`;
      const filepath = path.join(this.backupPath, filename);

      const dbUrl = this.configService.get<string>('DATABASE_URL');
      if (!dbUrl) {
        throw new Error('DATABASE_URL non configuré');
      }

      // Extraire les infos de connexion
      const matches = dbUrl.match(
        /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/,
      );
      if (!matches) {
        throw new Error('Format DATABASE_URL invalide');
      }

      const [, user, password, host, port, database] = matches;

      // Commande pg_dump adaptée à la plateforme
      const isWindows = process.platform === 'win32';
      let command: string;

      if (isWindows) {
        // Windows: utiliser le chemin complet de pg_dump
        const pgDumpPath =
          '"c:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"';
        command = `set "PGPASSWORD=${password}" && ${pgDumpPath} -U ${user} -h ${host} -p ${port} -d ${database} -f "${filepath}"`;
      } else {
        // Unix/Linux/Mac/Railway: syntaxe standard
        // Sur Railway, pg_dump est généralement disponible dans le PATH
        command = `PGPASSWORD="${password}" pg_dump -U ${user} -h ${host} -p ${port} ${database} > ${filepath}`;
      }

      const platform = isWindows ? 'Windows' : 'Unix/Railway';
      this.logger.log(
        `Exécution de la sauvegarde vers ${filepath} (${platform})`,
      );

      try {
        await execAsync(command, { timeout: 300000 });
      } catch (error) {
        // En cas d'échec, essayer une alternative pour Railway
        if (!isWindows) {
          this.logger.warn(
            'Tentative avec commande alternative pour Railway...',
          );
          const altCommand = `pg_dump ${database} -U ${user} -h ${host} -p ${port} > ${filepath}`;
          await execAsync(`PGPASSWORD="${password}" ${altCommand}`, {
            timeout: 300000,
          });
        } else {
          throw error;
        }
      }

      this.logger.log(
        `Sauvegarde réussie: ${filename} (${fs.statSync(filepath).size} bytes)`,
      );

      this.cleanupOldBackups();
    } catch (error) {
      this.logger.error(`Erreur sauvegarde: ${(error as Error).message}`);
      this.logger.error(`Stack: ${(error as Error).stack}`);
    }
  }

  private cleanupOldBackups() {
    try {
      if (!fs.existsSync(this.backupPath)) {
        this.logger.warn(`Dossier backups n'existe pas: ${this.backupPath}`);
        return;
      }

      const files = fs.readdirSync(this.backupPath);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.backupPath, file);
        const stats = fs.statSync(filepath);

        if (now - stats.mtimeMs > sevenDays) {
          fs.unlinkSync(filepath);
          deletedCount++;
          this.logger.log(`Ancien backup supprimé: ${file}`);
        }
      }
      if (deletedCount > 0) {
        this.logger.log(`${deletedCount} anciens backups supprimés`);
      }
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage backups: ${(error as Error).message}`,
      );
    }
  }
}
