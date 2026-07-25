/**
 * Level definitions for Cloud Quest v2.
 * Each level defines which map, puzzles, fragments, and pipeline order it uses.
 * This connects the tilemap objects to the FragmentSystem and BossFightSystem.
 */

import type { PuzzleCategory } from '@/types';

export interface LevelDefinition {
  id: string;
  levelNumber: number;
  name: string;
  scenario: 'office' | 'server' | 'cloud';
  puzzleCategories: PuzzleCategory[];
  fragmentIds: string[];
  pipelineOrder: string[];
  bossName: string;
  bossDescription: string;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    id: 'level-1',
    levelNumber: 1,
    name: 'The Office — Git Basics',
    scenario: 'office',
    puzzleCategories: ['syntax', 'logic', 'devops'],
    fragmentIds: ['frag-l1-01', 'frag-l1-02', 'frag-l1-03', 'frag-l1-04', 'frag-l1-05'],
    pipelineOrder: ['frag-l1-01', 'frag-l1-02', 'frag-l1-03', 'frag-l1-04', 'frag-l1-05'],
    bossName: 'Merge Conflict Monster',
    bossDescription: 'Assemble the correct Git workflow to defeat the merge conflict!',
  },
  {
    id: 'level-2',
    levelNumber: 2,
    name: 'Server Room — Build Pipeline',
    scenario: 'server',
    puzzleCategories: ['syntax', 'logic', 'devops'],
    fragmentIds: ['frag-l2-01', 'frag-l2-02', 'frag-l2-03', 'frag-l2-04', 'frag-l2-05'],
    pipelineOrder: ['frag-l2-01', 'frag-l2-02', 'frag-l2-03', 'frag-l2-04', 'frag-l2-05'],
    bossName: 'Broken Build Daemon',
    bossDescription: 'Order the CI pipeline stages to fix the broken build!',
  },
  {
    id: 'level-3',
    levelNumber: 3,
    name: 'Server Room — K8s Deployment',
    scenario: 'server',
    puzzleCategories: ['devops', 'logic', 'memory'],
    fragmentIds: ['frag-l3-01', 'frag-l3-02', 'frag-l3-03', 'frag-l3-04', 'frag-l3-05'],
    pipelineOrder: ['frag-l3-01', 'frag-l3-02', 'frag-l3-03', 'frag-l3-04', 'frag-l3-05'],
    bossName: 'CrashLoopBackOff Beast',
    bossDescription: 'Assemble the deployment pipeline to stabilize the cluster!',
  },
  {
    id: 'level-4',
    levelNumber: 4,
    name: 'Cloud — Security Pipeline',
    scenario: 'cloud',
    puzzleCategories: ['memory', 'devops', 'logic'],
    fragmentIds: ['frag-l4-01', 'frag-l4-02', 'frag-l4-03', 'frag-l4-04', 'frag-l4-05'],
    pipelineOrder: ['frag-l4-01', 'frag-l4-02', 'frag-l4-03', 'frag-l4-04', 'frag-l4-05'],
    bossName: 'Zero-Day Exploit',
    bossDescription: 'Build the security scanning pipeline to neutralize the threat!',
  },
  {
    id: 'level-5',
    levelNumber: 5,
    name: 'Cloud — Full Production',
    scenario: 'cloud',
    puzzleCategories: ['syntax', 'logic', 'devops', 'memory'],
    fragmentIds: ['frag-l5-01', 'frag-l5-02', 'frag-l5-03', 'frag-l5-04', 'frag-l5-05', 'frag-l5-06'],
    pipelineOrder: ['frag-l5-01', 'frag-l5-02', 'frag-l5-03', 'frag-l5-04', 'frag-l5-05', 'frag-l5-06'],
    bossName: 'Production Outage',
    bossDescription: 'Assemble the full production pipeline to restore service!',
  },
];

/**
 * Get a level definition by level number.
 */
export function getLevelDefinition(levelNumber: number): LevelDefinition | undefined {
  return LEVEL_DEFINITIONS.find((l) => l.levelNumber === levelNumber);
}

/**
 * Get a level definition by level ID.
 */
export function getLevelById(levelId: string): LevelDefinition | undefined {
  return LEVEL_DEFINITIONS.find((l) => l.id === levelId);
}

/**
 * Get total number of levels.
 */
export function getTotalLevelCount(): number {
  return LEVEL_DEFINITIONS.length;
}
