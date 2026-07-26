/**
 * STORIES — Static narrative content for Cloud Quest v2.
 *
 * Each level has intro stories (shown before exploration) and outro stories
 * (shown after defeating the boss). Multiple variants per level for replayability.
 *
 * Stories are provided in both EN and ES. The StorySystem selects randomly
 * and falls back to EN if the current locale has no matching story.
 *
 * Phase 3 also supports optional Bedrock-generated stories (see StorySystem).
 */

import type { Story } from '@/types';

export const STORIES: Story[] = [
  // ─── Level 1: The Office — Git Basics ───────────────────────────────────

  // Intros
  {
    id: 'l1-intro-1',
    levelId: 'level-1',
    type: 'intro',
    locale: 'en',
    text: 'The office is quiet. Too quiet. Your terminal flickers — a merge conflict has spawned in the main branch. If it spreads, the whole codebase will collapse. Time to hunt it down.',
  },
  {
    id: 'l1-intro-2',
    levelId: 'level-1',
    type: 'intro',
    locale: 'en',
    text: 'Monday morning. Coffee in hand, you open your IDE. ERROR: 47 merge conflicts detected. The Merge Conflict Monster has been busy overnight. Only you can restore order.',
  },
  {
    id: 'l1-intro-3',
    levelId: 'level-1',
    type: 'intro',
    locale: 'en',
    text: 'A junior dev pushed directly to main at 3am. The repository is in chaos. Git blame points everywhere. You must collect the fragments of a proper workflow to defeat this mess.',
  },
  {
    id: 'l1-intro-1-es',
    levelId: 'level-1',
    type: 'intro',
    locale: 'es',
    text: 'La oficina est\u00e1 en silencio. Demasiado silencio. Tu terminal parpadea \u2014 un conflicto de merge ha aparecido en la rama principal. Si se expande, todo el c\u00f3digo colapsar\u00e1.',
  },
  {
    id: 'l1-intro-2-es',
    levelId: 'level-1',
    type: 'intro',
    locale: 'es',
    text: 'Lunes por la ma\u00f1ana. Caf\u00e9 en mano, abres tu IDE. ERROR: 47 conflictos de merge detectados. El Monstruo del Merge Conflict estuvo activo toda la noche.',
  },
  {
    id: 'l1-intro-3-es',
    levelId: 'level-1',
    type: 'intro',
    locale: 'es',
    text: 'Un junior hizo push directo a main a las 3am. El repositorio es un caos. Git blame apunta a todos lados. Debes recolectar los fragmentos del flujo correcto.',
  },

  // Outros
  {
    id: 'l1-outro-1',
    levelId: 'level-1',
    type: 'outro',
    locale: 'en',
    text: 'The Merge Conflict Monster dissolves into clean commits. The branch is stable again. You learned that proper branching strategy prevents chaos.',
    learnedConcepts: ['git branch', 'git merge', 'conflict resolution', 'feature branches'],
    realWorldExample: 'At Netflix, engineers use trunk-based development with short-lived feature branches to minimize merge conflicts across 1000+ microservices.',
  },
  {
    id: 'l1-outro-2',
    levelId: 'level-1',
    type: 'outro',
    locale: 'en',
    text: 'Order restored. The git log is clean, the history is linear. Every developer should know: rebase before merge, resolve conflicts locally, never force push to shared branches.',
    learnedConcepts: ['git rebase', 'linear history', 'pull requests', 'code review'],
    realWorldExample: 'Google requires all changes to pass through code review. Their monorepo handles 80TB of data with strict merge policies.',
  },
  {
    id: 'l1-outro-1-es',
    levelId: 'level-1',
    type: 'outro',
    locale: 'es',
    text: 'El Monstruo del Merge Conflict se disuelve en commits limpios. La rama es estable de nuevo. Aprendiste que una buena estrategia de branching previene el caos.',
    learnedConcepts: ['git branch', 'git merge', 'resoluci\u00f3n de conflictos', 'feature branches'],
    realWorldExample: 'En Netflix, los ingenieros usan desarrollo trunk-based con feature branches de corta vida para minimizar conflictos en 1000+ microservicios.',
  },
  {
    id: 'l1-outro-2-es',
    levelId: 'level-1',
    type: 'outro',
    locale: 'es',
    text: 'Orden restaurado. El git log est\u00e1 limpio, la historia es lineal. Todo desarrollador debe saber: rebase antes de merge, resolver conflictos localmente, nunca force push a ramas compartidas.',
    learnedConcepts: ['git rebase', 'historia lineal', 'pull requests', 'code review'],
    realWorldExample: 'Google requiere que todos los cambios pasen por code review. Su monorepo maneja 80TB de datos con pol\u00edticas estrictas de merge.',
  },

  // ─── Level 2: Server Room — Build Pipeline ──────────────────────────────

  {
    id: 'l2-intro-1',
    levelId: 'level-2',
    type: 'intro',
    locale: 'en',
    text: 'The server room hums with failing builds. Red lights everywhere. The Broken Build Daemon has corrupted the CI pipeline. You must reassemble the stages in the correct order.',
  },
  {
    id: 'l2-intro-2',
    levelId: 'level-2',
    type: 'intro',
    locale: 'en',
    text: 'Alert: Build #4,721 FAILED. The pipeline is broken and deployments are blocked. Developers are piling up PRs. Only a DevOps hero can fix this.',
  },
  {
    id: 'l2-intro-3',
    levelId: 'level-2',
    type: 'intro',
    locale: 'en',
    text: 'Someone deleted the CI config file. The build daemon is running wild, executing stages out of order. Collect the pipeline fragments before everything crashes.',
  },
  {
    id: 'l2-intro-1-es',
    levelId: 'level-2',
    type: 'intro',
    locale: 'es',
    text: 'La sala de servidores zumba con builds fallidos. Luces rojas por doquier. El Demonio del Build Roto ha corrompido el pipeline CI. Debes reensamblar las etapas en orden.',
  },
  {
    id: 'l2-intro-2-es',
    levelId: 'level-2',
    type: 'intro',
    locale: 'es',
    text: 'Alerta: Build #4,721 FALLIDO. El pipeline est\u00e1 roto y los despliegues bloqueados. Los desarrolladores acumulan PRs. Solo un h\u00e9roe DevOps puede arreglar esto.',
  },
  {
    id: 'l2-intro-3-es',
    levelId: 'level-2',
    type: 'intro',
    locale: 'es',
    text: 'Alguien borr\u00f3 el archivo de configuraci\u00f3n CI. El demonio de build est\u00e1 descontrolado, ejecutando etapas fuera de orden. Recolecta los fragmentos antes de que todo colapse.',
  },

  {
    id: 'l2-outro-1',
    levelId: 'level-2',
    type: 'outro',
    locale: 'en',
    text: 'The Broken Build Daemon shatters. Green checkmarks flood the pipeline. You proved that a well-ordered CI pipeline is the backbone of reliable software delivery.',
    learnedConcepts: ['CI/CD', 'build stages', 'automated testing', 'artifact generation'],
    realWorldExample: 'Amazon deploys code every 11.7 seconds on average. Their CI/CD pipelines run thousands of automated tests before any change reaches production.',
  },
  {
    id: 'l2-outro-2',
    levelId: 'level-2',
    type: 'outro',
    locale: 'en',
    text: 'Pipeline restored: lint \u2192 test \u2192 build \u2192 deploy. The key lesson: each stage must pass before the next begins. Fail fast, fix fast.',
    learnedConcepts: ['pipeline stages', 'fail-fast principle', 'build artifacts', 'deployment gates'],
    realWorldExample: 'Spotify uses squad-based CI where each team owns their pipeline. A broken build blocks the whole squad until fixed.',
  },
  {
    id: 'l2-outro-1-es',
    levelId: 'level-2',
    type: 'outro',
    locale: 'es',
    text: 'El Demonio del Build Roto se hace a\u00f1icos. Checks verdes inundan el pipeline. Demostraste que un pipeline CI bien ordenado es la columna vertebral de la entrega confiable de software.',
    learnedConcepts: ['CI/CD', 'etapas de build', 'testing automatizado', 'generaci\u00f3n de artefactos'],
    realWorldExample: 'Amazon despliega c\u00f3digo cada 11.7 segundos en promedio. Sus pipelines CI/CD ejecutan miles de tests automatizados antes de que cualquier cambio llegue a producci\u00f3n.',
  },
  {
    id: 'l2-outro-2-es',
    levelId: 'level-2',
    type: 'outro',
    locale: 'es',
    text: 'Pipeline restaurado: lint \u2192 test \u2192 build \u2192 deploy. La lecci\u00f3n clave: cada etapa debe pasar antes de que comience la siguiente. Falla r\u00e1pido, arregla r\u00e1pido.',
    learnedConcepts: ['etapas del pipeline', 'principio fail-fast', 'artefactos de build', 'gates de despliegue'],
    realWorldExample: 'Spotify usa CI basado en squads donde cada equipo es due\u00f1o de su pipeline. Un build roto bloquea al squad entero hasta que se arregla.',
  },

  // ─── Level 3: Server Room — K8s Deployment ──────────────────────────────

  {
    id: 'l3-intro-1',
    levelId: 'level-3',
    type: 'intro',
    locale: 'en',
    text: 'CrashLoopBackOff. The dreaded Kubernetes error echoes through the cluster. Pods are dying faster than they can restart. You must stabilize the deployment.',
  },
  {
    id: 'l3-intro-2',
    levelId: 'level-3',
    type: 'intro',
    locale: 'en',
    text: 'The container orchestrator is in panic mode. Memory limits exceeded, health checks failing, replicas crashing in a loop. Time to debug the deployment manifest.',
  },
  {
    id: 'l3-intro-3',
    levelId: 'level-3',
    type: 'intro',
    locale: 'en',
    text: 'kubectl get pods: 0/5 Ready. The CrashLoopBackOff Beast has corrupted every deployment config. Collect the correct YAML fragments to restore the cluster.',
  },
  {
    id: 'l3-intro-1-es',
    levelId: 'level-3',
    type: 'intro',
    locale: 'es',
    text: 'CrashLoopBackOff. El temido error de Kubernetes resuena por el cl\u00faster. Los pods mueren m\u00e1s r\u00e1pido de lo que pueden reiniciarse. Debes estabilizar el despliegue.',
  },
  {
    id: 'l3-intro-2-es',
    levelId: 'level-3',
    type: 'intro',
    locale: 'es',
    text: 'El orquestador de contenedores est\u00e1 en modo p\u00e1nico. L\u00edmites de memoria excedidos, health checks fallando, r\u00e9plicas crasheando en bucle. Es hora de debuggear el manifiesto.',
  },

  {
    id: 'l3-outro-1',
    levelId: 'level-3',
    type: 'outro',
    locale: 'en',
    text: 'The CrashLoopBackOff Beast is contained. Pods are healthy, the cluster is green. You learned that proper resource limits and health probes are essential for K8s stability.',
    learnedConcepts: ['Kubernetes pods', 'resource limits', 'liveness probes', 'readiness probes', 'rolling updates'],
    realWorldExample: 'Airbnb runs 1000+ Kubernetes services. They learned that misconfigured resource limits cause 60% of production incidents.',
  },
  {
    id: 'l3-outro-1-es',
    levelId: 'level-3',
    type: 'outro',
    locale: 'es',
    text: 'La Bestia CrashLoopBackOff est\u00e1 contenida. Los pods est\u00e1n sanos, el cl\u00faster en verde. Aprendiste que l\u00edmites de recursos y health probes adecuados son esenciales para la estabilidad de K8s.',
    learnedConcepts: ['pods de Kubernetes', 'l\u00edmites de recursos', 'liveness probes', 'readiness probes', 'rolling updates'],
    realWorldExample: 'Airbnb ejecuta 1000+ servicios en Kubernetes. Aprendieron que l\u00edmites de recursos mal configurados causan el 60% de los incidentes en producci\u00f3n.',
  },

  // ─── Level 4: Cloud — Security ──────────────────────────────────────────

  {
    id: 'l4-intro-1',
    levelId: 'level-4',
    type: 'intro',
    locale: 'en',
    text: 'A zero-day exploit has been detected in your cloud infrastructure. API keys are leaking, IAM roles are overprivileged, and the security scanning pipeline is offline. Fix it before the breach spreads.',
  },
  {
    id: 'l4-intro-2',
    levelId: 'level-4',
    type: 'intro',
    locale: 'en',
    text: 'ALERT: Unauthorized access detected from 47 IP addresses. The Zero-Day Exploit is using misconfigured security groups as its attack vector. Time to lock it down.',
  },
  {
    id: 'l4-intro-1-es',
    levelId: 'level-4',
    type: 'intro',
    locale: 'es',
    text: 'Un exploit de d\u00eda cero ha sido detectado en tu infraestructura cloud. Las API keys se filtran, los roles IAM tienen privilegios excesivos, y el pipeline de seguridad est\u00e1 offline.',
  },
  {
    id: 'l4-intro-2-es',
    levelId: 'level-4',
    type: 'intro',
    locale: 'es',
    text: 'ALERTA: Acceso no autorizado detectado desde 47 direcciones IP. El Exploit de D\u00eda Cero usa security groups mal configurados como vector de ataque. Es hora de bloquearlo.',
  },

  {
    id: 'l4-outro-1',
    levelId: 'level-4',
    type: 'outro',
    locale: 'en',
    text: 'The Zero-Day Exploit is neutralized. Secrets are rotated, IAM follows least-privilege, and the security pipeline scans every commit. Defense in depth wins.',
    learnedConcepts: ['IAM least privilege', 'secrets management', 'security scanning', 'defense in depth'],
    realWorldExample: 'Capital One suffered a breach in 2019 due to a misconfigured WAF and overprivileged IAM role. Proper least-privilege policies could have prevented it.',
  },
  {
    id: 'l4-outro-1-es',
    levelId: 'level-4',
    type: 'outro',
    locale: 'es',
    text: 'El Exploit de D\u00eda Cero est\u00e1 neutralizado. Los secretos fueron rotados, IAM sigue el principio de m\u00ednimo privilegio, y el pipeline de seguridad escanea cada commit.',
    learnedConcepts: ['IAM m\u00ednimo privilegio', 'gesti\u00f3n de secretos', 'escaneo de seguridad', 'defensa en profundidad'],
    realWorldExample: 'Capital One sufri\u00f3 una brecha en 2019 por un WAF mal configurado y un rol IAM con privilegios excesivos. Pol\u00edticas de m\u00ednimo privilegio lo habr\u00edan prevenido.',
  },

  // ─── Level 5: Cloud — Full Production ───────────────────────────────────

  {
    id: 'l5-intro-1',
    levelId: 'level-5',
    type: 'intro',
    locale: 'en',
    text: 'Production is down. The monitors are screaming. 500 errors, 0% availability, customers are leaving. This is the final boss: a full production outage. Assemble the complete recovery pipeline.',
  },
  {
    id: 'l5-intro-2',
    levelId: 'level-5',
    type: 'intro',
    locale: 'en',
    text: 'PagerDuty fires at 2am. The Production Outage has struck. Load balancers are timing out, databases are locked, and the deployment rollback failed. This is your moment.',
  },
  {
    id: 'l5-intro-1-es',
    levelId: 'level-5',
    type: 'intro',
    locale: 'es',
    text: 'Producci\u00f3n est\u00e1 ca\u00edda. Los monitores gritan. Errores 500, 0% disponibilidad, los clientes se van. Este es el jefe final: una ca\u00edda total de producci\u00f3n. Ensambla el pipeline completo de recuperaci\u00f3n.',
  },
  {
    id: 'l5-intro-2-es',
    levelId: 'level-5',
    type: 'intro',
    locale: 'es',
    text: 'PagerDuty suena a las 2am. La Ca\u00edda de Producci\u00f3n ha golpeado. Los load balancers dan timeout, las bases de datos est\u00e1n bloqueadas, y el rollback fall\u00f3. Este es tu momento.',
  },

  {
    id: 'l5-outro-1',
    levelId: 'level-5',
    type: 'outro',
    locale: 'en',
    text: 'Production is back online. 100% availability restored. You assembled a complete incident response: identify, contain, fix, verify, postmortem. You are a true DevOps hero.',
    learnedConcepts: ['incident response', 'rollback strategies', 'monitoring', 'postmortems', 'SLA/SLO'],
    realWorldExample: 'After the 2017 S3 outage that took down half the internet, AWS implemented automated recovery systems and wrote a detailed public postmortem that changed industry practices.',
  },
  {
    id: 'l5-outro-1-es',
    levelId: 'level-5',
    type: 'outro',
    locale: 'es',
    text: 'Producci\u00f3n est\u00e1 de vuelta. 100% disponibilidad restaurada. Ensamblaste una respuesta completa a incidentes: identificar, contener, arreglar, verificar, postmortem. Eres un verdadero h\u00e9roe DevOps.',
    learnedConcepts: ['respuesta a incidentes', 'estrategias de rollback', 'monitoreo', 'postmortems', 'SLA/SLO'],
    realWorldExample: 'Despu\u00e9s de la ca\u00edda de S3 en 2017 que tumb\u00f3 medio internet, AWS implement\u00f3 sistemas de recuperaci\u00f3n autom\u00e1tica y escribi\u00f3 un postmortem p\u00fablico que cambi\u00f3 las pr\u00e1cticas de la industria.',
  },
];
