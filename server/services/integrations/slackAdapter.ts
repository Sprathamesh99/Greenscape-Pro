import { config } from '../../config/env';
import { INotificationAdapter, CRMNotificationPayload, IntegrationResult } from './types';
import { fetchWithTimeout, executeWithRetry, sanitizeForLogging, sanitizeUrl } from './utils';

export class SlackAdapter implements INotificationAdapter {
  private webhookUrl: string | undefined;

  constructor(customWebhookUrl?: string) {
    this.webhookUrl = customWebhookUrl || config.slackWebhookUrl;
  }

  /**
   * Format proposal data into a structured Slack Block Kit message.
   */
  public buildSlackBlockKit(payload: CRMNotificationPayload): Record<string, any> {
    const isApproved = payload.status === 'APPROVED';
    const isRejected = payload.status === 'REJECTED' || payload.status === 'REVISIONS_REQUIRED';
    const statusEmoji = isApproved ? '✅' : isRejected ? '❌' : '📋';
    const statusLabel = isApproved ? 'APPROVED' : isRejected ? 'REJECTED / REVISIONS NEEDED' : payload.status;

    const formattedAmount = `$${payload.contractTotal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    const formattedSubtotal = `$${payload.subtotalPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    return {
      text: `${statusEmoji} Greenscape Pro Proposal ${payload.proposalNumber} (${payload.clientName}) - Status: ${statusLabel}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} Greenscape Pro Proposal ${isApproved ? 'Approved' : 'Status Update'}: ${payload.proposalNumber}`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Client Name:*\n${payload.clientName}`
            },
            {
              type: 'mrkdwn',
              text: `*Property Address:*\n${payload.propertyAddress}`
            },
            {
              type: 'mrkdwn',
              text: `*Contract Value:*\n${formattedAmount} _(Subtotal: ${formattedSubtotal})_`
            },
            {
              type: 'mrkdwn',
              text: `*Gross Profit Margin:*\n${payload.grossMarginPercent.toFixed(1)}%`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status:*\n\`${statusLabel}\` (v${payload.version})`
            },
            {
              type: 'mrkdwn',
              text: isApproved
                ? `*Approved By:*\n${payload.approvedBy || 'Marcus Tate'} (${payload.approverRole || 'OWNER'})`
                : `*Actioned At:*\n${payload.approvedAt || new Date().toISOString()}`
            }
          ]
        },
        ...(isRejected && payload.rejectionReason
          ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Rejection Reason:*\n>${payload.rejectionReason}`
                }
              }
            ]
          : []),
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Proposal Portal Link:*\n<${payload.proposalUrl}|Open Proposal #${payload.proposalNumber} in Greenscape Workspace>`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Idempotency: \`${payload.idempotencyKey}\` | Generated: ${payload.approvedAt || new Date().toISOString()} | Greenscape Pro Proposal Intelligence Agent`
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    };
  }

  /**
   * Dispatch proposal notification to Slack with timeout, bounded retries, and error handling.
   */
  public async sendProposalAlert(payload: CRMNotificationPayload): Promise<IntegrationResult> {
    const slackMessage = this.buildSlackBlockKit(payload);
    const targetUrl = this.webhookUrl || config.slackWebhookUrl;

    if (!targetUrl) {
      console.log(
        '[SlackAdapter: Mock Boundary] SLACK_WEBHOOK_URL not configured. Notification payload:',
        JSON.stringify(sanitizeForLogging(slackMessage), null, 2)
      );

      return {
        success: true,
        targetSystem: 'SLACK',
        status: 'MOCK_UNCONFIGURED',
        isMock: true,
        externalId: 'mock_slack_' + Date.now(),
        message: 'Simulated Slack notification logged (SLACK_WEBHOOK_URL not configured)',
        payloadSent: sanitizeForLogging(slackMessage),
        responseReceived: {
          ok: true,
          mode: 'MOCK_BOUNDARY',
          channel: '#proposals-draft',
          ts: String(Date.now() / 1000)
        },
        attempts: 1
      };
    }

    try {
      console.log(`[SlackAdapter] Dispatching webhook to ${sanitizeUrl(targetUrl)}...`);

      const { result, attempts } = await executeWithRetry(
        async attempt => {
          const res = await fetchWithTimeout(
            targetUrl,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(slackMessage)
            },
            5000 // 5s timeout
          );

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            const err = new Error(`Slack API responded with HTTP ${res.status}: ${body || res.statusText}`);
            (err as any).statusCode = res.status;
            // 4xx errors are not retryable (except 429 rate limit)
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
              (err as any).isFatal = true;
            }
            throw err;
          }

          const responseText = await res.text().catch(() => 'ok');
          return { ok: true, status: res.status, body: responseText };
        },
        {
          maxRetries: 3,
          initialDelayMs: 500,
          operationName: `Slack Webhook Dispatch (${payload.proposalNumber})`,
          shouldRetry: (err: any) => !err.isFatal
        }
      );

      console.log(`[SlackAdapter] Slack notification delivered successfully on attempt ${attempts}`);

      return {
        success: true,
        targetSystem: 'SLACK',
        status: 'SUCCESS',
        isMock: false,
        message: 'Slack notification delivered successfully',
        payloadSent: sanitizeForLogging(slackMessage),
        responseReceived: { ok: true, statusCode: result.status, body: result.body },
        attempts
      };
    } catch (err: any) {
      console.error('[SlackAdapter] Slack delivery failed:', err?.message);

      return {
        success: false,
        targetSystem: 'SLACK',
        status: 'FAILED',
        isMock: false,
        message: `Failed to deliver Slack notification: ${err?.message}`,
        payloadSent: sanitizeForLogging(slackMessage),
        attempts: 3,
        error: {
          code: err?.statusCode ? `HTTP_${err.statusCode}` : 'NETWORK_ERROR',
          message: err?.message || 'Unknown network error'
        }
      };
    }
  }
}

export const slackAdapter = new SlackAdapter();
