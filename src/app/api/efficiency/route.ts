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
  // "2024-03-19 12:34" 형식의 문자열을 Date 객체로 변환
  const [date, time] = dateStr.split(' ');
  return new Date(date + 'T' + time);
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
      // 매치 데이터 조회
      const matchesUrl = `https://fconline.nexon.com/datacenter/rank?n4pageno=${page}&n4mode=0&strSearch=${encodeURIComponent(nickname)}`;
      const html = await fetchWithRetry(matchesUrl);
      
      const $ = cheerio.load(html);
      let foundMatchesOnPage = false;
      
      // 매치 데이터 파싱
      $('.record_lst .tr').each((_, element) => {
        const dateText = $(element).find('.date').text().trim();
        const resultText = $(element).find('.result').text().trim();
        
        if (dateText && resultText) {
          const matchDate = parseDate(dateText);
          
          if (isSameDay(matchDate, targetDate)) {
            foundMatchesOnPage = true;
            played++;
            
            if (resultText.includes('승')) {
              win++;
            } else if (resultText.includes('무')) {
              draw++;
            } else if (resultText.includes('패')) {
              loss++;
            }
          } else if (matchDate < targetDate) {
            shouldContinue = false;
            return false; // break the .each() loop
          }
        }
      });

      if (!foundMatchesOnPage && !shouldContinue) {
        break;
      }
      
      page++;
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