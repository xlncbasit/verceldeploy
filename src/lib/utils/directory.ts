// src/lib/utils/directory.ts
import fs from 'fs/promises';
import path from 'path';
import type { ConfigParams, ConfigResponse } from '@/types';

export class DirectoryManager {
  private baseDir: string;
  private userConfigDir: string;
  private industryConfigDir: string;
  private baseConfigDir: string;

  constructor() {
    this.baseDir = process.cwd();
    this.userConfigDir = path.join(this.baseDir, 'data/users');
    this.industryConfigDir = path.join(this.baseDir, 'data/configurations/industry-configurations');
    this.baseConfigDir = path.join(this.baseDir, 'data/configurations/base-configurations');
  }

  /**
   * Get the configuration file path for a given params and file type
   */
  public getUserConfigFilePath(params: ConfigParams, fileType: 'config' | 'codesetvalues'): string {
    const { orgKey, moduleKey } = params;
    const fileName = fileType === 'config' ? 'config.csv' : 'codesetvalues.csv';
    return path.join(this.userConfigDir, orgKey, moduleKey, fileName);
  }

  /**
   * Initialize directory structure
   */
  public async initializeDirectories(): Promise<void> {
    const directories = [
      this.userConfigDir,
      this.industryConfigDir,
      this.baseConfigDir
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Check if user configuration exists
   */
  public async checkUserConfig(orgKey: string, moduleKey: string): Promise<boolean> {
    try {
      const configPath = this.getUserConfigFilePath({ orgKey, moduleKey } as ConfigParams, 'config');
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration path based on hierarchy
   */
  public async getConfigurationPath(params: ConfigParams): Promise<ConfigResponse> {
    const { orgKey, moduleKey, industry } = params;
  
    // Check user configuration
    const userPath = this.getUserConfigFilePath(params, 'config');
    try {
      await fs.access(userPath);
      console.log(`Configuration fetched from user path: ${userPath}`);
      return {
        exists: true,
        configPath: userPath,
        type: 'user'
      };
    } catch {}
  
    // Check industry configuration
    const industryPath = path.join(this.industryConfigDir, industry, moduleKey, 'config.csv');
    try {
      await fs.access(industryPath);
      console.log(`Configuration fetched from industry path: ${industryPath}`);
      return {
        exists: true,
        configPath: industryPath,
        type: 'industry'
      };
    } catch {}
  
    // Fallback to base configuration
    const basePath = path.join(this.baseConfigDir, moduleKey, 'config.csv');
    try {
      await fs.access(basePath);
      console.log(`Configuration fetched from base path: ${basePath}`);
      return {
        exists: true,
        configPath: basePath,
        type: 'base'
      };
    } catch {
      throw new Error(`No configuration found for module: ${moduleKey}`);
    }
  }
  

  /**
   * Create user directory and initialize with configurations
   */
  public async createUserDirectory(params: ConfigParams): Promise<void> {
    const { orgKey, moduleKey, industry } = params;
    const userDir = path.join(this.userConfigDir, orgKey, moduleKey);
    await fs.mkdir(userDir, { recursive: true });

    const files = ['config.csv', 'codesetvalues.csv'];
    
    for (const file of files) {
      const destPath = path.join(userDir, file);
      
      try {
        // Try industry config first
        const industryPath = path.join(this.industryConfigDir, industry, moduleKey, file);
        await fs.copyFile(industryPath, destPath);
      } catch {
        // Fallback to base config
        try {
          const basePath = path.join(this.baseConfigDir, moduleKey, file);
          await fs.copyFile(basePath, destPath);
        } catch (error) {
          console.error(`Failed to copy ${file} from base configuration:`, error);
          // Create empty file if neither exists
          await fs.writeFile(destPath, 'key,value\n', 'utf-8');
        }
      }
    }
  }
}