export type Tier = {
  name: string;
  minElo: number;
  color: string;
  bgClass: string;
};

export const tiers: Tier[] = [
  { name: "Grandmaster", minElo: 2400, color: "text-red-500", bgClass: "bg-red-500/10 border-red-500/30" },
  { name: "Diamond", minElo: 2000, color: "text-cyan-400", bgClass: "bg-cyan-400/10 border-cyan-400/30" },
  { name: "Platinum", minElo: 1700, color: "text-teal-400", bgClass: "bg-teal-400/10 border-teal-400/30" },
  { name: "Gold", minElo: 1400, color: "text-gold", bgClass: "bg-gold/10 border-gold/30" },
  { name: "Silver", minElo: 1100, color: "text-gray-300", bgClass: "bg-gray-300/10 border-gray-300/30" },
  { name: "Bronze", minElo: 0, color: "text-amber-700", bgClass: "bg-amber-700/10 border-amber-700/30" },
];

export const getTier = (elo: number): Tier => {
  return tiers.find(t => elo >= t.minElo) || tiers[tiers.length - 1];
};
