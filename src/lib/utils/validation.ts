// src/lib/utils/validation.ts
import type { ConfigParams, ConfigData } from '@/types';

export class ConfigValidator {
  /**
   * Validate configuration parameters
   */
  static validateParams(params: ConfigParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    const required = ['orgKey', 'moduleKey', 'industry'] as const;
    for (const field of required) {
      if (!params[field]?.trim()) {
        errors.push(`${field} is required`);
      }
    }

    // Format validations
    if (params.orgKey && !/^[a-zA-Z0-9._-]+$/.test(params.orgKey)) {
      errors.push('Organization key contains invalid characters');
    }

    if (params.moduleKey && !/^[A-Z_]+$/.test(params.moduleKey)) {
      errors.push('Module key must be uppercase with underscores only');
    }

    if (params.userKey && !this.isValidEmail(params.userKey)) {
      errors.push('User key must be a valid email address');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate CSV content structure
   */
  static validateCSVStructure(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!content.trim()) {
      errors.push('CSV content is empty');
      return { valid: false, errors };
    }

    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    
    if (lines.length < 2) {
      errors.push('CSV must contain header and at least one data row');
      return { valid: false, errors };
    }

    const headerColumns = lines[0].split(',').length;
    
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').length;
      if (columns !== headerColumns) {
        errors.push(`Row ${i + 1} has incorrect number of columns`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate configuration data structure
   */
  static validateConfigData(data: ConfigData[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(data) || data.length === 0) {
      errors.push('Configuration data must be a non-empty array');
      return { valid: false, errors };
    }

    // Check required fields in each row
    data.forEach((row, index) => {
      if (!row.key || typeof row.key !== 'string') {
        errors.push(`Row ${index + 1}: Missing or invalid 'key' field`);
      }
      if (!row.value && row.value !== '') {
        errors.push(`Row ${index + 1}: Missing 'value' field`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Email validation helper
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}