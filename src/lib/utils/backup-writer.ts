import fs from 'fs/promises';
import path from 'path';
import type { ConfigParams } from '@/types';

export class BackupWriter {
  private configBackupPath: string;
  private codesetBackupPath: string;

  constructor() {
    // Absolute Linux paths
    this.configBackupPath = '/opt/tomcat/webapps/ROOT/upload/configfiles';
    this.codesetBackupPath = '/opt/tomcat/webapps/ROOT/upload/codefiles';

    // Log process info
    console.log('Process and directory info:', {
      uid: process.getuid?.(),
      gid: process.getgid?.(),
      configPath: this.configBackupPath,
      codesetPath: this.codesetBackupPath
    });
  }

  /**
   * Create backup filename using userKey and timestamp
   */
  private createBackupFilename(userKey: string): string {
    const sanitizedUserKey = userKey.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = new Date().toISOString()
      .replace(/[:\-T]/g, '')
      .slice(0, 14);
    return `${sanitizedUserKey}_${timestamp}.csv`;
  }

  /**
   * Write file and set proper permissions
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Write the file
      await fs.writeFile(filePath, content, {
        encoding: 'utf-8',
        mode: 0o664  // rw-rw-r-- permissions
      });

      // Since we're root, explicitly set ownership to tomcat:tomcat
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(`chown tomcat:tomcat "${filePath}"`, (error: any) => {
          if (error) {
            console.error('Error setting file ownership:', error);
            reject(error);
          } else {
            resolve(true);
          }
        });
      });

      console.log(`File written successfully: ${filePath}`);
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write backups to respective directories
   */
  public async writeBackups(
    params: ConfigParams,
    configContent?: string,
    codesetContent?: string
  ): Promise<void> {
    try {
      if (!params.userKey) {
        console.log('No userKey provided, skipping backup');
        return;
      }

      const filename = this.createBackupFilename(params.userKey);
      console.log('Writing backup with filename:', filename);

      // Write config backup if content provided
      if (configContent) {
        const configPath = path.join(this.configBackupPath, filename);
        console.log('Writing config to:', configPath);
        await this.writeFile(configPath, configContent);
      }

      // Write codeset backup if content provided
      if (codesetContent) {
        const codesetPath = path.join(this.codesetBackupPath, filename);
        console.log('Writing codeset to:', codesetPath);
        await this.writeFile(codesetPath, codesetContent);
      }

      console.log('Backup write operations completed successfully');

    } catch (error) {
      console.error('Error in writeBackups:', error);
      // Print full error details
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    }
  }

  /**
   * Clean up old files keeping only recent ones
   */
  public async cleanupOldFiles(): Promise<void> {
    try {
      const retentionDays = 30;
      const now = Date.now();
      const maxAge = retentionDays * 24 * 60 * 60 * 1000;

      const cleanDirectory = async (dirPath: string): Promise<void> => {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          if (!file.endsWith('.csv')) continue;
          
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            console.log('Deleted old backup:', file);
          }
        }
      };

      await Promise.all([
        cleanDirectory(this.configBackupPath),
        cleanDirectory(this.codesetBackupPath)
      ]);

    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}