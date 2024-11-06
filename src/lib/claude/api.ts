import { Anthropic } from '@anthropic-ai/sdk';
import type { ConfigParams, ConfigData } from '@/types';

export class ClaudeAPI {
  private client: Anthropic;
  private model = 'claude-3-sonnet-20240229';
  private systemInstructions: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.systemInstructions = `You are an ERP configuration expert. Your role is to help customize ERP module configurations while following these rules:

1. Keep the configuration structure consistent
2. Only modify values that are relevant to the user's request
3. Ensure new values align with industry standards
4. Validate data types match the existing structure
5. Consider dependencies between configurations

Always format your response in three sections:

1. Configuration (CSV format with key:value pairs)
2. Explanation: A brief summary of changes made
3. Codeset Updates (if any new values were added)

Example Response Format:
---
key: value, setting: enabled, threshold: 100

Explanation:
Updated the threshold value and enabled the setting as requested.

Codeset Updates:
STATUS:
- PENDING_REVIEW
- IN_PROCESS
---`;
  }

  /**
   * Process configuration customization request
   */
  async processCustomization(
    userMessage: string,
    currentConfig: ConfigData[],
    params: ConfigParams
  ): Promise<{
    updatedConfig?: ConfigData[];
    explanation: string;
    codesetUpdates?: Record<string, string[]>;
  }> {
    try {
      // Format the current configuration for context
      const configContext = this.formatConfigContext(currentConfig);
      
      // Build the complete prompt
      const prompt = this.buildPrompt(params, configContext, userMessage);

      // Get response from Claude
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('No response received from Claude');
      }

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Check if the prompt contains CSV configuration data
      const containsConfigData = this.checkForConfigData(userMessage);

      if (containsConfigData) {
        // Parse and validate the response if it contains configuration data
        const result = this.parseClaudeResponse(content.text);
        
        // Validate the updated configuration
        if (!this.validateConfigStructure(result.updatedConfig, currentConfig)) {
          throw new Error('Invalid configuration structure in Claude response');
        }

        return result;
      } else {
        // Handle as a conversational response
        return {
          explanation: content.text, // Use the raw response as explanation
        };
      }

    } catch (error) {
      console.error('Error in Claude API:', error);
      throw new Error(
        `Failed to process configuration customization: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Check if the user message contains configuration data
   */
  private checkForConfigData(message: string): boolean {
    // Example logic: check for keywords or patterns indicating config data
    return message.includes('config') || message.includes('csv');
  }

  /**
   * Build the complete prompt for Claude
   */
  private buildPrompt(
    params: ConfigParams,
    configContext: string,
    userMessage: string
  ): string {
    return `${this.systemInstructions}

Module: ${params.moduleKey}
Industry: ${params.industry}
Sub-Industry: ${params.subIndustry}

Current Configuration:
${configContext}

User Request: ${userMessage}

Please provide your response in the specified format, maintaining the existing configuration structure.`;
  }

  /**
   * Format configuration for Claude's context
   */
  private formatConfigContext(config: ConfigData[]): string {
    return config.map(row => {
      return Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }).join('\n');
  }

  /**
   * Parse Claude's response into structured data
   */
  private parseClaudeResponse(response: string): {
    updatedConfig: ConfigData[];
    explanation: string;
    codesetUpdates?: Record<string, string[]>;
  } {
    // Split response into sections
    const sections = response.split('\n\n').filter(Boolean);
    
    // Initialize result objects
    let configSection = '';
    let explanationSection = '';
    let codesetSection = '';

    // Categorize sections
    for (const section of sections) {
      const lowerSection = section.toLowerCase();
      if (lowerSection.includes('key:') || lowerSection.includes('setting:')) {
        configSection = section;
      } else if (lowerSection.includes('explanation:')) {
        explanationSection = section;
      } else if (lowerSection.includes('codeset')) {
        codesetSection = section;
      }
    }

    // Parse each section
    return {
      updatedConfig: this.parseConfigSection(configSection),
      explanation: this.cleanExplanationText(explanationSection),
      ...this.parseCodesetSection(codesetSection)
    };
  }

  /**
   * Parse configuration section
   */
  private parseConfigSection(section: string): ConfigData[] {
    const config: ConfigData[] = [];
    const lines = section.split('\n').filter(Boolean);

    for (const line of lines) {
      const pairs = line.split(',').map(pair => pair.trim());
      const configRow: ConfigData = {};

      for (const pair of pairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value !== undefined) {
          // Convert value types appropriately
          const processedValue = this.processConfigValue(value);
          configRow[key.toLowerCase()] = processedValue;
        }
      }

      if (Object.keys(configRow).length > 0) {
        config.push(configRow);
      }
    }

    return config;
  }

  /**
   * Process and convert configuration values to appropriate types
   */
  private processConfigValue(value: string): string | number | boolean {
    // Convert boolean strings
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Convert numeric strings
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }

    return value;
  }

  /**
   * Parse codeset updates section
   */
  private parseCodesetSection(section: string): { codesetUpdates?: Record<string, string[]> } {
    if (!section) return {};

    const updates: Record<string, string[]> = {};
    const lines = section.split('\n').filter(Boolean);
    let currentCodeset = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for codeset header
      if (trimmedLine.includes(':') && !trimmedLine.startsWith('-')) {
        currentCodeset = trimmedLine.split(':')[0].trim();
        updates[currentCodeset] = [];
        continue;
      }

      // Add values to current codeset
      if (currentCodeset && trimmedLine.startsWith('-')) {
        const value = trimmedLine.substring(1).trim();
        if (value) {
          updates[currentCodeset].push(value);
        }
      }
    }

    return Object.keys(updates).length > 0 ? { codesetUpdates: updates } : {};
  }

  /**
   * Clean up explanation text
   */
  private cleanExplanationText(text: string): string {
    if (!text) return 'Configuration updated successfully.';

    return text
      .replace(/^explanation:/i, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Validate the structure of the updated configuration
   */
  private validateConfigStructure(
    updatedConfig: ConfigData[],
    originalConfig: ConfigData[]
  ): boolean {
    // Check if we have a valid configuration
    if (!Array.isArray(updatedConfig) || updatedConfig.length === 0) {
      return false;
    }

    // Get all keys from original configuration
    const originalKeys = new Set(
      originalConfig.flatMap(item => Object.keys(item))
    );

    // Check each item in the updated configuration
    for (const item of updatedConfig) {
      // Verify all required keys exist
      for (const key of originalKeys) {
        if (!(key in item)) {
          console.error(`Missing required key: ${key}`);
          return false;
        }
      }

      // Check for unexpected keys
      for (const key of Object.keys(item)) {
        if (!originalKeys.has(key)) {
          console.error(`Unexpected key in configuration: ${key}`);
          return false;
        }
      }
    }

    return true;
  }
}
