import { type MenuRecipe } from '@/lib/api';

const COURSE_LABELS: Record<string, string> = {
  appetizer: 'Appetizer',
  main: 'Main Course',
  dessert: 'Dessert',
  drink: 'Drink',
};

const COURSE_EMOJI: Record<string, string> = {
  appetizer: '🥗',
  main: '🍽️',
  dessert: '🍮',
  drink: '🍷',
};

const COST_LABEL: Record<string, string> = {
  budget: '$',
  mid: '$$',
  expensive: '$$$',
};

interface Props {
  recipe: MenuRecipe;
  onSwap?: () => void;
  swapping?: boolean;
}

export default function RecipeCard({ recipe, onSwap, swapping }: Props) {
  const totalTime =
    recipe.prep_time_minutes != null && recipe.cook_time_minutes != null
      ? recipe.prep_time_minutes + recipe.cook_time_minutes
      : null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col">
      {recipe.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.image_url} alt={recipe.title} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-amber-50 flex items-center justify-center text-5xl">
          {COURSE_EMOJI[recipe.course_type] ?? '🍴'}
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            {COURSE_LABELS[recipe.course_type] ?? recipe.course_type}
          </span>
          {recipe.cost_level && (
            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              {COST_LABEL[recipe.cost_level] ?? recipe.cost_level}
            </span>
          )}
          {recipe.vibe_tags.slice(0, 1).map(tag => (
            <span key={tag} className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full capitalize">{tag}</span>
          ))}
        </div>

        <h3 className="font-semibold text-stone-900 text-base mb-1 leading-snug">{recipe.title}</h3>

        <div className="flex gap-3 text-xs text-stone-500 mb-3 flex-wrap">
          {totalTime != null && <span>⏱ {totalTime} min</span>}
          {recipe.servings != null && <span>👥 Serves {recipe.servings}</span>}
          {recipe.season_tags.length > 0 && <span className="capitalize">🌿 {recipe.season_tags[0]}</span>}
          {recipe.cuisine_tags.length > 0 && <span className="capitalize">{recipe.cuisine_tags.join(', ')}</span>}
        </div>

        {recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.dietary_tags.map(tag => (
              <span key={tag} className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
            View recipe
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {onSwap && (
            <button
              onClick={onSwap}
              disabled={swapping}
              className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 disabled:opacity-50"
            >
              {swapping ? (
                <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Swapping…</>
              ) : '↻ Swap'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
