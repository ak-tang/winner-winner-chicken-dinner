const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface CourseConstraint {
  course_type: 'appetizer' | 'main' | 'dessert' | 'drink';
  quantity: number;
}

export interface MenuConstraints {
  // M1
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
  // M2
  vibe: string | null;
  season: string | null;
  location: string | null;
  budget_per_person: string | null;
  equipment_unavailable: string[];
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
  vibe_tags: string[];
  season_tags: string[];
  cost_level: string | null;
  equipment_tags: string[];
}

export interface MenuResponse {
  id: string;
  constraints: MenuConstraints;
  recipes: MenuRecipe[];
  explanation: string;
  created_at: string;
}

export interface GroceryItem {
  ingredient: string;
  amount: string;
  for_recipe: string;
}

export interface GrocerySection {
  category: string;
  items: GroceryItem[];
}

export interface GroceryList {
  sections: GrocerySection[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? 'Request failed');
  }
  return res.json();
}

export async function generateMenu(constraints: MenuConstraints): Promise<MenuResponse> {
  return apiFetch('/api/menu/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(constraints),
  });
}

export async function replaceRecipe(
  menuId: string,
  courseType: string,
  currentRecipeId: string,
  constraints: MenuConstraints,
): Promise<{ recipe: MenuRecipe; reason: string }> {
  return apiFetch(`/api/menu/${menuId}/replace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_type: courseType, current_recipe_id: currentRecipeId, constraints }),
  });
}

export async function getGroceryList(menuId: string): Promise<GroceryList> {
  return apiFetch(`/api/menu/${menuId}/grocery-list`, { method: 'POST' });
}

export async function scrapeRecipe(url: string, courseType: string, cuisineTags: string[]) {
  return apiFetch('/api/recipes/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, course_type: courseType, cuisine_tags: cuisineTags }),
  });
}

export async function listRecipes(courseType?: string) {
  const path = courseType ? `/api/recipes?course_type=${courseType}` : '/api/recipes';
  return apiFetch(path);
}
