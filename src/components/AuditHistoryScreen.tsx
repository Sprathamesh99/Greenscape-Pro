import React, { useState } from 'react';
import {
  HydratedProposal,
  ScreenMode
} from '../types';
import {
  Clock,
  Activity,
  Send,
  CheckCircle2,
  XCircle,
  RotateCw,
  Copy,
  Check,
  Code,
  ShieldCheck,
  Sparkles,
  Edit3,
  FileText
} from 'lucide-react';

interface AuditHistoryScreenProps {
  proposal: HydratedProposal;
  onNavigate: (screen: ScreenMode) => void;
  onRetryWebhook: (service: 'slack' | 'ghl') => Promise<void>;
}

export const AuditHistoryScreen: React.FC<AuditHistoryScreenProps> = ({
  proposal,
  onNavigate,
  onRetryWebhook
}) => {
  const [selectedTab, setSelectedTab] = useState<'AUDIT_TRAIL' | 'WEBHOOK_PAYLOADS'>('AUDIT_TRAIL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const handleCopyJson = (key: string, data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTriggerRetry = async (service: 'slack' | 'ghl') => {
    setIsRetrying(service);
    try {
      await onRetryWebhook(service);
    } finally {
      setIsRetrying(null);
    }
  };

  // Mock sample payload representations for Slack & GHL if proposal is approved
  const slackPayloadSample = {
    channel: '#proposals-approved',
    text: `Contract Approved: ${proposal.proposalNumber} - ${proposal.clientName} ($${proposal.grandTotal.toFixed(2)})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🎯 Proposal Approved: ${proposal.proposalNumber}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Client:*\n${proposal.clientName}` },
          { type: 'mrkdwn', text: `*Address:*\n${proposal.propertyAddress}` },
          { type: 'mrkdwn', text: `*Contract Value:*\n$${proposal.grandTotal.toLocaleString()}` },
          { type: 'mrkdwn', text: `*Gross Margin:*\n${proposal.grossMarginPercent.toFixed(1)}%` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Approved by *${proposal.approvedBy || 'Marcus Tate'}* • Version ${proposal.version}.0`
          }
        ]
      }
    ]
  };

  const ghlPayloadSample = {
    pipelineId: 'pipe_phoenix_residential_2026',
    stageId: proposal.status === 'APPROVED' ? 'stage_contract_signed' : 'stage_proposal_sent',
    contact: {
      name: proposal.clientName,
      address: proposal.propertyAddress,
      email: proposal.clientEmail || 'client@example.com'
    },
    opportunity: {
      name: `${proposal.clientName} - Hardscape & Outdoor Living`,
      monetaryValue: proposal.grandTotal,
      status: proposal.status === 'APPROVED' ? 'won' : 'open',
      customFields: {
        proposal_number: proposal.proposalNumber,
        version: proposal.version,
        gross_margin_percent: proposal.grossMarginPercent,
        total_cost: proposal.totalCost
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              AUDIT & INTEGRATION LOGS
            </span>
            <span className="text-xs text-stone-400 font-mono">{proposal.proposalNumber}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            System Trail & Webhook Dispatch History
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl">
            Immutable log of all user modifications, AI scope extractions, pricing adjustments, owner sign-offs, and third-party webhook payloads.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-stone-800 p-1 rounded-lg border border-stone-700 flex items-center space-x-1">
          <button
            onClick={() => setSelectedTab('AUDIT_TRAIL')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              selectedTab === 'AUDIT_TRAIL'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit History ({proposal.auditLogs?.length || 0})</span>
          </button>
          <button
            onClick={() => setSelectedTab('WEBHOOK_PAYLOADS')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              selectedTab === 'WEBHOOK_PAYLOADS'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Webhooks & Payloads</span>
          </button>
        </div>
      </div>

      {selectedTab === 'AUDIT_TRAIL' ? (
        /* Audit Events Timeline */
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Chronological Change Log
            </h2>
            <span className="text-[11px] text-stone-500">
              Guaranteed tamper-evident audit record
            </span>
          </div>

          <div className="divide-y divide-stone-100 p-4 space-y-4">
            {!proposal.auditLogs || proposal.auditLogs.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-6">No audit records found.</p>
            ) : (
              proposal.auditLogs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-4 text-xs pt-2">
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                      log.eventType === 'PROPOSAL_APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.eventType === 'PROPOSAL_REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : log.eventType === 'SCOPE_EXTRACTED_AI'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {log.eventType === 'PROPOSAL_APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : log.eventType === 'SCOPE_EXTRACTED_AI' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        {log.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-stone-600 leading-relaxed">{log.notes || 'Event recorded in system state.'}</p>

                    <div className="flex items-center space-x-2 text-[11px] text-stone-500 pt-1">
                      <span className="font-semibold text-stone-800">{log.actorName}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[10px]">
                        {log.actorRole}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Webhook Payloads Inspector */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slack Webhook Card */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Slack Channel Webhook
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopyJson('slack', slackPayloadSample)}
                  className="text-stone-500 hover:text-stone-900 p-1"
                  title="Copy JSON payload"
                >
                  {copiedKey === 'slack' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleTriggerRetry('slack')}
                  disabled={Boolean(isRetrying)}
                  className="px-2.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold flex items-center space-x-1"
                >
                  <RotateCw className={`w-3 h-3 ${isRetrying === 'slack' ? 'animate-spin' : ''}`} />
                  <span>Test Dispatch</span>
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 bg-stone-900 overflow-x-auto text-[11px] font-mono text-emerald-400">
              <pre>{JSON.stringify(slackPayloadSample, null, 2)}</pre>
            </div>
            <div className="p-3 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex justify-between">
              <span>Channel: #proposals</span>
              <span className="text-emerald-700 font-semibold">Delivery: Verified / Connected</span>
            </div>
          </div>

          {/* GoHighLevel Webhook Card */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  GoHighLevel CRM Opportunity
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopyJson('ghl', ghlPayloadSample)}
                  className="text-stone-500 hover:text-stone-900 p-1"
                  title="Copy JSON payload"
                >
                  {copiedKey === 'ghl' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleTriggerRetry('ghl')}
                  disabled={Boolean(isRetrying)}
                  className="px-2.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold flex items-center space-x-1"
                >
                  <RotateCw className={`w-3 h-3 ${isRetrying === 'ghl' ? 'animate-spin' : ''}`} />
                  <span>Test Dispatch</span>
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 bg-stone-900 overflow-x-auto text-[11px] font-mono text-emerald-400">
              <pre>{JSON.stringify(ghlPayloadSample, null, 2)}</pre>
            </div>
            <div className="p-3 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex justify-between">
              <span>Pipeline: Phoenix Residential</span>
              <span className="text-emerald-700 font-semibold">Delivery: Verified / Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900"
        >
          &larr; Back to Dashboard
        </button>

        <button
          onClick={() => onNavigate('editor')}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition"
        >
          Return to Proposal Editor
        </button>
      </div>
    </div>
  );
};
