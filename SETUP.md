# Risk-ACE Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Vercel Account** (for Postgres database)
3. **OpenAI API Key**

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vercel Postgres

1. Go to [vercel.com](https://vercel.com) and create a new project (or use existing)
2. In your project dashboard, go to the "Storage" tab
3. Click "Create Database" and select "Postgres"
4. Follow the prompts to create your database
5. Copy the connection string (POSTGRES_URL) from the .env.local tab

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```
   POSTGRES_URL="your_vercel_postgres_url"
   OPENAI_API_KEY="your_openai_api_key"
   ```

### 4. Initialize the Database

Generate and push the database schema:

```bash
npm run db:generate
npm run db:push
```

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Database Schema

The system uses three main tables:

1. **playbook** - Stores heuristic bullets for classification
2. **eval_log** - Logs all classification attempts with true labels
3. **reflections** - Stores error analysis insights

## Using the System

### Basic Workflow

1. **Dashboard** (`/`)
   - Enter text to classify
   - Optionally provide true labels for evaluation
   - Click "Classify" for single classification
   - Click "Run Full ACE Cycle" to execute all three agents

2. **Playbook** (`/playbook`)
   - View all classification heuristics
   - Add, edit, or delete entries manually
   - Vote on heuristic helpfulness

3. **Metrics** (`/metrics`)
   - View overall accuracy
   - Analyze category-level F1 scores
   - Analyze risk-level F1 scores

### The ACE Cycle

1. **Generator Agent**
   - Takes input text and current playbook
   - Predicts category and risk level
   - Logs results vs. true labels

2. **Reflector Agent**
   - Analyzes incorrect predictions
   - Generates insights about errors
   - Creates structured reflections

3. **Curator Agent**
   - Reviews reflections
   - Generates new heuristic bullets
   - Updates the playbook

## API Endpoints

### Classification
- `POST /api/generate` - Classify text

### Agent Operations
- `POST /api/reflect` - Run error analysis
- `POST /api/curate` - Update playbook from reflections

### Data Management
- `GET /api/playbook` - Retrieve all heuristics
- `POST /api/playbook` - Add new heuristic
- `PUT /api/playbook` - Update heuristic
- `DELETE /api/playbook` - Remove heuristic

### Metrics
- `GET /api/evaluate?type=overall` - Overall accuracy
- `GET /api/evaluate?type=category` - Category-level F1
- `GET /api/evaluate?type=risk` - Risk-level F1

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

```bash
vercel
```

## Troubleshooting

### Database Connection Issues
- Verify POSTGRES_URL is correct in .env.local
- Ensure your IP is whitelisted in Vercel Postgres settings
- Try regenerating the connection string

### OpenAI API Errors
- Check that OPENAI_API_KEY is valid
- Ensure you have sufficient API credits
- Verify the model name (gpt-4o-mini) is accessible

### Build Errors
- Clear .next folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Development Tips

1. **Seeding the Playbook**: Manually add initial heuristics via the Playbook page
2. **Testing Classifications**: Use the Dashboard to test with various inputs
3. **Monitoring Improvement**: Check Metrics page after running multiple ACE cycles
4. **Iterative Refinement**: Edit generated heuristics to improve quality

## License

MIT
