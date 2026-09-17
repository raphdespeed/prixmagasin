import re
import asyncio
import logging
from typing import List, Dict, Any, Optional
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

# Cache mémoire pour les résultats Carrefour en direct
_CARREFOUR_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def _sync_scrape_carrefour(keyword: str, max_items: int = 6) -> List[Dict[str, Any]]:
    """Scraper synchrone Playwright pour Carrefour avec contournement anti-bot."""
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage"
                ]
            )
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                viewport={"width": 1366, "height": 768},
                locale="fr-FR",
            )
            page = context.new_page()

            search_url = f"https://www.carrefour.fr/s?q={keyword}"
            page.goto(search_url, timeout=25000, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)

            # Fermer bandeau cookies si présent
            try:
                cookie_btn = page.locator("#onetrust-accept-btn-handler")
                if cookie_btn.count() > 0:
                    cookie_btn.click(timeout=2000)
            except Exception:
                pass

            articles = page.locator("article").all()
            for art in articles[:max_items]:
                text = art.inner_text()
                lines = [l.strip() for l in text.splitlines() if l.strip()]

                # Lien et code EAN
                link = art.locator("a[href*='/p/']").first
                href = link.get_attribute("href") if link.count() > 0 else ""
                ean_match = re.search(r'-([0-9]{8,14})$', href)
                ean = ean_match.group(1) if ean_match else None

                # Titre propre
                title_elem = art.locator("h2, h3, [class*='title'], [class*='name']").first
                if title_elem.count() > 0 and title_elem.inner_text().strip():
                    title = title_elem.inner_text().strip()
                elif href:
                    title = href.split('/')[-1].rsplit('-', 1)[0].replace('-', ' ').capitalize()
                else:
                    title = lines[0] if lines else "Produit Carrefour"

                # Image
                img = art.locator("img").first
                img_url = img.get_attribute("src") if img.count() > 0 else None

                # Prix
                price_match = re.search(r'(\d+)\s*,\s*(\d{2})\s*€', text)
                price = float(f"{price_match.group(1)}.{price_match.group(2)}") if price_match else None

                # Prix au kilo / litre
                unit_match = re.search(r'(\d+[,\.]\d{2}\s*€\s*/\s*(?:KG|L|LITRE))', text, re.IGNORECASE)
                unit_price = unit_match.group(1) if unit_match else None

                # Promo
                is_promo = any("promo" in l.lower() or "%" in l or "remise" in l.lower() or "payez" in l.lower() for l in lines)

                if ean and price:
                    results.append({
                        "retailer": "Carrefour",
                        "ean": ean,
                        "title": title,
                        "price": price,
                        "unit_price": unit_price,
                        "image_url": img_url,
                        "is_live": True,
                        "is_promo": is_promo,
                        "store_name": "Carrefour Drive",
                        "city": "National",
                        "url": f"https://www.carrefour.fr{href}" if href else None
                    })

            browser.close()
    except Exception as e:
        logger.error(f"Erreur lors du scraping Carrefour pour '{keyword}': {e}")

    return results

async def scrape_carrefour_live(keyword: str) -> List[Dict[str, Any]]:
    """Exécute le scraper Carrefour de manière asynchrone non-bloquante avec cache."""
    clean_key = keyword.strip().lower()
    if clean_key in _CARREFOUR_CACHE:
        return _CARREFOUR_CACHE[clean_key]

    results = await asyncio.to_thread(_sync_scrape_carrefour, clean_key)
    if results:
        _CARREFOUR_CACHE[clean_key] = results
    return results
