export function initClaudeProcessDiagram(root: HTMLElement): void {
  if (root.dataset.claudeProcessReady === 'true') return;
  root.dataset.claudeProcessReady = 'true';

  const triggers = root.querySelectorAll<HTMLButtonElement>('[data-stage-trigger]');

  const setOpen = (id: string | null) => {
    triggers.forEach((trigger) => {
      const stageId = trigger.dataset.stageTrigger ?? '';
      const stage = trigger.closest<HTMLElement>('.claude-process__stage');
      const detail = root.querySelector<HTMLElement>(`[data-stage-detail="${stageId}"]`);
      const open = id !== null && stageId === id;

      trigger.setAttribute('aria-expanded', String(open));
      stage?.classList.toggle('is-open', open);

      if (detail) {
        if (open) {
          detail.hidden = false;
          detail.classList.remove('hidden');
        } else {
          detail.hidden = true;
          detail.classList.add('hidden');
        }
      }
    });
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const id = trigger.dataset.stageTrigger ?? '';
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      setOpen(isOpen ? null : id);
    });
  });
}

export function initClaudeProcessDiagrams(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-claude-process]').forEach((diagram) => {
    initClaudeProcessDiagram(diagram);
  });
}
