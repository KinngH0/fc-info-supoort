import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        httpsAgent: agent,
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nickname, date } = await req.json();

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

    // 변수 초기화
    let played = 0;
    let win = 0;
    let draw = 0;
    let loss = 0;

    // 매치 데이터 조회
    const matchesUrl = `https://fconline.nexon.com/datacenter/rank_list?n4pageno=1&n4mode=0&strSearch=${encodeURIComponent(nickname)}`;
    const matchesData = await fetchWithRetry(matchesUrl);

    // 매치 데이터 파싱
    const matches = matchesData.matches || [];
    
    for (const match of matches) {
      const matchDate = new Date(match.date);
      
      // 날짜가 일치하는 경기만 처리
      if (
        matchDate.getFullYear() === targetDate.getFullYear() &&
        matchDate.getMonth() === targetDate.getMonth() &&
        matchDate.getDate() === targetDate.getDate()
      ) {
        played++;
        
        switch (match.result) {
          case '승':
            win++;
            break;
          case '무':
            draw++;
            break;
          case '패':
            loss++;
            break;
        }
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
    return NextResponse.json(
      { error: '데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 