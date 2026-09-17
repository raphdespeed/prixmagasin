from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class PriceItem(BaseModel):
    retailer: str  # Ex: "Carrefour", "Auchan", "E.Leclerc", "Intermarché", "Lidl"
    price: float
    unit_price: Optional[str] = None  # Ex: "7.98 € / kg"
    store_name: Optional[str] = None  # Ex: "Carrefour Drive Lyon"
    city: Optional[str] = None  # Ex: "Lyon"
    date: Optional[str] = None  # Ex: "2026-09-17"
    is_live: bool = False  # True si extrait en temps réel à la seconde
    is_promo: bool = False
    proof_url: Optional[str] = None
    url: Optional[str] = None

class ProductItem(BaseModel):
    ean: str
    name: str
    brand: Optional[str] = None
    quantity: Optional[str] = None
    image_url: Optional[str] = None
    nutriscore: Optional[str] = None  # a, b, c, d, e
    ecoscore: Optional[str] = None
    categories: List[str] = []
    prices: List[PriceItem] = []
    best_price: Optional[float] = None
    best_retailer: Optional[str] = None
    highest_price: Optional[float] = None
    price_diff_amount: Optional[float] = None  # Économie max réalisable
    price_diff_pct: Optional[float] = None  # Pourcentage d'écart

class SearchResponse(BaseModel):
    query: str
    total: int
    products: List[ProductItem]
    cities_available: List[str] = []
    retailers_available: List[str] = []

class BasketItemRequest(BaseModel):
    ean: str
    quantity: int = 1

class BasketCompareRequest(BaseModel):
    items: List[BasketItemRequest]

class RetailerBasketTotal(BaseModel):
    retailer: str
    total_price: float
    items_found: int
    items_missing: int
    is_cheapest: bool = False
    savings_vs_highest: float = 0.0

class BasketCompareResponse(BaseModel):
    total_items: int
    totals_by_retailer: List[RetailerBasketTotal]
    cheapest_retailer: Optional[str] = None
    max_savings: float = 0.0
