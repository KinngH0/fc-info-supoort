import { NextRequest, NextResponse } from 'next/server';
import { JobStatus, PickrateResponse } from '@/types/pickrate';

interface PickrateRequest {
  rankLimit: number;
  teamColor: string;
  topN: number;
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const request: PickrateRequest = {
      rankLimit: Number(body.rankLimit),
      teamColor: body.teamColor,
      topN: Number(body.topN)
    };

    const jobId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    if (!body.apiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 401 });
    }

    // 작업 상태 초기화
    jobs.set(jobId, {
      jobId,
      done: false,
      progress: 0
    });

    // 비동기 작업 시작
    processAnalysis(jobId, request);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('작업 시작 중 오류 발생:', error);
    return NextResponse.json(
      { error: '작업 시작에 실패했습니다.' },
      { status: 500 }
    );
  }
}

async function processAnalysis(jobId: string, request: PickrateRequest) {
  try {
    // 작업 진행 상황 시뮬레이션
    for (let i = 1; i <= 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      jobs.set(jobId, {
        jobId,
        done: false,
        progress: i
      });
    }

    // 작업 완료
    jobs.set(jobId, {
      jobId,
      done: true,
      progress: 100,
      result: {
        formations: [
          { name: '4-3-3', count: 100 },
          { name: '4-4-2', count: 80 },
          { name: '4-2-3-1', count: 60 }
        ],
        teamValues: [
          { name: '팀 컬러 1', count: 200 },
          { name: '팀 컬러 2', count: 150 },
          { name: '팀 컬러 3', count: 100 }
        ],
        positions: [
          { name: 'ST', count: 300 },
          { name: 'CM', count: 250 },
          { name: 'CB', count: 200 }
        ]
      }
    });
  } catch (error) {
    console.error('작업 처리 중 오류 발생:', error);
    jobs.set(jobId, {
      jobId,
      done: true,
      progress: 100,
      error: '작업 처리 중 오류가 발생했습니다.'
    });
  }
} 