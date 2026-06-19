CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT UNIQUE NOT NULL,
  cuisine_tags TEXT[] DEFAULT '{}',
  course_type TEXT NOT NULL CHECK (course_type IN ('appetizer', 'main', 'dessert', 'drink')),
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  servings INTEGER,
  dietary_tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name_normalized TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  raw_text TEXT NOT NULL
);

CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraints_json JSONB NOT NULL,
  recipe_ids UUID[] NOT NULL,
  recipes_json JSONB NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_course_type ON recipes(course_type);
CREATE INDEX idx_recipes_dietary_tags ON recipes USING GIN(dietary_tags);
CREATE INDEX idx_recipes_cuisine_tags ON recipes USING GIN(cuisine_tags);
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);
