import gsap from 'gsap';
import { initWorkflowDiagrams } from './workflow-diagram-init';
import { initClaudeProcessDiagrams } from './claude-process-init';
import { initEmblaCarousels, reinitEmblaCarousels, ensureCaseStudyCardClicks } from './embla-init';
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
const SURFACE_COLOR = '#1a1a1a';
const BACKDROP_OPACITY_SHEET = 0.72;
const BACKDROP_OPACITY_FULL = 1;

export interface CaseStudyOverlayConfig {
  caseStudies: CaseStudyMeta[];
  initialSlug?: string;
  pathPrefix?: string;
  closePath?: string;
  showAuthorBand?: boolean;
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

export function initCaseStudyOverlay(config: CaseStudyOverlayConfig): void {
  const overlay = document.getElementById('case-study-overlay');
  if (!overlay || overlay.dataset.overlayBound === 'true') return;
  overlay.dataset.overlayBound = 'true';
  ensureCaseStudyCardClicks();

  const backdrop = overlay.querySelector<HTMLButtonElement>('[data-overlay-backdrop]');
  const sheet = overlay.querySelector<HTMLElement>('[data-overlay-sheet]');
  const motion = overlay.querySelector<HTMLElement>('[data-overlay-motion]');
  const scrollEl = overlay.querySelector<HTMLElement>('[data-overlay-scroll]');
  const contentEl = overlay.querySelector<HTMLElement>('[data-overlay-content]');
  const closeBtn = overlay.querySelector<HTMLButtonElement>('[data-overlay-close]');
  const headerSlot = overlay.querySelector<HTMLElement>('[data-overlay-header-slot]');
  const carouselRoot = overlay.querySelector<HTMLElement>('[data-overlay-carousel] [data-embla-root]');
  const authorBand = overlay.querySelector<HTMLElement>('[data-overlay-author]');

  if (!backdrop || !sheet || !motion || !scrollEl || !contentEl || !closeBtn || !headerSlot) {
    return;
  }

  const caseStudies = config.caseStudies;
  const pathPrefix = (config.pathPrefix || '/work').replace(/\/$/, '');
  const closePath = config.closePath || '/';
  const showAuthorBand = Boolean(config.showAuthorBand);
  const studyBySlug = new Map(caseStudies.map((study) => [study.slug, study]));
  const pathPattern = new RegExp(`^${pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/]+)`);

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
    themeSurface: string = SURFACE_COLOR,
  ) => {
    const headerEl = scrollEl.querySelector<HTMLElement>('.case-study-landing-header');
    const clamped = Math.max(0, Math.min(1, progress));

    if (!themeColor) {
      scrollEl.style.removeProperty('--case-theme-p');
      scrollEl.style.removeProperty('--case-theme-color');
      scrollEl.style.removeProperty('--case-ink-color');
      scrollEl.style.removeProperty('--case-ink-muted');
      scrollEl.style.removeProperty('color');
      scrollEl.removeAttribute('data-theme-scroll');
      scrollEl.removeAttribute('data-theme-ink');
      scrollEl.removeAttribute('data-theme-light');
      clearCopyInk();
      closeBtn.style.removeProperty('color');
      sheet.style.removeProperty('--case-theme-p');
      sheet.style.removeProperty('--case-theme-color');
      sheet.style.removeProperty('--case-ink-color');
      sheet.style.removeProperty('--case-ink-muted');
      sheet.style.removeProperty('background-color');
      sheet.removeAttribute('data-theme-scroll');
      sheet.removeAttribute('data-theme-ink');
      sheet.removeAttribute('data-theme-light');
      return;
    }

    const destinationIsLight = isLightThemeColor(themeColor);

    /*
     * Opening state for light destinations (cream/white): stay on the dark
     * surface with white copy — same as every other case study — until the
     * theme-trigger image actually scrolls into the transition band.
     */
    if (destinationIsLight && clamped <= 0.001) {
      clearCopyInk();
      scrollEl.style.setProperty('--case-theme-p', '0');
      scrollEl.style.setProperty('--case-theme-color', themeColor);
      scrollEl.style.setProperty('--case-ink-color', 'rgba(255, 255, 255, 0.92)');
      scrollEl.style.setProperty('--case-ink-muted', '#888888');
      scrollEl.setAttribute('data-theme-scroll', 'true');
      scrollEl.setAttribute('data-theme-ink', 'light');
      scrollEl.setAttribute('data-theme-light', 'false');
      sheet.style.setProperty('--case-theme-p', '0');
      sheet.style.setProperty('--case-theme-color', themeColor);
      sheet.style.setProperty('--case-ink-color', 'rgba(255, 255, 255, 0.92)');
      sheet.style.setProperty('--case-ink-muted', '#888888');
      sheet.setAttribute('data-theme-scroll', 'true');
      sheet.setAttribute('data-theme-ink', 'light');
      sheet.setAttribute('data-theme-light', 'false');
      sheet.style.backgroundColor = themeSurface;
      closeBtn.style.color = 'rgba(255, 255, 255, 0.92)';
      return;
    }

    const ink = destinationIsLight ? 'dark' : 'light';
    const inkProgress = ink === 'dark' ? Math.min(1, clamped * 2.2) : clamped;

    const inkColor =
      ink === 'dark'
        ? `color-mix(in srgb, rgba(255, 255, 255, 0.92) ${(1 - inkProgress) * 100}%, #000000 ${inkProgress * 100}%)`
        : `color-mix(in srgb, rgba(255, 255, 255, 0.85) ${(1 - inkProgress) * 100}%, #ffffff ${inkProgress * 100}%)`;

    const mutedInkColor =
      ink === 'dark'
        ? `color-mix(in srgb, #888888 ${(1 - inkProgress) * 100}%, #444444 ${inkProgress * 100}%)`
        : `color-mix(in srgb, #888888 ${(1 - inkProgress) * 100}%, rgba(255, 255, 255, 0.72) ${inkProgress * 100}%)`;

    scrollEl.style.setProperty('--case-theme-p', String(inkProgress));
    scrollEl.style.setProperty('--case-theme-color', themeColor);
    scrollEl.style.setProperty('--case-ink-color', inkColor);
    scrollEl.style.setProperty('--case-ink-muted', mutedInkColor);
    scrollEl.setAttribute('data-theme-scroll', 'true');
    scrollEl.setAttribute('data-theme-ink', ink);
    scrollEl.setAttribute('data-theme-light', ink === 'dark' ? 'true' : 'false');

    sheet.style.setProperty('--case-theme-p', String(inkProgress));
    sheet.style.setProperty('--case-theme-color', themeColor);
    sheet.style.setProperty('--case-ink-color', inkColor);
    sheet.style.setProperty('--case-ink-muted', mutedInkColor);
    sheet.setAttribute('data-theme-scroll', 'true');
    sheet.setAttribute('data-theme-ink', ink);
    sheet.setAttribute('data-theme-light', ink === 'dark' ? 'true' : 'false');
    sheet.style.backgroundColor =
      clamped === 0
        ? themeSurface
        : `color-mix(in srgb, ${themeSurface} ${(1 - clamped) * 100}%, ${themeColor} ${clamped * 100}%)`;

    closeBtn.style.color = inkColor;

    if (ink === 'dark') {
      headerEl?.style.setProperty('--case-copy-ink', inkColor);
      headerEl?.style.setProperty('--case-copy-muted', mutedInkColor);
      contentEl.style.setProperty('--case-copy-ink', inkColor);
      contentEl.style.setProperty('--case-copy-muted', mutedInkColor);

      scrollEl
        .querySelectorAll<HTMLElement>(
          '.case-study-summary, .case-study-meta, .case-study-copy, .case-study-copy p, .case-study-body p, .case-study-body li, .case-study-body .prose-case',
        )
        .forEach((el) => {
          const useMuted =
            el.classList.contains('case-study-meta') || el.classList.contains('text-muted');
          el.style.setProperty('color', useMuted ? mutedInkColor : inkColor, 'important');
          el.dataset.caseCopyInk = 'true';
        });
    } else {
      clearCopyInk();
    }
  };

  const getThemeProgress = (): number => {
    const trigger = contentEl.querySelector<HTMLElement>('[data-case-theme-trigger]');
    if (!trigger) return 0;

    const viewport = scrollEl.getBoundingClientRect();
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
    const clamped = Math.max(0, Math.min(1, progress));
    expandProgress = clamped;

    const top = SHEET_TOP_GAP * (1 - clamped);
    const radius = SHEET_RADIUS * (1 - clamped);
    const inset = SHEET_INSET * (1 - clamped);
    const scale = 0.94 + clamped * 0.06;
    const backdropOpacity =
      BACKDROP_OPACITY_SHEET + (BACKDROP_OPACITY_FULL - BACKDROP_OPACITY_SHEET) * clamped;

    sheet.style.top = `${top}px`;
    sheet.style.height = `calc(100dvh - ${top}px)`;
    sheet.style.left = `${inset}px`;
    sheet.style.right = `${inset}px`;
    sheet.style.borderTopLeftRadius = `${radius}px`;
    sheet.style.borderTopRightRadius = `${radius}px`;

    motion.style.transform = `scale(${scale})`;
    motion.style.transformOrigin = '50% 0%';
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
    expandTarget = Math.max(0, Math.min(1, target));
    if (expandRaf === null) {
      expandRaf = requestAnimationFrame(tickExpand);
    }
  };

  const updateCarouselFilter = (slug: string) => {
    if (!carouselRoot) return;

    carouselRoot.querySelectorAll<HTMLElement>('[data-carousel-slug]').forEach((item) => {
      const excluded = item.dataset.carouselSlug === slug;
      item.classList.toggle('hidden', excluded);
      item.setAttribute('aria-hidden', String(excluded));
    });

    initEmblaCarousels(carouselRoot);
    requestAnimationFrame(() => reinitEmblaCarousels(carouselRoot));
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

  const setOverlayVisible = (visible: boolean) => {
    isVisible = visible;
    if (visible) {
      overlay.removeAttribute('hidden');
    } else {
      overlay.setAttribute('hidden', '');
    }
    document.body.style.overflow = visible ? 'hidden' : '';
  };

  const finishClose = () => {
    isClosing = false;
    setOverlayVisible(false);
    activeSlug = null;
    isExpanded = false;
    expandProgress = 0;
    expandTarget = 0;
    skipEnterAnimation = false;
    scrollEl.scrollTop = 0;
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

    if (reducedMotion) {
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
    updateCarouselFilter(activeSlug);

    const study = studyBySlug.get(activeSlug);
    const themeBackground = study?.themeBackground;
    const themeSurface = study?.themeSurface ?? SURFACE_COLOR;
    const generation = animGeneration;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    enterTimeline?.kill();

    if (skipEnterAnimation || reducedMotion) {
      gsap.set(sheet, { y: 0, clearProps: 'transform' });
      gsap.set(motion, { opacity: 1 });
      gsap.set(backdrop, {
        opacity: skipEnterAnimation ? BACKDROP_OPACITY_FULL : BACKDROP_OPACITY_SHEET,
      });
      applySheetGeometry(skipEnterAnimation ? 1 : 0);
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
      setExpandTarget(Math.min(scrollEl.scrollTop / EXPAND_SCROLL, 1));
      if (themeBackground) {
        applyScrollTheme(getThemeProgress(), themeBackground, themeSurface);
      }
    });
  };

  const openOverlay = (slug: string, trigger?: HTMLElement | null, instant = false) => {
    const switching = isVisible && activeSlug !== null && activeSlug !== slug;

    triggerEl = trigger ?? null;
    if (instant) skipEnterAnimation = true;
    else skipEnterAnimation = false;

    animGeneration += 1;
    expandProgress = skipEnterAnimation ? 1 : 0;
    expandTarget = expandProgress;
    isExpanded = skipEnterAnimation;

    if (switching || !skipEnterAnimation) {
      scrollEl.scrollTop = 0;
    }

    // Match homepage tile open: when switching studies, park the sheet off-screen
    // first so remounting content doesn't snap the already-open sheet.
    if (switching && !skipEnterAnimation) {
      enterTimeline?.kill();
      applyScrollTheme(0);
      applySheetGeometry(0);
      gsap.set(motion, { opacity: 0 });
      gsap.set(sheet, { y: '100%' });
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

  const handleScroll = () => {
    if (!activeSlug) return;
    setExpandTarget(Math.min(scrollEl.scrollTop / EXPAND_SCROLL, 1));
    const study = studyBySlug.get(activeSlug);
    if (study?.themeBackground) {
      applyScrollTheme(getThemeProgress(), study.themeBackground, study.themeSurface ?? SURFACE_COLOR);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeOverlay();

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

  backdrop.addEventListener('click', closeOverlay);
  closeBtn.addEventListener('click', closeOverlay);
  scrollEl.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('keydown', handleKeyDown);

  window.addEventListener('popstate', () => {
    const match = window.location.pathname.match(pathPattern);
    if (match) {
      enterTimeline?.kill();
      skipEnterAnimation = true;
      animGeneration += 1;
      expandProgress = 1;
      expandTarget = 1;
      isExpanded = true;
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
    scrollEl.scrollTop = 0;
    applyScrollTheme(0);
  });

  registerCaseStudyOpenHandler(openOverlay);

  const pending = consumePendingCaseStudyOpen();
  if (pending) {
    openOverlay(pending.slug, pending.trigger);
  } else if (config.initialSlug) {
    openOverlay(config.initialSlug, null, true);
  }
}
