import gsap from 'gsap';
import { initWorkflowDiagrams } from './workflow-diagram-init';
import { initClaudeProcessDiagrams } from './claude-process-init';
import { ensureCaseStudyCardClicks } from './case-study-clicks';
import {
  consumePendingCaseStudyOpen,
  registerCaseStudyOpenHandler,
  unregisterCaseStudyOpenHandler,
} from './case-study-open';
import type { CaseStudyMeta } from '../types/caseStudy';

const SHEET_TOP_GAP = 48;
const SHEET_RADIUS = 24;
const SHEET_INSET = 20;
const EXPAND_SCROLL = 180;
const SURFACE_COLOR = '#f4efe7';
const INK_COLOR = '#1a1a1a';
const INK_MUTED = '#6a6560';
const BACKDROP_OPACITY_SHEET = 0.28;
const BACKDROP_OPACITY_FULL = 0.45;
/** Sheet + scroll-to-expand is a desktop flourish. Phones get a plain full-screen page. */
const COMPACT_QUERY = '(max-width: 767px)';

export interface CaseStudyOverlayConfig {
  caseStudies: CaseStudyMeta[];
  initialSlug?: string;
  pathPrefix?: string;
  closePath?: string;
  showAuthorBand?: boolean;
}

type OverlayCleanup = () => void;

declare global {
  interface Window {
    __caseStudyOverlayCleanup?: OverlayCleanup | null;
  }
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function isLightThemeColor(color: string): boolean {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.65;
}

function disposeCaseStudyOverlay(): void {
  window.__caseStudyOverlayCleanup?.();
  window.__caseStudyOverlayCleanup = null;
  unregisterCaseStudyOpenHandler();
}

export function initCaseStudyOverlay(config: CaseStudyOverlayConfig): void {
  // View Transitions re-swap the overlay DOM — tear down prior listeners first.
  disposeCaseStudyOverlay();

  const overlay = document.getElementById('case-study-overlay');
  if (!overlay) return;

  ensureCaseStudyCardClicks();

  const backdrop = overlay.querySelector<HTMLButtonElement>('[data-overlay-backdrop]');
  const sheet = overlay.querySelector<HTMLElement>('[data-overlay-sheet]');
  const motion = overlay.querySelector<HTMLElement>('[data-overlay-motion]');
  const scrollEl = overlay.querySelector<HTMLElement>('[data-overlay-scroll]');
  const contentEl = overlay.querySelector<HTMLElement>('[data-overlay-content]');
  const closeBtn = overlay.querySelector<HTMLButtonElement>('[data-overlay-close]');
  const headerSlot = overlay.querySelector<HTMLElement>('[data-overlay-header-slot]');
  const moreList = overlay.querySelector<HTMLElement>('[data-overlay-more]');
  const authorBand = overlay.querySelector<HTMLElement>('[data-overlay-author]');

  if (!backdrop || !sheet || !motion || !scrollEl || !contentEl || !closeBtn || !headerSlot) {
    return;
  }

  overlay.dataset.overlayBound = 'true';

  const caseStudies = config.caseStudies;
  const pathPrefix = (config.pathPrefix || '/work').replace(/\/$/, '');
  const closePath = config.closePath || '/';
  const showAuthorBand = Boolean(config.showAuthorBand);
  const studyBySlug = new Map(caseStudies.map((study) => [study.slug, study]));
  const pathPattern = new RegExp(`^${pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/]+)`);
  const compactMq = window.matchMedia(COMPACT_QUERY);
  const isCompact = () => compactMq.matches;

  const syncAuthorBand = () => {
    if (!authorBand) return;
    authorBand.hidden = !showAuthorBand;
    authorBand.setAttribute('aria-hidden', showAuthorBand ? 'false' : 'true');
  };
  syncAuthorBand();

  let activeSlug: string | null = config.initialSlug ?? null;
  let isVisible = Boolean(config.initialSlug);
  let isExpanded = Boolean(config.initialSlug);
  let triggerEl: HTMLElement | null = null;
  let isClosing = false;
  let animGeneration = 0;
  let skipEnterAnimation = Boolean(config.initialSlug);
  let expandProgress = config.initialSlug ? 1 : 0;
  let expandTarget = config.initialSlug ? 1 : 0;
  let expandRaf: number | null = null;
  let enterTimeline: gsap.core.Timeline | null = null;

  const clearCopyInk = () => {
    const headerEl = scrollEl.querySelector<HTMLElement>('.case-study-landing-header');
    headerEl?.style.removeProperty('--case-copy-ink');
    headerEl?.style.removeProperty('--case-copy-muted');
    contentEl.style.removeProperty('--case-copy-ink');
    contentEl.style.removeProperty('--case-copy-muted');
    scrollEl.querySelectorAll<HTMLElement>('[data-case-copy-ink]').forEach((el) => {
      el.style.removeProperty('color');
      delete el.dataset.caseCopyInk;
    });
  };

  const applyScrollTheme = (
    progress: number,
    themeColor?: string,
    _themeSurface: string = SURFACE_COLOR,
  ) => {
    const headerEl = scrollEl.querySelector<HTMLElement>('.case-study-landing-header');
    const clamped = Math.max(0, Math.min(1, progress));

    if (!themeColor) {
      scrollEl.style.removeProperty('--case-theme-p');
      scrollEl.style.removeProperty('--case-theme-color');
      scrollEl.style.setProperty('--case-ink-color', INK_COLOR);
      scrollEl.style.setProperty('--case-ink-muted', INK_MUTED);
      scrollEl.style.removeProperty('color');
      scrollEl.removeAttribute('data-theme-scroll');
      scrollEl.removeAttribute('data-theme-ink');
      scrollEl.setAttribute('data-theme-light', 'true');
      clearCopyInk();
      closeBtn.style.color = INK_COLOR;
      sheet.style.removeProperty('--case-theme-p');
      sheet.style.removeProperty('--case-theme-color');
      sheet.style.setProperty('--case-ink-color', INK_COLOR);
      sheet.style.setProperty('--case-ink-muted', INK_MUTED);
      sheet.style.backgroundColor = SURFACE_COLOR;
      sheet.removeAttribute('data-theme-scroll');
      sheet.removeAttribute('data-theme-ink');
      sheet.setAttribute('data-theme-light', 'true');
      return;
    }

    const destinationIsLight = isLightThemeColor(themeColor);
    /*
     * Cream sheet, charcoal copy. Light studies may tint slightly.
     * Dark brand washes stay off so type never leaves #1a1a1a / sage.
     */
    const wash = destinationIsLight ? clamped : 0;
    const sheetColor =
      wash <= 0.001
        ? SURFACE_COLOR
        : `color-mix(in srgb, ${SURFACE_COLOR} ${(1 - wash) * 100}%, ${themeColor} ${wash * 100}%)`;

    scrollEl.style.setProperty('--case-theme-p', String(wash));
    scrollEl.style.setProperty('--case-theme-color', themeColor);
    scrollEl.style.setProperty('--case-ink-color', INK_COLOR);
    scrollEl.style.setProperty('--case-ink-muted', INK_MUTED);
    scrollEl.setAttribute('data-theme-scroll', 'true');
    scrollEl.setAttribute('data-theme-ink', 'dark');
    scrollEl.setAttribute('data-theme-light', 'true');

    sheet.style.setProperty('--case-theme-p', String(wash));
    sheet.style.setProperty('--case-theme-color', themeColor);
    sheet.style.setProperty('--case-ink-color', INK_COLOR);
    sheet.style.setProperty('--case-ink-muted', INK_MUTED);
    sheet.setAttribute('data-theme-scroll', 'true');
    sheet.setAttribute('data-theme-ink', 'dark');
    sheet.setAttribute('data-theme-light', 'true');
    sheet.style.backgroundColor = sheetColor;
    closeBtn.style.color = INK_COLOR;

    headerEl?.style.setProperty('--case-copy-ink', INK_COLOR);
    headerEl?.style.setProperty('--case-copy-muted', INK_MUTED);
    contentEl.style.setProperty('--case-copy-ink', INK_COLOR);
    contentEl.style.setProperty('--case-copy-muted', INK_MUTED);
  };

  const getThemeProgress = (): number => {
    /*
     * Prefer theme triggers in the body (first MDX image with data-case-theme-trigger).
     * Do not use the landing-header hero — it sits in view at open and would slam
     * the ink theme to ~1 on the first paint, then thrash as geometry expands.
     */
    const trigger =
      contentEl.querySelector<HTMLElement>('[data-case-theme-trigger]') ??
      scrollEl.querySelector<HTMLElement>(
        '.case-study-body [data-case-theme-trigger], [data-overlay-content] [data-case-theme-trigger]',
      );
    if (!trigger) return 0;

    const viewport = sheet.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const start = viewport.top + viewport.height * 0.72;
    const end = viewport.top + viewport.height * 0.28;
    const range = start - end;
    if (range <= 0) return triggerRect.top <= end ? 1 : 0;

    return Math.max(0, Math.min(1, 1 - (triggerRect.top - end) / range));
  };

  const setExpandedState = (expanded: boolean) => {
    if (isExpanded === expanded) return;
    isExpanded = expanded;
    headerSlot
      .querySelector<HTMLElement>('.case-study-landing-header')
      ?.classList.toggle('case-study-landing-header--expanded', expanded);
  };

  const applySheetGeometry = (progress: number) => {
    /*
     * Phone: edge-to-edge page. Desktop: a parked card, inset from the window,
     * that grows to the edges as the page scrolls. The scrollbar is the
     * window's, so the inset never moves it.
     */
    if (isCompact()) {
      expandProgress = 1;
      expandTarget = 1;
      sheet.style.top = '0px';
      sheet.style.height = '100dvh';
      sheet.style.left = '0px';
      sheet.style.right = '0px';
      sheet.style.borderTopLeftRadius = '0px';
      sheet.style.borderTopRightRadius = '0px';
      sheet.style.borderBottomLeftRadius = '0px';
      sheet.style.borderBottomRightRadius = '0px';
      sheet.style.clipPath = '';
      sheet.style.boxShadow = 'none';
      motion.style.transform = 'none';
      backdrop.style.opacity = String(BACKDROP_OPACITY_FULL);
      overlay.dataset.overlayMode = 'page';
      setExpandedState(true);
      return;
    }

    const clamped = Math.max(0, Math.min(1, progress));
    expandProgress = clamped;
    overlay.dataset.overlayMode = 'sheet';

    const top = SHEET_TOP_GAP * (1 - clamped);
    const radius = SHEET_RADIUS * (1 - clamped);
    const inset = SHEET_INSET * (1 - clamped);
    const backdropOpacity =
      BACKDROP_OPACITY_SHEET + (BACKDROP_OPACITY_FULL - BACKDROP_OPACITY_SHEET) * clamped;

    /*
     * Height stays 100dvh so the card never resizes the scroll distance.
     * Top, side inset, and radius are the expand.
     */
    sheet.style.top = `${top}px`;
    sheet.style.height = '100dvh';
    sheet.style.left = `${inset}px`;
    sheet.style.right = `${inset}px`;
    sheet.style.borderTopLeftRadius = `${radius}px`;
    sheet.style.borderTopRightRadius = `${radius}px`;
    sheet.style.boxShadow = '';
    sheet.style.clipPath = '';

    motion.style.transform = 'none';
    backdrop.style.opacity = String(backdropOpacity);

    setExpandedState(clamped >= 0.995);
  };

  const tickExpand = () => {
    const next = lerp(expandProgress, expandTarget, 0.22);

    if (Math.abs(expandTarget - next) < 0.001) {
      applySheetGeometry(expandTarget);
      expandRaf = null;
      return;
    }

    applySheetGeometry(next);
    expandRaf = requestAnimationFrame(tickExpand);
  };

  const setExpandTarget = (target: number) => {
    if (isCompact()) {
      applySheetGeometry(1);
      return;
    }
    expandTarget = Math.max(0, Math.min(1, target));
    if (expandRaf === null) {
      expandRaf = requestAnimationFrame(tickExpand);
    }
  };

  const updateMoreFilter = (slug: string) => {
    if (!moreList) return;

    moreList.querySelectorAll<HTMLElement>('[data-more-slug]').forEach((item) => {
      const excluded = item.dataset.moreSlug === slug;
      if (excluded) {
        item.classList.remove('is-open');
        item.querySelector<HTMLButtonElement>('[data-more-toggle]')?.setAttribute('aria-expanded', 'false');
        const panel = item.querySelector<HTMLElement>('[data-more-panel]');
        if (panel) {
          panel.inert = true;
          panel.setAttribute('aria-hidden', 'true');
        }
      }
      item.hidden = excluded;
      item.setAttribute('aria-hidden', String(excluded));
    });
  };

  const mountHeader = (slug: string) => {
    const template = document.querySelector<HTMLElement>(`[data-header-for="${slug}"]`);
    if (!template) return;
    headerSlot.innerHTML = template.innerHTML;
    if (isExpanded) {
      headerSlot
        .querySelector<HTMLElement>('.case-study-landing-header')
        ?.classList.add('case-study-landing-header--expanded');
    }
  };

  const mountContent = (slug: string) => {
    const panel = document.getElementById(`case-study-panel-${slug}`);
    contentEl.innerHTML = '';
    if (!panel) return;

    const clone = panel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('astro-island').forEach((island) => island.remove());
    clone.querySelector('header')?.remove();
    clone.querySelectorAll<HTMLElement>('[data-claude-process]').forEach((el) => {
      delete el.dataset.claudeProcessReady;
    });
    clone.querySelectorAll<HTMLElement>('[data-workflow-diagram]').forEach((el) => {
      delete el.dataset.workflowReady;
    });
    clone.querySelectorAll<HTMLElement>('[data-workflow-node]').forEach((el) => {
      delete el.dataset.workflowBound;
    });
    contentEl.appendChild(clone);
    initWorkflowDiagrams(contentEl);
    initClaudeProcessDiagrams(contentEl);
  };

  const spacer = document.createElement('div');
  spacer.id = 'case-study-scroll-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spacer);

  const syncSpacer = () => {
    if (!isVisible) {
      spacer.style.height = '0px';
      return;
    }
    const extra = Math.max(0, scrollEl.offsetHeight - motion.clientHeight);
    spacer.style.height = `${window.innerHeight + extra}px`;
  };

  const setWindowScroll = (top: number) => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    root.scrollTop = top;
    root.style.scrollBehavior = previous;
  };

  const pinPage = () => {
    const main = document.getElementById('main');
    if (!main || main.dataset.pinnedScroll) return;
    const y = window.scrollY;
    main.dataset.pinnedScroll = String(y);
    main.style.position = 'fixed';
    main.style.top = `-${y}px`;
    main.style.left = '0';
    main.style.right = '0';
    main.style.width = '100%';
    setWindowScroll(0);
  };

  const unpinPage = () => {
    const main = document.getElementById('main');
    if (!main?.dataset.pinnedScroll) return;
    const y = Number(main.dataset.pinnedScroll);
    main.style.position = '';
    main.style.top = '';
    main.style.left = '';
    main.style.right = '';
    main.style.width = '';
    delete main.dataset.pinnedScroll;
    setWindowScroll(y);
  };

  const resetCaseScroll = () => {
    setWindowScroll(0);
    scrollEl.style.transform = 'none';
  };

  const setOverlayVisible = (visible: boolean) => {
    isVisible = visible;
    if (visible) {
      overlay.removeAttribute('hidden');
      document.documentElement.classList.add('case-study-open');
      pinPage();
    } else {
      overlay.setAttribute('hidden', '');
      document.documentElement.classList.remove('case-study-open');
      spacer.style.height = '0px';
      scrollEl.style.transform = 'none';
      unpinPage();
    }
    document.body.style.overflow = '';
  };

  const finishClose = () => {
    isClosing = false;
    setOverlayVisible(false);
    activeSlug = null;
    isExpanded = false;
    expandProgress = 0;
    expandTarget = 0;
    skipEnterAnimation = false;
    resetCaseScroll();
    updateHeaderShadow();
    applyScrollTheme(0);

    if (pathPattern.test(window.location.pathname)) {
      const hasPageShell = Boolean(document.getElementById('main'));
      if (hasPageShell) {
        window.history.replaceState({}, '', closePath);
      } else {
        window.location.assign(closePath);
        return;
      }
    }

    triggerEl?.focus();
  };

  const closeOverlay = () => {
    if (isClosing) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    enterTimeline?.kill();

    if (reducedMotion || isCompact()) {
      if (isCompact() && !reducedMotion) {
        isClosing = true;
        animGeneration += 1;
        gsap
          .timeline({ onComplete: finishClose })
          .to(motion, { opacity: 0, duration: 0.18, ease: 'power2.in' }, 0)
          .to(backdrop, { opacity: 0, duration: 0.22, ease: 'power2.in' }, 0);
        return;
      }
      finishClose();
      return;
    }

    isClosing = true;
    animGeneration += 1;

    gsap
      .timeline({ onComplete: finishClose })
      .to(motion, { opacity: 0, duration: 0.22, ease: 'power2.in' }, 0)
      .to(sheet, { y: '100%', duration: 0.52, ease: 'power3.inOut' }, 0.04)
      .to(backdrop, { opacity: 0, duration: 0.38, ease: 'power2.in' }, 0.08);
  };

  const runOpenEffects = () => {
    if (!activeSlug) return;

    mountHeader(activeSlug);
    mountContent(activeSlug);
    updateMoreFilter(activeSlug);

    const study = studyBySlug.get(activeSlug);
    const themeBackground = study?.themeBackground;
    const themeSurface = study?.themeSurface ?? SURFACE_COLOR;
    const generation = animGeneration;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    enterTimeline?.kill();

    if (isCompact()) {
      applySheetGeometry(1);
      gsap.set(sheet, { y: 0, clearProps: 'transform' });
      if (skipEnterAnimation || reducedMotion) {
        gsap.set(motion, { opacity: 1 });
        gsap.set(backdrop, { opacity: BACKDROP_OPACITY_FULL });
        closeBtn.focus();
      } else {
        gsap.set(backdrop, { opacity: 0 });
        gsap.set(motion, { opacity: 0 });
        enterTimeline = gsap.timeline({
          onComplete: () => {
            if (generation !== animGeneration) return;
            closeBtn.focus();
          },
        });
        enterTimeline
          .to(backdrop, { opacity: BACKDROP_OPACITY_FULL, duration: 0.28, ease: 'power2.out' }, 0)
          .to(motion, { opacity: 1, duration: 0.32, ease: 'power2.out' }, 0.04);
      }
    } else if (skipEnterAnimation || reducedMotion) {
      gsap.set(sheet, { y: 0, clearProps: 'transform' });
      gsap.set(motion, { opacity: 1 });
      gsap.set(backdrop, { opacity: BACKDROP_OPACITY_SHEET });
      applySheetGeometry(0);
      closeBtn.focus();
    } else {
      applySheetGeometry(0);
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(sheet, { y: '100%' });
      gsap.set(motion, { opacity: 0 });

      enterTimeline = gsap.timeline({
        onComplete: () => {
          if (generation !== animGeneration) return;
          gsap.set(sheet, { clearProps: 'transform' });
          applySheetGeometry(expandProgress);
          closeBtn.focus();
        },
      });

      enterTimeline
        .to(backdrop, { opacity: BACKDROP_OPACITY_SHEET, duration: 0.6, ease: 'power2.out' }, 0)
        .to(sheet, { y: 0, duration: 0.88, ease: 'expo.out' }, 0)
        .to(motion, { opacity: 1, duration: 0.65, ease: 'power3.out' }, 0.12);
    }

    applyScrollTheme(0, themeBackground, themeSurface);
    requestAnimationFrame(() => {
      syncSpacer();
      applyWindowScroll();
      if (themeBackground) {
        applyScrollTheme(getThemeProgress(), themeBackground, themeSurface);
      }
    });
  };

  const openOverlay = (slug: string, trigger?: HTMLElement | null, instant = false) => {
    const switching = isVisible && activeSlug !== null && activeSlug !== slug;
    const compact = isCompact();

    triggerEl = trigger ?? null;
    if (instant) skipEnterAnimation = true;
    else skipEnterAnimation = false;

    animGeneration += 1;
    expandProgress = compact ? 1 : 0;
    expandTarget = expandProgress;
    isExpanded = expandProgress >= 1;

    if (switching || !skipEnterAnimation) {
      resetCaseScroll();
      updateHeaderShadow();
    }

    // Match homepage tile open: when switching studies, park the sheet off-screen
    // first so remounting content doesn't snap the already-open sheet.
    if (switching && !skipEnterAnimation && !compact) {
      enterTimeline?.kill();
      applyScrollTheme(0);
      applySheetGeometry(0);
      gsap.set(motion, { opacity: 0 });
      gsap.set(sheet, { y: '100%' });
      gsap.set(backdrop, { opacity: 0 });
    } else if (switching && compact) {
      enterTimeline?.kill();
      applyScrollTheme(0);
      applySheetGeometry(1);
      gsap.set(motion, { opacity: 0 });
      gsap.set(backdrop, { opacity: 0 });
    }

    activeSlug = slug;
    setOverlayVisible(true);

    const entryUrl = `${pathPrefix}/${slug}`;
    if (pathPattern.test(window.location.pathname)) {
      window.history.replaceState({ caseStudy: slug }, '', entryUrl);
    } else {
      window.history.pushState({ caseStudy: slug }, '', entryUrl);
    }

    runOpenEffects();
  };

  const updateHeaderShadow = () => {
    sheet.toggleAttribute('data-header-shadow', window.scrollY > 8);
  };

  const applyWindowScroll = () => {
    if (!isVisible || isClosing) return;
    const y = window.scrollY;
    scrollEl.style.transform = `translate3d(0, ${-y}px, 0)`;
    updateHeaderShadow();
    if (!activeSlug) return;
    if (!isCompact()) {
      setExpandTarget(Math.min(y / EXPAND_SCROLL, 1));
    }
    const study = studyBySlug.get(activeSlug);
    if (study?.themeBackground) {
      applyScrollTheme(getThemeProgress(), study.themeBackground, study.themeSurface ?? SURFACE_COLOR);
    }
  };

  const handleScroll = () => {
    applyWindowScroll();
  };

  /*
   * The sheet clips with overflow hidden, so a wheel or swipe over the card
   * never reaches the window. Forward it, and the browser scrollbar moves.
   */
  const handleWheel = (event: WheelEvent) => {
    if (!isVisible || isClosing) return;
    event.preventDefault();
    const line = 16;
    const page = window.innerHeight;
    const delta =
      event.deltaMode === 1 ? event.deltaY * line : event.deltaMode === 2 ? event.deltaY * page : event.deltaY;
    setWindowScroll(window.scrollY + delta);
  };

  let touchLastY = 0;

  const handleTouchStart = (event: TouchEvent) => {
    touchLastY = event.touches[0]?.clientY ?? 0;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isVisible || isClosing) return;
    const y = event.touches[0]?.clientY;
    if (y === undefined) return;
    event.preventDefault();
    setWindowScroll(window.scrollY + (touchLastY - y));
    touchLastY = y;
  };

  const handleViewportChange = () => {
    if (!isVisible) return;
    applySheetGeometry(isCompact() ? 1 : expandProgress);
    syncSpacer();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeOverlay();

    if (isVisible && !isClosing) {
      const page = window.innerHeight * 0.9;
      const keyDelta: Record<string, number> = {
        ArrowDown: 80,
        ArrowUp: -80,
        PageDown: page,
        PageUp: -page,
        Home: -window.scrollY,
        End: document.documentElement.scrollHeight,
      };
      if (event.key in keyDelta && event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          event.preventDefault();
          const next = event.key === 'End' ? document.documentElement.scrollHeight : window.scrollY + keyDelta[event.key];
          setWindowScroll(next);
        }
      }
    }

    if (event.key === 'Tab') {
      const focusable = overlay.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    if (!isVisible) return;
    syncSpacer();
  });
  resizeObserver.observe(scrollEl);

  backdrop.addEventListener('click', closeOverlay);
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('wheel', handleWheel, { passive: false });
  overlay.addEventListener('touchstart', handleTouchStart, { passive: true });
  overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('keydown', handleKeyDown);
  compactMq.addEventListener('change', handleViewportChange);

  const handlePopState = () => {
    const match = window.location.pathname.match(pathPattern);
    if (match) {
      enterTimeline?.kill();
      skipEnterAnimation = true;
      animGeneration += 1;
      expandProgress = isCompact() ? 1 : 0;
      expandTarget = expandProgress;
      isExpanded = expandProgress >= 1;
      activeSlug = match[1];
      setOverlayVisible(true);
      runOpenEffects();
      return;
    }

    enterTimeline?.kill();
    isClosing = false;
    animGeneration += 1;
    setOverlayVisible(false);
    activeSlug = null;
    isExpanded = false;
    expandProgress = 0;
    expandTarget = 0;
    resetCaseScroll();
    updateHeaderShadow();
    applyScrollTheme(0);
  };

  window.addEventListener('popstate', handlePopState);

  registerCaseStudyOpenHandler(openOverlay);

  const pending = consumePendingCaseStudyOpen();
  if (pending) {
    openOverlay(pending.slug, pending.trigger);
  } else if (config.initialSlug) {
    openOverlay(config.initialSlug, null, true);
  }

  window.__caseStudyOverlayCleanup = () => {
    enterTimeline?.kill();
    if (expandRaf !== null) {
      cancelAnimationFrame(expandRaf);
      expandRaf = null;
    }
    resizeObserver.disconnect();
    backdrop.removeEventListener('click', closeOverlay);
    closeBtn.removeEventListener('click', closeOverlay);
    overlay.removeEventListener('wheel', handleWheel);
    overlay.removeEventListener('touchstart', handleTouchStart);
    overlay.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('popstate', handlePopState);
    compactMq.removeEventListener('change', handleViewportChange);
    document.documentElement.classList.remove('case-study-open');
    spacer.remove();
    scrollEl.style.transform = 'none';
    unpinPage();
    unregisterCaseStudyOpenHandler();
    delete overlay.dataset.overlayBound;
    delete overlay.dataset.overlayMode;
  };
}
