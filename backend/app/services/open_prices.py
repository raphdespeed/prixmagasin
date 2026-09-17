import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

OPEN_PRICES_PRODUCTS_URL = "https://prices.openfoodfacts.org/api/v1/products"
OPEN_PRICES_URL = "https://prices.openfoodfacts.org/api/v1/prices"
OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{ean}.json"

# Cache mémoire simple pour limiter les appels répétés
_CACHE_PRODUCT: Dict[str, Dict[str, Any]] = {}
_CACHE_PRICES: Dict[str, List[Dict[str, Any]]] = {}

async def search_openfoodfacts(query: str, page_size: int = 8) -> List[Dict[str, Any]]:
    """Recherche des produits par nom dans le catalogue Open Prices."""
    headers = {
        "User-Agent": "PrixMagasin-Web/1.0 (contact: support@prixmagasin.local)"
    }
    params = {
        "product_name__like": query,
        "size": page_size,
        "order_by": "-price_count"  # Produits avec le plus de relevés de prix en priorité
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(OPEN_PRICES_PRODUCTS_URL, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                results = []
                for p in items:
                    code = p.get("code")
                    name = p.get("product_name")
                    if not code or not name:
                        continue
                    
                    item = {
                        "ean": code,
                        "name": name,
                        "brand": p.get("brands") or "Marque",
                        "quantity": p.get("quantity") or f"{p.get('product_quantity', '')} {p.get('product_quantity_unit', '')}".strip(),
                        "image_url": p.get("image_url"),
                        "nutriscore": (p.get("nutriscore_grade") or "").lower() if p.get("nutriscore_grade") != "unknown" else None,
                        "ecoscore": (p.get("ecoscore_grade") or "").lower() if p.get("ecoscore_grade") != "unknown" else None,
                        "categories": [c.replace("en:", "").replace("fr:", "").capitalize() for c in p.get("categories_tags", [])][:4]
                    }
                    _CACHE_PRODUCT[code] = item
                    results.append(item)
                return results
    except Exception as e:
        logger.error(f"Erreur recherche Open Prices: {e}")
    return []

async def get_product_details(ean: str) -> Optional[Dict[str, Any]]:
    """Récupère les détails enrichis d'un produit par son code EAN."""
    if ean in _CACHE_PRODUCT and _CACHE_PRODUCT[ean].get("image_url"):
        return _CACHE_PRODUCT[ean]

    headers = {"User-Agent": "PrixMagasin-Web/1.0"}
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(OFF_PRODUCT_URL.format(ean=ean), headers=headers)
            if resp.status_code == 200:
                p = resp.json().get("product", {})
                if p:
                    item = {
                        "ean": ean,
                        "name": p.get("product_name_fr") or p.get("product_name") or "Produit",
                        "brand": p.get("brands") or "Marque",
                        "quantity": p.get("quantity", ""),
                        "image_url": p.get("image_front_small_url") or p.get("image_front_url") or p.get("image_url"),
                        "nutriscore": (p.get("nutriscore_grade") or "").lower(),
                        "ecoscore": (p.get("ecoscore_grade") or "").lower(),
                        "categories": [c.strip() for c in (p.get("categories") or "").split(",") if c.strip()][:4]
                    }
                    _CACHE_PRODUCT[ean] = item
                    return item
    except Exception as e:
        logger.error(f"Erreur détails produit {ean}: {e}")
    return _CACHE_PRODUCT.get(ean)

async def get_prices_for_ean(ean: str, size: int = 15) -> List[Dict[str, Any]]:
    """Récupère les prix constatés pour un EAN dans les supermarchés français."""
    if ean in _CACHE_PRICES:
        return _CACHE_PRICES[ean]

    headers = {"User-Agent": "PrixMagasin-Web/1.0"}
    params = {
        "product_code": ean,
        "size": size,
        "order_by": "-date",
    }
    prices_list = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(OPEN_PRICES_URL, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                for item in items:
                    loc = item.get("location") or {}
                    raw_name = loc.get("osm_name") or loc.get("osm_brand") or "Magasin"
                    
                    # Normalisation du nom de l'enseigne
                    retailer = "Autre"
                    for brand in ["Carrefour", "Auchan", "E.Leclerc", "Leclerc", "Intermarché", "Lidl", "Monoprix", "Casino", "Super U", "Système U", "Aldi"]:
                        if brand.lower() in raw_name.lower():
                            retailer = "E.Leclerc" if "leclerc" in brand.lower() else brand
                            break
                    
                    price_val = item.get("price")
                    if price_val is not None:
                        price_entry = {
                            "retailer": retailer,
                            "price": round(float(price_val), 2),
                            "unit_price": f"{item.get('price_per')} €/kg" if item.get("price_per") else None,
                            "store_name": loc.get("osm_name"),
                            "city": loc.get("osm_address_city") or "France",
                            "date": item.get("date"),
                            "is_live": False,
                            "is_promo": bool(item.get("price_is_discounted")),
                            "proof_url": f"https://prices.openfoodfacts.org/proof/{item.get('proof_id')}" if item.get("proof_id") else None,
                            "url": None
                        }
                        prices_list.append(price_entry)
        _CACHE_PRICES[ean] = prices_list
    except Exception as e:
        logger.error(f"Erreur prix Open Prices pour {ean}: {e}")

    return prices_list
