import React from 'react';
import { ShoppingCart, Store, Zap, TrendingDown } from 'lucide-react';

export default function Navbar({ basketCount, onOpenBasket, totalSavings }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <TrendingDown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                Prix<span className="text-emerald-600">Magasin</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold ml-1">
                  France
                </span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block -mt-0.5">
                Comparateur de prix Drive & Supermarchés
              </p>
            </div>
          </div>

          {/* Badges Enseignes */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Carrefour
            </span>
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              Auchan
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-600"></span>
              E.Leclerc
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              Intermarché
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Lidl
            </span>
          </div>

          {/* Bouton Panier Comparatif */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenBasket}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-98 transition font-medium text-sm shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Panier comparatif</span>
              {basketCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-emerald-500 text-white rounded-full">
                  {basketCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
