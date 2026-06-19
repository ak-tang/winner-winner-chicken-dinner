from fastapi import APIRouter, HTTPException
from models.schemas import MenuConstraints, ReplaceRequest
from services.claude_service import generate_menu, generate_grocery_list, suggest_replacement
from database import supabase

router = APIRouter()


@router.get("/")
def list_menus():
    result = supabase.table("menus").select(
        "id, created_at, constraints_json, recipes_json"
    ).order("created_at", desc=True).limit(50).execute()

    menus = []
    for row in result.data:
        constraints = row['constraints_json'] or {}
        recipes = row['recipes_json'] or []
        menus.append({
            "id": row['id'],
            "created_at": row['created_at'],
            "occasion": constraints.get('occasion'),
            "guest_count": constraints.get('guest_count'),
            "cuisines": constraints.get('cuisines', []),
            "vibe": constraints.get('vibe'),
            "courses": list({r['course_type'] for r in recipes}),
            "recipe_titles": [r['title'] for r in recipes[:3]],
            "first_image": recipes[0].get('image_url') if recipes else None,
        })
    return menus


def _recipe_to_summary(r: dict) -> dict:
    return {
        "id": str(r['id']),
        "title": r['title'],
        "course_type": r['course_type'],
        "cuisine_tags": r['cuisine_tags'],
        "dietary_tags": r['dietary_tags'],
        "vibe_tags": r.get('vibe_tags') or [],
        "season_tags": r.get('season_tags') or [],
        "cost_level": r.get('cost_level'),
        "equipment_tags": r.get('equipment_tags') or [],
        "prep_time_minutes": r['prep_time_minutes'],
        "cook_time_minutes": r['cook_time_minutes'],
        "total_time_minutes": r['total_time_minutes'],
        "servings": r['servings'],
        "source_url": r['source_url'],
        "image_url": r['image_url'],
        "ingredients": [ing['raw_text'] for ing in r.get('ingredients', [])[:12]],
    }


def _recipe_to_menu_item(r: dict, course_type: str) -> dict:
    return {
        "recipe_id": str(r['id']),
        "course_type": course_type,
        "title": r['title'],
        "source_url": r['source_url'],
        "image_url": r['image_url'],
        "prep_time_minutes": r['prep_time_minutes'],
        "cook_time_minutes": r['cook_time_minutes'],
        "servings": r['servings'],
        "cuisine_tags": r['cuisine_tags'],
        "dietary_tags": r['dietary_tags'],
        "vibe_tags": r.get('vibe_tags') or [],
        "season_tags": r.get('season_tags') or [],
        "cost_level": r.get('cost_level'),
        "equipment_tags": r.get('equipment_tags') or [],
    }


def _fetch_and_filter(constraints: MenuConstraints) -> list:
    course_types = list({c.course_type for c in constraints.courses})

    query = supabase.table("recipes").select("*, ingredients(name_normalized, raw_text)").in_(
        "course_type", course_types
    )

    # Filter by season
    if constraints.season:
        query = query.or_(
            f"season_tags.cs.{{\"{constraints.season}\"}},season_tags.cs.{{\"year-round\"}}"
        )

    # Filter by budget
    if constraints.budget_per_person:
        query = query.eq("cost_level", constraints.budget_per_person)

    available = query.execute().data

    # Hard-filter allergens
    if constraints.allergies:
        filtered = [
            r for r in available
            if not any(
                a.lower() in " ".join(ing['raw_text'].lower() for ing in r.get('ingredients', []))
                for a in constraints.allergies
            )
        ]
        if filtered:
            available = filtered

    # Filter out recipes requiring unavailable equipment
    if constraints.equipment_unavailable:
        unavail = set(constraints.equipment_unavailable)
        available = [
            r for r in available
            if not (set(r.get('equipment_tags') or []) & unavail)
        ]

    return available


@router.post("/generate")
def generate_dinner_menu(constraints: MenuConstraints):
    available = _fetch_and_filter(constraints)

    if not available:
        raise HTTPException(
            status_code=404,
            detail="No recipes match your constraints. Try relaxing some filters or add more recipes via /admin/seed."
        )

    recipe_summaries = [_recipe_to_summary(r) for r in available]

    try:
        claude_response = generate_menu(constraints, recipe_summaries)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Menu generation failed: {e}")

    recipes_by_id = {str(r['id']): r for r in available}

    menu_recipes = []
    for sel in claude_response.get('selected_recipes', []):
        recipe = recipes_by_id.get(sel['recipe_id'])
        if recipe:
            menu_recipes.append(_recipe_to_menu_item(recipe, sel['course_type']))

    selected_ids = [sel['recipe_id'] for sel in claude_response.get('selected_recipes', [])]
    menu_db = supabase.table("menus").insert({
        "constraints_json": constraints.model_dump(),
        "recipe_ids": selected_ids,
        "recipes_json": menu_recipes,
        "explanation": claude_response['explanation'],
    }).execute()

    menu_id = menu_db.data[0]['id'] if menu_db.data else None
    created_at = menu_db.data[0]['created_at'] if menu_db.data else None

    return {
        "id": menu_id,
        "constraints": constraints.model_dump(),
        "recipes": menu_recipes,
        "explanation": claude_response['explanation'],
        "created_at": created_at,
    }


@router.post("/{menu_id}/replace")
def replace_course(menu_id: str, request: ReplaceRequest):
    result = supabase.table("recipes").select("*, ingredients(name_normalized, raw_text)").eq(
        "course_type", request.course_type
    ).execute()

    candidates = [
        _recipe_to_summary(r) for r in result.data
        if str(r['id']) != request.current_recipe_id
    ]

    if not candidates:
        raise HTTPException(status_code=404, detail="No replacement recipes available for this course.")

    try:
        suggestion = suggest_replacement(
            request.course_type,
            request.current_recipe_id,
            request.constraints,
            candidates,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Replacement failed: {e}")

    recipes_by_id = {r['id']: r for r in result.data}
    recipe = recipes_by_id.get(suggestion['recipe_id'])
    if not recipe:
        raise HTTPException(status_code=500, detail="Claude suggested an unknown recipe ID.")

    return {
        "recipe": _recipe_to_menu_item(recipe, request.course_type),
        "reason": suggestion.get('reason', ''),
    }


@router.post("/{menu_id}/grocery-list")
def get_grocery_list(menu_id: str):
    result = supabase.table("menus").select("*").eq("id", menu_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Menu not found")

    menu = result.data
    recipes = menu['recipes_json']
    guest_count = menu['constraints_json'].get('guest_count', 4)

    # Fetch full ingredient lists for each recipe
    recipe_ids = [r['recipe_id'] for r in recipes]
    recipes_with_ingredients = supabase.table("recipes").select(
        "id, title, servings, ingredients(raw_text)"
    ).in_("id", recipe_ids).execute().data

    recipe_details = [
        {
            "title": r['title'],
            "servings": r['servings'],
            "ingredients": [ing['raw_text'] for ing in r.get('ingredients', [])],
        }
        for r in recipes_with_ingredients
    ]

    try:
        grocery_list = generate_grocery_list(recipe_details, guest_count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grocery list generation failed: {e}")

    return grocery_list


@router.get("/{menu_id}")
def get_menu(menu_id: str):
    result = supabase.table("menus").select("*").eq("id", menu_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Menu not found")
    row = result.data
    return {
        "id": row["id"],
        "constraints": row["constraints_json"],
        "recipes": row["recipes_json"],
        "explanation": row["explanation"],
        "created_at": row["created_at"],
    }
