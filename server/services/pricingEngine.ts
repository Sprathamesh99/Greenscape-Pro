import { PricingCatalogItem, LineItemStatus, UnitOfMeasure } from '../db/types';
import { AIExtractedItem } from '../types/api';

export type PricingMatchStatus =
  | 'EXACT_MATCH'
  | 'CONFIDENT_FUZZY_MATCH'
  | 'NEEDS_PRICING_REVIEW'
  | 'MISSING_MEASUREMENT'
  | 'INVALID_QUANTITY'
  | 'INACTIVE_CATALOG_ITEM';

export interface PricingMatchInput {
  itemCodeOrSku?: string;
  rawName: string;
  suggestedCatalogName?: string;
  category?: string;
  quantity?: number | null;
  unit?: UnitOfMeasure | string;
  isOptionalAddon?: boolean;
  specifications?: string;
}

export interface DeterministicLineItemResult {
  catalogSku?: string;
  rawItemName: string;
  itemName: string;
  category: string;
  quantity: number | null;
  unit: UnitOfMeasure;
  unitCost: number;
  unitPrice: number;
  minimumCharge: number;
  extendedCost: number;
  extendedPrice: number;
  status: LineItemStatus;
  pricingStatus: PricingMatchStatus;
  matchScore: number;
  isOptionalAddon: boolean;
  specifications: string;
  validationWarnings: string[];
  reviewReason?: string;
}

export interface FinancialBreakdown {
  subtotalPrice: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  isBelowMarginFloor: boolean;
  marginAlertLevel: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  validItemCount: number;
  unpricedItemCount: number;
  missingMeasurementCount: number;
}

/**
 * Greenscape Pro - Pure Deterministic Pricing Engine
 * 
 * CORE PRINCIPLE:
 * The AI identifies requested work and suggested trade terms.
 * The AI is NEVER the source of price or calculations.
 * The Pricing Catalog is the authoritative source.
 */
export class PricingEngine {
  private catalog: Map<string, PricingCatalogItem> = new Map();
  private catalogByNameLower: Map<string, PricingCatalogItem> = new Map();
  private catalogList: PricingCatalogItem[] = [];
  private fuzzyMatchCache: Map<string, { item: PricingCatalogItem | null; score: number }> = new Map();
  private readonly MAX_FUZZY_CACHE_SIZE = 500;

  // Minimum threshold for automated acceptance of fuzzy match (0.0 to 1.0)
  public static readonly HIGH_CONFIDENCE_THRESHOLD = 0.70;
  // Margin floor mandated by Greenscape Pro ownership
  public static readonly MARGIN_FLOOR_PERCENT = 38.0;
  // Default sales tax rate for Phoenix / Maricopa County
  public static readonly DEFAULT_TAX_RATE = 0.086;

  constructor(initialCatalog: PricingCatalogItem[] = []) {
    this.loadCatalog(initialCatalog);
  }

  /**
   * Load or replace catalog items into the deterministic engine
   */
  public loadCatalog(items: PricingCatalogItem[]): void {
    this.catalog.clear();
    this.catalogByNameLower.clear();
    this.fuzzyMatchCache.clear();
    this.catalogList = items;

    for (const item of items) {
      this.catalog.set(item.sku.toUpperCase().trim(), item);
      this.catalogByNameLower.set(this.normalizeString(item.name), item);
    }
  }

  /**
   * Update or insert a single catalog item (for live price updates)
   */
  public updateCatalogItem(item: PricingCatalogItem): void {
    this.catalog.set(item.sku.toUpperCase().trim(), item);
    this.catalogByNameLower.set(this.normalizeString(item.name), item);
    this.fuzzyMatchCache.clear(); // Invalidate fuzzy cache on catalog edit
    const existingIndex = this.catalogList.findIndex(i => i.sku === item.sku);
    if (existingIndex >= 0) {
      this.catalogList[existingIndex] = item;
    } else {
      this.catalogList.push(item);
    }
  }

  /**
   * 1. Exact Item-Code / SKU Lookup
   */
  public lookupBySku(sku: string): PricingCatalogItem | null {
    if (!sku) return null;
    return this.catalog.get(sku.toUpperCase().trim()) || null;
  }

  /**
   * 2. Exact Name Lookup (case-insensitive, normalized)
   */
  public lookupByName(name: string): PricingCatalogItem | null {
    if (!name) return null;
    const normalized = this.normalizeString(name);
    return this.catalogByNameLower.get(normalized) || null;
  }

  /**
   * Match a single input item deterministically against the catalog.
   */
  public processItem(input: PricingMatchInput | AIExtractedItem): DeterministicLineItemResult {
    const rawName = (input as any).rawName || (input as any).rawItemName || '';
    const suggestedName = (input as any).suggestedCatalogName || '';
    const requestedCategory = input.category || 'Pavers & Hardscape';
    const specifications = input.specifications || '';
    const isOptionalAddon = Boolean(input.isOptionalAddon);
    const inputSku = (input as any).catalogSku || (input as any).itemCodeOrSku;

    const validationWarnings: string[] = [];

    // Step 1: Validate Quantity
    const qtyValidation = this.validateQuantity(input.quantity);
    if (qtyValidation.warning) {
      validationWarnings.push(qtyValidation.warning);
    }

    // Step 2: Attempt Match
    // Tier 1: Exact SKU match
    let matchedCatalogItem: PricingCatalogItem | null = null;
    let matchScore = 0;
    let matchType: PricingMatchStatus = 'NEEDS_PRICING_REVIEW';

    if (inputSku) {
      const directSkuMatch = this.lookupBySku(inputSku);
      if (directSkuMatch) {
        matchedCatalogItem = directSkuMatch;
        matchScore = 1.0;
        matchType = 'EXACT_MATCH';
      }
    }

    // Tier 2: Exact Normalized Name match
    if (!matchedCatalogItem && suggestedName) {
      const directNameMatch = this.lookupByName(suggestedName);
      if (directNameMatch) {
        matchedCatalogItem = directNameMatch;
        matchScore = 1.0;
        matchType = 'EXACT_MATCH';
      }
    }

    if (!matchedCatalogItem && rawName) {
      const directRawMatch = this.lookupByName(rawName);
      if (directRawMatch) {
        matchedCatalogItem = directRawMatch;
        matchScore = 1.0;
        matchType = 'EXACT_MATCH';
      }
    }

    // Tier 3: Controlled Fuzzy Overlap Matching
    if (!matchedCatalogItem) {
      const fuzzyResult = this.findBestFuzzyMatch(rawName, suggestedName, requestedCategory);
      if (fuzzyResult.item && fuzzyResult.score >= PricingEngine.HIGH_CONFIDENCE_THRESHOLD) {
        matchedCatalogItem = fuzzyResult.item;
        matchScore = fuzzyResult.score;
        matchType = 'CONFIDENT_FUZZY_MATCH';
      } else if (fuzzyResult.item) {
        matchScore = fuzzyResult.score;
        matchType = 'NEEDS_PRICING_REVIEW';
      }
    }

    // Step 3: Handle Inactive Items
    if (matchedCatalogItem && !matchedCatalogItem.isActive) {
      validationWarnings.push(`Catalog item SKU ${matchedCatalogItem.sku} is flagged as INACTIVE in price book.`);
      matchType = 'INACTIVE_CATALOG_ITEM';
    }

    // Step 4: Resolve Pricing, Units, and Status
    let unitCost = 0;
    let unitPrice = 0;
    let minimumCharge = 0;
    let catalogSku: string | undefined = undefined;
    let itemName = suggestedName || rawName || 'Custom Item';
    let category = requestedCategory;
    let unit: UnitOfMeasure = (input.unit as UnitOfMeasure) || 'EA';
    let lineStatus: LineItemStatus = 'VALID';
    let reviewReason: string | undefined = undefined;

    const isMatchAccepted = matchedCatalogItem && matchedCatalogItem.isActive && matchType !== 'NEEDS_PRICING_REVIEW';

    if (isMatchAccepted && matchedCatalogItem) {
      catalogSku = matchedCatalogItem.sku;
      itemName = matchedCatalogItem.name;
      category = matchedCatalogItem.category;
      unit = matchedCatalogItem.unit;
      unitCost = matchedCatalogItem.unitCost;
      unitPrice = matchedCatalogItem.unitSellPrice;
      minimumCharge = matchedCatalogItem.minimumCharge || 0;
    } else {
      lineStatus = 'NEEDS_PRICING';
      if (!matchedCatalogItem) {
        reviewReason = 'No matching item found in master price book with acceptable confidence.';
      } else if (!matchedCatalogItem.isActive) {
        reviewReason = `Matched item ${matchedCatalogItem.sku} is currently inactive.`;
      } else {
        reviewReason = `Fuzzy match confidence (${Math.round(matchScore * 100)}%) is below required threshold (${Math.round(PricingEngine.HIGH_CONFIDENCE_THRESHOLD * 100)}%).`;
      }
    }

    // Step 5: Quantity status overrides
    if (qtyValidation.status === 'MISSING') {
      lineStatus = 'MISSING_MEASUREMENT';
      matchType = 'MISSING_MEASUREMENT';
      reviewReason = reviewReason || 'Quantity is missing or omitted from site notes.';
    } else if (qtyValidation.status === 'INVALID') {
      lineStatus = 'MISSING_MEASUREMENT';
      matchType = 'INVALID_QUANTITY';
      reviewReason = reviewReason || `Invalid quantity: ${input.quantity}. Must be a positive non-zero number.`;
    }

    // Step 6: Deterministic Calculations & Rounding Rules
    const validQty = qtyValidation.status === 'VALID' ? qtyValidation.cleanQuantity : null;
    let rawExtendedCost = 0;
    let rawExtendedPrice = 0;

    if (validQty !== null) {
      rawExtendedCost = validQty * unitCost;
      rawExtendedPrice = validQty * unitPrice;

      // Apply minimum charge if specified in catalog
      if (minimumCharge > 0 && rawExtendedPrice > 0 && rawExtendedPrice < minimumCharge) {
        rawExtendedPrice = minimumCharge;
        validationWarnings.push(`Minimum charge applied: $${minimumCharge.toFixed(2)} (base calculation was $${(validQty * unitPrice).toFixed(2)})`);
      }
    }

    const extendedCost = this.roundFinancial(rawExtendedCost);
    const extendedPrice = this.roundFinancial(rawExtendedPrice);

    return {
      catalogSku,
      rawItemName: rawName,
      itemName,
      category,
      quantity: validQty,
      unit,
      unitCost,
      unitPrice,
      minimumCharge,
      extendedCost,
      extendedPrice,
      status: lineStatus,
      pricingStatus: matchType,
      matchScore: Math.round(matchScore * 100) / 100,
      isOptionalAddon,
      specifications,
      validationWarnings,
      reviewReason
    };
  }

  /**
   * Process multiple extracted items in bulk
   */
  public processItems(items: Array<PricingMatchInput | AIExtractedItem>): DeterministicLineItemResult[] {
    return items.map(item => this.processItem(item));
  }

  /**
   * Recalculate contract subtotal, direct costs, tax, and gross margins deterministically.
   * Rounding rule: Half-up to 2 decimal places at each boundary.
   */
  public calculateBreakdown(
    items: Array<{ quantity: number | null; unitCost: number; unitPrice: number; isOptionalAddon?: boolean; status?: LineItemStatus }>,
    taxRate: number = PricingEngine.DEFAULT_TAX_RATE
  ): FinancialBreakdown {
    let subtotal = 0;
    let totalCost = 0;
    let validCount = 0;
    let unpricedCount = 0;
    let missingQtyCount = 0;

    for (const item of items) {
      const isOptional = Boolean(item.isOptionalAddon);
      const isQtyMissing = item.quantity === null || item.quantity <= 0;
      const isUnpriced = item.unitPrice === 0;

      if (isQtyMissing) {
        missingQtyCount++;
      }
      if (isUnpriced) {
        unpricedCount++;
      }

      if (!isOptional && !isQtyMissing && !isUnpriced && item.quantity !== null) {
        const linePrice = item.quantity * item.unitPrice;
        const lineCost = item.quantity * item.unitCost;
        subtotal += linePrice;
        totalCost += lineCost;
        validCount++;
      }
    }

    const roundedSubtotal = this.roundFinancial(subtotal);
    const roundedTotalCost = this.roundFinancial(totalCost);
    const grossProfit = this.roundFinancial(roundedSubtotal - roundedTotalCost);

    let grossMarginPercent = 0;
    if (roundedSubtotal > 0) {
      grossMarginPercent = Math.round((grossProfit / roundedSubtotal) * 10000) / 100;
    }

    const taxAmount = this.roundFinancial(roundedSubtotal * taxRate);
    const grandTotal = this.roundFinancial(roundedSubtotal + taxAmount);

    const isBelowMarginFloor = grossMarginPercent < PricingEngine.MARGIN_FLOOR_PERCENT;
    let marginAlertLevel: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (grossMarginPercent < 30.0) {
      marginAlertLevel = 'CRITICAL';
    } else if (isBelowMarginFloor) {
      marginAlertLevel = 'WARNING';
    }

    return {
      subtotalPrice: roundedSubtotal,
      totalCost: roundedTotalCost,
      grossProfit,
      grossMarginPercent,
      taxRate,
      taxAmount,
      grandTotal,
      isBelowMarginFloor,
      marginAlertLevel,
      validItemCount: validCount,
      unpricedItemCount: unpricedCount,
      missingMeasurementCount: missingQtyCount
    };
  }

  // --- Internal Helpers ---

  private validateQuantity(quantity: any): {
    status: 'VALID' | 'MISSING' | 'INVALID';
    cleanQuantity: number | null;
    warning?: string;
  } {
    if (quantity === null || quantity === undefined || quantity === '') {
      return { status: 'MISSING', cleanQuantity: null, warning: 'Missing quantity measurement.' };
    }

    const num = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
    if (isNaN(num)) {
      return { status: 'INVALID', cleanQuantity: null, warning: `Quantity '${quantity}' is not a valid number.` };
    }

    if (num <= 0) {
      return { status: 'INVALID', cleanQuantity: null, warning: `Quantity (${num}) must be greater than zero.` };
    }

    // Check for suspicious extreme quantities in Phoenix residential contexts
    if (num > 100000) {
      return { status: 'VALID', cleanQuantity: num, warning: `Quantity (${num}) is unusually large. Requires estimator verification.` };
    }

    return { status: 'VALID', cleanQuantity: num };
  }

  private findBestFuzzyMatch(
    rawName: string,
    suggestedName: string,
    category: string
  ): { item: PricingCatalogItem | null; score: number } {
    const target = `${suggestedName} ${rawName} ${category}`.toLowerCase().trim();

    // Check fast cache
    const cached = this.fuzzyMatchCache.get(target);
    if (cached) {
      return cached;
    }

    let bestItem: PricingCatalogItem | null = null;
    let highestScore = 0;

    for (const item of this.catalogList) {
      const score = this.calculateItemSimilarity(target, item);
      if (score > highestScore) {
        highestScore = score;
        bestItem = item;
      }
    }

    const result = { item: bestItem, score: Math.round(highestScore * 100) / 100 };

    if (this.fuzzyMatchCache.size < this.MAX_FUZZY_CACHE_SIZE) {
      this.fuzzyMatchCache.set(target, result);
    }

    return result;
  }

  private calculateItemSimilarity(target: string, catalogItem: PricingCatalogItem): number {
    const candidate = `${catalogItem.name} ${catalogItem.sku} ${catalogItem.category} ${catalogItem.description}`.toLowerCase();

    const targetTokens = target.replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2);
    const candidateTokens = new Set(candidate.replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2));

    if (targetTokens.length === 0) return 0;

    let matchedTokens = 0;
    for (const token of targetTokens) {
      if (candidateTokens.has(token)) {
        matchedTokens += 1;
      } else {
        for (const cToken of candidateTokens) {
          if (cToken.includes(token) || token.includes(cToken)) {
            matchedTokens += 0.5;
            break;
          }
        }
      }
    }

    let score = matchedTokens / targetTokens.length;

    // Category match bonus
    if (target.includes(catalogItem.category.toLowerCase())) {
      score += 0.15;
    }

    // High-value Phoenix trade terminology anchors
    const tradeAnchors = [
      'belgard', 'travertine', 'fire pit', 'gas line', 'synthetic turf', 'turf',
      'palo verde', 'path light', 'seat wall', 'concrete demo', 'french drain',
      'madison gold', 'crushed granite', 'texas sage', 'drip irrigation', 'sod'
    ];

    for (const anchor of tradeAnchors) {
      if (target.includes(anchor) && candidate.includes(anchor)) {
        score += 0.20;
      }
    }

    return Math.min(score, 1.0);
  }

  private normalizeString(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private roundFinancial(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
