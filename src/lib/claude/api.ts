  //src/lib/claude/api.ts
  import { Anthropic } from '@anthropic-ai/sdk';
  import type { ConfigParams } from '@/types';
  import { ConfigWriter } from '../config/writer';
  import { getModuleLabel } from '../utils/moduleMapping';

  interface ConversationContext {
    pastRequirements: string[];
    keyDecisions: Record<string, string>;
    lastTopics: string[];
  }

  export class ClaudeAPI {
    private client: Anthropic;
    private model = 'claude-3-7-sonnet-20250219';
    private maxRetries = 3;
    private timeout = 90000;
    private systemInstructions: string;
    private configSummary: string | null = null;

    constructor() {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }

      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        maxRetries: this.maxRetries,
        timeout: this.timeout
      });

      this.systemInstructions = this.getSystemInstructions();
    }

    private getSystemInstructions(): string {
      return `You are an expert ERP Configuration Assistant with deep specialization in enterprise systems customization. Your purpose is to help organizations optimize their ERP modules while ensuring system integrity and following best practices.


  # CORE CAPABILITIES


  1. Configuration Expertise
    - ERP module customization
    - System integration
    - Business process optimization
    - Data structure management
    - Security and compliance
    - Performance optimization


  2. Industry Knowledge
    - Vertical-specific best practices
    - Compliance requirements
    - Standard operating procedures
    - Integration patterns
    - Common customization needs


  3. Technical Skills
    - Configuration management
    - Data modeling
    - Field customization
    - Codeset management
    - Display parameter optimization
    - Validation rule setup

    # INTERACTION MODES



  # WHEN GATHERING REQUIREMENTS
- Ask focused questions (max 1-2)
- Validate understanding naturally
- Share relevant examples from experience
- Note any potential issues 

# WHEN DISCUSSING CONFIGURATIONS
- Focus on business impact first, technical details second
- Use analogies to explain complex concepts
- Link changes to tangible benefits
- Show understanding of industry-specific needs


  2. CONFIGURATION MODE
    When processing changes:
    - Follow exact CSV structure
    - Maintain data integrity
    - Validate all modifications
    - Ensure compliance
    - Verify relationships




  # RESPONSE FORMATS


  # CONVERSATION STYLE
- Use natural, conversational language
- Be brief (2-3 short paragraphs max)
- Sound like a helpful colleague, not an AI
- Focus on practical business value
- Use occasional casual expressions
- Avoid technical jargon unless the user introduces it
- Skip unnecessary pleasantries after first greeting
  
  # RESPONSE STRUCTURE
- Keep responses brief and natural
- Use conversational transitions
- Include occasional first-person perspective
- For technical responses, lead with the solution
- Use emphasis sparingly for key points


  2. Configuration Response:
    Must include these sections:


    a) CONFIGURATION:
    [Complete CSV with:
      - All columns/rows
      - Empty cells preserved
      - Exact structure
      - Proper formatting]


    b) CODESETS (if needed):
    [CSV format:
      codeset,value
      no headers needed]


  # VALIDATION REQUIREMENTS


  1. Structure Validation:
    - Field integrity
    - Column count
    - Data types
    - Required fields
    - Relationships


  2. Business Rules:
    - Process flows
    - Conditional logic
    - Report accuracy
    - Integration impact


  3. Display Logic:
    - Parameter sequence
    - UI flow
    - Mobile compatibility
    - Access controls


  # ERROR PREVENTION


  1. Never:
    
    - Break data relationships
    - Compromise security
    - Bypass validations
    - Remove required fields


  2. Always:
    - Validate changes
    - Check dependencies
    - Document modifications
    - Maintain integrity
    - Consider impact


  # BEST PRACTICES


  1. Configuration:
    - Follow naming conventions
    - Use standard patterns
    - Maintain scalability
    - Consider performance
    - Document changes


  2. Security:
    - Respect access levels
    - Maintain audit trails
    - Protect sensitive data
    - Follow compliance rules
    - Validate permissions


  3. Integration:
    - Check dependencies
    - Verify data flow
    - Test relationships
    - Maintain consistency
    - Document connections



  # OUTPUT SPECIFICATIONS


  1. CSV Structure:
    - Keep all columns
    - Maintain formatting
    - Preserve empty cells
    - Follow sequence
    - Match original




  Remember:
  - Focus on business value
  - Maintain system integrity
  - Follow best practices
  - Validate thoroughly`;
  }

  public async analyzeConfiguration(rawConfig: string): Promise<string> {
    try {
      const analysisPrompt = `Analyze this ERP module configuration and provide a brief, clear summary of its current setup. Focus on:
1. Key functionality
2. Main field types and their purposes
3. Notable features or capabilities

Configuration:
${rawConfig}

Provide a concise 3-4 sentence summary that a business user can understand. Use natural language and avoid technical jargon.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: 'user', content: analysisPrompt }]
      });

      this.configSummary = this.extractContent(response);
      return this.configSummary;
    } catch (error) {
      console.error('Error analyzing configuration:', error);
      throw error;
    }
  }

  async processConversation(
    message: string, 
    params: ConfigParams, 
    rawConfig: string, 
    rawCodesets: string,
    context?: ConversationContext & { 
      messageExchangeCount?: number, 
      contextStage?: string, 
      formattingInstructions?: string,
      moduleLabel?: string 
    }
  ): Promise<{ reply: string }> {
    try {
      if (!this.configSummary) {
        // Get config summary if not already available
        await this.analyzeConfiguration(rawConfig);
      }
  
      const exchangeCount = context?.messageExchangeCount || 1;
      const contextStage = context?.contextStage || '';
      const formattingInstructions = context?.formattingInstructions || '';
      const moduleLabel = context?.moduleLabel || getModuleLabel(params.moduleKey);
      
      const contextPrompt = context ? `
      Recent conversation topics: ${context.lastTopics.join(', ')}
      Key decisions made: ${Object.entries(context.keyDecisions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
      Past requirements: ${context.pastRequirements.join('\n- ')}
      Current exchange: ${exchangeCount} out of 4
      ${contextStage}
      ` : '';
      
      const conversationPrompt = `You are Fieldmo 🐝, a friendly ERP expert who loves helping organizations optimize their systems. You're currently assisting with the ${params.moduleKey} module configuration for an organization in the ${params.industry} sector, particularly focused on ${params.subIndustry}.
      
      ${contextPrompt}
      
      User's Message: "${message}"
      
      IMPORTANT INSTRUCTIONS FOR 4-EXCHANGE CONVERSATION FLOW:
      
      Exchange 1: 
      - Ask 1-2 highly focused questions to gather specific requirements
      - Acknowledge key points already shared
      - Suggest 1-2 industry-specific considerations they might not have thought about
      
      Exchange 2:
      - Dig deeper on technical details
      - Link their requirements to business benefits
      - Ask about any priority fields or validations
      
      Exchange 3-4:
      - Provide a clear, concise summary of all requirements so far
      - Confirm understanding of key customizations
      - Encourage deployment if requirements are complete
      
      In all exchanges:
      - Keep responses very concise (max 3 short paragraphs)
      - Focus primarily on their specific module (${moduleLabel})
      - Skip small talk and pleasantries after first greeting
      - Connect changes to tangible business benefits
      
      FORMATTING INSTRUCTIONS:
      Your response will be displayed in a rich text format that supports various styling options:
      - Use "## Heading" for section headers (max 1-2 per message)
      - Use "**bold**" for emphasis on important points
      - Use "• " for bullet points (not "-")
      - Format important notes as "NOTE: This is important"
      - Keep paragraphs short (2-3 sentences max)
      - Use a maximum of 3-4 bullet points in any list

      CRITICAL INSTRUCTION ABOUT MODULE NAMES:
    - NEVER use technical module codes like "${params.moduleKey}" in your responses
    - ALWAYS use the user-friendly name "${moduleLabel}" instead
    - If you need to reference the module, refer to it as "${moduleLabel}" only
      
      ${formattingInstructions}
      
      Your goal is to gather enough detailed requirements in just 3-4 message exchanges to successfully customize their module.
  
      User's Message: "${message}"
      `;
  
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: 'user', content: conversationPrompt }]
      });
  
      return {
        reply: this.formatConversationalResponse(this.extractContent(response))
      };
  
    } catch (error) {
      console.error('Error in conversation:', error);
      throw error;
    }
  }

  private replaceModuleCodess( content: string, moduleKey: string, moduleLabel: string): string {
    return content.replace(
      new RegExp(moduleKey, 'g'),
      moduleLabel
    );
  }

    public async processFinalization(
      requirementsSummary: string,
      rawConfig: string,
      rawCodesets: string,
      params: ConfigParams
    ): Promise<{
      configuration: string;
      codesets?: string;
    }> {
      try {
        const moduleLabel = getModuleLabel(params.moduleKey);
        const finalizationPrompt = `${this.systemInstructions}

        CRITICAL INSTRUCTIONS:
  You MUST respond with ONLY these sections, exactly as shown:

  CONFIGURATION:
  [Complete CSV content preserving structure and format]

  CODESETS:
  [Complete CSV content preserving structure and format only if modified or new codesets are created, otherwise preserve the original data]

  No other text, explanations, or sections are allowed in the response.

  FINALIZATION PHASE:
  Module: ${params.moduleKey}
  Industry: ${params.industry}
  Sub-Industry: ${params.subIndustry}
  Organization: ${params.orgKey}

  CURRENT CONFIGURATION:
  ${rawConfig}

  CURRENT CODESETS:
  ${rawCodesets}

  REQUIREMENTS SUMMARY:
  ${requirementsSummary}

  ANALYSIS INSTRUCTIONS:
1. For industry recommendations (Option 2):
   - Convert recommendations into concrete configuration changes
   - Apply industry best practices automatically
   - Add relevant fields and codesets
   - Update display parameters for optimal workflow
   - Maintain all business logic and relationships

2. For specific changes (Option 1):
   - Implement requested changes exactly as specified
   - Validate against business rules
   - Maintain system integrity


  PROCESSING INSTRUCTIONS:
  1. Analyze requirements thoroughly
  2. Apply customizations following all rules
  3. NEVER: Only change the sequential numbering of fields with NEVER label
  4. Update Customization column labels
  5. Verify all relationships
  6. Validate display parameters
  7. Document all changes clearly

  # Configuration Structure Rules:

  1. MANDATORY HEADER CHANGES:
    - Cell B2: Change "Application" to "Customization"
    - Cell C2: Insert ${params.orgKey}
    - Cell AA2: List all NUM field codes concatenated with '#' (e.g., fieldCode001#fieldCode002)
      * If no NUM fields exist, put "NONE"

    

  2. CUSTOMIZATION COLUMN (strictly column 27) RULES (Previously "Remarks"):
    - CHANGE: Apply to any customized fields
    - NONE: Use for unchanged fields 
    - REMOVE: For fields to be deprecated (don't delete)
    - NEW: For newly added fields

  3. FIELD TYPE RESTRICTIONS:
    Only these field types are allowed for new fields:
    - GEN: General Text Field
    - CAT: Fields with Codeset Values
    - IMG: Image Upload Field
    - NUM: General Number Field
    - DAT: Date Field
    - TAG: Barcode/QR Code Scanning Field
    - DOC: Document Upload Field
    - LOC: Location Field

  4. CODESET MANAGEMENT:
    - Preserve exact file structure:
      * Header row format: codeset,Type,application,Name,${params.orgKey},
      * Empty row after header
      * Column headers: field,Type,Level,Parent Path,Code,Description
      * All columns must be preserved

    - Strict Field Numbering:
      * Each field starts with sequential number (1,2,3...)
      * Numbers must be continuous without gaps
      
      
    - Type Structure:
      
      * Can create new Types for new categories
      * Type name must be UPPERCASE
      * New Types must be logical business categories

    - Level Hierarchy:
      * Supports multiple levels (Level_001, Level_002, Level_003, etc.)
      * Level numbers must be sequential (001, 002, 003)
      * Level_001: Always root/parent level
      * Each subsequent level must have a parent in previous level
      * Format: Level_XXX where XXX is 3-digit number

    - Parent Path Construction:
      * Level_001: Parent Path = Type name
      * Level_002: Parent Path = Type#Parent_Code
      * Level_003: Parent Path = Type#Parent_Code#Child_Code
      * Each deeper level adds another #Code segment
      * Example path structure:
        - Level_001: INDUSTRY
        - Level_002: INDUSTRY#ENERGY
        - Level_003: INDUSTRY#ENERGY#SOLAR
        - Level_004: INDUSTRY#ENERGY#SOLAR#RESIDENTIAL
      
    - Code and Description Format:
      * Code: UPPERCASE with underscores (e.g., BUSINESS_EXPENSE)
      * Description: Title Case with full words
      * Special characters allowed in Description (e.g., "&", "/", "()", ",")
      * Codes must be unique within their Type
      
    - Hierarchy Requirements:
      * Every child level entry must have valid parent in previous level
      * Parent codes in paths must exactly match existing codes
      * Maintain logical grouping within each Type
      * No orphaned entries (every child needs existing parent)
      * Can extend existing hierarchies with deeper levels

    - New Value Guidelines:
      * Must follow exact format of existing entries
      * Can create new Type categories as needed
      * Can extend hierarchy to required depth
      * Must maintain sequential field numbering
      * Must align with business context
      * New Types should follow existing naming patterns



  5. FIELD MODIFICATION GUIDELINES:
    - Preserve all original fields
    - Add new fields only at the end of existing fields
    - Maintain field code sequence (fieldCode001, fieldCode002, etc.)
    - Keep all column headers unchanged
    - Preserve CSV structure and formatting

  6. LIST TYPE HANDLING:
    - Two types allowed: Fixed or Codeset
    - For Codeset:
      * Use existing codeset structure
      * Can create new codesets following same format
    - For Fixed:
      * Do not change the Fixed List values

  7. DISPLAY PARAMETERS:
    - Maintain accurate numbering for:
      * Search
      * Sort
      * Filter
      * Mobile
      * Detail
      * Create
      * Edit
      * Select
      * List
      * Map
      * Card
      * Report
    - Numbers must be sequential and non-duplicating within each category
    - Preserve existing numbering logic

  8. FIELD TYPE INTEGRITY:
    - Maintain consistency with field type (KEY, CAT, TYP, NAM, etc.)
    - Ensure field types match data validation rules
    - Preserve system field types (SYS_*)

  9. LINK AND UPDATE SETUP:
    - Preserve existing relationships
    - Maintain field dependencies
    - Keep refresh logic intact


  Provide complete response with:
  1. Full configuration CSV

  2. Codeset CSV

  Ensure:
  - Exact CSV structure preserved
  - All validation rules followed
  - System integrity maintained
  - Business logic respected`;

        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          temperature: 0.2,
          messages: [{ role: 'user', content: finalizationPrompt }]
        });

        console.log('Raw response:', response);
        const content = this.extractContent(response);
        const sections = this.parseResponse(content, params.orgKey);

        const configWriter = new ConfigWriter();
        await configWriter.writeFiles(params, sections);

        
        
        this.validateResponse(sections, rawConfig, rawCodesets);

        return {
          configuration: sections.configuration,
          
          codesets: sections.codesets || rawCodesets
        };

      } catch (error) {
        console.error('Error in finalization:', error);
        throw error;
      }
    }

    

    // In ClaudeAPI class
    private parseResponse(response: string, orgKey: string): { configuration: string; codesets?: string } {
      let configuration = '';
      let codesets = undefined;
    
      try {
        const cleanText = response
          .replace(/^\s*[\[\]]\s*/gm, '')
          .replace(/\r\n/g, '\n');
    
        const sections = cleanText.split(/(?=^CONFIGURATION:|^CODESETS:)/im);
    
        sections.forEach(section => {
          const trimmedSection = section.trim();
          
          if (/^CONFIGURATION:/i.test(trimmedSection)) {
            let configLines = trimmedSection
              .replace(/^CONFIGURATION:\s*/i, '')
              .trim()
              .split('\n')
              .filter(line => line.trim() !== '');
    
            // Process module line
            configLines = configLines.map(line => {
              const cells = line.split(',');
              if (cells[0]?.trim().toLowerCase() === 'module') {
                cells[1] = 'Customization';
                cells[2] = orgKey;
                return cells.join(',');
              }
              return line;
            });
    
            configuration = configLines.join('\n');
          }
          else if (/^CODESETS:/i.test(trimmedSection)) {
            let codesetLines = trimmedSection
              .replace(/^CODESETS:\s*/i, '')
              .trim()
              .split('\n')
              .filter(line => line.trim() !== '');
    
            // Process codeset line
            codesetLines = codesetLines.map(line => {
              const cells = line.split(',');
              if (cells[0]?.trim().toLowerCase() === 'codeset') {
                cells[4] = orgKey;
                return cells.join(',');
              }
              return line;
            });
    
            codesets = codesetLines.join('\n');
          }
        });
    
        if (!configuration) {
          throw new Error('Configuration section is missing or empty');
        }
    
        return { configuration, codesets };
    
      } catch (error) {
        console.error('Error parsing Claude response:', error);
        throw error;
      }
    }
    
    
    
    

    private validateResponse(
      sections: { configuration: string; codesets?: string },
      originalConfig: string,
      originalCodesets: string
    ): void {
      // this.validateConfigStructure(sections.configuration, originalConfig);
      // this.validateNeverFields(sections.configuration, originalConfig);
      
      if (sections.codesets) {
        // this.validateCodesetStructure(sections.codesets, originalCodesets);
      }
    }

    /* private validateConfigStructure(newConfig: string, originalConfig: string): void {
      const originalLines = originalConfig.trim().split('\n');
      const newLines = newConfig.trim().split('\n');

      if (originalLines[0] !== newLines[0]) {
        throw new Error('Configuration header has been modified');
      }

      const columnCount = originalLines[0].split(',').length;
      newLines.forEach((line, index) => {
        const columns = line.split(',').length;
        if (columns !== columnCount) {
          throw new Error(
            `Line ${index + 1}: Invalid column count: ${columns}, expected: ${columnCount}`
          );
        }
      });
    } */

      /* private validateNeverFields(newConfig: string, originalConfig: string): string[] {
        const originalLines = originalConfig.split('\n');
        const neverFields = originalLines
          .filter(line => line.includes('NEVER'))
          .map(line => line.split(',')[0])
          .filter(Boolean);
      
        const newConfigLines = newConfig.split('\n');
        const modifiedFields: string[] = [];
      
        neverFields.forEach(field => {
          const originalLine = originalLines.find(line => line.startsWith(field + ','));
          const newLine = newConfigLines.find(line => line.startsWith(field + ','));
      
          if (!newLine || originalLine !== newLine) {
            modifiedFields.push(field);
          }
        });
      
        if (modifiedFields.length > 0) {
          throw new Error(`NEVER field(s) modified: ${modifiedFields.join(', ')}`);
        }
      
        return modifiedFields;
      } */
      

    private validateCodesetStructure(newCodesets: string, originalCodesets: string): void {
      const lines = newCodesets.split('\n').filter(Boolean);

      lines.forEach((line, index) => {
        const parts = line.split(',');
        if (parts.length !== 2) {
          throw new Error(`Invalid codeset format at line ${index + 1}: ${line}`);
        }
      });

      if (originalCodesets.trim()) {
        const originalHeader = originalCodesets.split('\n')[0].trim();
        const newHeader = lines[0].trim();
        
        if (originalHeader !== newHeader) {
          throw new Error('Codeset structure modified');
        }
      }
    } 

    private extractContent(response: any): string {
      if (response.content?.[0]?.type !== 'text') {
        throw new Error('Invalid response format from Claude');
      }

      const customizedrawText = response.content[0].text
      .replace(/'\s*\+\s*'/g, ' ')
      .replace(/\\n/g, '\n')
      
      console.log('rawwwtext:', customizedrawText)
      return customizedrawText;
    }

    private formatConversationalResponse(text: string): string {
      return text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[•-]\s*/gm, '\n• ')
        .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
        .trim()
        .replace(/(\n• .*?)(\n[^•])/g, '$1\n\n$2')
        .replace(/\[as Fieldmo\]:/g, '')
        .replace(/\[In a conversational tone\]:/g, '');
    }
  }