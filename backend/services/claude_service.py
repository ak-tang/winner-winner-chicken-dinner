import json
import anthropic
from models.schemas import MenuConstraints


def generate_menu(constraints: MenuConstraints, available_recipes: list) -> dict:
    client = anthropic.Anthropic()

    courses_str = ", ".join(
        f"{c.quantity}x {c.course_type}" for c in constraints.courses
    )

    prompt = f"""You are a professional chef and sommelier helping plan a cohesive dinner party menu.

DINNER PARTY CONSTRAINTS:
- Courses needed: {courses_str}
- Number of guests: {constraints.guest_count}
- Cuisine preference: {', '.join(constraints.cuisines) if constraints.cuisines else 'Any'}
- Occasion: {constraints.occasion or 'General dinner party'}
- Dietary restrictions: {', '.join(constraints.dietary_restrictions) if constraints.dietary_restrictions else 'None'}
- Allergies: {', '.join(constraints.allergies) if constraints.allergies else 'None'}
- Must-have ingredients: {', '.join(constraints.must_have_ingredients) if constraints.must_have_ingredients else 'None'}
- Max prep time: {f"{constraints.prep_time_minutes} minutes" if constraints.prep_time_minutes else 'No limit'}
- Max cook time: {f"{constraints.cook_time_minutes} minutes" if constraints.cook_time_minutes else 'No limit'}
- Max total time: {f"{constraints.total_time_minutes} minutes" if constraints.total_time_minutes else 'No limit'}

AVAILABLE RECIPES:
{json.dumps(available_recipes, indent=2)}

Select the best combination of recipes to create a cohesive dinner party menu satisfying ALL constraints.
For each required course, select exactly the number of recipes specified (e.g. "2x appetizer" means pick 2 appetizer recipes).
Only select recipes from the provided list using their exact IDs.

Respond ONLY with valid JSON in exactly this format, no markdown, no extra text:
{{
  "selected_recipes": [
    {{
      "recipe_id": "uuid-here",
      "course_type": "appetizer"
    }}
  ],
  "explanation": "2-3 paragraph explanation of why this menu works together. Cover the flavor arc across courses, textural balance, how the dishes complement each other's flavors, and why the selection fits the occasion and any constraints."
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    return json.loads(message.content[0].text)
