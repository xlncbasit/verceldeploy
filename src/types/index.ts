// src/types/index.ts
export interface ConfigParams {
    orgKey: string;
    userKey: string;
    moduleKey: string;
    industry: string;
    subIndustry: string;
  }

  export interface ConfigFiles {
    type: 'user' | 'industry' | 'base';
    configContent: string;
    codesetContent: string;
  }
  
  export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  
  export interface ConfigResponse {
    exists: boolean;
    configPath: string;
    type: 'user' | 'industry' | 'base';
  }
  
  export interface ConfigData {
    [key: string]: string | number | boolean;
  }
  
  export interface CodesetValue {
    codeset: string;
    value: string;
  }
  
  export interface CodesetUpdate {
    codeset: string;
    values: string[];
  }

  export interface ClaudeResponse {
    updatedConfig: ConfigData[];
    explanation: string;
    codesetUpdates?: Record<string, string[]>;
  }

  export interface ConfigState {
    currentConfig: ConfigData[];
    proposedConfig: {
        config: ConfigData[];
        codesetUpdates?: Record<string, string[]>;
    };
    requirementsSummary: string;
}