import { config } from '../../config/env';
import { IGHLClient, CRMNotificationPayload, IntegrationResult } from './types';
import { fetchWithTimeout, executeWithRetry, sanitizeForLogging } from './utils';

/**
 * Production GHL Client: Communicates directly with GoHighLevel v2 API / Webhooks
 */
export class GHLProductionClient implements IGHLClient {
  private webhookUrl: string;
  private apiKey?: string;

  constructor(webhookUrl: string, apiKey?: string) {
    this.webhookUrl = webhookUrl;
    this.apiKey = apiKey;
  }

  public async testConnection(): Promise<{ connected: boolean; mode: 'LIVE'; message: string }> {
    try {
      const res = await fetchWithTimeout(
        this.webhookUrl,
        {
          method: 'HEAD',
          headers: {
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
          }
        },
        4000
      );
      return {
        connected: res.ok || res.status === 405, // 405 Method Not Allowed on HEAD is common for webhooks
        mode: 'LIVE',
        message: `Connected to live GHL endpoint (HTTP ${res.status})`
      };
    } catch (err: any) {
      return {
        connected: false,
        mode: 'LIVE',
        message: `Live GHL connection check failed: ${err?.message}`
      };
    }
  }

  public async syncOpportunity(payload: CRMNotificationPayload): Promise<IntegrationResult> {
    const ghlPayload = this.buildPayload(payload);

    try {
      console.log(`[GHLProductionClient] Dispatching opportunity sync for ${payload.proposalNumber}...`);

      const { result, attempts } = await executeWithRetry(
        async () => {
          const res = await fetchWithTimeout(
            this.webhookUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': payload.idempotencyKey,
                ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
              },
              body: JSON.stringify(ghlPayload)
            },
            5000
          );

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            const err = new Error(`GHL API returned HTTP ${res.status}: ${body || res.statusText}`);
            (err as any).statusCode = res.status;
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
              (err as any).isFatal = true;
            }
            throw err;
          }

          const responseData = await res.json().catch(() => ({ status: 'received' }));
          return { ok: true, status: res.status, data: responseData };
        },
        {
          maxRetries: 3,
          initialDelayMs: 600,
          operationName: `GHL Opportunity Sync (${payload.proposalNumber})`,
          shouldRetry: (err: any) => !err.isFatal
        }
      );

      return {
        success: true,
        targetSystem: 'GHL',
        status: 'SUCCESS',
        isMock: false,
        message: 'Opportunity successfully synchronized with live GoHighLevel CRM',
        payloadSent: sanitizeForLogging(ghlPayload),
        responseReceived: result.data,
        attempts
      };
    } catch (err: any) {
      console.error('[GHLProductionClient] Sync failed:', err?.message);
      return {
        success: false,
        targetSystem: 'GHL',
        status: 'FAILED',
        isMock: false,
        message: `GoHighLevel synchronization failed: ${err?.message}`,
        payloadSent: sanitizeForLogging(ghlPayload),
        attempts: 3,
        error: {
          code: err?.statusCode ? `GHL_HTTP_${err.statusCode}` : 'GHL_NETWORK_ERROR',
          message: err?.message || 'Failed to communicate with GoHighLevel API'
        }
      };
    }
  }

  private buildPayload(payload: CRMNotificationPayload): Record<string, any> {
    return {
      event: 'PROPOSAL_STATUS_CHANGED',
      idempotencyKey: payload.idempotencyKey,
      timestamp: payload.approvedAt || new Date().toISOString(),
      contact: {
        name: payload.clientName,
        email: payload.clientEmail || '',
        phone: payload.clientPhone || '',
        address: payload.propertyAddress
      },
      opportunity: {
        name: `${payload.clientName} - Outdoor Living Proposal (${payload.proposalNumber})`,
        monetaryValue: payload.contractTotal,
        subtotal: payload.subtotalPrice,
        taxAmount: payload.taxAmount,
        grossProfit: payload.grossProfit,
        grossMarginPercent: payload.grossMarginPercent,
        pipelineStage: payload.status === 'APPROVED' ? 'Proposal Approved / Contract Sent' : 'Under Review',
        customFields: {
          proposal_number: payload.proposalNumber,
          proposal_version: payload.version,
          proposal_status: payload.status,
          approved_by: payload.approvedBy || '',
          approved_at: payload.approvedAt || '',
          proposal_url: payload.proposalUrl
        }
      }
    };
  }
}

/**
 * Mock Boundary Adapter: Explicitly communicates unconfigured state without faking live operations
 */
export class GHLMockAdapter implements IGHLClient {
  public async testConnection(): Promise<{ connected: boolean; mode: 'MOCK_BOUNDARY'; message: string }> {
    return {
      connected: false,
      mode: 'MOCK_BOUNDARY',
      message: '[Mock Boundary] GHL credentials (GHL_API_KEY/GHL_WEBHOOK_URL) are not configured.'
    };
  }

  public async syncOpportunity(payload: CRMNotificationPayload): Promise<IntegrationResult> {
    const formattedPayload = {
      event: 'PROPOSAL_STATUS_CHANGED',
      idempotencyKey: payload.idempotencyKey,
      contact: {
        name: payload.clientName,
        email: payload.clientEmail,
        phone: payload.clientPhone,
        address: payload.propertyAddress
      },
      opportunity: {
        name: `${payload.clientName} - ${payload.proposalNumber}`,
        monetaryValue: payload.contractTotal,
        pipelineStage: payload.status === 'APPROVED' ? 'Proposal Approved' : 'In Review',
        customFields: {
          proposal_number: payload.proposalNumber,
          version: payload.version,
          gross_margin: `${payload.grossMarginPercent.toFixed(1)}%`,
          proposal_url: payload.proposalUrl
        }
      }
    };

    console.warn(
      `[GHLMockAdapter: Boundary Active] Real GoHighLevel credentials not provided in environment. ` +
        `Refusing to fake live success. Payload prepared at mock boundary.`
    );

    return {
      success: false, // Explicitly marked as not a live success
      targetSystem: 'GHL',
      status: 'MOCK_UNCONFIGURED',
      isMock: true,
      externalId: 'ghl_mock_boundary_' + Date.now(),
      message:
        '[GHL Mock Adapter Boundary] GHL credentials (GHL_API_KEY / GHL_WEBHOOK_URL) are not configured. ' +
        'Payload has been safely formatted and held at adapter boundary for production deployment.',
      payloadSent: sanitizeForLogging(formattedPayload),
      responseReceived: {
        adapterMode: 'MOCK_BOUNDARY_UNCONFIGURED',
        warning: 'LIVE_CREDENTIALS_MISSING',
        instruction: 'Define GHL_WEBHOOK_URL and GHL_API_KEY in environment to activate live sync.'
      },
      attempts: 1,
      error: {
        code: 'GHL_CREDENTIALS_UNCONFIGURED',
        message: 'GHL integration is unconfigured. Live sync was not attempted.'
      }
    };
  }
}

/**
 * Clean GHL Integration Service Factory
 */
export class GHLIntegrationService implements IGHLClient {
  private client: IGHLClient;

  constructor() {
    this.client = this.resolveClient();
  }

  private resolveClient(): IGHLClient {
    if (config.ghlWebhookUrl) {
      return new GHLProductionClient(config.ghlWebhookUrl, config.ghlApiKey);
    }
    return new GHLMockAdapter();
  }

  public async syncOpportunity(payload: CRMNotificationPayload): Promise<IntegrationResult> {
    // Re-resolve client in case env vars were set dynamically
    this.client = this.resolveClient();
    return this.client.syncOpportunity(payload);
  }

  public async testConnection() {
    this.client = this.resolveClient();
    return this.client.testConnection();
  }
}

export const ghlService = new GHLIntegrationService();
export const ghlAdapter = ghlService; // Alias for backward compatibility
