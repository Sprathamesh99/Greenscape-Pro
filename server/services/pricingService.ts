import { db } from '../db';
import { PricingCatalogItem, LineItemStatus, UnitOfMeasure } from '../db/types';
import { AIExtractedItem } from '../types/api';
import { PricingEngine, DeterministicLineItemResult, FinancialBreakdown } from './pricingEngine';

export interface MatchedProposalItem extends DeterministicLineItemResult {}

class PricingService {
  private engine: PricingEngine;

  constructor() {
    this.engine = new PricingEngine(db.getAllCatalogItems());
  }

  private refreshCatalog(): void {
    this.engine.loadCatalog(db.getAllCatalogItems());
  }

  /**
   * Deterministically match an extracted item against the 200+ master pricing catalog.
   */
  public matchItem(item: AIExtractedItem): MatchedProposalItem {
    this.refreshCatalog();
    return this.engine.processItem(item);
  }

  /**
   * Lookup directly by SKU code
   */
  public lookupBySku(sku: string): PricingCatalogItem | null {
    this.refreshCatalog();
    return this.engine.lookupBySku(sku);
  }

  /**
   * Recalculate financial breakdown for a list of items deterministically
   */
  public calculateTotals(
    items: Array<{ quantity: number | null; unitCost: number; unitPrice: number; isOptionalAddon: boolean; status?: LineItemStatus }>,
    taxRate: number = 0.086
  ): FinancialBreakdown {
    return this.engine.calculateBreakdown(items, taxRate);
  }
}

export const pricingService = new PricingService();

