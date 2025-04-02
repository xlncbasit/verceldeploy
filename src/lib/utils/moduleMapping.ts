// src/lib/utils/moduleMapping.ts

/**
 * Complete mapping between module codes and their human-readable labels
 * This dictionary provides bidirectional lookup for all modules in the system
 */
const moduleMapping: Record<string, string> = {
    // System Administration Modules
    "FM_SYSADMIN_OBJECT_DEPARTMENTLITE_ADMIN": "Departments",
    "FM_SYSADMIN_OBJECT_REGIONLITE_ADMIN": "Regions",
    "FM_SYSADMIN_OBJECT_TEAMSLITE_ADMIN": "Teams",
    "FM_SYSADMIN_OBJECT_USERLITE_ADMIN": "Users",
    "FM_SYSADMIN_OBJECT_SUBSCRIPTIONLITE_ADMIN": "Subscription",
    "FM_SYSADMIN_OBJECT_LOCATIONLITE_ADMIN": "Locations",
    "FM_SYSADMIN_OBJECT_PROJECTLITE_ADMIN": "Projects",
    "FM_SYSADMIN_OBJECT_PRODUCTLITE_MANAGER": "Products and Services",
    "FM_PARTNER_OBJECT_PARTNERLITE_ALL": "Business Partners",
  
    // Workforce Management Modules
    "FM_WORKFORCE_OBJECT_WORKFORCELITE_ALL": "Workforce Master",
    "FM_WORKFORCE_UPDATE_ATTENDANCELITE_ALL": "Attendance Reporting",
    "FM_WORKFORCE_UPDATE_EXPENSELITE_ALL": "Expense Reporting",
    "FM_WORKFORCE_CONTROL_EXPENSES_ALL": "Expense Claims",
    "FM_WORKFORCE_SUMMARY_DAILYLITE_TEAMLEAD": "Daily Work Summary",
    "FM_WORKFORCE_SUMMARY_MONTHLYLITE_TEAMLEAD": "Monthly Activity Summary",
    "FM_WORKFORCE_STATUS_MESSAGES_ALL": "The Beeline",
    "FM_WORKFORCE_OPEN_EXPENSES_ALL": "Outstanding Employee Claims",
  
    // Service Management Modules
    "FM_WORKFORCE_OBJECT_CATEGORYLITE_ALL": "Service Master",
    "FM_WORKFORCE_ACTIVITIES_WORKLITE_ALL": "Service Assignment",
    "FM_WORKFORCE_UPDATE_WORKLITE_ALL": "Service Updates",
    "FM_SERVICE_SUMMARY_MONTHLYLITE_TEAMLEAD": "Monthly Activity Summary",
  
    // Asset Management Modules
    "FM_ASSETS_OBJECT_CATEGORYLITE_ALL": "Asset Category Master",
    "FM_ASSETS_OBJECT_ASSETSLITE_ALL": "Asset List",
    "FM_ASSETS_ACTIVITIES_ASSETSLITE_ALL": "Asset Activity Assignment",
    "FM_ASSETS_UPDATE_ASSETSLITE_ALL": "Asset Activity Updates",
    "FM_ASSETS_SUMMARY_INVENTORYLITE_ALL": "Asset Balance",
  
    // Material/Inventory Management Modules
    "FM_MATERIAL_OBJECT_PRODUCTLITE_MANAGER": "Product Master",
    "FM_MATERIAL_SETUP_INVENTORYLITE_MANAGER": "Opening Stock and Inventory Setup",
    "FM_MATERIAL_OPEN_INVENTORYLITE_MANAGER": "Opening Stock and Inventory Setup",
    "FM_MATERIAL_SUMMARY_INVENTORYLITE_ALL": "Stock Balance",
    "FM_MATERIAL_SUMMARY_STORAGEINVENTORYLITE_ALL": "Storage-wise Stock Balance",
    "FM_MATERIAL_ACTIVITIES_INVENTORYLITE_ALL": "Material Activity Assignment",
    "FM_MATERIAL_UPDATE_INVENTORYLITE_ALL": "Material Activity Updates",
    "FM_MATERIAL_TRANSACTIONS_INVENTORYLITE_ALL": "Stock Transactions",
  
    // Customer Management Modules
    "FM_CUSTOMER_OBJECT_PARTNERLITE_ALL": "Customer Account Master",
    "FM_CUSTOMER_ASSIGNMENT_PARTNERLITE_ALL": "Customer Assignment",
    "FM_CUSTOMER_REPORTING_PARTNERLITE_ALL": "Customer Updates",
    "FM_CUSTOMER_ACTIVITIES_ENQUIRYLITE_ALL": "Enquiries",
    "FM_CUSTOMER_UPDATE_ENQUIRYLITE_ALL": "Enquiry Updates",
    "FM_CUSTOMER_ACTIVITIES_ORDERLITE_ALL": "Sales Orders",
    "FM_CUSTOMER_UPDATE_PLANNINGLITE_ALL": "Sales Order Milestones and Planning",
    "FM_CUSTOMER_CONTROL_INVOICELITE_ALL": "Customer Invoices (AR)",
    "FM_CUSTOMER_SUMMARY_SALESLITE_ALL": "Monthly Customer Summary",
    "FM_CUSTOMER_OPEN_INVOICELITE_ALL": "Outstanding Customer Invoices",
  
    // Vendor Management Modules
    "FM_VENDOR_OBJECT_PARTNERLITE_ALL": "Vendor Account Master",
    "FM_VENDOR_ACTIVITIES_ORDERLITE_ALL": "Purchase Orders",
    "FM_VENDOR_UPDATE_PLANNINGLITE_ALL": "Purchase Order Milestones and Planning",
    "FM_VENDOR_CONTROL_INVOICELITE_ALL": "Vendor Invoices (AP)",
    "FM_VENDOR_SUMMARY_PURCHASELITE_ALL": "Monthly Vendor Summary",
    "FM_VENDOR_OPEN_INVOICELITE_ALL": "Outstanding Vendor Invoices",
  
    // Work Order Management Modules
    "FM_WORKORDER_ACTIVITIES_ORDERLITE_ALL": "Work Orders",
    "FM_WORKORDER_UPDATE_PLANNINGLITE_ALL": "Work Order Milestones and Planning",
    "FM_WORKORDER_UPDATE_CHARGEBACKLITE_ALL": "Internal Charge Backs",
  
    // Cash Bank and Financial Modules
    "FM_CASHBANK_OBJECT_CASHBANKLITE_MANAGER": "Cash Bank Master",
    "FM_CASHBANK_TRANSACTIONS_CASHBANKLITE_MANAGER": "Cash Bank Transactions",
    "FM_CASHBANK_UPDATE_OTHERLITE_MANAGER": "Other Cash Bank Updates",
    "FM_CASHBANK_UPDATE_RECEIPTSLITE_MANAGER": "Customer Receipts",
    "FM_CASHBANK_UPDATE_VENPAYMENTSLITE_MANAGER": "Vendor Payments",
    "FM_CASHBANK_UPDATE_EMPPAYMENTSLITE_MANAGER": "Expense Payments",
  
    // Accounting Modules
    "FM_ACCOUNTS_OBJECT_CHARGESLITE_MANAGER": "Charge Codes",
    "FM_ACCOUNTS_UPDATE_FINDATALITE_ALL": "Ledger Updates",
    "FM_ACCOUNTS_CONTROL_BALANCELITE_ALL": "Control Balances",
    "FM_ACCOUNTS_SUMMARY_BALANCELITE_ALL": "Financial Periodic Balances",
    "FM_ACCOUNTS_TRANSACTIONS_FINDATALITE_ALL": "Financial Transactions",
    "FM_ACCOUNTS_OPENCONTROL_BALANCELITE_ALL": "Open Control Balances",
    "FM_ACCOUNTS_OPENSUMMARY_BALANCELITE_ALL": "Open Financial Balances (GL)",
    "FM_ACCOUNTS_OPEN_CLOSURELITE_ALL": "Year End Closure"
  };
  
  /**
   * Gets the human-readable label for a module code
   * param moduleKey The technical module code/key
   * returns The user-friendly label, or the original code if not found
   */
  export function getModuleLabel(moduleKey: string): string {
    return moduleMapping[moduleKey] || moduleKey;
  }
  
  /**
   * Gets the technical module code for a given label (reverse lookup)
   * param label The human-readable label 
   * returns The technical module code, or undefined if not found
   */
  export function getModuleKeyFromLabel(label: string): string | undefined {
    const entries = Object.entries(moduleMapping);
    const found = entries.find(([_, value]) => value === label);
    return found ? found[0] : undefined;
  }
  
  /**
   * Replaces all module codes in a string with their human-readable labels
   * param content The string content to process
   * returns The content with all module codes replaced with labels
   */
  export function replaceAllModuleCodes(content: string): string {
    // Get all module codes to search for
    const moduleCodes = Object.keys(moduleMapping);
    
    // Sort by length (descending) to ensure longer codes are replaced first
    // This prevents partial replacement issues
    moduleCodes.sort((a, b) => b.length - a.length);
    
    // Replace each module code with its label
    let processedContent = content;
    for (const moduleCode of moduleCodes) {
      const moduleLabel = moduleMapping[moduleCode];
      
      // Use a regular expression to replace all instances
      // Add word boundary checks to prevent partial replacements
      const regex = new RegExp(`\\b${moduleCode}\\b`, 'g');
      processedContent = processedContent.replace(regex, moduleLabel);
    }
    
    return processedContent;
  }
  
  /**
   * Checks if a given string is a module code
   * param value The string to check
   * returns True if the string is a module code, false otherwise
   */
  export function isModuleCode(value: string): boolean {
    return Object.keys(moduleMapping).includes(value);
  }
  
  /**
   * Gets all module codes for a specific module type/category
   * param moduleType The module type to filter by (e.g., 'WORKFORCE', 'CUSTOMER')
   * returns Array of module codes that match the type
   */
  export function getModulesByType(moduleType: string): string[] {
    return Object.keys(moduleMapping).filter(code => 
      code.includes(`FM_${moduleType.toUpperCase()}_`)
    );
  }
  
  /**
   * Gets all available module labels grouped by type
   * returns Object with module types as keys and arrays of labels as values
   */
  export function getModuleLabelsByType(): Record<string, string[]> {
    const types = ['SYSADMIN', 'WORKFORCE', 'ASSETS', 'MATERIAL', 'CUSTOMER', 'VENDOR', 'WORKORDER', 'CASHBANK', 'ACCOUNTS'];
    
    return types.reduce((result, type) => {
      const codes = getModulesByType(type);
      result[type] = codes.map(code => moduleMapping[code]);
      return result;
    }, {} as Record<string, string[]>);
  }
  
  export default moduleMapping;