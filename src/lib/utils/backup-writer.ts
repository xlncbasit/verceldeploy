import fs from 'fs/promises';
import path from 'path';
import type { ConfigParams } from '@/types';

export class BackupWriter {
  private configBackupPath: string;
  private codesetBackupPath: string;

  constructor() {
    // Linux paths for GCP VM
    this.configBackupPath = '/opt/tomcat/webapps/ROOT/upload/configfiles';
    this.codesetBackupPath = '/opt/tomcat/webapps/ROOT/upload/codefiles';
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
   * Ensure directory exists with proper permissions
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      try {
        // Directory doesn't exist, create it with proper permissions (755)
        await fs.mkdir(dirPath, { 
          recursive: true, 
          mode: 0o755  // rwxr-xr-x permissions
        });
        console.log(`Created directory: ${dirPath}`);
      } catch (mkdirError) {
        console.error(`Failed to create directory ${dirPath}:`, mkdirError);
        throw mkdirError;
      }
    }
  }

  /**
   * Write file with proper permissions
   */
  private async writeFileWithPermissions(
    filePath: string, 
    content: string
  ): Promise<void> {
    await fs.writeFile(filePath, content, {
      encoding: 'utf-8',
      mode: 0o644  // rw-r--r-- permissions
    });
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

      // Ensure directories exist with proper permissions
      await this.ensureDirectory(this.configBackupPath);
      await this.ensureDirectory(this.codesetBackupPath);

      const filename = this.createBackupFilename(params.userKey);

      // Write config backup if content provided
      if (configContent) {
        const configPath = path.join(this.configBackupPath, filename);
        await this.writeFileWithPermissions(configPath, configContent);
        console.log('Config backup written:', configPath);
      }

      // Write codeset backup if content provided
      if (codesetContent) {
        const codesetPath = path.join(this.codesetBackupPath, filename);
        await this.writeFileWithPermissions(codesetPath, codesetContent);
        console.log('Codeset backup written:', codesetPath);
      }

    } catch (error) {
      console.error('Error writing backups:', error);
      // Print more detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      // Log error but don't throw - backup failure shouldn't stop main operations
      console.log('Continuing without backup');
    }
  }

  /**
   * Verify file was written successfully
   */
  private async verifyFile(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      const stats = await fs.stat(filePath);
      return stats.size > 0;
    } catch (error) {
      console.error(`File verification failed for ${filePath}:`, error);
      return false;
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

      // Helper function to clean directory
      const cleanDirectory = async (dirPath: string): Promise<void> => {
        try {
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
        } catch (error) {
          console.error(`Error cleaning directory ${dirPath}:`, error);
        }
      };

      await Promise.all([
        cleanDirectory(this.configBackupPath),
        cleanDirectory(this.codesetBackupPath)
      ]);

      console.log('Backup cleanup completed');

    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}