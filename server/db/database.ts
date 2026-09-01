import { SEED_PRICING_CATALOG } from './seedData';
import {
  PricingCatalogItem,
  ProjectRecord,
  ProposalRecord,
  ProposalZoneRecord,
  ProposalItemRecord,
  ProposalDiscrepancyRecord,
  ProposalVersionRecord,
  AuditLogRecord,
  IntegrationEventRecord,
  HydratedProposal,
  ProposalStatus,
  UserRole
} from './types';

/**
 * In-Memory Relational Data Store
 * Mirrors PostgreSQL schema with relational integrity and transaction-like consistency.
 */
class InMemoryDatabase {
  private pricingCatalog: Map<string, PricingCatalogItem> = new Map();
  private projects: Map<string, ProjectRecord> = new Map();
  private proposals: Map<string, ProposalRecord> = new Map();
  private proposalZones: Map<string, ProposalZoneRecord> = new Map();
  private proposalItems: Map<string, ProposalItemRecord> = new Map();
  private proposalDiscrepancies: Map<string, ProposalDiscrepancyRecord> = new Map();
  private proposalVersions: Map<string, ProposalVersionRecord> = new Map();
  private auditLogs: AuditLogRecord[] = [];
  private integrationEvents: Map<string, IntegrationEventRecord> = new Map();
  private proposalSequence: number = 842;

  // --- High-Performance Secondary Relational Indexes ---
  private zoneIdsByProposalId: Map<string, Set<string>> = new Map();
  private itemIdsByProposalId: Map<string, Set<string>> = new Map();
  private itemIdsByZoneId: Map<string, Set<string>> = new Map();
  private discrepancyIdsByProposalId: Map<string, Set<string>> = new Map();
  private auditLogsByProposalId: Map<string, AuditLogRecord[]> = new Map();
  private integrationEventIdsByProposalId: Map<string, Set<string>> = new Map();
  private versionIdsByProposalId: Map<string, Set<string>> = new Map();

  constructor() {
    this.seedCatalog();
    this.seedSampleProjectAndProposal();
  }

  // --- Index Helpers ---
  private addToIndex(map: Map<string, Set<string>>, key: string, id: string) {
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    set.add(id);
  }

  private removeFromIndex(map: Map<string, Set<string>>, key: string, id: string) {
    const set = map.get(key);
    if (set) {
      set.delete(id);
      if (set.size === 0) map.delete(key);
    }
  }

  // --- Seed Logic ---
  private seedCatalog() {
    for (const item of SEED_PRICING_CATALOG) {
      this.pricingCatalog.set(item.sku, { ...item });
    }
  }

  private seedSampleProjectAndProposal() {
    const projectId = 'proj-henderson-01';
    const project: ProjectRecord = {
      id: projectId,
      clientName: 'David & Sarah Henderson',
      propertyAddress: '6420 E Camelback Rd, Paradise Valley, AZ 85253',
      clientEmail: 'dhenderson@camelbackproperties.com',
      clientPhone: '(480) 555-0194',
      targetBudget: 75000,
      ghlContactId: 'ghl_cont_983204',
      ghlOpportunityId: 'ghl_opp_449210',
      createdBy: 'Marcus Tate',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
    };
    this.projects.set(projectId, project);

    const proposalId = 'prop-henderson-01';
    const proposal: ProposalRecord = {
      id: proposalId,
      projectId: projectId,
      proposalNumber: 'GP-2026-0842',
      version: 1,
      status: 'REVIEW_REQUIRED',
      rawNotes: `Site walk at Henderson residence in Paradise Valley. Backyard outdoor living overhaul.
Existing 400 sq ft cracked concrete patio needs full demolition and hauling. Access is tight on east gate (approx 6ft gate).
Install 1,200 sq ft Belgard Lafitt pavers in Toscana color with polymeric sand and 4" compacted ABC base.
Build 48" custom gas fire pit with stacked ledgerock veneer (Charcoal Canyon) and travertine cap.
Run 45 ft gas line from existing meter.
650 sq ft synthetic turf (putting green quality - 80oz) with weed barrier, 3" DG base, and antimicrobial infill.
Softscape: 8 15-gallon Desert Museum Palo Verde trees, 24 5-gallon Texas Sage, 18 5-gallon Red Yucca, 6 tons 1/2" Madison Gold crushed granite rock.
Low voltage LED lighting: 12 path lights, 6 tree uplights with 300W smart WiFi transformer.
Optional add-on: 20 ft seat wall matching fire pit ledgerock.`,
      projectOverview: 'Comprehensive backyard outdoor living transformation featuring premium Belgard Lafitt paver hardscape, custom gas fire feature, luxury synthetic turf, Sonoran-adapted native softscape, and architectural LED lighting.',
      siteAccessNotes: 'East side gate clearance restricted to 6 ft width. Demolition and base transport requires compact mini-skid machinery.',
      subtotalPrice: 42125.00,
      totalCost: 20645.00,
      grossProfit: 21480.00,
      grossMarginPercent: 50.99,
      taxRate: 0.086,
      taxAmount: 3622.75,
      grandTotal: 45747.75,
      createdBy: 'Marcus Tate',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.proposals.set(proposalId, proposal);

    // Zone 1: Backyard Patio & Hardscape
    const z1Id = 'zone-01';
    this.proposalZones.set(z1Id, {
      id: z1Id,
      proposalId,
      zoneName: 'Backyard Patio & Hardscape',
      narrative: 'Complete demolition and haul-off of failing 400 sq ft concrete slab, excavation to sub-grade depth, laser leveling, 4-inch compacted Aggregate Base Course (ABC), and installation of 1,200 sq ft Belgard Lafitt 3-piece pavers stabilized with polymeric sand jointing.',
      displayOrder: 1,
      createdAt: new Date().toISOString()
    });

    const item1: ProposalItemRecord = {
      id: 'item-01',
      proposalId,
      zoneId: z1Id,
      catalogSku: 'DEMO-CONC-4IN',
      rawItemName: 'Demolition and haul away cracked concrete patio',
      itemName: 'Concrete Patio Demolition & Removal (Up to 4" Slab)',
      category: 'Demolition & Earthwork',
      quantity: 400,
      unit: 'SQFT',
      unitCost: 1.75,
      unitPrice: 4.50,
      extendedCost: 700.00,
      extendedPrice: 1800.00,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Haul away through east gate via mini-skid',
      displayOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const item2: ProposalItemRecord = {
      id: 'item-02',
      proposalId,
      zoneId: z1Id,
      catalogSku: 'PAV-BELG-LAF',
      rawItemName: 'Belgard Lafitt pavers in Toscana color',
      itemName: 'Belgard Lafitt 3-Piece Paver System (Sand/Charcoal/Sierra)',
      category: 'Pavers & Hardscape',
      quantity: 1200,
      unit: 'SQFT',
      unitCost: 9.20,
      unitPrice: 18.50,
      extendedCost: 11040.00,
      extendedPrice: 22200.00,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Toscana blend with 4" compacted ABC base & polymeric sand',
      displayOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.proposalItems.set(item1.id, item1);
    this.proposalItems.set(item2.id, item2);

    // Zone 2: Fire Feature & Utility
    const z2Id = 'zone-02';
    this.proposalZones.set(z2Id, {
      id: z2Id,
      proposalId,
      zoneName: 'Outdoor Fire Feature & Gas Run',
      narrative: 'Custom engineered 48-inch natural gas fire pit with CMU core, stacked charcoal ledgerock veneer, and honed bullnose travertine capstone connected to main gas utility.',
      displayOrder: 2,
      createdAt: new Date().toISOString()
    });
    const item3: ProposalItemRecord = {
      id: 'item-03',
      proposalId,
      zoneId: z2Id,
      catalogSku: 'FIRE-GAS-48',
      rawItemName: '48-inch custom gas fire pit with stacked ledgerock',
      itemName: 'Custom 48-Inch Gas Fire Pit (Round / Square)',
      category: 'Fire & Water Features',
      quantity: 1,
      unit: 'EA',
      unitCost: 1400.00,
      unitPrice: 3850.00,
      extendedCost: 1400.00,
      extendedPrice: 3850.00,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Charcoal Canyon ledgerock with 18" stainless burner ring',
      displayOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const item4: ProposalItemRecord = {
      id: 'item-04',
      proposalId,
      zoneId: z2Id,
      catalogSku: 'UTIL-GAS-LINE',
      rawItemName: '45 ft gas line from meter',
      itemName: '3/4-Inch Polyethylene Underground Gas Line (Trench & Pipe)',
      category: 'Fire & Water Features',
      quantity: 45,
      unit: 'LF',
      unitCost: 12.00,
      unitPrice: 28.00,
      extendedCost: 540.00,
      extendedPrice: 1260.00,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Trenching 18" depth with tracer wire and pressure test',
      displayOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.proposalItems.set(item3.id, item3);
    this.proposalItems.set(item4.id, item4);

    // Zone 3: Synthetic Turf & Putting Green
    const z3Id = 'zone-03';
    this.proposalZones.set(z3Id, {
      id: z3Id,
      proposalId,
      zoneName: 'Synthetic Turf Lawn',
      narrative: 'Installation of 650 sq ft premium 80oz residential synthetic turf over 3-inch laser-graded decomposed granite sub-base with antimicrobial silica infill and commercial bender board perimeter.',
      displayOrder: 3,
      createdAt: new Date().toISOString()
    });
    const item5: ProposalItemRecord = {
      id: 'item-05',
      proposalId,
      zoneId: z3Id,
      catalogSku: 'TURF-PREM-80',
      rawItemName: '650 sq ft synthetic turf putting green quality',
      itemName: 'Premium 80oz Residential Synthetic Turf (ProGreen Style)',
      category: 'Synthetic Turf & Sod',
      quantity: 650,
      unit: 'SQFT',
      unitCost: 4.10,
      unitPrice: 9.75,
      extendedCost: 2665.00,
      extendedPrice: 6337.50,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Includes weed barrier, 3" DG base, and antimicrobial infill',
      displayOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.proposalItems.set(item5.id, item5);

    // Zone 4: Softscape & Lighting
    const z4Id = 'zone-04';
    this.proposalZones.set(z4Id, {
      id: z4Id,
      proposalId,
      zoneName: 'Desert Planting & Architectural LED Lighting',
      narrative: 'Sonoran-native plant installation with dedicated low-volume drip irrigation, 6 tons Madison Gold groundcover rock, and solid brass low-voltage path and uplighting system.',
      displayOrder: 4,
      createdAt: new Date().toISOString()
    });
    const item6: ProposalItemRecord = {
      id: 'item-06',
      proposalId,
      zoneId: z4Id,
      catalogSku: 'PLT-TREE-15GL',
      rawItemName: '8 15-gallon Desert Museum Palo Verde trees',
      itemName: '15-Gallon Specimen Tree (Sweet Acacia / Desert Willow)',
      category: 'Desert Plants & Trees',
      quantity: 8,
      unit: 'EA',
      unitCost: 95.00,
      unitPrice: 240.00,
      extendedCost: 760.00,
      extendedPrice: 1920.00,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: 'Desert Museum hybrid specimens with dual drip emitters',
      displayOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const item7: ProposalItemRecord = {
      id: 'item-07',
      proposalId,
      zoneId: z4Id,
      catalogSku: 'LGT-PATH-BRS',
      rawItemName: '12 low-voltage path lights',
      itemName: 'Solid Cast Brass Low-Voltage LED Path Light (FX Luminaire / Vista)',
      category: 'Low-Voltage LED Lighting',
      quantity: 12,
      unit: 'EA',
      unitCost: 65.00,
      unitPrice: 165.00,
      extendedCost: 780.00,
      extendedPrice: 1980.00,
      status: 'VALID',
      isOptionalAddon: false,
      specifications: '2700K warm white brass fixtures',
      displayOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const item8: ProposalItemRecord = {
      id: 'item-08',
      proposalId,
      zoneId: z4Id,
      catalogSku: 'WALL-SEAT-18',
      rawItemName: '20 ft seat wall matching fire pit ledgerock',
      itemName: 'Courtyard Seat Wall (18" Height x 12" Width)',
      category: 'Walls & Masonry',
      quantity: 20,
      unit: 'LF',
      unitCost: 42.00,
      unitPrice: 95.00,
      extendedCost: 840.00,
      extendedPrice: 1900.00,
      status: 'VALID',
      isOptionalAddon: true,
      specifications: 'Optional Upgrade: Matching stacked stone veneer with travertine cap',
      displayOrder: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.proposalItems.set(item6.id, item6);
    this.proposalItems.set(item7.id, item7);
    this.proposalItems.set(item8.id, item8);

    // Initial Audit Logs
    this.auditLogs.push(
      {
        id: 'audit-01',
        proposalId,
        eventType: 'PROJECT_CREATED',
        actorId: 'marcus_tate',
        actorName: 'Marcus Tate',
        actorRole: 'OWNER',
        notes: 'Project container created from GHL Opportunity sync',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'audit-02',
        proposalId,
        eventType: 'NOTES_INGESTED',
        actorId: 'marcus_tate',
        actorName: 'Marcus Tate',
        actorRole: 'OWNER',
        notes: 'Voice transcript pasted into ingestion hub (1,420 chars)',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'audit-03',
        proposalId,
        eventType: 'AI_EXTRACTION_COMPLETED',
        actorId: 'system_gemini',
        actorName: 'Gemini 3.1 Pro (Thinking High)',
        actorRole: 'SYSTEM',
        notes: 'Extracted 4 zones, 8 line items, 0 critical discrepancies in 11.4s',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    );
  }

  // --- Proposal Sequence Generator ---
  public generateNextProposalNumber(): string {
    this.proposalSequence += 1;
    const year = new Date().getFullYear();
    return `GP-${year}-${String(this.proposalSequence).padStart(4, '0')}`;
  }

  // --- Pricing Catalog Methods ---
  public getAllCatalogItems(category?: string, search?: string): PricingCatalogItem[] {
    let items = Array.from(this.pricingCatalog.values()).filter(i => i.isActive);
    if (category && category !== 'ALL') {
      items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return items;
  }

  public getCatalogItemBySku(sku: string): PricingCatalogItem | undefined {
    return this.pricingCatalog.get(sku);
  }

  public upsertCatalogItem(item: PricingCatalogItem): PricingCatalogItem {
    this.pricingCatalog.set(item.sku, { ...item, updatedAt: new Date().toISOString() });
    return this.pricingCatalog.get(item.sku)!;
  }

  // --- Project Methods ---
  public createProject(data: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>): ProjectRecord {
    const id = 'proj-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const record: ProjectRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, record);
    return record;
  }

  public getProject(id: string): ProjectRecord | undefined {
    return this.projects.get(id);
  }

  public updateProject(id: string, updates: Partial<ProjectRecord>): ProjectRecord | undefined {
    const current = this.projects.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  }

  public listProjects(): ProjectRecord[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Proposal Methods ---
  public createProposal(data: Omit<ProposalRecord, 'id' | 'proposalNumber' | 'createdAt' | 'updatedAt'>): ProposalRecord {
    const id = 'prop-' + Math.random().toString(36).substring(2, 9);
    const proposalNumber = this.generateNextProposalNumber();
    const now = new Date().toISOString();
    const record: ProposalRecord = {
      ...data,
      id,
      proposalNumber,
      createdAt: now,
      updatedAt: now
    };
    this.proposals.set(id, record);
    return record;
  }

  public getProposal(id: string): ProposalRecord | undefined {
    return this.proposals.get(id);
  }

  public getHydratedProposal(id: string): HydratedProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;

    const project = this.projects.get(proposal.projectId);
    
    // Fast O(k) zone lookup via secondary index
    const zoneIds = this.zoneIdsByProposalId.get(id) || new Set();
    const zones = Array.from(zoneIds)
      .map(zId => this.proposalZones.get(zId))
      .filter((z): z is ProposalZoneRecord => !!z)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(z => {
        // Fast O(k) item lookup via zone secondary index
        const itemIds = this.itemIdsByZoneId.get(z.id) || new Set();
        const items = Array.from(itemIds)
          .map(itemId => this.proposalItems.get(itemId))
          .filter((item): item is ProposalItemRecord => !!item)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        return { ...z, items };
      });

    // Fast O(k) discrepancy lookup via secondary index
    const discIds = this.discrepancyIdsByProposalId.get(id) || new Set();
    const discrepancies = Array.from(discIds)
      .map(dId => this.proposalDiscrepancies.get(dId))
      .filter((d): d is ProposalDiscrepancyRecord => !!d);

    // Fast O(k) audit log lookup via secondary index
    const auditLogs = (this.auditLogsByProposalId.get(id) || []).slice().sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Fast O(k) integration event lookup via secondary index
    const eventIds = this.integrationEventIdsByProposalId.get(id) || new Set();
    const integrationEvents = Array.from(eventIds)
      .map(eId => this.integrationEvents.get(eId))
      .filter((e): e is IntegrationEventRecord => !!e);

    return {
      ...proposal,
      clientName: project?.clientName || 'Valued Client',
      propertyAddress: project?.propertyAddress || 'Phoenix Metro, AZ',
      clientEmail: project?.clientEmail,
      clientPhone: project?.clientPhone,
      zones,
      discrepancies,
      auditLogs,
      integrationEvents
    };
  }

  public updateProposal(id: string, updates: Partial<ProposalRecord>): ProposalRecord | undefined {
    const current = this.proposals.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.proposals.set(id, updated);
    return updated;
  }

  public listProposals(statusFilter?: ProposalStatus, limit: number = 100, offset: number = 0): HydratedProposal[] {
    let all = Array.from(this.proposals.values());
    if (statusFilter) {
      all = all.filter(p => p.status === statusFilter);
    }
    return all
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(offset, offset + limit)
      .map(p => this.getHydratedProposal(p.id)!)
      .filter(Boolean);
  }

  // --- Proposal Zone & Item Methods ---
  public addZone(data: Omit<ProposalZoneRecord, 'id' | 'createdAt'>): ProposalZoneRecord {
    const id = 'zone-' + Math.random().toString(36).substring(2, 9);
    const zone: ProposalZoneRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.proposalZones.set(id, zone);
    this.addToIndex(this.zoneIdsByProposalId, data.proposalId, id);
    return zone;
  }

  public addItem(data: Omit<ProposalItemRecord, 'id' | 'createdAt' | 'updatedAt'>): ProposalItemRecord {
    const id = 'item-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const item: ProposalItemRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.proposalItems.set(id, item);
    this.addToIndex(this.itemIdsByProposalId, data.proposalId, id);
    this.addToIndex(this.itemIdsByZoneId, data.zoneId, id);
    this.recalculateProposalFinancials(data.proposalId);
    return item;
  }

  public updateItem(id: string, updates: Partial<ProposalItemRecord>): ProposalItemRecord | undefined {
    const current = this.proposalItems.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    if (updated.quantity !== null) {
      updated.extendedCost = Math.round(updated.quantity * updated.unitCost * 100) / 100;
      updated.extendedPrice = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
    }
    this.proposalItems.set(id, updated);
    this.recalculateProposalFinancials(updated.proposalId);
    return updated;
  }

  public deleteItem(id: string): boolean {
    const item = this.proposalItems.get(id);
    if (!item) return false;
    const proposalId = item.proposalId;
    const zoneId = item.zoneId;
    this.proposalItems.delete(id);
    this.removeFromIndex(this.itemIdsByProposalId, proposalId, id);
    this.removeFromIndex(this.itemIdsByZoneId, zoneId, id);
    this.recalculateProposalFinancials(proposalId);
    return true;
  }

  public clearProposalZonesAndItems(proposalId: string) {
    const itemIds = this.itemIdsByProposalId.get(proposalId);
    if (itemIds) {
      for (const itemId of itemIds) {
        const item = this.proposalItems.get(itemId);
        if (item) {
          this.removeFromIndex(this.itemIdsByZoneId, item.zoneId, itemId);
        }
        this.proposalItems.delete(itemId);
      }
      this.itemIdsByProposalId.delete(proposalId);
    }

    const zoneIds = this.zoneIdsByProposalId.get(proposalId);
    if (zoneIds) {
      for (const zoneId of zoneIds) {
        this.proposalZones.delete(zoneId);
      }
      this.zoneIdsByProposalId.delete(proposalId);
    }

    const discIds = this.discrepancyIdsByProposalId.get(proposalId);
    if (discIds) {
      for (const discId of discIds) {
        this.proposalDiscrepancies.delete(discId);
      }
      this.discrepancyIdsByProposalId.delete(proposalId);
    }
  }

  public addDiscrepancy(data: Omit<ProposalDiscrepancyRecord, 'id' | 'createdAt'>): ProposalDiscrepancyRecord {
    const id = 'disc-' + Math.random().toString(36).substring(2, 9);
    const disc: ProposalDiscrepancyRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.proposalDiscrepancies.set(id, disc);
    this.addToIndex(this.discrepancyIdsByProposalId, data.proposalId, id);
    return disc;
  }

  public resolveDiscrepancy(id: string): boolean {
    const disc = this.proposalDiscrepancies.get(id);
    if (!disc) return false;
    disc.isResolved = true;
    return true;
  }

  // --- Financial Recalculation Engine (Deterministic Math) ---
  public recalculateProposalFinancials(proposalId: string): ProposalRecord | undefined {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return undefined;

    const itemIds = this.itemIdsByProposalId.get(proposalId) || new Set();
    const items: ProposalItemRecord[] = [];
    for (const itemId of itemIds) {
      const item = this.proposalItems.get(itemId);
      if (item && !item.isOptionalAddon) {
        items.push(item);
      }
    }

    let subtotal = 0;
    let totalCost = 0;

    for (const item of items) {
      if (item.quantity !== null && item.quantity > 0) {
        subtotal += item.extendedPrice;
        totalCost += item.extendedCost;
      }
    }

    subtotal = Math.round(subtotal * 100) / 100;
    totalCost = Math.round(totalCost * 100) / 100;
    const grossProfit = Math.round((subtotal - totalCost) * 100) / 100;
    const grossMarginPercent = subtotal > 0 ? Math.round((grossProfit / subtotal) * 10000) / 100 : 0;
    const taxRate = proposal.taxRate || 0.086;
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    const updated: ProposalRecord = {
      ...proposal,
      subtotalPrice: subtotal,
      totalCost,
      grossProfit,
      grossMarginPercent,
      taxRate,
      taxAmount,
      grandTotal,
      updatedAt: new Date().toISOString()
    };

    this.proposals.set(proposalId, updated);
    return updated;
  }

  // --- Snapshots ---
  public createVersionSnapshot(proposalId: string, author: string): ProposalVersionRecord | undefined {
    const hydrated = this.getHydratedProposal(proposalId);
    if (!hydrated) return undefined;

    const id = 'ver-' + Math.random().toString(36).substring(2, 9);
    const versionNumber = hydrated.version;
    const record: ProposalVersionRecord = {
      id,
      proposalId,
      versionNumber,
      statusAtSnapshot: hydrated.status,
      snapshotPayload: JSON.parse(JSON.stringify(hydrated)),
      createdBy: author,
      createdAt: new Date().toISOString()
    };
    this.proposalVersions.set(id, record);
    this.addToIndex(this.versionIdsByProposalId, proposalId, id);
    return record;
  }

  // --- Audit Log Methods ---
  public appendAuditLog(data: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
    const id = 'audit-' + Math.random().toString(36).substring(2, 9);
    const record: AuditLogRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.push(record);
    
    let list = this.auditLogsByProposalId.get(data.proposalId);
    if (!list) {
      list = [];
      this.auditLogsByProposalId.set(data.proposalId, list);
    }
    list.push(record);
    return record;
  }

  public getAuditLogsForProposal(proposalId: string): AuditLogRecord[] {
    return (this.auditLogsByProposalId.get(proposalId) || []).slice().sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // --- Integration Events ---
  public recordIntegrationEvent(data: Omit<IntegrationEventRecord, 'id' | 'createdAt'>): IntegrationEventRecord {
    const id = 'integ-' + Math.random().toString(36).substring(2, 9);
    const record: IntegrationEventRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.integrationEvents.set(id, record);
    this.addToIndex(this.integrationEventIdsByProposalId, data.proposalId, id);
    return record;
  }

  public getIntegrationEvent(id: string): IntegrationEventRecord | undefined {
    return this.integrationEvents.get(id);
  }

  public updateIntegrationEvent(id: string, updates: Partial<IntegrationEventRecord>): IntegrationEventRecord | undefined {
    const current = this.integrationEvents.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...updates };
    this.integrationEvents.set(id, updated);
    return updated;
  }

  public listIntegrationEvents(proposalId?: string): IntegrationEventRecord[] {
    const all = Array.from(this.integrationEvents.values());
    const filtered = proposalId ? all.filter(e => e.proposalId === proposalId) : all;
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Singleton database repository instance
export const db = new InMemoryDatabase();
