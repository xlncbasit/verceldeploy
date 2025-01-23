// src/lib/utils/configSync.ts
import { DirectoryManager } from './directory';
import type { ConfigParams } from '@/types';
import Papa from 'papaparse';

type ModuleType = 'MASTER' | 'TRANSACTIONS' | 'UPDATES' | 'BALANCE';

interface ModuleConfig {
  name: string;
  type: ModuleType;
  syncFields: string[];
}

interface RowData {
    fieldCode?: string;
    field_code?: string;
    label?: string;
    display_name?: string;
    data?: string;
    field_data?: string;
    list_type?: string;
    listType?: string;
    list_value?: string;
    listValue?: string;
    customization?: string;
  }
interface ConfigGroup {
  name: string;
  modules: Record<string, ModuleConfig>;
}

interface ParsedConfigRow {
  fieldCode: string;
  label?: string;
  data?: string;
  customization?: string;
  list_type?: string;
  list_value?: string;
  access_level?: string;
  message?: string;
  default?: string;
  validation?:string;
  multi_group?: string;
  hidden?: string;
  link_setup?: string;
  update_setup?: string;
  filter?: string;
  search?: string;
  sort?: string;
  mobile?: string;
  detail?: string;
  create?: string;
  edit?: string;
  select?: string;
  map?: string;
  card?: string;
  report?: string;
  [key: string]: unknown;
}

export interface SyncConfig {
  config: string;
  codesets?: string;
}

export class ConfigSyncManager {
  private dirManager: DirectoryManager;
  
  constructor() {
    this.dirManager = new DirectoryManager();
  }

  private static configGroups: Record<string, ConfigGroup> = {
    PRODUCT: {
      name: 'Product Group',
      modules: {
        'FM_MATERIAL_OBJECT_PRODUCTLITE_MANAGER': { 
          name: 'Product Master', 
          type: 'MASTER' as ModuleType,
          syncFields: ['fieldType', 'displayName', 'description', 'listType', 'listValues', 'required', 'unique', 'searchable']
        },
        'FM_MATERIAL_OBJECT_INVENTORYLITE_ALL': { 
          name: 'Inventory Transactions', 
          type: 'TRANSACTIONS' as ModuleType,
          syncFields: ['displayName', 'description', 'listType', 'listValues']
        },
        'FM_MATERIAL_UPDATE_INVENTORYLITE_ALL': { 
          name: 'Inventory Updates', 
          type: 'UPDATES' as ModuleType,
          syncFields: ['displayName', 'description']
        }
      }
    },
    ASSET: {
      name: 'Asset Group',
      modules: {
        'FM_ASSETS_OBJECT_ASSETLITE_ALL': { 
          name: 'Asset Master', 
          type: 'MASTER' as ModuleType,
          syncFields: ['fieldType', 'displayName', 'description', 'listType', 'listValues', 'required', 'unique']
        },
        'FM_ASSETS_OBJECT_PRODUCTLITE_ALL': { 
          name: 'Asset Transactions', 
          type: 'TRANSACTIONS' as ModuleType,
          syncFields: ['displayName', 'description', 'listType']
        }
      }
    },
    LEADS: {
      name: 'Leads Group',
      modules: {
        'FM_SALES_OBJECT_LEADSLITE_ALL': { 
          name: 'Leads Master', 
          type: 'MASTER' as ModuleType,
          syncFields: ['fieldType', 'displayName', 'description', 'listType', 'listValues']
        },
        'FM_SALES_UPDATE_LEADSLITE_ALL': { 
          name: 'Leads Updates', 
          type: 'UPDATES' as ModuleType,
          syncFields: ['displayName', 'description']
        }
      }
    }
  };
  

  private async parseConfigCSV(csvContent: string, params: ConfigParams): Promise<{ headers: string[], data: ParsedConfigRow[] }> {
  return new Promise((resolve, reject) => {
    if (!csvContent?.trim()) {
      throw new Error('Empty CSV content');
    }

    const lines = csvContent.split('\n');
    const headers = lines.slice(0, 5);
    const contentLines = lines.slice(5);

    // Process module line
    const moduleLine = headers[1].split(',');
    if (moduleLine[0]?.toLowerCase().trim() === 'module') {
      moduleLine[1] = 'Customization';
      moduleLine[2] = params.orgKey;
      headers[1] = moduleLine.join(',');
    }

    Papa.parse(contentLines.join('\n'), {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (!results.data?.length) {
          return reject(new Error('No valid data rows found'));
        }
  
          const rows = results.data as unknown[][];
          
          const processedData = rows
            .filter((row): row is unknown[] => 
              Array.isArray(row) && row.some(cell => 
                cell !== null && cell !== undefined && String(cell).trim() !== ''
              )
            )
            .map((row): ParsedConfigRow => ({
              fieldCode: String(row[0] || '').trim(),
              type: String(row[1] || '').trim(),
              data: String(row[2] || '').trim(),
              label: String(row[3] || '').trim(),
              access_level: String(row[4] || '').trim(),
              message: String(row[5] || '').trim(),
              default: String(row[6] || '').trim(),
              validation: String(row[7] || '').trim(),
              list_type: String(row[8] || '').trim(),
              list_value: String(row[9] || '').trim(),
              multi_group: String(row[10] || '').trim(),
              hidden: String(row[11] || '').trim(),
              link_setup: String(row[12] || '').trim(),
              update_setup: String(row[13] || '').trim(),
              filter: String(row[14] || '').trim(),
              search: String(row[15] || '').trim(),
              sort: String(row[16] || '').trim(),
              mobile: String(row[17] || '').trim(),
              detail: String(row[18] || '').trim(),
              create: String(row[19] || '').trim(),
              edit: String(row[20] || '').trim(),
              select: String(row[21] || '').trim(),
              map: String(row[22] || '').trim(),
              card: String(row[23] || '').trim(),
              report: String(row[24] || '').trim(),
              customization: String(row[26] || '').trim()
            }));
  
          resolve({
            headers,
            data: processedData
          });
        },
        error: (error: Error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        }
      });
    });
  }

  private writeConfigCSV(headers: string[], data: ParsedConfigRow[]): string {
    // Convert data rows to CSV
    console.log('Writing headers:', headers);
    const dataContent = Papa.unparse(data.map(row => ([
      row.fieldCode,
      row.type,
      row.data,
      row.label,
      row.access_level,
      row.message,
      row.default,
      row.validation,
      row.list_type,
      row.list_value,
      row.multi_group,
      row.hidden,
      row.link_setup,
      row.update_setup,
      row.filter,
      row.search,
      row.sort,
      row.mobile,
      row.detail,
      row.create,
      row.edit,
      row.select,
      row.list,
      row.map,
      row.card,
      row.report,
      '', // Empty column
      row.customization,
      '', '', '', '', '', '', '' // Empty trailing columns
    ])), {
      header: false,
      skipEmptyLines: false
    });
  
    // Combine headers and data
    return [...headers, dataContent].join('\n');
  }

  private getModuleInfo(moduleKey: string): {
    group: ConfigGroup | null;
    moduleConfig: ModuleConfig | null;
  } {
    for (const [_, group] of Object.entries(ConfigSyncManager.configGroups)) {
      const moduleConfig = group.modules[moduleKey];
      if (moduleConfig) {
        return { group, moduleConfig };
      }
    }
    return { group: null, moduleConfig: null };
  }

  private async syncModule(
    sourceModule: ModuleConfig,
    targetModule: ModuleConfig,
    sourceConfig: ParsedConfigRow[],
    targetConfig: ParsedConfigRow[],
    params: ConfigParams
  ): Promise<ParsedConfigRow[]> {
    console.log('Starting syncModule', {
      sourceModule: sourceModule.name,
      targetModule: targetModule.name,
      sourceConfigLength: sourceConfig.length,
      targetConfigLength: targetConfig.length
    });
    
    const updatedConfig: ParsedConfigRow[] = JSON.parse(JSON.stringify(targetConfig));

    updatedConfig.forEach(row => {
      if (row.fieldCode?.toLowerCase() === 'module'){
        row.type = 'Customization';
        row.data = params.orgKey;
      }
    })
    
    // Handle NEW fields
    const newFields = sourceConfig.filter(row => row.customization === 'NEW' && row.fieldCode && row.data);

    // console.log(`Found ${newFields.length} NEW fields to process`);

    for (const newField of newFields) {
      // console.log(`Processing new field: ${newField.fieldCode}`, newField);
      const dataValue = newField.data;
      
      const existingField = updatedConfig.find(row => row.data === dataValue);
      // console.log('Checking for existing field:', { dataValue, exists: !!existingField });
      
      if (!existingField) {
        updatedConfig.push({
          ...newField,
          customization: 'NEW'
        });
        console.log(`Added new field to target config:`, newField);
      }
    }

    console.log('Processing field updates');
    for (const sourceRow of sourceConfig) {
      if (!sourceRow.data) {
        console.log(`Skipping row without data value:`, sourceRow);
        continue;
      }

      const matchingFields = updatedConfig.filter(row => row.data === sourceRow.data);
      console.log(`Found ${matchingFields.length} matching fields for data:`, sourceRow.data);

      for (const targetRow of matchingFields) {
        let hasChanges = false;
        const changes: Record<string, { from: string, to: string }> = {};

        if (sourceRow.label && sourceRow.label !== targetRow.label) {
          changes.label = { from: targetRow.label || '', to: sourceRow.label };
          targetRow.label = sourceRow.label;
          hasChanges = true;
        }

        if (sourceRow.list_type && sourceRow.list_type !== targetRow.list_type) {
          changes.list_type = { from: targetRow.list_type || '', to: sourceRow.list_type };
          targetRow.list_type = sourceRow.list_type;
          hasChanges = true;
        }

        if (sourceRow.list_value && sourceRow.list_value !== targetRow.list_value) {
          changes.list_value = { from: targetRow.list_value || '', to: sourceRow.list_value };
          targetRow.list_value = sourceRow.list_value;
          hasChanges = true;
        }

        if (hasChanges) {
          targetRow.customization = 'CHANGE';
          console.log(`Updated field ${targetRow.fieldCode}:`, changes);
        }
      }
    }

    console.log('Sync module complete:', {
      updatedFields: updatedConfig.length,
      changedFields: updatedConfig.filter(row => row.customization === 'CHANGE').length,
      newFields: updatedConfig.filter(row => row.customization === 'NEW').length
    });

    return updatedConfig;
  }

  public async syncGroupConfigurations(
    params: ConfigParams, 
    updatedConfig: SyncConfig
  ): Promise<void> {
    try {
      console.log('Starting group sync for module:', params.moduleKey);
      
      const { group, moduleConfig } = this.getModuleInfo(params.moduleKey);
      if (!group || !moduleConfig) {
        console.log('No group configuration found for module:', params.moduleKey);
        return;
      }
  
      // Parse source configuration with headers
      const sourceConfigWithHeaders = await this.parseConfigCSV(updatedConfig.config, params);
      console.log('Parsed source configuration with headers');
  
      const dependentModules = Object.entries(group.modules)
        .filter(([key]) => key !== params.moduleKey);
  
      for (const [moduleKey, targetModule] of dependentModules) {
        console.log(`Processing dependent module: ${moduleKey}`);
        
        const targetParams = { ...params, moduleKey };
        const targetFiles = await this.dirManager.getRawConfigurations(targetParams);
        const targetConfigWithHeaders = await this.parseConfigCSV(targetFiles.configContent, params);
  
        const updatedTargetConfig = await this.syncModule(
          moduleConfig,
          targetModule,
          sourceConfigWithHeaders.data,
          targetConfigWithHeaders.data,
          params
        );
  
        // Write configuration preserving original headers
        const newConfigCSV = this.writeConfigCSV(
          targetConfigWithHeaders.headers, // Use target's original headers
          updatedTargetConfig
        );
  
        await this.dirManager.writeConfigurations(
          targetParams,
          newConfigCSV,
          updatedConfig.codesets || targetFiles.codesetContent
        );
  
        console.log(`Successfully synchronized module: ${moduleKey}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to synchronize group configurations:', error);
      throw new Error(`Failed to synchronize group configurations: ${errorMessage}`);
    }
  }


  public async getSyncSummary(params: ConfigParams) {
    const { group, moduleConfig } = this.getModuleInfo(params.moduleKey);
    return {
      groupName: group?.name || 'Unknown',
      moduleType: moduleConfig?.type || 'Unknown',
      syncedModules: Object.keys(group?.modules || {}).filter(key => key !== params.moduleKey),
      timestamp: new Date().toISOString()
    };
  }
}