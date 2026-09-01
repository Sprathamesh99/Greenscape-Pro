import { Router } from 'express';
import { slackAdapter } from '../services/integrations/slackAdapter';
import { ghlService } from '../services/integrations/ghlAdapter';
import { config } from '../config/env';
import { db } from '../db';
import { CRMNotificationPayload } from '../services/integrations/types';
import { AuthenticatedRequest, requireRole, createRateLimiter } from '../middleware/security';

const router = Router();

const integrationTestRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Integration test alert rate limit reached. Please wait before testing again.',
  keyPrefix: 'int-test'
});

// GET /api/integrations/status - Check integration connectivity configuration
router.get('/status', async (req, res) => {
  const ghlConn = await ghlService.testConnection();

  res.json({
    success: true,
    data: {
      slack: {
        configured: Boolean(config.slackWebhookUrl),
        targetChannel: '#proposals-draft',
        status: config.slackWebhookUrl ? 'CONNECTED_LIVE' : 'MOCK_BOUNDARY_ACTIVE',
        details: config.slackWebhookUrl
          ? 'Live Slack incoming webhook configured and active'
          : 'MOCK BOUNDARY: SLACK_WEBHOOK_URL not configured. Payloads formatted and logged at boundary.'
      },
      ghl: {
        configured: Boolean(config.ghlWebhookUrl || config.ghlApiKey),
        mode: ghlConn.mode,
        status: ghlConn.connected ? 'CONNECTED_LIVE' : 'MOCK_BOUNDARY_ACTIVE',
        pipeline: 'Phoenix High-End Residential Hardscapes',
        details: ghlConn.message
      },
      gemini: {
        model: 'gemini-3.7-flash',
        thinkingLevel: 'HIGH',
        configured: Boolean(config.geminiApiKey),
        status: config.geminiApiKey ? 'ONLINE_LIVE' : 'FALLBACK_HEURISTIC_PARSER',
        details: config.geminiApiKey ? 'Direct Google Gen AI SDK integration' : 'Operating with deterministic fallback parser'
      }
    }
  });
});

// GET /api/integrations/events - List all integration outbox events
router.get('/events', (req, res) => {
  const proposalId = req.query.proposalId as string | undefined;
  const events = db.listIntegrationEvents(proposalId);
  res.json({ success: true, data: events });
});

// POST /api/integrations/events/:id/retry - Retry a failed integration event (Staff only)
router.post('/events/:id/retry', requireRole('OWNER', 'ADMIN', 'STAFF'), async (req: AuthenticatedRequest, res) => {
  const event = db.getIntegrationEvent(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration event not found' } });
  }

  const proposal = db.getHydratedProposal(event.proposalId);
  if (!proposal) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Associated proposal not found' } });
  }

  const notificationPayload: CRMNotificationPayload = {
    proposalId: proposal.id,
    proposalNumber: proposal.proposalNumber,
    version: proposal.version,
    clientName: proposal.clientName,
    propertyAddress: proposal.propertyAddress,
    clientEmail: proposal.clientEmail,
    clientPhone: proposal.clientPhone,
    contractTotal: proposal.grandTotal,
    subtotalPrice: proposal.subtotalPrice,
    taxAmount: proposal.taxAmount,
    grossProfit: proposal.grossProfit,
    grossMarginPercent: proposal.grossMarginPercent,
    status: proposal.status,
    approvedBy: proposal.approvedBy,
    approvedAt: proposal.approvedAt,
    proposalUrl: `${config.appUrl}/?proposalId=${proposal.id}`,
    idempotencyKey: `retry_${event.id}_${Date.now()}`
  };

  if (event.targetSystem === 'SLACK') {
    const slackResult = await slackAdapter.sendProposalAlert(notificationPayload);
    const updated = db.updateIntegrationEvent(event.id, {
      status: slackResult.status,
      requestPayload: slackResult.payloadSent,
      responsePayload: slackResult.responseReceived,
      errorMessage: slackResult.success ? undefined : slackResult.message,
      retryCount: event.retryCount + 1
    });
    return res.json({ success: slackResult.success, data: updated, result: slackResult });
  }

  if (event.targetSystem === 'GHL') {
    const ghlResult = await ghlService.syncOpportunity(notificationPayload);
    const updated = db.updateIntegrationEvent(event.id, {
      status: ghlResult.status,
      requestPayload: ghlResult.payloadSent,
      responsePayload: ghlResult.responseReceived,
      errorMessage: ghlResult.success ? undefined : ghlResult.message,
      retryCount: event.retryCount + 1
    });
    return res.json({ success: ghlResult.success, data: updated, result: ghlResult });
  }

  res.status(400).json({ success: false, error: { message: `Unsupported target system ${event.targetSystem}` } });
});

// POST /api/integrations/test - Send test alert (Restricted to OWNER and rate limited)
router.post('/test', integrationTestRateLimiter, requireRole('OWNER'), async (req: AuthenticatedRequest, res) => {
  const service = req.body.service || 'slack';

  const testPayload: CRMNotificationPayload = {
    proposalId: 'prop-test-01',
    proposalNumber: 'GP-2026-TEST',
    version: 1,
    clientName: 'Sarah Jenkins (Test Client)',
    propertyAddress: '5500 E Camelback Rd, Paradise Valley, AZ 85253',
    clientEmail: 'sjenkins@example.com',
    clientPhone: '(480) 555-0122',
    contractTotal: 48500,
    subtotalPrice: 44659.30,
    taxAmount: 3840.70,
    grossProfit: 25705.00,
    grossMarginPercent: 57.56,
    status: 'APPROVED',
    approvedBy: 'Marcus Tate',
    approverRole: 'OWNER',
    approvedAt: new Date().toISOString(),
    proposalUrl: `${config.appUrl}/?proposalId=prop-test-01`,
    idempotencyKey: `test_${Date.now()}`
  };

  if (service === 'slack') {
    const result = await slackAdapter.sendProposalAlert(testPayload);
    return res.json({ success: result.success, data: result });
  } else if (service === 'ghl') {
    const result = await ghlService.syncOpportunity(testPayload);
    return res.json({ success: result.success, data: result });
  }

  res.status(400).json({ success: false, error: { message: 'Service must be slack or ghl' } });
});

export default router;
