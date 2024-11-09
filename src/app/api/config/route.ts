// src/app/api/config/route.ts
import { NextResponse } from 'next/server';
import { DirectoryManager } from '@/lib/utils/directory';
import { ConfigParser } from '@/lib/config/parser';
import { ConfigWriter } from '@/lib/config/writer';
import { ConfigValidator } from '@/lib/utils/validation';
import type { ConfigParams } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = body.params as ConfigParams;

    // Validate parameters
    const validation = ConfigValidator.validateParams(params);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.errors },
        { status: 400 }
      );
    }

    const dirManager = new DirectoryManager();
    
    // Initialize directories if needed
    await dirManager.ensureDirectories();

    // Check for existing configuration
    const hasConfig = await dirManager.checkUserConfig(params.orgKey, params.moduleKey);
    
    if (!hasConfig) {
      // Create new user directory with initial config
      await dirManager.createUserDirectory(params);
    }

    // Get configuration path and load configuration
    const configResponse = await dirManager.getConfigurationPath(params);
    const config = await ConfigParser.parseCSV(configResponse.configPath);

    console.log('Fetched configuration: ', config);

    return NextResponse.json({
      exists: hasConfig,
      type: configResponse.type,
      config
    });

  } catch (error) {
    console.error('Error processing configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { params, config } = body as { params: ConfigParams; config: any[] };

    // Validate parameters and config
    const paramsValidation = ConfigValidator.validateParams(params);
    if (!paramsValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: paramsValidation.errors },
        { status: 400 }
      );
    }

    const configValidation = ConfigValidator.validateConfigData(config);
    if (!configValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: configValidation.errors },
        { status: 400 }
      );
    }

    const dirManager = new DirectoryManager();
    
    // Ensure user directory exists
    const hasConfig = await dirManager.checkUserConfig(params.orgKey, params.moduleKey);
    if (!hasConfig) {
      await dirManager.createUserDirectory(params);
    }

    // Get user config path and write updated configuration
    const configWriter = new ConfigWriter();
    

    const configPath = dirManager.getUserConfigFilePath(params, 'config');
    // await configWriter.writeCSV(params, config);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}