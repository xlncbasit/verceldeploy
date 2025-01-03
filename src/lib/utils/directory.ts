//src/lib/utils/directory.ts
import fs from 'fs/promises';
import * as fsPromises from 'fs';
import path from 'path';
import type { ConfigParams, ConfigResponse, ConfigFiles } from '@/types';

interface DirectoryError extends Error {
  code?: string;
}

export class DirectoryManager {
  private baseDir: string;
  private userConfigDir: string;
  private industryConfigDir: string;
  private baseConfigDir: string;

  constructor() {
    this.baseDir = process.cwd();
    this.userConfigDir = path.join(this.baseDir, 'data', 'users');
    this.industryConfigDir = path.join(this.baseDir, 'data', 'configurations', 'industry-configurations');
    this.baseConfigDir = path.join(this.baseDir, 'data', 'configurations', 'base-configurations');
    console.log('Directory initialized with basedir:', this.baseDir);
  }

  /**
   * Clean and validate parameters
   */
  private cleanParams(params: ConfigParams): ConfigParams {
    return {
      orgKey: params.orgKey?.trim() || '',
      moduleKey: params.moduleKey?.trim() || '',
      industry: params.industry?.replace(/\s+/g, '_').trim() || '',
      subIndustry: params.subIndustry?.replace(/\s+/g, '_').trim() || '',
      userKey: params.userKey?.trim() || ''
    };
  }

  /**
   * Validate configuration parameters
   */
  private validateParams(params: ConfigParams, requireIndustry: boolean = true): void {
    console.log('\n=== Validating Parameters ===');
    const cleanedParams = this.cleanParams(params);
    console.log('Cleaned parameters:', cleanedParams);
    
    if (!cleanedParams.orgKey) throw new Error('Organization key is required');
    if (!cleanedParams.moduleKey) throw new Error('Module key is required');
    if (requireIndustry && !cleanedParams.industry) throw new Error('Industry is required');
    
    console.log('Parameters validation successful');
    console.log('============================\n');
  }

  /**
   * Ensure all required directories exist
   */
  public async ensureDirectories(params?: ConfigParams): Promise<void> {
    try {
      console.log('\n=== Creating Directories ===');
      // Create base directories
      await this.createDirectory(this.userConfigDir);
      await this.createDirectory(this.industryConfigDir);
      await this.createDirectory(this.baseConfigDir);

      // If params are provided, create org and module directories
      if (params?.orgKey) {
        const cleanedParams = this.cleanParams(params);
        const orgDir = path.join(this.userConfigDir, cleanedParams.orgKey);
        await this.createDirectory(orgDir);

        if (cleanedParams.moduleKey) {
          const moduleDir = path.join(orgDir, cleanedParams.moduleKey);
          await this.createDirectory(moduleDir);
        }
      }
      console.log('=========================\n');
    } catch (error) {
      console.error('Error ensuring directories:', error);
      throw error;
    }
  }

  private async createDirectory(dirPath: string): Promise<void> {
    try {
      if (!fsPromises.existsSync(dirPath)) {
        console.log(`Creating directory: ${dirPath}`);
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Successfully created directory: ${dirPath}`);
      } else {
        console.log(`Directory already exists: ${dirPath}`);
      }
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Get the configuration file path for a given params and file type
   */
  public getUserConfigFilePath(params: ConfigParams, fileType: 'config' | 'codesetvalues'): string {
    try {
      console.log('\n=== Getting Config File Path ===');
      console.log('Input parameters:', params);
      console.log('File type:', fileType);

      // For checking existing config, we don't require industry
      const requireIndustry = fileType === 'codesetvalues';
      this.validateParams(params, requireIndustry);

      const cleanedParams = this.cleanParams(params);
      const fileName = fileType === 'config' ? 'config.csv' : 'codesetvalues.csv';
      
      const filePath = path.join(
        this.userConfigDir,
        cleanedParams.orgKey,
        cleanedParams.moduleKey,
        fileName
      );

      console.log('Generated file path:', filePath);
      console.log('============================\n');
      
      return filePath;
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Error generating file path:', err);
      throw new Error(`Failed to generate file path: ${err.message}`);
    }
  }

  /**
   * Check if user configuration exists
   */
  public async checkUserConfig(orgKey: string, moduleKey: string): Promise<boolean> {
    try {
      console.log('\n=== Checking User Config ===');
      console.log('Organization Key:', orgKey);
      console.log('Module Key:', moduleKey);

      if (!orgKey?.trim() || !moduleKey?.trim()) {
        throw new Error('Invalid parameters for config check');
      }

      // Create minimal params for file path generation
      const params: ConfigParams = {
        orgKey: orgKey.trim(),
        moduleKey: moduleKey.trim(),
        industry: 'dummy', // Not required for config check
        subIndustry: '',
        userKey: ''
      };

      const configPath = this.getUserConfigFilePath(params, 'config');
      
      try {
        await fs.access(configPath);
        console.log('Config exists at:', configPath);
        console.log('=========================\n');
        return true;
      } catch {
        console.log('Config does not exist at:', configPath);
        console.log('=========================\n');
        return false;
      }
    } catch (error: unknown) {
      const err = error as DirectoryError;
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Get configuration path based on hierarchy
   */
  public async getConfigurationPath(params: ConfigParams): Promise<ConfigResponse> {
    try {
      this.validateParams(params);
      const { orgKey, moduleKey, industry } = params;
      
      // Ensure base directories exist
      await this.ensureDirectories(params);

      // Check user configuration
      const userPath = this.getUserConfigFilePath(params, 'config');
      try {
        await fs.access(userPath);
        console.log('Found user configuration at:', userPath);
        return {
          exists: true,
          configPath: userPath,
          type: 'user'
        };
      } catch {
        console.log('No user configuration found, checking industry...');
      }

      // Check industry configuration
      const industryPath = path.join(this.industryConfigDir, industry, moduleKey, 'config.csv');
      try {
        await fs.access(industryPath);
        console.log('Found industry configuration at:', industryPath);
        return {
          exists: true,
          configPath: industryPath,
          type: 'industry'
        };
      } catch {
        console.log('No industry configuration found, checking base...');
      }

      // Check base configuration
      const basePath = path.join(this.baseConfigDir, moduleKey, 'config.csv');
      try {
        await fs.access(basePath);
        console.log('Found base configuration at:', basePath);
        return {
          exists: true,
          configPath: basePath,
          type: 'base'
        };
      } catch {
        throw new Error(`No configuration found for module: ${moduleKey}`);
      }
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Failed to get configuration path:', err);
      throw err;
    }
  }

  /**
   * Get both configuration and codeset files
   */
  public async getRawConfigurations(params: ConfigParams): Promise<ConfigFiles> {
    try {
      this.validateParams(params);
      console.log('Getting raw configurations for:', params);

      const configResponse = await this.getConfigurationPath(params);
      console.log('Configuration type:', configResponse.type);

      // Read configuration file
      const configContent = await fs.readFile(configResponse.configPath, 'utf-8');
      if (!configContent) {
        throw new Error('Configuration file is empty');
      }

      // Read or create codeset content
      let codesetContent: string;
      try {
        const codesetPath = this.getCodesetPath(configResponse.type, params);
        codesetContent = await fs.readFile(codesetPath, 'utf-8');
      } catch (error) {
        console.log('No existing codeset, using empty structure');
        codesetContent = 'codeset,value\n';
      }

      return {
        type: configResponse.type,
        configContent,
        codesetContent
      };
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Failed to get raw configurations:', err);
      throw new Error(`Configuration retrieval failed: ${err.message}`);
    }
  }

  /**
   * Get template files from industry or base configuration
   */
  private async getTemplateFiles(params: ConfigParams): Promise<ConfigFiles> {
    try {
      this.validateParams(params);
      const { industry, moduleKey } = params;

      // Try industry templates first
      try {
        const industryConfigPath = path.join(this.industryConfigDir, industry, moduleKey, 'config.csv');
        const industryCodesetPath = path.join(this.industryConfigDir, industry, moduleKey, 'codesetvalues.csv');
        
        const configContent = await fs.readFile(industryConfigPath, 'utf-8');
        const codesetContent = await fs.readFile(industryCodesetPath, 'utf-8');
        
        if (!configContent.trim()) {
          throw new Error('Industry configuration file is empty');
        }
        
        console.log('Using industry templates');
        return { type: 'industry', configContent, codesetContent };
      } catch (error) {
        console.log('No industry templates, falling back to base');
      }

      // Fall back to base templates
      const baseConfigPath = path.join(this.baseConfigDir, moduleKey, 'config.csv');
      const baseCodesetPath = path.join(this.baseConfigDir, moduleKey, 'codesetvalues.csv');
      
      const configContent = await fs.readFile(baseConfigPath, 'utf-8');
      if (!configContent.trim()) {
        throw new Error('Base configuration file is empty');
      }

      const codesetContent = await fs.readFile(baseCodesetPath, 'utf-8')
        .catch(() => 'codeset,value\n');

      console.log('Using base templates');
      return { type: 'base', configContent, codesetContent };
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Failed to get template files:', err);
      throw new Error(`Template retrieval failed: ${err.message}`);
    }
  }

  private getCodesetPath(type: 'user' | 'industry' | 'base', params: ConfigParams): string {
    try {
      this.validateParams(params);
      const { orgKey, moduleKey, industry } = params;

      switch (type) {
        case 'user':
          return this.getUserConfigFilePath(params, 'codesetvalues');
        case 'industry':
          return path.join(this.industryConfigDir, industry, moduleKey, 'codesetvalues.csv');
        case 'base':
          return path.join(this.baseConfigDir, moduleKey, 'codesetvalues.csv');
        default:
          throw new Error('Invalid configuration type');
      }
    } catch (error: unknown) {
      const err = error as DirectoryError;
      throw new Error(`Failed to get codeset path: ${err.message}`);
    }
  }

  /**
   * Create user directory and copy template files
   */
  public async createUserDirectory(params: ConfigParams): Promise<void> {
    try {
      this.validateParams(params);
      
      // Ensure all directories exist, including org and module
      await this.ensureDirectories(params);
      
      // Get and validate template files
      const templates = await this.getTemplateFiles(params);
      if (!templates.configContent || !templates.codesetContent) {
        throw new Error('Invalid template files');
      }

      // Write configurations
      await this.writeConfigurations(params, templates.configContent, templates.codesetContent);
      
      // Verify files were created
      const configPath = this.getUserConfigFilePath(params, 'config');
      const codesetPath = this.getUserConfigFilePath(params, 'codesetvalues');
      
      await Promise.all([
        fs.access(configPath),
        fs.access(codesetPath)
      ]);

      console.log('User directory setup completed successfully');
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Failed to create user directory:', err);
      throw new Error(`User directory creation failed: ${err.message}`);
    }
  }

  /**
   * Write configurations with directory creation
   */
  public async writeConfigurations(
    params: ConfigParams,
    configContent: string,
    codesetContent: string
  ): Promise<void> {
    try {
      this.validateParams(params);
      
      if (!configContent?.trim() || !codesetContent?.trim()) {
        throw new Error('Invalid configuration content');
      }

      // Ensure all directories exist, including org and module
      await this.ensureDirectories(params);

      const configPath = this.getUserConfigFilePath(params, 'config');
      const codesetPath = this.getUserConfigFilePath(params, 'codesetvalues');

      // Write files
      await Promise.all([
        fs.writeFile(configPath, configContent, 'utf-8'),
        fs.writeFile(codesetPath, codesetContent, 'utf-8')
      ]);

      // Verify written content
      const [writtenConfig, writtenCodeset] = await Promise.all([
        fs.readFile(configPath, 'utf-8'),
        fs.readFile(codesetPath, 'utf-8')
      ]);

      if (writtenConfig !== configContent || writtenCodeset !== codesetContent) {
        throw new Error('File content verification failed');
      }

      console.log('Configuration files written and verified successfully');
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Failed to write configurations:', err);
      throw new Error(`Configuration write failed: ${err.message}`);
    }
  }

  /**
   * Get raw configuration content
   */
  public async getRawConfiguration(params: ConfigParams): Promise<string> {
    try {
      this.validateParams(params);
      const configResponse = await this.getConfigurationPath(params);
      const content = await fs.readFile(configResponse.configPath, 'utf-8');
      
      if (!content.trim()) {
        throw new Error('Configuration file is empty');
      }

      return content;
    } catch (error: unknown) {
      const err = error as DirectoryError;
      console.error('Failed to get raw configuration:', err);
      throw new Error(`Raw configuration retrieval failed: ${err.message}`);
    }
  }
}