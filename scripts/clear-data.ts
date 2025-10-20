import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function clearData() {
  try {
    console.log('🗑️  Starting data cleanup...');

    // Use raw SQL with CASCADE to handle foreign keys
    // Clear child tables first
    await db.execute(sql.raw('TRUNCATE TABLE reflections CASCADE'));
    console.log('✓ Cleared reflections table');

    await db.execute(sql.raw('TRUNCATE TABLE epoch_result CASCADE'));
    console.log('✓ Cleared epoch_result table');

    await db.execute(sql.raw('TRUNCATE TABLE agent_log CASCADE'));
    console.log('✓ Cleared agent_log table');

    await db.execute(sql.raw('TRUNCATE TABLE training_data CASCADE'));
    console.log('✓ Cleared training_data table');

    // Clear parent table last
    await db.execute(sql.raw('TRUNCATE TABLE training_run CASCADE'));
    console.log('✓ Cleared training_run table');

    console.log('✅ All data cleared successfully (playbook preserved)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearData();
