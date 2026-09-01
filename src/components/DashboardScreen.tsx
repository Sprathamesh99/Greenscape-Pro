import React, { useMemo } from 'react';
import {
  HydratedProposal,
  Project,
  ScreenMode
} from '../types';
import {
  Layers,
  FileCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building,
  MapPin,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  Activity,
  Send,
  XCircle
} from 'lucide-react';

interface DashboardScreenProps {
  proposals: HydratedProposal[];
  projects: Project[];
  activeProposal: HydratedProposal | null;
  onSelectProposal: (proposalId: string) => void;
  onNavigate: (screen: ScreenMode) => void;
  onOpenCatalog: () => void;
  onOpenIntegrations: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  proposals,
  projects,
  activeProposal,
  onSelectProposal,
  onNavigate,
  onOpenCatalog,
  onOpenIntegrations
}) => {
  // Metric calculations
  const totalQuotedValue = useMemo(() => {
    return proposals.reduce((acc, p) => acc + p.grandTotal, 0);
  }, [proposals]);

  const avgGrossMargin = useMemo(() => {
    if (proposals.length === 0) return 0;
    const sum = proposals.reduce((acc, p) => acc + p.grossMarginPercent, 0);
    return sum / proposals.length;
  }, [proposals]);

  const proposalsNeedingReview = useMemo(() => {
    return proposals.filter(p => {
      const hasMissingMeasurements = p.zones.some(z =>
        z.items.some(i => i.status === 'MISSING_MEASUREMENT')
      );
      const hasUnpriced = p.zones.some(z =>
        z.items.some(i => i.status === 'NEEDS_PRICING')
      );
      const isLowMargin = p.grossMarginPercent < 38.0;
      const isReviewRequired = p.status === 'REVIEW_REQUIRED' || p.status === 'DRAFT';
      return isReviewRequired || hasMissingMeasurements || hasUnpriced || isLowMargin;
    });
  }, [proposals]);

  const approvedProposalsCount = useMemo(() => {
    return proposals.filter(p => p.status === 'APPROVED').length;
  }, [proposals]);

  // Aggregate recent activities from all proposals
  const recentActivities = useMemo(() => {
    const allLogs: Array<{
      proposalId: string;
      proposalNumber: string;
      clientName: string;
      event: any;
    }> = [];

    proposals.forEach(p => {
      p.auditLogs?.forEach(log => {
        allLogs.push({
          proposalId: p.id,
          proposalNumber: p.proposalNumber,
          clientName: p.clientName,
          event: log
        });
      });
    });

    return allLogs
      .sort((a, b) => new Date(b.event.createdAt).getTime() - new Date(a.event.createdAt).getTime())
      .slice(0, 8);
  }, [proposals]);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Welcome / Header Bar */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              OPERATIONAL HUB
            </span>
            <span className="text-xs text-stone-400">Phoenix Metro Territory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            Greenscape Pro Executive Dashboard
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl">
            Deterministic catalog pricing engine, multi-tier AI scope extraction, and owner approval workflow for residential hardscape & outdoor living.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('new-project')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Site-Walk Project</span>
          </button>
          <button
            onClick={onOpenCatalog}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition"
          >
            Master Catalog
          </button>
          <button
            onClick={onOpenIntegrations}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition"
          >
            Integrations
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Quoted Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2 font-mono">
            ${totalQuotedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center space-x-1 text-[11px] text-stone-500 mt-1">
            <span className="font-semibold text-emerald-700">{proposals.length} active</span>
            <span>proposals in database</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Avg Gross Margin
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 font-mono ${
              avgGrossMargin >= 45.0 ? 'text-emerald-700' : avgGrossMargin >= 38.0 ? 'text-stone-900' : 'text-rose-600'
            }`}
          >
            {avgGrossMargin.toFixed(1)}%
          </p>
          <div className="flex items-center space-x-1 text-[11px] text-stone-500 mt-1">
            <span>Target floor:</span>
            <span className="font-bold text-stone-700">38.0%</span>
            <span>(Optimal: 45%+)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Requires Review
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                proposalsNeedingReview.length > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-stone-50 text-stone-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 font-mono ${
              proposalsNeedingReview.length > 0 ? 'text-amber-700' : 'text-stone-900'
            }`}
          >
            {proposalsNeedingReview.length}
          </p>
          <div className="flex items-center space-x-1 text-[11px] text-stone-500 mt-1">
            <span>Triage queue:</span>
            <span className="font-semibold text-amber-700">Needs pricing/measurements</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Approved Contracts
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2 font-mono">
            {approvedProposalsCount}
          </p>
          <div className="flex items-center space-x-1 text-[11px] text-stone-500 mt-1">
            <span className="font-semibold text-emerald-700">Marcus Tate signed</span>
            <span>& dispatched to CRM</span>
          </div>
        </div>
      </div>

      {/* Priority Action Items / Proposals Requiring Attention */}
      {proposalsNeedingReview.length > 0 && (
        <div className="bg-amber-50/70 rounded-xl border border-amber-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-amber-100/60 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-800" />
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Proposals Requiring Attention ({proposalsNeedingReview.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Review before owner approval sign-off
            </span>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white">
            {proposalsNeedingReview.map(p => {
              const missingCount = p.zones.reduce(
                (acc, z) => acc + z.items.filter(i => i.status === 'MISSING_MEASUREMENT').length,
                0
              );
              const unpricedCount = p.zones.reduce(
                (acc, z) => acc + z.items.filter(i => i.status === 'NEEDS_PRICING').length,
                0
              );
              const isLowMargin = p.grossMarginPercent < 38.0;

              return (
                <div
                  key={p.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {p.proposalNumber}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900">{p.clientName}</h3>
                      <span className="text-xs text-stone-500">• {p.propertyAddress}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {missingCount > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {missingCount} missing measurements
                        </span>
                      )}
                      {unpricedCount > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          {unpricedCount} unpriced items
                        </span>
                      )}
                      {isLowMargin && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Low margin ({p.grossMarginPercent.toFixed(1)}% &lt; 38%)
                        </span>
                      )}
                      {p.discrepancies?.length > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
                          {p.discrepancies.length} site warnings
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        onSelectProposal(p.id);
                        onNavigate('pricing-review');
                      }}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition shadow-xs"
                    >
                      <span>Resolve Pricing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Projects & Proposals vs Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Projects & Proposals Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Proposals Section */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-stone-700" />
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Proposals Pipeline ({proposals.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigate('new-project')}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Proposal</span>
              </button>
            </div>

            <div className="divide-y divide-stone-100 overflow-x-auto">
              {proposals.map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelectProposal(p.id)}
                  className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition hover:bg-stone-50 ${
                    activeProposal?.id === p.id ? 'bg-emerald-50/40 border-l-4 border-emerald-700' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-stone-800">
                        {p.proposalNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-stone-400">v{p.version}</span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 mt-1 truncate">{p.clientName}</h3>
                    <p className="text-xs text-stone-500 truncate flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{p.propertyAddress}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-stone-900 font-mono">
                      ${p.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p
                      className={`text-xs font-semibold font-mono ${
                        p.grossMarginPercent >= 45
                          ? 'text-emerald-700'
                          : p.grossMarginPercent >= 38
                          ? 'text-stone-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {p.grossMarginPercent.toFixed(1)}% margin
                    </p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectProposal(p.id);
                          onNavigate('editor');
                        }}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        Open Editor
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Client Projects */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-stone-700" />
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Client Accounts & Sites ({projects.length})
                </h2>
              </div>
            </div>

            <div className="divide-y divide-stone-100">
              {projects.map(proj => (
                <div
                  key={proj.id}
                  className="p-4 flex items-center justify-between hover:bg-stone-50 transition"
                >
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">{proj.clientName}</h4>
                    <p className="text-xs text-stone-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      <span>{proj.propertyAddress}</span>
                    </p>
                    {proj.targetBudget && (
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Target Budget:{' '}
                        <span className="font-semibold text-stone-800">
                          ${proj.targetBudget.toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const matchedProposal = proposals.find(p => p.projectId === proj.id);
                      if (matchedProposal) {
                        onSelectProposal(matchedProposal.id);
                        onNavigate('editor');
                      } else {
                        onNavigate('new-project');
                      }
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                  >
                    <span>View Project</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Activity Log Stream & Integration Status */}
        <div className="space-y-6">
          {/* Live Activity Stream */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Live Audit Activity
                </h2>
              </div>
              <button
                onClick={() => onNavigate('audit')}
                className="text-[11px] font-bold text-emerald-800 hover:underline"
              >
                View Full Log
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-stone-500 text-center py-4">No recent activity logged.</p>
              ) : (
                recentActivities.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs">
                    <div
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                        item.event.eventType === 'PROPOSAL_APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.event.eventType === 'PROPOSAL_REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : item.event.eventType === 'SCOPE_EXTRACTED_AI'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {item.event.eventType === 'PROPOSAL_APPROVED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : item.event.eventType === 'PROPOSAL_REJECTED' ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Activity className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 truncate">
                          {item.event.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {new Date(item.event.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 truncate mt-0.5">
                        <span className="font-mono font-semibold">{item.proposalNumber}</span> ({item.clientName})
                      </p>
                      {item.event.notes && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 italic">
                          &ldquo;{item.event.notes}&rdquo;
                        </p>
                      )}
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        By {item.event.actorName} ({item.event.actorRole})
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Integration & Health Snapshot */}
          <div className="bg-stone-900 text-stone-100 rounded-xl p-5 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">
                  Integration Health
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                100% OPERATIONAL
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-stone-800/70 border border-stone-700/50">
                <span className="text-stone-300">Slack Webhook (#proposals)</span>
                <span className="text-emerald-400 font-mono font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-stone-800/70 border border-stone-700/50">
                <span className="text-stone-300">GoHighLevel CRM (Pipeline)</span>
                <span className="text-emerald-400 font-mono font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-stone-800/70 border border-stone-700/50">
                <span className="text-stone-300">Gemini Flash Cascade Engine</span>
                <span className="text-emerald-400 font-mono font-semibold">Online</span>
              </div>
            </div>

            <button
              onClick={onOpenIntegrations}
              className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold transition text-center border border-stone-700"
            >
              Test Integrations & View Payloads
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
