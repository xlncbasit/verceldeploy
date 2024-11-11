// src/app/api/chat/summary/route.ts
import { NextResponse } from 'next/server';
import { ClaudeAPI } from '@/lib/claude/api';
import { DirectoryManager } from '@/lib/utils/directory';
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

    // Get current configuration
    const dirManager = new DirectoryManager();
    const configs = await dirManager.getRawConfigurations(params);

    // Initialize Claude API and get summary
    const claude = new ClaudeAPI();
    const summary = await claude.analyzeConfiguration(configs.configContent);

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error generating configuration summary:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate configuration summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}