import { Router } from 'express';
import { db } from '../db';
import { pricingService } from '../services/pricingService';
import { runPricingEngineTests } from '../services/pricingEngine.test';

const router = Router();

// GET /api/pricing/catalog - Get active price book items with filter & search
router.get('/catalog', (req, res) => {
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const items = db.getAllCatalogItems(category, search);
  res.json({
    success: true,
    data: items,
    metadata: {
      totalItems: items.length,
      note: 'Synthetic demonstration pricing only. Production rates must be imported from Greenscape Pro authoritative spreadsheets.'
    }
  });
});

// GET /api/pricing/catalog/:sku - Get catalog item by SKU
router.get('/catalog/:sku', (req, res) => {
  const item = db.getCatalogItemBySku(req.params.sku);
  if (!item) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SKU not found in catalog' } });
  }
  res.json({ success: true, data: item });
});

// GET /api/pricing/categories - Get distinct catalog categories
router.get('/categories', (req, res) => {
  const items = db.getAllCatalogItems();
  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  res.json({ success: true, data: categories });
});

// POST /api/pricing/match - Test deterministic pricing engine on arbitrary input
router.post('/match', (req, res) => {
  const item = req.body;
  const result = pricingService.matchItem(item);
  res.json({ success: true, data: result });
});

// GET /api/pricing/run-engine-tests - Run standalone deterministic test suite without calling Gemini
router.get('/run-engine-tests', (req, res) => {
  const testResults = runPricingEngineTests();
  res.json({
    success: testResults.success,
    data: testResults
  });
});

export default router;

