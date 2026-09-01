import { Router } from 'express';
import { auditService } from '../services/auditService';
import { runSecurityAuditSuite } from '../services/security.test';

const router = Router();

// GET /api/audit-logs/security-review - Run live production security audit test suite
router.get('/security-review', async (req, res) => {
  try {
    const report = await runSecurityAuditSuite();
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err?.message || 'Security test failure' } });
  }
});

// GET /api/audit-logs/:proposalId - Get proposal audit history
router.get('/:proposalId', (req, res) => {
  const logs = auditService.getHistory(req.params.proposalId);
  res.json({ success: true, data: logs });
});

export default router;
