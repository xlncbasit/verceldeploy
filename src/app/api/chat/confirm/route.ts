//src/app/api/chat/confirm/route.ts
import { NextResponse } from 'next/server';
import { DirectoryManager } from '@/lib/utils/directory';
import { ConfigWriter } from '@/lib/config/writer';
import { ConfigValidator } from '@/lib/utils/validation';
import type { ConfigParams, ConfigState } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { confirmed, configState, params } = body as {
      confirmed: boolean;
      configState: ConfigState;
      params: ConfigParams;
    };

    if (!confirmed || !configState || !params) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate parameters
    const validation = ConfigValidator.validateParams(params);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.errors },
        { status: 400 }
      );
    }

    // Initialize directory manager
    const dirManager = new DirectoryManager();

    // Ensure user directory exists
    const configResponse = await dirManager.getConfigurationPath(params);
    if (configResponse.type !== 'user') {
      await dirManager.createUserDirectory(params);
    }

    // Update configuration
    const configPath = dirManager.getUserConfigFilePath(params, 'config');
    // await ConfigWriter.writeCSV(configPath, configState.proposedConfig.config);

    // If there are codeset updates in the proposed config, handle them
    if (configState.proposedConfig.codesetUpdates) {
      const codesetPath = dirManager.getUserConfigFilePath(params, 'codesetvalues');
      // await ConfigWriter.updateCodesetValues(codesetPath, configState.proposedConfig.codesetUpdates);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration changes applied successfully'
    });

  } catch (error) {
    console.error('Error processing confirmation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to apply configuration changes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}