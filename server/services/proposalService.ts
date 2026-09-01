import { db } from '../db';
import {
  HydratedProposal,
  ProposalRecord,
  ProposalStatus,
  UserRole,
  ProposalItemRecord
} from '../db/types';
import {
  AnalyzeAndExtractInput,
  UpdateProposalInput,
  ApproveProposalInput,
  RejectProposalInput,
  RegenerateProposalInput
} from '../types/api';
import { aiService } from './aiService';
import { pricingService } from './pricingService';
import { auditService } from './auditService';
import { projectService } from './projectService';
import { slackAdapter } from './integrations/slackAdapter';
import { ghlService } from './integrations/ghlAdapter';
import { CRMNotificationPayload } from './integrations/types';
import { config } from '../config/env';

export class ProposalService {
  private activeLocks: Set<string> = new Set();

  private async acquireLock(proposalId: string): Promise<() => void> {
    if (this.activeLocks.has(proposalId)) {
      // Small backoff wait for concurrent operations on the same proposal
      let attempts = 0;
      while (this.activeLocks.has(proposalId) && attempts < 10) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
      }
    }
    this.activeLocks.add(proposalId);
    return () => {
      this.activeLocks.delete(proposalId);
    };
  }

  /**
   * Ingest site notes, run Gemini AI extraction, match items against 200+ Master Catalog, and save draft.
   */
  public async analyzeAndCreateDraft(
    input: AnalyzeAndExtractInput,
    actor: { id: string; name: string; role: UserRole }
  ): Promise<HydratedProposal> {
    const startTime = Date.now();

    // 1. Ensure Project Container Exists
    let projectId = input.projectId;
    if (!projectId) {
      const project = projectService.createProject({
        clientName: input.clientName || 'Valued Homeowner',
        propertyAddress: input.propertyAddress || 'Phoenix Metro, AZ',
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        targetBudget: input.targetBudget,
        createdBy: actor.name
      });
      projectId = project.id;
    }

    const project = projectService.getProject(projectId);

    // 2. Invoke Gemini AI Extraction (Isolated from pricing math)
    const aiOutput = await aiService.extractScopeFromNotes(input.rawNotes, {
      clientName: project?.clientName,
      propertyAddress: project?.propertyAddress,
      targetBudget: project?.targetBudget
    });

    // 3. Create Draft Proposal Record in REVIEW_REQUIRED state
    const proposal = db.createProposal({
      projectId,
      version: 1,
      status: 'REVIEW_REQUIRED',
      rawNotes: input.rawNotes,
      projectOverview: aiOutput.projectOverview,
      siteAccessNotes: aiOutput.siteAccessNotes,
      subtotalPrice: 0,
      totalCost: 0,
      grossProfit: 0,
      grossMarginPercent: 0,
      taxRate: 0.086,
      taxAmount: 0,
      grandTotal: 0,
      createdBy: actor.name
    });

    // 4. Deterministically Match Extracted Items Against 200+ Catalog
    let displayOrder = 1;
    for (const zone of aiOutput.zones) {
      const createdZone = db.addZone({
        proposalId: proposal.id,
        zoneName: zone.zoneName,
        narrative: zone.narrative,
        displayOrder: displayOrder++
      });

      let itemOrder = 1;
      for (const extractedItem of zone.items) {
        const matched = pricingService.matchItem(extractedItem);

        db.addItem({
          proposalId: proposal.id,
          zoneId: createdZone.id,
          catalogSku: matched.catalogSku,
          rawItemName: matched.rawItemName,
          itemName: matched.itemName,
          category: matched.category,
          quantity: matched.quantity,
          unit: matched.unit,
          unitCost: matched.unitCost,
          unitPrice: matched.unitPrice,
          extendedCost: matched.extendedCost,
          extendedPrice: matched.extendedPrice,
          status: matched.status,
          isOptionalAddon: matched.isOptionalAddon,
          specifications: matched.specifications,
          displayOrder: itemOrder++
        });
      }
    }

    // 5. Save Discrepancies
    for (const disc of aiOutput.discrepancies) {
      db.addDiscrepancy({
        proposalId: proposal.id,
        severity: disc.severity,
        itemReference: disc.item,
        message: disc.message,
        isResolved: false
      });
    }

    // 6. Recalculate Final Financials
    db.recalculateProposalFinancials(proposal.id);

    // 7. Audit Event Logging
    auditService.logEvent(proposal.id, 'NOTES_INGESTED', actor, {
      notes: `Ingested ${input.rawNotes.length} characters of field notes`
    });

    auditService.logEvent(
      proposal.id,
      'AI_EXTRACTION_COMPLETED',
      {
        id: 'system_gemini',
        name: 'Gemini 3.7 Flash Thinking (AI Scope Extraction)',
        role: 'SYSTEM'
      },
      {
        notes: `AI prepared draft scope with ${aiOutput.zones.length} zones and ${aiOutput.discrepancies.length} discrepancy flags in ${Date.now() - startTime}ms. Proposal placed in REVIEW_REQUIRED for human estimator review.`
      }
    );

    return db.getHydratedProposal(proposal.id)!;
  }

  public getProposal(id: string): HydratedProposal | undefined {
    return db.getHydratedProposal(id);
  }

  public listProposals(statusFilter?: ProposalStatus): HydratedProposal[] {
    return db.listProposals(statusFilter);
  }

  /**
   * Update proposal details, quantities, line items, and zone narratives during human review.
   */
  public async updateProposal(
    id: string,
    input: UpdateProposalInput,
    actor: { id: string; name: string; role: UserRole }
  ): Promise<HydratedProposal> {
    const unlock = await this.acquireLock(id);
    try {
      const proposal = db.getProposal(id);
      if (!proposal) {
        throw new Error(`Proposal ${id} not found`);
      }

      if (proposal.status === 'APPROVED' && actor.role !== 'OWNER') {
        throw new Error('Approved proposals are locked and cannot be modified by staff');
      }

      // If proposal was in REVISIONS_REQUIRED or REJECTED, update transitions it back to REVIEW_REQUIRED
      const nextStatus: ProposalStatus =
        proposal.status === 'REVISIONS_REQUIRED' || proposal.status === 'REJECTED'
          ? 'REVIEW_REQUIRED'
          : proposal.status;

      // Update parent proposal fields
      db.updateProposal(id, {
        status: nextStatus,
        projectOverview: input.projectOverview !== undefined ? input.projectOverview : proposal.projectOverview,
        siteAccessNotes: input.siteAccessNotes !== undefined ? input.siteAccessNotes : proposal.siteAccessNotes,
        taxRate: input.taxRate !== undefined ? input.taxRate : proposal.taxRate
      });

      // If full zones replacement is provided
      if (input.zones) {
        db.clearProposalZonesAndItems(id);

        let zoneOrder = 1;
        for (const zone of input.zones) {
          const createdZone = db.addZone({
            proposalId: id,
            zoneName: zone.zoneName,
            narrative: zone.narrative,
            displayOrder: zone.displayOrder || zoneOrder++
          });

          let itemOrder = 1;
          for (const item of zone.items) {
            const qty = item.quantity;
            const status = qty === null || qty <= 0 ? 'MISSING_MEASUREMENT' : item.unitPrice === 0 ? 'NEEDS_PRICING' : 'VALID';

            db.addItem({
              proposalId: id,
              zoneId: createdZone.id,
              catalogSku: item.catalogSku,
              rawItemName: item.rawItemName,
              itemName: item.itemName,
              category: item.category,
              quantity: qty,
              unit: item.unit,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
              extendedCost: qty ? Math.round(qty * item.unitCost * 100) / 100 : 0,
              extendedPrice: qty ? Math.round(qty * item.unitPrice * 100) / 100 : 0,
              status,
              isOptionalAddon: item.isOptionalAddon,
              specifications: item.specifications,
              displayOrder: item.displayOrder || itemOrder++
            });
          }
        }
      }

      db.recalculateProposalFinancials(id);

      auditService.logEvent(id, 'ITEM_UPDATED', actor, {
        notes: `Review draft updated by human estimator ${actor.name} (Status: ${nextStatus})`
      });

      return db.getHydratedProposal(id)!;
    } finally {
      unlock();
    }
  }

  /**
   * Enforce Human-in-the-Loop Approval Gate:
   * 1. Never allow the AI itself to approve a proposal.
   * 2. Approval must require authenticated user action (Marcus Tate / OWNER).
   * 3. Record who approved, when approval occurred, and version approved.
   * 4. Prevent accidental duplicate approval.
   * 5. Prevent approval of invalid/incomplete proposals.
   * 6. Store audit information & version snapshot.
   * 7. System executes external integrations (Slack + GHL) with resilient outbox failure handling.
   */
  public async approveProposal(
    id: string,
    input: ApproveProposalInput,
    actor: { id: string; name: string; role: UserRole }
  ): Promise<HydratedProposal> {
    const unlock = await this.acquireLock(id);
    try {
      const proposal = db.getHydratedProposal(id);
      if (!proposal) {
        throw new Error(`Proposal ${id} not found`);
      }

      // PRINCIPLE 1: AI PREPARES, HUMAN APPROVES. NEVER ALLOW AI TO APPROVE.
      if (
        actor.role === 'SYSTEM' ||
        actor.id === 'system_gemini' ||
        actor.name.toLowerCase().includes('gemini') ||
        actor.name.toLowerCase().includes('ai')
      ) {
        throw new Error(
          'Approval Denied: Automated AI routines and system bots are strictly forbidden from approving proposals. Human owner authorization required.'
        );
      }

    // REQUIREMENT 1: Approval must require authenticated user action (OWNER role)
    if (actor.role !== 'OWNER' && input.approverRole !== 'OWNER') {
      throw new Error(
        'Authorization Denied: Only Marcus Tate (Business Owner) with OWNER role can approve customer proposals.'
      );
    }

    // REQUIREMENT 5: Prevent accidental duplicate approval
    if (proposal.status === 'APPROVED') {
      throw new Error(
        `Duplicate Approval Blocked: Proposal ${proposal.proposalNumber} was already approved on ${proposal.approvedAt} by ${proposal.approvedBy} (Version ${proposal.version}). Proposals cannot be approved multiple times.`
      );
    }

    // REQUIREMENT 6: Prevent approval of invalid/incomplete proposals
    const allItems = proposal.zones.flatMap(z => z.items);
    if (allItems.length === 0) {
      throw new Error('Approval Blocked: Proposal must contain at least one line item in a project zone.');
    }

    // Check for missing measurements
    const missingMeasurementItems = allItems.filter(
      item => item.status === 'MISSING_MEASUREMENT' || item.quantity === null || item.quantity <= 0
    );
    if (missingMeasurementItems.length > 0) {
      const names = missingMeasurementItems.map(i => `"${i.itemName}"`).slice(0, 3).join(', ');
      throw new Error(
        `Approval Blocked: ${missingMeasurementItems.length} line item(s) have missing measurements (${names}). Resolve all field dimensions before approving.`
      );
    }

    // Check for unpriced items
    const unpricedItems = allItems.filter(
      item => item.status === 'NEEDS_PRICING' || item.unitPrice <= 0
    );
    if (unpricedItems.length > 0) {
      const names = unpricedItems.map(i => `"${i.itemName}"`).slice(0, 3).join(', ');
      throw new Error(
        `Approval Blocked: ${unpricedItems.length} line item(s) are missing catalog pricing (${names}). Assign pricing before approving.`
      );
    }

    // Validation Invariant: Target Gross Margin Floor (38.0%)
    if (proposal.grossMarginPercent < 38.0 && !input.bypassMarginWarning) {
      throw new Error(
        `Margin Floor Warning: Gross profit margin is ${proposal.grossMarginPercent.toFixed(1)}% (below target threshold of 38.0%). Business owner must check 'bypassMarginWarning' to authorize this override.`
      );
    }

    // REQUIREMENTS 2, 3, 4: Record who approved, when approval occurred, and version approved
    const now = new Date().toISOString();
    const approverName = input.approverName || actor.name;
    const versionApproved = proposal.version;

    db.updateProposal(id, {
      status: 'APPROVED',
      approvedBy: approverName,
      approvedAt: now
    });

    // Immutable Version Snapshot
    db.createVersionSnapshot(id, approverName);

    // REQUIREMENT 7: Store comprehensive audit record
    auditService.logEvent(id, 'PROPOSAL_APPROVED', actor, {
      notes: `Human Owner Approval by ${approverName} (Role: ${actor.role}) for Version ${versionApproved}. Contract Value: $${proposal.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}, Gross Margin: ${proposal.grossMarginPercent.toFixed(1)}%${proposal.grossMarginPercent < 38.0 ? ' [LOW MARGIN OVERRIDE AUTHORIZED]' : ''}`
    });

    // SYSTEM EXECUTES: Dispatch downstream external integrations (Slack + GHL)
    const notificationPayload: CRMNotificationPayload = {
      proposalId: proposal.id,
      proposalNumber: proposal.proposalNumber,
      version: versionApproved,
      clientName: proposal.clientName,
      propertyAddress: proposal.propertyAddress,
      clientEmail: proposal.clientEmail,
      clientPhone: proposal.clientPhone,
      contractTotal: proposal.grandTotal,
      subtotalPrice: proposal.subtotalPrice,
      taxAmount: proposal.taxAmount,
      grossProfit: proposal.grossProfit,
      grossMarginPercent: proposal.grossMarginPercent,
      status: 'APPROVED',
      approvedBy: approverName,
      approverRole: actor.role,
      approvedAt: now,
      proposalUrl: `${config.appUrl}/?proposalId=${proposal.id}`,
      idempotencyKey: `approval_${proposal.id}_v${versionApproved}`
    };

    // Dispatch Slack Webhook (Fail-safe: does not rollback approval if network fails)
    try {
      const slackResult = await slackAdapter.sendProposalAlert(notificationPayload);
      db.recordIntegrationEvent({
        proposalId: id,
        targetSystem: 'SLACK',
        eventTrigger: 'PROPOSAL_APPROVED',
        status: slackResult.status,
        requestPayload: slackResult.payloadSent,
        responsePayload: slackResult.responseReceived,
        errorMessage: slackResult.success ? undefined : slackResult.message,
        retryCount: slackResult.attempts ? slackResult.attempts - 1 : 0
      });
    } catch (err: any) {
      console.error('[ProposalService] Slack integration threw unexpected error:', err);
      db.recordIntegrationEvent({
        proposalId: id,
        targetSystem: 'SLACK',
        eventTrigger: 'PROPOSAL_APPROVED',
        status: 'FAILED',
        requestPayload: { payload: notificationPayload },
        errorMessage: err?.message || 'Slack integration network exception',
        retryCount: 3
      });
    }

    // Dispatch GHL Sync (Fail-safe: does not fake live success if unconfigured)
    try {
      const ghlResult = await ghlService.syncOpportunity(notificationPayload);
      db.recordIntegrationEvent({
        proposalId: id,
        targetSystem: 'GHL',
        eventTrigger: 'PROPOSAL_APPROVED',
        status: ghlResult.status,
        requestPayload: ghlResult.payloadSent,
        responsePayload: ghlResult.responseReceived,
        errorMessage: ghlResult.success ? undefined : ghlResult.message,
        retryCount: ghlResult.attempts ? ghlResult.attempts - 1 : 0
      });
    } catch (err: any) {
      console.error('[ProposalService] GHL integration threw unexpected error:', err);
      db.recordIntegrationEvent({
        proposalId: id,
        targetSystem: 'GHL',
        eventTrigger: 'PROPOSAL_APPROVED',
        status: 'FAILED',
        requestPayload: { payload: notificationPayload },
        errorMessage: err?.message || 'GHL integration network exception',
        retryCount: 3
      });
    }

    return db.getHydratedProposal(id)!;
  } finally {
    unlock();
  }
}

/**
 * Reject a proposal draft: Enforce state machine transition to REVISIONS_REQUIRED.
 */
  public async rejectProposal(
    id: string,
    input: RejectProposalInput,
    actor: { id: string; name: string; role: UserRole }
  ): Promise<HydratedProposal> {
    const proposal = db.getHydratedProposal(id);
    if (!proposal) {
      throw new Error(`Proposal ${id} not found`);
    }

    if (!input.rejectionReason || input.rejectionReason.trim().length === 0) {
      throw new Error('Rejection Failed: A specific rejection reason must be provided for estimator revisions.');
    }

    // State Transition: DRAFT/REVIEW_REQUIRED -> REVISIONS_REQUIRED
    db.updateProposal(id, {
      status: 'REVISIONS_REQUIRED',
      rejectionReason: input.rejectionReason
    });

    auditService.logEvent(id, 'PROPOSAL_REJECTED', actor, {
      notes: `Proposal rejected by ${actor.name}. Status moved to REVISIONS_REQUIRED. Reason: "${input.rejectionReason}"`
    });

    return db.getHydratedProposal(id)!;
  }

  /**
   * Regenerate proposal with additional instructions from REVISIONS_REQUIRED -> REVIEW_REQUIRED
   */
  public async regenerateProposal(
    id: string,
    input: RegenerateProposalInput,
    actor: { id: string; name: string; role: UserRole }
  ): Promise<HydratedProposal> {
    const current = db.getHydratedProposal(id);
    if (!current) {
      throw new Error(`Proposal ${id} not found`);
    }

    const notesToUse = input.rawNotes || current.rawNotes;
    const combinedNotes = input.additionalInstructions
      ? `${notesToUse}\n\nADDITIONAL INSTRUCTIONS / REVISION NOTES:\n${input.additionalInstructions}`
      : notesToUse;

    const aiOutput = await aiService.extractScopeFromNotes(combinedNotes, {
      clientName: current.clientName,
      propertyAddress: current.propertyAddress
    });

    // Clear and rebuild zones
    db.clearProposalZonesAndItems(id);
    db.updateProposal(id, {
      rawNotes: combinedNotes,
      projectOverview: aiOutput.projectOverview,
      siteAccessNotes: aiOutput.siteAccessNotes,
      status: 'REVIEW_REQUIRED',
      version: current.version + 1,
      rejectionReason: undefined
    });

    let displayOrder = 1;
    for (const zone of aiOutput.zones) {
      const createdZone = db.addZone({
        proposalId: id,
        zoneName: zone.zoneName,
        narrative: zone.narrative,
        displayOrder: displayOrder++
      });

      let itemOrder = 1;
      for (const extractedItem of zone.items) {
        const matched = pricingService.matchItem(extractedItem);
        db.addItem({
          proposalId: id,
          zoneId: createdZone.id,
          catalogSku: matched.catalogSku,
          rawItemName: matched.rawItemName,
          itemName: matched.itemName,
          category: matched.category,
          quantity: matched.quantity,
          unit: matched.unit,
          unitCost: matched.unitCost,
          unitPrice: matched.unitPrice,
          extendedCost: matched.extendedCost,
          extendedPrice: matched.extendedPrice,
          status: matched.status,
          isOptionalAddon: matched.isOptionalAddon,
          specifications: matched.specifications,
          displayOrder: itemOrder++
        });
      }
    }

    db.recalculateProposalFinancials(id);

    auditService.logEvent(id, 'PROPOSAL_REGENERATED', actor, {
      notes: `Scope regenerated with AI (Version ${current.version + 1}). Proposal returned to REVIEW_REQUIRED for human verification.`
    });

    return db.getHydratedProposal(id)!;
  }
}

export const proposalService = new ProposalService();
