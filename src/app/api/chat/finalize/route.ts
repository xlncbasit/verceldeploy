// src/app/api/chat/finalize/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import { DirectoryManager } from '@/lib/utils/directory';
import { ConfigValidator } from '@/lib/utils/validation';
import { ConfigSyncManager } from '@/lib/utils/configSync';
import type { ChatMessage, ConfigParams, ConfigFiles } from '@/types';

interface ConversationContext {
  pastRequirements: string[];
  keyDecisions: Record<string, string>;
  lastTopics: string[];
}

interface ClaudeResponse {
  configuration: string;
  explanation: string;
  codesets?: string;
}

interface SyncSummary {
  groupName: string;
  moduleType: string;
  syncedModules: string[];
  timestamp: string;
}

const timeout = (ms: number): Promise<never> => 
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });

const responseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-transform',
} as const;

export async function POST(request: Request) {
  try {
    const body = await Promise.race([
      request.json(),
      timeout(5000)
    ]) as {
      conversationHistory: ChatMessage[];
      params: ConfigParams;
      context?: ConversationContext;
    };

    const { conversationHistory, params, context } = body;

    // Validate input
    if (!conversationHistory?.length || !params) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: responseHeaders }
      );
    }

    // Validate parameters
    const validation = ConfigValidator.validateParams(params);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.errors },
        { status: 400, headers: responseHeaders }
      );
    }

    const dirManager = new DirectoryManager();
    const configSync = new ConfigSyncManager();
    const claude = new ClaudeAPI();

    let files: ConfigFiles;
    try {
      files = await dirManager.getRawConfigurations(params);
      console.log('Retrieved configuration files:', {
        type: files.type,
        configLength: files.configContent.length,
        codesetLength: files.codesetContent.length
      });
    } catch (error) {
      console.error('Error retrieving configurations:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve current configurations' },
        { status: 500, headers: responseHeaders }
      );
    }

    const requirementsSummary = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.trim())
      .filter(Boolean)
      .join('\n\n');

    let claudeResponse: ClaudeResponse;
    try {
      claudeResponse = await Promise.race([
        claude.processFinalization(
          requirementsSummary,
          files.configContent,
          files.codesetContent,
          params
        ),
        timeout(150000)
      ]) as ClaudeResponse;

      if (!claudeResponse?.configuration) {
        throw new Error('Invalid response structure from Claude');
      }

    } catch (error) {
      console.error('Error in Claude processing:', error);
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      
      return NextResponse.json(
        { 
          error: isTimeout ? 'Processing timed out' : 'Failed to process configurations',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { 
          status: isTimeout ? 504 : 500, 
          headers: responseHeaders 
        }
      );
    }

    // Write new configuration first
    await dirManager.writeConfigurations(
      params,
      claudeResponse.configuration,
      claudeResponse.codesets || files.codesetContent
    );

    let syncSummary: SyncSummary | null = null;
    try {
      await configSync.syncGroupConfigurations(params, {
        config: claudeResponse.configuration,
        codesets: claudeResponse.codesets
      });

      syncSummary = await configSync.getSyncSummary(params);
      console.log('Group synchronization completed:', syncSummary);
    } catch (error) {
      console.error('Error in group synchronization:', error);
      syncSummary = null;
    }

    const response = {
      currentConfig: {
        config: files.configContent,
        codesets: files.codesetContent,
        type: files.type
      },
      proposedConfig: {
        config: claudeResponse.configuration,
        codesets: claudeResponse.codesets || files.codesetContent,
      },
      summary: claudeResponse.explanation,
      groupSync: syncSummary ? {
        status: 'completed',
        details: syncSummary
      } : {
        status: 'skipped',
        details: 'Group synchronization failed or not required'
      },
      success: true
    };

    console.log('Finalization completed successfully:', {
      type: files.type,
      hasCodesetUpdates: !!claudeResponse.codesets,
      groupSyncCompleted: !!syncSummary
    });

    return NextResponse.json(response, { headers: responseHeaders });

  } catch (error) {
    console.error('Unhandled error in finalization:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process finalization request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500, 
        headers: responseHeaders 
      }
    );
  }
}

// Route configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes maximum for complex syncs