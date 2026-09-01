import React, { useState } from 'react';
import { Sparkles, Mic, FileText, MapPin, DollarSign, User, ArrowRight, Loader2 } from 'lucide-react';

interface SiteNotesInputProps {
  onAnalyze: (payload: {
    clientName: string;
    propertyAddress: string;
    clientEmail?: string;
    clientPhone?: string;
    targetBudget?: number;
    rawNotes: string;
  }) => Promise<void>;
  isAnalyzing: boolean;
}

const PRESET_SCENARIOS = [
  {
    title: 'Paradise Valley Estate (Henderson)',
    clientName: 'David & Sarah Henderson',
    propertyAddress: '6420 E Camelback Rd, Paradise Valley, AZ 85253',
    email: 'dhenderson@camelbackproperties.com',
    phone: '(480) 555-0194',
    budget: 75000,
    notes: `Site walk at Henderson residence in Paradise Valley. Backyard outdoor living overhaul.
Existing 400 sq ft cracked concrete patio needs full demolition and hauling. Access is tight on east gate (approx 6ft gate).
Install 1,200 sq ft Belgard Lafitt pavers in Toscana color with polymeric sand and 4" compacted ABC base.
Build 48" custom gas fire pit with stacked ledgerock veneer (Charcoal Canyon) and travertine cap.
Run 45 ft gas line from existing meter.
650 sq ft synthetic turf (putting green quality - 80oz) with weed barrier, 3" DG base, and antimicrobial infill.
Softscape: 8 15-gallon Desert Museum Palo Verde trees, 24 5-gallon Texas Sage, 18 5-gallon Red Yucca, 6 tons 1/2" Madison Gold crushed granite rock.
Low voltage LED lighting: 12 path lights, 6 tree uplights with 300W smart WiFi transformer.
Optional add-on: 20 ft seat wall matching fire pit ledgerock.`
  },
  {
    title: 'Silverleaf Luxury Courtyard',
    clientName: 'Robert Vance',
    propertyAddress: '10425 E Windgate Pass, Scottsdale, AZ 85255',
    email: 'rvance@vancetech.io',
    phone: '(480) 555-8821',
    budget: 90000,
    notes: `High-end front courtyard and rear terrace remodel at Silverleaf.
Demo 600 sq ft flagstone patio and haul away.
Install 1,600 sq ft select Ivory Travertine pavers in Versailles pattern with sand-set base.
Construct 28 ft curved seating wall 18" height with stacked stone veneer and honed travertine bullnose cap.
Triple basalt column bubbling water feature with underground reservoir and LED basin lights.
4-inch French drain line (60 LF) tied into low-point brass catch basin.
Desert plantings: 2 tagged salvaged Saguaro cactus (7ft), 6 15-gal Blue Glow agaves, 10 tons Table Mesa brown rock mulch.
Low voltage system: 18 solid brass path lights and 8 directional uplights.`
  },
  {
    title: 'Arcadia Modern Hardscape & Putting Green',
    clientName: 'Elena Rostova',
    propertyAddress: '4812 N 56th St, Phoenix, AZ 85018',
    email: 'elena.rostova@designstudio.com',
    phone: '(602) 555-3319',
    budget: 60000,
    notes: `Arcadia backyard transformation.
Strip and dispose 850 sq ft Bermuda grass lawn.
Install 900 sq ft Acker-Stone Modern Classic pavers in Charcoal blend with flush concrete edge haunching.
Install 450 sq ft True-Roll professional putting green with 3 regulation aluminum cups and fringe border.
Install 3/4" gas line (35 LF) for client's future BBQ grill island.
Smart irrigation upgrade: Hunter Pro-HC 12-zone smart controller with flow meter.
Plant 4 24-inch box Thornless Chilean Mesquite shade trees and 15 5-gallon red flowering shrubs.`
  }
];

export const SiteNotesInput: React.FC<SiteNotesInputProps> = ({ onAnalyze, isAnalyzing }) => {
  const [clientName, setClientName] = useState('David & Sarah Henderson');
  const [propertyAddress, setPropertyAddress] = useState('6420 E Camelback Rd, Paradise Valley, AZ 85253');
  const [clientEmail, setClientEmail] = useState('dhenderson@camelbackproperties.com');
  const [clientPhone, setClientPhone] = useState('(480) 555-0194');
  const [targetBudget, setTargetBudget] = useState<number>(75000);
  const [rawNotes, setRawNotes] = useState(PRESET_SCENARIOS[0].notes);

  const applyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setClientName(preset.clientName);
    setPropertyAddress(preset.propertyAddress);
    setClientEmail(preset.email);
    setClientPhone(preset.phone);
    setTargetBudget(preset.budget);
    setRawNotes(preset.notes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNotes.trim()) return;
    onAnalyze({
      clientName,
      propertyAddress,
      clientEmail,
      clientPhone,
      targetBudget: targetBudget || undefined,
      rawNotes
    });
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Site Walk Notes Ingestion Hub</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Ingest raw voice transcripts, field shorthand, or notes. Gemini 3.1 Pro extracts scope and binds deterministic pricing.
          </p>
        </div>

        {/* Preset quick loaders */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-stone-500">Presets:</span>
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs rounded bg-stone-200 hover:bg-emerald-100 hover:text-emerald-800 text-stone-700 font-medium transition"
            >
              {p.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Client & Property Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>Client Name</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              placeholder="e.g. John & Jane Smith"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>Property Address (Phoenix Metro)</span>
            </label>
            <input
              type="text"
              required
              value={propertyAddress}
              onChange={e => setPropertyAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              placeholder="e.g. 1234 E Camelback Rd, Paradise Valley, AZ"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-stone-400" />
              <span>Client Target Budget ($)</span>
            </label>
            <input
              type="number"
              value={targetBudget}
              onChange={e => setTargetBudget(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              placeholder="e.g. 75000"
            />
          </div>
        </div>

        {/* Raw Site Notes Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-stone-700 flex items-center space-x-1">
              <Mic className="w-3.5 h-3.5 text-emerald-600" />
              <span>Marcus's Raw Field Notes / Voice Transcript</span>
            </label>
            <span className="text-xs text-stone-400">
              {rawNotes.length} characters • {rawNotes.split('\n').filter(Boolean).length} lines
            </span>
          </div>
          <textarea
            rows={7}
            required
            value={rawNotes}
            onChange={e => setRawNotes(e.target.value)}
            className="w-full p-3.5 text-sm font-mono text-stone-800 bg-stone-50 rounded-lg border border-stone-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition leading-relaxed"
            placeholder="Paste raw contractor notes here (e.g., '1200 sq ft belgard pavers in toscana, 48 inch gas fire pit with ledgerock, 650 sq ft synthetic turf...')"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Safety Policy:</span> Gemini 3.1 Pro is isolated from pricing logic; costs and sell prices are strictly pulled from the master 200+ price catalog.
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !rawNotes.trim()}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 transition"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Running Gemini 3.1 Pro Extraction & Pricing Match...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Generate Proposal Draft</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
