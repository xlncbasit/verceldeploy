import type { ConfigParams } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { DirectoryManager } from '../utils/directory';

interface ParsedResponse {
  configuration: string;
  codesets?: string;
}

export class ConfigWriter {
  private directoryManager: DirectoryManager;
  private configBackupPath: string;
  private codesetBackupPath: string;

  constructor() {
    this.directoryManager = new DirectoryManager();
    this.configBackupPath = '/opt/tomcat/webapps/ROOT/upload/configfiles';
    this.codesetBackupPath = '/opt/tomcat/webapps/ROOT/upload/codefiles';
  }

  private createBackupFilename(userKey: string): string {
    const sanitizedUserKey = userKey.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = new Date().toISOString()
      .replace(/[:\-T]/g, '')
      .slice(0, 14);
    return `${sanitizedUserKey}_${timestamp}.csv`;
  }

  private async writeBackup(content: string, directory: string, filename: string): Promise<void> {
    try {
      const backupPath = path.join(directory, filename);
      await fs.writeFile(backupPath, content, 'utf-8');
      console.log(`Backup written to: ${backupPath}`);
    } catch (error) {
      console.error(`Error writing backup to ${directory}:`, error);
      // Don't throw error for backup failures
    }
  }

  async writeFiles(params: ConfigParams, parsedResponse: ParsedResponse): Promise<void> {
    try {
      // Ensure directories are created
      await this.directoryManager.ensureDirectories(params);

      // Write configuration file
      const configPath = this.directoryManager.getUserConfigFilePath(params, 'config');
      await fs.writeFile(configPath, parsedResponse.configuration, 'utf-8');
      console.log(`Configuration written to: ${configPath}`);

      // Write codesets file if present
      if (parsedResponse.codesets) {
        const codesetPath = this.directoryManager.getUserConfigFilePath(params, 'codesetvalues');
        await fs.writeFile(codesetPath, parsedResponse.codesets, 'utf-8');
        console.log(`Codesets written to: ${codesetPath}`);
      }

      // Create backups if userKey exists
      if (params.userKey) {
        const backupFilename = this.createBackupFilename(params.userKey);
        
        // Backup config file
        await this.writeBackup(
          parsedResponse.configuration, 
          this.configBackupPath,
          backupFilename
        );

        // Backup codeset file if present
        if (parsedResponse.codesets) {
          await this.writeBackup(
            parsedResponse.codesets,
            this.codesetBackupPath,
            backupFilename
          );
        }
      }

    } catch (error) {
      console.error('Error writing files:', error);
      throw error;
    }
  }

  /**
   * Clean up old backup files (optional maintenance method)
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = retentionDays * 24 * 60 * 60 * 1000;

      // Helper function to clean directory
      const cleanDirectory = async (dirPath: string): Promise<void> => {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          if (!file.endsWith('.csv')) continue;
          
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            console.log(`Deleted old backup: ${file}`);
          }
        }
      };

      // Clean both backup directories
      await Promise.all([
        cleanDirectory(this.configBackupPath),
        cleanDirectory(this.codesetBackupPath)
      ]);

      console.log('Backup cleanup completed');
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      // Don't throw for cleanup failures
    }
  }
}