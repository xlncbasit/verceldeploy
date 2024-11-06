// src/lib/config/writer.ts
import { stringify } from 'csv-stringify/sync';
import type { ConfigData, CodesetUpdate } from '@/types';
import fs from 'fs/promises';

export class ConfigWriter {
  static async writeCSV(filePath: string, data: ConfigData[]): Promise<void> {
    try {
      const content = stringify(data, {
        header: true,
        cast: {
          boolean: (value) => value ? 'true' : 'false',
          number: (value) => value.toString()
        }
      });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing CSV:', error);
      throw error;
    }
  }

  static async updateCodesetValues(
    filePath: string,
    updates: Record<string, string[]>
  ): Promise<void> {
    try {
      // Convert Record to CodesetUpdate array
      const codesetUpdates: CodesetUpdate[] = Object.entries(updates).map(
        ([codeset, values]) => ({
          codeset,
          values
        })
      );

      const content = await fs.readFile(filePath, 'utf-8');
      const updatedContent = await this.mergeCodesetValues(content, codesetUpdates);
      await fs.writeFile(filePath, updatedContent, 'utf-8');
    } catch (error) {
      console.error('Error updating codesetvalues:', error);
      throw error;
    }
  }

  private static async mergeCodesetValues(
    existingContent: string,
    updates: CodesetUpdate[]
  ): Promise<string> {
    const lines = existingContent.split('\n');
    const header = lines[0];
    const existingValues = new Map<string, Set<string>>();

    // Parse existing values
    for (let i = 1; i < lines.length; i++) {
      const [codeset, value] = lines[i].split(',').map(s => s.trim());
      if (codeset && value) {
        if (!existingValues.has(codeset)) {
          existingValues.set(codeset, new Set());
        }
        existingValues.get(codeset)?.add(value);
      }
    }

    // Merge updates
    for (const update of updates) {
      if (!existingValues.has(update.codeset)) {
        existingValues.set(update.codeset, new Set());
      }
      const valueSet = existingValues.get(update.codeset);
      if (valueSet) {
        update.values.forEach(value => valueSet.add(value));
      }
    }

    // Generate updated content
    const updatedLines = [header];
    for (const [codeset, values] of existingValues.entries()) {
      values.forEach(value => {
        updatedLines.push(`${codeset},${value}`);
      });
    }

    return updatedLines.join('\n');
  }
}