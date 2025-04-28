import { NextRequest, NextResponse } from 'next/server';
import { JobStatus } from '@/types/pickrate';

const jobs = new Map<string, JobStatus>();

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (jobId) {
    const status = jobs.get(jobId);
    if (!status) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  // 팀 컬러 목록 반환
  return NextResponse.json({
    teamColors: ['all', 'red', 'blue', 'green', 'yellow', 'purple']
  });
}

export async function POST(request: NextRequest) {
  try {
    const { rankLimit, teamColor, topN, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 401 });
    }

    // 작업 ID 생성
    const jobId = Math.random().toString(36).substring(2, 15);
    
    // 작업 상태 초기화
    jobs.set(jobId, {
      done: false,
      progress: 0,
    });

    // 비동기 작업 시작
    processJob(jobId, rankLimit, teamColor, topN, apiKey);

    return NextResponse.json({ jobId });
  } catch {
    return NextResponse.json(
      { error: '잘못된 요청입니다.' },
      { status: 400 }
    );
  }
}

async function processJob(
  jobId: string,
  rankLimit: number,
  teamColor: string,
  topN: number,
  apiKey: string
) {
  try {
    // Python API 호출
    const response = await fetch('http://localhost:8000/pickrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        rankLimit,
        teamColor,
        topN,
      }),
    });

    if (!response.ok) {
      throw new Error('Python API 호출 실패');
    }

    const result = await response.json();

    // 작업 완료 상태 업데이트
    jobs.set(jobId, {
      done: true,
      result,
      progress: 100,
    });
  } catch (error) {
    jobs.set(jobId, {
      done: true,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      progress: 100,
    });
  }
} 