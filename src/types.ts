export type ProposalStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISIONS_REQUIRED'
  | 'SENT';

export type LineItemStatus = 'VALID' | 'NEEDS_PRICING' | 'MISSING_MEASUREMENT' | 'CUSTOM';

export type DiscrepancySeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';

export type ScreenMode =
  | 'dashboard'
  | 'new-project'
  | 'ai-analysis'
  | 'pricing-review'
  | 'editor'
  | 'approval'
  | 'audit';

export interface Project {
  id: string;
  clientName: string;
  propertyAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  targetBudget?: number;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  proposalsCount?: number;
}

export interface PricingCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: 'SQFT' | 'LF' | 'EA' | 'TON' | 'CUYD' | 'LS' | 'HR';
  unitCost: number;
  unitSellPrice: number;
  minimumCharge: number;
  description: string;
  isActive: boolean;
}

export interface ProposalItem {
  id?: string;
  catalogSku?: string;
  rawItemName: string;
  itemName: string;
  category: string;
  quantity: number | null;
  unit: 'SQFT' | 'LF' | 'EA' | 'TON' | 'CUYD' | 'LS' | 'HR';
  unitCost: number;
  unitPrice: number;
  extendedCost: number;
  extendedPrice: number;
  status: LineItemStatus;
  isOptionalAddon: boolean;
  specifications?: string;
  displayOrder?: number;
  matchScore?: number;
  reviewReason?: string;
  validationWarnings?: string[];
}

export interface ProposalZone {
  id?: string;
  zoneName: string;
  narrative?: string;
  displayOrder?: number;
  items: ProposalItem[];
}

export interface ProposalDiscrepancy {
  id?: string;
  severity: DiscrepancySeverity;
  itemReference?: string;
  message: string;
  category?: string;
  isResolved?: boolean;
}

export interface AuditLog {
  id: string;
  proposalId: string;
  eventType: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  notes?: string;
  createdAt: string;
  payload?: Record<string, any>;
}

export interface IntegrationEvent {
  id: string;
  targetSystem: 'SLACK' | 'GHL' | 'COMPANYCAM';
  eventTrigger: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'MOCK_UNCONFIGURED';
  requestPayload: Record<string, any>;
  responsePayload?: Record<string, any>;
  errorMessage?: string;
  retryCount?: number;
  createdAt: string;
}

export interface HydratedProposal {
  id: string;
  projectId: string;
  proposalNumber: string;
  version: number;
  status: ProposalStatus;
  clientName: string;
  propertyAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  rawNotes: string;
  projectOverview?: string;
  siteAccessNotes?: string;
  targetBudget?: number;
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
  zones: ProposalZone[];
  discrepancies: ProposalDiscrepancy[];
  auditLogs: AuditLog[];
  integrationEvents: IntegrationEvent[];
  createdAt: string;
  updatedAt: string;
}

