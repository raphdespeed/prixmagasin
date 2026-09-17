/**
 * Service de comparaison de prix 100% Client-Side
 * Avec moteur de tolérance aux fautes d'orthographe (Fuzzy Search & Levenshtein)
 */

const OPEN_PRICES_PRODUCTS_URL = "https://prices.openfoodfacts.org/api/v1/products";
const OPEN_PRICES_ITEMS_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

const HEADERS = {
  "Accept": "application/json",
};

/**
 * Dictionnaire de termes et marques pour la correction automatique des fautes
 */
const COMMON_DICTIONARY = [
  // Enseignes
  "carrefour", "auchan", "leclerc", "intermarché", "lidl", "monoprix", "casino", "aldi", "colruyt", "super u",
  // Marques populaires
  "harrys", "barilla", "nutella", "danone", "pasquier", "président", "lactel", "nestlé", "lu", 
  "bonduelle", "cristaline", "ferrero", "kinder", "evian", "heineken", "panzani", "chabrior", 
  "fleury michon", "jacquet", "volvic", "perrier", "lipton", "san pellegrino", "carte noire",
  "coca-cola", "pepsi", "oasis", "tropicana", "lays", "pringles", "st michel", "bonne maman",
  "kiri", "vache qui rit", "babybel", "boursin", "caprice des dieux",
  // Produits courants
  "pain", "chocolat", "beurre", "lait", "pâtes", "fromage", "café", "yaourt", "jambon", "crème",
  "biscuit", "eau", "confiture", "huile", "farine", "sucre", "riz", "oeufs", "sauce", "complet",
  "croissant", "brioche", "céréales", "gateau", "jus", "biere", "vin", "saucisson", "poulet",
  "thon", "saumon", "tomate", "pomme", "salade", "chips"
];

/**
 * Calcul de la distance de Levenshtein (nombre de fautes de frappe)
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // suppression
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Corrige les fautes de frappe dans la requête
 */
export function correctQuery(input) {
  if (!input) return { query: input, isCorrected: false };
  const words = input.toLowerCase().trim().split(/\s+/);
  let isCorrected = false;

  const correctedWords = words.map(w => {
    // Normaliser en retirant les accents pour comparer
    const normalizedW = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedW.length <= 2) return w;

    let bestMatch = w;
    let minDistance = 99;

    for (const dictWord of COMMON_DICTIONARY) {
      const normalizedDict = dictWord.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const d = levenshtein(normalizedW, normalizedDict);
      const maxTol = normalizedW.length <= 4 ? 1 : 2; // 1 faute si mot court, 2 si long

      if (d <= maxTol && d < minDistance) {
        minDistance = d;
        bestMatch = dictWord;
      }
    }

    if (bestMatch !== w) {
      isCorrected = true;
    }
    return bestMatch;
  });

  return {
    query: correctedWords.join(" "),
    isCorrected: isCorrected && correctedWords.join(" ") !== input.toLowerCase().trim()
  };
}

/**
 * Normalise le nom de l'enseigne
 */
function normalizeRetailer(rawName) {
  if (!rawName) return "Autre";
  const brands = [
    "Carrefour", "Auchan", "E.Leclerc", "Leclerc", "Intermarché", "Lidl", 
    "Monoprix", "Super U", "Système U", "Casino", "Aldi", "Colruyt"
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
  return url.replace(/\.200\./g, '.400.').replace(/\.small\./g, '.400.');
}

/**
 * Recherche des produits et leurs prix par enseigne avec tolérance aux fautes
 */
export async function searchProductsAndPrices(query, maxResults = 24) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return { products: [], cities: [], retailers: [], correctedQuery: null };

  const isEan = /^\d{8,14}$/.test(cleanQuery);
  const seenEans = new Set();
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
    return buildFinalResult(productsToCheck, null);
  }

  // Vérifier s'il y a une faute de frappe corrigée
  const correction = correctQuery(cleanQuery);
  const searchTerms = [cleanQuery];
  if (correction.isCorrected && !searchTerms.includes(correction.query)) {
    searchTerms.push(correction.query);
  }

  // Rechercher pour les termes (terme original + terme corrigé si applicable)
  for (const term of searchTerms) {
    if (productsToCheck.length >= maxResults) break;

    try {
      // 1. Recherche par nom de produit
      const url = `${OPEN_PRICES_PRODUCTS_URL}?product_name__like=${encodeURIComponent(term)}&size=${maxResults}&order_by=-price_count`;
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          if (item.code && !seenEans.has(item.code)) {
            seenEans.add(item.code);
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
      }

      // 2. Recherche par marque
      if (term.length >= 3) {
        const brandUrl = `${OPEN_PRICES_PRODUCTS_URL}?brands__like=${encodeURIComponent(term)}&size=${maxResults}&order_by=-price_count`;
        const bRes = await fetch(brandUrl, { headers: HEADERS });
        if (bRes.ok) {
          const bData = await bRes.json();
          for (const item of bData.items || []) {
            if (item.code && !seenEans.has(item.code)) {
              seenEans.add(item.code);
              productsToCheck.push({
                ean: item.code,
                name: item.product_name,
                brand: item.brands || term,
                quantity: item.quantity || `${item.product_quantity || ''} ${item.product_quantity_unit || ''}`.trim(),
                imageUrl: getHighResImage(item.image_url),
                nutriscore: item.nutriscore_grade && item.nutriscore_grade !== "unknown" ? item.nutriscore_grade : null,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Erreur recherche Open Prices:", e);
    }
  }

  return await buildFinalResult(productsToCheck, correction.isCorrected ? correction.query : null);
}

/**
 * Construit la liste finale avec les prix associés
 */
async function buildFinalResult(productsToCheck, correctedQuery) {
  if (productsToCheck.length === 0) {
    return { products: [], cities: [], retailers: [], correctedQuery };
  }

  const allCities = new Set();
  const allRetailers = new Set();

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
      console.warn(`Erreur prix ${prod.ean}:`, err);
      return null;
    }
  });

  const results = await Promise.all(pricePromises);
  const filtered = results.filter(Boolean);
  filtered.sort((a, b) => b.prices.length - a.prices.length);

  return {
    products: filtered,
    cities: Array.from(allCities).sort().slice(0, 20),
    retailers: Array.from(allRetailers).sort(),
    correctedQuery: correctedQuery
  };
}
