// 📄 /src/app/api/pickrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

export async function POST(req: NextRequest) {
  const { rankLimit, teamColor, topN } = await req.json();
  const normalizedFilter = teamColor.replace(/\s/g, '').toLowerCase();
  const headers = { 'x-nxopen-api-key': process.env.FC_API_KEY! };

  const spidMap: Record<number, string> = {};
  const seasonMap: Record<number, string> = {};
  const positionMap: Record<number, string> = {};

  const fetchMeta = async (url: string) => {
    try {
      const res = await axios.get(url, { headers, httpsAgent: agent });
      return res.data;
    } catch {
      return [];
    }
  };

  const [spidData, seasonData, positionData] = await Promise.all([
    fetchMeta('https://open.api.nexon.com/static/fconline/meta/spid.json'),
    fetchMeta('https://open.api.nexon.com/static/fconline/meta/seasonid.json'),
    fetchMeta('https://open.api.nexon.com/static/fconline/meta/spposition.json')
  ]);

  spidData.forEach((item: any) => (spidMap[item.id] = item.name));
  seasonData.forEach((item: any) => (seasonMap[item.seasonId] = item.className.split('(')[0].trim()));
  positionData.forEach((item: any) => (positionMap[item.spposition] = item.desc));

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
    } catch (e) {
      console.warn(`페이지 ${page} 오류`, e);
    }
  }

  const userMatchResults: any[] = [];

  for (const user of rankedUsers) {
    const nicknameClean = user.nickname.trim();
    try {
      const ouidRes = await axios.get(
        `https://open.api.nexon.com/fconline/v1/id?nickname=${encodeURIComponent(nicknameClean)}`,
        {
          headers: {
            ...headers,
            'User-Agent': 'Mozilla/5.0',
          },
          httpsAgent: agent,
        }
      );
  
      const ouid = ouidRes.data.ouid;
      if (!ouid) {
        console.warn(`❌ [${nicknameClean}] ouid 없음`);
        continue;
      }
  
      const matchListRes = await axios.get(
        `https://open.api.nexon.com/fconline/v1/user/match?matchtype=52&ouid=${ouid}&offset=0&limit=1`,
        {
          headers,
          httpsAgent: agent,
        }
      );
  
      const matchId = matchListRes.data[0];
      if (!matchId) {
        console.warn(`❌ [${nicknameClean}] 매치 없음`);
        continue;
      }
  
      // ... 나머지 매치 상세 로직은 그대로
    } catch (err: any) {
      const status = err?.response?.status || '???';
      const message = err?.response?.data?.error?.message || err.message;
      console.warn(`유저 ${nicknameClean} 처리 오류: [${status}] ${message}`);
      continue;
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
    const grouped: Record<string, { count: number; users: string[] }> = {};

    for (const p of filtered) {
      const key = `${p.name} (${p.season}) - ${p.grade}카`;
      if (!grouped[key]) grouped[key] = { count: 0, users: [] };
      grouped[key].count++;
      grouped[key].users.push(p.nickname);
    }

    const sorted = Object.entries(grouped)
      .map(([k, v]) => ({ name: k, count: v.count, users: v.users }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    summary[group] = sorted;
  }

  return NextResponse.json({
    userCount: userSet.size,
    topN,
    summary
  });
}
