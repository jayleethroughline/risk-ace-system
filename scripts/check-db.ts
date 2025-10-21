import { sql } from '@vercel/postgres';

async function checkDatabase() {
  try {
    console.log('Checking production database...\n');

    // Count total entries
    const countResult = await sql`SELECT COUNT(*) as count FROM playbook`;
    console.log('Total playbook entries:', countResult.rows[0].count);

    // Get sample entries
    const sampleResult = await sql`SELECT bullet_id, section, LEFT(content, 60) as content, run_id, epoch_number FROM playbook ORDER BY bullet_id LIMIT 10`;

    console.log('\nSample entries:');
    sampleResult.rows.forEach((entry: any) => {
      const origin = entry.run_id === null ? 'BASELINE' : `R${entry.run_id} E${entry.epoch_number}`;
      console.log(`- ${entry.bullet_id} (${origin}): ${entry.content}...`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  }

  process.exit(0);
}

checkDatabase();
