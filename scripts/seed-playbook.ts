import { config } from 'dotenv';
import { db } from '../lib/db';
import { playbook } from '../lib/schema';

// Load environment variables from .env.local
config({ path: '.env.local' });

const seedData = [
  // SUICIDE
  {
    bullet_id: 'suicide-001',
    section: 'suicide',
    content: 'Active plan, method, or imminent intent to end life = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'suicide-002',
    section: 'suicide',
    content: 'Expressing wish to die or not be alive without specific plan = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'suicide-003',
    section: 'suicide',
    content: 'Passive suicidal ideation or hopelessness about future = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // NSSI (Non-Suicidal Self-Injury)
  {
    bullet_id: 'nssi-001',
    section: 'nssi',
    content: 'Active self-harm behavior (cutting, burning, hitting) = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'nssi-002',
    section: 'nssi',
    content: 'Strong urges to self-harm with coping strategies in place = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'nssi-003',
    section: 'nssi',
    content: 'History of self-harm but currently stable = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // CHILD_ABUSE
  {
    bullet_id: 'child-001',
    section: 'child_abuse',
    content: 'Physical, sexual, or severe emotional abuse of a child = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'child-002',
    section: 'child_abuse',
    content: 'Neglect or inadequate care of a child = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'child-003',
    section: 'child_abuse',
    content: 'Concerns about child welfare without immediate danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // DOMESTIC_VIOLENCE
  {
    bullet_id: 'dv-001',
    section: 'domestic_violence',
    content: 'Physical assault, strangulation, or weapon use by partner = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'dv-002',
    section: 'domestic_violence',
    content: 'Threats, intimidation, or controlling behavior by partner = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'dv-003',
    section: 'domestic_violence',
    content: 'Emotional or verbal abuse in relationship = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // SEXUAL_VIOLENCE
  {
    bullet_id: 'sv-001',
    section: 'sexual_violence',
    content: 'Recent or ongoing sexual assault or abuse = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sv-002',
    section: 'sexual_violence',
    content: 'Sexual coercion or harassment = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sv-003',
    section: 'sexual_violence',
    content: 'Past sexual trauma disclosure without current danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // ELDER_ABUSE
  {
    bullet_id: 'ea-001',
    section: 'elder_abuse',
    content: 'Physical abuse or severe neglect of older adult = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'ea-002',
    section: 'elder_abuse',
    content: 'Financial exploitation or emotional abuse of elder = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'ea-003',
    section: 'elder_abuse',
    content: 'Concerns about elder care quality = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // HOMICIDE
  {
    bullet_id: 'hom-001',
    section: 'homicide',
    content: 'Specific plan, means, and intent to harm or kill another person = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'hom-002',
    section: 'homicide',
    content: 'Threats to harm others or violent fantasies = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'hom-003',
    section: 'homicide',
    content: 'Anger toward others without violent intent = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // PSYCHOSIS
  {
    bullet_id: 'psy-001',
    section: 'psychosis',
    content: 'Command hallucinations to harm self or others = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'psy-002',
    section: 'psychosis',
    content: 'Active hallucinations or delusions affecting safety = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'psy-003',
    section: 'psychosis',
    content: 'Psychotic symptoms managed with treatment = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // MANIC_EPISODE
  {
    bullet_id: 'man-001',
    section: 'manic_episode',
    content: 'Severe mania with dangerous behavior (reckless spending, hypersexuality, aggression) = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'man-002',
    section: 'manic_episode',
    content: 'Elevated mood with impaired judgment and risky behavior = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'man-003',
    section: 'manic_episode',
    content: 'Hypomania with increased energy but maintained functioning = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // EATING_DISORDER
  {
    bullet_id: 'ed-001',
    section: 'eating_disorder',
    content: 'Severe restriction, purging with medical complications = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'ed-002',
    section: 'eating_disorder',
    content: 'Active eating disorder behaviors affecting health = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'ed-003',
    section: 'eating_disorder',
    content: 'Body image concerns or disordered eating thoughts = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // SUBSTANCE_ABUSE
  {
    bullet_id: 'sub-001',
    section: 'substance_abuse',
    content: 'Overdose risk, withdrawal complications, or acute intoxication = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sub-002',
    section: 'substance_abuse',
    content: 'Active substance use affecting safety or functioning = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sub-003',
    section: 'substance_abuse',
    content: 'Substance use concerns with maintained functioning = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // OTHER_EMERGENCY
  {
    bullet_id: 'oth-001',
    section: 'other_emergency',
    content: 'Medical emergency or immediate safety threat not captured in other categories = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'oth-002',
    section: 'other_emergency',
    content: 'Urgent situation requiring immediate intervention = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'oth-003',
    section: 'other_emergency',
    content: 'Concerning situation without immediate danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
];

async function seedPlaybook() {
  try {
    console.log('🧹 Clearing existing playbook...');
    await db.delete(playbook);
    console.log('✓ Existing playbook cleared');

    console.log('🌱 Seeding playbook with new categories...');

    for (const entry of seedData) {
      await db.insert(playbook).values(entry);
      console.log(`✓ Inserted: ${entry.bullet_id} - ${entry.section}`);
    }

    console.log('✅ Playbook seeded successfully!');
    console.log(`📊 Total entries: ${seedData.length}`);
    console.log('📋 Categories: suicide, nssi, child_abuse, domestic_violence, sexual_violence, elder_abuse, homicide, psychosis, manic_episode, eating_disorder, substance_abuse, other_emergency');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding playbook:', error);
    process.exit(1);
  }
}

seedPlaybook();
