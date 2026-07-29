import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    return NextResponse.json({
      ok: true,
      message: 'PayPal capture-order endpoint is ready.',
      received: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to process PayPal capture-order request.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
