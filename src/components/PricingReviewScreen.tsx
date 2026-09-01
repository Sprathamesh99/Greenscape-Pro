import React, { useState } from 'react';
import {
  HydratedProposal,
  ProposalItem,
  PricingCatalogItem,
  ScreenMode
} from '../types';
import {
  DollarSign,
  Search,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Edit3,
  ArrowRight,
  ShieldCheck,
  Tag,
  Check,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { CatalogSearchPicker } from './CatalogSearchPicker';

interface PricingReviewScreenProps {
  proposal: HydratedProposal;
  catalog: PricingCatalogItem[];
  onUpdateProposal: (updated: HydratedProposal) => Promise<void>;
  onNavigate: (screen: ScreenMode) => void;
  onOpenCatalogModal: () => void;
}

export const PricingReviewScreen: React.FC<PricingReviewScreenProps> = ({
  proposal,
  catalog,
  onUpdateProposal,
  onNavigate,
  onOpenCatalogModal
}) => {
  const [pickerTarget, setPickerTarget] = useState<{ zoneIdx: number; itemIdx: number; currentItemName: string } | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNRESOLVED' | 'OPTIONAL'>('ALL');

  // Recalculate totals helper
  const recalculateProposalTotals = (prop: HydratedProposal) => {
    let subtotal = 0;
    let totalCost = 0;
    for (const zone of prop.zones) {
      for (const item of zone.items) {
        if (!item.isOptionalAddon && item.quantity !== null && item.quantity > 0) {
          subtotal += item.extendedPrice;
          totalCost += item.extendedCost;
        }
      }
    }
    prop.subtotalPrice = Math.round(subtotal * 100) / 100;
    prop.totalCost = Math.round(totalCost * 100) / 100;
    prop.grossProfit = Math.round((subtotal - totalCost) * 100) / 100;
    prop.grossMarginPercent = subtotal > 0 ? Math.round((prop.grossProfit / subtotal) * 10000) / 100 : 0;
    prop.taxAmount = Math.round(subtotal * prop.taxRate * 100) / 100;
    prop.grandTotal = Math.round((subtotal + prop.taxAmount) * 100) / 100;
  };

  const handleApplyCatalogMatch = (catalogItem: PricingCatalogItem) => {
    if (!pickerTarget) return;
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const item = updated.zones[pickerTarget.zoneIdx].items[pickerTarget.itemIdx];

    item.catalogSku = catalogItem.sku;
    item.itemName = catalogItem.name;
    item.category = catalogItem.category;
    item.unit = catalogItem.unit;
    item.unitCost = catalogItem.unitCost;
    item.unitPrice = catalogItem.unitSellPrice;
    item.specifications = catalogItem.description;

    if (item.quantity !== null && item.quantity > 0) {
      item.extendedCost = Math.round(item.quantity * item.unitCost * 100) / 100;
      item.extendedPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
      item.status = 'VALID';
    } else {
      item.status = 'MISSING_MEASUREMENT';
    }

    recalculateProposalTotals(updated);
    onUpdateProposal(updated);
    setPickerTarget(null);
  };

  const handlePriceOrCostChange = (
    zoneIdx: number,
    itemIdx: number,
    field: 'unitPrice' | 'unitCost' | 'quantity',
    value: number | null
  ) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const item = updated.zones[zoneIdx].items[itemIdx];

    if (field === 'quantity') {
      item.quantity = value;
    } else {
      (item as any)[field] = value || 0;
    }

    if (item.quantity !== null && item.quantity > 0) {
      item.extendedCost = Math.round(item.quantity * item.unitCost * 100) / 100;
      item.extendedPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
      item.status = item.unitPrice > 0 ? 'VALID' : 'NEEDS_PRICING';
    } else {
      item.status = 'MISSING_MEASUREMENT';
    }

    recalculateProposalTotals(updated);
    onUpdateProposal(updated);
  };

  // Metrics
  const unresolvedItems = proposal.zones.flatMap((z, zIdx) =>
    z.items
      .map((i, iIdx) => ({ zoneIdx: zIdx, itemIdx: iIdx, zoneName: z.zoneName, item: i }))
      .filter(entry => entry.item.status !== 'VALID')
  );

  const isMarginHealthy = proposal.grossMarginPercent >= 45.0;
  const isMarginCritical = proposal.grossMarginPercent < 38.0;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              PRICING REVIEW
            </span>
            <span className="text-xs text-stone-400 font-mono">{proposal.proposalNumber}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            Authoritative Master Catalog Pricing
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl">
            Deterministic matching against Phoenix trade unit costs. Every line item is verified for margin compliance and unit consistency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCatalogModal}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 flex items-center space-x-1.5 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Master Price Book ({catalog.length} SKUs)</span>
          </button>
          <button
            onClick={() => onNavigate('editor')}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <span>Open Proposal Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Financial Health & Margin KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Subtotal (Sell Price)
          </span>
          <p className="text-xl font-bold text-stone-900 mt-1 font-mono">
            ${proposal.subtotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-stone-400">Total client trade scope</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Direct Material/Labor Cost
          </span>
          <p className="text-xl font-bold text-stone-700 mt-1 font-mono">
            ${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-stone-400">Direct trade fulfillment cost</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Gross Profit
          </span>
          <p className="text-xl font-bold text-emerald-800 mt-1 font-mono">
            ${proposal.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">Subtotal minus direct cost</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Gross Margin %
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <p
              className={`text-xl font-bold font-mono ${
                isMarginCritical ? 'text-rose-600' : isMarginHealthy ? 'text-emerald-700' : 'text-amber-600'
              }`}
            >
              {proposal.grossMarginPercent.toFixed(1)}%
            </p>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isMarginCritical
                  ? 'bg-rose-100 text-rose-800'
                  : isMarginHealthy
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isMarginCritical ? 'BELOW 38% FLOOR' : isMarginHealthy ? 'HEALTHY' : 'ACCEPTABLE'}
            </span>
          </div>
          <span className="text-[11px] text-stone-400">Marcus Tate approval threshold: 38.0%</span>
        </div>
      </div>

      {/* Unresolved Items Warning Strip if any */}
      {unresolvedItems.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 shadow-xs">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Unresolved Pricing or Missing Measurements ({unresolvedItems.length})
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                The items below require SKU matching or dimension confirmation before Marcus Tate sign-off.
              </p>

              <div className="mt-3 space-y-2">
                {unresolvedItems.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{entry.item.itemName}</span>
                      <span className="text-stone-500 text-[11px] ml-2">in {entry.zoneName}</span>
                      <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                        Status: {entry.item.status.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setPickerTarget({
                          zoneIdx: entry.zoneIdx,
                          itemIdx: entry.itemIdx,
                          currentItemName: entry.item.itemName
                        })
                      }
                      className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-xs font-bold shrink-0 self-end sm:self-center transition"
                    >
                      Match Catalog SKU
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Line Items Table by Zone */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            All Matched Line Items & Pricing Breakdown
          </h2>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500">Filter:</span>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                filterMode === 'ALL' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setFilterMode('UNRESOLVED')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                filterMode === 'UNRESOLVED' ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              Unresolved ({unresolvedItems.length})
            </button>
          </div>
        </div>

        {proposal.zones.map((zone, zoneIdx) => {
          const visibleItems = zone.items
            .map((item, itemIdx) => ({ item, itemIdx }))
            .filter(({ item }) => {
              if (filterMode === 'UNRESOLVED') return item.status !== 'VALID';
              if (filterMode === 'OPTIONAL') return item.isOptionalAddon;
              return true;
            });

          if (visibleItems.length === 0 && filterMode !== 'ALL') return null;

          return (
            <div
              key={zoneIdx}
              className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden"
            >
              {/* Zone Header */}
              <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center">
                    {zoneIdx + 1}
                  </span>
                  <h3 className="text-xs font-bold text-stone-900">{zone.zoneName}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-stone-700">
                  Zone Total: $
                  {zone.items
                    .filter(i => !i.isOptionalAddon && i.quantity)
                    .reduce((acc, i) => acc + i.extendedPrice, 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Table / Card Reflow Layout */}
              <div className="divide-y divide-stone-100">
                {visibleItems.map(({ item, itemIdx }) => {
                  const lineProfit = item.extendedPrice - item.extendedCost;
                  const lineMargin = item.extendedPrice > 0 ? (lineProfit / item.extendedPrice) * 100 : 0;

                  return (
                    <div
                      key={itemIdx}
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-stone-50/50 transition"
                    >
                      {/* Left: SKU & Item Info */}
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-300">
                            {item.catalogSku || 'UNMAPPED_SKU'}
                          </span>
                          <span className="text-xs font-medium text-stone-500">{item.category}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'VALID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'MISSING_MEASUREMENT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-stone-900 mt-1">{item.itemName}</h4>
                        {item.specifications && (
                          <p className="text-[11px] text-stone-600 line-clamp-2">{item.specifications}</p>
                        )}

                        <button
                          onClick={() =>
                            setPickerTarget({
                              zoneIdx,
                              itemIdx,
                              currentItemName: item.itemName
                            })
                          }
                          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 pt-1"
                        >
                          <Search className="w-3 h-3" />
                          <span>Change Catalog Match / Re-assign SKU</span>
                        </button>
                      </div>

                      {/* Right: Quantity, Pricing, Subtotal inputs */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0 self-end lg:self-center">
                        {/* Qty */}
                        <div className="text-right">
                          <span className="block text-[10px] uppercase font-bold text-stone-400">
                            Quantity
                          </span>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity === null ? '' : item.quantity}
                              onChange={e =>
                                handlePriceOrCostChange(
                                  zoneIdx,
                                  itemIdx,
                                  'quantity',
                                  e.target.value === '' ? null : parseFloat(e.target.value)
                                )
                              }
                              className="w-16 px-1.5 py-1 text-xs font-bold font-mono text-stone-900 bg-stone-50 border border-stone-300 rounded text-right"
                            />
                            <span className="text-xs font-mono font-semibold text-stone-500">
                              {item.unit}
                            </span>
                          </div>
                        </div>

                        {/* Unit Sell Price */}
                        <div className="text-right">
                          <span className="block text-[10px] uppercase font-bold text-stone-400">
                            Unit Price ($)
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e =>
                              handlePriceOrCostChange(
                                zoneIdx,
                                itemIdx,
                                'unitPrice',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 px-1.5 py-1 text-xs font-bold font-mono text-emerald-800 bg-stone-50 border border-stone-300 rounded text-right mt-0.5"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="text-right">
                          <span className="block text-[10px] uppercase font-bold text-stone-400">
                            Unit Cost ($)
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={e =>
                              handlePriceOrCostChange(
                                zoneIdx,
                                itemIdx,
                                'unitCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 px-1.5 py-1 text-xs font-mono text-stone-600 bg-stone-50 border border-stone-300 rounded text-right mt-0.5"
                          />
                        </div>

                        {/* Line Extended Subtotal */}
                        <div className="text-right min-w-[100px] pl-2 border-l border-stone-200">
                          <span className="block text-[10px] uppercase font-bold text-stone-400">
                            Subtotal
                          </span>
                          <p className="text-xs font-bold font-mono text-stone-900 mt-0.5">
                            ${item.extendedPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <span
                            className={`text-[10px] font-mono font-semibold ${
                              lineMargin < 38 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {lineMargin.toFixed(0)}% margin
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalog Search & Picker Modal */}
      {pickerTarget && (
        <CatalogSearchPicker
          isOpen={Boolean(pickerTarget)}
          onClose={() => setPickerTarget(null)}
          onSelect={handleApplyCatalogMatch}
          catalog={catalog}
          currentItemName={pickerTarget.currentItemName}
        />
      )}

      {/* Bottom Navigation */}
      <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 flex items-center justify-between">
        <button
          onClick={() => onNavigate('ai-analysis')}
          className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900"
        >
          &larr; Back to AI Scope Review
        </button>

        <button
          onClick={() => onNavigate('editor')}
          className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-xs transition"
        >
          <span>Confirm Pricing & Open Proposal Editor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
