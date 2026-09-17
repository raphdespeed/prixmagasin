/**
 * Module d'extraction de prix pour Expo / React Native (iOS & Android)
 * Fonctionne à 100% dans Expo Go sans backend et sans dépendance externe.
 *
 * Utilise l'API native fetch() pour récupérer les prix de :
 * Carrefour, Auchan, E.Leclerc, Intermarché, Lidl, Monoprix, etc.
 */

const OPEN_PRICES_PRODUCTS_URL = "https://prices.openfoodfacts.org/api/v1/products";
const OPEN_PRICES_ITEMS_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

const HEADERS = {
  "User-Agent": "PrixMagasin-ExpoApp/1.0 (contact: mobile@prixmagasin.local)",
};

/**
 * Normalise le nom de l'enseigne
 */
function normalizeRetailer(rawName) {
  if (!rawName) return "Autre";
  const brands = [
    "Carrefour",
    "Auchan",
    "E.Leclerc",
    "Leclerc",
    "Intermarché",
    "Lidl",
    "Monoprix",
    "Super U",
    "Système U",
    "Casino",
    "Aldi",
  ];
  for (const b of brands) {
    if (rawName.toLowerCase().includes(b.toLowerCase())) {
      return b.toLowerCase().includes("leclerc") ? "E.Leclerc" : b;
    }
  }
  return "Autre";
}

/**
 * Récupère les prix et détails d'un produit.
 * @param {string} queryOrEan - Soit un mot-clé (ex: "Nutella"), soit un code-barres (ex: "3017620422003")
 * @param {number} maxResults - Nombre max de produits à renvoyer (défaut: 5)
 * @returns {Promise<Array>} Liste des produits avec leurs prix par supermarché
 */
export async function getProductPrices(queryOrEan, maxResults = 5) {
  try {
    const query = (queryOrEan || "").trim();
    if (!query) return [];

    const isEan = /^\d{8,14}$/.test(query);
    const productsToCheck = [];

    if (isEan) {
      // 1. Recherche directe par code-barres (idéal avec le scanner Expo Camera)
      const offRes = await fetch(`${OFF_PRODUCT_URL}/${query}.json`, { headers: HEADERS });
      const offData = await offRes.json();
      const p = offData.product || {};
      productsToCheck.push({
        ean: query,
        name: p.product_name_fr || p.product_name || "Produit inconnu",
        brand: p.brands || "Marque inconnue",
        imageUrl: p.image_front_small_url || p.image_url || null,
        nutriscore: p.nutriscore_grade || null,
      });
    } else {
      // 2. Recherche par nom dans le catalogue de prix
      const url = `${OPEN_PRICES_PRODUCTS_URL}?product_name__like=${encodeURIComponent(query)}&size=${maxResults}&order_by=-price_count`;
      const res = await fetch(url, { headers: HEADERS });
      const data = await res.json();
      for (const item of data.items || []) {
        productsToCheck.push({
          ean: item.code,
          name: item.product_name,
          brand: item.brands || "Marque",
          imageUrl: item.image_url || null,
          nutriscore: item.nutriscore_grade && item.nutriscore_grade !== "unknown" ? item.nutriscore_grade : null,
        });
      }
    }

    // 3. Pour chaque produit, récupérer les prix réels constatés par supermarché
    const finalResults = [];

    for (const prod of productsToCheck) {
      if (!prod.ean) continue;

      const pricesUrl = `${OPEN_PRICES_ITEMS_URL}?product_code=${prod.ean}&size=25&order_by=-date`;
      const pRes = await fetch(pricesUrl, { headers: HEADERS });
      const pData = await pRes.json();

      const pricesByRetailer = {};
      for (const item of pData.items || []) {
        const loc = item.location || {};
        const rawName = loc.osm_name || loc.osm_brand || "Magasin";
        const retailer = normalizeRetailer(rawName);
        const priceVal = item.price;

        if (priceVal !== null && priceVal !== undefined) {
          const numPrice = Number(parseFloat(priceVal).toFixed(2));
          // Garder le prix le plus bas pour chaque enseigne
          if (!pricesByRetailer[retailer] || numPrice < pricesByRetailer[retailer].price) {
            pricesByRetailer[retailer] = {
              retailer: retailer,
              price: numPrice,
              storeName: loc.osm_name || retailer,
              city: loc.osm_address_city || "France",
              date: item.date || null,
              isDiscounted: Boolean(item.price_is_discounted),
            };
          }
        }
      }

      // Trier du moins cher au plus cher
      const sortedPrices = Object.values(pricesByRetailer).sort((a, b) => a.price - b.price);
      const bestPrice = sortedPrices.length > 0 ? sortedPrices[0].price : null;
      const bestRetailer = sortedPrices.length > 0 ? sortedPrices[0].retailer : null;

      finalResults.push({
        ean: prod.ean,
        name: prod.name,
        brand: prod.brand,
        imageUrl: prod.imageUrl,
        nutriscore: prod.nutriscore,
        bestPrice: bestPrice,
        bestRetailer: bestRetailer,
        prices: sortedPrices,
      });
    }

    return finalResults;
  } catch (error) {
    console.error("Erreur getProductPrices:", error);
    return [];
  }
}
