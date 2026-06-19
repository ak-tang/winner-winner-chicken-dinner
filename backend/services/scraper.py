import re
from typing import List, Optional
from recipe_scrapers import scrape_me
from services.claude_service import tag_recipe


MEAT_KEYWORDS = {'chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn',
                 'bacon', 'ham', 'sausage', 'meat', 'steak', 'veal', 'duck', 'crab', 'lobster', 'anchovy'}
DAIRY_KEYWORDS = {'milk', 'butter', 'cream', 'cheese', 'yogurt', 'ghee', 'whey', 'lactose', 'parmesan',
                  'mozzarella', 'ricotta', 'brie', 'cheddar', 'feta'}
GLUTEN_KEYWORDS = {'flour', 'bread', 'pasta', 'wheat', 'barley', 'rye', 'breadcrumb', 'crouton', 'soy sauce',
                   'couscous', 'bulgur', 'semolina'}
EGG_KEYWORDS = {'egg', 'eggs', 'egg white', 'egg yolk', 'mayonnaise'}
NUT_KEYWORDS = {'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'pistachio', 'hazelnut', 'pine nut',
                'macadamia', 'chestnut'}


def _detect_dietary_tags(ingredients: List[str], title: str) -> List[str]:
    all_text = " ".join(ingredients + [title]).lower()
    words = set(re.findall(r'\b\w+\b', all_text))

    has_meat = bool(MEAT_KEYWORDS & words) or any(k in all_text for k in {'shrimp', 'ground beef', 'ground turkey'})
    has_dairy = bool(DAIRY_KEYWORDS & words)
    has_gluten = bool(GLUTEN_KEYWORDS & words)
    has_eggs = bool(EGG_KEYWORDS & words)
    has_nuts = bool(NUT_KEYWORDS & words)

    tags = []
    if not has_meat:
        tags.append('vegetarian')
        if not has_dairy and not has_eggs:
            tags.append('vegan')
    if not has_gluten:
        tags.append('gluten-free')
    if not has_dairy:
        tags.append('dairy-free')
    if has_nuts:
        tags.append('contains-nuts')
    return tags


def _merge(user_list: List[str], claude_list: List[str]) -> List[str]:
    """Merge user-supplied and Claude-generated tags, deduplicating case-insensitively."""
    seen = set()
    result = []
    for tag in claude_list + user_list:
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            result.append(tag)
    return result


def scrape_recipe(
    url: str,
    course_type: Optional[str],
    cuisine_tags: List[str],
    vibe_tags: List[str],
    season_tags: List[str],
    cost_level: Optional[str],
    equipment_tags: List[str],
) -> dict:
    scraper = scrape_me(url, wild_mode=True)

    ingredients_raw: List[str] = scraper.ingredients()
    dietary_tags = _detect_dietary_tags(ingredients_raw, scraper.title())

    def _safe(fn):
        try:
            return fn()
        except Exception:
            return None

    total_time = _safe(scraper.total_time)
    prep_time = _safe(scraper.prep_time)
    cook_time = _safe(scraper.cook_time)
    image = _safe(scraper.image)
    instructions = _safe(scraper.instructions)

    servings = None
    yields_str = _safe(scraper.yields)
    if yields_str:
        m = re.search(r'\d+', str(yields_str))
        if m:
            servings = int(m.group())

    # Claude Haiku auto-tags everything including course_type and cuisine
    try:
        claude_tags = tag_recipe(scraper.title(), ingredients_raw, instructions)
    except Exception:
        claude_tags = {
            "course_type": "main",
            "cuisine_tags": [],
            "vibe_tags": [],
            "season_tags": [],
            "cost_level": "mid",
            "equipment_tags": [],
        }

    # User-supplied tags take precedence for course_type/cost_level (single values);
    # for list tags, merge both sets
    final_course_type = course_type or claude_tags.get('course_type', 'main')
    final_cost_level = cost_level or claude_tags.get('cost_level', 'mid')

    recipe_data = {
        'title': scraper.title(),
        'source_url': url,
        'course_type': final_course_type,
        'cuisine_tags': _merge(cuisine_tags, claude_tags.get('cuisine_tags', [])),
        'prep_time_minutes': prep_time,
        'cook_time_minutes': cook_time,
        'total_time_minutes': total_time,
        'servings': servings,
        'dietary_tags': dietary_tags,
        'image_url': image,
        'instructions': instructions,
        'vibe_tags': _merge(vibe_tags, claude_tags.get('vibe_tags', [])),
        'season_tags': _merge(season_tags, claude_tags.get('season_tags', [])),
        'cost_level': final_cost_level,
        'equipment_tags': _merge(equipment_tags, claude_tags.get('equipment_tags', [])),
    }

    ingredients_data = [
        {'name_normalized': ing, 'raw_text': ing}
        for ing in ingredients_raw
    ]

    return {'recipe': recipe_data, 'ingredients': ingredients_data}
