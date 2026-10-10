export interface CaseStudyPrinciples {
  problem: string;
  constraint: string;
  decision: string;
  result: string;
}

export interface CaseStudyMeta {
  id: string;
  title: string;
  slug: string;
  client: string;
  role: string;
  year: string;
  summary: string;
  principles: CaseStudyPrinciples;
  heroImage?: string;
  cardImage?: string;
  cardColor?: string;
  cardImageCrop?: boolean;
  cardImageMaxWidth?: number;
  color: string;
  themeBackground?: string;
  themeSurface?: string;
  tags: string[];
  order: number;
  nda?: boolean;
}
