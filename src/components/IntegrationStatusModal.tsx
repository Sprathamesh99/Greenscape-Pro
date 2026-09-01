import React, { useState, useEffect } from 'react';
import { Activity, X, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface IntegrationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationStatusModal: React.FC<IntegrationStatusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data.data);
      }
    } catch (err) {
      console.error('Failed to load integration status', err);
    }
  };

  const handleTestSlack = async () => {
    setIsTestingSlack(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integrations/test-slack', { method: 'POST' });
      const data = await res.json();
      setTestResult(data.data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingSlack(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-stone-900 text-stone-100 p-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-emerald-800 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-50">Integrations & Webhook Dispatch Monitor</h3>
              <p className="text-xs text-stone-400">Decoupled Adapter Health & Real-Time Sync Status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Gemini AI Status */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-stone-900 text-sm">Google Gemini Flash Cascade</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {statusData?.gemini?.status || 'ONLINE'}
                </span>
              </div>
              <p className="text-stone-600 mt-1">
                Engine: <span className="font-semibold text-stone-800">Multi-Model High-Availability Cascade (Flash 2.5 / 3.7 / Lite)</span>
              </p>
              <p className="text-[11px] text-stone-500">
                Zero-Price Isolation Policy strictly active with automatic 503/429 failover.
              </p>
            </div>
          </div>

          {/* Slack Webhook Status */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-stone-900 text-sm">Slack BlockKit Webhook</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {statusData?.slack?.status || 'SIMULATED'}
                </span>
              </div>
              <button
                onClick={handleTestSlack}
                disabled={isTestingSlack}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition"
              >
                <Send className="w-3 h-3" />
                <span>{isTestingSlack ? 'Sending...' : 'Test Slack Dispatch'}</span>
              </button>
            </div>
            <p className="text-stone-600">
              Target Channel: <span className="font-mono font-semibold text-stone-800">#proposals-draft</span>
            </p>
            {testResult && (
              <div className={`p-2 rounded mt-2 text-[11px] ${testResult.success ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900'}`}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* GoHighLevel CRM Status */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-stone-900 text-sm">GoHighLevel (GHL) CRM</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {statusData?.ghl?.status || 'SIMULATED'}
              </span>
            </div>
            <p className="text-stone-600 mt-1">
              Active Pipeline: <span className="font-semibold text-stone-800">Phoenix High-End Residential Hardscapes</span>
            </p>
            <p className="text-[11px] text-stone-500">
              Automatically advances lead opportunity to "Proposal Approved" stage upon Marcus sign-off.
            </p>
          </div>
        </div>

        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
