'use client';

import { useState } from 'react';
import Link from 'next/link';
import { scrapeRecipe, listRecipes, type ScrapeResult } from '@/lib/api';

const COURSE_OPTIONS = ['appetizer', 'main', 'dessert', 'drink'];
const CUISINE_OPTIONS = [
  'Italian', 'French', 'Japanese', 'Mexican', 'Indian',
  'Mediterranean', 'Thai', 'American', 'Chinese', 'Spanish',
];
const VIBE_OPTIONS = [
  'casual', 'elegant', 'romantic', 'festive', 'comfort',
  'rustic', 'modern', 'cozy', 'fresh', 'indulgent',
];
const SEASON_OPTIONS = ['spring', 'summer', 'fall', 'winter', 'year-round'];
const COST_OPTIONS = ['budget', 'mid', 'expensive'];
const EQUIPMENT_OPTIONS = [
  'oven', 'stovetop', 'grill', 'slow-cooker', 'stand-mixer',
  'food-processor', 'no-cook', 'instant-pot', 'deep-fryer',
];

interface Recipe {
  id: string;
  title: string;
  course_type: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  source_url: string;
}

function TagPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize transition-all ${
        active
          ? 'bg-green-700 text-white border-green-700'
          : 'bg-white text-stone-600 border-stone-300 hover:border-green-400'
      }`}
    >
      {label}
    </button>
  );
}

function AutoTag({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 capitalize">
      {label}
    </span>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-2">
        <label className="block text-sm font-medium text-stone-700">{title}</label>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function SeedPage() {
  const [url, setUrl] = useState('');

  // Optional user overrides — all nil/empty means Claude decides
  const [courseType, setCourseType] = useState<string | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [cuisineCustom, setCuisineCustom] = useState('');
  const [vibes, setVibes] = useState<string[]>([]);
  const [vibeCustom, setVibeCustom] = useState('');
  const [seasons, setSeasons] = useState<string[]>([]);
  const [costLevel, setCostLevel] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [equipmentCustom, setEquipmentCustom] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastResult, setLastResult] = useState<ScrapeResult | null>(null);

  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const toggle = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  const parseCustom = (raw: string): string[] =>
    raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setMessage(null);
    setLastResult(null);
    try {
      const allCuisines = [...cuisines, ...parseCustom(cuisineCustom)];
      const allVibes = [...vibes, ...parseCustom(vibeCustom)];
      const allEquipment = [...equipment, ...parseCustom(equipmentCustom)];

      const result = await scrapeRecipe(url.trim(), {
        ...(courseType ? { course_type: courseType } : {}),
        ...(allCuisines.length ? { cuisine_tags: allCuisines } : {}),
        ...(allVibes.length ? { vibe_tags: allVibes } : {}),
        ...(seasons.length ? { season_tags: seasons } : {}),
        ...(costLevel ? { cost_level: costLevel } : {}),
        ...(allEquipment.length ? { equipment_tags: allEquipment } : {}),
      });

      setLastResult(result);
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
          Add recipes by URL — Claude will auto-tag them. Optionally add your own tags below.
        </p>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">Add a recipe</h2>

          <div className="mb-5">
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

          <Section title="Course type" hint="(optional — Claude auto-detects)">
            <div className="flex gap-2 flex-wrap">
              {COURSE_OPTIONS.map(c => (
                <TagPill
                  key={c}
                  label={c}
                  active={courseType === c}
                  onClick={() => setCourseType(prev => prev === c ? null : c)}
                />
              ))}
            </div>
          </Section>

          <Section title="Cuisine" hint="(optional — Claude auto-detects; add extras here)">
            <div className="flex gap-2 flex-wrap mb-2">
              {CUISINE_OPTIONS.map(c => (
                <TagPill
                  key={c}
                  label={c}
                  active={cuisines.includes(c.toLowerCase())}
                  onClick={() => toggle(cuisines, setCuisines, c.toLowerCase())}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. Peruvian, Korean (comma-separated)"
              value={cuisineCustom}
              onChange={e => setCuisineCustom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-stone-600 placeholder-stone-300"
            />
          </Section>

          <Section title="Vibe" hint="(optional)">
            <div className="flex gap-2 flex-wrap mb-2">
              {VIBE_OPTIONS.map(v => (
                <TagPill
                  key={v}
                  label={v}
                  active={vibes.includes(v)}
                  onClick={() => toggle(vibes, setVibes, v)}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. summery, kid-friendly (comma-separated)"
              value={vibeCustom}
              onChange={e => setVibeCustom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-stone-600 placeholder-stone-300"
            />
          </Section>

          <Section title="Season" hint="(optional)">
            <div className="flex gap-2 flex-wrap">
              {SEASON_OPTIONS.map(s => (
                <TagPill
                  key={s}
                  label={s}
                  active={seasons.includes(s)}
                  onClick={() => toggle(seasons, setSeasons, s)}
                />
              ))}
            </div>
          </Section>

          <Section title="Cost" hint="(optional — Claude auto-detects)">
            <div className="flex gap-2 flex-wrap">
              {COST_OPTIONS.map(c => (
                <TagPill
                  key={c}
                  label={c}
                  active={costLevel === c}
                  onClick={() => setCostLevel(prev => prev === c ? null : c)}
                />
              ))}
            </div>
          </Section>

          <Section title="Equipment needed" hint="(optional)">
            <div className="flex gap-2 flex-wrap mb-2">
              {EQUIPMENT_OPTIONS.map(e => (
                <TagPill
                  key={e}
                  label={e}
                  active={equipment.includes(e)}
                  onClick={() => toggle(equipment, setEquipment, e)}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. pressure-cooker, wok (comma-separated)"
              value={equipmentCustom}
              onChange={e => setEquipmentCustom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-stone-600 placeholder-stone-300"
            />
          </Section>

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

          {lastResult && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Auto-detected tags</p>
              <div className="flex flex-wrap gap-1.5">
                <AutoTag label={`course: ${lastResult.course_type}`} />
                {lastResult.cuisine_tags.map(t => <AutoTag key={t} label={`cuisine: ${t}`} />)}
                {lastResult.vibe_tags.map(t => <AutoTag key={t} label={`vibe: ${t}`} />)}
                {lastResult.season_tags.map(t => <AutoTag key={t} label={`season: ${t}`} />)}
                {lastResult.cost_level && <AutoTag label={`cost: ${lastResult.cost_level}`} />}
                {lastResult.equipment_tags.map(t => <AutoTag key={t} label={`equip: ${t}`} />)}
                {lastResult.dietary_tags.map(t => <AutoTag key={t} label={t} />)}
              </div>
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
                Scraping & tagging…
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
