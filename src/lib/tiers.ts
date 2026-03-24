export type Tier = {
  name: string;
  minElo: number;
  color: string;
  bgClass: string;
};

export const tiers: Tier[] = [
  { name: "Grandmaster", minElo: 2400, color: "text-gold", bgClass: "bg-gold/10 border-gold/30" },
  { name: "Master", minElo: 2000, color: "text-purple-400", bgClass: "bg-purple-400/10 border-purple-400/30" },
  { name: "Expert", minElo: 1600, color: "text-blue-400", bgClass: "bg-blue-400/10 border-blue-400/30" },
  { name: "Apprentice", minElo: 0, color: "text-muted-foreground", bgClass: "bg-muted border-border" },
];

export const getTier = (elo: number): Tier => {
  return tiers.find(t => elo >= t.minElo) || tiers[tiers.length - 1];
};
