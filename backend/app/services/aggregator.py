import asyncio
from typing import List, Dict, Any, Optional
from app.models import ProductItem, PriceItem, SearchResponse, BasketCompareResponse, RetailerBasketTotal
from app.services.open_prices import search_openfoodfacts, get_prices_for_ean, get_product_details
from app.services.carrefour_scraper import scrape_carrefour_live

async def aggregate_search(query: str, enable_live_scraping: bool = True, target_city: Optional[str] = None) -> SearchResponse:
    """Agrège les résultats de recherche en combinant Open Food Facts, Open Prices et le scraping en direct."""
    
    # 1. Lancer la recherche Open Food Facts et (optionnellement) le scraper Carrefour en parallèle
    tasks = [search_openfoodfacts(query, page_size=8)]
    if enable_live_scraping:
        tasks.append(scrape_carrefour_live(query))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    off_products = results[0] if isinstance(results[0], list) else []
    carrefour_live_items = results[1] if len(results) > 1 and isinstance(results[1], list) else []
    
    # Map des produits par EAN
    products_by_ean: Dict[str, Dict[str, Any]] = {}
    
    # Intégrer les produits Open Food Facts
    for p in off_products:
        ean = p["ean"]
        products_by_ean[ean] = {
            "ean": ean,
            "name": p["name"],
            "brand": p.get("brand"),
            "quantity": p.get("quantity"),
            "image_url": p.get("image_url"),
            "nutriscore": p.get("nutriscore"),
            "ecoscore": p.get("ecoscore"),
            "categories": p.get("categories", []),
            "prices": []
        }
        
    # Intégrer ou ajouter les produits trouvés en direct chez Carrefour
    for c_item in carrefour_live_items:
        ean = c_item["ean"]
        if ean not in products_by_ean:
            # Récupérer métadonnées OFF si possible
            off_meta = await get_product_details(ean)
            products_by_ean[ean] = {
                "ean": ean,
                "name": off_meta.get("name") if off_meta else c_item["title"],
                "brand": off_meta.get("brand") if off_meta else "Marque",
                "quantity": off_meta.get("quantity") if off_meta else "",
                "image_url": off_meta.get("image_url") if off_meta else c_item["image_url"],
                "nutriscore": off_meta.get("nutriscore") if off_meta else None,
                "ecoscore": off_meta.get("ecoscore") if off_meta else None,
                "categories": off_meta.get("categories", []) if off_meta else [],
                "prices": []
            }
        
        # Ajouter le prix en direct Carrefour
        products_by_ean[ean]["prices"].append(PriceItem(
            retailer="Carrefour",
            price=c_item["price"],
            unit_price=c_item.get("unit_price"),
            store_name=c_item.get("store_name", "Carrefour Drive"),
            city="France",
            date="Aujourd'hui (En direct)",
            is_live=True,
            is_promo=c_item.get("is_promo", False),
            url=c_item.get("url")
        ))
        
    # 2. Pour les produits principaux, récupérer les prix constatés dans les autres supermarchés (Open Prices)
    top_eans = list(products_by_ean.keys())[:6]
    prices_tasks = [get_prices_for_ean(ean) for ean in top_eans]
    all_prices = await asyncio.gather(*prices_tasks, return_exceptions=True)
    
    for idx, ean in enumerate(top_eans):
        p_prices = all_prices[idx]
        if isinstance(p_prices, list):
            existing_retailers = {pr.retailer.lower() for pr in products_by_ean[ean]["prices"] if pr.is_live}
            for pr in p_prices:
                # Si on a déjà un prix live pour cette enseigne, on le garde en priorité
                if pr["retailer"].lower() in existing_retailers:
                    continue
                # Filtre par ville optionnel
                if target_city and target_city.lower() not in (pr.get("city") or "").lower():
                    continue
                    
                products_by_ean[ean]["prices"].append(PriceItem(
                    retailer=pr["retailer"],
                    price=pr["price"],
                    unit_price=pr.get("unit_price"),
                    store_name=pr.get("store_name"),
                    city=pr.get("city"),
                    date=pr.get("date"),
                    is_live=False,
                    is_promo=pr.get("is_promo", False),
                    proof_url=pr.get("proof_url")
                ))

    # 3. Calculer les statistiques comparatives (meilleur prix, enseigne la moins chère, économies)
    final_products: List[ProductItem] = []
    all_cities = set()
    all_retailers = set()
    
    for ean, data in products_by_ean.items():
        # Dédupliquer par enseigne (garder le prix le plus récent ou le moins cher par enseigne)
        best_price_by_retailer: Dict[str, PriceItem] = {}
        for price_entry in data["prices"]:
            r = price_entry.retailer
            all_retailers.add(r)
            if price_entry.city:
                all_cities.add(price_entry.city)
                
            if r not in best_price_by_retailer:
                best_price_by_retailer[r] = price_entry
            else:
                # Si un prix est live, il gagne ; sinon on prend le plus récent
                if price_entry.is_live and not best_price_by_retailer[r].is_live:
                    best_price_by_retailer[r] = price_entry
                elif not best_price_by_retailer[r].is_live and (price_entry.price < best_price_by_retailer[r].price):
                    best_price_by_retailer[r] = price_entry

        dedup_prices = list(best_price_by_retailer.values())
        # Trier du moins cher au plus cher
        dedup_prices.sort(key=lambda x: x.price)
        
        best_price = dedup_prices[0].price if dedup_prices else None
        best_retailer = dedup_prices[0].retailer if dedup_prices else None
        highest_price = dedup_prices[-1].price if len(dedup_prices) > 1 else None
        
        diff_amount = None
        diff_pct = None
        if best_price and highest_price and highest_price > best_price:
            diff_amount = round(highest_price - best_price, 2)
            diff_pct = round(((highest_price - best_price) / highest_price) * 100, 1)
            
        final_products.append(ProductItem(
            ean=ean,
            name=data["name"],
            brand=data.get("brand"),
            quantity=data.get("quantity"),
            image_url=data.get("image_url"),
            nutriscore=data.get("nutriscore"),
            ecoscore=data.get("ecoscore"),
            categories=data.get("categories", []),
            prices=dedup_prices,
            best_price=best_price,
            best_retailer=best_retailer,
            highest_price=highest_price,
            price_diff_amount=diff_amount,
            price_diff_pct=diff_pct
        ))

    # Trier pour afficher d'abord les produits ayant des comparaisons de prix
    final_products.sort(key=lambda x: len(x.prices), reverse=True)
    
    return SearchResponse(
        query=query,
        total=len(final_products),
        products=final_products,
        cities_available=sorted(list(all_cities))[:15],
        retailers_available=sorted(list(all_retailers))
    )

async def compare_basket(items: List[Dict[str, Any]]) -> BasketCompareResponse:
    """Calcule le coût total d'un panier selon chaque supermarché."""
    # Récupérer les prix de chaque EAN
    retailer_totals: Dict[str, float] = {}
    retailer_found_counts: Dict[str, int] = {}
    
    for item in items:
        ean = item["ean"]
        qty = item.get("quantity", 1)
        prices = await get_prices_for_ean(ean)
        
        # Pour chaque enseigne, prendre le prix
        seen_retailers = set()
        for p in prices:
            r = p["retailer"]
            if r not in seen_retailers:
                seen_retailers.add(r)
                retailer_totals[r] = retailer_totals.get(r, 0.0) + (p["price"] * qty)
                retailer_found_counts[r] = retailer_found_counts.get(r, 0) + 1

    totals_list = []
    for r, total in retailer_totals.items():
        found = retailer_found_counts.get(r, 0)
        missing = len(items) - found
        totals_list.append(RetailerBasketTotal(
            retailer=r,
            total_price=round(total, 2),
            items_found=found,
            items_missing=missing,
            is_cheapest=False
        ))
        
    totals_list.sort(key=lambda x: x.total_price)
    
    cheapest = None
    max_savings = 0.0
    if totals_list:
        totals_list[0].is_cheapest = True
        cheapest = totals_list[0].retailer
        if len(totals_list) > 1:
            highest = totals_list[-1].total_price
            max_savings = round(highest - totals_list[0].total_price, 2)
            for t in totals_list:
                t.savings_vs_highest = round(highest - t.total_price, 2)
                
    return BasketCompareResponse(
        total_items=len(items),
        totals_by_retailer=totals_list,
        cheapest_retailer=cheapest,
        max_savings=max_savings
    )
