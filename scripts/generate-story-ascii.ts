#!/usr/bin/env npx tsx
/**
 * Generate ASCII for all existing progressions.
 * Run with: npx tsx scripts/generate-story-ascii.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { progressionToAscii } from '../packages/core/src/test-utils/asciiMatrix.js';

// Find all story files
function findStoryFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.match(/^[0-9].*\.ts$/) &&
        currentDir.endsWith('stories')
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

async function main() {
  const files = findStoryFiles('packages/core/src/layers');

  console.log(`Found ${files.length} story files\n`);

  for (const file of files.sort()) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FILE: ${file}`);
    console.log('='.repeat(80));

    try {
      // Dynamic import
      const fullPath = path.resolve(file);
      const mod = await import(fullPath);

      // Find all PROGRESSION_* exports
      const progressionKeys = Object.keys(mod).filter(
        (k) => k.startsWith('PROGRESSION_') && mod[k]?.snapshots
      );

      if (progressionKeys.length === 0) {
        console.log('No PROGRESSION_* exports found');
        continue;
      }

      for (const key of progressionKeys) {
        const prog = mod[key];
        console.log(`\n--- ${key} ---`);
        console.log(`ID: ${prog.id}`);
        console.log(`Description: ${prog.description}`);
        console.log(`Label: ${prog.metadata?.label || 'N/A'}`);
        console.log(`Snapshots: ${prog.snapshots.length}`);
        console.log('\nASCII:');
        const ascii = progressionToAscii(prog.snapshots);
        console.log(ascii);
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
}

main().catch(console.error);
