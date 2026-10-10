import { defineCollection, z } from 'astro:content';

const principlesSchema = z.object({
  problem: z.string(),
  constraint: z.string(),
  decision: z.string(),
  result: z.string(),
});

const caseStudySchema = z.object({
  title: z.string(),
  client: z.string(),
  role: z.string(),
  year: z.string(),
  summary: z.string(),
  principles: principlesSchema,
  heroImage: z.string().optional(),
  cardImage: z.string().optional(),
  cardColor: z.string().optional(),
  cardImageCrop: z.boolean().optional(),
  cardImageMaxWidth: z.number().optional(),
  color: z.string().default('#4A5D4E'),
  themeBackground: z.string().optional(),
  themeSurface: z.string().optional(),
  tags: z.array(z.string()).default([]),
  order: z.number().default(0),
  nda: z.boolean().default(false),
});

const caseStudies = defineCollection({
  type: 'content',
  schema: caseStudySchema,
});

/** AI experiments, notes, and other dump-bin pieces — same MDX blocks as case studies. */
const playground = defineCollection({
  type: 'content',
  schema: caseStudySchema,
});

export const collections = {
  'case-studies': caseStudies,
  playground,
};
