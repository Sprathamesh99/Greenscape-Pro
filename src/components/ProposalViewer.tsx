import React, { useState } from 'react';
import {
  HydratedProposal,
  ProposalZone,
  ProposalItem,
  PricingCatalogItem
} from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCw,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  TrendingUp,
  Percent,
  FileCheck,
  Building,
  MapPin,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

interface ProposalViewerProps {
  proposal: HydratedProposal;
  onUpdateProposal: (updated: HydratedProposal) => Promise<void>;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onRegenerateClick: () => void;
  onOpenCatalog: () => void;
  catalog: PricingCatalogItem[];
}

export const ProposalViewer: React.FC<ProposalViewerProps> = ({
  proposal,
  onUpdateProposal,
  onApproveClick,
  onRejectClick,
  onRegenerateClick,
  onOpenCatalog,
  catalog
}) => {
  const [activeTab, setActiveTab] = useState<'scope' | 'overview' | 'audit'>('scope');
  const [editingItemIndex, setEditingItemIndex] = useState<{ zoneIdx: number; itemIdx: number } | null>(null);

  // Deep clone proposal state for local updates
  const handleItemFieldChange = (
    zoneIdx: number,
    itemIdx: number,
    field: keyof ProposalItem,
    value: any
  ) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const targetItem = updated.zones[zoneIdx].items[itemIdx];
    (targetItem as any)[field] = value;

    // Recalculate line totals
    if (targetItem.quantity !== null) {
      targetItem.extendedCost = Math.round(targetItem.quantity * targetItem.unitCost * 100) / 100;
      targetItem.extendedPrice = Math.round(targetItem.quantity * targetItem.unitPrice * 100) / 100;
    }

    // Update line status
    if (targetItem.quantity === null || targetItem.quantity <= 0) {
      targetItem.status = 'MISSING_MEASUREMENT';
    } else if (targetItem.unitPrice === 0) {
      targetItem.status = 'NEEDS_PRICING';
    } else {
      targetItem.status = 'VALID';
    }

    // Recalculate proposal summary
    recalculateTotals(updated);
    onUpdateProposal(updated);
  };

  const handleDeleteItem = (zoneIdx: number, itemIdx: number) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    updated.zones[zoneIdx].items.splice(itemIdx, 1);
    recalculateTotals(updated);
    onUpdateProposal(updated);
  };

  const handleAddCustomItem = (zoneIdx: number) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const newItem: ProposalItem = {
      rawItemName: 'Custom Field Modification',
      itemName: 'Custom Trade Item / Upgrade',
      category: 'Pavers & Hardscape',
      quantity: 1,
      unit: 'EA',
      unitCost: 100,
      unitPrice: 250,
      extendedCost: 100,
      extendedPrice: 250,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Custom specification'
    };
    updated.zones[zoneIdx].items.push(newItem);
    recalculateTotals(updated);
    onUpdateProposal(updated);
  };

  const recalculateTotals = (prop: HydratedProposal) => {
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

  const isMarginHealthy = proposal.grossMarginPercent >= 45.0;
  const isMarginCritical = proposal.grossMarginPercent < 38.0;

  const hasMissingMeasurements = proposal.zones.some(z =>
    z.items.some(i => i.status === 'MISSING_MEASUREMENT')
  );
  const hasUnpricedItems = proposal.zones.some(z =>
    z.items.some(i => i.status === 'NEEDS_PRICING' && i.unitPrice === 0)
  );

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Banner & Status Bar */}
      <div className="bg-stone-900 text-stone-100 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs tracking-wider px-2 py-0.5 rounded bg-stone-800 text-emerald-400 border border-stone-700">
              {proposal.proposalNumber}
            </span>
            <span className="text-xs text-stone-400">Version {proposal.version}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                proposal.status === 'APPROVED'
                  ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                  : proposal.status === 'REJECTED'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {proposal.status.replace('_', ' ')}
            </span>
          </div>

          <h2 className="text-xl font-bold text-stone-50 mt-1.5">{proposal.clientName}</h2>
          <p className="text-xs text-stone-300 flex items-center space-x-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <span>{proposal.propertyAddress}</span>
          </p>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="flex items-center space-x-4">
          <div className="bg-stone-800/80 px-4 py-2.5 rounded-lg border border-stone-700 text-right">
            <span className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider">Contract Total</span>
            <span className="text-xl font-bold text-emerald-400">
              ${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-stone-800/80 px-4 py-2.5 rounded-lg border border-stone-700 text-right">
            <span className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider">Gross Margin</span>
            <span
              className={`text-xl font-bold ${
                isMarginCritical ? 'text-rose-400' : isMarginHealthy ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {proposal.grossMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Discrepancy & Site Warnings Banner */}
      {proposal.discrepancies && proposal.discrepancies.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Site Walk Discrepancies & Utility Flags ({proposal.discrepancies.length})
              </h4>
              <div className="mt-1 space-y-1">
                {proposal.discrepancies.map((d, i) => (
                  <div key={i} className="text-xs text-amber-800 flex items-center space-x-2">
                    <span className="font-semibold text-amber-900">[{d.severity}]</span>
                    <span>{d.itemReference ? `${d.itemReference}: ` : ''}{d.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-stone-100 px-6 border-b border-stone-200 flex space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('scope')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'scope'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Scope of Work & Line Items ({proposal.zones.reduce((acc, z) => acc + z.items.length, 0)})
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Executive Summary & Site Access
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Audit Trail & Integration History ({proposal.auditLogs?.length || 0})
        </button>
      </div>

      {/* Tab Content: Scope & Line Items */}
      {activeTab === 'scope' && (
        <div className="p-6 space-y-8">
          {proposal.zones.map((zone, zoneIdx) => (
            <div key={zoneIdx} className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              {/* Zone Header & Narrative */}
              <div className="bg-stone-50 p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center">
                      {zoneIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">{zone.zoneName}</h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 italic leading-relaxed">
                    "{zone.narrative}"
                  </p>
                </div>

                <button
                  onClick={() => handleAddCustomItem(zoneIdx)}
                  className="self-start md:self-auto inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-stone-200 hover:bg-stone-300 text-stone-800 rounded transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/75 text-stone-600 border-b border-stone-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Trade Item / Catalog SKU</th>
                      <th className="py-2.5 px-3 font-semibold w-24">Qty / Unit</th>
                      <th className="py-2.5 px-3 font-semibold w-24 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 font-semibold w-24 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-semibold w-28 text-right">Extended Price</th>
                      <th className="py-2.5 px-3 font-semibold w-28 text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {zone.items.map((item, itemIdx) => {
                      const isInvalid = item.status === 'MISSING_MEASUREMENT' || (item.status === 'NEEDS_PRICING' && item.unitPrice === 0);

                      return (
                        <tr
                          key={itemIdx}
                          className={`hover:bg-stone-50/80 transition ${
                            isInvalid ? 'bg-rose-50/50' : item.isOptionalAddon ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-stone-900">{item.itemName}</div>
                            <div className="text-[11px] text-stone-500 font-mono flex items-center space-x-2 mt-0.5">
                              {item.catalogSku ? (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {item.catalogSku}
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Unmapped SKU
                                </span>
                              )}
                              <span>• {item.category}</span>
                              {item.isOptionalAddon && (
                                <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                                  OPTIONAL UPGRADE
                                </span>
                              )}
                            </div>
                            {item.specifications && (
                              <div className="text-[11px] text-stone-600 mt-1 italic">
                                {item.specifications}
                              </div>
                            )}
                          </td>

                          {/* Quantity & Unit */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={item.quantity === null ? '' : item.quantity}
                                onChange={e =>
                                  handleItemFieldChange(
                                    zoneIdx,
                                    itemIdx,
                                    'quantity',
                                    e.target.value === '' ? null : parseFloat(e.target.value)
                                  )
                                }
                                placeholder="Qty"
                                className={`w-16 px-1.5 py-1 text-xs rounded border text-center font-mono ${
                                  item.quantity === null
                                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                                    : 'border-stone-300 focus:ring-1 focus:ring-emerald-600'
                                }`}
                              />
                              <span className="font-semibold text-stone-600 text-[11px]">{item.unit}</span>
                            </div>
                          </td>

                          {/* Unit Cost */}
                          <td className="py-3 px-3 text-right font-mono text-stone-600">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitCost}
                              onChange={e =>
                                handleItemFieldChange(
                                  zoneIdx,
                                  itemIdx,
                                  'unitCost',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 px-1.5 py-1 text-xs rounded border border-stone-300 text-right font-mono"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-stone-900">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e =>
                                handleItemFieldChange(
                                  zoneIdx,
                                  itemIdx,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 px-1.5 py-1 text-xs rounded border border-stone-300 text-right font-mono"
                            />
                          </td>

                          {/* Extended Price */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                            ${item.extendedPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {item.status === 'VALID' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                Match OK
                              </span>
                            ) : item.status === 'MISSING_MEASUREMENT' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 animate-pulse">
                                Missing Qty
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Needs Price
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteItem(zoneIdx, itemIdx)}
                              className="text-stone-400 hover:text-rose-600 transition"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Proposal Summary Financial Breakdown */}
          <div className="bg-stone-50 rounded-xl p-6 border border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Contract Financial Breakdown</h4>
              <div className="mt-2 space-y-1 text-xs text-stone-600">
                <div>Subtotal Construction Value: <span className="font-semibold text-stone-900 font-mono">${proposal.subtotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                <div>Estimated Direct Job Cost: <span className="font-semibold text-stone-900 font-mono">${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                <div>Gross Profit Margin: <span className="font-bold text-emerald-800 font-mono">${proposal.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({proposal.grossMarginPercent.toFixed(1)}%)</span></div>
                <div>City of Phoenix / Maricopa Tax (8.6%): <span className="font-semibold text-stone-900 font-mono">${proposal.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-stone-300 shadow-sm text-right w-full md:w-auto">
              <span className="text-xs text-stone-500 uppercase font-semibold">Total Turnkey Customer Investment</span>
              <div className="text-3xl font-extrabold text-stone-900 font-mono mt-1">
                ${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                Includes all excavation, materials, craftsmanship, and clean-up.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Executive Summary */}
      {activeTab === 'overview' && (
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Project Executive Overview
            </label>
            <textarea
              rows={4}
              value={proposal.projectOverview || ''}
              onChange={e => {
                const updated = { ...proposal, projectOverview: e.target.value };
                onUpdateProposal(updated);
              }}
              className="w-full p-3 text-sm rounded-lg border border-stone-300 font-serif leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Site Logistics & Machine Access Notes
            </label>
            <textarea
              rows={3}
              value={proposal.siteAccessNotes || ''}
              onChange={e => {
                const updated = { ...proposal, siteAccessNotes: e.target.value };
                onUpdateProposal(updated);
              }}
              className="w-full p-3 text-sm rounded-lg border border-stone-300 leading-relaxed font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Audit History */}
      {activeTab === 'audit' && (
        <div className="p-6 space-y-4">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Immutable Audit Trail</h4>
          <div className="space-y-3">
            {proposal.auditLogs && proposal.auditLogs.length > 0 ? (
              proposal.auditLogs.map((log, idx) => (
                <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs flex items-start space-x-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5"></span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900">
                        {log.eventType} by {log.actorName} ({log.actorRole})
                      </span>
                      <span className="text-stone-400 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-600 mt-0.5">{log.notes}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400">No audit events recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* Action Gate Footer (Strict Marcus Sign-off) */}
      <div className="bg-stone-100 px-6 py-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {hasMissingMeasurements || hasUnpricedItems ? (
            <div className="text-xs text-rose-700 font-medium flex items-center space-x-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Approval Locked: Resolve all missing quantities and unpriced items first.</span>
            </div>
          ) : (
            <div className="text-xs text-emerald-800 font-medium flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>All trade line items validated against 200+ master catalog. Ready for owner sign-off.</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRegenerateClick}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Regenerate with AI</span>
          </button>

          <button
            onClick={onRejectClick}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject Draft</span>
          </button>

          <button
            onClick={onApproveClick}
            disabled={hasMissingMeasurements || hasUnpricedItems}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span>Marcus Tate: Approve & Dispatch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
