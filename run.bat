@echo off
echo FC 온라인 픽률 분석기 설치 및 실행을 시작합니다...

:: Python 가상환경 생성
echo Python 가상환경을 생성합니다...
python -m venv venv

:: 가상환경 활성화
echo 가상환경을 활성화합니다...
call venv\Scripts\activate

:: 필요한 패키지 설치
echo 필요한 패키지를 설치합니다...
pip install -r requirements.txt

:: 서버 실행
echo 서버를 실행합니다...
python src/main.py

pause 