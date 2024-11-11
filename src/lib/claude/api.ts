  //src/lib/claude/api.ts
  import { Anthropic } from '@anthropic-ai/sdk';
  import type { ConfigParams } from '@/types';
  import { ConfigWriter } from '../config/writer';

  export class ClaudeAPI {
    private client: Anthropic;
    private model = 'claude-3-5-sonnet-20241022';
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


  1. REQUIREMENTS GATHERING MODE
    When engaged in conversation:
    - Use professional yet approachable tone
    - Ask focused questions
    - Validate understanding
    - Share relevant examples
    - Provide industry insights
    - Document specific needs
    - Flag potential issues


  2. CONFIGURATION MODE
    When processing changes:
    - Follow exact CSV structure
    - Maintain data integrity
    - Validate all modifications
    - Ensure compliance
    - Verify relationships




  # RESPONSE FORMATS


  1. Conversation Response:
    Structure: 
    
    - Provide insights
    - Share best practices
    - Note concerns
    - Ask follow-ups (max 2)


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
    rawCodesets: string
  ): Promise<{ reply: string }> {
    try {
      if (!this.configSummary) {
        // Get config summary if not already available
        await this.analyzeConfiguration(rawConfig);
      }

      const conversationPrompt = `You are a friendly ERP consultant and implementation expert who helps organizations customize their ERP applications. You're currently assisting with the ${params.moduleKey} module for a ${params.industry} organization, specifically in ${params.subIndustry}.

Current Configuration Summary:
${this.configSummary}

  Your personality:
  - Friendly yet professional
  - Clear and concise
  - Practical and solution-focused
  - Patient and attentive
  - Short and crisp replies
  - Avoid repeating things

  Guide the conversation naturally:
  •Use bullet points for lists
  • Keep paragraphs short (2-3 lines max)
  • Bold important points using **text**
  • Use clear sections with headings
  • Add line breaks between sections
  • Use \n tag for new lines

  User's Message: "${message}"
    
  ${!message ? `Let me know how I can help you with your configuration. Here are some options:
  Option 1: Explore specific changes to your current setup
  Option 2: Get recommendations based on industry best practices` : ''} 

  When the user selects either of the options, the conversion should continue as follows:
        
        For Option 1, The specific changes path:
        - Listen to their needs
        - Ask clarifying questions naturally
        - Suggest complementary improvements
        - Guide them through implications
        
        For Option 2, the industry recommendations path:
        - Suggest practical field types with relevant use cases
        - Relate suggestions to their business context
        - Build on their responses
        - Keep suggestions focused and achievable
        
  In case the user does not share information as directed, ask if they can provide more context.
        
  Remember to:
  - Maintain a natural conversation flow
  - Share relevant examples
  - Build on previous discussions
  - Keep technical details clear but approachable
  - Guide without being overly prescriptive `;

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

    async processFinalization(
      requirementsSummary: string,
      rawConfig: string,
      rawCodesets: string,
      params: ConfigParams
    ): Promise<{
      configuration: string;
      
      codesets: string;
    }> {
      try {
        const finalizationPrompt = `${this.systemInstructions}

        CRITICAL INSTRUCTIONS:
  You MUST respond with ONLY these sections, exactly as shown:

  CONFIGURATION:
  [Complete CSV content preserving structure and format]

  CODESETS:
  [Complete CSV content preserving structure and format if modified]

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

    

  2. CUSTOMIZATION COLUMN (Column AA) RULES (Previously "Remarks"):
    - CHANGE: Apply to any customized fields
    - NONE: Use for unchanged fields (except those marked NEVER)
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
      * Header row format: codeset,Type,application,Name,FIELDMOBI_DEFAULT,
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
        const sections = this.parseResponse(content);

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

    public parseResponse(response: string): {
      configuration: string;
      codesets?: string;
    } {
      // Initialize empty results
      let configuration = '';
      let codesets = undefined;
    
      try {
        // Clean up the response text
        const cleanText = response
          .replace(/^\s*[\[\]]\s*/gm, '')  // Remove brackets from section markers
          .replace(/\r\n/g, '\n');         // Normalize line endings
    
        // Split response into sections using regex for section headers
        const sections = cleanText.split(/(?=^CONFIGURATION:|^CODESETS:)/im);
    
        // Process each section
        sections.forEach(section => {
          const trimmedSection = section.trim();
          
          // Handle Configuration section
          if (/^CONFIGURATION:/i.test(trimmedSection)) {
            configuration = trimmedSection
              .replace(/^CONFIGURATION:\s*/i, '')  // Remove header with any following whitespace
              .trim()
              .split('\n')
              .filter(line => line.trim() !== '')  // Remove empty lines
              .join('\n');
          }
          
          // Handle Codesets section
          else if (/^CODESETS:/i.test(trimmedSection)) {
            codesets = trimmedSection
              .replace(/^CODESETS:\s*/i, '')  // Remove header with any following whitespace
              .trim()
              .split('\n')
              .filter(line => line.trim() !== '')  // Remove empty lines
              .join('\n');
          }
        });
    
        // Debug logging
        console.log('Parsed Configuration:', configuration);
        console.log('Parsed Codesets:', codesets);

    
        // Validate configuration is not empty
        if (!configuration) {
          throw new Error('Configuration section is missing or empty');
        }
    
        // Return parsed sections
        return {
          configuration,
          codesets: codesets || undefined  // Only include codesets if present
        };
    
      } catch (error) {
        console.error('Error parsing Claude response:', error);
        throw new Error(`Failed to parse response: `);
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
      .trim()
      console.log('rawwwtext:', customizedrawText)
      return customizedrawText;
    }

    private formatConversationalResponse(text: string): string {
      return text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[•-]\s*/gm, '\n• ')
        .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
        .trim()
        .replace(/(\n• .*?)(\n[^•])/g, '$1\n\n$2');
    }
  }