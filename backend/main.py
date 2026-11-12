# ============================================================
# NEWSCRAFT AI - FASTAPI BACKEND
# ============================================================

# -------------------- IMPORTS --------------------

import os
import hashlib
import secrets

from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from uuid import UUID

import httpx

from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from pydantic import BaseModel, Field, EmailStr

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from auth import get_current_user
from database import engine


# -------------------- CONFIGURATION --------------------

load_dotenv()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
).rstrip("/")

SUPABASE_URL = os.getenv("SUPABASE_URL")

SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY"
)

security = HTTPBearer()


# -------------------- FASTAPI APPLICATION --------------------

app = FastAPI(
    title="NewsCraft AI",
    description="AI-powered newsletter automation system",
    version="1.0.0"
)


# -------------------- CORS --------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PYDANTIC MODELS
# ============================================================

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str


# ============================================================
# BASIC ENDPOINTS
# ============================================================

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


# ============================================================
# AUTHENTICATION
# ============================================================

@app.get("/api/me")
async def get_profile(
    user=Depends(get_current_user)
):
    return user


# ============================================================
# WORKSPACE CREATION
# ============================================================

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
                {
                    "name": name
                }
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


# ============================================================
# LIST USER WORKSPACES
# ============================================================

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
            {
                "user_id": UUID(user["id"])
            }
        )

        return [
            {
                "id": str(row.id),
                "name": row.name,
                "role": row.role
            }
            for row in result
        ]


# ============================================================
# GET WORKSPACE DETAILS
# ============================================================

@app.get("/api/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: UUID,
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
                    ON w.id = wm.workspace_id

                WHERE w.id = :workspace_id
                  AND wm.user_id = :user_id
            """),
            {
                "workspace_id": workspace_id,
                "user_id": UUID(user["id"])
            }
        )

        workspace = result.mappings().first()

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found"
        )

    return {
        "id": str(workspace["id"]),
        "name": workspace["name"],
        "role": workspace["role"]
    }


# ============================================================
# GET WORKSPACE MEMBERS
# ============================================================

@app.get("/api/workspaces/{workspace_id}/members")
async def get_workspace_members(
    workspace_id: UUID,
    user=Depends(get_current_user)
):

    with engine.connect() as connection:

        membership = connection.execute(
            text("""
                SELECT role
                FROM public.workspace_members

                WHERE workspace_id = :workspace_id
                  AND user_id = :user_id
            """),
            {
                "workspace_id": workspace_id,
                "user_id": UUID(user["id"])
            }
        ).first()

        if not membership:
            raise HTTPException(
                status_code=403,
                detail="You are not a member of this workspace"
            )

        members = connection.execute(
            text("""
                SELECT
                    user_id,
                    role,
                    created_at

                FROM public.workspace_members

                WHERE workspace_id = :workspace_id

                ORDER BY created_at
            """),
            {
                "workspace_id": workspace_id
            }
        ).mappings().all()

    return [
        {
            "user_id": str(member["user_id"]),
            "role": member["role"],
            "joined_at": (
                member["created_at"].isoformat()
                if member["created_at"]
                else None
            )
        }
        for member in members
    ]


# ============================================================
# CREATE WORKSPACE INVITATION
# ============================================================

@app.post(
    "/api/workspaces/{workspace_id}/invitations",
    status_code=201
)
async def create_invitation(
    workspace_id: UUID,
    invitation: InvitationCreate,
    user=Depends(get_current_user)
):

    # Only faculty and editor roles can be invited.

    if invitation.role not in ("faculty", "editor"):
        raise HTTPException(
            status_code=422,
            detail="Role must be faculty or editor"
        )

    email = invitation.email.lower().strip()

    # Generate secure invitation token.

    token = secrets.token_urlsafe(32)

    # Store only its SHA-256 hash.

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    # Invitation expires after seven days.

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(days=7)
    )

    with engine.begin() as connection:

        # Check administrator permissions.

        admin = connection.execute(
            text("""
                SELECT 1

                FROM public.workspace_members

                WHERE workspace_id = :workspace_id
                  AND user_id = :user_id
                  AND role = 'admin'
            """),
            {
                "workspace_id": workspace_id,
                "user_id": UUID(user["id"])
            }
        ).first()

        if not admin:
            raise HTTPException(
                status_code=403,
                detail="Only workspace admins can invite members"
            )

        # Check for an existing active invitation.

        existing = connection.execute(
            text("""
                SELECT id

                FROM public.workspace_invitations

                WHERE workspace_id = :workspace_id
                  AND LOWER(email) = :email
                  AND status = 'pending'
                  AND expires_at > NOW()
            """),
            {
                "workspace_id": workspace_id,
                "email": email
            }
        ).first()

        if existing:
            raise HTTPException(
                status_code=409,
                detail="An active invitation already exists"
            )

        # Save invitation.

        connection.execute(
            text("""
                INSERT INTO public.workspace_invitations
                (
                    workspace_id,
                    email,
                    role,
                    token_hash,
                    invited_by,
                    expires_at
                )

                VALUES
                (
                    :workspace_id,
                    :email,
                    :role,
                    :token_hash,
                    :invited_by,
                    :expires_at
                )
            """),
            {
                "workspace_id": workspace_id,
                "email": email,
                "role": invitation.role,
                "token_hash": token_hash,
                "invited_by": UUID(user["id"]),
                "expires_at": expires_at
            }
        )

    # Generate invitation URL.

    invitation_link = (
        f"{FRONTEND_URL}/?invite={quote(token)}"
    )

    return {
        "message": "Invitation created successfully",
        "invitation_link": invitation_link,
        "expires_at": expires_at.isoformat()
    }


# ============================================================
# ACCEPT WORKSPACE INVITATION
# ============================================================

@app.post("/api/invitations/accept")
async def accept_invitation(
    token: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user=Depends(get_current_user)
):

    # --------------------------------------------------------
    # STEP 1: Verify the user's email using Supabase Auth
    # --------------------------------------------------------

    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase authentication is not configured"
        )

    async with httpx.AsyncClient(timeout=10) as client:

        try:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": (
                        f"Bearer {credentials.credentials}"
                    ),
                    "apikey": SUPABASE_PUBLISHABLE_KEY
                }
            )

        except httpx.RequestError:
            raise HTTPException(
                status_code=503,
                detail="Authentication service unavailable"
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    verified_user = response.json()

    # Ensure the verified identity matches the authenticated user.

    if verified_user.get("id") != user["id"]:
        raise HTTPException(
            status_code=401,
            detail="Authentication identity mismatch"
        )

    if not verified_user.get("email_confirmed_at"):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before accepting invitations"
        )

    user_email = (
        verified_user.get("email") or ""
    ).lower().strip()

    if not user_email:
        raise HTTPException(
            status_code=403,
            detail="Your account must have a verified email"
        )

    # --------------------------------------------------------
    # STEP 2: Validate invitation token
    # --------------------------------------------------------

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    # --------------------------------------------------------
    # STEP 3: Accept invitation in a transaction
    # --------------------------------------------------------

    with engine.begin() as connection:

        invitation = connection.execute(
            text("""
                SELECT
                    id,
                    workspace_id,
                    email,
                    role

                FROM public.workspace_invitations

                WHERE token_hash = :token_hash
                  AND status = 'pending'
                  AND expires_at > NOW()

                FOR UPDATE
            """),
            {
                "token_hash": token_hash
            }
        ).mappings().first()

        if not invitation:
            raise HTTPException(
                status_code=404,
                detail="Invitation invalid or expired"
            )

        # Invitation email must match the logged-in user.

        if invitation["email"].lower() != user_email:
            raise HTTPException(
                status_code=403,
                detail="This invitation belongs to another email"
            )

        # Prevent duplicate workspace membership.

        existing_member = connection.execute(
            text("""
                SELECT 1

                FROM public.workspace_members

                WHERE workspace_id = :workspace_id
                  AND user_id = :user_id
            """),
            {
                "workspace_id": invitation["workspace_id"],
                "user_id": UUID(user["id"])
            }
        ).first()

        if existing_member:
            raise HTTPException(
                status_code=409,
                detail="You are already a member of this workspace"
            )

        # Add invited user to workspace.

        connection.execute(
            text("""
                INSERT INTO public.workspace_members
                (
                    workspace_id,
                    user_id,
                    role
                )

                VALUES
                (
                    :workspace_id,
                    :user_id,
                    :role
                )
            """),
            {
                "workspace_id": invitation["workspace_id"],
                "user_id": UUID(user["id"]),
                "role": invitation["role"]
            }
        )

        # Mark invitation as accepted.

        connection.execute(
            text("""
                UPDATE public.workspace_invitations

                SET status = 'accepted',
                    accepted_at = NOW()

                WHERE id = :invitation_id
            """),
            {
                "invitation_id": invitation["id"]
            }
        )

    return {
        "message": "Invitation accepted successfully",
        "workspace_id": str(invitation["workspace_id"])
    }