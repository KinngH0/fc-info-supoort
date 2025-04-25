// src/app/api/pickrate/route.ts
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
    fetchMeta("https://open.api.nexon.com/static/fconline/meta/spid.json"),
    fetchMeta("https://open.api.nexon.com/static/fconline/meta/seasonid.json"),
    fetchMeta("https://open.api.nexon.com/static/fconline/meta/spposition.json")
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
        const teamColor = teamTag.textContent.replace(/\(.*?\)/g, '').replace(/\s/g, '').toLowerCase();
        if (normalizedFilter === 'all' || teamColor.includes(normalizedFilter)) {
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
    try {
      const ouidRes = await axios.get('https://open.api.nexon.com/fconline/v1/id', {
        headers,
        httpsAgent: agent,
        params: { nickname: user.nickname },
        paramsSerializer: (params) => new URLSearchParams(params).toString(),
      });
      const ouid = ouidRes.data.ouid;
      if (!ouid) continue;

      const matchListRes = await axios.get('https://open.api.nexon.com/fconline/v1/user/match', {
        headers,
        httpsAgent: agent,
        params: {
          matchtype: 52,
          ouid,
          offset: 0,
          limit: 1,
        },
        paramsSerializer: (params) => new URLSearchParams(params).toString(),
      });
      const matchId = matchListRes.data[0];
      if (!matchId) continue;

      const matchDetailRes = await axios.get('https://open.api.nexon.com/fconline/v1/match-detail', {
        headers,
        httpsAgent: agent,
        params: { matchid: matchId },
        paramsSerializer: (params) => new URLSearchParams(params).toString(),
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
            grade,
          });
        }
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message || e?.message;
      console.warn(`유저 ${user.nickname} 처리 오류: [${status}] ${message}`);
      continue;
    }
  }

  const positionGroups: Record<string, string[]> = {
    "CAM": ["CAM"],
    "RAM, LAM": ["RAM", "LAM"],
    "RM, LM": ["RM", "LM"],
    "CM": ["CM", "LCM", "RCM"],
    "CDM": ["CDM", "LDM", "RDM"],
    "LB": ["LB", "LWB"],
    "CB": ["CB", "LCB", "RCB", "SW"],
    "RB": ["RB", "RWB"],
    "GK": ["GK"],
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
    summary,
  });
}
