const NODE_MAP: Record<string, { x: number; y: number; w?: number; h?: number }> = {
  screenshots: { x: 14, y: 8 },
  requirements: { x: 40, y: 8 },
  'input-folder': { x: 27, y: 20, w: 18 },
  hub: { x: 24, y: 36, w: 24, h: 14 },
  'req-agent': { x: 72, y: 18 },
  'a11y-agent': { x: 72, y: 34 },
  'qa-agent': { x: 72, y: 50 },
  audit: { x: 27, y: 58, w: 18 },
  'git-pr': { x: 27, y: 72, w: 18 },
  output: { x: 27, y: 84, w: 18 },
  exds: { x: 6, y: 38, w: 16, h: 22 },
};

const CONNECTIONS: [string, string][] = [
  ['screenshots', 'input-folder'],
  ['requirements', 'input-folder'],
  ['input-folder', 'hub'],
  ['hub', 'req-agent'],
  ['hub', 'a11y-agent'],
  ['hub', 'qa-agent'],
  ['req-agent', 'qa-agent'],
  ['a11y-agent', 'qa-agent'],
  ['qa-agent', 'audit'],
  ['audit', 'git-pr'],
  ['git-pr', 'output'],
  ['hub', 'exds'],
  ['exds', 'audit'],
];

function nodeCenter(node: { x: number; y: number; w?: number; h?: number }) {
  const w = node.w ?? 14;
  const h = node.h ?? 7;
  return { cx: node.x + w / 2, cy: node.y + h / 2 };
}

function isLineHighlighted(from: string, to: string, active: string | null): boolean {
  if (!active) return false;
  if (active === from || active === to) return true;
  if (active === 'exds' && (from === 'exds' || to === 'exds' || from === 'hub' || to === 'hub')) return true;
  return false;
}

export function initWorkflowDiagram(root: HTMLElement): void {
  const svg = root.querySelector('svg');
  if (!svg) return;

  svg.querySelectorAll<SVGLineElement>('[data-workflow-line]').forEach((line) => {
    const from = NODE_MAP[line.dataset.from ?? ''];
    const to = NODE_MAP[line.dataset.to ?? ''];
    if (!from || !to) return;
    const a = nodeCenter(from);
    const b = nodeCenter(to);
    line.setAttribute('x1', String(a.cx));
    line.setAttribute('y1', String(a.cy));
    line.setAttribute('x2', String(b.cx));
    line.setAttribute('y2', String(b.cy));
  });

  const allNodes = root.querySelectorAll<HTMLElement>('[data-workflow-node]');
  const allLines = root.querySelectorAll<SVGLineElement>('[data-workflow-line]');

  const setActive = (activeId: string | null) => {
    allLines.forEach((line) => {
      const highlighted = isLineHighlighted(line.dataset.from ?? '', line.dataset.to ?? '', activeId);
      line.setAttribute('stroke', highlighted ? '#00d4ff' : '#00d4ff44');
      line.setAttribute('stroke-width', highlighted ? '0.4' : '0.22');
    });

    allNodes.forEach((node) => {
      const id = node.dataset.workflowNode ?? '';
      let opacity = 1;

      if (activeId) {
        if (id === activeId) {
          node.style.transform = 'scale(1.04)';
        } else if (activeId === 'exds' && (id === 'hub' || id === 'audit' || id === 'exds')) {
          node.style.transform = 'scale(1)';
        } else if (id === 'exds' && (activeId === 'hub' || activeId === 'audit' || activeId === 'qa-agent')) {
          node.style.transform = 'scale(1)';
        } else {
          const connected = CONNECTIONS.some(
            ([from, to]) => (from === activeId && to === id) || (to === activeId && from === id),
          );
          opacity = connected ? 1 : 0.35;
          node.style.transform = 'scale(1)';
        }
      } else {
        node.style.transform = 'scale(1)';
      }

      node.style.opacity = String(opacity);
    });
  };

  allNodes.forEach((node) => {
    if (node.dataset.workflowBound === 'true') return;
    node.dataset.workflowBound = 'true';

    const id = node.dataset.workflowNode ?? '';
    node.addEventListener('mouseenter', () => setActive(id));
    node.addEventListener('mouseleave', () => setActive(null));
    node.addEventListener('focus', () => setActive(id));
    node.addEventListener('blur', () => setActive(null));
  });

  root.dataset.workflowReady = 'true';
}

export function initWorkflowDiagrams(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-workflow-diagram]').forEach((diagram) => {
    initWorkflowDiagram(diagram);
  });
}
