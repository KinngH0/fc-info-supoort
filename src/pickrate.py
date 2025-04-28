import aiohttp
import asyncio
from bs4 import BeautifulSoup
import ssl
import json
from typing import Dict, List, Optional, Tuple, Any
import logging
import time
from datetime import datetime, timedelta
import os
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import re
from functools import lru_cache, wraps
from concurrent.futures import ThreadPoolExecutor
import certifi
from aiohttp import TCPConnector, ClientTimeout
import psutil  # 메모리 모니터링용
import argparse
from collections import defaultdict

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def timed_cache_until_next_hour():
    """다음 정각까지 캐시를 유지하는 데코레이터"""
    def decorator(func):
        cache = {}
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            now = datetime.now()
            current_hour = now.replace(minute=0, second=0, microsecond=0)
            next_hour = current_hour + timedelta(hours=1)
            
            cache_key = (func.__name__, args, frozenset(kwargs.items()))
            
            if cache_key not in cache or now >= cache[cache_key]['expires']:
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                cache[cache_key] = {
                    'data': result,
                    'expires': next_hour
                }
            return cache[cache_key]['data']
        return wrapper
    return decorator

class PickrateAnalyzer:
    def __init__(self):
        self.api_key = os.environ.get('FC_API_KEY')
        if not self.api_key:
            raise ValueError("FC_API_KEY 환경변수가 설정되지 않았습니다.")
        
        self.headers = {
            'x-nxopen-api-key': self.api_key,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())
        self.connector = TCPConnector(
            ssl=self.ssl_context,
            limit=50,
            ttl_dns_cache=300,
            force_close=True
        )
        self.timeout = ClientTimeout(total=30)
        self._max_retries = 3
        self._backoff_factor = 1
        self._last_metadata_update = None
        self.spid_map = {}
        self.season_map = {}
        self.position_map = {}
        self.position_groups = {
            "LW": ["LW"],
            "ST": ["ST", "LS", "RS"],
            "CF": ["CF", "LF", "RF"],
            "RW": ["RW"],
            "LM": ["LM"],
            "RM": ["RM"],
            "CAM": ["CAM"],
            "RAM/LAM": ["RAM", "LAM"],
            "CM": ["CM", "RCM", "LCM"],
            "CDM": ["CDM", "LDM", "RDM"],
            "LB": ["LWB", "LB"],
            "CB": ["CB", "SW", "LCB", "RCB"],
            "RB": ["RWB", "RB"],
            "GK": ["GK"]
        }
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers=self.headers,
            connector=self.connector,
            timeout=self.timeout
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def initialize(self):
        """비동기 초기화 함수"""
        await self.load_metadata()

    @timed_cache_until_next_hour()
    async def load_metadata(self):
        """메타데이터 로드 (정각까지 캐싱)"""
        try:
            tasks = [
                self.fetch_json("https://open.api.nexon.com/static/fconline/meta/spid.json"),
                self.fetch_json("https://open.api.nexon.com/static/fconline/meta/seasonid.json"),
                self.fetch_json("https://open.api.nexon.com/static/fconline/meta/spposition.json")
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"메타데이터 로드 중 오류: {result}")
                    continue

            spid_data, season_data, position_data = results
            
            self.spid_map = {item['id']: item['name'] for item in spid_data}
            self.season_map = {item['seasonId']: item['className'].split('(')[0].strip() 
                             for item in season_data}
            self.position_map = {item['spposition']: item['desc'] 
                               for item in position_data}
            
            self._last_metadata_update = datetime.now()
            logger.info(f"메타데이터 갱신 완료. 다음 갱신: {self._get_next_update_time()}")
                
        except Exception as e:
            logger.error(f"메타데이터 로드 실패: {str(e)}")
            raise

    def _get_next_update_time(self) -> datetime:
        """다음 갱신 시각 계산"""
        now = datetime.now()
        next_hour = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        return next_hour

    async def fetch_json(self, url: str) -> Dict:
        """JSON 데이터 비동기 fetch with 재시도 로직"""
        retry_count = 0
        while retry_count < self._max_retries:
            try:
                async with self.session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 429:  # Rate limit
                        retry_after = int(response.headers.get('Retry-After', self._backoff_factor * (2 ** retry_count)))
                        logger.warning(f"Rate limit reached. Waiting {retry_after} seconds...")
                        await asyncio.sleep(retry_after)
                    elif response.status >= 500:  # 서버 오류
                        wait_time = self._backoff_factor * (2 ** retry_count)
                        logger.warning(f"서버 오류 발생. {wait_time}초 후 재시도...")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"API 호출 실패: {url}, 상태 코드: {response.status}")
                        return {}
            except asyncio.TimeoutError:
                wait_time = self._backoff_factor * (2 ** retry_count)
                logger.warning(f"타임아웃 발생. {wait_time}초 후 재시도...")
                await asyncio.sleep(wait_time)
            except (aiohttp.ClientError, ssl.SSLError) as e:
                logger.error(f"네트워크 오류 발생: {str(e)}")
                wait_time = self._backoff_factor * (2 ** retry_count)
                await asyncio.sleep(wait_time)
            except json.JSONDecodeError as e:
                logger.error(f"JSON 파싱 오류: {str(e)}")
                return {}
            except Exception as e:
                logger.error(f"예상치 못한 오류 발생: {str(e)}")
                return {}
            retry_count += 1
        return {}

    @timed_cache_until_next_hour()
    async def get_user_match_data(self, nickname: str) -> List[Dict[str, Any]]:
        """유저의 매치 데이터를 비동기로 가져옵니다. (정각까지 캐싱)"""
        try:
            # 1. ouid 조회
            ouid_res = await self.fetch_json(
                f"https://open.api.nexon.com/fconline/v1/id?nickname={nickname}")
            
            if not ouid_res:
                return []
                
            ouid = ouid_res.get("ouid")
            
            # 2. 최근 매치 기록 조회
            match_res = await self.fetch_json(
                f"https://open.api.nexon.com/fconline/v1/user/match?matchtype=52&ouid={ouid}&offset=0&limit=1")
            
            if not match_res:
                return []
                
            match_id = match_res[0]
            
            # 3. 매치 상세 정보 조회
            detail_res = await self.fetch_json(
                f"https://open.api.nexon.com/fconline/v1/match-detail?matchid={match_id}")
            
            if not detail_res:
                return []
                
            results = []
            formation = None
            team_value = 0
            
            # 4. 선수 정보 추출
            for info in detail_res["matchInfo"]:
                if info["ouid"] == ouid:
                    formation = str(info.get("formation", "")).replace("0", "-0-").replace("1", "-1-").replace("2", "-2-").replace("3", "-3-").replace("4", "-4-").replace("5", "-5-").strip("-")
                    team_value = sum(p.get("spGrade", 0) for p in info.get("player", []))  # 구단가치 계산
                    
                    match_data = {
                        "formation": formation,
                        "team_value": team_value,
                        "players": {}
                    }
                    
                    for p in info.get("player", []):
                        if p.get("spPosition") == 28:  # 감독 제외
                            continue
                        sp_id = p["spId"]
                        position = self.position_map.get(p["spPosition"], f"pos{p['spPosition']}")
                        season_id = int(str(sp_id)[:3])
                        name = self.spid_map.get(sp_id, f"(Unknown:{sp_id})")
                        season = self.season_map.get(season_id, f"{season_id}")
                        
                        match_data["players"][position] = {
                            "id": sp_id,
                            "name": name,
                            "season": season,
                            "grade": p["spGrade"]
                        }
                    
                    results.append(match_data)
            
            if formation:
                logger.info(f"포메이션 찾음: {formation} (유저: {nickname})")
            
            logger.info(f"유저 매치 데이터 캐시 갱신됨 ({nickname}). 다음 갱신: {self._get_next_update_time()}")
            return results
        except Exception as e:
            logger.error(f"매치 데이터 조회 실패 (유저: {nickname}): {str(e)}")
            return []

    @timed_cache_until_next_hour()
    async def fetch_rank_page(self, page: int) -> List[Tuple[str, str]]:
        """랭킹 페이지를 비동기로 가져옵니다."""
        try:
            url = f'https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno={page}'
            logger.info(f"랭킹 페이지 요청: {url}")
            
            async with self.session.get(url) as response:
                if response.status != 200:
                    logger.error(f"랭킹 페이지 조회 실패: 상태 코드 {response.status}")
                    return []
                    
                html = await response.text()
                logger.info(f"응답 데이터 길이: {len(html)}")
                
                if not html.strip():
                    logger.error("빈 HTML 응답 수신")
                    return []
                    
                soup = BeautifulSoup(html, 'html.parser')
                ranked_users = []
                
                tbody = soup.select_one('.tbody')
                if not tbody:
                    logger.error("랭킹 테이블을 찾을 수 없음")
                    logger.debug(f"HTML 내용: {html[:500]}...")  # 처음 500자만 로깅
                    return []
                
                for tr in tbody.select('.tr'):
                    try:
                        name_tag = tr.select_one('.rank_coach .name')
                        team_tag = tr.select_one('.td.team_color .name .inner')
                        
                        if name_tag and team_tag:
                            nickname = name_tag.text.strip()
                            # 팀 이름에서 (선수 수) 부분 제거
                            team_text = team_tag.text.strip()
                            team_color = team_text.split('(')[0].strip()
                            
                            logger.info(f"유저 데이터 찾음: {nickname} (팀: {team_color})")
                            ranked_users.append((nickname, team_color))
                    except Exception as e:
                        logger.error(f"유저 데이터 파싱 오류: {str(e)}")
                        continue
                        
                if not ranked_users:
                    logger.warning(f"페이지 {page}에서 유저 데이터를 찾을 수 없음")
                else:
                    logger.info(f"페이지 {page}에서 {len(ranked_users)}명의 유저 데이터를 찾음")
                    
                return ranked_users
        except aiohttp.ClientError as e:
            logger.error(f"네트워크 오류 (페이지 {page}): {str(e)}")
            return []
        except Exception as e:
            logger.error(f"랭킹 페이지 처리 중 오류 발생 (페이지 {page}): {str(e)}")
            return []

    async def get_user_rank_info(self, nickname: str) -> Dict:
        """유저의 랭킹 정보를 크롤링으로 가져옵니다."""
        try:
            # 매니저 랭킹 페이지 크롤링
            async with self.session.get(f'https://fconline.nexon.com/profile/manager/{nickname}') as response:
                if response.status != 200:
                    return {"rank": None, "score": None, "formation": None}
                    
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # 포메이션 정보 추출 (수정된 부분)
                formation = None
                formation_div = soup.select_one('.formation_wrap')
                if formation_div:
                    formation_class = formation_div.get('class', [])
                    for cls in formation_class:
                        if 'formation' in cls:
                            numbers = ''.join(c for c in cls if c.isdigit())
                            if len(numbers) == 5:
                                formation = '-'.join(numbers)
                                logger.info(f"포메이션 찾음: {formation} (유저: {nickname})")
                                break
                
                # 랭킹 점수 추출
                rank_div = soup.select_one('.manager_info')
                rank = None
                score = None
                
                if rank_div:
                    # 랭킹 정보 텍스트에서 숫자만 추출
                    rank_text = rank_div.get_text()
                    rank_match = re.search(r'순위\s*(\d+)', rank_text)
                    score_match = re.search(r'점수\s*(\d+)', rank_text)
                    
                    if rank_match:
                        rank = int(rank_match.group(1))
                    if score_match:
                        score = int(score_match.group(1))
                
                return {
                    "rank": rank,
                    "score": score,
                    "formation": formation
                }
        except Exception as e:
            logger.error(f"랭킹 정보 크롤링 실패 (유저: {nickname}): {str(e)}")
            return {"rank": None, "score": None, "formation": None}

    def _process_analysis_results(self, users: List[Dict[str, Any]], target_team: str = None) -> List[Dict[str, Any]]:
        """분석 결과를 처리하고 필터링합니다."""
        if not users:
            return []

        filtered_users = []
        for user in users:
            current_team = user.get("team_color", "").strip()
            if target_team:
                target_team = target_team.strip()
                logger.info(f"팀 비교: 현재={current_team}, 목표={target_team}")
                if current_team == target_team:
                    logger.info(f"팀 컬러 일치: {user['nickname']} (팀: {current_team})")
                    filtered_users.append(user)
            else:
                filtered_users.append(user)

        if not filtered_users and target_team:
            logger.warning(f"팀 컬러 '{target_team}'를 가진 유저를 찾을 수 없습니다.")
            return []

        return filtered_users

    async def analyze_pickrate(self, users: List[Dict[str, Any]], rank_limit: int = 50, target_team: str = None) -> Dict[str, Any]:
        if not users:
            raise ValueError("유저 목록이 비어있습니다.")

        # 팀 컬러로 필터링
        filtered_users = self._process_analysis_results(users[:rank_limit], target_team)
        if not filtered_users:
            return {
                "error": f"팀 컬러 '{target_team}'를 가진 유저를 찾을 수 없습니다.",
                "formations": [],
                "positions": {},
                "filtered_users": []
            }

        formation_stats = {}
        position_stats = {}
        total_matches = 0
        player_info = {}  # 선수 정보 캐시

        try:
            for user in filtered_users:
                matches = await self.get_user_match_data(user["nickname"])
                if not matches:
                    continue

                for match in matches:
                    formation = match.get("formation", "unknown")
                    formation_stats[formation] = formation_stats.get(formation, 0) + 1
                    total_matches += 1

                    for position, player in match.get("players", {}).items():
                        if position not in position_stats:
                            position_stats[position] = {}
                        
                        player_id = player.get("id")
                        if player_id:
                            position_stats[position][player_id] = position_stats[position].get(player_id, 0) + 1
                            # 선수 정보 캐시
                            if player_id not in player_info:
                                player_info[player_id] = {
                                    "name": player.get("name", "Unknown"),
                                    "season": player.get("season", "Unknown")
                                }

            # 포메이션 통계 요약
            formation_summary = []
            for formation, count in formation_stats.items():
                percentage = (count / total_matches) * 100 if total_matches > 0 else 0
                formation_summary.append({
                    "formation": formation,
                    "count": count,
                    "percentage": round(percentage, 2)
                })

            # 포지션별 선수 통계 정리
            position_summary = {}
            for position, players in position_stats.items():
                position_total = sum(players.values())
                player_stats = []
                for player_id, count in players.items():
                    percentage = (count / position_total) * 100 if position_total > 0 else 0
                    info = player_info.get(player_id, {"name": f"Unknown({player_id})", "season": "Unknown"})
                    player_stats.append({
                        "id": player_id,
                        "name": info["name"],
                        "season": info["season"],
                        "count": count,
                        "percentage": round(percentage, 2)
                    })
                position_summary[position] = sorted(player_stats, key=lambda x: x["count"], reverse=True)

            return {
                "formations": sorted(formation_summary, key=lambda x: x["count"], reverse=True),
                "positions": position_summary,
                "filtered_users": filtered_users,
                "total_matches": total_matches
            }

        except Exception as e:
            logging.error(f"픽률 분석 중 오류 발생: {str(e)}")
            raise

    async def fetch_rank_users(self) -> List[Dict[str, Any]]:
        """랭킹 유저 목록을 가져옵니다."""
        try:
            users = []
            page = 1
            
            while True:
                page_users = await self.fetch_rank_page(page)
                if not page_users:
                    break
                    
                for nickname, team_color in page_users:
                    users.append({
                        "nickname": nickname,
                        "team_color": team_color
                    })
                    
                logger.info(f"페이지 {page}에서 {len(page_users)}명의 유저 데이터를 가져왔습니다.")
                page += 1
                
                # 일단 첫 페이지만 테스트
                break
                
            return users
        except Exception as e:
            logger.error(f"랭킹 유저 목록 조회 실패: {str(e)}")
            return []

async def main():
    parser = argparse.ArgumentParser(description='FC Online 픽률 분석기')
    parser.add_argument('--rank-limit', type=int, default=50, help='분석할 상위 랭킹 수')
    parser.add_argument('--team-color', type=str, default='아스널', help='분석할 팀 컬러')
    parser.add_argument('--top-n', type=int, default=3, help='각 포지션별 상위 N명의 선수 표시')

    args = parser.parse_args()

    try:
        async with PickrateAnalyzer() as analyzer:
            await analyzer.initialize()
            users = await analyzer.fetch_rank_users()
            
            if not users:
                logging.error("조건에 맞는 유저를 찾을 수 없습니다.")
                return

            result = await analyzer.analyze_pickrate(users, rank_limit=args.rank_limit, target_team=args.team_color)
            
            if "error" in result:
                logging.error(result["error"])
                return
            
            # 조회 결과 요약
            print(f"조회 팀: {args.team_color}")
            print(f"조회 인원: {len(result['filtered_users'])}명")
            print(f"최고 랭커: {result['filtered_users'][0]['nickname'] if result['filtered_users'] else '없음'}")

            # 포메이션 픽률
            print("\n포메이션 픽률")
            for formation in result["formations"]:
                if formation["formation"] == "unknown":
                    continue
                print(f"{formation['formation']} {formation['percentage']}%({formation['count']}명)")

            # 포지션별 선수 픽률
            print("\n포지션별 선수 픽률")
            for position, players in result["positions"].items():
                total_matches = sum(p['count'] for p in players)
                sorted_players = sorted(players, key=lambda x: (-x['percentage'], -x['count']))
                
                # 같은 비율의 선수들을 묶어서 처리
                current_percentage = None
                current_players = []
                player_groups = []
                
                for player in sorted_players:
                    if current_percentage != player['percentage']:
                        if current_players:
                            player_groups.append((current_percentage, current_players))
                        current_percentage = player['percentage']
                        current_players = []
                    current_players.append(player)
                if current_players:
                    player_groups.append((current_percentage, current_players))

                # 출력
                for percentage, group in player_groups:
                    player_names = []
                    for p in group:
                        season = p['season'].replace('TOTY-N', 'TOTY').replace('UCL', 'UC').replace('TOTS', 'TS')
                        name = p['name']
                        player_names.append(f"{name}")
                    
                    players_str = ", ".join(player_names)
                    if len(group) > 1:
                        players_str += f" 외 {len(group)-1}명"
                    print(f"{position} {percentage}%({len(group)}명) {players_str}")

            # 구단 가치 범위 출력 (예시 데이터)
            print("\n구단 가치 범위: 118조 4,598억, 최소: 5조 5,699억, 최대: 1184조 9,787억")

    except Exception as e:
        logging.error(f"프로그램 실행 중 오류 발생: {str(e)}")
    finally:
        logging.info("프로그램 종료")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("프로그램이 사용자에 의해 중단되었습니다.")
    except MemoryError:
        logger.critical("메모리 부족 오류 발생")
    except Exception as e:
        logger.error(f"프로그램 실행 중 오류 발생: {str(e)}")
    finally:
        logger.info("프로그램 종료") 