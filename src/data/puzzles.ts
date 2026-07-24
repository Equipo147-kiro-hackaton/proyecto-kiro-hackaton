import type { Puzzle, PuzzleCategory } from '@/types';

/**
 * PUZZLE_POOL — Static puzzle data for Cloud Quest: DevOps Dungeon.
 * Contains ≥5 real puzzles per category (syntax, logic, devops, memory).
 * Each puzzle is educational and teaches a real programming/DevOps concept.
 */
export const PUZZLE_POOL: Record<PuzzleCategory, Puzzle[]> = {
  syntax: [
    {
      id: 'syn-001',
      category: 'syntax',
      question: 'Fix the error:\nconst greet = (name: string) => {\n  return `Hello, ${name}`\n}\ngreet(42)',
      correctAnswer: 'greet("42")',
      hints: [
        'The function expects a string parameter',
        'A number is being passed where a string is required',
        'Wrap the argument in quotes or use String(42)',
      ],
      difficulty: 1,
    },
    {
      id: 'syn-002',
      category: 'syntax',
      question: 'Which line has a syntax error?\n1: const arr = [1, 2, 3];\n2: arr.forEach(x => {\n3:   console.log(x)\n4: }',
      correctAnswer: '4',
      hints: [
        'Look at the brackets and parentheses',
        'forEach requires a closing parenthesis',
      ],
      difficulty: 1,
    },
    {
      id: 'syn-003',
      category: 'syntax',
      question: 'Fix the Python syntax error:\ndef factorial(n):\n  if n == 0\n    return 1\n  return n * factorial(n-1)',
      correctAnswer: 'if n == 0:',
      hints: [
        'Python if statements require specific punctuation',
        'A colon is missing after the condition',
        'The correct syntax is: if condition:',
      ],
      difficulty: 1,
    },
    {
      id: 'syn-004',
      category: 'syntax',
      question: 'What TypeScript error does this produce?\ninterface User { name: string; age: number }\nconst user: User = { name: "Alice" }',
      correctAnswer: 'Property age is missing',
      hints: [
        'The interface requires two properties',
        'The object literal only provides one property',
      ],
      difficulty: 2,
    },
    {
      id: 'syn-005',
      category: 'syntax',
      question: 'Fix the destructuring error:\nconst { data: { users } } = await fetch("/api")\nWhat is missing to make this valid TypeScript?',
      correctAnswer: '.json()',
      hints: [
        'fetch() returns a Response, not JSON directly',
        'You need to parse the response body first',
        'Call .json() on the Response object',
      ],
      difficulty: 2,
    },
    {
      id: 'syn-006',
      category: 'syntax',
      question: 'What is wrong with this arrow function?\nconst double = x: number => x * 2;',
      correctAnswer: 'Missing parentheses around parameter',
      hints: [
        'Arrow functions with type annotations need special syntax',
        'The parameter and its type must be wrapped',
      ],
      difficulty: 2,
    },
    {
      id: 'syn-007',
      category: 'syntax',
      question: 'Fix the template literal error:\nconst msg = `Count: ${items.length() }`;\nwhere items is an array.',
      correctAnswer: 'items.length',
      hints: [
        'length is a property, not a method',
        'Arrays use .length without parentheses',
      ],
      difficulty: 3,
    },
  ],

  logic: [
    {
      id: 'log-001',
      category: 'logic',
      question: 'What does this print?\nlet x = 1;\nfor (let i = 0; i < 3; i++) {\n  x *= 2;\n}\nconsole.log(x);',
      correctAnswer: '8',
      hints: [
        'x starts at 1 and is doubled each iteration',
        'The loop runs 3 times: 1→2→4→8',
      ],
      difficulty: 1,
    },
    {
      id: 'log-002',
      category: 'logic',
      question: 'What is the output?\nconsole.log(typeof null)',
      correctAnswer: 'object',
      hints: [
        'This is a well-known JavaScript quirk',
        'null is not reported as "null" by typeof',
        'It is a legacy bug in JavaScript that was never fixed',
      ],
      difficulty: 1,
    },
    {
      id: 'log-003',
      category: 'logic',
      question: 'What does this return?\n[1, 2, 3].reduce((acc, val) => acc + val, 0)',
      correctAnswer: '6',
      hints: [
        'reduce accumulates values starting from 0',
        'It sums: 0+1+2+3',
      ],
      difficulty: 1,
    },
    {
      id: 'log-004',
      category: 'logic',
      question: 'Find the bug:\nfunction isEven(n: number): boolean {\n  return n % 2 === 1;\n}',
      correctAnswer: 'n % 2 === 0',
      hints: [
        'The function name says isEven but checks for odd',
        'Even numbers have remainder 0 when divided by 2',
        'Change === 1 to === 0',
      ],
      difficulty: 2,
    },
    {
      id: 'log-005',
      category: 'logic',
      question: 'What is the output?\nconst a = [1, 2, 3];\nconst b = a;\nb.push(4);\nconsole.log(a.length);',
      correctAnswer: '4',
      hints: [
        'Arrays are reference types in JavaScript',
        'b is not a copy — it points to the same array',
      ],
      difficulty: 2,
    },
    {
      id: 'log-006',
      category: 'logic',
      question: 'What does this print?\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n// Output after all timeouts fire?',
      correctAnswer: '3 3 3',
      hints: [
        'var is function-scoped, not block-scoped',
        'By the time callbacks run, the loop has finished',
        'All closures share the same variable i which is 3',
      ],
      difficulty: 3,
    },
    {
      id: 'log-007',
      category: 'logic',
      question: 'What is the value of result?\nconst result = Promise.resolve(1)\n  .then(x => x + 1)\n  .then(x => x * 3)\n  .then(x => x - 2);',
      correctAnswer: '4',
      hints: [
        'Promise chains pass results forward',
        'Trace: 1 → 2 → 6 → 4',
      ],
      difficulty: 3,
    },
  ],

  devops: [
    {
      id: 'dev-001',
      category: 'devops',
      question: 'In a GitHub Actions workflow, what keyword specifies when the pipeline triggers?\nname: CI\n???\n  push:\n    branches: [main]',
      correctAnswer: 'on',
      hints: [
        'It defines the event that triggers the workflow',
        'It comes right after the workflow name',
      ],
      difficulty: 1,
    },
    {
      id: 'dev-002',
      category: 'devops',
      question: 'In a Dockerfile, which instruction sets the working directory for subsequent commands?',
      correctAnswer: 'WORKDIR',
      hints: [
        'It changes the current directory inside the container',
        'All RUN, CMD, COPY commands after it use this path',
      ],
      difficulty: 1,
    },
    {
      id: 'dev-003',
      category: 'devops',
      question: 'In Kubernetes, what command applies a manifest file named deploy.yml?',
      correctAnswer: 'kubectl apply -f deploy.yml',
      hints: [
        'kubectl is the Kubernetes CLI tool',
        'The -f flag specifies the file to apply',
        'apply creates or updates resources declaratively',
      ],
      difficulty: 2,
    },
    {
      id: 'dev-004',
      category: 'devops',
      question: 'Which Docker instruction should you use to copy package.json BEFORE copying all source files, and why?',
      correctAnswer: 'Layer caching',
      hints: [
        'Docker builds use layers that can be cached',
        'Copying package.json first lets npm install be cached',
        'Source code changes often; dependencies change rarely',
      ],
      difficulty: 2,
    },
    {
      id: 'dev-005',
      category: 'devops',
      question: 'In a CI pipeline, what is the purpose of the "artifact" step?\nExample: actions/upload-artifact@v3',
      correctAnswer: 'Persist build outputs between jobs',
      hints: [
        'Jobs in CI run in isolated environments',
        'Artifacts let you share files across jobs',
        'Common uses: build output, test reports, binaries',
      ],
      difficulty: 2,
    },
    {
      id: 'dev-006',
      category: 'devops',
      question: 'What Kubernetes resource ensures exactly 3 replicas of a pod are always running?',
      correctAnswer: 'Deployment',
      hints: [
        'It manages ReplicaSets under the hood',
        'You set spec.replicas to control the count',
        'It also handles rolling updates',
      ],
      difficulty: 3,
    },
    {
      id: 'dev-007',
      category: 'devops',
      question: 'In a docker-compose.yml, what directive makes service B wait for service A to start?\nservices:\n  b:\n    ???:\n      - a',
      correctAnswer: 'depends_on',
      hints: [
        'It defines startup order dependencies',
        'It does not wait for the service to be "ready"',
      ],
      difficulty: 3,
    },
  ],

  memory: [
    {
      id: 'mem-001',
      category: 'memory',
      question: 'What causes a memory leak here?\nconst cache = {};\nfunction addToCache(key, value) {\n  cache[key] = value;\n}',
      correctAnswer: 'Cache grows unbounded',
      hints: [
        'Nothing ever removes entries from the cache',
        'Over time, the object will consume all available memory',
        'Consider using a WeakMap or setting a max size',
      ],
      difficulty: 1,
    },
    {
      id: 'mem-002',
      category: 'memory',
      question: 'What JavaScript data structure allows garbage collection of its keys when no other references exist?',
      correctAnswer: 'WeakMap',
      hints: [
        'It holds "weak" references to keys',
        'Keys must be objects, not primitives',
      ],
      difficulty: 1,
    },
    {
      id: 'mem-003',
      category: 'memory',
      question: 'What resource leak exists here?\nconst interval = setInterval(() => {\n  updateUI();\n}, 1000);\n// Component unmounts without cleanup',
      correctAnswer: 'clearInterval never called',
      hints: [
        'The interval keeps running after the component is gone',
        'Call clearInterval(interval) on cleanup',
        'This also prevents garbage collection of referenced variables',
      ],
      difficulty: 2,
    },
    {
      id: 'mem-004',
      category: 'memory',
      question: 'Why can this cause a memory leak in Node.js?\nelement.addEventListener("click", handler);\n// Element is removed from DOM later\n// handler is never removed',
      correctAnswer: 'Event listener prevents garbage collection',
      hints: [
        'The listener holds a reference to the handler',
        'The handler may close over large objects',
        'Always call removeEventListener on cleanup',
      ],
      difficulty: 2,
    },
    {
      id: 'mem-005',
      category: 'memory',
      question: 'What is the issue with this async pattern?\nasync function process() {\n  const results = [];\n  for (const item of hugeArray) {\n    results.push(await transform(item));\n  }\n  return results;\n}',
      correctAnswer: 'Accumulates all results in memory',
      hints: [
        'results array grows to the same size as hugeArray',
        'For large datasets, use streaming or batching',
        'Consider processing in chunks and writing to disk',
      ],
      difficulty: 3,
    },
    {
      id: 'mem-006',
      category: 'memory',
      question: 'What Node.js method lets you monitor heap memory usage at runtime?',
      correctAnswer: 'process.memoryUsage()',
      hints: [
        'It returns an object with heapUsed and heapTotal',
        'Also reports rss (resident set size)',
        'Useful for detecting memory leaks in production',
      ],
      difficulty: 3,
    },
    {
      id: 'mem-007',
      category: 'memory',
      question: 'In this closure, why does the large array never get garbage collected?\nfunction createHandler() {\n  const data = new Array(1000000);\n  return () => console.log("click");\n}',
      correctAnswer: 'Closure retains reference to outer scope',
      hints: [
        'The returned function closes over the scope containing data',
        'Even though data is never used, V8 may retain it',
        'Set data = null after use or restructure the code',
      ],
      difficulty: 3,
    },
  ],
};
