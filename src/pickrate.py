import requests
from bs4 import BeautifulSoup
import ssl
import json
from typing import Dict, List, Optional
import logging
import time

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PickrateAnalyzer:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False
        
    def fetch_page(self, url: str) -> Optional[str]:
        """웹페이지를 가져옵니다."""
        try:
            response = self.session.get(url)
            if response.status_code == 200:
                return response.text
            logger.error(f"Failed to fetch {url}: Status {response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None

    def get_ranked_users(self, rank_limit: int) -> List[Dict]:
        """랭킹 데이터를 수집합니다."""
        users = []
        pages = (rank_limit + 19) // 20  # 20명씩 페이지 구성
        
        for page in range(1, pages + 1):
            url = f"https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno={page}"
            html = self.fetch_page(url)
            
            if not html:
                continue
                
            soup = BeautifulSoup(html, 'html.parser')
            rows = soup.select('.tbody .tr')
            
            for row in rows:
                nickname = row.select_one('.rank_coach .name')
                team_color = row.select_one('.td.team_color .name .inner') or row.select_one('.td.team_color .name')
                formation = row.select_one('.td.formation')
                rank = row.select_one('.rank_no')
                
                if all([nickname, team_color, formation, rank]):
                    user = {
                        'nickname': nickname.text.strip(),
                        'team_color': team_color.text.replace('(', '').replace(')', '').strip(),
                        'formation': formation.text.strip(),
                        'rank': int(rank.text.strip())
                    }
                    users.append(user)
                    
                    if len(users) >= rank_limit:
                        return users
                        
            time.sleep(0.1)  # 요청 간 간격
            
        return users

    def get_user_match_data(self, nickname: str) -> List[Dict]:
        """유저의 매치 데이터를 수집합니다."""
        url = f"https://fconline.nexon.com/datacenter/rank_match?nickname={nickname}"
        html = self.fetch_page(url)
        
        if not html:
            return []
            
        soup = BeautifulSoup(html, 'html.parser')
        players = soup.select('.player_data')
        
        match_data = []
        for player in players:
            position = player.select_one('.position')
            name = player.select_one('.name')
            season = player.select_one('.season')
            
            if all([position, name, season]):
                match_data.append({
                    'position': position.text.strip(),
                    'name': name.text.strip(),
                    'season': season.text.strip()
                })
                
        return match_data

    def analyze_pickrate(self, rank_limit: int, team_color: str, top_n: int) -> Dict:
        """픽률을 분석합니다."""
        # 1. 랭킹 데이터 수집
        users = self.get_ranked_users(rank_limit)
        
        # 2. 팀 컬러 필터링
        filtered_users = [
            user for user in users 
            if user['team_color'].lower() == team_color.lower()
        ]
        
        if not filtered_users:
            return {
                'message': '해당 팀컬러를 사용하는 유저가 없습니다.',
                'users': [],
                'summary': {}
            }
            
        # 3. 매치 데이터 수집
        position_groups = {
            'FW': ['ST', 'CF', 'LW', 'RW', 'LF', 'RF'],
            'MF': ['CAM', 'CM', 'CDM', 'LM', 'RM', 'LAM', 'RAM', 'LCM', 'RCM', 'LDM', 'RDM'],
            'DF': ['CB', 'LB', 'RB', 'LWB', 'RWB', 'LCB', 'RCB'],
            'GK': ['GK']
        }
        
        summary = {group: [] for group in position_groups.keys()}
        
        for user in filtered_users:
            match_data = self.get_user_match_data(user['nickname'])
            
            for data in match_data:
                for group, positions in position_groups.items():
                    if data['position'] in positions:
                        key = f"{data['name']}-{data['season']}"
                        found = False
                        
                        for item in summary[group]:
                            if item['key'] == key:
                                item['count'] += 1
                                item['users'].add(user['nickname'])
                                found = True
                                break
                                
                        if not found:
                            summary[group].append({
                                'key': key,
                                'name': data['name'],
                                'season': data['season'],
                                'count': 1,
                                'users': {user['nickname']}
                            })
            
            time.sleep(0.1)  # 요청 간 간격
            
        # 4. 결과 정리
        for group in summary:
            summary[group].sort(key=lambda x: x['count'], reverse=True)
            summary[group] = summary[group][:top_n]
            
            for item in summary[group]:
                item['user_count'] = len(item['users'])
                item['percentage'] = round((len(item['users']) / len(filtered_users)) * 100, 1)
                del item['users']
                del item['key']
                
        return {
            'total_users': len(filtered_users),
            'top_n': top_n,
            'summary': summary,
            'users': filtered_users
        }

def main():
    analyzer = PickrateAnalyzer()
    result = analyzer.analyze_pickrate(
        rank_limit=100,  # 상위 100명
        team_color="FC 바르셀로나",  # 팀 컬러
        top_n=5  # 각 포지션별 상위 5명
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main() 