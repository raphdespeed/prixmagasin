/**
 * Service de comparaison de prix 100% Client-Side
 * Compatible GitHub Pages (ne nécessite aucun serveur backend).
 * Interroge directement les APIs Open Prices et Open Food Facts depuis le navigateur.
 */

const OPEN_PRICES_PRODUCTS_URL = "https://prices.openfoodfacts.org/api/v1/products";
const OPEN_PRICES_ITEMS_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

const HEADERS = {
  "Accept": "application/json",
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
    "Colruyt"
  ];
  for (const b of brands) {
    if (rawName.toLowerCase().includes(b.toLowerCase())) {
      return b.toLowerCase().includes("leclerc") ? "E.Leclerc" : b;
    }
  }
  return "Autre";
}

function getHighResImage(url) {
  if (!url) return null;
  // Remplacer les miniatures 200px ou small par du 400px HD
  return url.replace(/\.200\./g, '.400.').replace(/\.small\./g, '.400.');
}

/**
 * Recherche des produits et leurs prix par enseigne
 * @param {string} query - Mot-clé (ex: "Nutella") ou code EAN (ex: "3017620422003")
 * @param {number} maxResults - Nombre de produits
 */
export async function searchProductsAndPrices(query, maxResults = 8) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return { products: [], cities: [], retailers: [] };

  const isEan = /^\d{8,14}$/.test(cleanQuery);
  let productsToCheck = [];

  if (isEan) {
    try {
      const offRes = await fetch(`${OFF_PRODUCT_URL}/${cleanQuery}.json`, { headers: HEADERS });
      if (offRes.ok) {
        const offData = await offRes.json();
        const p = offData.product || {};
        const rawImg = p.image_front_url || p.image_url || p.image_front_small_url || null;
        productsToCheck.push({
          ean: cleanQuery,
          name: p.product_name_fr || p.product_name || "Produit sans nom",
          brand: p.brands || "Marque inconnue",
          quantity: p.quantity || "",
          imageUrl: getHighResImage(rawImg),
          nutriscore: p.nutriscore_grade || null,
        });
      }
    } catch (e) {
      console.warn("Erreur OFF par EAN:", e);
    }
  } else {
    try {
      const url = `${OPEN_PRICES_PRODUCTS_URL}?product_name__like=${encodeURIComponent(cleanQuery)}&size=${maxResults}&order_by=-price_count`;
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          productsToCheck.push({
            ean: item.code,
            name: item.product_name,
            brand: item.brands || "Marque",
            quantity: item.quantity || `${item.product_quantity || ''} ${item.product_quantity_unit || ''}`.trim(),
            imageUrl: getHighResImage(item.image_url),
            nutriscore: item.nutriscore_grade && item.nutriscore_grade !== "unknown" ? item.nutriscore_grade : null,
          });
        }
      }
    } catch (e) {
      console.warn("Erreur recherche Open Prices:", e);
    }
  }


  // Si aucun produit trouvé dans Open Prices et qu'il y a un mot clé, tenter une recherche de secours
  if (productsToCheck.length === 0) {
    return { products: [], cities: [], retailers: [] };
  }

  const allCities = new Set();
  const allRetailers = new Set();
  const finalProducts = [];

  // Récupérer les prix en parallèle pour chaque produit
  const pricePromises = productsToCheck.map(async (prod) => {
    if (!prod.ean) return null;

    try {
      const pricesUrl = `${OPEN_PRICES_ITEMS_URL}?product_code=${prod.ean}&size=25&order_by=-date`;
      const pRes = await fetch(pricesUrl, { headers: HEADERS });
      if (!pRes.ok) return null;

      const pData = await pRes.json();
      const pricesByRetailer = {};

      for (const item of pData.items || []) {
        const loc = item.location || {};
        const rawName = loc.osm_name || loc.osm_brand || "Magasin";
        const retailer = normalizeRetailer(rawName);
        const priceVal = item.price;

        if (priceVal !== null && priceVal !== undefined) {
          const numPrice = Number(parseFloat(priceVal).toFixed(2));
          allRetailers.add(retailer);
          if (loc.osm_address_city) allCities.add(loc.osm_address_city);

          // Ne conserver que le prix le plus bas pour chaque enseigne
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

      const sortedPrices = Object.values(pricesByRetailer).sort((a, b) => a.price - b.price);
      const bestPrice = sortedPrices.length > 0 ? sortedPrices[0].price : null;
      const bestRetailer = sortedPrices.length > 0 ? sortedPrices[0].retailer : null;
      const highestPrice = sortedPrices.length > 1 ? sortedPrices[sortedPrices.length - 1].price : null;

      let priceDiffAmount = null;
      let priceDiffPct = null;
      if (bestPrice && highestPrice && highestPrice > bestPrice) {
        priceDiffAmount = Number((highestPrice - bestPrice).toFixed(2));
        priceDiffPct = Number((((highestPrice - bestPrice) / highestPrice) * 100).toFixed(1));
      }

      return {
        ean: prod.ean,
        name: prod.name,
        brand: prod.brand,
        quantity: prod.quantity,
        image_url: prod.imageUrl,
        nutriscore: prod.nutriscore,
        best_price: bestPrice,
        best_retailer: bestRetailer,
        highest_price: highestPrice,
        price_diff_amount: priceDiffAmount,
        price_diff_pct: priceDiffPct,
        prices: sortedPrices,
      };
    } catch (err) {
      console.warn(`Erreur récupération prix pour ${prod.ean}:`, err);
      return null;
    }
  });

  const results = await Promise.all(pricePromises);
  const filtered = results.filter(Boolean);

  // Trier pour mettre en premier les produits ayant des comparaisons de prix
  filtered.sort((a, b) => b.prices.length - a.prices.length);

  return {
    products: filtered,
    cities: Array.from(allCities).sort().slice(0, 20),
    retailers: Array.from(allRetailers).sort(),
  };
}
