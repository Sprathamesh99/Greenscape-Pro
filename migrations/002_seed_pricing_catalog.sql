-- ==============================================================================
-- GREENSCAPE PRO PROPOSAL INTELLIGENCE AGENT - DATABASE MIGRATION 002
-- Target: Supabase / PostgreSQL 15+
-- Description: Master Pricing Catalog Seeds (Phoenix Metro Residential/Commercial)
-- ==============================================================================

INSERT INTO pricing_catalog (sku, name, category, unit, unit_cost, unit_price, labor_hours_per_unit, description)
VALUES
-- Hardscape & Pavers
('PAV-TRAV-01', 'Silver/Ivory Premium Travertine Pavers', 'Hardscape', 'SQFT', 8.50, 16.50, 0.35, 'French pattern unfilled tumbled travertine on compacted aggregate base'),
('PAV-BEL-01', 'Belgard Catalina Slate Concrete Pavers', 'Hardscape', 'SQFT', 5.20, 11.80, 0.25, 'Three-piece textured modular interlocking concrete pavers'),
('PAV-PORC-01', 'Outdoor Architectural Porcelain Pavers 24x24', 'Hardscape', 'SQFT', 11.00, 22.00, 0.40, 'Vitrified slip-resistant rectified porcelain on sand/gravel base'),
('BASE-AGG-01', 'Crushed Aggregate Base ABC (4-inch depth)', 'Hardscape', 'SQFT', 1.20, 2.75, 0.08, 'Compacted aggregate road base graded and mechanically tamped'),
('EDG-POLY-01', 'Snap-Edge Commercial Paver Restraint & Spikes', 'Hardscape', 'LNFT', 1.80, 4.25, 0.05, 'Rigid polymer paver edge restraint with 10-inch steel spikes'),

-- Turf & Ground Cover
('TRF-PET-01', 'ProFlow Pet-Friendly Antimicrobial Turf 80oz', 'Turf & Ground Cover', 'SQFT', 3.80, 8.75, 0.15, '100% permeable backing with non-absorbent antimicrobial yarn and ZeoFill infill'),
('TRF-LUX-01', 'Sonoran Lush Deluxe Synthetic Turf 90oz', 'Turf & Ground Cover', 'SQFT', 4.10, 9.50, 0.16, 'Four-color olive/emerald blade mix with warm tan thatch and anti-glare technology'),
('GRV-MAD-01', 'Madison Gold Decorative Granite (1/2-inch screened, 2-inch depth)', 'Turf & Ground Cover', 'SQFT', 0.85, 1.95, 0.04, 'Screened decomposed granite surface layer distributed to uniform depth'),
('GRV-TAB-01', 'Table Mesa Brown Landscape Rock (3/4-inch screened)', 'Turf & Ground Cover', 'SQFT', 0.90, 2.10, 0.04, 'Earthy brown screened decorative ground cover'),
('RIP-BOU-01', 'Surface Rip-Rap River Rock (3-6 inch decorative)', 'Turf & Ground Cover', 'TON', 85.00, 195.00, 1.50, 'Decorative wash rip-rap for dry creek beds and swale runoff'),

-- Irrigation & Smart Water Systems
('IRR-DRP-01', 'Commercial Drip Irrigation Zone (Smart Valves & Emitters)', 'Irrigation', 'ZONE', 220.00, 495.00, 3.50, 'Rain Bird commercial drip control zone kit with pressure regulator and micron filter'),
('IRR-CON-01', 'Hunter Pro-HC 12-Station Wi-Fi Smart Controller', 'Irrigation', 'EA', 195.00, 450.00, 2.00, 'Predictive smart watering controller with web weather sync and flow monitoring'),
('IRR-PVB-01', 'Febco 765 1-inch Pressure Vacuum Breaker Assembly', 'Irrigation', 'EA', 165.00, 385.00, 2.50, 'Backflow preventer assembly with bronze ball valves and insulated freeze cover'),
('IRR-SUB-01', 'Subsurface Poly Tubing & PC Bubbler Grid', 'Irrigation', 'LNFT', 0.65, 1.85, 0.03, 'Pressure-compensating 1/2-inch UV-resistant distribution line with self-flushing emitters'),

-- Plantings & Trees
('PLT-IRO-24', 'Desert Ironwood Specimen Tree (24-inch box)', 'Plantings', 'EA', 185.00, 425.00, 2.00, 'Olneya tesota native desert hardwood with deep root well and staking kit'),
('PLT-MES-36', 'Velvet Mesquite Mature Character Tree (36-inch box)', 'Plantings', 'EA', 420.00, 950.00, 4.00, 'Prosopis velutina multi-trunk specimen with crane placement and organic soil blend'),
('PLT-AGV-05', 'Artichoke Agave / Whale Tongue Agave (5-gallon)', 'Plantings', 'EA', 28.00, 68.00, 0.40, 'Agave parryi / ovatifolia architectural desert succulent in amended backfill'),
('PLT-RED-05', 'Red Yucca / Desert Spoon Accent Shrub (5-gallon)', 'Plantings', 'EA', 22.00, 52.00, 0.35, 'Hesperaloe parviflora drought-tolerant perennial with dedicated emitter'),
('PLT-BOU-15', 'Torch Glow Bougainvillea (15-gallon)', 'Plantings', 'EA', 55.00, 135.00, 0.75, 'Compact upright flowering desert accent in amended planter bed'),

-- Outdoor Living, Fire & Pergolas
('STR-FIR-01', 'Custom Masonry Gas Fire Pit with Travertine Cap & Lava Rock', 'Outdoor Living', 'EA', 1450.00, 3200.00, 16.00, 'Cinder block gas fire pit with stucco finish, stainless burner ring, and travertine ledge'),
('STR-BBQ-01', 'Custom 8-foot Outdoor Kitchen Island with Granite Countertop', 'Outdoor Living', 'EA', 3200.00, 7500.00, 32.00, 'Galvanized steel stud framing, cement board, porcelain/granite top, and grill cutout'),
('STR-ALU-01', 'Modern 4-Post Alumawood Insulated Solid Roof Patio Cover (12x20)', 'Outdoor Living', 'SQFT', 24.00, 55.00, 0.60, 'Heavy-duty embossed aluminum structure with ceiling fan electrical prep'),

-- Low Voltage LED Lighting
('LGT-XFR-01', 'FX Luminaire 300W Stainless Steel Smart Transformer', 'Lighting', 'EA', 310.00, 680.00, 2.00, 'Multi-tap low-voltage transformer with Wi-Fi astronomical timer and zoning module'),
('LGT-PTH-01', 'Cast Brass Low Voltage LED Path Light Fixture', 'Lighting', 'EA', 42.00, 115.00, 0.50, 'Heavy-duty cast brass directional path light with waterproof heat-shrink connection'),
('LGT-UP-01', 'Cast Brass Directional Tree/Accent LED Spotlight', 'Lighting', 'EA', 48.00, 128.00, 0.50, 'Adjustable brass spotlight with brass shroud, ground stake, and silicone gel splice')
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    unit_cost = EXCLUDED.unit_cost,
    unit_price = EXCLUDED.unit_price,
    labor_hours_per_unit = EXCLUDED.labor_hours_per_unit,
    description = EXCLUDED.description,
    updated_at = NOW();
