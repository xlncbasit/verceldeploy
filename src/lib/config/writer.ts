import type { ConfigParams } from '@/types';
import fs from 'fs/promises';
import { DirectoryManager } from '../utils/directory';

interface ParsedResponse {
  configuration: string;
  codesets?: string;
}

export class ConfigWriter {
  private directoryManager: DirectoryManager;

  constructor() {
    this.directoryManager = new DirectoryManager();
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
    } catch (error) {
      console.error('Error writing files:', error);
      throw error;
    }
  }
}
