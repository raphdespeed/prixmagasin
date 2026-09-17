import React, { useEffect } from 'react';
import { X, Plus, Check, MapPin, Calendar, Tag, ShieldCheck, TrendingDown, ExternalLink } from 'lucide-react';

const RETAILER_COLORS = {
  'Carrefour': 'bg-blue-50 text-blue-700 border-blue-200',
  'Auchan': 'bg-red-50 text-red-700 border-red-200',
  'E.Leclerc': 'bg-orange-50 text-orange-700 border-orange-200',
  'Intermarché': 'bg-rose-50 text-rose-700 border-rose-200',
  'Lidl': 'bg-amber-50 text-amber-800 border-amber-200',
  'Monoprix': 'bg-purple-50 text-purple-700 border-purple-200',
  'Super U': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Autre': 'bg-slate-50 text-slate-700 border-slate-200'
};

const NUTRISCORE_COLORS = {
  'a': 'bg-emerald-700 text-white',
  'b': 'bg-emerald-500 text-white',
  'c': 'bg-amber-400 text-slate-900',
  'd': 'bg-orange-500 text-white',
  'e': 'bg-red-600 text-white'
};

export default function ProductModal({ product, onClose, onAddToBasket, inBasketCount = 0 }) {
  if (!product) return null;

  // Fermer avec la touche Echap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      
      {/* Clic en dehors pour fermer */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Carte Modale Agrandie */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden z-10 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Bouton Fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer shadow-xs"
          title="Fermer (Échap)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Colonne Gauche : Grande Image HD du Produit */}
        <div 
          className="w-full md:w-1/2 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center p-4">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <span className="text-8xl">🛒</span>
            )}

            {/* Badge Nutri-Score */}
            {product.nutriscore && NUTRISCORE_COLORS[product.nutriscore] && (
              <div className={`absolute bottom-2 left-2 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-md ${NUTRISCORE_COLORS[product.nutriscore]}`}>
                Nutri-Score {product.nutriscore.toUpperCase()}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Format : {product.quantity || 'Standard'} • Code EAN : {product.ean}
          </p>
        </div>

        {/* Colonne Droite : Détails & Comparateur Complet */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
          
          <div>
            <div className="text-xs font-bold text-emerald-700 tracking-wide uppercase">
              {product.brand || 'Marque'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-1">
              {product.name}
            </h2>

            {/* Vainqueur Prix */}
            {product.best_price ? (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium opacity-90">Meilleur prix constaté chez :</div>
                  <div className="text-lg font-black">{product.best_retailer}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">{product.best_price.toFixed(2)} €</div>
                  {product.price_diff_amount && product.price_diff_amount > 0 && (
                    <div className="text-xs font-bold text-amber-200">
                      Économie : -{product.price_diff_amount.toFixed(2)} € (-{product.price_diff_pct}%)
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Liste complète des relevés de prix */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Prix par supermarché ({product.prices.length}) :
              </h3>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {product.prices.map((pr, index) => {
                  const isCheapest = pr.price === product.best_price;
                  const diff = pr.price - (product.best_price || 0);

                  return (
                    <div
                      key={index}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                        isCheapest
                          ? 'bg-emerald-50/80 border-emerald-300 font-semibold text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${RETAILER_COLORS[pr.retailer] || RETAILER_COLORS['Autre']}`}>
                            {pr.retailer}
                          </span>
                          <span className="font-bold text-slate-800">{pr.storeName || pr.retailer}</span>
                        </div>
                        {pr.city && (
                          <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {pr.city} {pr.date && `• ${pr.date}`}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900">
                          {pr.price.toFixed(2)} €
                        </div>
                        {!isCheapest && diff > 0 && (
                          <div className="text-[10px] text-red-500 font-semibold">
                            +{diff.toFixed(2)} €
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bouton d'action */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => onAddToBasket(product)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              {inBasketCount > 0 ? (
                <>
                  <Check className="w-4 h-4" />
                  Dans le panier ({inBasketCount}) - Ajouter encore
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter au panier comparatif
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
