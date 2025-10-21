import { config } from 'dotenv';
import { db } from '../lib/db';
import { playbook } from '../lib/schema';

// Load environment variables from .env.local
config({ path: '.env.local' });

const seedData = [
  // SUICIDE
  {
    bullet_id: 'suicide-critical',
    section: 'suicide',
    content: 'Active plan, method, or imminent intent to end life = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'suicide-high',
    section: 'suicide',
    content: 'Expressing wish to die or not be alive without specific plan = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'suicide-medium',
    section: 'suicide',
    content: 'Passive suicidal ideation or hopelessness about future = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'suicide-low',
    section: 'suicide',
    content: 'Fleeting thoughts about death without intent or plan = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // NSSI (Non-Suicidal Self-Injury)
  {
    bullet_id: 'nssi-critical',
    section: 'nssi',
    content: 'Severe self-harm requiring immediate medical attention = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'nssi-high',
    section: 'nssi',
    content: 'Active self-harm behavior (cutting, burning, hitting) = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'nssi-medium',
    section: 'nssi',
    content: 'Strong urges to self-harm with coping strategies in place = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'nssi-low',
    section: 'nssi',
    content: 'History of self-harm but currently stable = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // CHILD_ABUSE
  {
    bullet_id: 'child_abuse-critical',
    section: 'child_abuse',
    content: 'Physical, sexual, or severe emotional abuse of a child = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'child_abuse-high',
    section: 'child_abuse',
    content: 'Neglect or inadequate care of a child = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'child_abuse-medium',
    section: 'child_abuse',
    content: 'Concerns about child welfare without immediate danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'child_abuse-low',
    section: 'child_abuse',
    content: 'Minor parenting concerns being monitored = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // DOMESTIC_VIOLENCE
  {
    bullet_id: 'domestic_violence-critical',
    section: 'domestic_violence',
    content: 'Physical assault, strangulation, or weapon use by partner = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'domestic_violence-high',
    section: 'domestic_violence',
    content: 'Threats, intimidation, or controlling behavior by partner = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'domestic_violence-medium',
    section: 'domestic_violence',
    content: 'Emotional or verbal abuse in relationship = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'domestic_violence-low',
    section: 'domestic_violence',
    content: 'Relationship conflict without violence or threats = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // SEXUAL_VIOLENCE
  {
    bullet_id: 'sexual_violence-critical',
    section: 'sexual_violence',
    content: 'Recent or ongoing sexual assault or abuse = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sexual_violence-high',
    section: 'sexual_violence',
    content: 'Sexual coercion or harassment = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sexual_violence-medium',
    section: 'sexual_violence',
    content: 'Past sexual trauma disclosure without current danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'sexual_violence-low',
    section: 'sexual_violence',
    content: 'Historical trauma being processed in therapy = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // ELDER_ABUSE
  {
    bullet_id: 'elder_abuse-critical',
    section: 'elder_abuse',
    content: 'Physical abuse or severe neglect of older adult = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'elder_abuse-high',
    section: 'elder_abuse',
    content: 'Financial exploitation or emotional abuse of elder = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'elder_abuse-medium',
    section: 'elder_abuse',
    content: 'Concerns about elder care quality = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'elder_abuse-low',
    section: 'elder_abuse',
    content: 'Minor concerns about elder care being addressed = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // HOMICIDE
  {
    bullet_id: 'homicide-critical',
    section: 'homicide',
    content: 'Specific plan, means, and intent to harm or kill another person = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'homicide-high',
    section: 'homicide',
    content: 'Threats to harm others or violent fantasies = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'homicide-medium',
    section: 'homicide',
    content: 'Anger toward others without violent intent = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'homicide-low',
    section: 'homicide',
    content: 'Frustration with others without aggression = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // PSYCHOSIS
  {
    bullet_id: 'psychosis-critical',
    section: 'psychosis',
    content: 'Command hallucinations to harm self or others = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'psychosis-high',
    section: 'psychosis',
    content: 'Active hallucinations or delusions affecting safety = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'psychosis-medium',
    section: 'psychosis',
    content: 'Psychotic symptoms managed with treatment = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'psychosis-low',
    section: 'psychosis',
    content: 'Residual symptoms well-controlled with medication = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // MANIC_EPISODE
  {
    bullet_id: 'manic_episode-critical',
    section: 'manic_episode',
    content: 'Severe mania with dangerous behavior (reckless spending, hypersexuality, aggression) = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'manic_episode-high',
    section: 'manic_episode',
    content: 'Elevated mood with impaired judgment and risky behavior = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'manic_episode-medium',
    section: 'manic_episode',
    content: 'Hypomania with increased energy but maintained functioning = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'manic_episode-low',
    section: 'manic_episode',
    content: 'Mood elevation being monitored, functioning intact = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // EATING_DISORDER
  {
    bullet_id: 'eating_disorder-critical',
    section: 'eating_disorder',
    content: 'Severe restriction, purging with medical complications = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'eating_disorder-high',
    section: 'eating_disorder',
    content: 'Active eating disorder behaviors affecting health = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'eating_disorder-medium',
    section: 'eating_disorder',
    content: 'Body image concerns or disordered eating thoughts = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'eating_disorder-low',
    section: 'eating_disorder',
    content: 'Mild body image concerns without dangerous behaviors = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // SUBSTANCE_ABUSE
  {
    bullet_id: 'substance_abuse-critical',
    section: 'substance_abuse',
    content: 'Overdose risk, withdrawal complications, or acute intoxication = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'substance_abuse-high',
    section: 'substance_abuse',
    content: 'Active substance use affecting safety or functioning = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'substance_abuse-medium',
    section: 'substance_abuse',
    content: 'Substance use concerns with maintained functioning = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'substance_abuse-low',
    section: 'substance_abuse',
    content: 'Occasional use without significant impact = LOW risk.',
    helpful_count: 0,
    harmful_count: 0,
  },

  // OTHER_EMERGENCY
  {
    bullet_id: 'other_emergency-critical',
    section: 'other_emergency',
    content: 'Medical emergency or immediate safety threat not captured in other categories = CRITICAL risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'other_emergency-high',
    section: 'other_emergency',
    content: 'Urgent situation requiring immediate intervention = HIGH risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'other_emergency-medium',
    section: 'other_emergency',
    content: 'Concerning situation without immediate danger = MEDIUM risk.',
    helpful_count: 0,
    harmful_count: 0,
  },
  {
    bullet_id: 'other_emergency-low',
    section: 'other_emergency',
    content: 'Minor concern being monitored = LOW risk.',
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
