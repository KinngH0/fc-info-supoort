from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
import asyncio
import os
from datetime import datetime, timedelta

app = FastAPI()

class PickrateRequest(BaseModel):
    rankLimit: int
    teamColor: str
    topN: int

class Formation(BaseModel):
    name: str
    count: int

class TeamValue(BaseModel):
    name: str
    count: int

class Position(BaseModel):
    name: str
    count: int

class PickrateResponse(BaseModel):
    formations: List[Formation]
    teamValues: List[TeamValue]
    positions: List[Position]

class JobStatus(BaseModel):
    jobId: str
    progress: int
    done: bool
    error: Optional[str] = None
    result: Optional[PickrateResponse] = None

# 메모리 내 작업 저장소
jobs: Dict[str, JobStatus] = {}
# 작업 만료 시간 (1시간)
JOB_EXPIRY = timedelta(hours=1)

@app.get("/api/python/pickrate")
async def get_team_colors():
    return {
        "teamColors": [
            "all",
            "premier",
            "la_liga",
            "bundesliga",
            "serie_a",
            "ligue_1"
        ]
    }

@app.post("/api/python/pickrate")
async def start_analysis(request: PickrateRequest):
    job_id = os.urandom(16).hex()
    jobs[job_id] = JobStatus(
        jobId=job_id,
        progress=0,
        done=False
    )
    
    asyncio.create_task(process_analysis(job_id, request))
    return {"jobId": job_id}

@app.get("/api/python/pickrate/status")
async def check_status(jobId: str = Query(..., description="작업 ID")):
    if jobId not in jobs:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    
    job = jobs[jobId]
    # 만료된 작업 제거
    if job.done and datetime.now() - job.created_at > JOB_EXPIRY:
        del jobs[jobId]
        raise HTTPException(status_code=404, detail="작업이 만료되었습니다.")
    
    return job

async def process_analysis(job_id: str, request: PickrateRequest):
    try:
        # 작업 진행 상황 시뮬레이션
        for i in range(1, 101):
            await asyncio.sleep(0.1)
            jobs[job_id].progress = i
            
            if i == 100:
                jobs[job_id].done = True
                jobs[job_id].result = PickrateResponse(
                    formations=[
                        Formation(name="4-3-3", count=100),
                        Formation(name="4-4-2", count=80),
                        Formation(name="4-2-3-1", count=60)
                    ],
                    teamValues=[
                        TeamValue(name="팀 컬러 1", count=200),
                        TeamValue(name="팀 컬러 2", count=150),
                        TeamValue(name="팀 컬러 3", count=100)
                    ],
                    positions=[
                        Position(name="ST", count=300),
                        Position(name="CM", count=250),
                        Position(name="CB", count=200)
                    ]
                )
    except Exception as e:
        jobs[job_id].error = str(e)
        jobs[job_id].done = True 