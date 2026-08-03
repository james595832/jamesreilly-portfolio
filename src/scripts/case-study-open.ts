export type CaseStudyOpenHandler = (slug: string, trigger: HTMLElement | null) => void;

interface CaseStudyOpenStore {
  handler: CaseStudyOpenHandler | null;
  pending: { slug: string; trigger: HTMLElement | null } | null;
}

declare global {
  interface Window {
    __caseStudyOpenStore?: CaseStudyOpenStore;
  }
}

/** Shared on window so Embla init and the overlay use the same handler. */
function getStore(): CaseStudyOpenStore {
  if (!window.__caseStudyOpenStore) {
    window.__caseStudyOpenStore = { handler: null, pending: null };
  }
  return window.__caseStudyOpenStore;
}

export function registerCaseStudyOpenHandler(fn: CaseStudyOpenHandler) {
  const store = getStore();
  store.handler = fn;
  if (store.pending) {
    const { slug, trigger } = store.pending;
    store.pending = null;
    fn(slug, trigger);
  }
}

export function unregisterCaseStudyOpenHandler() {
  getStore().handler = null;
}

export function requestCaseStudyOpen(slug: string, trigger: HTMLElement) {
  const store = getStore();
  if (store.handler) {
    store.handler(slug, trigger);
    return;
  }
  store.pending = { slug, trigger };
}

export function consumePendingCaseStudyOpen(): { slug: string; trigger: HTMLElement | null } | null {
  const store = getStore();
  if (!store.pending) return null;
  const pending = store.pending;
  store.pending = null;
  return pending;
}
