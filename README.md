# 🧩 Risk-ACE System Design
**(Agentic Context Engine for Risk Classification)**
Built with **Next.js 14**, **Neon Postgres**, **Drizzle ORM**, **Google Gemini**, and **Serverless API routes**

---

## 📘 Overview

**Purpose:**
Risk-ACE continuously improves a small-LLM-based classifier that predicts a **category** (e.g., suicidal ideation, abuse) and **risk level** (critical / high / medium / low / none).
It uses three cooperative agents:

1. **Generator** → Predicts category + risk
2. **Reflector** → Analyzes errors vs. true labels
3. **Curator** → Updates a shared heuristic "playbook"

The system maximizes **F1 for category and risk** through context evolution — not model retraining.

---

## ⚙️ Architecture

```
Frontend (Next.js React UI)
  ├─ /              → Dashboard with training runs & metrics
  ├─ /train         → Create & start training runs
  ├─ /playbook      → View / edit heuristics
  ├─ /database      → View training data & samples
  ├─ /how-it-works  → Educational guide
  └─ Calls → /api/training/* routes

Training Controller (lib/controller.ts)
  ├─ runTraining()       → Multi-epoch orchestration
  ├─ runTrainingEpoch()  → Single epoch execution
  │   ├─ classifyText()      → Generator agent (blind prediction)
  │   ├─ analyzeError()      → Reflector agent (error analysis)
  │   └─ generateHeuristics()→ Curator agent (playbook updates)
  └─ Plateau detection   → Auto-stops when F1 plateaus

Serverless API Routes (Next.js /api/training)
  ├─ /api/training/start    → Create & start training run
  ├─ /api/training/status   → Get run status & progress
  ├─ /api/training/stop     → Stop running training
  ├─ /api/training/logs     → Get agent execution logs
  ├─ /api/training/reflections → Get error reflections
  ├─ /api/training/heuristics  → Get generated heuristics
  └─ /api/playbook          → CRUD for heuristics

Data Layer (Neon Postgres via Drizzle)
  ├─ playbook       → Heuristics with effectiveness tracking
  ├─ trainingRun    → Training run configurations
  ├─ trainingData   → Training & eval datasets
  ├─ epochResult    → F1 scores per epoch
  ├─ agentLog       → Agent execution logs
  └─ reflections    → Error analysis insights
```

---

## 🧱 Database Schema (`lib/schema.ts`)

### Core Tables

**`playbook`** - Heuristics with effectiveness tracking
```ts
{
  bullet_id: text (PK),              // Unique ID: category-risk-r#-e#-idx
  section: text,                     // Category this applies to
  content: text,                     // The heuristic rule
  helpful_count: integer,            // Times it led to correct predictions
  harmful_count: integer,            // Times it led to incorrect predictions
  run_id: integer,                   // Which training run added this
  epoch_number: integer,             // Which epoch added this
  last_updated: timestamp
}
```

**`trainingRun`** - Training run configurations
```ts
{
  run_id: serial (PK),
  name: text,
  max_epochs: integer,               // Maximum epochs to run
  plateau_threshold: real,           // Minimum F1 improvement (e.g., 0.01)
  plateau_patience: integer,         // Epochs to wait before stopping
  status: text,                      // pending|running|completed|stopped|failed
  started_at: timestamp,
  last_activity_at: timestamp,       // Heartbeat for stuck detection
  completed_at: timestamp,
  failure_reason: text
}
```

**`trainingData`** - Training & evaluation datasets
```ts
{
  data_id: serial (PK),
  run_id: integer,                   // Links to training run
  data_type: text,                   // 'train' or 'eval'
  text: text,                        // Input message
  true_category: text,               // Ground truth category
  true_risk: text,                   // Ground truth risk level
  created_at: timestamp
}
```

**`epochResult`** - F1 metrics per epoch
```ts
{
  epoch_id: serial (PK),
  run_id: integer,
  epoch_number: integer,
  category_f1: real,                 // F1 for category prediction
  risk_f1: real,                     // F1 for risk prediction
  overall_f1: real,                  // Average of category & risk F1
  accuracy: real,                    // Exact match accuracy
  playbook_size: integer,            // Heuristics count at this epoch
  errors_found: integer,             // Errors on training data
  heuristics_added: integer,         // New heuristics added
  created_at: timestamp
}
```

**`reflections`** - Error analysis insights
```ts
{
  reflection_id: serial (PK),
  run_id: integer,
  epoch_number: integer,
  error_type: text,                  // Type of error (e.g., risk_overestimation)
  correct_approach: text,            // What should have been done
  key_insight: text,                 // Learning from this error
  affected_section: text,            // Category this affects
  tag: text,                         // Short label for categorization
  input_text: text,                  // Original input that caused error
  predicted: text,                   // What was predicted
  expected: text,                    // What was expected
  created_at: timestamp
}
```

**`agentLog`** - Agent execution logs
```ts
{
  log_id: serial (PK),
  run_id: integer,
  epoch_number: integer,
  agent_type: text,                  // 'generator'|'reflector'|'curator'
  system_prompt: text,               // Prompt used
  input_summary: text,               // What was processed
  output_summary: text,              // What was generated
  details: jsonb,                    // Full predictions, reflections, etc.
  timestamp: timestamp
}
```

---

## 🧮 Drizzle + Postgres Setup

### 1. Install dependencies
```bash
npm install drizzle-orm @vercel/postgres
```

### 2. Connect to Vercel Postgres (`lib/db.ts`)
```ts
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
export const db = drizzle(sql);
```

### 3. Push schema
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

---

## 🧠 Training Controller (`lib/controller.ts`)

The core training logic is implemented in the controller, not as individual API endpoints.

### Key Functions

**`runTraining(runId)`** - Multi-epoch orchestration
- Loops through epochs until max_epochs or plateau detected
- Calls `runTrainingEpoch()` for each iteration
- Monitors heartbeat to detect stuck runs
- Updates run status (running → completed/failed/stopped)

**`runTrainingEpoch(config, epochNumber)`** - Single epoch execution
1. **Load data**: Fetch training dataset for this run
2. **Load playbook**: Get all current heuristics (ordered by helpful_count)
3. **Generator phase**: Classify all training samples using `classifyText()`
   - Makes blind predictions (no access to true labels)
   - Records which heuristics were cited
   - Tracks helpful/harmful counts per heuristic
4. **Evaluation phase**: Run Generator on eval dataset
   - Calculate F1 scores (category, risk, overall)
   - Determine if training should continue
5. **Reflector phase**: Analyze all training errors using `analyzeError()`
   - For each error, generate reflection with insights
   - Store in reflections table
6. **Curator phase**: Generate new heuristics using `generateHeuristics()`
   - Process all reflections from this epoch
   - Create 1-2 new heuristics per reflection
   - Add to playbook with unique IDs

### Agent Prompts

**Generator** (blind classification)
```
You are a risk classifier that assigns a category and risk level to user input.

CATEGORIES: suicide, nssi, child_abuse, domestic_violence, sexual_violence,
elder_abuse, homicide, psychosis, manic_episode, eating_disorder,
substance_abuse, other_emergency

RISK LEVELS: CRITICAL, HIGH, MEDIUM, LOW

Use the following heuristics to guide your classification:
[ID: bullet_id] [section] content
...

Text to classify: "{text}"

Respond with ONLY valid JSON:
{"category":"<category>","risk_level":"<risk_level>","heuristics_used":["<id1>","<id2>"]}
```

**Reflector** (error analysis)
```
You are a reflective agent analyzing classification errors.

INPUT TEXT: "{text}"

PREDICTED:
- Category: {predicted_category}
- Risk Level: {predicted_risk}

ACTUAL (TRUE):
- Category: {true_category}
- Risk Level: {true_risk}

Analyze this error and provide:
1. What type of error occurred
2. What the correct approach should be
3. A key insight that could help prevent similar errors
4. Which section of the playbook this affects
5. A short tag for this insight

Respond in JSON format:
{"error_type":"...","correct_approach":"...","key_insight":"...","affected_section":"...","tag":"..."}
```

**Curator** (heuristic generation)
```
You are a curator that maintains a playbook of classification heuristics.

CURRENT PLAYBOOK:
[section] content
...

NEW REFLECTION:
- Error Type: {error_type}
- Correct Approach: {correct_approach}
- Key Insight: {key_insight}
- Affected Section: {affected_section}
- Tag: {tag}

Based on this reflection, generate 1-2 NEW heuristic bullets to add to the playbook.
Each bullet should be actionable, specific, and directly applicable to classification.

Respond in JSON format:
{"bullets":[{"section":"<section>","content":"<heuristic>"}]}
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Neon account (for Postgres database)
- Google Gemini API key

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file:
```
POSTGRES_URL=your_neon_postgres_url
GEMINI_API_KEY=your_gemini_api_key
```

### Run Development Server
```bash
npm run dev
```

### Deploy to Vercel
```bash
vercel
```

---

## 📊 Training Flow

### Setup Phase
1. **User prepares datasets**: Training data + Evaluation data (CSV/JSON format)
   - Both require: `text`, `true_category`, `true_risk`
2. **User creates training run**: Via `/train` page
   - Uploads both datasets
   - Sets config: max_epochs, plateau_threshold, plateau_patience
3. **System starts training**: Calls `runTraining(run_id)` asynchronously

### Per-Epoch Flow (10-15 minutes)

**Epoch N begins:**

1. **Generator Phase (~7 min)**
   - Load training dataset (e.g., 60 samples)
   - Load current playbook (e.g., 100+ heuristics)
   - For each sample:
     - Make blind prediction (no access to true label)
     - Record which heuristics were cited
   - Compare predictions to true labels
   - Update helpful/harmful counts for each heuristic
   - Collect all errors for reflection

2. **Evaluation Phase (~instant)**
   - Run Generator on eval dataset (separate 60 samples)
   - Calculate F1 scores: category_f1, risk_f1, overall_f1
   - Calculate accuracy
   - Store epoch results

3. **Reflector Phase (~5 min)**
   - For each training error:
     - Analyze what went wrong
     - Identify correct approach
     - Generate key insight
   - Store reflections in database

4. **Curator Phase (~4 min)**
   - For each reflection:
     - Generate 1-2 new heuristics
     - Add to playbook with unique IDs (category-risk-rN-eM-idx)
   - Playbook grows (e.g., 100 → 160 heuristics)

**Epoch N+1 begins with improved playbook...**

### Stopping Conditions
- **Max epochs reached**: e.g., 10 epochs completed
- **Plateau detected**: F1 score hasn't improved by threshold for patience epochs
  - Example: threshold=0.01, patience=3
  - If F1 doesn't improve by 1% for 3 consecutive epochs → stop
- **Manual stop**: User clicks stop button
- **Error**: System failure or timeout

### Dashboard View
- **Training Runs**: List of all runs with status
- **Epoch Progress**: F1 scores over time (line chart)
- **Heuristics**: View playbook with effectiveness tracking
- **Agent Logs**: See Generator/Reflector/Curator execution details
- **Reflections**: Browse error analysis insights

---

## 🎯 Key Features

- **Multi-epoch training** with automatic plateau detection
- **Context evolution** instead of model retraining (no fine-tuning required)
- **Three cooperative agents** working in orchestrated pipeline:
  - Generator: Blind classification using playbook heuristics
  - Reflector: Deep error analysis with insights
  - Curator: Automated heuristic generation
- **Dual-dataset approach**: Training data for learning + Eval data for generalization testing
- **Heuristic effectiveness tracking**: Helpful vs. harmful counts per rule
- **F1 optimization** for both category and risk level (macro-averaged)
- **Comprehensive logging**: Full agent execution traces with prompts & outputs
- **Real-time progress monitoring**: Live updates during training
- **Educational UI**: "How ACE Works" guide explaining the system
- **Serverless architecture** for scalability (runs on Vercel)

---

## 📝 License

MIT
