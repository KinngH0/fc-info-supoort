// 📄 /src/app/api/pickrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

const agent = new https.Agent({ rejectUnauthorized: false });
const jobs: Record<string, any> = {};

export async function POST(req: NextRequest) {
  const jobId = uuidv4();
  const { rankLimit, teamColor, topN } = await req.json();
  jobs[jobId] = { status: 'processing', progress: 0 };

  processJob(jobId, rankLimit, teamColor, topN);

  return NextResponse.json({ jobId });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || '';
  const job = jobs[jobId];

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status === 'done') {
    return NextResponse.json({ done: true, result: job.result, progress: 100 });
  }

  return NextResponse.json({ status: job.status, progress: job.progress || 0 });
}

async function processJob(jobId: string, rankLimit: number, teamColor: string, topN: number) {
  try {
    const normalizedFilter = teamColor.replace(/\s/g, '').toLowerCase();
    const headers = { 'x-nxopen-api-key': process.env.FC_API_KEY! };

    const [spidData, seasonData, positionData] = await Promise.all([
      axios.get('https://open.api.nexon.com/static/fconline/meta/spid.json', { headers, httpsAgent: agent }),
      axios.get('https://open.api.nexon.com/static/fconline/meta/seasonid.json', { headers, httpsAgent: agent }),
      axios.get('https://open.api.nexon.com/static/fconline/meta/spposition.json', { headers, httpsAgent: agent })
    ]);

    const spidMap = Object.fromEntries(spidData.data.map((item: any) => [item.id, item.name]));
    const seasonMap = Object.fromEntries(seasonData.data.map((item: any) => [item.seasonId, item.className.split('(')[0].trim()]));
    const positionMap = Object.fromEntries(positionData.data.map((item: any) => [item.spposition, item.desc]));

    const pages = Math.ceil(rankLimit / 20);
    const rankedUsers: { nickname: string; rank: number }[] = [];

    for (let page = 1; page <= pages; page++) {
      const url = `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`;
      try {
        const res = await axios.get(url, { httpsAgent: agent });
        const dom = new JSDOM(res.data);
        const trs = dom.window.document.querySelectorAll('.tbody .tr');
        let rank = (page - 1) * 20 + 1;
        trs.forEach((tr: any) => {
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
        jobs[jobId].progress = Math.round((page / pages) * 20); // 약 20%까지 반영
      } catch (e) {
        console.warn(`페이지 ${page} 오류`, e);
      }
    }

    const userMatchResults: any[] = [];
    const ouidCache: Record<string, string> = {};

    for (let i = 0; i < rankedUsers.length; i++) {
      const user = rankedUsers[i];
      try {
        const ouidRes = await axios.get('https://open.api.nexon.com/fconline/v1/id', {
          params: { nickname: user.nickname },
          headers,
          httpsAgent: agent
        });
        const ouid = ouidRes.data.ouid;
        if (!ouid) continue;
        ouidCache[user.nickname] = ouid;

        const matchListRes = await axios.get('https://open.api.nexon.com/fconline/v1/user/match', {
          params: { matchtype: 52, ouid, offset: 0, limit: 1 },
          headers,
          httpsAgent: agent
        });
        const matchId = matchListRes.data[0];
        if (!matchId) continue;

        const matchDetailRes = await axios.get('https://open.api.nexon.com/fconline/v1/match-detail', {
          params: { matchid: matchId },
          headers,
          httpsAgent: agent
        });

        const matchInfo = matchDetailRes.data.matchInfo;
        for (const info of matchInfo) {
          if (info.ouid !== ouid) continue;
          for (const player of info.player || []) {
            if (player.spPosition === 28) continue;
            const spId = player.spId;
            const grade = player.spGrade;
            const position = positionMap[player.spPosition] || `pos${player.spPosition}`;
            const seasonId = parseInt(String(spId).slice(0, 3));
            const name = spidMap[spId] || `(Unknown:${spId})`;
            const season = seasonMap[seasonId] || `${seasonId}`;

            userMatchResults.push({
              nickname: user.nickname,
              position,
              name,
              season,
              grade
            });
          }
        }
        jobs[jobId].progress = 20 + Math.round(((i + 1) / rankedUsers.length) * 80);
      } catch (e) {
        console.warn(`유저 ${user.nickname} 처리 오류`, e);
      }
    }

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

    for (const [group, positions] of Object.entries(positionGroups)) {
      const filtered = userMatchResults.filter((p) => positions.includes(p.position));
      const grouped: Record<string, { count: number; users: string[]; season: string; grade: number }> = {};

      for (const p of filtered) {
        const key = `${p.name}||${p.season}||${p.grade}`;
        if (!grouped[key]) grouped[key] = { count: 0, users: [], season: p.season, grade: p.grade };
        grouped[key].count++;
        grouped[key].users.push(p.nickname);
      }

      const sorted = Object.entries(grouped)
        .map(([k, v]) => {
          const [name] = k.split('||');
          return {
            name,
            season: v.season,
            grade: v.grade,
            count: v.count,
            users: v.users
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);

      summary[group] = sorted;
    }

    jobs[jobId] = {
      status: 'done',
      result: {
        userCount: userSet.size,
        topN,
        summary
      },
      progress: 100
    };
  } catch (error) {
    console.error(`[Job ${jobId}] 처리 실패:`, error);
    jobs[jobId] = { status: 'error', error: '처리 중 오류 발생', progress: 0 };
  }
}
