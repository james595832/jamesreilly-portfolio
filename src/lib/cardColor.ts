export function isLightCardColor(hex: string): boolean {
  const normalized = hex.replace('#', '').slice(0, 6);
  if (normalized.length !== 6) return false;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export function getCardTileColor(study: { cardColor?: string; color: string }): string {
  return study.cardColor ?? study.color;
}
