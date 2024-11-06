// src/types/index.ts
export interface ConfigParams {
    orgKey: string;
    userKey: string;
    moduleKey: string;
    industry: string;
    subIndustry: string;
  }

  export interface SearchParamsProps {
    params: { [key: string]: string | string[] };
    searchParams: {
      org_key?: string;
      user_key?: string;
      module_key?: string;
      industry?: string;
      subindustry?: string;
    };
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