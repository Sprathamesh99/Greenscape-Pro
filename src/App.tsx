import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardScreen } from './components/DashboardScreen';
import { NewProjectScreen } from './components/NewProjectScreen';
import { AIAnalysisScreen } from './components/AIAnalysisScreen';
import { PricingReviewScreen } from './components/PricingReviewScreen';
import { ProposalEditorScreen } from './components/ProposalEditorScreen';
import { ApprovalScreen } from './components/ApprovalScreen';
import { AuditHistoryScreen } from './components/AuditHistoryScreen';
import { PriceCatalogModal } from './components/PriceCatalogModal';
import { IntegrationStatusModal } from './components/IntegrationStatusModal';
import { SecurityReviewModal } from './components/SecurityReviewModal';
import { QATestSuiteModal } from './components/QATestSuiteModal';
import {
  HydratedProposal,
  PricingCatalogItem,
  Project,
  ScreenMode
} from './types';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenMode>('dashboard');
  const [proposals, setProposals] = useState<HydratedProposal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<PricingCatalogItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);

  useEffect(() => {
    loadCatalog();
    loadProposals();
    loadProjects();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/pricing/catalog');
      const data = await res.json();
      if (data.success) {
        setCatalog(data.data);
      }
    } catch (err) {
      console.error('Failed to load pricing catalog', err);
    }
  };

  const loadProposals = async () => {
    try {
      const res = await fetch('/api/proposals');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setProposals(data.data);
        if (!activeProposalId) {
          setActiveProposalId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load proposals', err);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const handleAnalyzeNotes = async (payload: {
    clientName: string;
    propertyAddress: string;
    clientEmail?: string;
    clientPhone?: string;
    targetBudget?: number;
    rawNotes: string;
  }) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/proposals/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to analyze site notes');
      }

      setProposals(prev => [data.data, ...prev]);
      setActiveProposalId(data.data.id);
      showToast(`Proposal ${data.data.proposalNumber} extracted! Reviewing trade zones.`);
      // Move to AI Analysis review screen
      setCurrentScreen('ai-analysis');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateProposal = async (updated: HydratedProposal) => {
    // Update local state immediately for snappy UI
    setProposals(prev => prev.map(p => (p.id === updated.id ? updated : p)));

    try {
      const res = await fetch(`/api/proposals/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectOverview: updated.projectOverview,
          siteAccessNotes: updated.siteAccessNotes,
          taxRate: updated.taxRate,
          zones: updated.zones
        })
      });
      const data = await res.json();
      if (data.success) {
        setProposals(prev => prev.map(p => (p.id === updated.id ? data.data : p)));
      }
    } catch (err: any) {
      console.error('Sync failed', err);
    }
  };

  const handleConfirmApproval = async (payload: {
    approverName: string;
    notes?: string;
    bypassMarginWarning: boolean;
  }) => {
    if (!activeProposal) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/proposals/${activeProposal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverName: payload.approverName,
          approverRole: 'OWNER',
          notes: payload.notes,
          bypassMarginWarning: payload.bypassMarginWarning
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Approval conditions not met');
      }

      setProposals(prev => prev.map(p => (p.id === activeProposal.id ? data.data : p)));
      showToast(`Proposal ${data.data.proposalNumber} approved & dispatched to Slack/GHL!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!activeProposal) return;

    try {
      const res = await fetch(`/api/proposals/${activeProposal.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: 'Marcus Tate', rejectionReason: reason })
      });
      const data = await res.json();
      if (data.success) {
        setProposals(prev => prev.map(p => (p.id === activeProposal.id ? data.data : p)));
        showToast(`Proposal marked as rejected: ${reason}`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRegenerate = async () => {
    if (!activeProposal) return;
    const additional = prompt('Enter additional instructions for Gemini AI (or leave blank to re-run):');

    try {
      const res = await fetch(`/api/proposals/${activeProposal.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalInstructions: additional || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setProposals(prev => prev.map(p => (p.id === activeProposal.id ? data.data : p)));
        showToast(`Proposal scope regenerated with AI (Version ${data.data.version})`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRetryWebhook = async (service: 'slack' | 'ghl') => {
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Webhook for ${service.toUpperCase()} dispatched successfully.`);
      } else {
        showToast(`Failed to dispatch ${service} webhook`, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const activeProposal = proposals.find(p => p.id === activeProposalId) || proposals[0] || null;

  // Build projects list fallback from proposals if DB projects list is empty
  const effectiveProjects: Project[] =
    projects.length > 0
      ? projects
      : proposals.map(p => ({
          id: p.projectId,
          clientName: p.clientName,
          propertyAddress: p.propertyAddress,
          clientEmail: p.clientEmail,
          clientPhone: p.clientPhone,
          targetBudget: p.targetBudget,
          createdAt: p.createdAt,
          updatedAt: p.createdAt
        }));

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-emerald-800 selection:text-white">
      {/* Universal Header with 7 Screen Navigation Tabs */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onOpenCatalog={() => setIsCatalogModalOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        onOpenQA={() => setIsQAModalOpen(true)}
        proposals={proposals}
        activeProposal={activeProposal}
        onSelectProposal={id => {
          setActiveProposalId(id);
        }}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl border flex items-center space-x-2.5 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-stone-900 text-emerald-300 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Screen Router Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            proposals={proposals}
            projects={effectiveProjects}
            activeProposal={activeProposal}
            onSelectProposal={id => {
              setActiveProposalId(id);
            }}
            onNavigate={setCurrentScreen}
            onOpenCatalog={() => setIsCatalogModalOpen(true)}
            onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
          />
        )}

        {currentScreen === 'new-project' && (
          <NewProjectScreen
            onAnalyze={handleAnalyzeNotes}
            isAnalyzing={isAnalyzing}
          />
        )}

        {currentScreen === 'ai-analysis' && activeProposal && (
          <AIAnalysisScreen
            proposal={activeProposal}
            onUpdateProposal={handleUpdateProposal}
            onNavigate={setCurrentScreen}
            onRegenerate={handleRegenerate}
          />
        )}

        {currentScreen === 'pricing-review' && activeProposal && (
          <PricingReviewScreen
            proposal={activeProposal}
            catalog={catalog}
            onUpdateProposal={handleUpdateProposal}
            onNavigate={setCurrentScreen}
            onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
          />
        )}

        {currentScreen === 'editor' && activeProposal && (
          <ProposalEditorScreen
            proposal={activeProposal}
            catalog={catalog}
            onUpdateProposal={handleUpdateProposal}
            onNavigate={setCurrentScreen}
            onApproveClick={() => setCurrentScreen('approval')}
            onRejectClick={() => setCurrentScreen('approval')}
            onRegenerateClick={handleRegenerate}
          />
        )}

        {currentScreen === 'approval' && activeProposal && (
          <ApprovalScreen
            proposal={activeProposal}
            onApprove={handleConfirmApproval}
            onReject={handleReject}
            onNavigate={setCurrentScreen}
            isApproving={isApproving}
          />
        )}

        {currentScreen === 'audit' && activeProposal && (
          <AuditHistoryScreen
            proposal={activeProposal}
            onNavigate={setCurrentScreen}
            onRetryWebhook={handleRetryWebhook}
          />
        )}
      </main>

      {/* Global Modals */}
      <PriceCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalog={catalog}
      />

      <IntegrationStatusModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
      />

      <SecurityReviewModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <QATestSuiteModal
        isOpen={isQAModalOpen}
        onClose={() => setIsQAModalOpen(false)}
      />
    </div>
  );
}
