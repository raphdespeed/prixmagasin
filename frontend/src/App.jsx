import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Filter, Sparkles, AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import BasketDrawer from './components/BasketDrawer';
import ProductModal from './components/ProductModal';
import { searchProductsAndPrices } from './services/priceService';


const SUGGESTIONS = [
  "Nutella",
  "Barilla",
  "Coca-Cola",
  "Beurre Président",
  "Lait Lactel",
  "Café Carte Noire",
  "Cristaline",
  "Lu"
];

export default function App() {
  const [query, setQuery] = useState('Nutella');
  const [searchInput, setSearchInput] = useState('Nutella');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState('');
  
  const [products, setProducts] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableRetailers, setAvailableRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Panier stocké dans le localStorage
  const [basket, setBasket] = useState(() => {
    try {
      const saved = localStorage.getItem('prixmagasin_basket');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    localStorage.setItem('prixmagasin_basket', JSON.stringify(basket));
  }, [basket]);

  // Exécuter la recherche directement côté client
  const fetchProducts = async (keyword) => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await searchProductsAndPrices(keyword, 8);
      setProducts(data.products || []);
      setAvailableCities(data.cities || []);
      setAvailableRetailers(data.retailers || []);
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue lors de la récupération des prix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(query);
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQuery(searchInput.trim());
    }
  };

  const handleSelectSuggestion = (word) => {
    setSearchInput(word);
    setQuery(word);
  };

  // Gestion du panier
  const handleAddToBasket = (product) => {
    setBasket(prev => {
      const existing = prev.find(item => item.product.ean === product.ean);
      if (existing) {
        return prev.map(item =>
          item.product.ean === product.ean
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (ean, newQty) => {
    if (newQty <= 0) {
      handleRemoveFromBasket(ean);
      return;
    }
    setBasket(prev =>
      prev.map(item =>
        item.product.ean === ean ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveFromBasket = (ean) => {
    setBasket(prev => prev.filter(item => item.product.ean !== ean));
  };

  const totalBasketCount = basket.reduce((acc, it) => acc + it.quantity, 0);

  // Filtrage local par enseigne ou ville
  const filteredProducts = products.filter(p => {
    const matchRetailer = !selectedRetailer || p.prices.some(pr => pr.retailer.toLowerCase() === selectedRetailer.toLowerCase());
    const matchCity = !selectedCity || p.prices.some(pr => (pr.city || '').toLowerCase().includes(selectedCity.toLowerCase()));
    return matchRetailer && matchCity;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        basketCount={totalBasketCount}
        onOpenBasket={() => setIsBasketOpen(true)}
      />

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-white via-white to-slate-50/50 border-b border-slate-200/70 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Comparateur multi-supermarchés (GitHub Pages)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Trouvez le supermarché <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              le moins cher pour vos courses
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Comparez instantanément les prix entre <strong>Carrefour</strong>, <strong>Auchan</strong>, <strong>E.Leclerc</strong>, <strong>Intermarché</strong> et <strong>Lidl</strong>.
          </p>

          {/* Formulaire de Recherche */}
          <form onSubmit={handleSearchSubmit} className="mt-6 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl border-2 border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 shadow-lg shadow-slate-200/50 transition-all p-1.5">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un produit, une marque, un code-barres (ex: Nutella, Barilla...)"
                className="w-full px-3 py-2 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition active:scale-98 shrink-0 flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Comparer'
                )}
              </button>
            </div>
          </form>

          {/* Suggestions rapides */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1">Recherches populaires :</span>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSelectSuggestion(s)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Filtres Enseigne et Ville */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs">
            
            {/* Filtre Enseigne */}
            {availableRetailers.length > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedRetailer}
                  onChange={(e) => setSelectedRetailer(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="">Toutes les enseignes</option>
                  {availableRetailers.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre Ville */}
            {availableCities.length > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="">Toutes les villes</option>
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* Main Content : Liste des Résultats */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Bandeau d'état des résultats */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Résultats pour "{query}"
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                {filteredProducts.length} produits
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Données en direct des supermarchés français
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-slate-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/4 mt-2"></div>
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-slate-100 rounded-lg"></div>
                  <div className="h-8 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grille de Produits */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const inBasketItem = basket.find(it => it.product.ean === product.ean);
              return (
                <ProductCard
                  key={product.ean}
                  product={product}
                  onAddToBasket={handleAddToBasket}
                  onOpenModal={setSelectedProduct}
                  inBasketCount={inBasketItem ? inBasketItem.quantity : 0}
                />
              );
            })}
          </div>
        )}

        {/* Aucun résultat */}
        {!loading && filteredProducts.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <span className="text-5xl">🔍</span>
            <h3 className="text-lg font-bold text-slate-800 mt-3">
              Aucun produit trouvé pour "{query}"
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Essayez une autre recherche (ex: Nutella, Barilla, Coca-Cola, Lait, Beurre...).
            </p>
          </div>
        )}

      </main>

      {/* Drawer Panier Comparatif */}
      <BasketDrawer
        isOpen={isBasketOpen}
        onClose={() => setIsBasketOpen(false)}
        basketItems={basket}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromBasket}
      />

      {/* Modal Agrandissement Produit */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToBasket={handleAddToBasket}
        inBasketCount={
          selectedProduct
            ? (basket.find(it => it.product.ean === selectedProduct.ean)?.quantity || 0)
            : 0
        }
      />


      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 mt-12">
        <p className="font-semibold text-slate-700">
          PrixMagasin France • Hébergé sur GitHub Pages
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Données ouvertes issues de l'API Open Prices & Open Food Facts.
        </p>
      </footer>
    </div>
  );
}
