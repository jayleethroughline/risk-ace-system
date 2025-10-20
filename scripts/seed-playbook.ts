import { config } from 'dotenv';
import { db } from '../lib/db';
import { playbook } from '../lib/schema';

// Load environment variables from .env.local
config({ path: '.env.local' });

const seedData = [
  {
    bullet_id: 'si-001',
    section: 'suicidal_ideation',
    content: 'Mentions of active intent, plan, or method to die indicate CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'si-002',
    section: 'suicidal_ideation',
    content: 'Expressions of wanting to die or disappear without a stated plan indicate HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'si-003',
    section: 'suicidal_ideation',
    content: 'Hopelessness or worthlessness with no mention of death implies MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sh-001',
    section: 'self_harm',
    content: 'Statements about cutting, burning, or harming oneself without suicide intent indicate HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sh-002',
    section: 'self_harm',
    content: 'Mentions of self-harm urges but strong protective reasons (friends, faith, goals) imply MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'dv-001',
    section: 'domestic_violence',
    content: 'Physical assault or threats from partner or household member = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'dv-002',
    section: 'domestic_violence',
    content: 'Emotional, verbal, or financial abuse in ongoing relationship = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sa-001',
    section: 'sexual_assault',
    content: 'Recent or ongoing sexual violence = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sa-002',
    section: 'sexual_assault',
    content: 'Past sexual assault disclosed without current danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'ca-001',
    section: 'child_abuse',
    content: 'Any mention of physical, sexual, or severe emotional abuse toward a child = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'ea-001',
    section: 'elder_abuse',
    content: 'Neglect or exploitation of an older adult by caregiver or family = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'mh-001',
    section: 'mental_health_distress',
    content: 'Severe anxiety, panic, or inability to function = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'mh-002',
    section: 'mental_health_distress',
    content: 'Mild sadness, stress, or loneliness = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'gen-001',
    section: 'general_support',
    content: 'Requests for information or general guidance with no harm indicators = NONE risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
];

async function seedPlaybook() {
  try {
    console.log('🌱 Seeding playbook...');

    for (const entry of seedData) {
      await db.insert(playbook).values(entry).onConflictDoNothing();
      console.log(`✓ Inserted: ${entry.bullet_id} - ${entry.section}`);
    }

    console.log('✅ Playbook seeded successfully!');
    console.log(`📊 Total entries: ${seedData.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding playbook:', error);
    process.exit(1);
  }
}

seedPlaybook();
