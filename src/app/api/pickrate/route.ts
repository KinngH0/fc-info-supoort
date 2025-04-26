// 📄 /src/app/api/pickrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

const agent = new https.Agent({ rejectUnauthorized: false });
const jobs: Record<string, any> = {};

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

export async function POST(req: NextRequest) {
  try {
    const jobId = uuidv4();
    const { rankLimit, teamColor, topN } = await req.json();
    
    // 입력값 검증 추가
    if (!rankLimit || !teamColor || !topN) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
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
      return NextResponse.json({ error: 'jobId가 필요합니다.' }, { status: 400 });
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

    // 10분 이내의 캐시된 데이터가 있으면 재사용
    if (cachedMatch && (now - cachedMatch.timestamp) < 10 * 60 * 1000) {
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
    const updateProgress = (progress: number) => {
      if (jobs[jobId]) {
        jobs[jobId].progress = Math.min(99, progress);
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

    // 초기 진행률은 0%에서 시작
    updateProgress(0);

    const normalizedFilter = teamColor.replace(/\s/g, '').toLowerCase();
    const headers = { 'x-nxopen-api-key': process.env.FC_API_KEY! };
    
    // 메타데이터 로드 시작
    updateProgress(0);
    const metaData = await loadMetaData();
    updateProgress(2); // 메타데이터 로드 완료

    // 랭킹 데이터 수집 (병렬 처리 개선)
    const pages = Math.ceil(rankLimit / 20);
    const rankedUsers: { nickname: string; rank: number }[] = [];
    const batchSize = 5;
    
    // 전체 진행률 분배
    // - 랭킹 데이터 수집: 0-30%
    // - 매치 데이터 수집: 30-80%
    // - 데이터 처리 및 정리: 80-99%
    
    for (let i = 0; i < pages; i += batchSize) {
      const currentBatch = Math.min(batchSize, pages - i);
      const pagePromises = [];
      
      for (let j = 0; j < currentBatch; j++) {
        const page = i + j + 1;
        pagePromises.push(
          axios.get(`https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`, { 
            httpsAgent: agent,
            timeout: 10000
          })
          .then(res => {
            const dom = new JSDOM(res.data);
            const trs = dom.window.document.querySelectorAll('.tbody .tr');
            let rank = (page - 1) * 20 + 1;
            
            Array.from(trs).forEach((tr: any) => {
              const nameTag = tr.querySelector('.rank_coach .name');
              const teamTag = tr.querySelector('.td.team_color .name .inner') || tr.querySelector('.td.team_color .name');
              if (!nameTag || !teamTag) return;
              
              const nickname = nameTag.textContent.trim();
              const team = teamTag.textContent.replace(/\(.*?\)/g, '').replace(/\s/g, '').toLowerCase();
              if (normalizedFilter === 'all' || team.includes(normalizedFilter)) {
                rankedUsers.push({ nickname, rank });
              }
              rank++;
            });
          })
          .catch(e => {
            console.warn(`페이지 ${page} 오류:`, e.message);
            return null;
          })
        );
      }
      
      await Promise.all(pagePromises);
      // 랭킹 데이터 수집 진행률 (0-30%)
      const rankProgress = Math.round((i / pages) * 30);
      updateProgress(rankProgress);
      
      if (i + batchSize < pages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 매치 데이터 수집 (병렬 처리 개선)
    const userBatchSize = 20;
    const userMatchResults: any[] = [];
    const processedUsers = new Set<string>();

    for (let i = 0; i < rankedUsers.length; i += userBatchSize) {
      const batch = rankedUsers.slice(i, Math.min(i + userBatchSize, rankedUsers.length));
      const batchPromises = batch
        .filter(user => !processedUsers.has(user.nickname))
        .map(user => {
          processedUsers.add(user.nickname);
          return fetchUserMatchData(user, headers);
        });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (!result) return;
        
        const { matchDetail, ouid } = result;
        const user = batch[index];

        for (const info of matchDetail.matchInfo) {
          if (info.ouid !== ouid) continue;
          for (const player of info.player || []) {
            if (player.spPosition === 28) continue;
            const spId = player.spId;
            const grade = player.spGrade;
            const position = metaData.positionMap[player.spPosition] || `pos${player.spPosition}`;
            const seasonId = parseInt(String(spId).slice(0, 3));
            const name = metaData.spidMap[spId] || `(Unknown:${spId})`;
            const season = metaData.seasonMap[seasonId] || `${seasonId}`;

            userMatchResults.push({
              nickname: user.nickname,
              position,
              name,
              season,
              grade
            });
          }
        }
      });

      // 매치 데이터 수집 진행률 (30-80%)
      const matchProgress = 30 + Math.round((i / rankedUsers.length) * 50);
      updateProgress(matchProgress);
      
      if (i + userBatchSize < rankedUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 데이터 처리 시작 (80-99%)
    updateProgress(80);

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

    const result = {
      userCount: userSet.size,
      topN,
      summary
    };

    // 결과 캐싱 및 완료
    setCache(cacheKey, result);
    updateProgress(99); // 최종 진행률

    jobs[jobId] = {
      status: 'done',
      result,
      progress: 100,
      lastUpdate: Date.now()
    };
  } catch (error) {
    console.error(`[Job ${jobId}] 처리 실패:`, error);
    jobs[jobId] = { 
      status: 'error', 
      error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.', 
      progress: 0,
      lastUpdate: Date.now()
    };
    throw error;
  }
}