import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trainingData } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('run_id');

    if (!runId) {
      return NextResponse.json(
        { error: 'run_id parameter is required' },
        { status: 400 }
      );
    }

    // Fetch all training data for this run
    const data = await db
      .select({
        data_id: trainingData.data_id,
        data_type: trainingData.data_type,
        text: trainingData.text,
        true_category: trainingData.true_category,
        true_risk: trainingData.true_risk,
      })
      .from(trainingData)
      .where(eq(trainingData.run_id, parseInt(runId)));

    // Separate into train and eval
    const trainData = data.filter(d => d.data_type === 'train');
    const evalData = data.filter(d => d.data_type === 'eval');

    return NextResponse.json({
      run_id: parseInt(runId),
      train: trainData,
      eval: evalData,
    });
  } catch (error) {
    console.error('Error fetching training dataset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
