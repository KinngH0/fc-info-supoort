export interface Formation {
  name: string;
  count: number;
}

export interface TeamValue {
  name: string;
  count: number;
}

export interface Position {
  name: string;
  count: number;
}

export interface PickrateResponse {
  formations: Formation[];
  teamValues: TeamValue[];
  positions: Position[];
}

export interface JobStatus {
  jobId: string;
  progress: number;
  done: boolean;
  error?: string;
  result?: PickrateResponse;
} 