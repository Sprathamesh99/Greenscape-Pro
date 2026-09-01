import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  MapPin,
  User,
  DollarSign,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wand2,
  Compass,
  ArrowRight
} from 'lucide-react';

interface NewProjectScreenProps {
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
    id: 'scottsdale',
    title: 'Scottsdale Luxury Paver Patio & Fire Pit',
    subtitle: '850 sq ft Catalina slate, gas fire pit, synthetic turf, 6ft gate limit',
    clientName: 'Arthur & Eleanor Pendelton',
    propertyAddress: '9420 E Pinnacle Peak Rd, Scottsdale, AZ 85255',
    clientEmail: 'arthur.pendelton@gmail.com',
    clientPhone: '(480) 555-0192',
    targetBudget: 38000,
    rawNotes: `Site walk completed 08:30 AM with homeowner Arthur.
Property: High-end single family in Troon North / Scottsdale.
Existing backyard is bare dirt with slope down toward the rear wash.

ZONE 1: MAIN LIVING PATIO & ENTERTAINMENT
- Demo existing 120 sq ft cracked builder broom concrete patio.
- Install 850 sq ft Belgard Catalina Slate paver patio in Toscana color blend with 3-piece modular layout.
- Sub-base requires 4" compacted ABC road base with commercial geotextile fabric due to expansive clay soil.
- Polymeric sand in Tan. Concrete soldier course border around perimeter (approx 110 LF).
- Built-in gas fire feature: 48" round custom block fire pit with natural stone veneer matching home stucco. 1/2" lava rock media, stainless steel dual-ring burner. Gas line stub already located at patio edge.

ZONE 2: LAWN & RECREATION
- 420 sq ft premium synthetic turf (Spring 80 oz face weight).
- Requires 3" crushed stone base, weed barrier, galvanized perimeter securing staples, and non-toxic antimicrobial infill for small dog.
- 65 LF extruded aluminum poly-board edging separating turf from decomposed granite.

ZONE 3: DESERT ADAPTIVE PLANTING & IRRIGATION
- 1,200 sq ft 1/2" minus Madison Gold decomposed granite at 2" depth with pre-emergent weed inhibitor.
- Planting package: 3 specimen 24" box multi-trunk Palo Verde trees with 2-point drip emitters. 12 5-gallon Red Yuccas along perimeter.
- Convert existing Rain Bird valve to 2 independent drip zones with 3/4" pressure regulator and filter.

SITE ACCESS & LOGISTICS:
- Side access gate is exactly 6.0 ft wide. Mini-skid steer and standard dumper will fit, but heavy full-size track loader cannot enter.
- Overhead SRP electric drop along north wall. Underground gas line marked by Arizona 811.`
  },
  {
    id: 'paradise-valley',
    title: 'Paradise Valley Desert Modern Remodel',
    subtitle: '1,200 sq ft Belgard Lafitt, 45 LF seating wall, desert drip, low voltage lighting',
    clientName: 'Harrison & Claire Vance',
    propertyAddress: '6830 N Invergordon Rd, Paradise Valley, AZ 85253',
    clientEmail: 'cvance@vancedesign.com',
    clientPhone: '(602) 555-8391',
    targetBudget: 62000,
    rawNotes: `Site walk with Harrison Vance. Architect already approved preliminary desert modern aesthetic.
Zero demolition required - clean graded lot.

ZONE 1: WEST ENTERTAINING TERRACE
- Install 1,200 sq ft Belgard Lafitt Rustic Slab 3-piece modular pavers in Victorian colorway.
- Include 4" ABC compacted crushed aggregate foundation with woven stabilizer fabric.
- 45 LF custom seat wall: 18" height, 12" width double-sided Belgard Tandem Wall with chiseled graphite capstone.

ZONE 2: ARCHITECTURAL SPECIMEN PLANTING
- 4 specimen 36" box multi-trunk Blue Palo Verde trees with dual root bubblers.
- 16 5-gallon Golden Barrel Cacti with decorative rock collar.
- 2,400 sq ft 1/2" screened Apache Brown decomposed granite @ 2" uniform depth.
- Commercial grade 1" Hunter PGV valve manifold with smart WiFi B-hyve controller.

ZONE 3: ACCENT LIGHTING
- 14 commercial cast-brass low-voltage LED directional uplights (3000K warm white) illuminating specimen trees and seat wall base.
- 300W stainless steel multi-tap transformer with astronomical timer.

ACCESS NOTES:
- Unrestricted 12ft double RV gate on south boundary. Standard excavators and full-size aggregate trucks can access yard directly.`
  },
  {
    id: 'arcadia',
    title: 'Arcadia Travertine Pool Deck & Turf',
    subtitle: '950 sq ft Silver Travertine, putting green, 4-hole cups, drainage swale',
    clientName: 'Dr. Gregory & Sarah Sterling',
    propertyAddress: '4210 E Calle Tuberia, Phoenix, AZ 85018 (Arcadia)',
    clientEmail: 'gsterling@arcadiamd.org',
    clientPhone: '(602) 555-4720',
    targetBudget: 49000,
    rawNotes: `Arcadia backyard renovation around newly plastered swimming pool.

ZONE 1: TRAVERTINE POOL DECKING
- Install 950 sq ft 1.25" French Pattern Silver Travertine pavers on 1" dry sand-cement setting bed over 4" compacted ABC base.
- 115 LF bullnose travertine pool coping bonded with high-bond polymer modified thinset.
- Apply natural look penetrating breathable stone sealer.

ZONE 2: PUTTING GREEN & CASUAL TURF
- 320 sq ft custom contour putting green with 2-tier break and 4 aluminum practice cups with regulation flags.
- Surrounding 250 sq ft fringe turf (60 oz) for chipping practice.
- Sub-base: 4" vibratory compacted chat / quarter-minus granite foundation.

ZONE 3: SITE DRAINAGE & SURFACE WATER
- Install 85 LF 4" smooth interior PVC schedule 40 collector drain with 3 9"x9" low-profile catch basins tied to pop-up emitter at front curb.`
  }
];

export const NewProjectScreen: React.FC<NewProjectScreenProps> = ({
  onAnalyze,
  isAnalyzing
}) => {
  const [clientName, setClientName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [targetBudget, setTargetBudget] = useState<string>('');
  const [rawNotes, setRawNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleApplyPreset = (scenario: (typeof PRESET_SCENARIOS)[0]) => {
    setClientName(scenario.clientName);
    setPropertyAddress(scenario.propertyAddress);
    setClientEmail(scenario.clientEmail);
    setClientPhone(scenario.clientPhone);
    setTargetBudget(scenario.targetBudget.toString());
    setRawNotes(scenario.rawNotes);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setValidationError('Client Name is required');
      return;
    }
    if (!propertyAddress.trim()) {
      setValidationError('Property Address is required');
      return;
    }
    if (!rawNotes.trim() || rawNotes.trim().length < 20) {
      setValidationError('Site-walk notes must contain at least 20 characters of detail');
      return;
    }

    setValidationError(null);
    onAnalyze({
      clientName: clientName.trim(),
      propertyAddress: propertyAddress.trim(),
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      targetBudget: targetBudget ? parseFloat(targetBudget) : undefined,
      rawNotes: rawNotes.trim()
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              NEW PROJECT INTAKE
            </span>
            <span className="text-xs text-stone-400">Step 1: Ingestion & AI Extraction</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            Site-Walk Ingestion & Scope Parser
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-xl">
            Input field notes or audio dictation. The Gemini Flash cascade extracts trade zones, materials, measurements, and catalog matches deterministically.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-stone-400">Zero-Price AI isolation active</span>
        </div>
      </div>

      {/* Preset Scenarios Carousel */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Quick Phoenix Metro Presets
            </h2>
          </div>
          <span className="text-[11px] text-stone-500">
            Click to auto-populate high-fidelity field data
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_SCENARIOS.map(scenario => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleApplyPreset(scenario)}
              className="p-3.5 rounded-lg border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition group space-y-1.5"
            >
              <span className="font-bold text-xs text-stone-900 group-hover:text-emerald-900 block truncate">
                {scenario.title}
              </span>
              <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                {scenario.subtitle}
              </p>
              <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1">
                <span>Budget: ${scenario.targetBudget.toLocaleString()}</span>
                <span className="text-emerald-800 font-bold group-hover:underline">Select &rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Ingestion Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-6 space-y-6">
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Client & Property Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Customer Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Arthur & Eleanor Pendelton"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Property Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={propertyAddress}
                  onChange={e => setPropertyAddress(e.target.value)}
                  placeholder="e.g. 9420 E Pinnacle Peak Rd, Scottsdale, AZ 85255"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Client Email (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="e.g. client@domain.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Client Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="(480) 555-0192"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Target Budget ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={targetBudget}
                    onChange={e => setTargetBudget(e.target.value)}
                    placeholder="35000"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Raw Site Notes Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Site-Walk Notes & Voice Dictation <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-stone-400">
                {rawNotes.length} characters • Minimum 20 required
              </span>
            </div>
            <textarea
              required
              rows={12}
              value={rawNotes}
              onChange={e => setRawNotes(e.target.value)}
              placeholder="Paste raw unedited field notes, measurements, zone specifications, access constraints, or homeowner requests..."
              className="w-full p-3.5 text-xs font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 leading-relaxed bg-stone-50/50"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Tip: Include dimensions (sq ft, linear ft), material names (Belgard, Travertine, Turf), and logistics (gate width, demo, underground utilities).
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-stone-50 p-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            AI extracts trade zones and matches Phoenix unit rates. Zero pricing hallucination.
          </div>

          <button
            type="submit"
            disabled={isAnalyzing}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 text-white shadow-sm transition ${
              isAnalyzing
                ? 'bg-stone-400 cursor-not-allowed'
                : 'bg-emerald-800 hover:bg-emerald-900 cursor-pointer'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Running Scope Extraction Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>Run AI Scope & Catalog Match</span>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
