import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function checkData() {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM training_data`);
    console.log('Training data count:', result.rows[0]);

    const playbookResult = await db.execute(sql`SELECT COUNT(*) as count FROM playbook`);
    console.log('Playbook count:', playbookResult.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
