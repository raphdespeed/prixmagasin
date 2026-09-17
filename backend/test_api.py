import asyncio
import sys
import os

# Ajouter le dossier backend au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.aggregator import aggregate_search

async def main():
    print("Test de la recherche multi-magasins pour 'nutella'...")
    res = await aggregate_search("nutella", enable_live_scraping=False)
    print(f"Total produits : {res.total}")
    for p in res.products[:3]:
        print(f"\nProduit: {p.name} ({p.brand}) [EAN: {p.ean}]")
        print(f"Meilleur prix: {p.best_price} € chez {p.best_retailer}")
        if p.price_diff_amount:
            print(f"Économie max: {p.price_diff_amount} € (-{p.price_diff_pct}%)")
        print("Prix constatés par enseigne :")
        for pr in p.prices:
            print(f"  • {pr.retailer}: {pr.price} € ({pr.city})")

if __name__ == "__main__":
    asyncio.run(main())
