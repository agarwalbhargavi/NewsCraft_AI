from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NewsCraft AI",
    description="AI-powered newsletter automation system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Welcome to NewsCraft AI"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "NewsCraft backend is running"
    }