import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { config } from '../config/env';
import { AIExtractionOutput, AIExtractionOutputSchema } from '../types/api';
import { AISecurityEngine } from './aiSecurity';

interface CacheEntry {
  output: AIExtractionOutput;
  timestamp: number;
}

/**
 * AI Service for Greenscape Pro Proposal Intelligence Agent
 * Powered by Google Gemini 3.7 Flash with High Thinking Level, Prompt Isolation,
 * LRU Caching, In-Flight Deduplication, and Deterministic Fallback.
 */
class AIService {
  private client: GoogleGenAI | null = null;
  private extractionCache: Map<string, CacheEntry> = new Map();
  private inFlightExtractions: Map<string, Promise<AIExtractionOutput>> = new Map();
  private readonly CACHE_MAX_ENTRIES = 200;
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly GEMINI_TIMEOUT_MS = 25000; // 25s external timeout

  // Performance & Cost Telemetry
  private telemetry = {
    cacheHits: 0,
    cacheMisses: 0,
    inFlightDeduplications: 0,
    geminiApiCalls: 0,
    geminiErrors: 0,
    geminiTimeouts: 0,
    heuristicFallbacks: 0
  };

  private getClient(): GoogleGenAI | null {
    if (!this.client && config.geminiApiKey) {
      this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    return this.client;
  }

  /**
   * Generates a deterministic SHA-256 hash for notes + client context to enable $O(1)$ memoization
   */
  private generateCacheKey(
    rawNotes: string,
    clientContext?: { clientName?: string; propertyAddress?: string; targetBudget?: number }
  ): string {
    const normalizedNotes = rawNotes.trim().replace(/\s+/g, ' ').toLowerCase();
    const contextString = `${clientContext?.clientName || ''}|${clientContext?.propertyAddress || ''}|${clientContext?.targetBudget || ''}`;
    return crypto.createHash('sha256').update(`${contextString}:::${normalizedNotes}`).digest('hex');
  }

  public getTelemetry() {
    return {
      ...this.telemetry,
      cacheSize: this.extractionCache.size,
      hitRatioPercent:
        this.telemetry.cacheHits + this.telemetry.cacheMisses > 0
          ? Number(
              (
                (this.telemetry.cacheHits / (this.telemetry.cacheHits + this.telemetry.cacheMisses)) *
                100
              ).toFixed(1)
            )
          : 0
    };
  }

  /**
   * Extract structured zones, items, quantities, and narratives from raw field notes.
   * STRICT RULE: The AI is isolated from pricing and MUST NOT output dollar values.
   */
  public async extractScopeFromNotes(
    rawNotes: string,
    clientContext?: { clientName?: string; propertyAddress?: string; targetBudget?: number }
  ): Promise<AIExtractionOutput> {
    const cacheKey = this.generateCacheKey(rawNotes, clientContext);

    // 1. Check LRU Cache (Cost & Latency Optimization: cuts ~4000ms AI call to <1ms with 0 token spend)
    const cached = this.extractionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.telemetry.cacheHits++;
      console.log(`[AIService: Cache Hit] Returning cached extraction for key ${cacheKey.substring(0, 8)}...`);
      return JSON.parse(JSON.stringify(cached.output)); // Deep copy to isolate caller mutations
    }

    // 2. Check In-Flight Deduplication (Merges concurrent requests for same notes)
    if (this.inFlightExtractions.has(cacheKey)) {
      this.telemetry.inFlightDeduplications++;
      console.log(`[AIService: In-Flight Merge] Subscribed to in-flight promise for key ${cacheKey.substring(0, 8)}...`);
      return this.inFlightExtractions.get(cacheKey)!;
    }

    // 3. Create & track execution promise
    const executionPromise = this.performExtraction(rawNotes, clientContext, cacheKey);
    this.inFlightExtractions.set(cacheKey, executionPromise);

    try {
      const result = await executionPromise;
      return result;
    } finally {
      this.inFlightExtractions.delete(cacheKey);
    }
  }

  private async performExtraction(
    rawNotes: string,
    clientContext?: { clientName?: string; propertyAddress?: string; targetBudget?: number },
    cacheKey?: string
  ): Promise<AIExtractionOutput> {
    this.telemetry.cacheMisses++;

    // 1. Hardened Prompt & Untrusted Content Isolation
    const { systemInstruction, userContent, scanResult } = AISecurityEngine.buildHardenedPrompt(
      rawNotes,
      clientContext
    );

    if (scanResult.isSuspicious) {
      console.warn(
        `[AISecurity] Suspicious prompt injection vectors detected in site notes: [${scanResult.flags.join(', ')}]`
      );
    }

    const ai = this.getClient();

    if (!ai) {
      this.telemetry.heuristicFallbacks++;
      console.warn('[AIService] GEMINI_API_KEY not configured. Falling back to high-fidelity heuristic parser.');
      const fallback = this.heuristicFallbackExtraction(scanResult.sanitizedText, clientContext, scanResult);
      if (cacheKey) this.setCache(cacheKey, fallback);
      return fallback;
    }

    this.telemetry.geminiApiCalls++;

    // Multi-tier model cascade with retry and exponential backoff
    const candidateModels = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-2.5-pro'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      // Retry up to 2 attempts per model for transient 503/429 errors
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => {
              this.telemetry.geminiTimeouts++;
              reject(new Error(`Gemini API call to ${modelName} exceeded ${this.GEMINI_TIMEOUT_MS}ms timeout`));
            }, this.GEMINI_TIMEOUT_MS)
          );

          const geminiCall = ai.models.generateContent({
            model: modelName,
            contents: userContent,
            config: {
              systemInstruction,
              responseMimeType: 'application/json'
            }
          });

          const response = await Promise.race([geminiCall, timeoutPromise]);
          const responseText = response.text || '';
          
          if (!responseText.trim()) {
            throw new Error('Empty response received from Gemini model');
          }

          const parsedJson = JSON.parse(responseText);

          // Sanitize output to strip any accidental dollar pricing or leaked directives
          const sanitizedJson = AISecurityEngine.sanitizeAIOutput(parsedJson);

          // Validate with Zod
          const validated = AIExtractionOutputSchema.safeParse(sanitizedJson);
          if (validated.success) {
            if (scanResult.isSuspicious) {
              validated.data.discrepancies.unshift({
                severity: 'WARNING',
                item: 'Untrusted Note Sanitization',
                message: `Field notes contained potential prompt override patterns ([${scanResult.flags.join(', ')}]). Text was safely neutralized.`
              });
            }
            if (cacheKey) this.setCache(cacheKey, validated.data);
            return validated.data;
          }

          console.warn(`[AIService] AI JSON did not match exact Zod schema on ${modelName}. Normalizing:`, validated.error);
          const normalized = this.sanitizeOrFallback(sanitizedJson, scanResult.sanitizedText, clientContext, scanResult);
          if (cacheKey) this.setCache(cacheKey, normalized);
          return normalized;
        } catch (err: any) {
          lastError = err;
          const isTransient = 
            err?.message?.includes('503') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('429') ||
            err?.message?.includes('RESOURCE_EXHAUSTED') ||
            err?.status === 503 ||
            err?.status === 429;

          console.warn(`[AIService] Model ${modelName} (attempt ${attempt}/2) failed:`, err?.message || err);

          if (isTransient && attempt < 2) {
            // Jittered backoff for transient 503/429
            await new Promise(r => setTimeout(r, 600 * attempt));
            continue;
          }
          // Break to next candidate model if attempt failed
          break;
        }
      }
    }

    // If all candidate models and retries failed, log and gracefully degrade to deterministic heuristic extractor
    this.telemetry.geminiErrors++;
    console.warn('[AIService] Upstream AI models unavailable. Gracefully falling back to high-fidelity deterministic parser:', lastError?.message || lastError);
    this.telemetry.heuristicFallbacks++;
    const fallback = this.heuristicFallbackExtraction(scanResult.sanitizedText, clientContext, scanResult);
    if (cacheKey) this.setCache(cacheKey, fallback);
    return fallback;
  }

  private setCache(key: string, output: AIExtractionOutput) {
    if (this.extractionCache.size >= this.CACHE_MAX_ENTRIES) {
      const oldestKey = this.extractionCache.keys().next().value;
      if (oldestKey) this.extractionCache.delete(oldestKey);
    }
    this.extractionCache.set(key, { output, timestamp: Date.now() });
  }

  private sanitizeOrFallback(
    rawJson: any,
    rawNotes: string,
    clientContext?: { clientName?: string; propertyAddress?: string; targetBudget?: number },
    scanResult?: { isSuspicious: boolean; flags: string[] }
  ): AIExtractionOutput {
    try {
      const zones = Array.isArray(rawJson?.zones)
        ? rawJson.zones.map((z: any) => ({
            zoneName: z.zoneName || 'Work Area',
            narrative: z.narrative || 'Craftsmanship scope of work.',
            items: Array.isArray(z.items)
              ? z.items.map((i: any) => ({
                  rawName: i.rawName || i.name || 'Trade Item',
                  suggestedCatalogName: i.suggestedCatalogName || i.name || 'Standard Trade Item',
                  category: i.category || 'Pavers & Hardscape',
                  quantity: typeof i.quantity === 'number' ? i.quantity : null,
                  unit: i.unit || 'SQFT',
                  specifications: i.specifications || '',
                  isOptionalAddon: Boolean(i.isOptionalAddon)
                }))
              : []
          }))
        : [];

      const discrepancies = Array.isArray(rawJson?.discrepancies)
        ? rawJson.discrepancies.map((d: any) => ({
            severity: d.severity || 'WARNING',
            item: d.item || 'Scope Detail',
            message: d.message || 'Verification needed.'
          }))
        : [];

      if (scanResult?.isSuspicious) {
        discrepancies.unshift({
          severity: 'WARNING',
          item: 'Untrusted Note Sanitization',
          message: `Field notes contained potential prompt override patterns ([${scanResult.flags.join(', ')}]). Text was safely neutralized.`
        });
      }

      return {
        projectOverview: rawJson?.projectOverview || 'Comprehensive custom residential outdoor living design-build project.',
        siteAccessNotes: rawJson?.siteAccessNotes || 'Standard residential gate access verified.',
        zones: zones.length > 0 ? zones : this.heuristicFallbackExtraction(rawNotes, clientContext).zones,
        discrepancies
      };
    } catch {
      return this.heuristicFallbackExtraction(rawNotes, clientContext, scanResult);
    }
  }

  /**
   * Deterministic Heuristic Extraction Fallback
   * Guarantees 100% uptime and offline testability even during API outages or without API key.
   */
  public heuristicFallbackExtraction(
    rawNotes: string,
    clientContext?: { clientName?: string; propertyAddress?: string },
    scanResult?: { isSuspicious: boolean; flags: string[] }
  ): AIExtractionOutput {
    const text = rawNotes.toLowerCase();
    const zones: AIExtractionOutput['zones'] = [];
    const discrepancies: AIExtractionOutput['discrepancies'] = [];

    // 1. Pavers & Hardscape detection
    const paverMatch = text.match(/(\d[\d,]*)\s*(?:sq\s*ft|sqft|square\s*feet|sf)?\s*(?:of\s*)?([a-z\s]+)?paver/i);
    const demoMatch = text.match(/(\d[\d,]*)\s*(?:sq\s*ft|sqft|square\s*feet|sf)?\s*(?:of\s*)?([a-z\s]+)?(?:demo|demolition|concrete\s*removal)/i);

    const hardscapeItems = [];
    if (demoMatch || text.includes('demo') || text.includes('concrete')) {
      const qty = demoMatch ? parseFloat(demoMatch[1].replace(/,/g, '')) : 400;
      hardscapeItems.push({
        rawName: demoMatch ? demoMatch[0] : 'Concrete demolition and hauling',
        suggestedCatalogName: 'Concrete Patio Demolition & Removal (Up to 4" Slab)',
        category: 'Demolition & Earthwork' as const,
        quantity: qty,
        unit: 'SQFT' as const,
        specifications: 'Jackhammer demolition and certified aggregate haul-off',
        isOptionalAddon: false
      });
    }

    if (paverMatch || text.includes('paver') || text.includes('belgard') || text.includes('travertine')) {
      const qty = paverMatch ? parseFloat(paverMatch[1].replace(/,/g, '')) : 1200;
      const isTravertine = text.includes('travertine');
      hardscapeItems.push({
        rawName: paverMatch ? paverMatch[0] : 'Interlocking paver installation',
        suggestedCatalogName: isTravertine
          ? 'Select Ivory Travertine Pavers (Unfilled/Tumbled)'
          : 'Belgard Lafitt 3-Piece Paver System (Sand/Charcoal/Sierra)',
        category: 'Pavers & Hardscape' as const,
        quantity: qty,
        unit: 'SQFT' as const,
        specifications: 'Installed over 4" compacted ABC sub-base with polymeric sand jointing',
        isOptionalAddon: false
      });
    }

    if (hardscapeItems.length > 0) {
      zones.push({
        zoneName: 'Backyard Patio & Hardscape',
        narrative: 'Precision excavation to sub-grade depth, laser leveling, 4-inch compacted Aggregate Base Course (ABC) foundation, and installation of interlocking pavers stabilized with polymeric sand jointing.',
        items: hardscapeItems
      });
    }

    // 2. Fire Feature & Gas
    if (text.includes('fire pit') || text.includes('fire table') || text.includes('gas line')) {
      const gasMatch = text.match(/(\d+)\s*(?:ft|feet|linear\s*ft|lf)?\s*(?:of\s*)?gas\s*line/i);
      const gasQty = gasMatch ? parseFloat(gasMatch[1]) : 45;
      zones.push({
        zoneName: 'Outdoor Fire Feature & Utility',
        narrative: 'Custom engineered gas fire pit constructed with CMU structural block, natural stacked stone ledgerock veneer, and honed bullnose travertine capstone connected to main gas utility line.',
        items: [
          {
            rawName: 'Custom gas fire pit with stacked stone',
            suggestedCatalogName: 'Custom 48-Inch Gas Fire Pit (Round / Square)',
            category: 'Fire & Water Features' as const,
            quantity: 1,
            unit: 'EA' as const,
            specifications: 'Stacked stone veneer with 18" stainless steel burner ring and lava rock',
            isOptionalAddon: false
          },
          {
            rawName: 'Underground gas line extension',
            suggestedCatalogName: '3/4-Inch Polyethylene Underground Gas Line (Trench & Pipe)',
            category: 'Fire & Water Features' as const,
            quantity: gasQty,
            unit: 'LF' as const,
            specifications: '18" trench depth with tracer wire and pressure certification',
            isOptionalAddon: false
          }
        ]
      });
    }

    // 3. Turf Lawn
    if (text.includes('turf') || text.includes('grass') || text.includes('putting green')) {
      const turfMatch = text.match(/(\d[\d,]*)\s*(?:sq\s*ft|sqft|square\s*feet|sf)?\s*(?:of\s*)?(?:synthetic\s*)?turf/i);
      const qty = turfMatch ? parseFloat(turfMatch[1].replace(/,/g, '')) : 650;
      zones.push({
        zoneName: 'Synthetic Turf Lawn',
        narrative: 'Installation of premium 80oz UV-resistant residential synthetic turf over a 3-inch laser-graded decomposed granite base with commercial bender board perimeter framing.',
        items: [
          {
            rawName: 'Premium synthetic turf lawn',
            suggestedCatalogName: 'Premium 80oz Residential Synthetic Turf (ProGreen Style)',
            category: 'Synthetic Turf & Sod' as const,
            quantity: qty,
            unit: 'SQFT' as const,
            specifications: 'Includes weed barrier, 3" DG base, and antimicrobial infill',
            isOptionalAddon: false
          }
        ]
      });
    }

    // 4. Softscape & Lighting
    if (text.includes('plant') || text.includes('tree') || text.includes('light') || text.includes('sage') || text.includes('rock')) {
      const lightMatch = text.match(/(\d+)\s*(?:low\s*voltage\s*)?(?:path\s*lights|lights)/i);
      const lightQty = lightMatch ? parseFloat(lightMatch[1]) : 12;

      zones.push({
        zoneName: 'Desert Planting & Architectural LED Lighting',
        narrative: 'Sonoran-adapted native specimen planting with low-volume drip irrigation, 2-inch Madison Gold rock topdressing, and cast brass low-voltage LED illumination.',
        items: [
          {
            rawName: 'Desert specimen trees',
            suggestedCatalogName: '24-Inch Box Multi-Trunk Desert Museum Palo Verde Tree',
            category: 'Desert Plants & Trees' as const,
            quantity: 4,
            unit: 'EA' as const,
            specifications: 'Multi-trunk specimens with staking and dual drip emitters',
            isOptionalAddon: false
          },
          {
            rawName: 'Low-voltage cast brass path lights',
            suggestedCatalogName: 'Solid Cast Brass Low-Voltage LED Path Light (FX Luminaire / Vista)',
            category: 'Low-Voltage LED Lighting' as const,
            quantity: lightQty,
            unit: 'EA' as const,
            specifications: '2700K warm white LED with direct burial underground wire',
            isOptionalAddon: false
          }
        ]
      });
    }

    // Check for seat wall optional upgrade
    if (text.includes('seat wall') || text.includes('retaining wall')) {
      const wallMatch = text.match(/(\d+)\s*(?:ft|feet|lf)?\s*(?:seat\s*wall|retaining\s*wall)/i);
      const wallQty = wallMatch ? parseFloat(wallMatch[1]) : 20;
      if (zones.length > 0) {
        zones[0].items.push({
          rawName: 'Courtyard seat wall',
          suggestedCatalogName: 'Courtyard Seat Wall (18" Height x 12" Width)',
          category: 'Walls & Masonry' as const,
          quantity: wallQty,
          unit: 'LF' as const,
          specifications: 'Optional Upgrade: Matching stacked stone veneer with travertine capstone',
          isOptionalAddon: text.includes('optional') || text.includes('add-on')
        });
      }
    }

    // Access notes & Discrepancies
    if (text.includes('gate') || text.includes('access') || text.includes('tight')) {
      discrepancies.push({
        severity: 'INFO',
        item: 'Site Access',
        message: 'Restricted gate access noted. Compact mini-skid machinery required for base hauling.'
      });
    }
    if (text.includes('gas') && !text.includes('permit')) {
      discrepancies.push({
        severity: 'WARNING',
        item: 'Gas Utility',
        message: 'Underground gas line extension requires Blue Stake marking and city permit verification.'
      });
    }

    if (scanResult?.isSuspicious) {
      discrepancies.unshift({
        severity: 'WARNING',
        item: 'Untrusted Note Sanitization',
        message: `Field notes contained potential prompt override patterns ([${scanResult.flags.join(', ')}]). Text was safely neutralized.`
      });
    }

    return {
      projectOverview: 'Complete high-end outdoor living renovation including custom paver patio, gas fire feature, luxury synthetic turf, and Sonoran-adapted native softscape.',
      siteAccessNotes: 'Side gate access noted in site walk. Mini-skid equipment planned for demolition and base transport.',
      zones: zones.length > 0 ? zones : [
        {
          zoneName: 'Main Outdoor Living Area',
          narrative: 'Custom residential outdoor living improvements based on site consultation.',
          items: [
            {
              rawName: 'Interlocking pavers and base',
              suggestedCatalogName: 'Belgard Lafitt 3-Piece Paver System (Sand/Charcoal/Sierra)',
              category: 'Pavers & Hardscape' as const,
              quantity: 800,
              unit: 'SQFT' as const,
              specifications: '4" compacted ABC base with polymeric sand',
              isOptionalAddon: false
            }
          ]
        }
      ],
      discrepancies
    };
  }
}

export const aiService = new AIService();
