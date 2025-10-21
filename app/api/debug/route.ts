import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Check if environment variable is available
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const postgresUrlPrefix = process.env.POSTGRES_URL?.substring(0, 30) || 'not found';

    // Try a simple query
    let queryResult = null;
    let queryError = null;

    try {
      const result = await sql`SELECT 1 as test`;
      queryResult = 'success';
    } catch (error) {
      queryError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      hasPostgresUrl,
      postgresUrlPrefix,
      queryResult,
      queryError,
      vercelEnv: process.env.VERCEL_ENV || 'not set',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
