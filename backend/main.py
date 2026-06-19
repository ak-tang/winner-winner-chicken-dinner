from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import recipes, menu

app = FastAPI(title="Winner Winner Chicken Dinner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(menu.router, prefix="/api/menu", tags=["menu"])


@app.get("/")
def root():
    return {"message": "Winner Winner Chicken Dinner API 🐔"}
