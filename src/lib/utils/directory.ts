import fs from 'fs/promises';
import path from 'path';
import type { ConfigParams, ConfigResponse } from '@/types';

export class DirectoryManager {
  private baseDir: string;
  private userConfigDir: string;
  private industryConfigDir: string;
  private baseConfigDir: string;

  constructor() {
    // For Vercel, use /tmp for user configs, but keep base and industry configs in cwd
    const isVercel = process.env.VERCEL === '1';
    
    // Base directory for user configurations
    this.baseDir = isVercel ? '/tmp' : process.cwd();
    this.userConfigDir = path.join(this.baseDir, 'data', 'users');

    // Base and industry configs always use cwd as they're part of the codebase
    this.industryConfigDir = path.join(process.cwd(), 'data', 'configurations', 'industry-configurations');
    this.baseConfigDir = path.join(process.cwd(), 'data', 'configurations', 'base-configurations');
  }

  /**
   * Get the configuration file path for a given params and file type
   */
  public getUserConfigFilePath(params: ConfigParams, fileType: 'config' | 'codesetvalues'): string {
    const { orgKey, moduleKey } = params;
    const fileName = fileType === 'config' ? 'config.csv' : 'codesetvalues.csv';
    
    // In Vercel, flatten the directory structure to avoid nested dirs in /tmp
    if (process.env.VERCEL === '1') {
      return path.join(this.userConfigDir, `${orgKey}_${moduleKey}_${fileName}`);
    }
    
    // In development, maintain the original directory structure
    return path.join(this.userConfigDir, orgKey, moduleKey, fileName);
  }

  /**
   * Initialize directory structure
   */
  public async initializeDirectories(): Promise<void> {
    try {
      // Only create user directory as it's the only writable one
      await fs.mkdir(this.userConfigDir, { recursive: true });
    } catch (error) {
      console.error('Error initializing directories:', error);
      throw new Error('Failed to initialize directories');
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
   * Create user configuration from template
   */
  public async createUserDirectory(params: ConfigParams): Promise<void> {
    const { orgKey, moduleKey, industry } = params;
    
    // In Vercel, we don't create nested directories
    if (process.env.VERCEL === '1') {
      await this.initializeDirectories();
    } else {
      // In development, create the full directory structure
      const userDir = path.join(this.userConfigDir, orgKey, moduleKey);
      await fs.mkdir(userDir, { recursive: true });
    }

    const files = ['config.csv', 'codesetvalues.csv'];
    
    for (const file of files) {
      const destPath = this.getUserConfigFilePath(params, file === 'config.csv' ? 'config' : 'codesetvalues');
      
      try {
        // Try to copy from industry configuration first
        const industryPath = path.join(this.industryConfigDir, industry, moduleKey, file);
        const industryContent = await fs.readFile(industryPath, 'utf-8');
        await fs.writeFile(destPath, industryContent, 'utf-8');
      } catch {
        try {
          // Fallback to base configuration
          const basePath = path.join(this.baseConfigDir, moduleKey, file);
          const baseContent = await fs.readFile(basePath, 'utf-8');
          await fs.writeFile(destPath, baseContent, 'utf-8');
        } catch (error) {
          console.error(`Failed to copy ${file} from base configuration:`, error);
          // Create empty file if neither exists
          await fs.writeFile(destPath, 'key,value\n', 'utf-8');
        }
      }
    }
  }

  /**
   * Helper method to read a configuration file
   */
  public async readConfigFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Error reading configuration file:', error);
      throw new Error('Failed to read configuration file');
    }
  }

  /**
   * Helper method to write a configuration file
   */
  public async writeConfigFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing configuration file:', error);
      throw new Error('Failed to write configuration file');
    }
  }
}