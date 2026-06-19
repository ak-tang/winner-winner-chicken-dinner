# 🐔 Winner Winner Chicken Dinner

AI-powered dinner party menu planning. Tell it your constraints — courses, cuisine, dietary needs, guest count, time limits — and it generates a cohesive menu with Claude's explanation of why it works.

## Stack

- **Frontend**: Next.js 16 App Router, TypeScript, Tailwind CSS
- **Backend**: Python FastAPI
- **Database**: Supabase (Postgres)
- **AI**: Claude (Anthropic API) for menu reasoning

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_init.sql` in the SQL editor

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding Recipes

Visit [http://localhost:3000/admin/seed](http://localhost:3000/admin/seed) to add recipes by URL. The scraper supports 500+ recipe sites (AllRecipes, Serious Eats, Simply Recipes, NYT Cooking, Bon Appétit, etc.).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/recipes/scrape` | Scrape + store a recipe by URL |
| GET | `/api/recipes` | List all stored recipes |
| POST | `/api/menu/generate` | Generate a menu from constraints |
| GET | `/api/menu/{id}` | Retrieve a saved menu |
