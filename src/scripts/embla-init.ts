import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType } from 'embla-carousel';
import { requestCaseStudyOpen } from './case-study-open';

const OPTIONS: EmblaOptionsType = {
  align: 'start',
  containScroll: 'keepSnaps',
  dragFree: true,
  slidesToScroll: 1,
  startIndex: 0,
  duration: 28,
  watchDrag: (_embla, event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-embla-prev], [data-embla-next], .cards-scroller-nav')) return false;
    return true;
  },
};

type CarouselInstance = {
  embla: EmblaCarouselType;
  updateButtons: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onResize: () => void;
  abort: AbortController;
};

const instances = new WeakMap<HTMLElement, CarouselInstance>();

function setNavButtonState(button: HTMLButtonElement | null, enabled: boolean) {
  if (!button) return;
  button.disabled = !enabled;
  button.classList.toggle('is-hidden', !enabled);
  button.setAttribute('aria-hidden', String(!enabled));
}

function destroyCarousel(carouselRoot: HTMLElement) {
  const existing = instances.get(carouselRoot);
  if (!existing) return;

  existing.embla.off('select', existing.updateButtons);
  existing.embla.off('settle', existing.updateButtons);
  existing.embla.off('reInit', existing.updateButtons);
  existing.embla.off('pointerDown', existing.onPointerDown);
  existing.embla.off('pointerUp', existing.onPointerUp);
  existing.embla.destroy();
  existing.abort.abort();
  instances.delete(carouselRoot);
  delete carouselRoot.dataset.emblaReady;
}

function openCaseStudy(slug: string, trigger: HTMLElement) {
  requestCaseStudyOpen(slug, trigger);
}

function handleNavClick(event: Event, scroll: () => void) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  scroll();
}

function getLastSnapIndex(embla: EmblaCarouselType): number {
  return embla.internalEngine().scrollSnaps.length - 1;
}

/** Advance one card left (toward the last card). */
function scrollForward(embla: EmblaCarouselType) {
  const currentIndex = embla.selectedScrollSnap();
  const lastIndex = getLastSnapIndex(embla);
  if (currentIndex >= lastIndex) return;

  embla.internalEngine().scrollBody.useDuration(28).useFriction(0.92);
  embla.scrollTo(currentIndex + 1);
}

/** Step one card right (back toward the start). */
function scrollBack(embla: EmblaCarouselType) {
  const currentIndex = embla.selectedScrollSnap();
  if (currentIndex <= 0) return;

  embla.internalEngine().scrollBody.useDuration(28).useFriction(0.92);
  embla.scrollTo(currentIndex - 1);
}

function updateChevronState(
  embla: EmblaCarouselType,
  leftBtn: HTMLButtonElement | null,
  rightBtn: HTMLButtonElement | null,
) {
  const index = embla.selectedScrollSnap();
  const lastIndex = getLastSnapIndex(embla);

  // Left chevron: step back toward the start — hide at start
  setNavButtonState(leftBtn, index > 0);
  // Right chevron: advance toward the last card — hide at end
  setNavButtonState(rightBtn, index < lastIndex);
}

function initCarousel(carouselRoot: HTMLElement) {
  destroyCarousel(carouselRoot);

  const viewport = carouselRoot.querySelector<HTMLElement>('[data-embla-viewport]');
  if (!viewport) return;

  const leftBtn = carouselRoot.querySelector<HTMLButtonElement>('[data-embla-prev]');
  const rightBtn = carouselRoot.querySelector<HTMLButtonElement>('[data-embla-next]');
  const abort = new AbortController();

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  let pointerStartX = 0;
  let pointerStartY = 0;

  const embla = EmblaCarousel(viewport, OPTIONS);

  const updateButtons = () => updateChevronState(embla, leftBtn, rightBtn);

  const scrollParentSelector = carouselRoot.dataset.emblaInScroll
    ? '.case-study-scroll-panel'
    : null;

  const onPointerDown = () => {
    viewport.classList.add('is-dragging');
    if (!scrollParentSelector) return;
    const scrollParent = carouselRoot.closest<HTMLElement>(scrollParentSelector);
    if (scrollParent) scrollParent.style.overflowY = 'hidden';
  };

  const releaseScrollLock = () => {
    viewport.classList.remove('is-dragging');
    if (!scrollParentSelector) return;
    const scrollParent = carouselRoot.closest<HTMLElement>(scrollParentSelector);
    if (scrollParent) scrollParent.style.overflowY = '';
  };

  const onPointerUp = () => {
    releaseScrollLock();
  };

  const onViewportPointerDown = (event: PointerEvent) => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  };

  const onViewportPointerUp = (event: PointerEvent) => {
    const dx = Math.abs(event.clientX - pointerStartX);
    const dy = Math.abs(event.clientY - pointerStartY);
    carouselRoot.dataset.clickAllowed = String(dx <= 10 && dy <= 10);

    window.requestAnimationFrame(() => {
      carouselRoot.dataset.clickAllowed = 'true';
    });
  };

  viewport.addEventListener('pointerdown', onViewportPointerDown, { signal: abort.signal });
  viewport.addEventListener('pointerup', onViewportPointerUp, { signal: abort.signal });
  viewport.addEventListener('pointercancel', releaseScrollLock, { signal: abort.signal });
  viewport.addEventListener('lostpointercapture', releaseScrollLock, { signal: abort.signal });

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      embla.reInit();
      updateButtons();
    }, 150);
  };

  embla.on('pointerDown', onPointerDown);
  embla.on('pointerUp', onPointerUp);

  const onWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

    event.preventDefault();

    const engine = embla.internalEngine();
    engine.scrollBody.useDuration(0).useFriction(0.12);
    engine.animation.start();
    engine.target.add(-event.deltaX);
  };

  viewport.addEventListener('wheel', onWheel, { signal: abort.signal, passive: false });

  leftBtn?.addEventListener(
    'click',
    (event) => handleNavClick(event, () => scrollBack(embla)),
    { signal: abort.signal, capture: true },
  );

  rightBtn?.addEventListener(
    'click',
    (event) => handleNavClick(event, () => scrollForward(embla)),
    { signal: abort.signal, capture: true },
  );

  carouselRoot.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const target = event.target as HTMLElement;
      const trigger = target.closest<HTMLElement>('.case-card-trigger');
      if (!trigger) return;

      event.preventDefault();
      const slug = trigger.dataset.caseSlug;
      if (slug) openCaseStudy(slug, trigger);
    },
    { signal: abort.signal },
  );

  // Update chevrons only when the carousel settles — avoids flicker mid-scroll
  embla.on('select', updateButtons);
  embla.on('settle', updateButtons);
  embla.on('reInit', updateButtons);

  window.addEventListener('resize', onResize, { signal: abort.signal });

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      embla.reInit();
      updateButtons();
    },
    { threshold: 0.12 },
  );
  visibilityObserver.observe(carouselRoot);
  abort.signal.addEventListener('abort', () => visibilityObserver.disconnect());

  carouselRoot.dataset.emblaReady = 'true';
  carouselRoot.dataset.clickAllowed = 'true';
  instances.set(carouselRoot, { embla, updateButtons, onPointerDown, onPointerUp, onResize, abort });
  updateButtons();
}

let cardClickListenerBound = false;

function bindCaseStudyCardClicks() {
  if (cardClickListenerBound) return;
  cardClickListenerBound = true;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-embla-prev], [data-embla-next], .cards-scroller-nav')) return;

      const trigger = target.closest<HTMLElement>('.case-card-trigger');
      if (!trigger) return;

      const carouselRoot = trigger.closest<HTMLElement>('[data-embla-root]');
      const feedRoot = trigger.closest<HTMLElement>('[data-case-feed]');
      if (carouselRoot) {
        if (carouselRoot.dataset.clickAllowed === 'false') return;
      } else if (!feedRoot) {
        // Index links on /ideas sit outside the feed — still open via overlay.
        if (!trigger.closest('.ideas-rail--index, .about-rail--index')) return;
      }

      const slug = trigger.dataset.caseSlug;
      if (!slug) return;

      event.preventDefault();
      requestCaseStudyOpen(slug, trigger);
    },
    true,
  );
}

function getCarouselRoots(root: ParentNode): HTMLElement[] {
  const roots: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches('[data-embla-root]')) {
    roots.push(root);
  }
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    roots.push(...root.querySelectorAll<HTMLElement>('[data-embla-root]'));
  }
  return roots;
}

export function reinitEmblaCarousels(root: ParentNode = document): void {
  getCarouselRoots(root).forEach((carouselRoot) => {
    const existing = instances.get(carouselRoot);
    if (existing) {
      existing.embla.reInit();
      existing.updateButtons();
      return;
    }
    initCarousel(carouselRoot);
  });
}

export function ensureCaseStudyCardClicks(): void {
  bindCaseStudyCardClicks();
}

export function initEmblaCarousels(root: ParentNode = document): void {
  bindCaseStudyCardClicks();
  getCarouselRoots(root).forEach(initCarousel);
}

export type { EmblaCarouselType };
