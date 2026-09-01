import React, { useState } from 'react';
import {
  HydratedProposal,
  ProposalZone,
  ProposalItem,
  PricingCatalogItem,
  ScreenMode
} from '../types';
import {
  FileCheck,
  Edit3,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Printer,
  Eye,
  Sliders,
  DollarSign,
  TrendingUp,
  MapPin,
  Building,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { CatalogSearchPicker } from './CatalogSearchPicker';
import { ConfirmDialog } from './ConfirmDialog';

interface ProposalEditorScreenProps {
  proposal: HydratedProposal;
  catalog: PricingCatalogItem[];
  onUpdateProposal: (updated: HydratedProposal) => Promise<void>;
  onNavigate: (screen: ScreenMode) => void;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onRegenerateClick: () => void;
}

export const ProposalEditorScreen: React.FC<ProposalEditorScreenProps> = ({
  proposal,
  catalog,
  onUpdateProposal,
  onNavigate,
  onApproveClick,
  onRejectClick,
  onRegenerateClick
}) => {
  const [viewMode, setViewMode] = useState<'BUILDER' | 'CUSTOMER_PREVIEW'>('BUILDER');
  const [activePicker, setActivePicker] = useState<{ zoneIdx: number } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ zoneIdx: number; itemIdx: number; name: string } | null>(null);

  // Recalculate financial totals
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

  const handleFieldChange = (
    zoneIdx: number,
    itemIdx: number,
    field: keyof ProposalItem,
    value: any
  ) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const item = updated.zones[zoneIdx].items[itemIdx];
    (item as any)[field] = value;

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

  const handleAddZone = () => {
    const zoneName = prompt('Enter New Zone Name (e.g., Side Yard Walkway, Outdoor Kitchen):');
    if (!zoneName) return;

    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    updated.zones.push({
      zoneName: zoneName.trim(),
      narrative: 'Custom hardscape zone addition.',
      items: []
    });
    onUpdateProposal(updated);
  };

  const handleAddCatalogItemToZone = (catalogItem: PricingCatalogItem) => {
    if (activePicker === null) return;
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const newItem: ProposalItem = {
      catalogSku: catalogItem.sku,
      rawItemName: catalogItem.name,
      itemName: catalogItem.name,
      category: catalogItem.category,
      quantity: 1,
      unit: catalogItem.unit,
      unitCost: catalogItem.unitCost,
      unitPrice: catalogItem.unitSellPrice,
      extendedCost: catalogItem.unitCost,
      extendedPrice: catalogItem.unitSellPrice,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: catalogItem.description
    };
    updated.zones[activePicker.zoneIdx].items.push(newItem);
    recalculateProposalTotals(updated);
    onUpdateProposal(updated);
    setActivePicker(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    updated.zones[deleteConfirmTarget.zoneIdx].items.splice(deleteConfirmTarget.itemIdx, 1);
    recalculateProposalTotals(updated);
    onUpdateProposal(updated);
    setDeleteConfirmTarget(null);
  };

  const isMarginHealthy = proposal.grossMarginPercent >= 45.0;
  const isMarginCritical = proposal.grossMarginPercent < 38.0;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              PROPOSAL CONTRACT EDITOR
            </span>
            <span className="text-xs text-stone-400 font-mono">
              {proposal.proposalNumber} • Version {proposal.version}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            {proposal.clientName}
          </h1>
          <p className="text-xs text-stone-300 mt-1 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <span>{proposal.propertyAddress}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="bg-stone-800 p-1 rounded-lg border border-stone-700 flex items-center space-x-1">
            <button
              onClick={() => setViewMode('BUILDER')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                viewMode === 'BUILDER'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Contract Builder</span>
            </button>
            <button
              onClick={() => setViewMode('CUSTOMER_PREVIEW')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                viewMode === 'CUSTOMER_PREVIEW'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Customer Document</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate('approval')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Proceed to Approval Gate</span>
          </button>
        </div>
      </div>

      {viewMode === 'BUILDER' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Zones & Items Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Scope Zones & Line Items ({proposal.zones.reduce((acc, z) => acc + z.items.length, 0)})
                </h2>
              </div>
              <button
                onClick={handleAddZone}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Scope Zone</span>
              </button>
            </div>

            {proposal.zones.map((zone, zoneIdx) => (
              <div
                key={zoneIdx}
                className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden"
              >
                {/* Zone Header */}
                <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center">
                      {zoneIdx + 1}
                    </span>
                    <h3 className="text-xs font-bold text-stone-900">{zone.zoneName}</h3>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => setActivePicker({ zoneIdx })}
                      className="px-2.5 py-1 bg-white hover:bg-stone-100 text-emerald-800 border border-stone-300 rounded text-xs font-bold flex items-center space-x-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Item from Catalog</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-stone-100">
                  {zone.items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400">
                      No items in this zone. Click &ldquo;Add Item from Catalog&rdquo; above.
                    </div>
                  ) : (
                    zone.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/50 transition"
                      >
                        {/* Item Details */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                              {item.catalogSku || 'CUSTOM'}
                            </span>
                            <span className="text-xs font-medium text-stone-500">{item.category}</span>
                            {item.isOptionalAddon && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                OPTIONAL ADD-ON
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={item.itemName}
                            onChange={e =>
                              handleFieldChange(zoneIdx, itemIdx, 'itemName', e.target.value)
                            }
                            className="text-xs font-bold text-stone-900 w-full bg-transparent hover:bg-stone-100 focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-stone-300"
                          />

                          <input
                            type="text"
                            value={item.specifications || ''}
                            onChange={e =>
                              handleFieldChange(zoneIdx, itemIdx, 'specifications', e.target.value)
                            }
                            placeholder="Specification / installation details..."
                            className="text-[11px] text-stone-600 w-full bg-transparent hover:bg-stone-100 focus:bg-white rounded px-1.5 py-0.5 border border-transparent focus:border-stone-300"
                          />
                        </div>

                        {/* Quantity & Unit Sell Price Controls */}
                        <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-stone-400">
                              Qty
                            </span>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.quantity === null ? '' : item.quantity}
                                onChange={e =>
                                  handleFieldChange(
                                    zoneIdx,
                                    itemIdx,
                                    'quantity',
                                    e.target.value === '' ? null : parseFloat(e.target.value)
                                  )
                                }
                                className="w-16 px-1.5 py-1 text-xs font-bold font-mono text-stone-900 bg-stone-50 border border-stone-300 rounded text-right"
                              />
                              <span className="text-xs font-mono text-stone-500">{item.unit}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-stone-400">
                              Price ($)
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e =>
                                handleFieldChange(
                                  zoneIdx,
                                  itemIdx,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 px-1.5 py-1 text-xs font-bold font-mono text-emerald-800 bg-stone-50 border border-stone-300 rounded text-right mt-0.5"
                            />
                          </div>

                          <div className="text-right min-w-[80px]">
                            <span className="block text-[10px] uppercase font-bold text-stone-400">
                              Ext. Total
                            </span>
                            <p className="text-xs font-bold font-mono text-stone-900 mt-1">
                              ${item.extendedPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          {/* Delete Item Action */}
                          <button
                            onClick={() =>
                              setDeleteConfirmTarget({
                                zoneIdx,
                                itemIdx,
                                name: item.itemName
                              })
                            }
                            aria-label={`Delete line item ${item.itemName}`}
                            className="p-1.5 text-stone-400 hover:text-rose-600 transition rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right Col: Live Financial & Margin Guard Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 space-y-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
                Contract Financial Summary
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Scope Subtotal:</span>
                  <span className="font-mono font-bold text-stone-900">
                    ${proposal.subtotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Direct Trade Cost:</span>
                  <span className="font-mono font-semibold text-stone-700">
                    ${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-800 font-semibold pt-1 border-t border-stone-100">
                  <span>Gross Profit:</span>
                  <span className="font-mono font-bold">
                    ${proposal.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-stone-700 font-bold">Gross Margin:</span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      isMarginCritical ? 'text-rose-600' : isMarginHealthy ? 'text-emerald-700' : 'text-amber-600'
                    }`}
                  >
                    {proposal.grossMarginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Visual Margin Meter */}
              <div className="pt-2">
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isMarginCritical ? 'bg-rose-500' : isMarginHealthy ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, proposal.grossMarginPercent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>0%</span>
                  <span className="text-stone-600 font-bold">38% Floor</span>
                  <span>50%+</span>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Tax ({(proposal.taxRate * 100).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold text-stone-800">
                    ${proposal.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Contract Grand Total:</span>
                  <span className="font-mono text-emerald-900">
                    ${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('approval')}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Review & Sign Off Contract</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Customer-Facing Document Preview Mode */
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 sm:p-12 max-w-4xl mx-auto space-y-8 print:p-0 print:border-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-stone-900 pb-6 gap-4">
            <div>
              <span className="text-xl font-bold tracking-tight text-emerald-950 block">
                GREENSCAPE PRO
              </span>
              <span className="text-xs text-stone-500 tracking-wider uppercase font-semibold">
                Landscape & Hardscape Design-Build
              </span>
              <p className="text-xs text-stone-600 mt-2">
                Phoenix, Scottsdale, Paradise Valley, Arcadia
              </p>
              <p className="text-xs text-stone-500">ROC #341908 • Licensed & Bonded</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="font-mono text-sm font-bold text-stone-900 block">
                PROPOSAL {proposal.proposalNumber}
              </span>
              <p className="text-xs text-stone-500">
                Date: {new Date(proposal.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-stone-500">Version: {proposal.version}.0</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-800 border border-stone-300">
                Status: {proposal.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Client & Project Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-stone-50 p-5 rounded-lg border border-stone-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Prepared For:
              </span>
              <h3 className="text-sm font-bold text-stone-900 mt-1">{proposal.clientName}</h3>
              <p className="text-xs text-stone-600 mt-0.5">{proposal.propertyAddress}</p>
              {proposal.clientEmail && (
                <p className="text-xs text-stone-500 mt-0.5">{proposal.clientEmail}</p>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Project Scope Overview:
              </span>
              <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                {proposal.projectOverview || 'Custom landscape and paver installation scope.'}
              </p>
            </div>
          </div>

          {/* Scope of Work by Zone */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-2">
              Itemized Scope of Work
            </h3>

            {proposal.zones.map((zone, zoneIdx) => (
              <div key={zoneIdx} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center">
                    {zoneIdx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                    {zone.zoneName}
                  </h4>
                </div>

                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-stone-200">
                    <thead className="bg-stone-100 text-[10px] font-bold text-stone-500 uppercase">
                      <tr>
                        <th className="p-3">Scope Description</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {zone.items.map((item, itemIdx) => (
                        <tr key={itemIdx}>
                          <td className="p-3">
                            <span className="font-bold text-stone-900 block">{item.itemName}</span>
                            {item.specifications && (
                              <span className="text-[11px] text-stone-500 block mt-0.5">
                                {item.specifications}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-3 text-right font-mono">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-stone-900">
                            ${item.extendedPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Milestones & Terms */}
          <div className="border-t border-stone-200 pt-6 space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Payment Schedule & Milestone Milestones
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">1. Deposit (30%)</span>
                <p className="font-mono font-bold text-stone-900 mt-1">
                  ${(proposal.grandTotal * 0.3).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-stone-500">Upon contract signing</span>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">2. Sub-Base (40%)</span>
                <p className="font-mono font-bold text-stone-900 mt-1">
                  ${(proposal.grandTotal * 0.4).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-stone-500">Upon base completion</span>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">3. Progress (20%)</span>
                <p className="font-mono font-bold text-stone-900 mt-1">
                  ${(proposal.grandTotal * 0.2).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-stone-500">Hardscape installed</span>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">4. Final (10%)</span>
                <p className="font-mono font-bold text-stone-900 mt-1">
                  ${(proposal.grandTotal * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-stone-500">Upon final punch walkthrough</span>
              </div>
            </div>
          </div>

          {/* Grand Total Callout */}
          <div className="bg-stone-900 text-stone-100 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-stone-400 uppercase tracking-wider block">
                Total Estimated Investment
              </span>
              <span className="text-xs text-stone-300">
                Includes all materials, labor, compaction testing, and standard manufacturer warranty.
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                ${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Search & Picker Modal */}
      {activePicker && (
        <CatalogSearchPicker
          isOpen={Boolean(activePicker)}
          onClose={() => setActivePicker(null)}
          onSelect={handleAddCatalogItemToZone}
          catalog={catalog}
        />
      )}

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmTarget)}
        title="Remove Line Item"
        message={`Are you sure you want to remove "${deleteConfirmTarget?.name}" from this proposal? This will adjust the contract subtotal immediately.`}
        confirmLabel="Remove Item"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />
    </div>
  );
};
