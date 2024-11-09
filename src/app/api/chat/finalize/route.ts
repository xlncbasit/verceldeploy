// src/app/api/chat/finalize/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import { DirectoryManager } from '@/lib/utils/directory';
import { ConfigValidator } from '@/lib/utils/validation';
import type { ChatMessage, ConfigParams, ConfigFiles } from '@/types';

// Define response types
interface ClaudeResponse {
  configuration: string;
  explanation: string;
  codesets?: string;
}

// Create a timeout promise
const timeout = (ms: number) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
});

// Define response headers
const responseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-transform',
} as const;

export async function POST(request: Request) {
  try {
    // Parse request with timeout
    const body = await Promise.race([
      request.json(),
      timeout(5000)
    ]) as {
      conversationHistory: ChatMessage[];
      params: ConfigParams;
    };

    const { conversationHistory, params } = body;

    // Validate input
    if (!conversationHistory || !params) {
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

    // Initialize managers
    const dirManager = new DirectoryManager();
    const claude = new ClaudeAPI();

    // Get both configuration and codeset files
    let files: ConfigFiles;
    try {
      files = await dirManager.getRawConfigurations(params);
      console.log('Retrieved configuration files:', {
        type: files.type,
        configLength: files.configContent.length,
        codesetLength: files.codesetContent.length,
        configContent: files.configContent,
        codesetContent: files.codesetContent
      });
    } catch (error) {
      console.error('Error retrieving configurations:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve current configurations' },
        { status: 500, headers: responseHeaders }
      );
    }

    // Build requirements summary
    const requirementsSummary = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.trim())
      .filter(Boolean)
      .join('\n\n');

    // Process with Claude using both files with timeout
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

      // Validate Claude response
      if (!claudeResponse || !claudeResponse.configuration) {
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

    // Structure the response
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
      success: true
    };

    console.log('Finalization completed successfully:', {
      type: files.type,
      hasCodesetUpdates: !!claudeResponse.codesets
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
export const maxDuration = 180; // 3 minutes maximum