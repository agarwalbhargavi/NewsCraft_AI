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

import base64
import json
import hmac

from fastapi import Request
from fastapi.responses import RedirectResponse
from cryptography.fernet import Fernet
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
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

class NewsletterCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)

class ArticleCreate(BaseModel):
    heading: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=10)
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
    
# ============================================================
# CREATE NEWSLETTER
# ============================================================

@app.post(
    "/api/workspaces/{workspace_id}/newsletters",
    status_code=201
)
async def create_newsletter(
    workspace_id: UUID,
    newsletter: NewsletterCreate,
    user=Depends(get_current_user)
):
    title = newsletter.title.strip()

    if len(title) < 3:
        raise HTTPException(
            status_code=422,
            detail="Newsletter title must contain at least 3 characters"
        )

    with engine.begin() as connection:

        # Check workspace membership and role.
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
        ).mappings().first()

        if not membership:
            raise HTTPException(
                status_code=403,
                detail="You are not a member of this workspace"
            )

        # Faculty can view newsletters.
        # Admins and editors can create them.
        if membership["role"] not in ("admin", "editor"):
            raise HTTPException(
                status_code=403,
                detail="Only admins and editors can create newsletters"
            )

        result = connection.execute(
            text("""
                INSERT INTO public.newsletters
                    (workspace_id, title, status)
                VALUES
                    (:workspace_id, :title, 'draft')
                RETURNING id, workspace_id, title, status, created_at
            """),
            {
                "workspace_id": workspace_id,
                "title": title
            }
        )

        created = result.mappings().one()

    return {
        "id": str(created["id"]),
        "workspace_id": str(created["workspace_id"]),
        "title": created["title"],
        "status": created["status"],
        "created_at": (
            created["created_at"].isoformat()
            if created["created_at"]
            else None
        )
    }
    
    
# ============================================================
# LIST WORKSPACE NEWSLETTERS
# ============================================================

@app.get("/api/workspaces/{workspace_id}/newsletters")
async def list_newsletters(
    workspace_id: UUID,
    user=Depends(get_current_user)
):
    with engine.connect() as connection:

        membership = connection.execute(
            text("""
                SELECT 1
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

        result = connection.execute(
            text("""
                SELECT
                    id,
                    workspace_id,
                    title,
                    status,
                    created_at
                FROM public.newsletters
                WHERE workspace_id = :workspace_id
                ORDER BY created_at DESC, id DESC
            """),
            {
                "workspace_id": workspace_id
            }
        ).mappings().all()

    return [
        {
            "id": str(row["id"]),
            "workspace_id": str(row["workspace_id"]),
            "title": row["title"],
            "status": row["status"],
            "created_at": (
                row["created_at"].isoformat()
                if row["created_at"]
                else None
            )
        }
        for row in result
    ]
    
# ============================================================
# CREATE ARTICLE
# ============================================================

@app.post("/api/newsletters/{newsletter_id}/articles", status_code=201)
async def create_article(
    newsletter_id: UUID,
    article: ArticleCreate,
    user=Depends(get_current_user)
):
    heading = article.heading.strip()
    content = article.content.strip()

    if len(heading) < 3 or len(content) < 10:
        raise HTTPException(
            status_code=422,
            detail="Heading or content is too short"
        )

    with engine.begin() as connection:

        # Verify that the newsletter exists and the user
        # has permission to create articles in its workspace.
        membership = connection.execute(
            text("""
                SELECT wm.role
                FROM public.newsletters n
                JOIN public.workspace_members wm
                  ON wm.workspace_id = n.workspace_id
                WHERE n.id = :newsletter_id
                  AND wm.user_id = :user_id
            """),
            {
                "newsletter_id": newsletter_id,
                "user_id": UUID(user["id"])
            }
        ).mappings().first()

        if not membership:
            raise HTTPException(
                status_code=404,
                detail="Newsletter not found or access denied"
            )

        if membership["role"] not in ("admin", "editor"):
            raise HTTPException(
                status_code=403,
                detail="Only admins and editors can create articles"
            )

        result = connection.execute(
            text("""
                INSERT INTO public.articles
                    (newsletter_id, heading, content, status)
                VALUES
                    (:newsletter_id, :heading, :content, 'draft')
                RETURNING id, newsletter_id, heading,
                          content, status, created_at
            """),
            {
                "newsletter_id": newsletter_id,
                "heading": heading,
                "content": content
            }
        )

        created = result.mappings().one()

    return {
        "id": str(created["id"]),
        "newsletter_id": str(created["newsletter_id"]),
        "heading": created["heading"],
        "content": created["content"],
        "status": created["status"],
        "created_at": (
            created["created_at"].isoformat()
            if created["created_at"]
            else None
        )
    }
    
# ============================================================
# LIST ARTICLES
# ============================================================

@app.get("/api/newsletters/{newsletter_id}/articles")
async def list_articles(
    newsletter_id: UUID,
    user=Depends(get_current_user)
):
    with engine.connect() as connection:

        membership = connection.execute(
            text("""
                SELECT 1
                FROM public.newsletters n
                JOIN public.workspace_members wm
                  ON wm.workspace_id = n.workspace_id
                WHERE n.id = :newsletter_id
                  AND wm.user_id = :user_id
            """),
            {
                "newsletter_id": newsletter_id,
                "user_id": UUID(user["id"])
            }
        ).first()

        if not membership:
            raise HTTPException(
                status_code=404,
                detail="Newsletter not found or access denied"
            )

        articles = connection.execute(
            text("""
                SELECT
                    id,
                    newsletter_id,
                    heading,
                    content,
                    status,
                    created_at
                FROM public.articles
                WHERE newsletter_id = :newsletter_id
                ORDER BY created_at DESC, id DESC
            """),
            {
                "newsletter_id": newsletter_id
            }
        ).mappings().all()

    return [
        {
            "id": str(article["id"]),
            "newsletter_id": str(article["newsletter_id"]),
            "heading": article["heading"],
            "content": article["content"],
            "status": article["status"],
            "created_at": (
                article["created_at"].isoformat()
                if article["created_at"]
                else None
            )
        }
        for article in articles
    ]
    
# ============================================================
# GMAIL OAUTH CONFIGURATION
# ============================================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/gmail/callback"
)

GMAIL_ENCRYPTION_KEY = os.getenv("GMAIL_ENCRYPTION_KEY")

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]


def get_gmail_cipher():
    if not GMAIL_ENCRYPTION_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gmail encryption key is not configured"
        )

    return Fernet(GMAIL_ENCRYPTION_KEY.encode())


def create_google_flow():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials are not configured"
        )

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }

    return Flow.from_client_config(
        client_config,
        scopes=GMAIL_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )
    
# ============================================================
# CONNECT GMAIL
# ============================================================

@app.get("/api/gmail/connect")
async def connect_gmail(
    user=Depends(get_current_user)
):
    flow = create_google_flow()

    # Generate secure OAuth state.
    state = secrets.token_urlsafe(32)

    state_hash = hashlib.sha256(
        state.encode()
    ).hexdigest()

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=10)
    )

    # Generate PKCE verifier and challenge.
    verifier = secrets.token_urlsafe(64)

    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).decode().rstrip("=")

    with engine.begin() as connection:

        connection.execute(
            text("""
                INSERT INTO public.gmail_oauth_states
                    (state_hash, user_id, code_verifier, expires_at)
                VALUES
                    (:state_hash, :user_id, :code_verifier, :expires_at)
            """),
            {
                "state_hash": state_hash,
                "user_id": UUID(user["id"]),
                "code_verifier": verifier,
                "expires_at": expires_at
            }
        )

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="false",
        state=state,
        code_challenge=challenge,
        code_challenge_method="S256"
    )

    return {
        "authorization_url": authorization_url
    }
    
# ============================================================
# GMAIL OAUTH CALLBACK
# ============================================================

@app.get("/api/gmail/callback")
async def gmail_callback(
    request: Request
):
    state = request.query_params.get("state")
    code = request.query_params.get("code")
    oauth_error = request.query_params.get("error")

    if oauth_error:
        return RedirectResponse(
            f"{FRONTEND_URL}/?gmail=error"
        )

    if not state or not code:
        return RedirectResponse(
            f"{FRONTEND_URL}/?gmail=invalid"
        )

    state_hash = hashlib.sha256(
        state.encode()
    ).hexdigest()

    # Consume the state once, inside a transaction.
    with engine.begin() as connection:

        result = connection.execute(
            text("""
                DELETE FROM public.gmail_oauth_states
                WHERE state_hash = :state_hash
                  AND expires_at > NOW()
                RETURNING user_id, code_verifier
            """),
            {"state_hash": state_hash}
        ).mappings().first()

    if not result:
        return RedirectResponse(
            f"{FRONTEND_URL}/?gmail=expired"
        )

    flow = create_google_flow()

    try:
        # Exchange authorization code for Google tokens.
        flow.fetch_token(
            code=code,
            code_verifier=result["code_verifier"]
        )

        credentials = flow.credentials

        # Determine the authorized Gmail address.
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                headers={
                    "Authorization": f"Bearer {credentials.token}"
                }
            )

        response.raise_for_status()

        gmail_email = response.json()["emailAddress"]

        refresh_token = credentials.refresh_token

        # If Google doesn't return a new refresh token,
        # retain the existing encrypted token.
        encrypted_refresh_token = None

        if refresh_token:
            encrypted_refresh_token = (
                get_gmail_cipher()
                .encrypt(refresh_token.encode())
                .decode()
            )

        with engine.begin() as connection:

            connection.execute(
                text("""
                    INSERT INTO public.gmail_connections
                        (
                            user_id,
                            gmail_email,
                            encrypted_refresh_token
                        )
                    VALUES
                        (
                            :user_id,
                            :gmail_email,
                            :encrypted_refresh_token
                        )
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        gmail_email = EXCLUDED.gmail_email,
                        encrypted_refresh_token =
                            CASE
                                WHEN LOWER(gmail_connections.gmail_email)
                                    = LOWER(EXCLUDED.gmail_email)
                                THEN COALESCE(
                                    EXCLUDED.encrypted_refresh_token,
                                    gmail_connections.encrypted_refresh_token
                                )
                                ELSE EXCLUDED.encrypted_refresh_token
                            END,
                        updated_at = NOW()
                """),
                {
                    "user_id": result["user_id"],
                    "gmail_email": gmail_email,
                    "encrypted_refresh_token": encrypted_refresh_token
                }
            )

    except Exception:
        return RedirectResponse(
            f"{FRONTEND_URL}/?gmail=failed"
        )

    return RedirectResponse(
        f"{FRONTEND_URL}/?gmail=connected"
    )
    
# ============================================================
# GMAIL CONNECTION STATUS
# ============================================================

@app.get("/api/gmail/status")
async def gmail_status(
    user=Depends(get_current_user)
):
    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    gmail_email,
                    encrypted_refresh_token IS NOT NULL AS has_refresh_token
                FROM public.gmail_connections
                WHERE user_id = :user_id
            """),
            {
                "user_id": UUID(user["id"])
            }
        ).mappings().first()

    if not result:
        return {
            "connected": False,
            "email": None
        }

    return {
        "connected": bool(result["has_refresh_token"]),
        "email": result["gmail_email"]
        if result["has_refresh_token"]
        else None
    }
    
# ============================================================
# LIST GMAIL MESSAGES
# ============================================================

@app.get("/api/gmail/messages")
async def list_gmail_messages(
    user=Depends(get_current_user)
):
    with engine.connect() as connection:
        gmail = connection.execute(
            text("""
                SELECT encrypted_refresh_token
                FROM public.gmail_connections
                WHERE user_id = :user_id
            """),
            {"user_id": UUID(user["id"])}
        ).mappings().first()

    if not gmail or not gmail["encrypted_refresh_token"]:
        raise HTTPException(
            status_code=400,
            detail="Connect Gmail before viewing messages"
        )

    refresh_token = get_gmail_cipher().decrypt(
        gmail["encrypted_refresh_token"].encode()
    ).decode()

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=GMAIL_SCOPES
    )

    try:
        credentials.refresh(GoogleRequest())

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={
                    "Authorization": f"Bearer {credentials.token}"
                },
                params={"maxResults": 20}
            )

            response.raise_for_status()
            message_ids = response.json().get("messages", [])

            messages = []

            for item in message_ids:
                detail = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{item['id']}",
                    headers={
                        "Authorization": f"Bearer {credentials.token}"
                    },
                    params={
                        "format": "metadata",
                        "metadataHeaders": [
                            "From",
                            "Subject",
                            "Date"
                        ]
                    }
                )

                detail.raise_for_status()
                data = detail.json()

                headers = {
                    header["name"].lower(): header["value"]
                    for header in data.get("payload", {}).get("headers", [])
                }

                messages.append({
                    "id": item["id"],
                    "from": headers.get("from", "Unknown"),
                    "subject": headers.get("subject", "(No Subject)"),
                    "date": headers.get("date", ""),
                    "snippet": data.get("snippet", "")
                })

        return {"messages": messages}

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve Gmail messages"
        )