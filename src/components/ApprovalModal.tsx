import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { HydratedProposal } from '../types';

interface ApprovalModalProps {
  proposal: HydratedProposal;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { approverName: string; notes?: string; bypassMarginWarning: boolean }) => Promise<void>;
  isApproving: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  proposal,
  isOpen,
  onClose,
  onConfirm,
  isApproving
}) => {
  const [approverName, setApproverName] = useState('Marcus Tate');
  const [notes, setNotes] = useState('Reviewed scope, sub-base specifications, and margin threshold. Approved for client delivery.');
  const [bypassMarginWarning, setBypassMarginWarning] = useState(false);

  if (!isOpen) return null;

  const isLowMargin = proposal.grossMarginPercent < 38.0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLowMargin && !bypassMarginWarning) return;
    onConfirm({ approverName, notes, bypassMarginWarning });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-stone-900 text-stone-100 p-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-emerald-800 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-50">Marcus Tate: Proposal Approval Gate</h3>
              <p className="text-[11px] text-stone-400 font-mono">Proposal {proposal.proposalNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-500">Client / Property:</span>
              <span className="font-semibold text-stone-900">{proposal.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Contract Total:</span>
              <span className="font-bold text-stone-900 font-mono">
                ${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Gross Margin:</span>
              <span
                className={`font-bold font-mono ${
                  isLowMargin ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {proposal.grossMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {isLowMargin && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900">
                <span className="font-bold">Margin Warning:</span> The current gross margin is below the Greenscape Pro target floor of 38.0%.
                <label className="flex items-center space-x-2 mt-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={bypassMarginWarning}
                    onChange={e => setBypassMarginWarning(e.target.checked)}
                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>I acknowledge and confirm owner margin override</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Authorized Approver (Owner)
            </label>
            <input
              type="text"
              required
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Approval Sign-Off Notes / Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg border border-stone-300"
            />
          </div>

          <div className="text-[11px] text-stone-500 bg-stone-100 p-2.5 rounded border border-stone-200">
            <span className="font-semibold text-stone-700">Automated Dispatch:</span> Approving will freeze this proposal version, append to the audit log, dispatch a Slack notification to #proposals-draft, and advance the GoHighLevel CRM opportunity stage.
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isApproving || (isLowMargin && !bypassMarginWarning)}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm disabled:opacity-50 transition"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Owner Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
