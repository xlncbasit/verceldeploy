// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import { DirectoryManager } from '@/lib/utils/directory';
import { ConfigParser } from '@/lib/config/parser';
import { ConfigWriter } from '@/lib/config/writer';
import { ConfigValidator } from '@/lib/utils/validation';
import type { ConfigParams, ClaudeResponse } from '@/types';

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { message, params } = body as { message: string; params: ConfigParams };

    if (!message || !params) {
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

    // Initialize managers
    const dirManager = new DirectoryManager();
    const claude = new ClaudeAPI();

    // Get current configuration
    const configResponse = await dirManager.getConfigurationPath(params);
    const currentConfig = await ConfigParser.parseCSV(configResponse.configPath);

    // Process with Claude
    const { updatedConfig, explanation, codesetUpdates } = 
      await claude.processCustomization(message, currentConfig, params);

    // If not already using user config, create user directory
    if (configResponse.type !== 'user') {
      await dirManager.createUserDirectory(params);
    }

    // Update configuration
    const configPath = dirManager.getUserConfigFilePath(params, 'config');
    if (updatedConfig) {
      await ConfigWriter.writeCSV(configPath, updatedConfig);
  } else {
      // Handle the case where updatedConfig is undefined
      // For example, you might log an error, throw an exception, or initialize it to an empty array
      console.error('Updated configuration is undefined.');
      // Optionally, you can initialize it to an empty array if that's appropriate
      // await ConfigWriter.writeCSV(configPath, []);
  }

    // Update codesets if needed
    if (codesetUpdates) {
      const codesetPath = dirManager.getUserConfigFilePath(params, 'codesetvalues');
      await ConfigWriter.updateCodesetValues(codesetPath, codesetUpdates);
    }

    return NextResponse.json({
      success: true,
      response: explanation,
      configUpdated: true
    });

  } catch (error) {
    console.error('Error processing chat:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}