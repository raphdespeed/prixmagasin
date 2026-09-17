import React, { useState } from 'react';
import { Plus, Check, ExternalLink, Zap, ChevronDown, ChevronUp, MapPin, Tag, ZoomIn } from 'lucide-react';

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

export default function ProductCard({ product, onAddToBasket, onOpenModal, inBasketCount = 0 }) {
  const [showAllPrices, setShowAllPrices] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    onAddToBasket(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const visiblePrices = showAllPrices ? product.prices : product.prices.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      
      {/* Haut de carte: Image + Badges */}
      <div className="relative p-4 pb-0 flex items-start gap-4">
        
        {/* Photo du produit nette sur fond blanc garanti avec clic zoom */}
        <div 
          onClick={() => onOpenModal && onOpenModal(product)}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-slate-200/80 flex items-center justify-center p-2.5 shrink-0 overflow-hidden shadow-xs cursor-pointer group hover:border-emerald-400 transition"
          style={{ backgroundColor: '#ffffff' }}
          title="Cliquer pour agrandir le produit"
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain transition-transform group-hover:scale-108 duration-200"
              loading="lazy"
            />
          ) : (
            <span className="text-4xl">🛒</span>
          )}

          {/* Pastille Zoom au survol */}
          <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
            <span className="bg-white/90 text-slate-800 p-1.5 rounded-full shadow-md">
              <ZoomIn className="w-5 h-5 text-emerald-600" />
            </span>
          </div>
          
          {/* Badge Nutri-Score */}
          {product.nutriscore && NUTRISCORE_COLORS[product.nutriscore] && (
            <div className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider shadow-xs ${NUTRISCORE_COLORS[product.nutriscore]}`}>
              Nutri {product.nutriscore}
            </div>
          )}
        </div>


        {/* Informations produit */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
            <span>{product.brand || 'Marque'}</span>
            {product.quantity && (
              <>
                <span>•</span>
                <span>{product.quantity}</span>
              </>
            )}
          </div>
          
          <h3 
            onClick={() => onOpenModal && onOpenModal(product)}
            className="text-base font-bold text-slate-900 hover:text-emerald-700 leading-snug line-clamp-2 mt-0.5 cursor-pointer transition" 
            title="Cliquer pour voir en grand format"
          >
            {product.name}
          </h3>

          <p className="text-[11px] text-slate-400 font-mono mt-1">
            EAN: {product.ean}
          </p>

          {/* Pastille économie max si applicable */}
          {product.price_diff_amount && product.price_diff_amount > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span>Économisez jusqu'à</span>
              <strong className="font-extrabold">{product.price_diff_amount.toFixed(2)} €</strong>
              <span className="text-[10px] opacity-80">(-{product.price_diff_pct}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Bannière Meilleur Prix */}
      {product.best_price ? (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Moins cher chez :</div>
              <div className="text-xs font-bold text-slate-900">{product.best_retailer}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-emerald-700 tracking-tight">
              {product.best_price.toFixed(2)} €
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
          Prix en cours de relevé
        </div>
      )}

      {/* Liste des prix par enseigne */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Comparatif des enseignes ({product.prices.length}) :
          </div>

          {visiblePrices.map((pr, index) => {
            const isCheapest = pr.price === product.best_price;
            const diffFromBest = pr.price - (product.best_price || 0);

            return (
              <div
                key={`${pr.retailer}-${index}`}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                  isCheapest
                    ? 'bg-emerald-50/50 border-emerald-300/80 text-slate-900'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${RETAILER_COLORS[pr.retailer] || RETAILER_COLORS['Autre']}`}>
                    {pr.retailer}
                  </span>
                  
                  {pr.is_live && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded" title="Relevé en direct live sur le drive">
                      <Zap className="w-2.5 h-2.5 fill-blue-600" />
                      Live
                    </span>
                  )}

                  {pr.city && pr.city !== 'France' && (
                    <span className="text-[11px] text-slate-400 truncate flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {pr.city}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {pr.price.toFixed(2)} €
                  </span>
                  {!isCheapest && diffFromBest > 0 && (
                    <span className="text-[10px] text-red-500 font-semibold ml-1.5">
                      +{diffFromBest.toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Afficher plus de magasins si dispo */}
          {product.prices.length > 3 && (
            <button
              onClick={() => setShowAllPrices(!showAllPrices)}
              className="w-full py-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 cursor-pointer"
            >
              {showAllPrices ? (
                <>Réduire <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Voir les {product.prices.length - 3} autres enseignes <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>

        {/* Bouton d'ajout au panier */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={handleAdd}
            className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : inBasketCount > 0
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" />
                Ajouté au panier !
              </>
            ) : inBasketCount > 0 ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
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
  );
}
