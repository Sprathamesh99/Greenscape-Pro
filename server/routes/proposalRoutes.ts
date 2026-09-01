import { Router, Response } from 'express';
import { proposalService } from '../services/proposalService';
import { auditService } from '../services/auditService';
import {
  AnalyzeAndExtractSchema,
  UpdateProposalSchema,
  ApproveProposalSchema,
  RejectProposalSchema,
  RegenerateProposalSchema
} from '../types/api';
import { ProposalStatus } from '../db/types';
import {
  AuthenticatedRequest,
  requireRole,
  aiExtractionRateLimiter,
  approvalRateLimiter
} from '../middleware/security';

const router = Router();

// GET /api/proposals - List proposals with optional status filter
router.get('/', (req, res) => {
  const status = req.query.status as ProposalStatus | undefined;
  const proposals = proposalService.listProposals(status);
  res.json({ success: true, data: proposals });
});

// GET /api/proposals/:id - Get fully hydrated proposal
router.get('/:id', (req, res) => {
  const proposal = proposalService.getProposal(req.params.id);
  if (!proposal) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Proposal not found' } });
  }
  res.json({ success: true, data: proposal });
});

// POST /api/proposals/extract - Process site notes via Gemini AI + Master Catalog Engine (Rate Limited)
router.post('/extract', aiExtractionRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = AnalyzeAndExtractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid extraction input', details: parsed.error.format() }
    });
  }

  const actor = req.user || {
    id: (req.headers['x-user-id'] as string) || 'marcus_tate',
    name: (req.headers['x-user-name'] as string) || 'Marcus Tate',
    role: 'OWNER' as const
  };

  try {
    const proposal = await proposalService.analyzeAndCreateDraft(parsed.data, actor);
    res.status(201).json({ success: true, data: proposal });
  } catch (err: any) {
    console.error('[ProposalRoutes] Extraction Pipeline Error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'AI_PIPELINE_ERROR', message: err?.message || 'Failed to process site notes' }
    });
  }
});

// PUT /api/proposals/:id - Update proposal draft (zones, line items, quantities, narratives)
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = UpdateProposalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid update payload', details: parsed.error.format() }
    });
  }

  const actor = req.user || {
    id: (req.headers['x-user-id'] as string) || 'marcus_tate',
    name: (req.headers['x-user-name'] as string) || 'Marcus Tate',
    role: 'OWNER' as const
  };

  try {
    const updated = await proposalService.updateProposal(req.params.id, parsed.data, actor);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: err?.message || 'Failed to update proposal' }
    });
  }
});

// POST /api/proposals/:id/approve - Approve proposal (Restricted to OWNER role & Rate Limited)
router.post(
  '/:id/approve',
  approvalRateLimiter,
  requireRole('OWNER'),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = ApproveProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid approval payload', details: parsed.error.format() }
      });
    }

    const actor = req.user || {
      id: 'marcus_tate',
      name: parsed.data.approverName || 'Marcus Tate',
      role: 'OWNER' as const
    };

    try {
      const approved = await proposalService.approveProposal(req.params.id, parsed.data, actor);
      res.json({ success: true, data: approved, message: 'Proposal approved and synced with Slack & GHL' });
    } catch (err: any) {
      const msg: string = err?.message || 'Approval conditions not met';
      let statusCode = 422;
      let errorCode = 'APPROVAL_FAILED';

      if (msg.includes('Authorization Denied') || msg.includes('Automated AI') || msg.includes('strictly forbidden')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN_AI_APPROVAL';
      } else if (msg.includes('Duplicate Approval') || msg.includes('already approved')) {
        statusCode = 409;
        errorCode = 'DUPLICATE_APPROVAL_CONFLICT';
      }

      res.status(statusCode).json({
        success: false,
        error: { code: errorCode, message: msg }
      });
    }
  }
);

// POST /api/proposals/:id/reject - Reject proposal (Moves to REVISIONS_REQUIRED)
router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = RejectProposalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid rejection payload', details: parsed.error.format() }
    });
  }

  const actor = req.user || {
    id: (req.headers['x-user-id'] as string) || 'marcus_tate',
    name: parsed.data.reviewerName || 'Marcus Tate',
    role: 'OWNER' as const
  };

  try {
    const rejected = await proposalService.rejectProposal(req.params.id, parsed.data, actor);
    res.json({ success: true, data: rejected, message: 'Proposal marked as REVISIONS_REQUIRED' });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REJECTION_FAILED', message: err?.message || 'Rejection failed' }
    });
  }
});

// POST /api/proposals/:id/regenerate - Regenerate scope with AI (Rate Limited)
router.post(
  '/:id/regenerate',
  aiExtractionRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = RegenerateProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid regenerate payload', details: parsed.error.format() }
      });
    }

    const actor = req.user || {
      id: (req.headers['x-user-id'] as string) || 'marcus_tate',
      name: (req.headers['x-user-name'] as string) || 'Marcus Tate',
      role: 'OWNER' as const
    };

    try {
      const regenerated = await proposalService.regenerateProposal(req.params.id, parsed.data, actor);
      res.json({ success: true, data: regenerated, message: 'Proposal scope regenerated' });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'REGENERATION_FAILED', message: err?.message || 'Failed to regenerate proposal' }
      });
    }
  }
);

// GET /api/proposals/:id/audit-history - Get immutable audit logs
router.get('/:id/audit-history', (req, res) => {
  const logs = auditService.getHistory(req.params.id);
  res.json({ success: true, data: logs });
});

export default router;

