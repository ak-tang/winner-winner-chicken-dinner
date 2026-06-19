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

interface Props {
  recipe: MenuRecipe;
}

export default function RecipeCard({ recipe }: Props) {
  const totalTime =
    recipe.prep_time_minutes != null && recipe.cook_time_minutes != null
      ? recipe.prep_time_minutes + recipe.cook_time_minutes
      : null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col">
      {recipe.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div className="w-full h-44 bg-amber-50 flex items-center justify-center text-5xl">
          {COURSE_EMOJI[recipe.course_type] ?? '🍴'}
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            {COURSE_LABELS[recipe.course_type] ?? recipe.course_type}
          </span>
          {recipe.dietary_tags.map(tag => (
            <span
              key={tag}
              className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="font-semibold text-stone-900 text-base mb-1 leading-snug">{recipe.title}</h3>

        <div className="flex gap-3 text-xs text-stone-500 mb-3">
          {totalTime != null && <span>⏱ {totalTime} min</span>}
          {recipe.servings != null && <span>👥 Serves {recipe.servings}</span>}
          {recipe.cuisine_tags.length > 0 && (
            <span className="capitalize">{recipe.cuisine_tags.join(', ')}</span>
          )}
        </div>

        <a
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-sm text-green-700 font-medium hover:text-green-900 flex items-center gap-1"
        >
          View recipe
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
