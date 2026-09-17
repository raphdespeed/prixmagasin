import urllib.request
import json
import sys

# Forcer stdout en utf-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

url = 'http://127.0.0.1:8000/api/search?q=nutella&live=false'
print(f"Interrogation de {url}...")
with urllib.request.urlopen(url) as resp:
    data = json.loads(resp.read().decode())
    print(f"Total produits : {data.get('total')}")
    for p in data.get('products', [])[:2]:
        print(f"\n• Produit : {p['name']} ({p.get('brand')})")
        print(f"  [GAGNANT] Meilleur prix : {p.get('best_price')} € chez {p.get('best_retailer')}")
        if p.get('price_diff_amount'):
            print(f"  [ECONOMIE] Économie max : {p.get('price_diff_amount')} € (-{p.get('price_diff_pct')}%)")
        print("  Enseignes comparées :")
        for pr in p.get('prices', []):
            print(f"    - {pr['retailer']}: {pr['price']} € ({pr.get('city')})")
