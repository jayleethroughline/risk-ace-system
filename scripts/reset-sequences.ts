/**
 * Reset Database to Initial State
 *
 * This script:
 * 1. Removes training-added heuristics from playbook (keeps baselines)
 * 2. Resets baseline heuristics counters to 0
 * 3. Deletes all training runs, epochs, reflections, and logs
 * 4. Resets all PostgreSQL sequences to start from 1
 *
 * Usage:
 *   POSTGRES_URL="..." npx tsx scripts/reset-sequences.ts
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

async function resetSequences() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('Error: POSTGRES_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('Resetting database to initial state...\n');

  try {
    // Step 1: Clean up playbook - delete all training-added heuristics
    // Pattern matches: r[digits]-e[digits]-[digits] (e.g., r1-e2-1, r10-e5-3)
    console.log('Cleaning playbook table...');
    const deletedResult = await db.execute(sql`
      DELETE FROM playbook
      WHERE bullet_id ~ 'r[0-9]+-e[0-9]+-[0-9]+'
    `);
    console.log(`✓ Deleted training-added heuristics from playbook`);

    // Step 2: Reset baseline heuristics counters
    const resetResult = await db.execute(sql`
      UPDATE playbook
      SET helpful_count = 0,
          harmful_count = 0,
          run_id = NULL,
          epoch_number = NULL,
          last_updated = CURRENT_TIMESTAMP
      WHERE bullet_id !~ 'r[0-9]+-e[0-9]+-[0-9]+'
    `);
    console.log(`✓ Reset baseline heuristics counters\n`);

    // Step 3: Delete all training run data
    console.log('Deleting training data...');
    await db.execute(sql`DELETE FROM agent_log`);
    console.log('✓ Deleted agent logs');

    await db.execute(sql`DELETE FROM training_data`);
    console.log('✓ Deleted training data');

    await db.execute(sql`DELETE FROM epoch_result`);
    console.log('✓ Deleted epoch results');

    await db.execute(sql`DELETE FROM reflections`);
    console.log('✓ Deleted reflections');

    await db.execute(sql`DELETE FROM training_run`);
    console.log('✓ Deleted training runs\n');

    console.log('Resetting sequences...');
    // Reset training_run sequence
    await db.execute(sql`SELECT setval('training_run_run_id_seq', 1, false)`);
    console.log('✓ Reset training_run_run_id_seq to 1');

    // Reset epoch_result sequence
    await db.execute(sql`SELECT setval('epoch_result_epoch_id_seq', 1, false)`);
    console.log('✓ Reset epoch_result_epoch_id_seq to 1');

    // Reset reflections sequence
    await db.execute(sql`SELECT setval('reflections_reflection_id_seq', 1, false)`);
    console.log('✓ Reset reflections_reflection_id_seq to 1');

    // Reset agent_log sequence
    await db.execute(sql`SELECT setval('agent_log_log_id_seq', 1, false)`);
    console.log('✓ Reset agent_log_log_id_seq to 1');

    // Reset training_data sequence
    await db.execute(sql`SELECT setval('training_data_data_id_seq', 1, false)`);
    console.log('✓ Reset training_data_data_id_seq to 1');

    console.log('\n✅ Database reset complete!');
    console.log('   • Training-added heuristics removed from playbook');
    console.log('   • Baseline heuristics counters reset to 0');
    console.log('   • All training runs, epochs, and logs deleted');
    console.log('   • All sequences reset to start from 1');
    console.log('\nDatabase is now in initial state and ready for new training runs.');
  } catch (error) {
    console.error('Error resetting sequences:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetSequences();
