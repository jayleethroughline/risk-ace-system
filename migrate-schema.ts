import { sql } from '@vercel/postgres';

async function migrateSchema() {
  try {
    console.log('Adding run_id and epoch_number to playbook table...');
    await sql`
      ALTER TABLE playbook
      ADD COLUMN IF NOT EXISTS run_id INTEGER,
      ADD COLUMN IF NOT EXISTS epoch_number INTEGER
    `;
    console.log('✓ playbook table updated');

    console.log('Adding tracking columns to reflections table...');
    await sql`
      ALTER TABLE reflections
      ADD COLUMN IF NOT EXISTS run_id INTEGER,
      ADD COLUMN IF NOT EXISTS epoch_number INTEGER,
      ADD COLUMN IF NOT EXISTS input_text TEXT,
      ADD COLUMN IF NOT EXISTS predicted TEXT,
      ADD COLUMN IF NOT EXISTS expected TEXT
    `;
    console.log('✓ reflections table updated');

    console.log('✓ Schema migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateSchema();
