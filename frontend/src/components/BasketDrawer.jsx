import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, TrendingDown } from 'lucide-react';

export default function BasketDrawer({ isOpen, onClose, basketItems, onUpdateQuantity, onRemoveItem }) {
  if (!isOpen) return null;

  // Calcul du comparatif de panier en direct
  // Pour chaque enseigne, additionner le prix des articles présents
  const retailerTotals = {};
  const retailerItemCounts = {};

  basketItems.forEach(({ product, quantity }) => {
    // Regrouper les prix par enseigne pour ce produit
    const pricesByRetailer = {};
    product.prices.forEach(pr => {
      if (!pricesByRetailer[pr.retailer] || pr.price < pricesByRetailer[pr.retailer]) {
        pricesByRetailer[pr.retailer] = pr.price;
      }
    });

    Object.entries(pricesByRetailer).forEach(([retailer, price]) => {
      retailerTotals[retailer] = (retailerTotals[retailer] || 0) + (price * quantity);
      retailerItemCounts[retailer] = (retailerItemCounts[retailer] || 0) + 1;
    });
  });

  const totalsArray = Object.entries(retailerTotals)
    .map(([retailer, total]) => ({
      retailer,
      total: Math.round(total * 100) / 100,
      foundCount: retailerItemCounts[retailer] || 0
    }))
    .sort((a, b) => a.total - b.total);

  const cheapest = totalsArray.length > 0 ? totalsArray[0] : null;
  const mostExpensive = totalsArray.length > 1 ? totalsArray[totalsArray.length - 1] : null;
  const maxSavings = cheapest && mostExpensive ? Math.round((mostExpensive.total - cheapest.total) * 100) / 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fond sombre */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Mon Panier Comparatif</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corps : Liste des produits */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {basketItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-5xl mb-3">🛒</span>
                <p className="font-semibold text-slate-700">Votre panier est vide</p>
                <p className="text-xs text-slate-400 mt-1">
                  Ajoutez des produits pour comparer instantanément quel supermarché sera le moins cher pour vos courses.
                </p>
              </div>
            ) : (
              basketItems.map(({ product, quantity }) => (
                <div 
                  key={product.ean}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={product.image_url || "https://images.openfoodfacts.org/images/icons/dist/packaging.svg"} 
                      alt={product.name}
                      className="w-14 h-14 object-contain rounded-xl p-1 border border-slate-200 shrink-0 shadow-2xs"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                    <div className="min-w-0">

                      <h4 className="text-xs font-bold text-slate-800 truncate" title={product.name}>
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {product.best_price ? `Dès ${product.best_price.toFixed(2)} €` : 'Prix variable'}
                      </p>
                    </div>
                  </div>

                  {/* Contrôles de quantité */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                      <button 
                        onClick={() => onUpdateQuantity(product.ean, quantity - 1)}
                        className="px-2 py-1 hover:bg-slate-100 text-slate-600 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-800">
                        {quantity}
                      </span>
                      <button 
                        onClick={() => onUpdateQuantity(product.ean, quantity + 1)}
                        className="px-2 py-1 hover:bg-slate-100 text-slate-600 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button 
                      onClick={() => onRemoveItem(product.ean)}
                      className="text-slate-400 hover:text-red-600 p-1 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer : Comparatif des Enseignes pour le Panier Global */}
          {basketItems.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
              
              {/* Vainqueur Panier */}
              {cheapest && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥇</span>
                      <div>
                        <div className="text-xs opacity-90 font-medium">Magasin le moins cher :</div>
                        <div className="text-base font-black">{cheapest.retailer}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black">{cheapest.total.toFixed(2)} €</div>
                      <div className="text-[10px] opacity-90 font-medium">pour votre panier</div>
                    </div>
                  </div>

                  {maxSavings > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20 text-xs flex items-center justify-between">
                      <span>Économie estimée :</span>
                      <strong className="font-extrabold text-amber-200">
                        Jusqu'à {maxSavings.toFixed(2)} € d'économie !
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Classement des autres magasins */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Total de vos courses par enseigne :
                </h4>

                {totalsArray.map((t, idx) => {
                  const isFirst = idx === 0;
                  const diff = t.total - (cheapest ? cheapest.total : 0);

                  return (
                    <div 
                      key={t.retailer}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                        isFirst
                          ? 'bg-emerald-100/50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">#{idx + 1}</span>
                        <span className="font-bold">{t.retailer}</span>
                        {t.foundCount < basketItems.length && (
                          <span className="text-[10px] text-amber-600 font-normal">
                            ({t.foundCount}/{basketItems.length} articles)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">
                          {t.total.toFixed(2)} €
                        </span>
                        {!isFirst && diff > 0 && (
                          <span className="text-[11px] text-red-500 font-semibold">
                            +{diff.toFixed(2)} €
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
