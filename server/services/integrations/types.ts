import { ProposalStatus } from '../../db/types';

export interface CRMNotificationPayload {
  proposalId: string;
  proposalNumber: string;
  version: number;
  clientName: string;
  propertyAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  contractTotal: number;
  subtotalPrice: number;
  taxAmount: number;
  grossProfit: number;
  grossMarginPercent: number;
  status: ProposalStatus;
  approvedBy?: string;
  approverRole?: string;
  approvedAt?: string;
  rejectionReason?: string;
  proposalUrl: string;
  idempotencyKey: string;
}

export type IntegrationStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'MOCK_UNCONFIGURED';

export interface IntegrationResult {
  success: boolean;
  targetSystem: 'SLACK' | 'GHL' | 'COMPANYCAM';
  status: IntegrationStatus;
  isMock: boolean;
  externalId?: string;
  message: string;
  payloadSent: Record<string, any>;
  responseReceived?: Record<string, any>;
  attempts: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface INotificationAdapter {
  sendProposalAlert(payload: CRMNotificationPayload): Promise<IntegrationResult>;
}

export interface IGHLClient {
  syncOpportunity(payload: CRMNotificationPayload): Promise<IntegrationResult>;
  testConnection(): Promise<{ connected: boolean; mode: 'LIVE' | 'MOCK_BOUNDARY'; message: string }>;
}

export interface ICRMAdapter extends IGHLClient {}
