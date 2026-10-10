import { requestCaseStudyOpen } from './case-study-open';

let cardClickListenerBound = false;

export function ensureCaseStudyCardClicks(): void {
  if (cardClickListenerBound) return;
  cardClickListenerBound = true;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const trigger = target.closest<HTMLElement>('.case-card-trigger');
      if (!trigger) return;

      const slug = trigger.dataset.caseSlug;
      if (!slug) return;

      event.preventDefault();
      requestCaseStudyOpen(slug, trigger);
    },
    true,
  );
}
