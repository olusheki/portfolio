import { useQuery } from "@tanstack/react-query";

interface LeetCodeStats {
  easySolved: number;
  hardSolved: number;
  mediumSolved: number;
  totalSolved: number;
}

const USERNAME = "persheki";

export function useLeetCodeStats() {
  return useQuery<LeetCodeStats>({
    queryKey: ["leetcode-stats"],
    queryFn: async () => {
      const res = await fetch(`https://leetcode-stats.tashif.codes/${USERNAME}`);
      if (!res.ok) throw new Error("Failed to fetch LeetCode stats");
      const data = await res.json();
      return {
        easySolved: data.easySolved,
        hardSolved: data.hardSolved,
        mediumSolved: data.mediumSolved,
        totalSolved: data.totalSolved,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
