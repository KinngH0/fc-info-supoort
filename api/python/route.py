from http.server import BaseHTTPRequestHandler
import json
import asyncio
import aiohttp
import pandas as pd
import numpy as np
from urllib.parse import parse_qs, urlparse
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import requests
from bs4 import BeautifulSoup

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # URL 파라미터 파싱
            query = parse_qs(urlparse(self.path).query)
            job_id = query.get('jobId', [None])[0]
            
            if not job_id:
                # 팀 컬러 목록 반환
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "teamColors": [
                        "1. FC 우니온 베를린",
                        "1. FC 쾰른",
                        "AC 밀란",
                        "AS 모나코",
                        "AS 로마",
                        "AZ 알크마르",
                        "BSC 영 보이즈",
                        "FC 바르셀로나",
                        "FC 바이에른 뮌헨",
                        "FC 인테르",
                        "FC 포르투",
                        "FC 샬케 04",
                        "PSV 에인트호번",
                        "SS 라치오",
                        "SS 나폴리",
                        "SV 베르더 브레멘",
                        "TSG 1899 호펜하임",
                        "VfB 슈투트가르트",
                        "VfL 볼프스부르크",
                        "가나",
                        "갈라타사라이 SK",
                        "감바 오사카",
                        "강원 FC",
                        "경남 FC",
                        "그레미우",
                        "그리스",
                        "기라반츠 기타",
                        "나고야 그램퍼스",
                        "남아프리카 공화국",
                        "네덜란드",
                        "노르웨이",
                        "뉴캐슬 유나이티드",
                        "뉴질랜드",
                        "니스",
                        "대구 FC",
                        "대한민국",
                        "덴마크",
                        "도쿄 베르디",
                        "독일",
                        "동경 FC",
                        "라요 바예카노",
                        "레알 마드리드",
                        "레알 소시에다드",
                        "레알 베티스",
                        "레알 살라망카",
                        "레알 바야돌리드",
                        "레알 사라고사",
                        "레스터 시티",
                        "로마니아",
                        "로스앤젤레스 FC",
                        "로스앤젤레스 갤럭시",
                        "루마니아",
                        "리버풀",
                        "리즈 유나이티드",
                        "마요르카",
                        "맨체스터 시티",
                        "맨체스터 유나이티드",
                        "메시",
                        "멕시코",
                        "모나코",
                        "몰타",
                        "몽펠리에 HSC",
                        "미국",
                        "미들즈브러",
                        "밀란",
                        "바르셀로나",
                        "바이에른 뮌헨",
                        "반포레 고후",
                        "발렌시아",
                        "베식타시 JK",
                        "베이징 궈안",
                        "벨기에",
                        "보루시아 도르트문트",
                        "보루시아 묀헨글라드바흐",
                        "볼로냐",
                        "봉황선수단",
                        "부산 아이파크",
                        "브라질",
                        "브라이튼 앤 호브 알비온",
                        "브렌트포드",
                        "비야레알",
                        "사우샘프턴",
                        "산프레체 히로시마",
                        "상하이 선화",
                        "샤르케 04",
                        "샬케 04",
                        "세비야",
                        "세비야 FC",
                        "세인트 에티엔",
                        "세인트루이스 시티",
                        "셀틱",
                        "수원 FC",
                        "수원 삼성 블루윙즈",
                        "스웨덴",
                        "스위스",
                        "스페인",
                        "스포르팅 CP",
                        "슬로바키아",
                        "시애틀 사운더스",
                        "시에나",
                        "아스날",
                        "아스널",
                        "아틀레티코 마드리드",
                        "아틀레티코 마드리드 B",
                        "아틀레티코 마드리드 U19",
                        "안데를레흐트",
                        "알 아인",
                        "알 힐랄",
                        "에버턴",
                        "에스파뇰",
                        "에인트호번",
                        "오사카 가시마 앤틀러스",
                        "오스트리아",
                        "오스트레일리아",
                        "올림피아코스",
                        "울산 현대",
                        "우니온 베를린",
                        "우라와 레드 다이아몬즈",
                        "우크라이나",
                        "울버햄프턴 원더러스",
                        "웨스트햄 유나이티드",
                        "웨일스",
                        "유벤투스",
                        "인테르",
                        "인천 유나이티드",
                        "일본",
                        "잉글랜드",
                        "전북 현대 모터스",
                        "제주 유나이티드",
                        "주벤투드",
                        "중국",
                        "지롱댕 보르도",
                        "첼시",
                        "청두 룽청",
                        "체코",
                        "카디프 시티",
                        "카타르",
                        "칼리아리",
                        "캄보디아",
                        "캐나다",
                        "코스타리카",
                        "코트디부아르",
                        "콜롬비아",
                        "크로아티아",
                        "키프로스",
                        "토트넘 홋스퍼",
                        "토리노",
                        "파나티나이코스",
                        "파리 생제르맹",
                        "파르마",
                        "팔레르모",
                        "페루",
                        "페예노르트",
                        "포르투갈",
                        "포항 스틸러스",
                        "폴란드",
                        "프랑스",
                        "풀럼",
                        "피오렌티나",
                        "핀란드",
                        "함부르크 SV",
                        "헝가리",
                        "헤르타 BSC",
                        "헤타페 CF",
                        "호주"
                    ]
                }).encode())
                return

            # 작업 상태 확인
            if job_id not in jobs:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "작업을 찾을 수 없습니다."
                }).encode())
                return

            job = jobs[job_id]
            
            if job["status"] == "done":
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "done": True,
                    "result": job["result"],
                    "progress": 100
                }).encode())
                return

            if job["status"] == "error":
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": job["error"],
                    "progress": 0
                }).encode())
                return

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": job["status"],
                "progress": job["progress"],
                "message": job.get("message", "")
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e)
            }).encode())

    def do_POST(self):
        try:
            # 요청 본문 파싱
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            rank_limit = int(data.get('rankLimit', 100))
            team_color = data.get('teamColor', 'all').strip()
            top_n = int(data.get('topN', 5))
            api_key = data.get('apiKey', '')

            if not api_key:
                raise ValueError("API key is required")

            # 작업 ID 생성
            job_id = str(len(jobs))
            jobs[job_id] = {
                "status": "processing",
                "progress": 0,
                "startTime": int(time.time() * 1000)
            }

            # 비동기 작업 시작
            asyncio.run(process_job(job_id, rank_limit, team_color, top_n, api_key))

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "jobId": job_id
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e)
            }).encode())

# 전역 변수
jobs = {}

async def process_job(job_id: str, rank_limit: int, team_color: str, top_n: int, api_key: str):
    try:
        headers = {'x-nxopen-api-key': api_key}
        normalized_filter = team_color.replace(" ", "").lower()

        # 세션 생성
        session = create_session(headers)
        
        # 메타데이터 로드
        meta_data = await load_meta_data(session)
        
        # 랭커 데이터 수집
        ranked_users = await collect_ranked_users(session, rank_limit, normalized_filter)
        
        if not ranked_users:
            raise ValueError("No users found matching the criteria")
        
        # 경기 데이터 수집
        player_records = await collect_match_data(session, ranked_users, meta_data)
        
        # 통계 계산
        stats = calculate_statistics(ranked_users, player_records, meta_data)
        
        # 작업 완료
        jobs[job_id]["status"] = "done"
        jobs[job_id]["result"] = stats
        jobs[job_id]["progress"] = 100

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["progress"] = 0

def create_session(headers):
    session = requests.Session()
    session.headers.update(headers)
    retries = Retry(total=3, backoff_factor=0.3, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

async def load_meta_data(session):
    spid_data = session.get("https://open.api.nexon.com/static/fconline/meta/spid.json").json()
    season_data = session.get("https://open.api.nexon.com/static/fconline/meta/seasonid.json").json()
    position_data = session.get("https://open.api.nexon.com/static/fconline/meta/spposition.json").json()

    return {
        "spid_map": {item['id']: item['name'] for item in spid_data},
        "season_map": {item['seasonId']: item['className'].split('(')[0].strip() for item in season_data},
        "position_map": {item['spposition']: item['desc'] for item in position_data}
    }

async def collect_ranked_users(session, rank_limit, normalized_filter):
    pages = (rank_limit - 1) // 20 + 1
    ranked_users = []
    
    with ThreadPoolExecutor(max_workers=30) as executor:
        futures = {executor.submit(parse_rank_page, session, page, normalized_filter): page 
                  for page in range(1, pages + 1)}
        
        for future in as_completed(futures):
            try:
                ranked_users.extend(future.result())
            except Exception as e:
                print(f"Warning: {e}")
    
    return ranked_users

def parse_rank_page(session, page, normalized_filter):
    url = f'https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno={page}'
    try:
        res = session.get(url, timeout=5)
        soup = BeautifulSoup(res.text, 'html.parser')
        trs = soup.select('.tbody .tr')
        result = []
        rank = (page - 1) * 20 + 1
        
        for tr in trs:
            name_tag = tr.select_one('.rank_coach .name')
            team_tag = tr.select_one('.td.team_color .name .inner') or tr.select_one('.td.team_color .name')
            formation_tag = tr.select_one('.td.formation')
            value_tag = tr.select_one('span.price')
            
            if name_tag and team_tag:
                nickname = name_tag.text.strip()
                team_color = re.sub(r'\(.*?\)', '', team_tag.text.strip()).replace(" ", "").lower()
                formation = formation_tag.text.strip() if formation_tag else "-"
                value = 0
                
                if value_tag:
                    raw = value_tag.get("alt") or value_tag.get("title") or "0"
                    try:
                        value = int(raw.replace(",", "")) // 100_000_000
                    except:
                        value = 0
                
                if normalized_filter == "all" or normalized_filter in team_color:
                    result.append((nickname, rank, formation, value))
            rank += 1
        return result
    except Exception as e:
        print(f"Warning: Page {page} error - {e}")
        return []

async def collect_match_data(session, ranked_users, meta_data):
    player_records = []
    usernames = [u for u, _, _, _ in ranked_users]
    
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(fetch_user_data, session, nickname, meta_data) 
                  for nickname in usernames]
        
        for future in as_completed(futures):
            player_records.extend(future.result())
    
    return player_records

def fetch_user_data(session, nickname, meta_data):
    try:
        ouid_res = session.get(f"https://open.api.nexon.com/fconline/v1/id?nickname={nickname}", timeout=5)
        if ouid_res.status_code != 200:
            return []
        ouid = ouid_res.json().get("ouid")

        match_res = session.get(f"https://open.api.nexon.com/fconline/v1/user/match?matchtype=52&ouid={ouid}&offset=0&limit=1", timeout=5)
        if match_res.status_code != 200 or not match_res.json():
            return []
        match_id = match_res.json()[0]

        detail_res = session.get(f"https://open.api.nexon.com/fconline/v1/match-detail?matchid={match_id}", timeout=5)
        if detail_res.status_code != 200:
            return []
        match_data = detail_res.json()

        results = []
        for info in match_data["matchInfo"]:
            if info["ouid"] == ouid:
                for p in info.get("player", []):
                    if p.get("spPosition") == 28:
                        continue
                    sp_id = p["spId"]
                    grade = p["spGrade"]
                    position = meta_data["position_map"].get(p["spPosition"], f"pos{p['spPosition']}")
                    season_id = int(str(sp_id)[:3])
                    name = meta_data["spid_map"].get(sp_id, f"(Unknown:{sp_id})")
                    season_name = meta_data["season_map"].get(season_id, f"{season_id}")
                    results.append({
                        "nickname": nickname,
                        "position": position,
                        "name": name,
                        "season": season_name,
                        "grade": grade,
                    })
        return results
    except:
        return []

def calculate_statistics(ranked_users, player_records, meta_data):
    df = pd.DataFrame(player_records)
    unique_users = df["nickname"].nunique()
    
    # 포메이션 통계
    formation_dict = {}
    for _, _, formation, _ in ranked_users:
        formation_dict.setdefault(formation, []).append(1)
    
    formation_stats = {
        formation: {
            "count": len(users),
            "percentage": round(len(users) / unique_users * 100)
        }
        for formation, users in formation_dict.items()
    }
    
    # 구단 가치 통계
    teams_value = [value for _, _, _, value in ranked_users]
    value_stats = {
        "average": round(sum(teams_value) / len(teams_value)) if teams_value else 0,
        "min": min(teams_value) if teams_value else 0,
        "max": max(teams_value) if teams_value else 0
    }
    
    # 포지션별 통계
    position_groups = {
        "CAM": ["CAM"],
        "RAM, LAM": ["RAM", "LAM"],
        "RM, LM": ["RM", "LM"],
        "CM": ["CM", "LCM", "RCM"],
        "CDM": ["CDM", "LDM", "RDM"],
        "LB": ["LB", "LWB"],
        "CB": ["CB", "LCB", "RCB", "SW"],
        "RB": ["RB", "RWB"],
        "GK": ["GK"]
    }
    
    position_stats = {}
    for group_name, pos_list in position_groups.items():
        group_df = df[df["position"].isin(pos_list)]
        if not group_df.empty:
            top_players = (
                group_df.groupby(["name", "season", "grade"])
                .agg(count=("nickname", "count"))
                .reset_index()
                .sort_values(by="count", ascending=False)
                .head(5)
            )
            
            position_stats[group_name] = [
                {
                    "name": row["name"],
                    "season": row["season"],
                    "grade": row["grade"],
                    "count": row["count"],
                    "percentage": round(row["count"] / unique_users * 100)
                }
                for _, row in top_players.iterrows()
            ]
    
    return {
        "total_users": unique_users,
        "formations": formation_stats,
        "team_values": value_stats,
        "positions": position_stats
    } 