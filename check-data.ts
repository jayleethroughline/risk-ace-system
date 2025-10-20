import { db } from './lib/db';
import { trainingData, trainingRun } from './lib/schema';
import { eq, sql } from 'drizzle-orm';

async function checkData() {
  // Get all training runs
  const runs = await db.select().from(trainingRun);
  console.log('\n📊 Training Runs:');
  runs.forEach(run => {
    console.log(`  Run ${run.run_id}: ${run.name} - Status: ${run.status}`);
  });

  // Get count by run_id and data_type
  console.log('\n📈 Data Distribution:');
  const counts = await db
    .select({
      run_id: trainingData.run_id,
      data_type: trainingData.data_type,
      count: sql<number>`count(*)::int`,
    })
    .from(trainingData)
    .groupBy(trainingData.run_id, trainingData.data_type);

  counts.forEach(row => {
    console.log(`  Run ${row.run_id} - ${row.data_type}: ${row.count} samples`);
  });

  // Get total count
  const total = await db.select({ count: sql<number>`count(*)::int` }).from(trainingData);
  console.log(`\n📦 Total samples in database: ${total[0].count}`);
}

checkData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
