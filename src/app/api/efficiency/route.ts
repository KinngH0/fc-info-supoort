import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
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

function parseDate(dateStr: string): Date {
  // "2024-03-19 12:34:56" 형식의 문자열을 Date 객체로 변환
  return new Date(dateStr.replace(' ', 'T'));
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
    let shouldContinue = true;
    let page = 1;

    while (shouldContinue && page <= 10) { // 최대 10페이지까지만 조회
      // 매치 데이터 조회 (공식경기 - 감독모드)
      const matchesUrl = `https://fconline.nexon.com/Profile/MatchRecord?n4pageno=${page}&nickname=${encodeURIComponent(nickname)}&n4mode=0`;
      const html = await fetchWithRetry(matchesUrl);
      
      const $ = cheerio.load(html);
      let foundMatchesOnPage = false;
      
      // 매치 데이터 파싱
      $('.record_table tbody tr').each((_, element) => {
        const $row = $(element);
        const dateText = $row.find('td:nth-child(4)').text().trim();
        const resultText = $row.find('td:nth-child(3)').text().trim();
        
        if (dateText && resultText) {
          try {
            const matchDate = parseDate(dateText);
            
            if (isSameDay(matchDate, targetDate)) {
              foundMatchesOnPage = true;
              played++;
              
              if (resultText === '승') {
                win++;
              } else if (resultText === '무') {
                draw++;
              } else if (resultText === '패') {
                loss++;
              }
            } else if (matchDate < targetDate) {
              shouldContinue = false;
              return false; // break the .each() loop
            }
          } catch (err) {
            console.error('Date parsing error:', err);
          }
        }
      });

      // 더 이상 매치 데이터가 없으면 종료
      if ($('.record_table tbody tr').length === 0) {
        break;
      }

      if (!foundMatchesOnPage && !shouldContinue) {
        break;
      }
      
      page++;
      
      // API 호출 간격 조절
      await new Promise(resolve => setTimeout(resolve, 300));
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