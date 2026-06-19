'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import RecipeCard from '@/components/RecipeCard';
import { type MenuResponse } from '@/lib/api';

const COURSE_ORDER = ['drink', 'appetizer', 'main', 'dessert'];

export default function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(`menu:${id}`);
    if (cached) {
      setMenu(JSON.parse(cached));
      return;
    }
    // Fallback: fetch from API
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    fetch(`${apiBase}/api/menu/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Menu not found');
        return r.json();
      })
      .then(setMenu)
      .catch(e => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-stone-600 mb-4">{error}</p>
          <Link href="/" className="text-green-700 font-medium hover:text-green-900">
            ← Plan a new menu
          </Link>
        </div>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">🐔</div>
          <p className="text-stone-500">Crafting your menu…</p>
        </div>
      </main>
    );
  }

  const sortedRecipes = [...menu.recipes].sort(
    (a, b) => COURSE_ORDER.indexOf(a.course_type) - COURSE_ORDER.indexOf(b.course_type)
  );

  const guests = menu.constraints.guest_count;
  const occasion = menu.constraints.occasion;

  return (
    <main className="flex-1 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-6">
            ← Plan another menu
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-green-900 tracking-tight mb-1">Your Dinner Menu</h1>
              <p className="text-stone-500">
                {occasion ? `${occasion} · ` : ''}{guests} {guests === 1 ? 'guest' : 'guests'}
                {menu.constraints.cuisines.length > 0 && ` · ${menu.constraints.cuisines.join(', ')}`}
              </p>
            </div>
          </div>
        </div>

        {/* Recipe cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {sortedRecipes.map(recipe => (
            <RecipeCard key={recipe.recipe_id} recipe={recipe} />
          ))}
        </div>

        {/* Why this works */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
            <span>✨</span> Why this menu works
          </h2>
          <div className="prose prose-stone max-w-none text-stone-600 leading-relaxed">
            {menu.explanation.split('\n\n').map((para, i) => (
              <p key={i} className="mb-3 last:mb-0">{para}</p>
            ))}
          </div>
        </div>

        {/* Constraints summary */}
        <div className="mt-6 p-4 bg-stone-50 rounded-xl text-xs text-stone-400 flex flex-wrap gap-4">
          {menu.constraints.dietary_restrictions.length > 0 && (
            <span>🌿 {menu.constraints.dietary_restrictions.join(', ')}</span>
          )}
          {menu.constraints.allergies.length > 0 && (
            <span>⚠️ Avoids: {menu.constraints.allergies.join(', ')}</span>
          )}
          {menu.constraints.total_time_minutes && (
            <span>⏱ Under {menu.constraints.total_time_minutes} min</span>
          )}
        </div>
      </div>
    </main>
  );
}
