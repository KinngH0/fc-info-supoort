export interface TopRanker {
  nickname: string;
  rank: number;
  formation: string;
  teamValue: number;
}

export interface FormationStat {
  count: number;
  percentage: number;
}

export interface FormationStats {
  [formation: string]: FormationStat;
}

export interface TeamValueStat {
  average: number;
  min: number;
  max: number;
}

export interface PlayerStat {
  name: string;
  season: string;
  grade: string;
  count: number;
  percentage: number;
}

export interface PositionStats {
  [position: string]: PlayerStat[];
}

export interface PickrateResponse {
  formations: FormationStats;
  teamValues: TeamValueStat;
  positions: PositionStats;
}

export interface JobStatus {
  done: boolean;
  result?: PickrateResponse;
  progress: number;
  error?: string;
} 