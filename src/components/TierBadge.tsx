import { getTier } from "@/lib/tiers";

export const TierBadge = ({ elo }: { elo: number }) => {
  const tier = getTier(elo);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${tier.bgClass} ${tier.color}`}>
      {tier.name}
    </span>
  );
};
