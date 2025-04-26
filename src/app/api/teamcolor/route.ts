// 📄 /src/app/api/teamcolor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

// 캐시 설정 (2시간으로 증가)
const CACHE_DURATION = 2 * 60 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

// 병렬 처리를 위한 배치 크기 대폭 증가
const BATCH_SIZE = 30;

// 재시도 설정
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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

// axios 인스턴스 생성 및 최적화
const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
  },
  timeout: 30000, // 30초로 증가
  httpAgent: new HttpAgent({ keepAlive: true }),
  httpsAgent: new HttpsAgent({ keepAlive: true })
});

// 재시도 로직이 포함된 페이지 데이터 가져오기
async function fetchPageWithRetry(page: number, retries = 0): Promise<any[]> {
  try {
    const res = await axiosInstance.get(
      `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`
    );

      const dom = new JSDOM(res.data);
    const document = dom.window.document;
    const rows = Array.from(document.querySelectorAll('.tbody .tr'));

    return rows.map((tr) => {
        const nickname = tr.querySelector('.rank_coach .name')?.textContent?.trim() || '';
      const teamColor = tr
        .querySelector('.td.team_color .name .inner')
        ?.textContent?.replace(/\(.*?\)/g, '')
        .trim() || '';
        const valueRaw = tr.querySelector('.td.value')?.textContent?.trim().replace(/[^0-9]/g, '') || '0';
        const formation = tr.querySelector('.td.formation')?.textContent?.trim() || '';
        const rankText = tr.querySelector('.rank_no')?.textContent?.trim() || '0';
        const scoreText = tr.querySelector('.td.rank_r_win_point')?.textContent?.trim() || '0';

      return {
          nickname,
          teamColor,
        value: parseInt(valueRaw, 10) || 0,
        rank: parseInt(rankText, 10) || 0,
        score: parseInt(scoreText, 10) || 0,
          formation,
      };
      });
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchPageWithRetry(page, retries + 1);
    }
    console.error(`Failed to fetch page ${page} after ${MAX_RETRIES} retries:`, error);
    return [];
  }
}

// 병렬로 페이지 데이터 가져오기 (최적화)
async function fetchPages(startPage: number, endPage: number): Promise<any[]> {
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  const results = [];
  for (let i = 0; i < pageNumbers.length; i += BATCH_SIZE) {
    const batch = pageNumbers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(page => fetchPageWithRetry(page))
    );
    results.push(
      ...batchResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any[]>).value)
        .flat()
    );
    // 실패한 요청은 무시하고, 딜레이 최소화
    if (i + BATCH_SIZE < pageNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return results;
}

// 팀컬러 문자열 정규화 함수
function normalizeTeamColor(color: string): string {
  return color
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFC');
}

// 팀컬러별 데이터 처리 (메모리 최적화)
function processTeamColorData(users: any[], topN: number) {
  const teamColors = new Map<string, TeamColorData>();

  // 팀컬러별 데이터 수집
  for (const user of users) {
    if (!user.teamColor) continue;

    const normalizedTeamColor = normalizeTeamColor(user.teamColor);
    const displayTeamColor = user.teamColor.trim(); // 표시용 원본 팀컬러

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
        displayTeamColor, // 원본 팀컬러 저장
      });
    }

    const data = teamColors.get(normalizedTeamColor)!;
    data.count++;
    data.totalValue += user.value;
    data.totalRank += user.rank;
    data.totalScore += user.score;
    data.users.push(user.nickname);

    // 랭킹이 더 높은(숫자가 더 낮은) 유저를 최고 랭커로 설정
    if (user.rank < (data.maxValue.rank ?? Infinity)) {
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

  // 결과 정렬 및 포맷팅 (메모리 최적화)
  return Array.from(teamColors.entries())
    .map(([, data]) => ({
      teamColor: data.displayTeamColor,
      count: data.count,
      percentage: ((data.count / users.length) * 100).toFixed(1),
      averageValue: formatValue(Math.round(data.totalValue / data.count)),
      avgRank: Math.round(data.totalRank / data.count),
      avgScore: Math.round(data.totalScore / data.count),
      maxValue: data.maxValue,
      minValue: data.minValue,
      topFormations: Array.from(data.formations.entries())
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([form, count]) => ({
          form,
          percent: `${((count / data.count) * 100).toFixed(1)}%`,
        })),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

function formatValue(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export async function POST(req: NextRequest) {
  try {
    const { rankLimit, topN } = await req.json();

    const cacheKey = `teamcolor-${rankLimit}-${topN}`;
    const now = Date.now();

    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    const totalPages = Math.ceil(rankLimit / 20);
    const allUsers = await fetchPages(1, totalPages);
    const limitedUsers = allUsers.slice(0, rankLimit);
    const result = processTeamColorData(limitedUsers, topN);

    cache.set(cacheKey, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in teamcolor API:', error);
    return NextResponse.json(
      { error: error.message || '데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}