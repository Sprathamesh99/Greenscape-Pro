import React, { useState, useMemo } from 'react';
import { Search, X, Check, BookOpen } from 'lucide-react';
import { PricingCatalogItem } from '../types';

interface CatalogSearchPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: PricingCatalogItem) => void;
  catalog: PricingCatalogItem[];
  currentItemName?: string;
}

export const CatalogSearchPicker: React.FC<CatalogSearchPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  catalog,
  currentItemName
}) => {
  const [searchTerm, setSearchTerm] = useState(currentItemName || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(catalog.map(i => i.category))).sort()];
  }, [catalog]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return catalog.filter(item => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [catalog, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 text-stone-100 p-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-emerald-800 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 id="catalog-picker-title" className="text-sm font-bold text-stone-50">
                Match from Authoritative Price Book
              </h3>
              <p className="text-[11px] text-stone-400">
                Select a standard Phoenix trade SKU ({catalog.length} items available)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close catalog picker"
            className="text-stone-400 hover:text-stone-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by SKU or keywords (e.g. Belgard, Travertine, Fire Pit, Turf, Palo Verde)..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No matching catalog items found for &ldquo;{searchTerm}&rdquo;.
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="p-3 hover:bg-emerald-50/50 rounded-lg cursor-pointer transition flex items-start justify-between group gap-3 border border-transparent hover:border-emerald-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 group-hover:bg-emerald-100 text-stone-800 group-hover:text-emerald-900">
                      {item.sku}
                    </span>
                    <span className="text-[10px] text-stone-400">•</span>
                    <span className="text-[11px] font-medium text-stone-500">{item.category}</span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 mt-1 group-hover:text-emerald-900 truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">{item.description}</p>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end justify-center">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      ${item.unitSellPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">/{item.unit}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Cost: ${item.unitCost.toFixed(2)}
                  </span>
                  <button className="mt-1.5 px-2 py-0.5 rounded bg-stone-100 group-hover:bg-emerald-700 text-stone-700 group-hover:text-white text-[10px] font-bold flex items-center space-x-1 transition">
                    <Check className="w-3 h-3" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
