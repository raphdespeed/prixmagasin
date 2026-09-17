"""
Module autonome d'extraction et comparaison de prix multi-supermarchés en France.
(Auchan, Carrefour, E.Leclerc, Intermarché, Lidl, Monoprix...)

Usage en ligne de commande :
    python fetch_prices.py "Nutella"
    python fetch_prices.py "3017620422003"

Usage en import Python dans une autre application :
    from fetch_prices import get_product_prices
    
    resultats = get_product_prices("Nutella")
    print(resultats)
"""

import urllib.request
import urllib.parse
import json
import re
import sys

# Compatibilité console Windows (UTF-8)
if sys.stdout and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


OPEN_PRICES_SEARCH_URL = "https://prices.openfoodfacts.org/api/v1/products"
OPEN_PRICES_ITEMS_URL = "https://prices.openfoodfacts.org/api/v1/prices"
OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{ean}.json"

HEADERS = {
    "User-Agent": "PrixMagasin-Client/1.0 (contact: support@prixmagasin.local)"
}

def _http_get_json(url: str, params: dict = None) -> dict:
    """Effectue une requête GET HTTP et renvoie le JSON parsé."""
    full_url = url
    if params:
        full_url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {}

def get_product_prices(query_or_ean: str, max_results: int = 5) -> list:
    """
    Recherche un produit par mot-clé (ex: 'Nutella') ou code EAN (ex: '3017620422003')
    et renvoie la liste des produits avec leurs prix comparés par enseigne.
    """
    query = query_or_ean.strip()
    is_ean = query.isdigit() and len(query) in (8, 12, 13, 14)

    products_to_check = []

    if is_ean:
        # Recherche directe par code-barres
        off_data = _http_get_json(OFF_PRODUCT_URL.format(ean=query))
        prod = off_data.get("product", {})
        products_to_check.append({
            "ean": query,
            "name": prod.get("product_name_fr") or prod.get("product_name") or "Produit",
            "brand": prod.get("brands", "Marque inconnue"),
            "image_url": prod.get("image_front_small_url") or prod.get("image_url"),
            "nutriscore": prod.get("nutriscore_grade")
        })
    else:
        # Recherche textuelle dans le catalogue de produits
        res = _http_get_json(OPEN_PRICES_SEARCH_URL, {
            "product_name__like": query,
            "size": max_results,
            "order_by": "-price_count"
        })
        for item in res.get("items", []):
            products_to_check.append({
                "ean": item.get("code"),
                "name": item.get("product_name"),
                "brand": item.get("brands", "Marque inconnue"),
                "image_url": item.get("image_url"),
                "nutriscore": item.get("nutriscore_grade")
            })

    # Pour chaque produit, récupérer les prix relevés dans les supermarchés
    final_results = []
    for prod in products_to_check:
        ean = prod["ean"]
        if not ean:
            continue

        prices_data = _http_get_json(OPEN_PRICES_ITEMS_URL, {
            "product_code": ean,
            "size": 20,
            "order_by": "-date"
        })

        prices_by_retailer = {}
        for p in prices_data.get("items", []):
            loc = p.get("location") or {}
            raw_name = loc.get("osm_name") or loc.get("osm_brand") or "Autre"

            # Normaliser le nom de l'enseigne
            retailer = "Autre"
            for brand in ["Carrefour", "Auchan", "E.Leclerc", "Leclerc", "Intermarché", "Lidl", "Monoprix", "Super U", "Casino", "Aldi"]:
                if brand.lower() in raw_name.lower():
                    retailer = "E.Leclerc" if "leclerc" in brand.lower() else brand
                    break

            price = p.get("price")
            if price is not None:
                price_val = round(float(price), 2)
                # Garder le prix le plus bas ou le plus récent pour cette enseigne
                if retailer not in prices_by_retailer or price_val < prices_by_retailer[retailer]["price"]:
                    prices_by_retailer[retailer] = {
                        "retailer": retailer,
                        "price": price_val,
                        "store_name": loc.get("osm_name"),
                        "city": loc.get("osm_address_city") or "France",
                        "date": p.get("date"),
                        "is_discounted": bool(p.get("price_is_discounted"))
                    }

        sorted_prices = sorted(list(prices_by_retailer.values()), key=lambda x: x["price"])
        best_price = sorted_prices[0]["price"] if sorted_prices else None
        best_retailer = sorted_prices[0]["retailer"] if sorted_prices else None

        final_results.append({
            "ean": ean,
            "name": prod["name"],
            "brand": prod["brand"],
            "image_url": prod["image_url"],
            "nutriscore": prod["nutriscore"],
            "best_price": best_price,
            "best_retailer": best_retailer,
            "prices": sorted_prices
        })

    return final_results

if __name__ == "__main__":
    # Test CLI
    search_term = sys.argv[1] if len(sys.argv) > 1 else "Nutella"
    print(f"--- Recherche des prix pour : '{search_term}' ---")
    data = get_product_prices(search_term, max_results=3)

    for item in data:
        print(f"\n📦 {item['name']} ({item['brand']}) [EAN: {item['ean']}]")
        print(f"   🏆 Moins cher chez : {item['best_retailer']} à {item['best_price']} €")
        print("   Prix constatés par supermarché :")
        for pr in item["prices"]:
            print(f"     • {pr['retailer']}: {pr['price']} € ({pr['city']} - {pr['date']})")
