// src/app/api/params/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // You can add any server-side validation or processing here
    const params = {
      org_key: body.org_key,
      user_key: body.user_key ,
      module_key: body.module_key,
      industry: body.industry,
      subindustry: body.subindustry
    };

    // Make request to external service if needed
    const externalResponse = await fetch('https://customizer.fieldmobi.ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    const data = await externalResponse.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing parameters:', error);
    return NextResponse.json(
      { error: 'Failed to process parameters' },
      { status: 500 }
    );
  }
}
