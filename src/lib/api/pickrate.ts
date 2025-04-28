import { JobStatus } from '@/types/pickrate';

const API_BASE_URL = '/api/python/pickrate';

export async function fetchTeamColors(): Promise<string[]> {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error('팀 컬러 목록을 불러오는데 실패했습니다.');
    }
    const data = await response.json();
    return data.teamColors;
  } catch (error) {
    console.error('팀 컬러 조회 중 오류 발생:', error);
    throw error;
  }
}

export async function startPickrateAnalysis(
  rankLimit: number,
  teamColor: string,
  topN: number
): Promise<string> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankLimit, teamColor, topN }),
    });

    if (!response.ok) {
      throw new Error('작업 시작에 실패했습니다.');
    }

    const { jobId } = await response.json();
    return jobId;
  } catch (error) {
    console.error('픽률 분석 시작 중 오류 발생:', error);
    throw error;
  }
}

export async function checkJobStatus(jobId: string): Promise<JobStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/status?jobId=${jobId}`);
    if (!response.ok) {
      throw new Error('작업 상태 확인에 실패했습니다.');
    }
    return response.json();
  } catch (error) {
    console.error('작업 상태 확인 중 오류 발생:', error);
    throw error;
  }
} 