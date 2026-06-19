'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import RecipeCard from '@/components/RecipeCard';
import {
  type MenuResponse, type MenuRecipe, type GroceryList, type MenuConstraints,
  replaceRecipe, getGroceryList,
} from '@/lib/api';

const COURSE_ORDER = ['drink', 'appetizer', 'main', 'dessert'];

export default function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [menu, setMenu] = useState<MenuResponse | null>(() => {
    if (typeof window === 'undefined') return null;
    const cached = sessionStorage.getItem(`menu:${id}`);
    return cached ? JSON.parse(cached) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState<{ id: string; reason: string } | null>(null);
  const [grocery, setGrocery] = useState<GroceryList | null>(null);
  const [loadingGrocery, setLoadingGrocery] = useState(false);
  const [showGrocery, setShowGrocery] = useState(false);

  useEffect(() => {
    if (menu) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    fetch(`${apiBase}/api/menu/${id}`)
      .then(r => { if (!r.ok) throw new Error('Menu not found'); return r.json(); })
      .then(setMenu)
      .catch(e => setError(e.message));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwap = async (recipe: MenuRecipe) => {
    if (!menu) return;
    setSwappingId(recipe.recipe_id);
    setSwapReason(null);
    try {
      const result = await replaceRecipe(id, recipe.course_type, recipe.recipe_id, menu.constraints as MenuConstraints);
      const updated: MenuResponse = {
        ...menu,
        recipes: menu.recipes.map(r => r.recipe_id === recipe.recipe_id ? result.recipe : r),
      };
      setMenu(updated);
      sessionStorage.setItem(`menu:${id}`, JSON.stringify(updated));
      setSwapReason({ id: result.recipe.recipe_id, reason: result.reason });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Swap failed');
    } finally {
      setSwappingId(null);
    }
  };

  const handleGroceryList = async () => {
    if (grocery) { setShowGrocery(s => !s); return; }
    setLoadingGrocery(true);
    setShowGrocery(true);
    try {
      const list = await getGroceryList(id);
      setGrocery(list);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate grocery list');
      setShowGrocery(false);
    } finally {
      setLoadingGrocery(false);
    }
  };

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-stone-600 mb-4">{error}</p>
          <Link href="/" className="text-green-700 font-medium hover:text-green-900">← Plan a new menu</Link>
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

  const { guest_count, occasion, cuisines, vibe, season, budget_per_person, dietary_restrictions } = menu.constraints as MenuConstraints;

  const metaParts = [
    occasion,
    `${guest_count} ${guest_count === 1 ? 'guest' : 'guests'}`,
    cuisines?.length ? cuisines.join(', ') : null,
    season,
    vibe,
    budget_per_person ? { budget: '$', mid: '$$', expensive: '$$$' }[budget_per_person] : null,
  ].filter(Boolean);

  return (
    <main className="flex-1 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 mb-6">← Plan another menu</Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-green-900 tracking-tight mb-1">Your Dinner Menu</h1>
              <p className="text-stone-500 capitalize">{metaParts.join(' · ')}</p>
              {dietary_restrictions?.length > 0 && (
                <p className="text-xs text-stone-400 mt-1">🌿 {dietary_restrictions.join(', ')}</p>
              )}
            </div>
            <button
              onClick={handleGroceryList}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-700 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
            >
              {loadingGrocery ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Generating…</>
              ) : showGrocery ? '🛒 Hide grocery list' : '🛒 Grocery list'}
            </button>
          </div>
        </div>

        {/* Swap reason toast */}
        {swapReason && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-start justify-between gap-2">
            <span>✓ Swapped! {swapReason.reason}</span>
            <button onClick={() => setSwapReason(null)} className="text-green-500 hover:text-green-700 shrink-0">×</button>
          </div>
        )}

        {/* Recipe cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {sortedRecipes.map(recipe => (
            <RecipeCard
              key={recipe.recipe_id}
              recipe={recipe}
              onSwap={() => handleSwap(recipe)}
              swapping={swappingId === recipe.recipe_id}
            />
          ))}
        </div>

        {/* Grocery list */}
        {showGrocery && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 mb-6">
            <h2 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">🛒 Grocery List</h2>
            {loadingGrocery ? (
              <p className="text-stone-400 text-sm">Generating your shopping list…</p>
            ) : grocery ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {grocery.sections.map(section => (
                  <div key={section.category}>
                    <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-2">{section.category}</h3>
                    <ul className="space-y-1.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                          <span>
                            <span className="text-stone-800">{item.amount} {item.ingredient}</span>
                            {item.for_recipe && (
                              <span className="text-stone-400 text-xs ml-1">({item.for_recipe})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Why this works */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">✨ Why this menu works</h2>
          <div className="text-stone-600 leading-relaxed">
            {menu.explanation.split('\n\n').map((para, i) => (
              <p key={i} className="mb-3 last:mb-0">{para}</p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
