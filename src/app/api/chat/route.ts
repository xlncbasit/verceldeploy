//src/api/chat/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import type { ConfigParams } from '@/types';
import { ConfigValidator } from '@/lib/utils/validation';

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

    // Initialize Claude API
    const claude = new ClaudeAPI();

    // Process with Claude in conversation mode
    const response = await claude.processConversation(message, params);

    return NextResponse.json({
      success: true,
      response: response.reply,
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