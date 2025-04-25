import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.FC_API_KEY;
const MAX_MATCHES_PER_REQUEST = 20; // 한 번에 처리할 최대 매치 수

interface MatchDetail {
  matchId: string;
  matchDate: string;
  matchType: number;
  matchInfo: Array<{
    ouid: string;
    nickname: string;
    matchDetail: {
      matchResult: string;
    };
  }>;
}

interface MatchResult {
  played: number;
  win: number;
  draw: number;
  loss: number;
  hasMore: boolean;
  lastOffset: number;
}

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
async function getOuid(nickname: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://open.api.nexon.com/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`,
      {
        headers: {
          'x-nxopen-api-key': API_KEY,
          'accept': 'application/json'
        }
      }
    );

    if (!response.data) {
      throw new Error('존재하지 않는 닉네임입니다.');
    }

    return response.data;
  } catch (error: any) {
    console.error('Error in getOuid:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(error.response?.data?.message || '사용자를 찾을 수 없습니다.');
  }
}

// 매치 ID 목록 조회 함수
async function getMatchIds(offset: number = 0): Promise<string[]> {
  try {
    const response = await axios.get(
      `https://open.api.nexon.com/fconline/v1/match?matchtype=52&offset=${offset}&limit=${MAX_MATCHES_PER_REQUEST}&orderby=desc`,
      {
        headers: {
          'x-nxopen-api-key': API_KEY,
          'accept': 'application/json'
        }
      }
    );

    if (!Array.isArray(response.data)) {
      console.error('Unexpected match list response:', response.data);
      throw new Error('매치 데이터 형식이 올바르지 않습니다.');
    }

    return response.data;
  } catch (error: any) {
    console.error('Error in getMatchIds:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(error.response?.data?.message || '매치 목록을 가져오지 못했습니다.');
  }
}

// 매치 상세 정보 조회 함수
async function getMatchDetail(matchId: string): Promise<MatchDetail> {
  try {
    const response = await axios.get(
      `https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchId}`,
      {
        headers: {
          'x-nxopen-api-key': API_KEY,
          'accept': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error in getMatchDetail:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(error.response?.data?.message || '매치 상세 정보를 가져오지 못했습니다.');
  }
}

// 매치 처리 함수
async function processMatches(ouid: string, targetDate: Date, offset: number): Promise<MatchResult> {
  let played = 0;
  let win = 0;
  let draw = 0;
  let loss = 0;
  let hasMore = true;
  let oldestMatchDate = new Date();

  // 매치 ID 목록 조회
  const matchIds = await getMatchIds(offset);
  
  if (matchIds.length === 0) {
    return { played, win, draw, loss, hasMore: false, lastOffset: offset };
  }

  // 각 매치의 상세 정보 조회
  for (const matchId of matchIds) {
    try {
      const matchDetail = await getMatchDetail(matchId);
      const matchDate = new Date(matchDetail.matchDate);
      oldestMatchDate = matchDate;

      // 해당 날짜의 매치인지 확인 (한국 시간 기준)
      if (isSameDay(matchDate, targetDate)) {
        played++;
        
        // 플레이어의 결과 찾기
        const playerResult = matchDetail.matchInfo.find(info => info.ouid === ouid);
        if (playerResult) {
          const result = playerResult.matchDetail.matchResult;
          if (result === '승') win++;
          else if (result === '무') draw++;
          else if (result === '패') loss++;
        }
      } else if (matchDate < targetDate) {
        // 타겟 날짜보다 이전 날짜의 매치를 찾았다면 중단
        hasMore = false;
        break;
      }

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
    lastOffset: offset + MAX_MATCHES_PER_REQUEST
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname, date, offset = 0 } = body;

    if (!nickname || !date) {
      return NextResponse.json(
        { error: '닉네임과 날짜를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 날짜 파싱 (한국 시간 기준)
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9로 변환
    
    if (targetDate > today) {
      return NextResponse.json(
        { error: '미래 날짜는 조회할 수 없습니다.' },
        { status: 400 }
      );
    }

    // ouid 조회
    const ouid = await getOuid(nickname);

    // 매치 처리
    const result = await processMatches(ouid, targetDate, offset);

    // 승률 계산 (0으로 나누는 경우 처리)
    const winRate = result.played > 0 ? Math.round((result.win / result.played) * 100) : 0;

    return NextResponse.json({
      nickname,
      date,
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