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

  private ensureEmptyLines(content: string): string {
    const lines = content.split('\n');
    const numberOfColumns = lines[0].split(',').length;
    const emptyLine = ','.repeat(numberOfColumns - 1); // One less comma than columns
    
    // Find module line and header line indices
    const moduleLineIndex = lines.findIndex(line => line.startsWith('module,'));
    const headerLineIndex = lines.findIndex(line => line.includes('Field Code,'));
    
    if (moduleLineIndex === -1 || headerLineIndex === -1) {
      throw new Error('Invalid configuration format: missing module or header line');
    }

    // Ensure empty line after module line
    if (moduleLineIndex + 1 >= lines.length || lines[moduleLineIndex + 1].trim() !== emptyLine) {
      lines.splice(moduleLineIndex + 1, 0, emptyLine);
    }

    // Ensure empty line after header line
    if (headerLineIndex + 1 >= lines.length || lines[headerLineIndex + 1].trim() !== emptyLine) {
      lines.splice(headerLineIndex + 1, 0, emptyLine);
    }

    return lines.join('\n');
  }

  private processCodesetContent(content: string, orgKey: string): string {
    const lines = content.split('\n');
    const processedLines: string[] = [];
    
    // Process header
    if (lines.length > 0) {
      const headerLine = lines[0].replace('FIELDMOBI_DEFAULT', orgKey);
      processedLines.push(headerLine);
      
      // Preserve empty line after header if exists
      if (lines[1]?.trim() === '') {
        processedLines.push('');
      }
    }

    // Process data lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Preserve empty lines
      if (!line.trim()) {
        processedLines.push(line);
        continue;
      }

      const cells = line.split(',').map(cell => cell.trim());
      
      if (/^\d+/.test(cells[0])) {
        const type = cells[1];
        const code = cells[4];
        const description = cells[5];
        const newLine = `${type},${code},${description},,${orgKey}`;
        processedLines.push(newLine);
      } else {
        const modifiedLine = line.replace('FIELDMOBI_DEFAULT', orgKey);
        processedLines.push(modifiedLine);
      }
    }

    return processedLines.join('\n');
  }

  private modifyConfigContent(content: string, orgKey: string): string {
    const lines = content.split('\n');
    const numberOfColumns = lines[3]?.split(',').length || 33; // Use Field Code line for column count
    const emptyLine = ','.repeat(numberOfColumns - 1);
   
    // Preserve original empty lines
    const emptyLines = lines
      .map((line, index) => this.isEmptyLine(line) ? index : null)
      .filter((index): index is number => index !== null);
   
    // Get key line indices
    const moduleLineIndex = lines.findIndex(line => line.startsWith('module,'));
    const fieldCodeLineIndex = lines.findIndex(line => line.startsWith('Field Code,'));
    
    if (moduleLineIndex === -1) throw new Error('Module line missing');
    if (fieldCodeLineIndex === -1) throw new Error('Field Code header missing');
   
    // Update module line keeping original structure
    const moduleCells = lines[moduleLineIndex].split(',');
    moduleCells[1] = 'Customization';
    moduleCells[2] = orgKey;
    lines[moduleLineIndex] = moduleCells.join(',');
   
    // Ensure empty lines at expected positions
    if (!emptyLines.includes(0)) lines.unshift(emptyLine);
    if (!emptyLines.includes(fieldCodeLineIndex + 1)) {
      lines.splice(fieldCodeLineIndex + 1, 0, emptyLine);
    }
   
    return lines.join('\n');
   }

  async writeFiles(params: ConfigParams, parsedResponse: ParsedResponse): Promise<void> {
    try {
      await this.directoryManager.ensureDirectories(params);
      
      // Process configuration
      const modifiedConfig = this.modifyConfigContent(parsedResponse.configuration, params.orgKey);
      const configPath = this.directoryManager.getUserConfigFilePath(params, 'config');
      await fs.writeFile(configPath, modifiedConfig, 'utf-8');
      
      // Verify config structure
      /* const writtenConfig = await fs.readFile(configPath, 'utf-8');
      if (!this.validateConfigStructure(writtenConfig)) {
        throw new Error('Configuration structure validation failed after writing');
      } */

      // Handle codesets
      if (parsedResponse.codesets) {
        const processedCodesets = this.processCodesetContent(parsedResponse.codesets, params.orgKey);
        const codesetPath = this.directoryManager.getUserConfigFilePath(params, 'codesetvalues');
        await fs.writeFile(codesetPath, processedCodesets, 'utf-8');
        await this.verifyCodesetContent(codesetPath, params.orgKey);
      }

      // Handle backups
      if (params.userKey) {
        await this.handleBackups(params, modifiedConfig, parsedResponse.codesets);
      }

      // Handle secondary location
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

  /* private validateConfigStructure(content: string): boolean {
    const lines = content.split('\n');
    return (
      this.isEmptyLine(lines[0]) &&
      lines[1]?.startsWith('module,') &&
      lines[2]?.startsWith('access,') &&
      lines[3]?.startsWith('Field Code,') &&
      this.isEmptyLine(lines[4])
    );
  } */

  private isEmptyLine(line?: string): boolean {
    return !!line && line.split(',').every(cell => !cell.trim());
  }

  private async handleBackups(
    params: ConfigParams,
    configContent: string,
    codesetContent?: string
  ): Promise<void> {
    const backupFilename = this.createBackupFilename(params.userKey, params.moduleKey);
    await this.writeBackup(configContent, this.configBackupPath, backupFilename);

    if (codesetContent) {
      const processedCodesets = this.processCodesetContent(codesetContent, params.orgKey);
      const codesetBackupPath = path.join(this.codesetBackupPath, backupFilename);
      await fs.writeFile(codesetBackupPath, processedCodesets, 'utf-8');
    }
  }

  private async verifyCodesetContent(filePath: string, orgKey: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Verify header line contains orgKey
      if (lines[0] && !lines[0].includes(orgKey)) {
        console.warn('Warning: Header line does not contain the expected orgKey');
        console.log('Header line:', lines[0]);
        console.log('Expected orgKey:', orgKey);
      }

      // Verify empty line after header if present
      if (lines[1] && lines[1].trim() !== '') {
        console.warn('Warning: Missing empty line after header');
      }
    } catch (error) {
      console.error('Error verifying codeset content:', error);
      throw error;
    }
  }

  private createBackupFilename(userKey: string, moduleKey: string): string {
    const sanitizedUserKey = userKey.replace(/[^a-zA-Z0-9]/g, '');
    const sanitizedmoduleKey = moduleKey.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = new Date().toISOString()
      .replace(/[:\-T]/g, '')
      .slice(0, 14);
    return `${sanitizedUserKey}_${timestamp}_${sanitizedmoduleKey}.csv`;
  }

  private async writeBackup(content: string, directory: string, filename: string): Promise<void> {
    try {
      await fs.mkdir(directory, { recursive: true });
      const backupPath = path.join(directory, filename);
      await fs.writeFile(backupPath, content, 'utf-8');
      console.log(`Backup created at: ${backupPath}`);
      
      // Verify backup structure
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      /* if (!this.validateConfigStructure(backupContent)) {
        console.warn('Warning: Backup file structure validation failed');
      } */
    } catch (error) {
      console.error(`Error writing backup to ${directory}:`, error);
      throw error;
    }
  }

  private async writeToSecondaryLocation(
    params: ConfigParams,
    parsedResponse: ParsedResponse
  ): Promise<void> {
    try {
      await this.ensureSecondaryDirectories(params);

      const secondaryConfigPath = path.join(
        this.secondaryUserDir,
        params.orgKey,
        params.moduleKey,
        'config.csv'
      );
      await fs.writeFile(secondaryConfigPath, parsedResponse.configuration, 'utf-8');

      if (parsedResponse.codesets) {
        const secondaryCodesetPath = path.join(
          this.secondaryUserDir,
          params.orgKey,
          params.moduleKey,
          'codesetvalues.csv'
        );
        await fs.writeFile(secondaryCodesetPath, parsedResponse.codesets, 'utf-8');
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
    } catch (error) {
      console.error('Error creating secondary directories:', error);
      throw error;
    }
  }
}