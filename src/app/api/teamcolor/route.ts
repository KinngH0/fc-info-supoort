// 📄 /src/app/api/teamcolor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';

// 캐시 설정
const CACHE_DURATION = 60 * 60 * 1000; // 1시간
const cache = new Map<string, { data: any; timestamp: number }>();

// 병렬 처리를 위한 배치 크기
const BATCH_SIZE = 5;

interface TeamColorData {
  count: number;
  totalValue: number;
  totalRank: number;
  totalScore: number;
  maxValue: { value: number; nickname: string; display: string };
  minValue: { value: number; nickname: string; display: string };
  formations: Map<string, number>;
  users: string[];
}

// 페이지 데이터 가져오기
async function fetchPage(page: number): Promise<any[]> {
  try {
    const res = await axios.get(
      `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
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
      const valueRaw = tr.querySelector('.rank_coach .price')?.getAttribute('title') || '0';
      const formation = tr.querySelector('.td.formation')?.textContent?.trim() || '';
      const rankText = tr.querySelector('.rank_no')?.textContent?.trim() || '0';
      const scoreText = tr.querySelector('.td.rank_r_win_point')?.textContent?.trim() || '0';

      return {
        nickname,
        teamColor,
        value: parseInt(valueRaw.replace(/,/g, ''), 10) || 0,
        rank: parseInt(rankText, 10) || 0,
        score: parseInt(scoreText, 10) || 0,
        formation,
      };
    });
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    return [];
  }
}

// 병렬로 페이지 데이터 가져오기
async function fetchPages(startPage: number, endPage: number): Promise<any[]> {
  const pages = [];
  for (let i = startPage; i <= endPage; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && i + j <= endPage; j++) {
      batch.push(fetchPage(i + j));
    }
    const results = await Promise.all(batch);
    pages.push(...results.flat());
    
    // 크롤링 간격 조절
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return pages;
}

// 팀컬러별 데이터 처리
function processTeamColorData(users: any[], topN: number) {
  const teamColors = new Map<string, TeamColorData>();

  // 팀컬러별 데이터 수집
  users.forEach(user => {
    if (!user.teamColor) return;

    if (!teamColors.has(user.teamColor)) {
      teamColors.set(user.teamColor, {
        count: 0,
        totalValue: 0,
        totalRank: 0,
        totalScore: 0,
        maxValue: { value: 0, nickname: '', display: '' },
        minValue: { value: Infinity, nickname: '', display: '' },
        formations: new Map<string, number>(),
        users: [],
      });
    }

    const data = teamColors.get(user.teamColor)!;
    data.count++;
    data.totalValue += user.value;
    data.totalRank += user.rank;
    data.totalScore += user.score;
    data.users.push(user.nickname);

    // 최대/최소 가치 업데이트
    if (user.value > data.maxValue.value) {
      data.maxValue = {
        value: user.value,
        nickname: user.nickname,
        display: formatValue(user.value),
      };
    }
    if (user.value < data.minValue.value) {
      data.minValue = {
        value: user.value,
        nickname: user.nickname,
        display: formatValue(user.value),
      };
    }

    // 포메이션 카운트
    if (user.formation) {
      data.formations.set(
        user.formation,
        (data.formations.get(user.formation) || 0) + 1
      );
    }
  });

  // 결과 정렬 및 포맷팅
  const result = Array.from(teamColors.entries())
    .map(([teamColor, data]) => ({
      teamColor,
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

  return result;
}

// 숫자 포맷팅 (예: 1000000 -> 1,000,000)
function formatValue(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export async function POST(req: NextRequest) {
  try {
    const { rankLimit, topN } = await req.json();

    // 캐시 키 생성
    const cacheKey = `teamcolor-${rankLimit}-${topN}`;
    const now = Date.now();

    // 캐시된 데이터 확인
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // 총 페이지 수 계산
    const totalPages = Math.ceil(rankLimit / 20);

    // 병렬로 데이터 가져오기
    const allUsers = await fetchPages(1, totalPages);
    const limitedUsers = allUsers.slice(0, rankLimit);

    // 팀컬러별 데이터 처리
    const result = processTeamColorData(limitedUsers, topN);

    // 결과 캐싱
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  if (!jobId || !jobStore.has(jobId)) {
    return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
  }

  const result = jobStore.get(jobId);
  return NextResponse.json(result);
}