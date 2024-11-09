// src/lib/config/parser.ts
import { parse } from 'csv-parse/sync';
import type { ConfigData } from '@/types';
import fs from 'fs/promises';

export class ConfigParser {
  static async parseCSV(filePath: string): Promise<ConfigData[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw error;
    }
  }

/*   static formatConfigForClaude(config: ConfigData[]): string {
    return config.map(row => {
      return Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }).join('\n');
  } */

  static parseClaudeResponse(response: string): ConfigData[] {
    const lines = response.split('\n').filter(line => line.trim());
    const headers = new Set<string>();
    
    // Collect headers
    lines.forEach(line => {
      const pairs = line.split(',').map(pair => pair.trim());
      pairs.forEach(pair => {
        const [key] = pair.split(':').map(s => s.trim());
        if (key) headers.add(key);
      });
    });

    // Create structured data
    return lines.map(line => {
      const obj: ConfigData = {};
      headers.forEach(header => obj[header] = '');
      
      const pairs = line.split(',').map(pair => pair.trim());
      pairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) obj[key] = value;
      });
      
      return obj;
    });
  }
}