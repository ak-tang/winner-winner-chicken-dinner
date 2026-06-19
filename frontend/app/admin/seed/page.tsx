'use client';

import { useState } from 'react';
import Link from 'next/link';
import { scrapeRecipe, listRecipes } from '@/lib/api';

const COURSE_OPTIONS = ['appetizer', 'main', 'dessert', 'drink'];
const CUISINE_OPTIONS = [
  'Italian', 'French', 'Japanese', 'Mexican', 'Indian',
  'Mediterranean', 'Thai', 'American', 'Chinese', 'Spanish',
];

interface Recipe {
  id: string;
  title: string;
  course_type: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  source_url: string;
}

export default function SeedPage() {
  const [url, setUrl] = useState('');
  const [courseType, setCourseType] = useState('main');
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const toggleCuisine = (c: string) => {
    setCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await scrapeRecipe(url.trim(), courseType, cuisines) as { title: string };
      setMessage({ type: 'success', text: `✓ Saved: "${result.title}"` });
      setUrl('');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to scrape recipe' });
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const data = await listRecipes() as Recipe[];
      setRecipes(data);
    } catch {
      setRecipes([]);
    } finally {
      setLoadingRecipes(false);
    }
  };

  return (
    <main className="flex-1 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-6">
          ← Back to menu planner
        </Link>

        <h1 className="text-2xl font-bold text-green-900 mb-2">Recipe Library</h1>
        <p className="text-stone-500 text-sm mb-8">
          Add recipes by URL — we&apos;ll scrape, normalize, and store them automatically.
        </p>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">Add a recipe</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 mb-1">Recipe URL</label>
            <input
              type="url"
              placeholder="https://www.seriouseats.com/..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScrape()}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 mb-2">Course type</label>
            <div className="flex gap-2 flex-wrap">
              {COURSE_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCourseType(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize transition-all ${
                    courseType === c
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-green-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-stone-700 mb-2">Cuisine tags (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {CUISINE_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCuisine(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    cuisines.includes(c)
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-green-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="w-full py-2.5 rounded-xl bg-green-700 text-white font-medium text-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scraping…
              </>
            ) : (
              'Add recipe'
            )}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">Saved recipes</h2>
            <button
              onClick={loadRecipes}
              disabled={loadingRecipes}
              className="text-sm text-green-700 hover:text-green-900 font-medium"
            >
              {loadingRecipes ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {recipes === null ? (
            <p className="text-sm text-stone-400">Click Refresh to load saved recipes.</p>
          ) : recipes.length === 0 ? (
            <p className="text-sm text-stone-400">No recipes yet. Add some above!</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {recipes.map(r => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{r.title}</p>
                    <p className="text-xs text-stone-400 capitalize">
                      {r.course_type}
                      {r.cuisine_tags.length > 0 && ` · ${r.cuisine_tags.join(', ')}`}
                      {r.dietary_tags.length > 0 && ` · ${r.dietary_tags.join(', ')}`}
                    </p>
                  </div>
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-800 shrink-0"
                  >
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
