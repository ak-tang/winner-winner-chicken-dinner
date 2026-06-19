ALTER TABLE recipes ADD COLUMN vibe_tags TEXT[] DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN season_tags TEXT[] DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN cost_level TEXT CHECK (cost_level IN ('budget', 'mid', 'expensive'));
ALTER TABLE recipes ADD COLUMN equipment_tags TEXT[] DEFAULT '{}';

CREATE INDEX idx_recipes_vibe_tags ON recipes USING GIN(vibe_tags);
CREATE INDEX idx_recipes_season_tags ON recipes USING GIN(season_tags);
CREATE INDEX idx_recipes_equipment_tags ON recipes USING GIN(equipment_tags);
