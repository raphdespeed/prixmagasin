from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.models import SearchResponse, BasketCompareRequest, BasketCompareResponse, ProductItem
from app.services.aggregator import aggregate_search, compare_basket
from app.services.open_prices import get_product_details, get_prices_for_ean

app = FastAPI(
    title="PrixMagasin API",
    description="Comparateur de prix de supermarchés en France (Carrefour, Auchan, Leclerc, etc.)",
    version="1.0.0"
)

# Configuration CORS pour autoriser le frontend (Vite React sur le port 5173 ou en local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "PrixMagasin API",
        "features": ["Open Food Facts", "Open Prices", "Playwright Carrefour Live Scraper"]
    }

@app.get("/api/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., description="Mot-clé, marque ou code-barres (ex: Nutella, Barilla, 3017620422003)"),
    live: bool = Query(True, description="Activer le scraping direct en temps réel"),
    city: str = Query(None, description="Filtrer les prix par ville")
):
    """Recherche des produits et compare leurs prix entre les différentes enseignes françaises."""
    return await aggregate_search(query=q, enable_live_scraping=live, target_city=city)

@app.get("/api/product/{ean}")
async def get_product(ean: str):
    """Récupère la fiche détaillée d'un produit avec l'historique complet des prix."""
    details = await get_product_details(ean)
    prices = await get_prices_for_ean(ean, size=30)
    return {
        "product": details,
        "prices": prices,
        "total_prices": len(prices)
    }

@app.post("/api/basket/compare", response_model=BasketCompareResponse)
async def compare_user_basket(request: BasketCompareRequest):
    """Compare le coût total d'un panier d'articles selon chaque supermarché."""
    items = [{"ean": it.ean, "quantity": it.quantity} for it in request.items]
    return await compare_basket(items)

# Servir le build du frontend s'il existe
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
