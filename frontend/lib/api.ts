const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface CourseConstraint {
  course_type: 'appetizer' | 'main' | 'dessert' | 'drink';
  quantity: number;
}

export interface MenuConstraints {
  courses: CourseConstraint[];
  cuisines: string[];
  dietary_restrictions: string[];
  allergies: string[];
  must_have_ingredients: string[];
  guest_count: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  occasion: string | null;
}

export interface MenuRecipe {
  recipe_id: string;
  course_type: string;
  title: string;
  source_url: string;
  image_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  cuisine_tags: string[];
  dietary_tags: string[];
}

export interface MenuResponse {
  id: string;
  constraints: MenuConstraints;
  recipes: MenuRecipe[];
  explanation: string;
  created_at: string;
}

export async function generateMenu(constraints: MenuConstraints): Promise<MenuResponse> {
  const res = await fetch(`${API_BASE}/api/menu/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(constraints),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? 'Failed to generate menu');
  }
  return res.json();
}

export async function scrapeRecipe(url: string, courseType: string, cuisineTags: string[]) {
  const res = await fetch(`${API_BASE}/api/recipes/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, course_type: courseType, cuisine_tags: cuisineTags }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? 'Failed to scrape recipe');
  }
  return res.json();
}

export async function listRecipes(courseType?: string) {
  const url = courseType
    ? `${API_BASE}/api/recipes?course_type=${courseType}`
    : `${API_BASE}/api/recipes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}
