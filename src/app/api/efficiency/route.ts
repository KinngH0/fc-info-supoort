import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = 'live_bed3de42ec2c55504592a7dadf646395530b83f3235fd2f97d894bcfb3627191efe8d04e6d233bd35cf2fabdeb93fb0d';

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

    if (!response.data || !response.data.ouid) {
      throw new Error('존재하지 않는 닉네임입니다.');
    }

    return response.data.ouid;
  } catch (error: any) {
    console.error('Error in getOuid:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      throw new Error('존재하지 않는 닉네임입니다.');
    }
    if (error.response?.status === 429) {
      throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(error.response?.data?.message || '유저 정보를 가져오지 못했습니다.');
  }
}

async function getMatchIds(offset: number = 0): Promise<string[]> {
  try {
    const response = await axios.get(
      `https://open.api.nexon.com/fconline/v1/match?matchtype=52&offset=${offset}&limit=100&orderby=desc`,
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

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname, date } = body;

    if (!nickname || !date) {
      return NextResponse.json(
        { error: '닉네임과 날짜를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 날짜 파싱
    const targetDate = new Date(date);
    const today = new Date();
    
    if (targetDate > today) {
      return NextResponse.json(
        { error: '미래 날짜는 조회할 수 없습니다.' },
        { status: 400 }
      );
    }

    // ouid 조회
    const ouid = await getOuid(nickname);

    // 변수 초기화
    let played = 0;
    let win = 0;
    let draw = 0;
    let loss = 0;
    let shouldContinue = true;
    let offset = 0;
    let oldestMatchDate = new Date();
    let consecutiveEmptyResponses = 0;

    while (shouldContinue && offset < 1000) { // 최대 1000경기까지만 조회
      try {
        // 매치 ID 목록 조회
        const matchIds = await getMatchIds(offset);
        
        if (matchIds.length === 0) {
          consecutiveEmptyResponses++;
          if (consecutiveEmptyResponses >= 3) {
            break; // 연속 3번 빈 응답이면 종료
          }
          offset += 100;
          continue;
        }
        consecutiveEmptyResponses = 0;

        // 각 매치의 상세 정보 조회
        for (const matchId of matchIds) {
          try {
            const matchDetail = await getMatchDetail(matchId);
            const matchDate = new Date(matchDetail.matchDate);
            oldestMatchDate = matchDate;

            // 해당 날짜의 매치인지 확인
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
            }
          } catch (matchError: any) {
            console.error('Error fetching match detail:', matchId, matchError.response?.data || matchError.message);
            continue; // 개별 매치 조회 실패는 건너뛰기
          }

          // API 호출 간격 조절
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 타겟 날짜보다 이전 날짜의 매치를 찾았다면 중단
        if (oldestMatchDate < targetDate) {
          shouldContinue = false;
          break;
        }

        offset += 100;
        
        // API 호출 간격 조절
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error: any) {
        if (error.message.includes('API 호출 한도를 초과했습니다')) {
          // rate limit에 걸렸을 때 더 오래 대기
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }

    // 결과 계산
    const winRate = played > 0 ? Math.round((win / played) * 100) : 0;
    const earnedFc = win * 15; // 승리당 15FC

    if (played === 0) {
      return NextResponse.json(
        { error: '해당 날짜에 경기 데이터가 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      nickname,
      date,
      played,
      win,
      draw,
      loss,
      winRate,
      earnedFc,
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