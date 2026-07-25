import type { Fragment } from '@/types';

/**
 * FRAGMENT_POOL — Static fragment data for each level.
 * Each level's fragments form a CI/CD pipeline that must be assembled in order
 * during the boss fight.
 *
 * Weight values per level must sum to 100 (representing 100% of boss HP).
 * Critical fragments deal ×1.5 damage.
 */
export const FRAGMENT_POOL: Record<string, Fragment[]> = {
  // ─── Level 1: Office — Git & CI/CD Basics ─────────────────────────────
  'level-1': [
    {
      id: 'frag-l1-01',
      levelId: 'level-1',
      order: 1,
      content: 'git checkout -b feature',
      description: 'Create a feature branch from main',
      difficulty: 1,
      weight: 20,
      isCritical: false,
    },
    {
      id: 'frag-l1-02',
      levelId: 'level-1',
      order: 2,
      content: 'git add . && git commit',
      description: 'Stage and commit your changes',
      difficulty: 1,
      weight: 15,
      isCritical: false,
    },
    {
      id: 'frag-l1-03',
      levelId: 'level-1',
      order: 3,
      content: 'git push origin feature',
      description: 'Push branch to remote repository',
      difficulty: 1,
      weight: 15,
      isCritical: false,
    },
    {
      id: 'frag-l1-04',
      levelId: 'level-1',
      order: 4,
      content: 'npm test',
      description: 'Run automated test suite',
      difficulty: 2,
      weight: 25,
      isCritical: true,
    },
    {
      id: 'frag-l1-05',
      levelId: 'level-1',
      order: 5,
      content: 'merge to main',
      description: 'Merge approved PR into main branch',
      difficulty: 2,
      weight: 25,
      isCritical: true,
    },
  ],

  // ─── Level 2: Server Room — Docker & Build Pipeline ────────────────────
  'level-2': [
    {
      id: 'frag-l2-01',
      levelId: 'level-2',
      order: 1,
      content: 'npm install',
      description: 'Install project dependencies',
      difficulty: 1,
      weight: 15,
      isCritical: false,
    },
    {
      id: 'frag-l2-02',
      levelId: 'level-2',
      order: 2,
      content: 'npm run lint',
      description: 'Run code linting checks',
      difficulty: 1,
      weight: 15,
      isCritical: false,
    },
    {
      id: 'frag-l2-03',
      levelId: 'level-2',
      order: 3,
      content: 'npm run test',
      description: 'Execute unit and integration tests',
      difficulty: 2,
      weight: 20,
      isCritical: false,
    },
    {
      id: 'frag-l2-04',
      levelId: 'level-2',
      order: 4,
      content: 'docker build -t app .',
      description: 'Build container image from Dockerfile',
      difficulty: 2,
      weight: 25,
      isCritical: true,
    },
    {
      id: 'frag-l2-05',
      levelId: 'level-2',
      order: 5,
      content: 'docker push registry/app',
      description: 'Push image to container registry',
      difficulty: 2,
      weight: 25,
      isCritical: true,
    },
  ],

  // ─── Level 3: Server Room — Kubernetes Deployment ──────────────────────
  'level-3': [
    {
      id: 'frag-l3-01',
      levelId: 'level-3',
      order: 1,
      content: 'docker build & push',
      description: 'Build and push container image',
      difficulty: 1,
      weight: 12,
      isCritical: false,
    },
    {
      id: 'frag-l3-02',
      levelId: 'level-3',
      order: 2,
      content: 'kubectl apply -f deploy.yml',
      description: 'Apply Kubernetes deployment manifest',
      difficulty: 2,
      weight: 20,
      isCritical: false,
    },
    {
      id: 'frag-l3-03',
      levelId: 'level-3',
      order: 3,
      content: 'kubectl rollout status',
      description: 'Wait for rollout to complete',
      difficulty: 2,
      weight: 18,
      isCritical: false,
    },
    {
      id: 'frag-l3-04',
      levelId: 'level-3',
      order: 4,
      content: 'run smoke tests',
      description: 'Verify deployment with health checks',
      difficulty: 3,
      weight: 25,
      isCritical: true,
    },
    {
      id: 'frag-l3-05',
      levelId: 'level-3',
      order: 5,
      content: 'promote to production',
      description: 'Route production traffic to new version',
      difficulty: 3,
      weight: 25,
      isCritical: true,
    },
  ],

  // ─── Level 4: Cloud — Security Scanning Pipeline ───────────────────────
  'level-4': [
    {
      id: 'frag-l4-01',
      levelId: 'level-4',
      order: 1,
      content: 'SAST scan',
      description: 'Static Application Security Testing',
      difficulty: 2,
      weight: 15,
      isCritical: false,
    },
    {
      id: 'frag-l4-02',
      levelId: 'level-4',
      order: 2,
      content: 'dependency audit',
      description: 'Check for vulnerable dependencies',
      difficulty: 2,
      weight: 18,
      isCritical: false,
    },
    {
      id: 'frag-l4-03',
      levelId: 'level-4',
      order: 3,
      content: 'container scan',
      description: 'Scan Docker image for CVEs',
      difficulty: 2,
      weight: 17,
      isCritical: false,
    },
    {
      id: 'frag-l4-04',
      levelId: 'level-4',
      order: 4,
      content: 'DAST scan',
      description: 'Dynamic Application Security Testing',
      difficulty: 3,
      weight: 25,
      isCritical: true,
    },
    {
      id: 'frag-l4-05',
      levelId: 'level-4',
      order: 5,
      content: 'security gate: pass/fail',
      description: 'Block deploy if critical vulnerabilities found',
      difficulty: 3,
      weight: 25,
      isCritical: true,
    },
  ],

  // ─── Level 5: Cloud — Full Production Pipeline ─────────────────────────
  'level-5': [
    {
      id: 'frag-l5-01',
      levelId: 'level-5',
      order: 1,
      content: 'feature branch + PR',
      description: 'Open pull request with code changes',
      difficulty: 1,
      weight: 10,
      isCritical: false,
    },
    {
      id: 'frag-l5-02',
      levelId: 'level-5',
      order: 2,
      content: 'CI: lint + test + scan',
      description: 'Full CI pipeline with security gates',
      difficulty: 2,
      weight: 18,
      isCritical: false,
    },
    {
      id: 'frag-l5-03',
      levelId: 'level-5',
      order: 3,
      content: 'build & push artifact',
      description: 'Build production artifact and push',
      difficulty: 2,
      weight: 17,
      isCritical: false,
    },
    {
      id: 'frag-l5-04',
      levelId: 'level-5',
      order: 4,
      content: 'deploy to staging',
      description: 'Deploy to staging environment first',
      difficulty: 3,
      weight: 20,
      isCritical: false,
    },
    {
      id: 'frag-l5-05',
      levelId: 'level-5',
      order: 5,
      content: 'smoke + integration tests',
      description: 'Run full integration test suite on staging',
      difficulty: 3,
      weight: 15,
      isCritical: true,
    },
    {
      id: 'frag-l5-06',
      levelId: 'level-5',
      order: 6,
      content: 'promote to production',
      description: 'Blue-green deploy to production',
      difficulty: 3,
      weight: 20,
      isCritical: true,
    },
  ],
};

/**
 * Get all available level IDs.
 */
export function getAvailableLevelIds(): string[] {
  return Object.keys(FRAGMENT_POOL);
}

/**
 * Get the correct pipeline order labels for a level (for the boss fight UI).
 */
export function getPipelineOrder(levelId: string): string[] {
  const fragments = FRAGMENT_POOL[levelId];
  if (!fragments) return [];
  return fragments
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((f) => f.content);
}
