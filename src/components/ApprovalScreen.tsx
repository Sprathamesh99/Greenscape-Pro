import React, { useState } from 'react';
import {
  HydratedProposal,
  ScreenMode
} from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Send,
  Loader2,
  DollarSign,
  TrendingUp,
  FileCheck,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface ApprovalScreenProps {
  proposal: HydratedProposal;
  onApprove: (payload: { approverName: string; notes?: string; bypassMarginWarning: boolean }) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onNavigate: (screen: ScreenMode) => void;
  isApproving: boolean;
}

export const ApprovalScreen: React.FC<ApprovalScreenProps> = ({
  proposal,
  onApprove,
  onReject,
  onNavigate,
  isApproving
}) => {
  const [approverName, setApproverName] = useState('Marcus Tate');
  const [approverRole, setApproverRole] = useState<'OWNER' | 'ESTIMATOR' | 'PROJECT_MANAGER'>('OWNER');
  const [notes, setNotes] = useState(
    'Scope reviewed against sub-base requirements and catalog unit rates. Approved for customer delivery.'
  );
  const [bypassMarginWarning, setBypassMarginWarning] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  // Pre-flight checks
  const missingMeasurementsCount = proposal.zones.reduce(
    (acc, z) => acc + z.items.filter(i => i.status === 'MISSING_MEASUREMENT').length,
    0
  );
  const unpricedItemsCount = proposal.zones.reduce(
    (acc, z) => acc + z.items.filter(i => i.status === 'NEEDS_PRICING').length,
    0
  );
  const isLowMargin = proposal.grossMarginPercent < 38.0;
  const isApproved = proposal.status === 'APPROVED';
  const isRejected = proposal.status === 'REJECTED';

  const canApprove =
    missingMeasurementsCount === 0 &&
    unpricedItemsCount === 0 &&
    (!isLowMargin || bypassMarginWarning);

  const handleTriggerApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canApprove) return;
    setShowApproveConfirm(true);
  };

  const handleExecuteApprove = async () => {
    setShowApproveConfirm(false);
    await onApprove({
      approverName,
      notes,
      bypassMarginWarning
    });
  };

  const handleExecuteReject = async () => {
    if (!rejectionReason.trim()) return;
    setShowRejectModal(false);
    await onReject(rejectionReason.trim());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              OWNER APPROVAL GATE
            </span>
            <span className="text-xs text-stone-400 font-mono">{proposal.proposalNumber}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-50 mt-1">
            Marcus Tate Sign-Off Terminal
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-xl">
            Authorize proposal contract. Approval freezes version, assigns owner stamp, and automatically dispatches webhooks to Slack and GoHighLevel CRM.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isApproved
                ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                : isRejected
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            Status: {proposal.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Contract Financial Overview Card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-6 space-y-6">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Financial & Margin Health Metrics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Grand Total</span>
            <p className="text-xl font-bold text-stone-900 font-mono mt-1">
              ${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-stone-500">Includes all taxes & fees</span>
          </div>

          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Scope Subtotal</span>
            <p className="text-xl font-bold text-stone-800 font-mono mt-1">
              ${proposal.subtotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-stone-500">Client sell price</span>
          </div>

          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Direct Cost</span>
            <p className="text-xl font-bold text-stone-700 font-mono mt-1">
              ${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-stone-500">Trade fulfillment cost</span>
          </div>

          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Gross Margin %</span>
            <p
              className={`text-xl font-bold font-mono mt-1 ${
                isLowMargin ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {proposal.grossMarginPercent.toFixed(1)}%
            </p>
            <span className="text-[10px] text-stone-500">Floor target: 38.0%</span>
          </div>
        </div>
      </div>

      {/* Pre-Flight Checklist Card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-6 space-y-4">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Pre-Flight Quality Checklist
        </h2>

        <div className="space-y-3">
          {/* Check 1: Missing Measurements */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
            <div className="flex items-center space-x-2.5">
              {missingMeasurementsCount === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-bold text-stone-900 block">Dimension & Measurement Verification</span>
                <span className="text-stone-500 text-[11px]">
                  {missingMeasurementsCount === 0
                    ? 'All line items contain verified dimensions & quantities'
                    : `${missingMeasurementsCount} items are missing field measurements`}
                </span>
              </div>
            </div>
            {missingMeasurementsCount > 0 && (
              <button
                onClick={() => onNavigate('pricing-review')}
                className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-[11px] font-bold"
              >
                Resolve &rarr;
              </button>
            )}
          </div>

          {/* Check 2: Unpriced Items */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
            <div className="flex items-center space-x-2.5">
              {unpricedItemsCount === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <span className="font-bold text-stone-900 block">Master Catalog SKU Pricing</span>
                <span className="text-stone-500 text-[11px]">
                  {unpricedItemsCount === 0
                    ? '100% of line items matched to active Phoenix price book rates'
                    : `${unpricedItemsCount} items require price book assignment`}
                </span>
              </div>
            </div>
            {unpricedItemsCount > 0 && (
              <button
                onClick={() => onNavigate('pricing-review')}
                className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 text-[11px] font-bold"
              >
                Resolve &rarr;
              </button>
            )}
          </div>

          {/* Check 3: Margin Floor */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
            <div className="flex items-center space-x-2.5">
              {!isLowMargin ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <span className="font-bold text-stone-900 block">Gross Margin Floor (38.0%)</span>
                <span className="text-stone-500 text-[11px]">
                  Current proposal margin is{' '}
                  <span className="font-bold font-mono">{proposal.grossMarginPercent.toFixed(1)}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Margin Warning & Explicit Override Checkbox */}
        {isLowMargin && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-3 text-xs text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <span className="font-bold block">Low Margin Warning:</span>
              <p className="leading-relaxed">
                The proposal gross margin is {proposal.grossMarginPercent.toFixed(1)}%, which is below Greenscape Pro&apos;s standard 38.0% threshold.
              </p>
              <label className="flex items-center space-x-2 cursor-pointer font-bold pt-1">
                <input
                  type="checkbox"
                  checked={bypassMarginWarning}
                  onChange={e => setBypassMarginWarning(e.target.checked)}
                  className="rounded border-rose-300 text-rose-700 focus:ring-rose-500"
                />
                <span>I am Marcus Tate and explicitly authorize this owner margin override</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Sign-Off Authorization Form */}
      {!isApproved ? (
        <form
          onSubmit={handleTriggerApprove}
          className="bg-white rounded-xl border border-stone-200 shadow-xs p-6 space-y-6"
        >
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Authorization & Digital Stamp
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Authorized Approver Name
              </label>
              <input
                type="text"
                required
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Approver Role
              </label>
              <select
                value={approverRole}
                onChange={e => setApproverRole(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white font-medium"
              >
                <option value="OWNER">Owner (Marcus Tate)</option>
                <option value="ESTIMATOR">Senior Estimator</option>
                <option value="PROJECT_MANAGER">Lead Project Manager</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Sign-Off Review Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
            >
              Reject / Request Field Revision
            </button>

            <button
              type="submit"
              disabled={!canApprove || isApproving}
              className={`w-full sm:w-auto px-8 py-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 text-white shadow-sm transition ${
                canApprove && !isApproving
                  ? 'bg-emerald-800 hover:bg-emerald-900 cursor-pointer'
                  : 'bg-stone-400 cursor-not-allowed'
              }`}
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing & Dispatching...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Authorize & Dispatch to Slack/GHL</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Approved Status Banner */
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
          <h3 className="text-base font-bold text-emerald-950">Proposal Contract Officially Approved</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            Approved by <span className="font-semibold">{proposal.approvedBy || 'Marcus Tate'}</span> on{' '}
            {proposal.approvedAt ? new Date(proposal.approvedAt).toLocaleDateString() : 'Today'}. Dispatched to Slack (#proposals) and GoHighLevel CRM.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => onNavigate('editor')}
              className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 transition"
            >
              View Document Preview
            </button>
            <button
              onClick={() => onNavigate('audit')}
              className="px-4 py-2 rounded-lg bg-stone-100 text-stone-800 text-xs font-semibold hover:bg-stone-200 transition"
            >
              View Dispatch History & Webhooks
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Approval */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        title="Confirm Proposal Approval"
        message={`Are you sure you want to approve proposal ${proposal.proposalNumber} for ${proposal.clientName} ($${proposal.grandTotal.toLocaleString()})? This will seal the contract and trigger live Slack and GoHighLevel webhook dispatches.`}
        confirmLabel="Approve & Dispatch"
        variant="primary"
        onConfirm={handleExecuteApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Rejection Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-stone-200">
            <div className="flex items-center space-x-2 text-rose-700">
              <XCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold">Reject Proposal for Revision</h3>
            </div>
            <p className="text-xs text-stone-600">
              Please enter the clear revision reason (e.g. invalid sub-base depth, missing electrical hookup):
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Enter revision instructions..."
              className="w-full p-2.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleExecuteReject}
                className="px-4 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
