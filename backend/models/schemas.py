from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CourseConstraint(BaseModel):
    course_type: str  # appetizer, main, dessert, drink
    quantity: int = 1


class MenuConstraints(BaseModel):
    courses: List[CourseConstraint]
    cuisines: List[str] = []
    dietary_restrictions: List[str] = []
    allergies: List[str] = []
    must_have_ingredients: List[str] = []
    guest_count: int
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    total_time_minutes: Optional[int] = None
    occasion: Optional[str] = None


class IngredientOut(BaseModel):
    name_normalized: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    raw_text: str


class ScrapeRequest(BaseModel):
    url: str
    course_type: str
    cuisine_tags: List[str] = []


class MenuRecipe(BaseModel):
    recipe_id: str
    course_type: str
    title: str
    source_url: str
    image_url: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    cuisine_tags: List[str] = []
    dietary_tags: List[str] = []


class MenuResponse(BaseModel):
    id: Optional[str] = None
    constraints: dict
    recipes: List[MenuRecipe]
    explanation: str
    created_at: Optional[str] = None
