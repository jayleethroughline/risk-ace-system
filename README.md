# 🧩 Risk-ACE System Design
**(Agentic Context Engine for Risk Classification)**
Built with **Next.js 14**, **Vercel Postgres**, **Drizzle ORM**, and **Serverless API routes**

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
  ├─ /             → Dashboard + evaluation loop
  ├─ /playbook     → View / edit heuristics
  ├─ /metrics      → F1 visualization
  └─ Calls → /api/* routes

Serverless API Routes (Next.js /api)
  ├─ /api/generate → Generator (classification)
  ├─ /api/reflect  → Reflector (error analysis)
  ├─ /api/curate   → Curator (playbook updates)
  ├─ /api/evaluate → F1 metrics
  └─ /api/playbook → CRUD for heuristics

Data Layer (Vercel Postgres via Drizzle)
  ├─ playbook
  ├─ eval_log
  └─ reflections
```

---

## 🧱 Database Schema (`lib/schema.ts`)

```ts
import { pgTable, text, integer, serial, timestamp } from 'drizzle-orm/pg-core';

export const playbook = pgTable('playbook', {
  bullet_id: text('bullet_id').primaryKey(),
  section: text('section'),
  content: text('content'),
  helpful_count: integer('helpful_count').default(0),
  harmful_count: integer('harmful_count').default(0),
  last_updated: timestamp('last_updated').defaultNow(),
});

export const evalLog = pgTable('eval_log', {
  id: serial('id').primaryKey(),
  input_text: text('input_text'),
  predicted_category: text('predicted_category'),
  predicted_risk: text('predicted_risk'),
  true_category: text('true_category'),
  true_risk: text('true_risk'),
  correct: integer('correct'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const reflections = pgTable('reflections', {
  reflection_id: serial('reflection_id').primaryKey(),
  error_type: text('error_type'),
  correct_approach: text('correct_approach'),
  key_insight: text('key_insight'),
  affected_section: text('affected_section'),
  tag: text('tag'),
  created_at: timestamp('created_at').defaultNow(),
});
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

## 🧠 API Routes

### `/api/generate/route.ts`
Predicts category and risk.

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playbook, evalLog } from '@/lib/schema';
import { callLLM } from '@/lib/openai';

export async function POST(req: Request) {
  const { text, true_category, true_risk } = await req.json();
  const bullets = await db.select().from(playbook).limit(5);
  const context = bullets.map(b => b.content).join('\n');

  const prompt = `
  You are a classifier that assigns a category and risk level.
  Use the following heuristics:\n${context}
  Text: ${text}
  Respond ONLY JSON: {"category":"...","risk_level":"..."}
  `;

  const result = await callLLM(prompt);
  const { category, risk_level } = JSON.parse(result);

  const correct = category === true_category && risk_level === true_risk ? 1 : 0;
  await db.insert(evalLog).values({
    input_text: text,
    predicted_category: category,
    predicted_risk: risk_level,
    true_category,
    true_risk,
    correct,
  });

  return NextResponse.json({ category, risk_level });
}
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Vercel account (for Postgres)
- OpenAI API key

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file:
```
POSTGRES_URL=your_vercel_postgres_url
OPENAI_API_KEY=your_openai_key
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

## 📊 System Flow

1. **User submits text** → Dashboard calls `/api/generate`
2. **Generator** retrieves top playbook bullets, predicts category + risk
3. **System logs** prediction vs. true label to `eval_log`
4. **Reflector** (`/api/reflect`) analyzes errors, creates insights
5. **Curator** (`/api/curate`) updates playbook based on reflections
6. **Metrics** page shows F1 scores over time

---

## 🎯 Key Features

- **Context evolution** instead of model retraining
- **Three cooperative agents** (Generator, Reflector, Curator)
- **F1 optimization** for both category and risk level
- **Real-time playbook updates** based on error analysis
- **Serverless architecture** for scalability

---

## 📝 License

MIT
