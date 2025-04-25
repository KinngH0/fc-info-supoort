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

interface MatchResult {
  played: number;
  win: number;
  draw: number;
  loss: number;
  hasMore: boolean;
  lastOffset: number;
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

// 날짜가 같은지 확인하는 함수 (한국 시간 기준)
function isSameDay(date1: Date, date2: Date): boolean {
  // UTC+9 (한국 시간)로 변환
  const d1 = new Date(date1.getTime() + 9 * 60 * 60 * 1000);
  const d2 = new Date(date2.getTime() + 9 * 60 * 60 * 1000);
  
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

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
async function getMatchList(axiosInstance: AxiosInstance, ouid: string, offset: number, limit: number): Promise<string[]> {
  try {
    const res = await axiosInstance.get(
      `/user/match?matchtype=52&ouid=${ouid}&offset=${offset}&limit=${limit}&orderby=desc`
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
async function processMatches(axiosInstance: AxiosInstance, ouid: string, targetDate: Date, offset: number): Promise<MatchResult> {
  let played = 0;
  let win = 0;
  let draw = 0;
  let loss = 0;
  let hasMore = true;
  let oldestMatchDate = new Date();

  // 매치 ID 목록 조회
  const matchIds = await getMatchList(axiosInstance, ouid, offset, 100);
  
  if (matchIds.length === 0) {
    return { played, win, draw, loss, hasMore: false, lastOffset: offset };
  }

  // 각 매치의 상세 정보 조회
  for (const matchId of matchIds) {
    try {
      const matchData = await getMatchDetail(axiosInstance, matchId);
      if (!matchData) continue;

      for (const info of matchData.matchInfo) {
        if (info.ouid === ouid) {
          const matchTimeStr = info.matchDate || matchData.matchDate;
          if (!matchTimeStr) continue;

          const matchTime = new Date(matchTimeStr);
          matchTime.setHours(0, 0, 0, 0);

          if (matchTime.getTime() > targetDate.getTime()) {
            continue;
          } else if (matchTime.getTime() < targetDate.getTime()) {
            hasMore = false;
            break;
          }

          played++;
          const matchResult = info.matchDetail.matchResult;
          if (matchResult === '승') win++;
          else if (matchResult === '무') draw++;
          else if (matchResult === '패') loss++;
        }
      }

      if (!hasMore) break;

      // API 호출 간격 조절
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error processing match:', matchId, error);
      continue;
    }
  }

  // 더 이상 매치가 없거나 타겟 날짜보다 이전 날짜의 매치를 찾았다면 중단
  hasMore = hasMore && oldestMatchDate >= targetDate;

  return {
    played,
    win,
    draw,
    loss,
    hasMore,
    lastOffset: offset + 100
  };
}

export async function POST(req: NextRequest) {
  try {
    const { nickname, targetDate } = await req.json();
    const apiKey = process.env.FC_API_KEY;

    if (!nickname || !targetDate) {
      return NextResponse.json(
        { error: '닉네임과 날짜를 입력해주세요.' },
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

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    // 매치 처리
    const result = await processMatches(axiosInstance, ouid, target, 0);

    // 승률 계산 (0으로 나누는 경우 처리)
    const winRate = result.played > 0 ? Math.round((result.win / result.played) * 100) : 0;

    return NextResponse.json({
      nickname,
      date: targetDate,
      ...result,
      winRate,
      earnedFc: result.win * 15,
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