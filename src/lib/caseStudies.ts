import { getCollection } from 'astro:content';
import type { CaseStudyMeta } from '../types/caseStudy';

function normalizeSlug(id: string): string {
  return id.replace(/\.mdx$/, '');
}

export async function getCaseStudyMeta(): Promise<CaseStudyMeta[]> {
  const entries = await getCollection('case-studies');
  return entries
    .map((entry) => ({
      id: entry.id,
      slug: normalizeSlug(entry.id),
      ...entry.data,
    }))
    .sort((a, b) => a.order - b.order);
}

export async function getCaseStudyBySlug(slug: string) {
  const entries = await getCollection('case-studies');
  return entries.find((entry) => normalizeSlug(entry.id) === slug);
}
