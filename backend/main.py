from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uuid import UUID

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from auth import get_current_user
from database import engine
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
    
class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)


@app.get("/api/me")
async def get_profile(user=Depends(get_current_user)):
    return user


@app.post("/api/workspaces", status_code=201)
async def create_workspace(
    workspace: WorkspaceCreate,
    user=Depends(get_current_user)
):
    name = workspace.name.strip()

    if len(name) < 3:
        raise HTTPException(
            status_code=422,
            detail="Workspace name must contain at least 3 characters"
        )

    try:
        with engine.begin() as connection:

            result = connection.execute(
                text("""
                    INSERT INTO public.workspaces (name)
                    VALUES (:name)
                    RETURNING id, name
                """),
                {"name": name}
            )

            created = result.mappings().one()

            connection.execute(
                text("""
                    INSERT INTO public.workspace_members
                        (workspace_id, user_id, role)
                    VALUES
                        (:workspace_id, :user_id, 'admin')
                """),
                {
                    "workspace_id": created["id"],
                    "user_id": UUID(user["id"])
                }
            )

        return {
            "id": str(created["id"]),
            "name": created["name"],
            "role": "admin"
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Unable to create workspace"
        )


@app.get("/api/workspaces")
async def list_workspaces(
    user=Depends(get_current_user)
):
    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    w.id,
                    w.name,
                    wm.role
                FROM public.workspaces w
                JOIN public.workspace_members wm
                    ON wm.workspace_id = w.id
                WHERE wm.user_id = :user_id
                ORDER BY w.created_at DESC
            """),
            {"user_id": UUID(user["id"])}
        )

        return [
            {
                "id": str(row.id),
                "name": row.name,
                "role": row.role
            }
            for row in result
        ]