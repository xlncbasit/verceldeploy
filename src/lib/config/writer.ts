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
  

  constructor() {
    this.directoryManager = new DirectoryManager();
    this.configBackupPath = '/opt/tomcat/webapps/ROOT/upload/configfiles';
    this.codesetBackupPath = '/opt/tomcat/webapps/ROOT/upload/codefiles';
    
  }

  private processCodesetContent(content: string, orgKey: string): string {
    const lines = content.split('\n');
    const processedLines: string[] = [];
    
    // Process the first line (header)
    if (lines.length > 0) {
        // Replace FIELDMOBI_DEFAULT with organization in header
        const headerLine = lines[0].replace('FIELDMOBI_DEFAULT', orgKey);
        processedLines.push(headerLine);
    }

    // Process rest of the lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line.trim()) {
            processedLines.push(line);
            continue;
        }

        const cells = line.split(',').map(cell => cell.trim());
        
        // Process numbered lines (field lines)
        if (/^\d+/.test(cells[0])) {
            // Extract fields
            const type = cells[1];     // e.g., INGREDIENT_TYPE
            const code = cells[4];      // e.g., RAW_MATERIALS
            const description = cells[5]; // e.g., Raw Materials

            // Create new line with type, code, description and orgKey
            const newLine = `${type},${code},${description},,${orgKey}`;
            processedLines.push(newLine);
        } else {
            // For non-numbered lines, replace FIELDMOBI_DEFAULT with orgKey
            const modifiedLine = line.replace('FIELDMOBI_DEFAULT', orgKey);
            processedLines.push(modifiedLine);
        }
    }

    return processedLines.join('\n');
  }

  private async verifyCodesetContent(filePath: string, orgKey: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const firstLine = content.split('\n')[0];
      const cells = firstLine.split(',');
      if (cells[5] !== orgKey) {
        console.warn('Warning: Cell E1 does not contain the expected orgKey');
        console.log('Actual E1 content:', cells[4]);
        console.log('Expected orgKey:', orgKey);
      }
    } catch (error) {
      console.error('Error verifying codeset content:', error);
    }
  }

  private modifyConfigContent(content: string, orgKey: string): string {
    const lines = content.split('\n');
    
    // Find the line containing "Application" (typically line 2)
    const applicationLineIndex = lines.findIndex(line => 
      line.includes('Application')
    );
  
    if (applicationLineIndex !== -1) {
      // Split the line into cells
      const cells = lines[applicationLineIndex].split(',');
      
      // Change "Application" to "Customization" (column B)
      if (cells[1]) {
        cells[1] = 'Customization';
      }
      
      // Insert orgKey (column C)
      if (cells[2]) {
        cells[2] = orgKey;
      }
      
      // Reconstruct the line
      lines[applicationLineIndex] = cells.join(',');
    }
  
    return lines.join('\n');
  }

  async writeFiles(params: ConfigParams, parsedResponse: ParsedResponse): Promise<void> {
    try {
      await this.directoryManager.ensureDirectories(params);
      
      // Handle configuration file
      const modifiedConfig = this.modifyConfigContent(parsedResponse.configuration, params.orgKey);
      const configPath = this.directoryManager.getUserConfigFilePath(params, 'config');
      await fs.writeFile(configPath, modifiedConfig, 'utf-8');
      console.log('Configuration file written successfully');

      // Handle codesets if present
      if (typeof parsedResponse.codesets === 'string') {
        console.log('Processing codesets with organization key:', params.orgKey);
        
        // Process codeset content to ensure orgKey is present
        const processedCodesets = this.processCodesetContent(parsedResponse.codesets, params.orgKey);
        console.log('Processed codesets:', processedCodesets);

        const codesetPath = this.directoryManager.getUserConfigFilePath(params, 'codesetvalues');
        await fs.writeFile(codesetPath, processedCodesets, 'utf-8');
        console.log('Codeset file written successfully with organization key');

        // Log the first few lines of the written file for verification
        const writtenContent = await fs.readFile(codesetPath, 'utf8');
        console.log('Written codeset content:', writtenContent.split('\n').slice(0, 5).join('\n'));
      }

      // Handle backups
      if (params.userKey) {
        const backupFilename = this.createBackupFilename(params.userKey);
        await this.writeBackup(modifiedConfig, this.configBackupPath, backupFilename);
        
        if (parsedResponse.codesets) {
          console.log('Processing codesets for organization:', params.orgKey);
          const processedCodesets = this.processCodesetContent(parsedResponse.codesets, params.orgKey);
          const codesetPath = this.directoryManager.getUserConfigFilePath(params, 'codesetvalues');
          
          await fs.writeFile(codesetPath, processedCodesets, 'utf-8');
          console.log('Codeset file written, verifying content...');
          
          // Verify the content after writing
          await this.verifyCodesetContent(codesetPath, params.orgKey);
        }
      }

      // Write to secondary location if configured
      

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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async writeBackup(content: string, directory: string, filename: string): Promise<void> {
    try {
      await this.delay(2000);
      await fs.mkdir(directory, { recursive: true });
      const backupPath = path.join(directory, filename);
      await fs.writeFile(backupPath, content, 'utf-8');
      console.log(`🔄 Backup created at: ${backupPath}`);
      console.log(`📁 Backup directory: ${directory}`);
      console.log(`📄 Backup filename: ${filename}`);
      // Log first few lines of content for verification
      console.log(`📝 First few lines of backup content:`);
      const firstLines = content.split('\n').slice(0, 5).join('\n');
      console.log(firstLines);
    } catch (error) {
      console.error(`❌ Error writing backup to ${directory}:`, error);
    }
  }

  

  
}