import React, { useState } from 'react';
import { BookOpen, Search, X, Tag } from 'lucide-react';
import { PricingCatalogItem } from '../types';

interface PriceCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: PricingCatalogItem[];
}

export const PriceCatalogModal: React.FC<PriceCatalogModalProps> = ({
  isOpen,
  onClose,
  catalog
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(catalog.map(i => i.category))).sort()];

  const filteredItems = catalog.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-stone-900 text-stone-100 p-5 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-emerald-800 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-50">Greenscape Pro Master Pricing Catalog</h3>
              <p className="text-xs text-stone-400">Phoenix Metro Trade Unit Costs & Sell Rates ({catalog.length} Active SKUs)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by SKU, item name, trade category..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 border-b border-stone-200 uppercase text-[10px] tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3 font-semibold">SKU</th>
                <th className="py-2.5 px-3 font-semibold">Item Name & Scope Description</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-2 font-semibold text-center">Unit</th>
                <th className="py-2.5 px-3 font-semibold text-right">Unit Cost</th>
                <th className="py-2.5 px-3 font-semibold text-right">Sell Price</th>
                <th className="py-2.5 px-3 font-semibold text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredItems.map((item, idx) => {
                const margin = ((item.unitSellPrice - item.unitCost) / item.unitSellPrice) * 100;
                return (
                  <tr key={idx} className="hover:bg-stone-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{item.sku}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-900">{item.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{item.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">{item.category}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-stone-700">{item.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600">${item.unitCost.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">${item.unitSellPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 text-xs text-stone-500 flex items-center justify-between shrink-0">
          <span>Showing {filteredItems.length} of {catalog.length} items</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded text-xs font-semibold"
          >
            Close Price Book
          </button>
        </div>
      </div>
    </div>
  );
};
