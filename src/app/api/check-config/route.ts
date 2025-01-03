import { NextResponse } from 'next/server';
import { DirectoryManager } from '@/lib/utils/directory';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgKey = searchParams.get('org_key');
    const moduleKey = searchParams.get('module_key');

    if (!orgKey || !moduleKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const dirManager = new DirectoryManager();
    const exists = await dirManager.checkUserConfig(orgKey, moduleKey);

    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}