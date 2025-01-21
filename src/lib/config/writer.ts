// src/lib/config/writer.ts
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
  private secondaryUserDir: string;

  constructor() {
    this.directoryManager = new DirectoryManager();
    this.configBackupPath = '/opt/tomcat/webapps/ROOT/upload/configfiles';
    this.codesetBackupPath = '/opt/tomcat/webapps/ROOT/upload/codefiles';
    this.secondaryUserDir = 'C:/Users/ASUS/Downloads/project-bolt-sb1-sb1v1q/project/data/users';
  }

  private validateHeaders(csvContent: string, orgKey: string): void {
    const lines = csvContent.split('\n');
    if (lines.length < 1) {
      throw new Error('Invalid CSV format: insufficient lines');
    }

    const headerCells = lines[0].split(',');
    if (headerCells.length < 3) {
      throw new Error('Invalid CSV format: insufficient columns in header');
    }

    // Validate B1 cell has "Customization"
    if (headerCells[1] !== 'Customization') {
      throw new Error('Invalid header: Cell B1 must contain "Customization"');
    }

    // Validate C1 cell has the correct orgKey
    if (headerCells[2] !== orgKey) {
      throw new Error(`Invalid header: Cell C1 must contain the organization key "${orgKey}"`);
    }

    console.log('Header validation passed successfully');
  }

  private validateCodesetContent(content: string, orgKey: string): void {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 1) {
      throw new Error('Invalid codeset format: empty content');
    }

    // For each row where column A contains "codeset"
    lines.forEach((line, index) => {
      const cells = line.split(',').map(cell => cell.trim());
      if (cells[0]?.toLowerCase() === 'codeset') {
        // Check if column E (index 4) contains the orgKey
        if (cells[4] !== orgKey) {
          throw new Error(
            `Invalid codeset format: Row ${index + 1} has "codeset" in column A but "${cells[4] || ''}" in column E (expected "${orgKey}")`
          );
        }
      }
    });
  }

  private modifyHeaders(csvContent: string, orgKey: string): string {
    const lines = csvContent.split('\n');
    
    if (lines.length < 1) {
      throw new Error('Invalid CSV format: insufficient lines');
    }

    const headerCells = lines[0].split(',');
    
    if (headerCells.length < 3) {
      throw new Error('Invalid CSV format: insufficient columns in header');
    }

    // Update header cells
    headerCells[1] = 'Customization';
    headerCells[2] = orgKey;

    // Reconstruct the file
    lines[0] = headerCells.join(',');
    return lines.join('\n');
  }

  private modifyCodesetContent(content: string, orgKey: string): string {
    const lines = content.split('\n');
    const modifiedLines = lines.map(line => {
      const cells = line.split(',').map(cell => cell.trim());
      if (cells[0]?.toLowerCase() === 'codeset') {
        cells[4] = orgKey;
      }
      return cells.join(',');
    });
    return modifiedLines.join('\n');
  }

  async writeFiles(params: ConfigParams, parsedResponse: ParsedResponse): Promise<void> {
    try {
      // Ensure directories exist
      await this.directoryManager.ensureDirectories(params);
      
      // Handle configuration file
      const modifiedConfig = this.modifyHeaders(parsedResponse.configuration, params.orgKey);
      this.validateHeaders(modifiedConfig, params.orgKey);
      const configPath = this.directoryManager.getUserConfigFilePath(params, 'config');
      await fs.writeFile(configPath, modifiedConfig, 'utf-8');
      console.log('Configuration file written successfully');

      // Handle codesets if present and not undefined
      const codesets = parsedResponse.codesets;
      if (typeof codesets === 'string') {
        // Check for various "no changes" messages
        const noChangeIndicators = [
          "Previous codeset content remains unchanged",
          "No changes to existing codesets required",
          "Previous",
          "remain",
          "exactly the same",
          "codeset entries remain"
        ];

        // If any of these indicators are found, skip codeset writing
        if (noChangeIndicators.some(indicator => 
            codesets.toLowerCase().includes(indicator.toLowerCase()))) {
          console.log("Detected no changes required for codesets - skipping codeset update");
          return;
        }

        // Only proceed if we have actual codeset changes
        const modifiedCodesets = this.modifyCodesetContent(codesets, params.orgKey);
        this.validateCodesetContent(modifiedCodesets, params.orgKey);
        
        const codesetPath = this.directoryManager.getUserConfigFilePath(params, 'codesetvalues');
        await fs.writeFile(codesetPath, modifiedCodesets, 'utf-8');
        console.log('New codeset content written successfully');
      }

      // Create backups if needed
      if (params.userKey) {
        const backupFilename = this.createBackupFilename(params.userKey);
        await this.writeBackup(modifiedConfig, this.configBackupPath, backupFilename);
        
        if (parsedResponse.codesets) {
          await this.writeBackup(
            parsedResponse.codesets, 
            this.codesetBackupPath, 
            backupFilename
          );
        }
      }

      // Write to secondary location if configured
      if (this.secondaryUserDir) {
        await this.writeToSecondaryLocation(params, {
          configuration: modifiedConfig,
          codesets: parsedResponse.codesets
        });
      }

    } catch (error) {
      console.error('Error writing files:', error);
      throw error;
    }
  }

  private createBackupFilename(userKey: string): string {
    const sanitizedUserKey = userKey.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = new Date().toISOString()
      .replace(/[:\-T]/g, '')
      .slice(0, 14);
    return `config.csv`;
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

  private async writeToSecondaryLocation(params: ConfigParams, parsedResponse: ParsedResponse): Promise<void> {
    try {
      await this.ensureSecondaryDirectories(params);

      const secondaryConfigPath = path.join(
        this.secondaryUserDir,
        params.orgKey,
        params.moduleKey,
        'config.csv'
      );
      await fs.writeFile(secondaryConfigPath, parsedResponse.configuration, 'utf-8');
      console.log(`Configuration written to secondary location: ${secondaryConfigPath}`);

      if (parsedResponse.codesets) {
        const secondaryCodesetPath = path.join(
          this.secondaryUserDir,
          params.orgKey,
          params.moduleKey,
          'codesetvalues.csv'
        );
        await fs.writeFile(secondaryCodesetPath, parsedResponse.codesets, 'utf-8');
        console.log(`Codesets written to secondary location: ${secondaryCodesetPath}`);
      }
    } catch (error) {
      console.error('Error writing to secondary location:', error);
      throw error;
    }
  }

  private async ensureSecondaryDirectories(params: ConfigParams): Promise<void> {
    const { orgKey, moduleKey } = params;
    const orgDir = path.join(this.secondaryUserDir, orgKey);
    const moduleDir = path.join(orgDir, moduleKey);

    try {
      await fs.mkdir(orgDir, { recursive: true });
      await fs.mkdir(moduleDir, { recursive: true });
      console.log(`Secondary directories created: ${moduleDir}`);
    } catch (error) {
      console.error('Error creating secondary directories:', error);
      throw error;
    }
  }

  async checkSecondaryConfig(orgKey: string, moduleKey: string): Promise<boolean> {
    try {
      const configPath = path.join(this.secondaryUserDir, orgKey, moduleKey, 'config.csv');
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSecondaryConfig(orgKey: string, moduleKey: string): Promise<{
    configContent: string;
    codesetContent: string;
  }> {
    try {
      const configPath = path.join(this.secondaryUserDir, orgKey, moduleKey, 'config.csv');
      const codesetPath = path.join(this.secondaryUserDir, orgKey, moduleKey, 'codesetvalues.csv');

      const [configContent, codesetContent] = await Promise.all([
        fs.readFile(configPath, 'utf-8'),
        fs.readFile(codesetPath, 'utf-8').catch(() => 'codeset,value\n')
      ]);

      return { configContent, codesetContent };
    } catch (error) {
      console.error('Error reading secondary config:', error);
      throw error;
    }
  }

  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    try {
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
            console.log(`Deleted old backup: ${file}`);
          }
        }
      };

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