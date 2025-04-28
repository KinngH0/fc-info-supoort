from flask import Flask, request, jsonify
from pickrate import PickrateAnalyzer

app = Flask(__name__)

@app.route('/api/pickrate', methods=['POST'])
def analyze_pickrate():
    try:
        data = request.get_json()
        rank_limit = data.get('rank_limit')
        team_color = data.get('team_color')
        top_n = data.get('top_n')
        
        if not all([rank_limit, team_color, top_n]):
            return jsonify({'error': '필수 파라미터가 누락되었습니다.'}), 400
            
        analyzer = PickrateAnalyzer()
        result = analyzer.analyze_pickrate(
            rank_limit=rank_limit,
            team_color=team_color,
            top_n=top_n
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000) 