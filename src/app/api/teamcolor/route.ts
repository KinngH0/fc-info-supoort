// 📄 /src/app/api/teamcolor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

// 캐시 설정 개선
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3시간
const cache = new Map<string, { data: any; timestamp: number; etag?: string }>();
const pageCache = new Map<string, { data: any[]; timestamp: number; etag?: string }>();

// 병렬 처리 최적화
const BATCH_SIZE = 50;
const RETRY_DELAY = 500;
const MAX_RETRIES = 3;

interface TeamColorData {
  count: number;
  totalValue: number;
  totalRank: number;
  totalScore: number;
  maxValue: { value: number; nickname: string; display: string; rank: number };
  minValue: { value: number; nickname: string; display: string; rank: number };
  formations: Map<string, number>;
  users: string[];
  displayTeamColor: string;
}

// HTTP 요청 최적화
const axiosInstance = axios.create({
  timeout: 20000,
  httpAgent: new HttpAgent({ 
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 60000
  }),
  httpsAgent: new HttpsAgent({ 
    keepAlive: true, 
    rejectUnauthorized: false,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 60000
  }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }
});

// 페이지 캐시 확인 개선
function getPageFromCache(page: number): any[] | null {
  const key = `page-${page}`;
  const cached = pageCache.get(key);
  const now = Date.now();
  
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for page ${page}`);
    return cached.data;
  }
  
  return null;
}

// 페이지 캐시 저장 개선
function setPageCache(page: number, data: any[], etag?: string) {
  const key = `page-${page}`;
  pageCache.set(key, { data, timestamp: Date.now(), etag });
}

// 재시도 로직이 포함된 페이지 데이터 가져오기 최적화
async function fetchPageWithRetry(page: number, retries = 0): Promise<any[]> {
  const cachedData = getPageFromCache(page);
  if (cachedData) {
    return cachedData;
  }

  try {
    const url = `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`;
    console.log(`Fetching page ${page}: ${url}`);
    
    const res = await axiosInstance.get(url);
    const etag = res.headers['etag'];
    
    if (!res.data || typeof res.data !== 'string') {
      console.error(`Invalid response data for page ${page}:`, res.data);
      throw new Error('Invalid response data');
    }

    const dom = new JSDOM(res.data);
    const document = dom.window.document;
    
    const rows = document.querySelectorAll('.tbody .tr');
    
    if (!rows || rows.length === 0) {
      console.error(`No rows found for page ${page}`);
      throw new Error('No data found');
    }

    const result = Array.from(rows).map((tr: Element) => {
      const nickname = tr.querySelector('.rank_coach .name')?.textContent?.trim() || '';
      const teamColorElement = tr.querySelector('.td.team_color .name .inner') || tr.querySelector('.td.team_color .name');
      const teamColor = teamColorElement?.textContent?.replace(/\(.*?\)/g, '').trim() || '';
      const valueElement = tr.querySelector('.td.value');
      const valueRaw = valueElement?.textContent?.trim().replace(/[^0-9]/g, '') || '0';
      const formation = tr.querySelector('.td.formation')?.textContent?.trim() || '';
      const rankText = tr.querySelector('.rank_no')?.textContent?.trim() || '0';
      const scoreText = tr.querySelector('.td.rank_r_win_point')?.textContent?.trim() || '0';

      if (!nickname || !teamColor) {
        console.warn(`Missing data for row in page ${page}:`, { nickname, teamColor });
      }

      return {
        nickname,
        teamColor,
        value: parseInt(valueRaw, 10) || 0,
        rank: parseInt(rankText, 10) || 0,
        score: parseInt(scoreText, 10) || 0,
        formation,
      };
    });

    if (result.length > 0) {
      setPageCache(page, result, etag);
    }
    
    return result;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    
    if (retries < MAX_RETRIES) {
      console.log(`Retrying page ${page}, attempt ${retries + 1}/${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return fetchPageWithRetry(page, retries + 1);
    }
    
    console.error(`Failed to fetch page ${page} after ${MAX_RETRIES} retries`);
    return [];
  }
}

// 병렬로 페이지 데이터 가져오기 최적화
async function fetchPages(startPage: number, endPage: number): Promise<any[]> {
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  const results = new Array(pageNumbers.length * 20); // 예상 크기로 배열 초기화
  let resultIndex = 0;
  
  for (let i = 0; i < pageNumbers.length; i += BATCH_SIZE) {
    const batch = pageNumbers.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, pages ${batch[0]}-${batch[batch.length - 1]}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(page => fetchPageWithRetry(page))
    );
    
    const validResults = batchResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .map(r => r.value)
      .flat();
    
    if (validResults.length === 0) {
      console.warn(`No valid results in batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }
    
    // 결과 배열에 직접 할당
    for (const result of validResults) {
      results[resultIndex++] = result;
    }

    if (i + BATCH_SIZE < pageNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // 메모리 최적화를 위한 가비지 컬렉션 유도
    if (i % (BATCH_SIZE * 2) === 0) {
      global.gc && global.gc();
    }
  }
  
  // 실제 데이터가 있는 부분만 반환
  return results.slice(0, resultIndex).filter(Boolean);
}

// 팀컬러 문자열 정규화 함수
function normalizeTeamColor(color: string): string {
  return color
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFC');
}

// 값 포맷팅 함수
function formatValue(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 팀컬러 데이터 처리 최적화
function processTeamColorData(users: any[], topN: number) {
  const teamColors = new Map<string, TeamColorData>();
  const chunkSize = 2000; // 청크 사이즈 증가
  const preProcessedUsers = users.filter(user => user.teamColor); // 사전 필터링

  for (let i = 0; i < preProcessedUsers.length; i += chunkSize) {
    const chunk = preProcessedUsers.slice(i, i + chunkSize);
    
    for (const user of chunk) {
      const normalizedTeamColor = normalizeTeamColor(user.teamColor);
      const displayTeamColor = user.teamColor.trim();

      if (!teamColors.has(normalizedTeamColor)) {
        teamColors.set(normalizedTeamColor, {
          count: 0,
          totalValue: 0,
          totalRank: 0,
          totalScore: 0,
          maxValue: { value: 0, nickname: '', display: '', rank: Infinity },
          minValue: { value: Infinity, nickname: '', display: '', rank: Infinity },
          formations: new Map<string, number>(),
          users: [],
          displayTeamColor,
        });
      }

      const data = teamColors.get(normalizedTeamColor)!;
      data.count++;
      data.totalValue += user.value;
      data.totalRank += user.rank;
      data.totalScore += user.score;
      data.users.push(user.nickname);

      if (user.rank < data.maxValue.rank) {
        data.maxValue = {
          value: user.value,
          nickname: user.nickname,
          display: formatValue(user.value),
          rank: user.rank,
        };
      }

      if (user.value < data.minValue.value) {
        data.minValue = {
          value: user.value,
          nickname: user.nickname,
          display: formatValue(user.value),
          rank: user.rank,
        };
      }

      if (user.formation) {
        data.formations.set(
          user.formation,
          (data.formations.get(user.formation) || 0) + 1
        );
      }
    }

    // 청크 처리 후 메모리 정리
    if (i % (chunkSize * 2) === 0) {
      global.gc && global.gc();
    }
  }

  // 결과 정렬 및 포맷팅 최적화
  return Array.from(teamColors.entries())
    .map(([, data]) => ({
      teamColor: data.displayTeamColor,
      count: data.count,
      percentage: ((data.count / preProcessedUsers.length) * 100).toFixed(1),
      averageValue: formatValue(Math.round(data.totalValue / data.count)),
      avgRank: Math.round(data.totalRank / data.count),
      avgScore: Math.round(data.totalScore / data.count),
      maxValue: data.maxValue,
      minValue: data.minValue,
      topFormations: Array.from(data.formations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([form, count]) => ({
          form,
          percent: `${((count / data.count) * 100).toFixed(1)}%`,
        })),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export async function POST(req: NextRequest) {
  try {
    const { rankLimit, topN } = await req.json();
    const cacheKey = `teamcolor-${rankLimit}-${topN}`;
    const now = Date.now();

    // 캐시 확인
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log('Cache hit for request');
      return NextResponse.json(cached.data);
    }

    const totalPages = Math.ceil(rankLimit / 20);
    console.log(`Starting to fetch ${totalPages} pages for rankLimit ${rankLimit}`);
    
    const allUsers = await fetchPages(1, totalPages);
    
    if (!allUsers || allUsers.length === 0) {
      console.error('No users data fetched');
      throw new Error('데이터를 가져오는데 실패했습니다.');
    }
    
    console.log(`Fetched ${allUsers.length} users`);
    
    const limitedUsers = allUsers.slice(0, rankLimit);
    const result = processTeamColorData(limitedUsers, topN);

    if (result.length > 0) {
      cache.set(cacheKey, { data: result, timestamp: now });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in teamcolor API:', error);
    return NextResponse.json(
      { error: error.message || '데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}