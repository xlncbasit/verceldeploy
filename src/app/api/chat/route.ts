// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import type { ConfigParams } from '@/types';
import { ConfigValidator } from '@/lib/utils/validation';

// Create a timeout promise
const timeout = (ms: number) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
});

interface ClaudeResponse {
  reply: string;
}

export async function POST(request: Request) {
  try {
    // Set response headers for streaming
    const headers = {
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    };

    // Parse request with timeout
    const body = await Promise.race([
      request.json(),
      timeout(5000) // 5s timeout for parsing
    ]) as { message: string; params: ConfigParams };

    const { message, params } = body;

    if (!message || !params) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers }
      );
    }

    // Validate parameters
    const validation = ConfigValidator.validateParams(params);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.errors },
        { status: 400, headers }
      );
    }

    // Initialize Claude API
    const claude = new ClaudeAPI();
    
    // Process with Claude with timeout
    const response = await Promise.race([
      claude.processConversation(message, params),
      timeout(50000) // 50s timeout for Claude API
    ]) as ClaudeResponse;

    return NextResponse.json({
      success: true,
      response: response.reply,
    }, { headers });

  } catch (error) {
    console.error('Error processing chat:', error);
    
    // Determine if it's a timeout error
    const isTimeout = error instanceof Error && 
      (error.message.includes('timed out') || error.message.includes('ETIMEDOUT'));
    
    return NextResponse.json(
      { 
        error: isTimeout ? 'Request timed out' : 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: isTimeout ? 504 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        }
      }
    );
  }
}

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;