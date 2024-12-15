// src/lib/utils/SyncManager.ts
import fs from 'fs/promises';
import path from 'path';
import type { ConfigParams } from '@/types';

export class SyncManager {
  private primaryUserDir: string;
  private secondaryUserDir: string;

  constructor() {
    this.primaryUserDir = path.join(process.cwd(), 'data', 'users');
    // Set the path to your secondary location
    this.secondaryUserDir = 'C:/Users/ASUS/Downloads/project-bolt-sb1-sb1v1q/project/data/users';  // Update this path
  }

  /**
   * Ensure directories exist in both locations
   */
  private async ensureDirectories(params: ConfigParams): Promise<void> {
    const { orgKey, moduleKey } = params;
    
    const createDirs = async (baseDir: string) => {
      const orgDir = path.join(baseDir, orgKey);
      const moduleDir = path.join(orgDir, moduleKey);
      
      await fs.mkdir(orgDir, { recursive: true });
      await fs.mkdir(moduleDir, { recursive: true });
    };

    await Promise.all([
      createDirs(this.primaryUserDir),
      createDirs(this.secondaryUserDir)
    ]);
  }

  /**
   * Write configuration to both locations
   */
  public async syncConfiguration(
    params: ConfigParams,
    configContent: string,
    codesetContent: string
  ): Promise<void> {
    try {
      await this.ensureDirectories(params);

      const writeFiles = async (baseDir: string) => {
        const configPath = path.join(baseDir, params.orgKey, params.moduleKey, 'config.csv');
        const codesetPath = path.join(baseDir, params.orgKey, params.moduleKey, 'codesetvalues.csv');

        await Promise.all([
          fs.writeFile(configPath, configContent, 'utf-8'),
          fs.writeFile(codesetPath, codesetContent, 'utf-8')
        ]);
      };

      // Write to both locations
      await Promise.all([
        writeFiles(this.primaryUserDir),
        writeFiles(this.secondaryUserDir)
      ]);

      console.log('Configuration synced to both locations successfully');
    } catch (error) {
      console.error('Error syncing configurations:', error);
      throw error;
    }
  }

  /**
   * Check if configuration exists in secondary location
   */
  public async checkSecondaryConfig(orgKey: string, moduleKey: string): Promise<boolean> {
    try {
      const configPath = path.join(this.secondaryUserDir, orgKey, moduleKey, 'config.csv');
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration from secondary location
   */
  public async getSecondaryConfig(orgKey: string, moduleKey: string): Promise<{
    configContent: string;
    codesetContent: string;
  }> {
    const configPath = path.join(this.secondaryUserDir, orgKey, moduleKey, 'config.csv');
    const codesetPath = path.join(this.secondaryUserDir, orgKey, moduleKey, 'codesetvalues.csv');

    const [configContent, codesetContent] = await Promise.all([
      fs.readFile(configPath, 'utf-8'),
      fs.readFile(codesetPath, 'utf-8').catch(() => 'codeset,value\n')
    ]);

    return { configContent, codesetContent };
  }
}