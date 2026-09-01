import { z } from 'zod';
import { ProposalStatus, UserRole } from '../db/types';

// ==========================================
// 1. Zod Request Schemas
// ==========================================

export const CreateProjectSchema = z.object({
  clientName: z.string().min(2, 'Client name is required (min 2 characters)'),
  propertyAddress: z.string().min(5, 'Property address is required'),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  targetBudget: z.number().positive('Budget must be positive').optional(),
  ghlOpportunityId: z.string().optional(),
  createdBy: z.string().default('Marcus Tate')
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const IngestSiteNotesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  rawNotes: z.string().min(10, 'Site notes must be at least 10 characters long'),
  targetBudget: z.number().positive().optional()
});
export type IngestSiteNotesInput = z.infer<typeof IngestSiteNotesSchema>;

export const AnalyzeAndExtractSchema = z.object({
  projectId: z.string().optional(),
  clientName: z.string().optional(),
  propertyAddress: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  targetBudget: z.number().optional(),
  rawNotes: z.string().min(10, 'Site walk notes must contain at least 10 characters')
});
export type AnalyzeAndExtractInput = z.infer<typeof AnalyzeAndExtractSchema>;

export const UpdateProposalSchema = z.object({
  projectOverview: z.string().optional(),
  siteAccessNotes: z.string().optional(),
  taxRate: z.number().min(0).max(0.25).optional(),
  zones: z.array(
    z.object({
      id: z.string().optional(),
      zoneName: z.string().min(1),
      narrative: z.string().optional(),
      displayOrder: z.number().optional(),
      items: z.array(
        z.object({
          id: z.string().optional(),
          catalogSku: z.string().optional(),
          rawItemName: z.string(),
          itemName: z.string(),
          category: z.string(),
          quantity: z.number().nullable(),
          unit: z.enum(['SQFT', 'LF', 'EA', 'TON', 'CUYD', 'LS', 'HR']),
          unitCost: z.number().min(0),
          unitPrice: z.number().min(0),
          isOptionalAddon: z.boolean().default(false),
          specifications: z.string().optional(),
          displayOrder: z.number().optional()
        })
      )
    })
  ).optional()
});
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;

export const ApproveProposalSchema = z.object({
  approverName: z.string().min(1, 'Approver name is required'),
  approverRole: z.enum(['OWNER', 'STAFF', 'ADMIN']).default('OWNER'),
  notes: z.string().optional(),
  bypassMarginWarning: z.boolean().default(false)
});
export type ApproveProposalInput = z.infer<typeof ApproveProposalSchema>;

export const RejectProposalSchema = z.object({
  reviewerName: z.string().min(1, 'Reviewer name is required'),
  rejectionReason: z.string().min(5, 'A clear rejection reason is required (min 5 chars)')
});
export type RejectProposalInput = z.infer<typeof RejectProposalSchema>;

export const RegenerateProposalSchema = z.object({
  additionalInstructions: z.string().optional(),
  rawNotes: z.string().optional()
});
export type RegenerateProposalInput = z.infer<typeof RegenerateProposalSchema>;

// ==========================================
// 2. Structured AI Extraction Schemas
// ==========================================

export const AIExtractedItemSchema = z.object({
  rawName: z.string().describe("Exact snippet from the contractor's notes"),
  suggestedCatalogName: z.string().describe("Standardized high-end trade item name"),
  category: z.enum([
    'Demolition & Earthwork',
    'Pavers & Hardscape',
    'Walls & Masonry',
    'Fire & Water Features',
    'Synthetic Turf & Sod',
    'Irrigation & Drainage',
    'Desert Plants & Trees',
    'Low-Voltage LED Lighting',
    'Outdoor Living & Structures'
  ]),
  quantity: z.number().nullable().describe("Extracted quantity number or null if missing in notes"),
  unit: z.enum(['SQFT', 'LF', 'EA', 'TON', 'CUYD', 'LS', 'HR']),
  specifications: z.string().describe("Details: colors, thicknesses, sub-base depths, or finishes"),
  isOptionalAddon: z.boolean().default(false).describe("True if marked as optional, upgrade, or client wishlist")
});
export type AIExtractedItem = z.infer<typeof AIExtractedItemSchema>;

export const AIExtractedZoneSchema = z.object({
  zoneName: z.string().describe("Logical property work area, e.g. Backyard Patio & Hardscape"),
  narrative: z.string().describe("Customer-ready, evocative narrative scope description explaining craftsmanship"),
  items: z.array(AIExtractedItemSchema)
});
export type AIExtractedZone = z.infer<typeof AIExtractedZoneSchema>;

export const AIDiscrepancySchema = z.object({
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
  item: z.string().describe("Item or scope area affected"),
  message: z.string().describe("Description of missing measurement, utility conflict, or ambiguous note")
});
export type AIDiscrepancy = z.infer<typeof AIDiscrepancySchema>;

export const AIExtractionOutputSchema = z.object({
  projectOverview: z.string().describe("High-level executive project overview summarizing all outdoor living zones"),
  siteAccessNotes: z.string().describe("Gate clearance, machine accessibility, and site constraints"),
  zones: z.array(AIExtractedZoneSchema),
  discrepancies: z.array(AIDiscrepancySchema)
});
export type AIExtractionOutput = z.infer<typeof AIExtractionOutputSchema>;

// ==========================================
// 3. API Response Envelope Types
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    executionTimeMs?: number;
  };
}
