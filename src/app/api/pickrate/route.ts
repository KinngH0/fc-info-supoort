// 📄 /src/app/api/pickrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { TopRanker, TeamValueStat } from '@/types/pickrate';

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

// axios 재시도 로직
const axiosWithRetry = axios.create({
  timeout: 15000,
  httpsAgent: agent
});

axiosWithRetry.interceptors.response.use(null, async (error) => {
  const config = error.config;
  config.retryCount = config.retryCount || 0;
  
  if (config.retryCount >= 3) {
    return Promise.reject(error);
  }
  
  config.retryCount += 1;
  const delay = config.retryCount * 1000; // 재시도마다 1초씩 증가
  await new Promise(resolve => setTimeout(resolve, delay));
  return axiosWithRetry(config);
});

export async function POST(req: NextRequest) {
  try {
    const jobId = uuidv4();
    const { rankLimit, teamColor, topN } = await req.json();
    
    // 입력값 검증
    if (!rankLimit || !teamColor || !topN) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 팀 컬러 유효성 검사
    const normalizedTeamColor = teamColor.toLowerCase();
    if (normalizedTeamColor !== 'all' && 
        !TEAM_COLORS.some(tc => tc.toLowerCase() === normalizedTeamColor)) {
      return NextResponse.json(
        { error: '유효하지 않은 팀 컬러입니다.', validTeamColors: TEAM_COLORS },
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
  const jobId = req.nextUrl.searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({ teamColors: TEAM_COLORS });
  }

  const job = jobs[jobId];
  if (!job) {
    return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(job);
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

    updateProgress(0, '데이터 수집 준비 중...');

    // 1. 랭킹 데이터 수집
    const pages = Math.ceil(rankLimit / 20);
    const rankedUsers: any[] = [];
    
    for (let page = 1; page <= pages; page++) {
      updateProgress(
        Math.round((page / pages) * 30),
        `랭킹 데이터 수집 중 (${page}/${pages})`
      );

      try {
        const res = await axios.get(
          `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`,
          { httpsAgent: agent }
        );

        const dom = new JSDOM(res.data);
        const document = dom.window.document;
        const rows = document.querySelectorAll('.tbody .tr');

        for (const row of rows) {
          const nickname = row.querySelector('.rank_coach .name')?.textContent?.trim() || '';
          const teamColorElement = row.querySelector('.td.team_color .name .inner') || row.querySelector('.td.team_color .name');
          const teamColorText = teamColorElement?.textContent?.replace(/\(.*?\)/g, '').trim() || '';
          const formation = row.querySelector('.td.formation')?.textContent?.trim() || '';
          const rankText = row.querySelector('.rank_no')?.textContent?.trim() || '0';
          const rank = parseInt(rankText, 10);

          // rankLimit이 1인 경우 첫 번째 유저만 확인
          if (rankLimit === 1) {
            if (rank === 1) {
              if (teamColorText.toLowerCase() === teamColor.toLowerCase()) {
                rankedUsers.push({ nickname, teamColor: teamColorText, formation, rank });
              }
              break;
            }
          } else {
            // rankLimit이 1이 아닌 경우 모든 유저를 수집하고 나중에 필터링
            rankedUsers.push({ nickname, teamColor: teamColorText, formation, rank });
          }
        }

        // rankLimit이 1이고 첫 번째 유저를 찾았다면 더 이상 수집하지 않음
        if (rankLimit === 1 && rankedUsers.length > 0) break;
        
        // rankLimit에 도달했다면 수집 중단
        if (rankedUsers.length >= rankLimit) break;

      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        continue;
      }

      // 요청 간 간격 두기
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 2. 팀컬러 필터링
    const filteredUsers = rankedUsers.filter(user => 
      user.teamColor.toLowerCase() === teamColor.toLowerCase()
    );

    // 3. 결과가 없는 경우 처리
    if (filteredUsers.length === 0) {
      jobs[jobId] = {
        status: 'done',
        result: {
          message: rankLimit === 1 ? 
            '1위 유저가 해당 팀컬러를 사용하지 않습니다.' : 
            '해당 팀컬러를 사용하는 유저가 없습니다.',
          users: [],
          summary: {}
        },
        progress: 100,
        lastUpdate: Date.now()
      };
      return;
    }

    // 4. 유저별 매치 데이터 수집
    updateProgress(40, '매치 데이터 수집 중...');
    const matchData: any[] = [];
    
    for (let i = 0; i < filteredUsers.length; i++) {
      const user = filteredUsers[i];
      updateProgress(
        40 + Math.round((i / filteredUsers.length) * 40),
        `매치 데이터 수집 중 (${i + 1}/${filteredUsers.length})`
      );

      try {
        const matchRes = await axios.get(
          `https://fconline.nexon.com/datacenter/rank_match?nickname=${encodeURIComponent(user.nickname)}`,
          { httpsAgent: agent }
        );

        const matchDom = new JSDOM(matchRes.data);
        const matchDoc = matchDom.window.document;
        
        // 여기에 매치 데이터 파싱 로직 추가
        const players = matchDoc.querySelectorAll('.player_data');
        for (const player of players) {
          const position = player.querySelector('.position')?.textContent?.trim() || '';
          const name = player.querySelector('.name')?.textContent?.trim() || '';
          const season = player.querySelector('.season')?.textContent?.trim() || '';
          
          matchData.push({
            nickname: user.nickname,
            rank: user.rank,
            position,
            name,
            season
          });
        }
      } catch (error) {
        console.error(`Error fetching match data for ${user.nickname}:`, error);
        continue;
      }

      // 요청 간 간격 두기
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 5. 포지션별 데이터 정리
    updateProgress(80, '데이터 정리 중...');
    
    const positionGroups = {
      'FW': ['ST', 'CF', 'LW', 'RW', 'LF', 'RF'],
      'MF': ['CAM', 'CM', 'CDM', 'LM', 'RM', 'LAM', 'RAM', 'LCM', 'RCM', 'LDM', 'RDM'],
      'DF': ['CB', 'LB', 'RB', 'LWB', 'RWB', 'LCB', 'RCB'],
      'GK': ['GK']
    };

    const summary: Record<string, any[]> = {};
    
    for (const [groupName, positions] of Object.entries(positionGroups)) {
      const positionData = matchData.filter(data => 
        positions.includes(data.position)
      );

      const playerStats = new Map<string, { count: number; users: Set<string> }>();
      
      for (const data of positionData) {
        const key = `${data.name}-${data.season}`;
        if (!playerStats.has(key)) {
          playerStats.set(key, { count: 0, users: new Set() });
        }
        const stats = playerStats.get(key)!;
        stats.count++;
        stats.users.add(data.nickname);
      }

      summary[groupName] = Array.from(playerStats.entries())
        .map(([key, stats]) => {
          const [name, season] = key.split('-');
          return {
            name,
            season,
            count: stats.count,
            userCount: stats.users.size,
            percentage: ((stats.users.size / filteredUsers.length) * 100).toFixed(1)
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
    }

    // 6. 최종 결과 저장
    const result = {
      totalUsers: filteredUsers.length,
      topN,
      summary,
      users: filteredUsers.map(u => ({
        nickname: u.nickname,
        rank: u.rank,
        formation: u.formation
      }))
    };

    jobs[jobId] = {
      status: 'done',
      result,
      progress: 100,
      lastUpdate: Date.now()
    };

  } catch (error) {
    console.error('Job processing error:', error);
    jobs[jobId] = {
      status: 'error',
      error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.',
      progress: 0,
      lastUpdate: Date.now()
    };
  }
}