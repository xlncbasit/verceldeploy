//src/app/api/chat/finalize/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import { DirectoryManager } from '@/lib/utils/directory';
import { ConfigParser } from '@/lib/config/parser';
import { ConfigValidator } from '@/lib/utils/validation';
import type { ChatMessage, ConfigParams } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationHistory, params } = body as { 
      conversationHistory: ChatMessage[];
      params: ConfigParams;
    };

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

    // Build requirements summary from conversation
    const requirementsSummary = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n');

    // Process with Claude in configuration mode
    const result = await claude.processFinalization(requirementsSummary, currentConfig, params);

    console.log('Claude Finalization Response:', result);

    return NextResponse.json({
      currentConfig,
      proposedConfig: result.updatedConfig,
      summary: result.explanation,
      success: true
    });

  } catch (error) {
    console.error('Error in finalization:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process finalization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}