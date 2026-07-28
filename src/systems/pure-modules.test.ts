import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Feature: dungeon-visual-overhaul, Property 54: Independencia de Phaser de los sistemas puros
 *
 * Verifies that all pure modules declare zero imports of the 'phaser' module.
 * This ensures they can run in jsdom without instantiating Phaser.Game.
 */
describe('Pure modules independence from Phaser', () => {
  const PURE_MODULES = [
    'src/systems/ThemeSystem.ts',
    'src/systems/LayoutSystem.ts',
    'src/systems/PropPlacer.ts',
    'src/systems/CircuitPathSystem.ts',
    'src/systems/MapValidator.ts',
    'src/systems/LightingSystem.ts',
    'src/systems/TilemapSerializer.ts',
    'src/systems/TilemapParser.ts',
    'src/systems/MinimapProjection.ts',
    'src/systems/CameraFraming.ts',
    'src/systems/HudLayout.ts',
    'src/systems/MapPipeline.ts',
    'src/lib/Prng.ts',
    'src/lib/TextPager.ts',
  ];

  const PHASER_IMPORT_PATTERNS = [
    /import\s+.*from\s+['"]phaser['"]/,
    /import\s+Phaser\s+from/,
    /require\s*\(\s*['"]phaser['"]\s*\)/,
  ];

  for (const modulePath of PURE_MODULES) {
    it(`${modulePath} does not import phaser`, () => {
      const fullPath = path.resolve(process.cwd(), modulePath);
      const source = fs.readFileSync(fullPath, 'utf-8');

      for (const pattern of PHASER_IMPORT_PATTERNS) {
        expect(source).not.toMatch(pattern);
      }
    });
  }
});
