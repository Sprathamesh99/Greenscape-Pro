import React, { useState } from 'react';
import {
  HydratedProposal,
  ProposalZone,
  ProposalItem,
  ScreenMode
} from '../types';
import {
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Save,
  RotateCw,
  ArrowRight,
  ShieldAlert,
  Compass,
  FileCheck,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  MapPin
} from 'lucide-react';

interface AIAnalysisScreenProps {
  proposal: HydratedProposal;
  onUpdateProposal: (updated: HydratedProposal) => Promise<void>;
  onNavigate: (screen: ScreenMode) => void;
  onRegenerate: () => void;
}

export const AIAnalysisScreen: React.FC<AIAnalysisScreenProps> = ({
  proposal,
  onUpdateProposal,
  onNavigate,
  onRegenerate
}) => {
  const [isEditingNarratives, setIsEditingNarratives] = useState(false);
  const [overviewText, setOverviewText] = useState(proposal.projectOverview || '');
  const [accessNotesText, setAccessNotesText] = useState(proposal.siteAccessNotes || '');

  // Save updated narratives
  const handleSaveNarratives = () => {
    const updated = {
      ...proposal,
      projectOverview: overviewText,
      siteAccessNotes: accessNotesText
    };
    onUpdateProposal(updated);
    setIsEditingNarratives(false);
  };

  // Allow user to edit extracted item details directly in AI Analysis screen
  const handleItemQuantityChange = (zoneIdx: number, itemIdx: number, val: number | null) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    const item = updated.zones[zoneIdx].items[itemIdx];
    item.quantity = val;
    if (val !== null && item.unitPrice) {
      item.extendedPrice = Math.round(val * item.unitPrice * 100) / 100;
      item.extendedCost = Math.round(val * item.unitCost * 100) / 100;
    }
    if (val === null || val <= 0) {
      item.status = 'MISSING_MEASUREMENT';
    } else if (item.unitPrice === 0) {
      item.status = 'NEEDS_PRICING';
    } else {
      item.status = 'VALID';
    }
    onUpdateProposal(updated);
  };

  const handleItemNameChange = (zoneIdx: number, itemIdx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    updated.zones[zoneIdx].items[itemIdx].itemName = val;
    onUpdateProposal(updated);
  };

  const handleRemoveDiscrepancy = (discIdx: number) => {
    const updated = JSON.parse(JSON.stringify(proposal)) as HydratedProposal;
    updated.discrepancies.splice(discIdx, 1);
    onUpdateProposal(updated);
  };

  const totalExtractedItems = proposal.zones.reduce((acc, z) => acc + z.items.length, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 font-mono text-xs font-bold border border-purple-700 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>AI EXTRACTION AUDIT</span>
            </span>
            <span className="text-xs text-stone-400 font-mono">{proposal.proposalNumber} (v{proposal.version})</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            Scope Analysis & Field Entity Review
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl">
            Review the extracted project archetype, trade zones, material specifications, and field logistics. Correct any AI interpretation before pricing calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRegenerate}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 flex items-center space-x-1.5 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-run AI Model</span>
          </button>
          <button
            onClick={() => onNavigate('pricing-review')}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <span>Proceed to Pricing Review</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Extracted Metadata & Project Overview Card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-stone-700" />
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Project Classification & Field Summary
            </h2>
          </div>
          {!isEditingNarratives ? (
            <button
              onClick={() => setIsEditingNarratives(true)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Narratives</span>
            </button>
          ) : (
            <button
              onClick={handleSaveNarratives}
              className="text-xs font-bold text-white px-3 py-1 rounded bg-emerald-800 hover:bg-emerald-900 flex items-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex-1 min-w-[200px]">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Client / Property
              </span>
              <p className="text-xs font-bold text-stone-900 mt-0.5">{proposal.clientName}</p>
              <p className="text-[11px] text-stone-500">{proposal.propertyAddress}</p>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex-1 min-w-[160px]">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Trade Zones
              </span>
              <p className="text-sm font-bold text-stone-900 mt-0.5">{proposal.zones.length} Zones Identified</p>
              <p className="text-[11px] text-stone-500">{totalExtractedItems} distinct scope items</p>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex-1 min-w-[160px]">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Target Budget
              </span>
              <p className="text-sm font-bold text-stone-900 mt-0.5">
                {proposal.targetBudget ? `$${proposal.targetBudget.toLocaleString()}` : 'Not Specified'}
              </p>
              <p className="text-[11px] text-stone-500">From client walk notes</p>
            </div>
          </div>

          {/* Project Overview Narrative */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Executive Scope Narrative
            </label>
            {isEditingNarratives ? (
              <textarea
                rows={3}
                value={overviewText}
                onChange={e => setOverviewText(e.target.value)}
                className="w-full p-3 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
              />
            ) : (
              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
                {proposal.projectOverview || 'No executive summary provided.'}
              </div>
            )}
          </div>

          {/* Site Access & Logistics */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Site Access Logistics & Equipment Constraints
            </label>
            {isEditingNarratives ? (
              <textarea
                rows={2}
                value={accessNotesText}
                onChange={e => setAccessNotesText(e.target.value)}
                className="w-full p-3 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
              />
            ) : (
              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
                {proposal.siteAccessNotes || 'Standard site access.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancies & AI Warnings Section */}
      {proposal.discrepancies && proposal.discrepancies.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-300 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                AI Detected Discrepancies, Missing Data & Utility Flags ({proposal.discrepancies.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Review & acknowledge before contract generation
            </span>
          </div>

          <div className="divide-y divide-amber-100 p-2">
            {proposal.discrepancies.map((disc, idx) => (
              <div
                key={idx}
                className="p-3 flex items-start justify-between gap-3 hover:bg-amber-50/50 rounded-lg transition"
              >
                <div className="flex items-start space-x-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      disc.severity === 'CRITICAL' || disc.severity === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {disc.severity}
                  </span>
                  <div>
                    {disc.itemReference && (
                      <span className="text-xs font-bold text-stone-900 block">
                        Ref: {disc.itemReference}
                      </span>
                    )}
                    <p className="text-xs text-stone-700 leading-relaxed">{disc.message}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveDiscrepancy(idx)}
                  title="Dismiss warning"
                  className="text-stone-400 hover:text-stone-600 p-1 shrink-0"
                >
                  <Check className="w-4 h-4 text-emerald-700" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Trade Zones & Items Breakdown */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-stone-700" />
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Extracted Trade Zones & Measurements
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            Edit item names or quantities inline if field notes were misheard
          </span>
        </div>

        {proposal.zones.map((zone, zoneIdx) => (
          <div
            key={zoneIdx}
            className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden"
          >
            {/* Zone Header */}
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                  {zoneIdx + 1}
                </span>
                <h3 className="text-sm font-bold text-stone-900">{zone.zoneName}</h3>
                <span className="text-xs text-stone-400">({zone.items.length} items)</span>
              </div>
              {zone.narrative && (
                <p className="text-xs text-stone-600 italic line-clamp-1 max-w-lg">
                  {zone.narrative}
                </p>
              )}
            </div>

            {/* Items Table with Responsive Reflow */}
            <div className="divide-y divide-stone-100">
              {zone.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50/70 transition"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-bold border border-stone-200">
                        {item.catalogSku || 'SKU_PENDING'}
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">{item.category}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'VALID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'MISSING_MEASUREMENT'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="pt-1">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={e => handleItemNameChange(zoneIdx, itemIdx, e.target.value)}
                        className="text-xs font-bold text-stone-900 w-full bg-transparent hover:bg-stone-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 rounded px-1 py-0.5 border border-transparent focus:border-stone-300"
                      />
                    </div>

                    {item.specifications && (
                      <p className="text-[11px] text-stone-600 px-1">{item.specifications}</p>
                    )}
                  </div>

                  {/* Quantity & Unit Editor */}
                  <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                    <div className="flex items-center space-x-1.5 bg-stone-50 p-1.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] uppercase font-bold text-stone-500">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity === null ? '' : item.quantity}
                        onChange={e =>
                          handleItemQuantityChange(
                            zoneIdx,
                            itemIdx,
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                        placeholder="null"
                        className="w-20 px-2 py-1 text-xs font-bold font-mono text-stone-900 bg-white rounded border border-stone-300 text-right focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                      <span className="text-xs font-mono font-semibold text-stone-600">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 flex items-center justify-between">
        <button
          onClick={() => onNavigate('new-project')}
          className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900"
        >
          &larr; Back to Raw Ingestion
        </button>

        <button
          onClick={() => onNavigate('pricing-review')}
          className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-xs transition"
        >
          <span>Confirm Extraction & Open Pricing Review</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
