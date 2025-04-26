import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosInstance } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

interface MatchInfo {
  ouid: string;
  matchDate: string;
  matchDetail: {
    matchResult: string;
  };
}

interface MatchDetail {
  matchId: string;
  matchDate: string;
  matchInfo: MatchInfo[];
}

// axios 인스턴스 생성 및 최적화
const createAxiosInstance = (apiKey: string): AxiosInstance => {
  return axios.create({
    baseURL: 'https://open.api.nexon.com/fconline/v1',
    headers: {
      'x-nxopen-api-key': apiKey,
    },
    timeout: 30000,
    httpAgent: new HttpAgent({ keepAlive: true }),
    httpsAgent: new HttpsAgent({ keepAlive: true })
  });
};

// ouid 조회 함수
async function getUserId(axiosInstance: AxiosInstance, nickname: string): Promise<string | null> {
  try {
    const res = await axiosInstance.get(`/id?nickname=${encodeURIComponent(nickname)}`);
    return res.data.ouid;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// 매치 ID 목록 조회 함수
async function getMatchList(axiosInstance: AxiosInstance, ouid: string): Promise<string[]> {
  try {
    const res = await axiosInstance.get(
      `/user/match?matchtype=52&ouid=${ouid}&offset=0&limit=20&orderby=desc`
    );
    return res.data;
  } catch (error) {
    console.error('Error getting match list:', error);
    return [];
  }
}

// 매치 상세 정보 조회 함수
async function getMatchDetail(axiosInstance: AxiosInstance, matchId: string): Promise<MatchDetail | null> {
  try {
    const res = await axiosInstance.get(`/match-detail?matchid=${matchId}`);
    return res.data;
  } catch (error) {
    console.error('Error getting match detail:', error);
    return null;
  }
}

// 매치 처리 함수
async function processMatches(axiosInstance: AxiosInstance, ouid: string): Promise<any> {
  let played = 0;
  let win = 0;
  let draw = 0;
  let loss = 0;
  const matches: any[] = [];

  // 매치 ID 목록 조회
  const matchIds = await getMatchList(axiosInstance, ouid);
  
  if (matchIds.length === 0) {
    return { played, win, draw, loss, matches };
  }

  // 배치 크기 설정
  const batchSize = 5;
  
  // matchIds를 배치 크기만큼 나누어 처리
  for (let i = 0; i < matchIds.length; i += batchSize) {
    const batch = matchIds.slice(i, i + batchSize);
    
    // 배치 단위로 병렬 처리
    const batchResults = await Promise.all(
      batch.map(async (matchId) => {
        try {
          return await getMatchDetail(axiosInstance, matchId);
        } catch (error) {
          console.error('Error processing match:', matchId, error);
          return null;
        }
      })
    );

    // 배치 결과 처리
    for (const matchData of batchResults) {
      if (!matchData) continue;

      for (const info of matchData.matchInfo) {
        if (info.ouid === ouid) {
          const matchTimeStr = info.matchDate || matchData.matchDate;
          if (!matchTimeStr) continue;

          played++;
          const matchResult = info.matchDetail.matchResult;
          if (matchResult === '승') win++;
          else if (matchResult === '무') draw++;
          else if (matchResult === '패') loss++;

          matches.push({
            date: new Date(matchTimeStr).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            result: matchResult
          });
        }
      }
    }

    // 배치 간 딜레이
    if (i + batchSize < matchIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return {
    played,
    win,
    draw,
    loss,
    winRate: played > 0 ? Math.round((win / played) * 100) : 0,
    earnedFc: win * 15,
    matches
  };
}

export async function POST(req: NextRequest) {
  try {
    const { nickname } = await req.json();
    const apiKey = process.env.FC_API_KEY;

    if (!nickname) {
      return NextResponse.json(
        { error: '닉네임을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const axiosInstance = createAxiosInstance(apiKey);
    const ouid = await getUserId(axiosInstance, nickname);

    if (!ouid) {
      return NextResponse.json(
        { error: '존재하지 않는 닉네임입니다.' },
        { status: 404 }
      );
    }

    // 매치 처리
    const result = await processMatches(axiosInstance, ouid);

    return NextResponse.json({
      nickname,
      ...result
    });
  } catch (error: any) {
    console.error('Error in efficiency API:', error);
    const errorMessage = error.response?.data?.message || error.message || '데이터를 가져오는데 실패했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: error.response?.status || 500 }
    );
  }
} 