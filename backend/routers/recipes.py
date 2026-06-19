from fastapi import APIRouter, HTTPException
from typing import Optional, Set
from models.schemas import ScrapeRequest
from services.scraper import scrape_recipe
from database import supabase

router = APIRouter()


@router.post("/scrape")
def scrape_and_store(request: ScrapeRequest):
    try:
        result = scrape_recipe(
            url=request.url,
            course_type=request.course_type,
            cuisine_tags=request.cuisine_tags,
            vibe_tags=request.vibe_tags,
            season_tags=request.season_tags,
            cost_level=request.cost_level,
            equipment_tags=request.equipment_tags,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scrape recipe: {e}")

    recipe_data = result['recipe']
    ingredients_data = result['ingredients']

    # Upsert on source_url
    existing = supabase.table("recipes").select("id").eq("source_url", request.url).execute()
    if existing.data:
        recipe_id = existing.data[0]['id']
        supabase.table("recipes").update(recipe_data).eq("id", recipe_id).execute()
    else:
        db_result = supabase.table("recipes").insert(recipe_data).execute()
        if not db_result.data:
            raise HTTPException(status_code=500, detail="Failed to store recipe")
        recipe_id = db_result.data[0]['id']

    if ingredients_data:
        supabase.table("ingredients").delete().eq("recipe_id", recipe_id).execute()
        for ing in ingredients_data:
            ing['recipe_id'] = recipe_id
        supabase.table("ingredients").insert(ingredients_data).execute()

    return {
        "id": recipe_id,
        "title": recipe_data['title'],
        "course_type": recipe_data['course_type'],
        "cuisine_tags": recipe_data['cuisine_tags'],
        "vibe_tags": recipe_data['vibe_tags'],
        "season_tags": recipe_data['season_tags'],
        "cost_level": recipe_data['cost_level'],
        "equipment_tags": recipe_data['equipment_tags'],
        "dietary_tags": recipe_data['dietary_tags'],
    }


@router.get("/vibe-tags")
def get_vibe_tags():
    result = supabase.table("recipes").select("vibe_tags").execute()
    tags: Set[str] = set()
    for row in result.data:
        tags.update(row.get("vibe_tags") or [])
    return sorted(tags)


@router.get("/")
def list_recipes(course_type: Optional[str] = None):
    query = supabase.table("recipes").select("*, ingredients(*)")
    if course_type:
        query = query.eq("course_type", course_type)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/{recipe_id}")
def get_recipe(recipe_id: str):
    result = supabase.table("recipes").select("*, ingredients(*)").eq("id", recipe_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return result.data
