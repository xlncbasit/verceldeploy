//src/lib/claude/api.ts
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

    this.systemInstructions = `You are serving as an expert ERP Configuration Assistant, specifically designed to help users customize and optimize their ERP module configurations within a Next.js-based setup tool. You have deep expertise in:
- ERP systems and business processes
- Industry-specific configurations and best practices
- CSV configuration management
- Next.js and React development
- TypeScript and modern web development practices

# Primary Objectives
1. Guide users through ERP module customization
2. Translate business requirements into technical configurations
3. Ensure configuration validity and best practices
4. Provide clear explanations and rationale for changes

# Interaction Guidelines
1. Requirements Gathering Phase:
   - Focus on understanding user needs
   - Ask clarifying questions
   - Explain possibilities without making changes
   - Help users articulate their requirements clearly

2. Configuration Phase:
   - Only triggered during finalization
   - Produce precise, validated configuration changes
   - Maintain exact CSV structure
   - Provide clear summary of changes

# Configuration Context
Base configuration paths:
- Base: /data/configurations/base-configurations/[module.key]/config.csv
- Industry: /data/configurations/industry-configurations/[industry]/[module.key]/
- User: /data/users/[org.key]/[module.key]/

# Safety and Compliance
1. Always maintain:
   - Data integrity
   - Configuration consistency
   - Audit trail recommendations
   - Compliance with industry standards

2. Never:
   - Suggest changes that could break existing integrations
   - Bypass validation rules
   - Compromise security measures
   - Ignore industry regulations`;
  }

  /**
   * Process conversation during requirements gathering phase
   */
  async processConversation(
    message: string,
    params: ConfigParams
  ): Promise<{ reply: string }> {
    try {
      const conversationPrompt = `${this.systemInstructions}
  
  You are in the CONVERSATION PHASE, helping understand requirements for the ${params.moduleKey} module configuration.
  Industry: ${params.industry}
  Sub-Industry: ${params.subIndustry}
  
  Guidelines for your responses:
  1. Use a natural, friendly tone
  2. Format your response clearly with appropriate line breaks and spacing
  3. Ask a maximum of two focused questions per response
  4. If explaining options or possibilities, use bullet points for clarity
  5. Keep responses concise but informative
  6. Don't provide specific configuration values yet
  
  User's message: "${message}"
  
  Remember to:
  - Format your response for readability
  - Use bullet points when listing options
  - Add line breaks between different parts of your response
  - Ask no more than two questions
  - Focus on understanding requirements before suggesting solutions`;
  
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: conversationPrompt
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
  
      // Process the response to ensure proper formatting
      const formattedReply = this.formatConversationalResponse(content.text);
  
      return {
        reply: formattedReply
      };
  
    } catch (error) {
      console.error('Error in conversation processing:', error);
      throw error;
    }
  }
  
  /**
   * Format conversational response for better readability
   */
  private formatConversationalResponse(text: string): string {
    // Remove any excessive blank lines
    let formatted = text.replace(/\n{3,}/g, '\n\n');
    
    // Ensure bullet points are properly spaced
    formatted = formatted.replace(/^[•-]\s*/gm, '\n• ');
    
    // Ensure questions are on new lines and properly spaced
    formatted = formatted.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
    
    // Clean up any leftover spacing issues
    formatted = formatted.trim().replace(/\n{3,}/g, '\n\n');
  
    // Add spacing around bullet point sections
    formatted = formatted.replace(/(\n• .*?)(\n[^•])/g, '$1\n\n$2');
  
    return formatted;
  }

  /**
 * Process finalization phase to generate configuration changes
 */
async processFinalization(
  requirementsSummary: string,
  currentConfig: ConfigData[],
  params: ConfigParams
): Promise<{
  updatedConfig: ConfigData[];
  explanation: string;
  codesetUpdates?: Record<string, string[]>;
}> {
  try {
    const configContext = this.formatConfigContext(currentConfig);
    const finalizationPrompt = `${this.systemInstructions}

You are in FINALIZATION PHASE. Your task is to convert the gathered requirements into specific configuration changes.

Module: ${params.moduleKey}
Industry: ${params.industry}
Sub-Industry: ${params.subIndustry}

Current Configuration Structure:
${JSON.stringify(currentConfig, null, 2)}

Requirements Summary:
${requirementsSummary}

IMPORTANT: Your response must maintain the EXACT same structure as the current configuration.
1. Each field in the current configuration must exist in your response
2. Field names must match exactly
3. Data types must match (string, number, boolean)
4. Format your response in this exact structure:

CONFIGURATION:
key1: value1, key2: value2, key3: value3
(One line per configuration entry, keys and values separated by commas)

EXPLANATION:
(Your explanation of changes)

CODESETS:
(Any codeset updates if needed)`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: finalizationPrompt
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

    console.log('Raw Claude Response:', content.text);

    const result = this.parseClaudeResponse(content.text);
    
    console.log('Parsed Configuration:', result.updatedConfig);
    console.log('Original Configuration:', currentConfig);

    // Detailed validation
    const validationResult = this.validateConfigStructureWithDetails(result.updatedConfig, currentConfig);
    if (!validationResult.valid) {
      console.error('Validation Errors:', validationResult.errors);
      throw new Error(`Invalid configuration structure: ${validationResult.errors.join(', ')}`);
    }

    return result;

  } catch (error) {
    console.error('Error in finalization processing:', error);
    throw error;
  }
}

/**
 * Enhanced validation with detailed error reporting
 */
private validateConfigStructureWithDetails(
  updatedConfig: ConfigData[],
  originalConfig: ConfigData[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if we have a valid configuration array
  if (!Array.isArray(updatedConfig)) {
    errors.push('Updated configuration is not an array');
    return { valid: false, errors };
  }

  if (updatedConfig.length === 0) {
    errors.push('Updated configuration is empty');
    return { valid: false, errors };
  }

  if (updatedConfig.length !== originalConfig.length) {
    errors.push(`Configuration length mismatch: expected ${originalConfig.length}, got ${updatedConfig.length}`);
  }

  // Get all keys from original configuration
  const originalKeys = new Set(
    originalConfig.flatMap(item => Object.keys(item))
  );

  // Check each item in the updated configuration
  updatedConfig.forEach((item, index) => {
    // Verify all required keys exist
    for (const key of originalKeys) {
      if (!(key in item)) {
        errors.push(`Row ${index + 1}: Missing required key "${key}"`);
      }
    }

    // Check for unexpected keys
    for (const key of Object.keys(item)) {
      if (!originalKeys.has(key)) {
        errors.push(`Row ${index + 1}: Unexpected key "${key}"`);
      }
    }

    // Value type validation
    for (const key of originalKeys) {
      if (key in item) {
        const originalType = typeof originalConfig[0][key];
        const updatedType = typeof item[key];
        
        if (originalType !== 'undefined' && updatedType !== originalType) {
          errors.push(`Row ${index + 1}: Type mismatch for "${key}" - expected ${originalType}, got ${updatedType}`);
        }
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format configuration for context
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
  console.log("Claude response:", response);
  const sections = response.split('\n\n').filter(Boolean);
  
  let configSection = '';
  let explanationSection = '';
  let codesetSection = '';

  for (const section of sections) {
    const lowerSection = section.toLowerCase();
    if (lowerSection.includes('configuration:')) {
      configSection = section.replace('CONFIGURATION:', '').trim();
    } else if (lowerSection.includes('explanation:')) {
      explanationSection = section.replace('EXPLANATION:', '').trim();
    } else if (lowerSection.includes('codesets:')) {
      codesetSection = section.replace('CODESETS:', '').trim();
    }
  }

  if (!configSection) {
    throw new Error('No configuration section found in response');
  }

  const updatedConfig = this.parseConfigSection(configSection);
  return {
    updatedConfig,
    explanation: explanationSection || 'Configuration updated successfully.',
    ...(codesetSection ? this.parseCodesetSection(codesetSection) : {})
  };
}

/**
 * Parse codeset section of the response
 */
private parseCodesetSection(section: string): { codesetUpdates?: Record<string, string[]> } {
  if (!section) return {};

  const updates: Record<string, string[]> = {};
  const lines = section.split('\n').filter(Boolean);
  let currentCodeset = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes(':') && !trimmedLine.startsWith('-')) {
      currentCodeset = trimmedLine.split(':')[0].trim();
      updates[currentCodeset] = [];
      continue;
    }

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
 * Updated parsing method with better error handling
 */
private parseConfigSection(section: string): ConfigData[] {
  if (!section) {
    throw new Error('Empty configuration section');
  }

  const config: ConfigData[] = [];
  const lines = section.split('\n').filter(Boolean);

  if (lines.length === 0) {
    throw new Error('No configuration lines found');
  }

  for (const line of lines) {
    try {
      const pairs = line.split(',').map(pair => pair.trim());
      const configRow: ConfigData = {};

      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split(':').map(s => s.trim());
        const value = valueParts.join(':').trim(); // Handle values that might contain colons

        if (!key) {
          throw new Error(`Invalid pair format: ${pair}`);
        }

        configRow[key.toLowerCase()] = this.processConfigValue(value);
      }

      if (Object.keys(configRow).length > 0) {
        config.push(configRow);
      }
    } catch (error) {
      console.error(`Error parsing line: ${line}`, error);
      throw new Error(`Failed to parse configuration line: ${line}`);
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

      // Validate value types match original where possible
      for (const key of originalKeys) {
        const originalType = typeof originalConfig[0][key];
        const updatedType = typeof item[key];
        
        if (originalType !== 'undefined' && updatedType !== originalType) {
          console.error(`Type mismatch for key ${key}: expected ${originalType}, got ${updatedType}`);
          return false;
        }
      }
    }

    return true;
  }
}