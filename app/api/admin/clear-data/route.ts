import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Use TRUNCATE CASCADE to automatically handle foreign key constraints
    // This will delete all data from these tables and any dependent data
    await db.execute(sql`TRUNCATE TABLE reflections, epoch_result, agent_log, training_data, training_run CASCADE`);
    console.log('✓ Deleted all reflections, epoch history, and training runs');

    return NextResponse.json({
      success: true,
      message: 'All data cleared except playbook',
      deleted: {
        reflections: 'all',
        epochResult: 'all',
        agentLog: 'all',
        trainingData: 'all',
        trainingRuns: 'all',
      },
      preserved: {
        playbook: 'all records kept',
      },
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
