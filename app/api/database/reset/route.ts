import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🗑️  Starting database reset (preserving playbook)...');

    // Use TRUNCATE CASCADE to automatically handle foreign key constraints
    // This will delete all data from these tables and any dependent data
    // The playbook table is intentionally NOT included in this list
    await db.execute(
      sql`TRUNCATE TABLE reflections, epoch_result, agent_log, training_data, training_run CASCADE`
    );

    console.log('✅ Database reset complete!');
    console.log('   Deleted: reflections, epoch_result, agent_log, training_data, training_run');
    console.log('   Preserved: playbook (all entries kept)');

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully! Next training run will start with Run ID #1.',
      deleted: {
        reflections: 'all',
        epoch_result: 'all',
        agent_log: 'all',
        training_data: 'all',
        training_run: 'all',
      },
      preserved: {
        playbook: 'all records kept',
      },
    });
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
