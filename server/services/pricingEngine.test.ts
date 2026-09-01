import { PricingEngine } from './pricingEngine';
import { PricingCatalogItem } from '../db/types';

/**
 * Greenscape Pro - Synthetic Master Catalog Sample for Unit Tests
 * (Production pricing is imported from Greenscape Pro authoritative spreadsheets)
 */
const TEST_CATALOG: PricingCatalogItem[] = [
  {
    id: 'pc-test-01',
    sku: 'PAV-BEL-LAFITT',
    name: 'Belgard Lafitt 3-Piece Pavers (Toscana / Victorian)',
    category: 'Pavers & Hardscape',
    unit: 'SQFT',
    unitCost: 8.50,
    unitSellPrice: 18.75,
    minimumCharge: 500,
    description: '3-piece modular paver on 4 inch ABC base with polymeric sand.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pc-test-02',
    sku: 'FIRE-GAS-48SQ',
    name: '48" Custom Square Gas Fire Pit (Stacked Stone Veneer & Travertine Cap)',
    category: 'Fire & Water Features',
    unit: 'EA',
    unitCost: 1650.00,
    unitSellPrice: 3850.00,
    minimumCharge: 3850,
    description: 'Custom block structure with fire-rated refractory mortar, stainless burner, and ledgerock veneer.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pc-test-03',
    sku: 'TURF-LUX-80OZ',
    name: 'Luxury Putting / Landscape Turf (80oz Diamond Blade)',
    category: 'Synthetic Turf & Sod',
    unit: 'SQFT',
    unitCost: 4.25,
    unitSellPrice: 9.75,
    minimumCharge: 750,
    description: 'Commercial backing with antimicrobial infill and compacted DG base.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pc-test-04',
    sku: 'PLT-TREE-PV-15G',
    name: 'Desert Museum Palo Verde Tree (15-Gallon)',
    category: 'Desert Plants & Trees',
    unit: 'EA',
    unitCost: 95.00,
    unitSellPrice: 245.00,
    minimumCharge: 0,
    description: 'Thornless hybrid Palo Verde with tree stake kit and dual 2-GPH emitters.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pc-test-05',
    sku: 'DISCONTINUED-PAVER',
    name: 'Discontinued Phoenix Antique Brick Paver',
    category: 'Pavers & Hardscape',
    unit: 'SQFT',
    unitCost: 5.00,
    unitSellPrice: 12.00,
    minimumCharge: 0,
    description: 'Discontinued item retained for warranty lookups only.',
    isActive: false, // Inactive flag
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export interface TestCaseResult {
  name: string;
  passed: boolean;
  details?: string;
  actual?: any;
  expected?: any;
}

/**
 * Comprehensive Deterministic Pricing Engine Test Suite
 */
export function runPricingEngineTests(): { success: boolean; results: TestCaseResult[] } {
  const engine = new PricingEngine(TEST_CATALOG);
  const results: TestCaseResult[] = [];

  function assert(name: string, condition: boolean, details?: string, actual?: any, expected?: any) {
    results.push({
      name,
      passed: condition,
      details,
      actual,
      expected
    });
  }

  // 1. Exact SKU Match Test
  const exactSkuItem = engine.processItem({
    itemCodeOrSku: 'PAV-BEL-LAFITT',
    rawName: '1200 sq ft pavers',
    quantity: 1200
  });
  assert(
    'Exact SKU Match',
    exactSkuItem.pricingStatus === 'EXACT_MATCH' &&
    exactSkuItem.catalogSku === 'PAV-BEL-LAFITT' &&
    exactSkuItem.unitPrice === 18.75 &&
    exactSkuItem.extendedPrice === 22500.00 &&
    exactSkuItem.status === 'VALID',
    `Price=${exactSkuItem.unitPrice}, Status=${exactSkuItem.pricingStatus}`,
    exactSkuItem.extendedPrice,
    22500.00
  );

  // 2. Case Differences & Whitespace in SKU
  const caseSkuItem = engine.processItem({
    itemCodeOrSku: '  pav-bel-lafitt  ',
    rawName: 'Lafitt Pavers',
    quantity: 500
  });
  assert(
    'Case Differences & Whitespace In SKU',
    caseSkuItem.pricingStatus === 'EXACT_MATCH' &&
    caseSkuItem.catalogSku === 'PAV-BEL-LAFITT' &&
    caseSkuItem.unitPrice === 18.75,
    `Resolved SKU=${caseSkuItem.catalogSku}`
  );

  // 3. Exact Normalized Name Match
  const nameMatchItem = engine.processItem({
    rawName: 'Desert Museum Palo Verde Tree (15-Gallon)',
    quantity: 8
  });
  assert(
    'Exact Name Match',
    nameMatchItem.catalogSku === 'PLT-TREE-PV-15G' &&
    nameMatchItem.unitPrice === 245.00 &&
    nameMatchItem.extendedPrice === 1960.00,
    `Extended Price: $${nameMatchItem.extendedPrice}`
  );

  // 4. Common Wording Variations & Controlled Fuzzy Matching
  const fuzzyItem = engine.processItem({
    rawName: '48 inch custom gas firepit with stacked stone veneer',
    suggestedCatalogName: '48 inch square gas fire pit',
    category: 'Fire & Water Features',
    quantity: 1
  });
  assert(
    'Common Wording Variations Fuzzy Match',
    fuzzyItem.catalogSku === 'FIRE-GAS-48SQ' &&
    fuzzyItem.unitPrice === 3850.00 &&
    fuzzyItem.status === 'VALID',
    `MatchScore=${fuzzyItem.matchScore}, SKU=${fuzzyItem.catalogSku}`
  );

  // 5. Unknown Item (Low Confidence Match -> NEEDS_PRICING_REVIEW)
  const unknownItem = engine.processItem({
    rawName: 'Imported Moroccan Zellige Mosaic Hand-Glazed Pool Medallion Tile',
    category: 'Pavers & Hardscape',
    quantity: 1
  });
  assert(
    'Unknown Item -> NEEDS_PRICING_REVIEW',
    unknownItem.status === 'NEEDS_PRICING' &&
    unknownItem.unitPrice === 0 &&
    unknownItem.unitCost === 0 &&
    unknownItem.catalogSku === undefined &&
    unknownItem.reviewReason !== undefined,
    `Status=${unknownItem.status}, ReviewReason=${unknownItem.reviewReason}`
  );

  // 6. Missing Quantity Handling
  const missingQtyItem = engine.processItem({
    itemCodeOrSku: 'PAV-BEL-LAFITT',
    rawName: 'Belgard Pavers for Side Patio',
    quantity: null
  });
  assert(
    'Missing Quantity Handling',
    missingQtyItem.status === 'MISSING_MEASUREMENT' &&
    missingQtyItem.pricingStatus === 'MISSING_MEASUREMENT' &&
    missingQtyItem.extendedPrice === 0 &&
    missingQtyItem.catalogSku === 'PAV-BEL-LAFITT',
    `Status=${missingQtyItem.status}`
  );

  // 7. Invalid Quantity Handling (Negative / Zero / String)
  const zeroQtyItem = engine.processItem({
    itemCodeOrSku: 'TURF-LUX-80OZ',
    rawName: 'Turf',
    quantity: 0
  });
  const negativeQtyItem = engine.processItem({
    itemCodeOrSku: 'TURF-LUX-80OZ',
    rawName: 'Turf',
    quantity: -50
  });
  assert(
    'Zero / Negative Quantity Validation',
    zeroQtyItem.status === 'MISSING_MEASUREMENT' &&
    negativeQtyItem.status === 'MISSING_MEASUREMENT' &&
    negativeQtyItem.pricingStatus === 'INVALID_QUANTITY',
    `ZeroStatus=${zeroQtyItem.status}, NegStatus=${negativeQtyItem.status}`
  );

  // 8. Decimal Quantities Calculation & Half-Up Rounding
  const decimalItem = engine.processItem({
    itemCodeOrSku: 'TURF-LUX-80OZ',
    rawName: 'Turf Area with Curves',
    quantity: 345.75
  });
  // 345.75 * 9.75 = 3371.0625 -> 3371.06
  // 345.75 * 4.25 = 1469.4375 -> 1469.44
  assert(
    'Decimal Quantities & Rounding Math',
    decimalItem.extendedPrice === 3371.06 &&
    decimalItem.extendedCost === 1469.44,
    `Price=${decimalItem.extendedPrice}, Cost=${decimalItem.extendedCost}`,
    decimalItem.extendedPrice,
    3371.06
  );

  // 9. Inactive Catalog Item Handling
  const inactiveItem = engine.processItem({
    itemCodeOrSku: 'DISCONTINUED-PAVER',
    rawName: 'Antique Brick Paver',
    quantity: 200
  });
  assert(
    'Inactive Item Handling',
    inactiveItem.status === 'NEEDS_PRICING' &&
    inactiveItem.pricingStatus === 'INACTIVE_CATALOG_ITEM' &&
    inactiveItem.unitPrice === 0,
    `Status=${inactiveItem.status}, PricingStatus=${inactiveItem.pricingStatus}`
  );

  // 10. Multiple Line Items Financial Breakdown
  const multiItems = [
    { quantity: 1000, unitCost: 8.50, unitPrice: 18.75 }, // $18,750 (cost: $8,500)
    { quantity: 1, unitCost: 1650.00, unitPrice: 3850.00 }, // $3,850 (cost: $1,650)
    { quantity: 500, unitCost: 4.25, unitPrice: 9.75 }    // $4,875 (cost: $2,125)
  ];
  // Subtotal = 18750 + 3850 + 4875 = 27475.00
  // Total Cost = 8500 + 1650 + 2125 = 12275.00
  // Profit = 15200.00
  // Margin = (15200 / 27475) * 100 = 55.32%
  // Tax (8.6%) = 2362.85
  // Grand Total = 29837.85
  const breakdown = engine.calculateBreakdown(multiItems, 0.086);
  assert(
    'Multiple Line Items & Margin Math',
    breakdown.subtotalPrice === 27475.00 &&
    breakdown.totalCost === 12275.00 &&
    breakdown.grossProfit === 15200.00 &&
    breakdown.grossMarginPercent === 55.32 &&
    breakdown.taxAmount === 2362.85 &&
    breakdown.grandTotal === 29837.85 &&
    breakdown.isBelowMarginFloor === false &&
    breakdown.marginAlertLevel === 'HEALTHY',
    `Subtotal=${breakdown.subtotalPrice}, Margin=${breakdown.grossMarginPercent}%, GrandTotal=${breakdown.grandTotal}`
  );

  // 11. Live Pricing Update Propagation Test
  const dynamicEngine = new PricingEngine(TEST_CATALOG);
  const updatedItemData: PricingCatalogItem = {
    ...TEST_CATALOG[0],
    unitSellPrice: 22.00, // Price increase from $18.75 to $22.00
    updatedAt: new Date().toISOString()
  };
  dynamicEngine.updateCatalogItem(updatedItemData);
  const reprocessed = dynamicEngine.processItem({
    itemCodeOrSku: 'PAV-BEL-LAFITT',
    rawName: 'Belgard Pavers',
    quantity: 1000
  });
  assert(
    'Live Price Catalog Update',
    reprocessed.unitPrice === 22.00 &&
    reprocessed.extendedPrice === 22000.00,
    `New Price: $${reprocessed.unitPrice}`
  );

  const allPassed = results.every(r => r.passed);
  return { success: allPassed, results };
}
