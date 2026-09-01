/**
 * Database Entity Definitions for Greenscape Pro PostgreSQL Schema
 */

export type UnitOfMeasure = 'SQFT' | 'LF' | 'EA' | 'TON' | 'CUYD' | 'LS' | 'HR';

export type ProposalStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISIONS_REQUIRED'
  | 'SENT';

export type LineItemStatus = 'VALID' | 'NEEDS_PRICING' | 'MISSING_MEASUREMENT' | 'CUSTOM';

export type DiscrepancySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AuditEventType =
  | 'PROJECT_CREATED'
  | 'NOTES_INGESTED'
  | 'AI_EXTRACTION_COMPLETED'
  | 'ITEM_ADDED'
  | 'ITEM_UPDATED'
  | 'ITEM_REMOVED'
  | 'PRICE_OVERRIDDEN'
  | 'NARRATIVE_EDITED'
  | 'PROPOSAL_APPROVED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_REGENERATED'
  | 'INTEGRATION_DISPATCHED';

export type UserRole = 'OWNER' | 'STAFF' | 'ADMIN' | 'SYSTEM';

export interface PricingCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  unitCost: number;
  unitSellPrice: number;
  minimumCharge: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  clientName: string;
  propertyAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  targetBudget?: number;
  ghlContactId?: string;
  ghlOpportunityId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalRecord {
  id: string;
  projectId: string;
  proposalNumber: string;
  version: number;
  status: ProposalStatus;
  rawNotes: string;
  projectOverview?: string;
  siteAccessNotes?: string;
  subtotalPrice: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalZoneRecord {
  id: string;
  proposalId: string;
  zoneName: string;
  narrative?: string;
  displayOrder: number;
  createdAt: string;
}

export interface ProposalItemRecord {
  id: string;
  proposalId: string;
  zoneId: string;
  catalogSku?: string;
  rawItemName: string;
  itemName: string;
  category: string;
  quantity: number | null;
  unit: UnitOfMeasure;
  unitCost: number;
  unitPrice: number;
  extendedCost: number;
  extendedPrice: number;
  status: LineItemStatus;
  isOptionalAddon: boolean;
  specifications?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalDiscrepancyRecord {
  id: string;
  proposalId: string;
  severity: DiscrepancySeverity;
  itemReference?: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

export interface ProposalVersionRecord {
  id: string;
  proposalId: string;
  versionNumber: number;
  statusAtSnapshot: ProposalStatus;
  snapshotPayload: any;
  createdBy: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  proposalId: string;
  eventType: AuditEventType;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  notes?: string;
  createdAt: string;
}

export interface IntegrationEventRecord {
  id: string;
  proposalId: string;
  targetSystem: 'SLACK' | 'GHL' | 'COMPANYCAM';
  eventTrigger: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'MOCK_UNCONFIGURED';
  requestPayload: Record<string, any>;
  responsePayload?: Record<string, any>;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

/** Complete Hydrated Proposal View Structure */
export interface HydratedProposal extends ProposalRecord {
  clientName: string;
  propertyAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  zones: Array<ProposalZoneRecord & { items: ProposalItemRecord[] }>;
  discrepancies: ProposalDiscrepancyRecord[];
  auditLogs: AuditLogRecord[];
  integrationEvents: IntegrationEventRecord[];
}
