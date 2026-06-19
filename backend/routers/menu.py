from fastapi import APIRouter, HTTPException
from models.schemas import MenuConstraints
from services.claude_service import generate_menu
from database import supabase

router = APIRouter()


@router.post("/generate")
def generate_dinner_menu(constraints: MenuConstraints):
    course_types = list({c.course_type for c in constraints.courses})

    db_result = supabase.table("recipes").select("*, ingredients(name_normalized, raw_text)").in_(
        "course_type", course_types
    ).execute()
    available_recipes = db_result.data

    if not available_recipes:
        raise HTTPException(
            status_code=404,
            detail="No recipes found. Please add recipes via /api/recipes/scrape first."
        )

    # Hard-filter allergens
    if constraints.allergies:
        filtered = []
        for recipe in available_recipes:
            ingredients_text = " ".join(
                ing['raw_text'].lower() for ing in recipe.get('ingredients', [])
            )
            if not any(a.lower() in ingredients_text for a in constraints.allergies):
                filtered.append(recipe)
        if filtered:
            available_recipes = filtered

    recipe_summaries = [
        {
            "id": str(r['id']),
            "title": r['title'],
            "course_type": r['course_type'],
            "cuisine_tags": r['cuisine_tags'],
            "dietary_tags": r['dietary_tags'],
            "prep_time_minutes": r['prep_time_minutes'],
            "cook_time_minutes": r['cook_time_minutes'],
            "total_time_minutes": r['total_time_minutes'],
            "servings": r['servings'],
            "source_url": r['source_url'],
            "image_url": r['image_url'],
            "ingredients": [ing['raw_text'] for ing in r.get('ingredients', [])[:12]],
        }
        for r in available_recipes
    ]

    try:
        claude_response = generate_menu(constraints, recipe_summaries)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Menu generation failed: {e}")

    recipes_by_id = {str(r['id']): r for r in available_recipes}

    menu_recipes = []
    for sel in claude_response.get('selected_recipes', []):
        recipe = recipes_by_id.get(sel['recipe_id'])
        if recipe:
            menu_recipes.append({
                "recipe_id": sel['recipe_id'],
                "course_type": sel['course_type'],
                "title": recipe['title'],
                "source_url": recipe['source_url'],
                "image_url": recipe['image_url'],
                "prep_time_minutes": recipe['prep_time_minutes'],
                "cook_time_minutes": recipe['cook_time_minutes'],
                "servings": recipe['servings'],
                "cuisine_tags": recipe['cuisine_tags'],
                "dietary_tags": recipe['dietary_tags'],
            })

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
