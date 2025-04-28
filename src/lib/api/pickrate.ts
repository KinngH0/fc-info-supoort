import { JobStatus } from '@/types/pickrate';

export async function fetchTeamColors(): Promise<string[]> {
  const response = await fetch('/api/python/pickrate');
  if (!response.ok) {
    throw new Error('팀 컬러 목록을 불러오는데 실패했습니다.');
  }
  const data = await response.json();
  return data.teamColors;
}

export async function startPickrateAnalysis(
  rankLimit: number,
  teamColor: string,
  topN: number,
  apiKey: string
): Promise<string> {
  const response = await fetch('/api/python/pickrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rankLimit,
      teamColor,
      topN,
      apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error('작업 시작에 실패했습니다.');
  }

  const { jobId } = await response.json();
  return jobId;
}

export async function checkJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/python/pickrate?jobId=${jobId}`);
  if (!response.ok) {
    throw new Error('작업 상태 확인에 실패했습니다.');
  }
  return response.json();
} 