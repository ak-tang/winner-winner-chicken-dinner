'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMenus, type MenuSummary } from '@/lib/api';

const COURSE_EMOJI: Record<string, string> = {
  appetizer: '🥗',
  main: '🍽️',
  dessert: '🍮',
  drink: '🍷',
};

const COURSE_ORDER = ['drink', 'appetizer', 'main', 'dessert'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function HistoryPage() {
  const [menus, setMenus] = useState<MenuSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMenus()
      .then(setMenus)
      .catch(e => setError(e.message));
  }, []);

  return (
    <main className="flex-1 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-900 tracking-tight mb-1">Menu History</h1>
          <p className="text-stone-500">All your generated dinner party menus.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {menus === null && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 h-52 animate-pulse" />
            ))}
          </div>
        )}

        {menus?.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-stone-500 mb-4">No menus yet.</p>
            <Link href="/" className="text-green-700 font-medium hover:text-green-900">
              Plan your first menu →
            </Link>
          </div>
        )}

        {menus && menus.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map(menu => (
              <Link
                key={menu.id}
                href={`/menu/${menu.id}`}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-green-400 hover:shadow-sm transition-all group"
              >
                {menu.first_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={menu.first_image}
                    alt=""
                    className="w-full h-36 object-cover group-hover:opacity-95 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-36 bg-amber-50 flex items-center justify-center text-4xl">
                    🐔
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-stone-900 text-sm leading-snug">
                        {menu.occasion || 'Dinner party'}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">{formatDate(menu.created_at)}</p>
                    </div>
                    <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full shrink-0">
                      {menu.guest_count} guests
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {COURSE_ORDER
                      .filter(c => menu.courses.includes(c))
                      .map(c => (
                        <span key={c} title={c} className="text-base">{COURSE_EMOJI[c]}</span>
                      ))}
                    {menu.cuisines.length > 0 && (
                      <span className="text-xs text-stone-500 ml-1 capitalize">
                        {menu.cuisines.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>

                  {menu.recipe_titles.length > 0 && (
                    <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                      {menu.recipe_titles.join(' · ')}
                    </p>
                  )}

                  {menu.vibe && (
                    <p className="text-xs text-purple-500 mt-1.5 capitalize">{menu.vibe}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
