import json
from typing import Optional
import anthropic
from models.schemas import MenuConstraints

VIBE_OPTIONS = ["casual", "elegant", "romantic", "festive", "comfort", "rustic", "modern", "cozy", "fresh", "indulgent"]
SEASON_OPTIONS = ["spring", "summer", "fall", "winter", "year-round"]
COST_OPTIONS = ["budget", "mid", "expensive"]
EQUIPMENT_OPTIONS = ["oven", "stovetop", "grill", "slow-cooker", "stand-mixer", "food-processor", "no-cook", "instant-pot", "deep-fryer"]


COURSE_OPTIONS = ["appetizer", "main", "dessert", "drink"]


def tag_recipe(title: str, ingredients: list, instructions: Optional[str]) -> dict:
    """Use Claude Haiku to auto-tag a recipe with all labels including cuisine and course type."""
    client = anthropic.Anthropic()

    prompt = f"""Tag this recipe with appropriate labels.

Recipe: {title}
Ingredients: {', '.join(ingredients)}
Instructions: {instructions or 'N/A'}

Return ONLY valid JSON, no markdown:
{{
  "course_type": "",
  "cuisine_tags": [],
  "vibe_tags": [],
  "season_tags": [],
  "cost_level": "",
  "equipment_tags": []
}}

Valid values:
- course_type: one of {COURSE_OPTIONS}
- cuisine_tags: list of cuisine styles the recipe belongs to (e.g. ["Italian", "Mediterranean"])
- vibe_tags: subset of {VIBE_OPTIONS}
- season_tags: subset of {SEASON_OPTIONS}
- cost_level: one of {COST_OPTIONS}
- equipment_tags: subset of {EQUIPMENT_OPTIONS}"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=384,
        messages=[{"role": "user", "content": prompt}],
    )

    result = json.loads(message.content[0].text)
    if result.get("cost_level") not in COST_OPTIONS:
        result["cost_level"] = "mid"
    if result.get("course_type") not in COURSE_OPTIONS:
        result["course_type"] = "main"
    return result


def _build_constraints_block(constraints: MenuConstraints) -> str:
    courses_str = ", ".join(f"{c.quantity}x {c.course_type}" for c in constraints.courses)
    lines = [
        f"- Courses needed: {courses_str}",
        f"- Number of guests: {constraints.guest_count}",
        f"- Cuisine preference: {', '.join(constraints.cuisines) if constraints.cuisines else 'Any'}",
        f"- Occasion: {constraints.occasion or 'General dinner party'}",
        f"- Dietary restrictions: {', '.join(constraints.dietary_restrictions) if constraints.dietary_restrictions else 'None'}",
        f"- Allergies: {', '.join(constraints.allergies) if constraints.allergies else 'None'}",
        f"- Must-have ingredients: {', '.join(constraints.must_have_ingredients) if constraints.must_have_ingredients else 'None'}",
        f"- Max prep time: {f'{constraints.prep_time_minutes} minutes' if constraints.prep_time_minutes else 'No limit'}",
        f"- Max cook time: {f'{constraints.cook_time_minutes} minutes' if constraints.cook_time_minutes else 'No limit'}",
        f"- Max total time: {f'{constraints.total_time_minutes} minutes' if constraints.total_time_minutes else 'No limit'}",
        f"- Desired vibe: {constraints.vibe or 'Not specified'}",
        f"- Season: {constraints.season or 'Any'}",
        f"- Location: {constraints.location or 'Not specified'}",
        f"- Budget per person: {constraints.budget_per_person or 'No limit'}",
        f"- Equipment unavailable: {', '.join(constraints.equipment_unavailable) if constraints.equipment_unavailable else 'None'}",
    ]
    return "\n".join(lines)


def generate_menu(constraints: MenuConstraints, available_recipes: list) -> dict:
    client = anthropic.Anthropic()

    prompt = f"""You are a professional chef and sommelier helping plan a cohesive dinner party menu.

DINNER PARTY CONSTRAINTS:
{_build_constraints_block(constraints)}

AVAILABLE RECIPES:
{json.dumps(available_recipes, indent=2)}

Select the best combination of recipes to create a cohesive dinner party menu satisfying ALL constraints.
For each required course, select exactly the number of recipes specified (e.g. "2x appetizer" means pick 2 appetizer recipes).
Pay special attention to the desired vibe, season, and budget when making selections.
Only select recipes from the provided list using their exact IDs.

Respond ONLY with valid JSON, no markdown:
{{
  "selected_recipes": [
    {{
      "recipe_id": "uuid-here",
      "course_type": "appetizer"
    }}
  ],
  "explanation": "2-3 paragraph explanation of why this menu works together. Cover the flavor arc across courses, textural balance, how the dishes complement each other, why the selection fits the vibe/occasion/season, and how it respects any constraints."
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(message.content[0].text)


def suggest_replacement(
    course_type: str,
    current_recipe_id: str,
    constraints: MenuConstraints,
    candidate_recipes: list,
) -> dict:
    client = anthropic.Anthropic()

    prompt = f"""You are a professional chef. A user wants to swap the {course_type} course in their dinner party menu.

DINNER PARTY CONSTRAINTS:
{_build_constraints_block(constraints)}

CANDIDATE REPLACEMENT RECIPES (do NOT pick recipe ID {current_recipe_id}):
{json.dumps(candidate_recipes, indent=2)}

Pick the single best replacement {course_type} recipe from the candidates.

Respond ONLY with valid JSON, no markdown:
{{
  "recipe_id": "uuid-here",
  "reason": "one sentence on why this is a great replacement"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(message.content[0].text)


def generate_grocery_list(recipes: list, guest_count: int) -> dict:
    client = anthropic.Anthropic()

    prompt = f"""You are a professional chef. Generate a consolidated grocery list for a dinner party of {guest_count} guests.

MENU RECIPES:
{json.dumps(recipes, indent=2)}

Consolidate ingredients across all recipes, scale quantities for {guest_count} guests (assume recipes serve 4 unless servings is specified), and group by grocery store section.

Respond ONLY with valid JSON, no markdown:
{{
  "sections": [
    {{
      "category": "Produce",
      "items": [
        {{"ingredient": "cherry tomatoes", "amount": "2 pints", "for_recipe": "Caprese salad"}}
      ]
    }}
  ]
}}

Categories to use: Produce, Proteins & Seafood, Dairy & Eggs, Pantry & Dry Goods, Herbs & Spices, Beverages, Other"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(message.content[0].text)
