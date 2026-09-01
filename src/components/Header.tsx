import React from 'react';
import {
  Layers,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Activity,
  Plus,
  LayoutDashboard,
  FileText,
  DollarSign,
  Clock,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { ScreenMode, HydratedProposal } from '../types';

interface HeaderProps {
  currentScreen: ScreenMode;
  onNavigate: (screen: ScreenMode) => void;
  onOpenCatalog: () => void;
  onOpenIntegrations: () => void;
  onOpenSecurity: () => void;
  onOpenQA?: () => void;
  proposals: HydratedProposal[];
  activeProposal: HydratedProposal | null;
  onSelectProposal: (proposalId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onOpenCatalog,
  onOpenIntegrations,
  onOpenSecurity,
  onOpenQA,
  proposals,
  activeProposal,
  onSelectProposal
}) => {
  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-30 shadow-md">
      {/* Top Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Brand */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-stone-100 font-bold tracking-wider shadow-inner group-hover:bg-emerald-700 transition">
            <span className="text-base font-serif">GP</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-stone-50 group-hover:text-emerald-300 transition">
                Greenscape Pro
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                P0 INTELLIGENCE
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              Phoenix Metro Hardscape & Outdoor Living
            </p>
          </div>
        </div>

        {/* Center: Proposal Quick Switcher if available */}
        {proposals.length > 0 && (
          <div className="hidden md:flex items-center space-x-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 text-xs">
            <span className="text-stone-400 text-[11px]">Active:</span>
            <select
              value={activeProposal?.id || ''}
              onChange={e => onSelectProposal(e.target.value)}
              className="bg-transparent text-stone-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              {proposals.map(p => (
                <option key={p.id} value={p.id} className="bg-stone-900 text-stone-200">
                  {p.proposalNumber} - {p.clientName} (${p.grandTotal.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right Tools */}
        <div className="flex items-center space-x-2">
          {onOpenQA && (
            <button
              onClick={onOpenQA}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/80 transition"
              title="Automated 3-Tier QA Test Suite (42 Tests)"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">QA Tests</span>
            </button>
          )}

          <button
            onClick={onOpenSecurity}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700 transition"
            title="Production Security & OWASP Audit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Security Audit</span>
          </button>

          <button
            onClick={onOpenCatalog}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Price Book</span>
          </button>

          <button
            onClick={onOpenIntegrations}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700 transition"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Integrations</span>
          </button>

          <button
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Site Walk</span>
          </button>
        </div>
      </div>

      {/* Secondary Screen Navigation Ribbon */}
      <div className="bg-stone-950/80 border-t border-stone-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'dashboard'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>1. Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('new-project')}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'new-project'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>2. New Ingestion</span>
          </button>

          <button
            onClick={() => onNavigate('ai-analysis')}
            disabled={!activeProposal}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'ai-analysis'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : activeProposal
                ? 'text-stone-400 hover:text-stone-200'
                : 'text-stone-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. AI Scope Review</span>
          </button>

          <button
            onClick={() => onNavigate('pricing-review')}
            disabled={!activeProposal}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'pricing-review'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : activeProposal
                ? 'text-stone-400 hover:text-stone-200'
                : 'text-stone-600 cursor-not-allowed opacity-50'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>4. Pricing Review</span>
          </button>

          <button
            onClick={() => onNavigate('editor')}
            disabled={!activeProposal}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'editor'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : activeProposal
                ? 'text-stone-400 hover:text-stone-200'
                : 'text-stone-600 cursor-not-allowed opacity-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>5. Proposal Editor</span>
          </button>

          <button
            onClick={() => onNavigate('approval')}
            disabled={!activeProposal}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'approval'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : activeProposal
                ? 'text-stone-400 hover:text-stone-200'
                : 'text-stone-600 cursor-not-allowed opacity-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>6. Owner Sign-Off</span>
          </button>

          <button
            onClick={() => onNavigate('audit')}
            disabled={!activeProposal}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
              currentScreen === 'audit'
                ? 'bg-stone-800 text-emerald-300 font-bold border border-stone-700'
                : activeProposal
                ? 'text-stone-400 hover:text-stone-200'
                : 'text-stone-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>7. Audit Trail</span>
          </button>
        </div>
      </div>
    </header>
  );
};
