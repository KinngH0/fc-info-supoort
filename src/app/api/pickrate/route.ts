// 📄 /src/app/api/pickrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios, { AxiosError } from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { TopRanker, TeamValueStat } from '@/types/pickrate';
import axiosRetry from 'axios-retry';

const agent = new https.Agent({ rejectUnauthorized: false });
const jobs: Record<string, any> = {};

// 팀 컬러 리스트
const TEAM_COLORS = [
  '1. FC 우니온 베를린',
  '1. FC 쾰른',
  '1. FSV 마인츠 05',
  '19 New Generation',
  '19 UEFA Champions League',
  '20 K LEAGUE BEST',
  '20 New Generation',
  '20 UEFA Champions League',
  '21 K LEAGUE BEST',
  '21 KFA',
  '21 NEW GENERATION',
  '21 UEFA Champions League',
  '22 K LEAGUE BEST',
  '22 KFA',
  '22 New Generation',
  '22 UEFA Champions League',
  '23 Hard Worker',
  '23 K LEAGUE BEST',
  '23 New Generation',
  '24 Energetic Player',
  'AC밀란',
  'AS 로마',
  'AS 모나코',
  'AS 생테티엔',
  'Back to Back',
  'Ballon d\'Or',
  'Best of Europe 21',
  'Best of World Cup',
  'Captain',
  'Century Club',
  'Champions of Europe',
  'Competitors Of Continents',
  'Decade',
  'European Best Stars',
  'FC Ambassador',
  'FC 낭트',
  'FC 로리앙',
  'FC 메스',
  'FC 바르셀로나',
  'FC 바젤 1893',
  'FC 샬케 04',
  'FC 서울',
  'FC 아우크스부르크',
  'FC 안양',
  'FC 코펜하겐',
  'FC 포르투',
  'Free Agent',
  'Golden Rookies',
  'Greatest Runner-Ups',
  'Heroes Of the Team',
  'Home Grown',
  'ICON',
  'ICON The Moment',
  'Journeyman',
  'KRC 겡크',
  'LA 갤럭시',
  'Legend of the Loan',
  'Legendary Numbers',
  'LOSC 릴',
  'Loyal Heroes',
  'Man City Icon',
  'Medalist',
  'Moments of Glory',
  'Multi-League Champions',
  'National Hero Debut',
  'Nostalgia',
  'OGC 니스',
  'PSV',
  'RB 라이프치히',
  'RC 랑스',
  'RCD 마요르카',
  'RCD 에스파뇰',
  'Returnees',
  'SC 프라이부르크',
  'SD 에이바르',
  'SD 우에스카',
  'SL 벤피카',
  'Spotlight',
  'SSC 나폴리',
  'Team K League',
  'Team Korea Icon',
  'Top Transfer',
  'Tournament Best',
  'Tournament Champions',
  'TSG 호펜하임',
  'UEFA EURO 2024',
  'Unexpected Transfer',
  'Unsung Players',
  'Veteran',
  'VfB 슈투트가르트',
  'VfL 볼프스부르크',
  'World Cup 2022',
  '가나',
  '갈라타사라이',
  '강원 FC',
  '경남 FC',
  '광저우 R&F FC',
  '광저우 에버그란데 타오바오',
  '광주 FC',
  '그라나다 CF',
  '그리스',
  '김천 상무',
  '나이지리아',
  '남아프리카공화국',
  '네덜란드',
  '노르웨이',
  '뉴캐슬 유나이티드',
  '님 올랭피크',
  '대구 FC',
  '대한민국',
  '대전 하나 시티즌',
  '덴마크',
  '데포르티보 알라베스',
  '독일',
  '디나모 자그레브',
  '디나모 키이우',
  '디종 FCO',
  '라티움',
  '레드불 잘츠부르크',
  '레반테 UD',
  '레스터 시티',
  '레알 마드리드',
  '레알 바야돌리드',
  '레알 베티스',
  '레알 소시에다드',
  '레인저스',
  '롬바르디아 FC',
  '리버풀',
  '리즈 유나이티드',
  '맨체스터 시티',
  '맨체스터 유나이티드',
  '멕시코',
  '모로코',
  '몽펠리에 HSC',
  '미국',
  '미들즈브러',
  '밀라노 FC',
  '바샥셰히르',
  '바이에른 뮌헨',
  '바이엘 04 레버쿠젠',
  '발렌시아 CF',
  '벨기에',
  '번리',
  '베네벤토',
  '베르가모 칼초',
  '베르더 브레멘',
  '보루시아 도르트문트',
  '보루시아 묀헨글라트바흐',
  '볼로냐',
  '북마케도니아',
  '북아일랜드',
  '부산 아이파크',
  '부천 FC 1995',
  '브라이턴 호브 앨비언',
  '브라질',
  '블랙번 로버스',
  '비야레알 CF',
  '사수올로',
  '사우디아라비아',
  '사우샘프턴',
  '산둥 타이산',
  '삼프도리아',
  '상하이 선화',
  '상하이 하이강',
  '샤흐타르 도네츠크',
  '서울 이랜드',
  '세네갈',
  '세르비아',
  '성남 FC',
  '세비야 FC',
  '셀타 비고',
  '셀틱',
  '셰필드 유나이티드',
  '수원 FC',
  '수원 삼성 블루윙즈',
  '스웨덴',
  '스위스',
  '스코틀랜드',
  '스타드 랭스',
  '스타드 렌',
  '스타드 브레스트 29',
  '스토크 시티',
  '스트라스부르 알자스',
  '스파르타 프라하',
  '스페인',
  '스페치아',
  '스포르팅 CP',
  '슬로바키아',
  '슬로베니아',
  '아르미니아 빌레펠트',
  '아르헨티나',
  '아스널',
  '아약스',
  '아이슬란드',
  '아인트라흐트 프랑크푸르트',
  '아틀레티코 마드리드',
  '아틀레틱 빌바오',
  '알제리',
  '안산 그리너스 FC',
  '앙제 SCO',
  '애스턴 빌라',
  '에버턴',
  '에콰도르',
  '엘라스 베로나',
  '엘체 CF',
  '오사수나',
  '오스트리아',
  '올랭피크 리옹',
  '올랭피크 마르세유',
  '왓퍼드',
  '우디네세',
  '우루과이',
  '우크라이나',
  '울버햄프턴 원더러스',
  '울산 현대',
  '웨스트 브로미치 앨비언',
  '웨스트 햄 유나이티드',
  '웨일스',
  '유벤투스',
  '이란',
  '이집트',
  '이탈리아',
  '인천 유나이티드',
  '일본',
  '잉글랜드',
  '전남 드래곤즈',
  '전북 현대 모터스',
  '제노아',
  '제주 유나이티드',
  '중국',
  '지롱댕 보르도',
  '체코',
  '첼시',
  '칠레',
  '카디스 CF',
  '카메룬',
  '칼리아리',
  '코스타리카',
  '코트디부아르',
  '콜롬비아',
  '크로아티아',
  '크리스털 팰리스',
  '톈진 진먼후',
  '토리노',
  '토트넘 홋스퍼',
  '튀니지',
  '튀르키예',
  '파라과이',
  '파르마',
  '파리 생제르맹',
  '페루',
  '페예노르트',
  '포르투갈',
  '포항 스틸러스',
  '폴란드',
  '프랑스',
  '풀럼',
  '피오렌티나',
  '핀란드',
  '함부르크 SV',
  '헝가리',
  '헤르타 BSC',
  '헤타페 CF',
  '호주'
];

// 메타데이터 캐시
let metaDataCache: {
  spidMap: Record<string, string>;
  seasonMap: Record<string, string>;
  positionMap: Record<string, string>;
} | null = null;

// 유저 OUID 캐시
const ouidCache: Record<string, { ouid: string; timestamp: number }> = {};

// 매치 데이터 캐시
const matchCache: Record<string, { data: any; timestamp: number }> = {};

// 메모리 캐시 개선
const cache: Record<string, { data: any; timestamp: number }> = {};

// 캐시 유효성 검사 함수
function isValidCache(key: string): boolean {
  const cached = cache[key];
  if (!cached) return false;
  
  const now = Date.now();
  // 1시간(3600000ms) 이내의 캐시만 유효
  return (now - cached.timestamp) < 3600000;
}

// 캐시 저장 함수
function setCache(key: string, data: any): void {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}

// 캐시 조회 함수
function getCache(key: string): any | null {
  if (!isValidCache(key)) {
    delete cache[key]; // 만료된 캐시 삭제
    return null;
  }
  return cache[key].data;
}

// 메타데이터 로드 함수
async function loadMetaData() {
  if (metaDataCache) return metaDataCache;

  const headers = { 'x-nxopen-api-key': process.env.FC_API_KEY! };
  const [spidData, seasonData, positionData] = await Promise.all([
    axios.get('https://open.api.nexon.com/static/fconline/meta/spid.json', { headers, httpsAgent: agent }),
    axios.get('https://open.api.nexon.com/static/fconline/meta/seasonid.json', { headers, httpsAgent: agent }),
    axios.get('https://open.api.nexon.com/static/fconline/meta/spposition.json', { headers, httpsAgent: agent })
  ]);

  metaDataCache = {
    spidMap: Object.fromEntries(spidData.data.map((item: any) => [item.id, item.name])),
    seasonMap: Object.fromEntries(seasonData.data.map((item: any) => [item.seasonId, item.className.split('(')[0].trim()])),
    positionMap: Object.fromEntries(positionData.data.map((item: any) => [item.spposition, item.desc]))
  };

  return metaDataCache;
}

// Axios 인스턴스 생성 및 재시도 설정
const axiosWithRetry = axios.create();
axiosRetry(axiosWithRetry, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: AxiosError) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

// 통계 수집을 위한 변수들
const formations: { [key: string]: number } = {};
const maxTeamValue = { nickname: '', value: 0 };
const minTeamValue = { nickname: '', value: Number.MAX_SAFE_INTEGER };
let topRanker: { nickname: string; rank: number; formation: string; teamValue: number } | null = null;
const rankedUsers: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const jobId = uuidv4();
    const { rankLimit, teamColor, topN } = await req.json();
    
    // 입력값 검증 추가
    if (!rankLimit || !teamColor || !topN) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 팀 컬러 유효성 검사 추가
    const normalizedTeamColor = teamColor.toLowerCase();
    if (normalizedTeamColor !== 'all' && 
        !TEAM_COLORS.some(tc => tc.toLowerCase() === normalizedTeamColor)) {
      return NextResponse.json(
        { error: '유효하지 않은 팀 컬러입니다. "all"을 입력하거나 유효한 팀 컬러를 선택해 주세요.', validTeamColors: TEAM_COLORS },
        { status: 400 }
      );
    }

    jobs[jobId] = { 
      status: 'processing', 
      progress: 0,
      startTime: Date.now(),
      lastUpdate: Date.now()
    };

    // 비동기 작업 시작
    processJob(jobId, rankLimit, teamColor, topN).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      jobs[jobId] = { 
        status: 'error', 
        error: error.message || '처리 중 오류가 발생했습니다.',
        progress: 0 
      };
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '요청을 처리하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      // 팀 컬러 목록 반환
      return NextResponse.json({ teamColors: TEAM_COLORS });
    }

    const job = jobs[jobId];
    if (!job) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 진행 상황 업데이트 로직 개선
    if (job.status === 'processing') {
      const now = Date.now();
      // 30초 이상 업데이트가 없으면 오류로 처리
      if (now - job.lastUpdate > 30000) {
        job.status = 'error';
        job.error = '처리 시간이 초과되었습니다.';
        job.progress = 0;
      }
    }

    if (job.status === 'done') {
      // 작업 완료 후 정리
      setTimeout(() => {
        delete jobs[jobId];
      }, 300000); // 5분 후 제거
      return NextResponse.json({ done: true, result: job.result, progress: 100 });
    }

    if (job.status === 'error') {
      return NextResponse.json(
        { error: job.error || '처리 중 오류가 발생했습니다.', progress: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: job.status,
      progress: job.progress || 0,
      startTime: job.startTime
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function fetchUserOuid(nickname: string, headers: any) {
  const cachedData = ouidCache[nickname];
  const now = Date.now();
  
  if (cachedData && (now - cachedData.timestamp) < 24 * 60 * 60 * 1000) {
    return cachedData.ouid;
  }

  try {
    const ouidRes = await axios.get('https://open.api.nexon.com/fconline/v1/id', {
      params: { nickname },
      headers,
      httpsAgent: agent
    });
    const ouid = ouidRes.data.ouid;
    if (ouid) {
      ouidCache[nickname] = { ouid, timestamp: now };
    }
    return ouid;
  } catch (e) {
    console.warn(`OUID 조회 실패: ${nickname}`, e);
    return null;
  }
}

async function fetchUserMatchData(user: { nickname: string; rank: number }, headers: any) {
  try {
    const ouid = await fetchUserOuid(user.nickname, headers);
    if (!ouid) return null;

    // 캐시된 매치 데이터 확인
    const cacheKey = `${user.nickname}-${ouid}`;
    const cachedMatch = matchCache[cacheKey];
    const now = Date.now();

    // 1시간 이내의 캐시된 데이터가 있으면 재사용
    if (cachedMatch && (now - cachedMatch.timestamp) < 60 * 60 * 1000) {
      return cachedMatch.data;
    }

    const matchListRes = await axios.get('https://open.api.nexon.com/fconline/v1/user/match', {
      params: { matchtype: 52, ouid, offset: 0, limit: 1 },
      headers,
      httpsAgent: agent
    });
    const matchId = matchListRes.data[0];
    if (!matchId) return null;

    const matchDetailRes = await axios.get('https://open.api.nexon.com/fconline/v1/match-detail', {
      params: { matchid: matchId },
      headers,
      httpsAgent: agent
    });

    const result = { matchDetail: matchDetailRes.data, ouid };
    matchCache[cacheKey] = { data: result, timestamp: now };
    return result;
  } catch (e) {
    console.warn(`매치 데이터 조회 실패: ${user.nickname}`, e);
    return null;
  }
}

async function processJob(jobId: string, rankLimit: number, teamColor: string, topN: number) {
  try {
    const updateProgress = (progress: number, message: string) => {
      if (jobs[jobId]) {
        jobs[jobId].progress = Math.min(99, progress);
        jobs[jobId].message = message;
        jobs[jobId].lastUpdate = Date.now();
      }
    };

    const cacheKey = `pickrate-${rankLimit}-${teamColor}-${topN}`;
    const cachedResult = getCache(cacheKey);
    
    if (cachedResult) {
      jobs[jobId] = {
        status: 'done',
        result: cachedResult,
        progress: 100,
        lastUpdate: Date.now()
      };
      return;
    }

    updateProgress(0, '데이터 수집 준비 중...');

    const normalizedFilter = teamColor.replace(/\s/g, '').toLowerCase();
    const headers = { 'x-nxopen-api-key': process.env.FC_API_KEY! };
    
    const metaData = await loadMetaData();
    updateProgress(5, '메타데이터 로드 완료');

    const pages = Math.ceil(rankLimit / 20);
    const rankedUsers: { nickname: string; rank: number; formation?: string; teamValue?: number }[] = [];
    const BATCH_SIZE = 500;
    
    // 랭킹 데이터 수집 최적화
    const fetchRankingBatch = async (startPage: number, endPage: number) => {
      const promises = [];
      for (let page = startPage; page <= endPage; page++) {
        promises.push(
          axiosWithRetry.get(`https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`)
            .then(res => {
              const dom = new JSDOM(res.data);
              const trs = dom.window.document.querySelectorAll('.tbody .tr');
              return Array.from(trs).map((tr: any, idx: number) => {
                const nickname = tr.querySelector('.name .link')?.textContent?.trim() || '';
                const formation = tr.querySelector('.formation')?.textContent?.trim() || '';
                const teamValue = parseInt(tr.querySelector('.value')?.textContent?.replace(/[^0-9]/g, '') || '0');
                const rank = (page - 1) * 20 + idx + 1;

                // 포메이션 통계 수집
                if (formation) {
                  formations[formation] = (formations[formation] || 0) + 1;
                }

                // 구단가치 통계 수집
                if (teamValue > 0) {
                  maxTeamValue.value = Math.max(maxTeamValue.value, teamValue);
                  minTeamValue.value = Math.min(minTeamValue.value, teamValue);
                }

                // 최고 랭커 정보 저장
                if (!topRanker || rank < topRanker.rank) {
                  topRanker = { nickname, rank, formation, teamValue };
                }

                return { nickname, rank, formation, teamValue };
              });
            })
            .catch(e => {
              console.warn(`페이지 ${page} 오류:`, e.message);
              return [];
            })
        );
      }
      return (await Promise.all(promises)).flat();
    };

    // 병렬로 랭킹 데이터 수집
    const batchPromises = [];
    for (let i = 0; i < pages; i += BATCH_SIZE) {
      const startPage = i + 1;
      const endPage = Math.min(i + BATCH_SIZE, pages);
      batchPromises.push(fetchRankingBatch(startPage, endPage));
    }

    const batchResults = await Promise.all(batchPromises);
    rankedUsers.push(...batchResults.flat());
    updateProgress(35, '랭킹 데이터 수집 완료');

    // 매치 데이터 수집 최적화
    const CONCURRENT_REQUESTS = 20;
    const processUserBatch = async (users: typeof rankedUsers) => {
      const results: any[] = [];
      const processedUsers = new Set<string>();

      for (let i = 0; i < users.length; i += CONCURRENT_REQUESTS) {
        const batch = users.slice(i, i + CONCURRENT_REQUESTS);
        const batchPromises = batch
          .filter(user => !processedUsers.has(user.nickname))
          .map(async user => {
            processedUsers.add(user.nickname);
            try {
              const ouid = await fetchUserOuid(user.nickname, headers);
              if (!ouid) return null;

              const matchListRes = await axiosWithRetry.get('https://open.api.nexon.com/fconline/v1/user/match', {
                params: { matchtype: 52, ouid, offset: 0, limit: 1 },
                headers
              });

              if (!matchListRes.data?.[0]) return null;

              const matchDetailRes = await axiosWithRetry.get('https://open.api.nexon.com/fconline/v1/match-detail', {
                params: { matchid: matchListRes.data[0] },
                headers
              });

              return { matchDetail: matchDetailRes.data, ouid, user };
            } catch (e) {
              console.warn(`매치 데이터 조회 실패: ${user.nickname}`, e);
              return null;
            }
          });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean));

        const progress = 35 + Math.round((i / users.length) * 50);
        updateProgress(progress, `매치 데이터 수집 중 (${i + 1}/${users.length}명)`);
      }

      return results;
    };

    const userMatchResults = await processUserBatch(rankedUsers);
    updateProgress(85, '매치 데이터 처리 중...');

    // 데이터 처리 및 정리 (85-99%)
    updateProgress(85, '데이터 처리 중...');

    // 포지션별 데이터 처리 최적화
    const positionGroups: Record<string, string[]> = {
      'CAM': ['CAM'],
      'RAM, LAM': ['RAM', 'LAM'],
      'RM, LM': ['RM', 'LM'],
      'CM': ['CM', 'LCM', 'RCM'],
      'CDM': ['CDM', 'LDM', 'RDM'],
      'LB': ['LB', 'LWB'],
      'CB': ['CB', 'LCB', 'RCB', 'SW'],
      'RB': ['RB', 'RWB'],
      'GK': ['GK']
    };

    const summary: Record<string, any[]> = {};
    const userSet = new Set(userMatchResults.map((p) => p.nickname));

    // 포지션별 데이터 처리를 병렬로 수행
    await Promise.all(
      Object.entries(positionGroups).map(async ([group, positions]) => {
        const filtered = userMatchResults.filter((p) => positions.includes(p.position));
        const grouped = new Map();

        for (const p of filtered) {
          const key = `${p.name}||${p.season}||${p.grade}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              name: p.name,
              season: p.season,
              grade: p.grade,
              count: 0,
              users: new Set()
            });
          }
          const entry = grouped.get(key);
          entry.count++;
          entry.users.add(p.nickname);
        }

        summary[group] = Array.from(grouped.values())
          .map(v => ({
            ...v,
            users: Array.from(v.users)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, topN);
      })
    );

    // 포메이션 통계 정렬
    const sortedFormations = Object.entries(formations)
      .map(([formation, count]) => ({
        formation,
        count,
        percentage: ((count / rankedUsers.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    // 구단가치 평균 계산
    const averageTeamValue = (maxTeamValue.value + minTeamValue.value) / 2;

    const result = {
      userCount: userSet.size,
      topN,
      summary,
      topRanker,
      formations: sortedFormations,
      teamValue: {
        average: averageTeamValue,
        max: maxTeamValue,
        min: minTeamValue
      }
    };

    // 결과 캐싱 및 완료
    setCache(cacheKey, result);
    updateProgress(99, '데이터 처리 완료');

    jobs[jobId] = {
      status: 'done',
      result,
      progress: 100,
      lastUpdate: Date.now()
    };
  } catch (error: unknown) {
    console.error('Job processing error:', error);
    jobs[jobId] = {
      status: 'error',
      error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.',
      progress: 0,
      lastUpdate: Date.now()
    };
  }
}