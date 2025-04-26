export interface TopRanker {
  nickname: string;
  rank: number;
  formation: string;
  teamValue: number;
}

export interface FormationStat {
  formation: string;
  count: number;
  percentage: string;
}

export interface TeamValueStat {
  nickname: string;
  value: number;
} 