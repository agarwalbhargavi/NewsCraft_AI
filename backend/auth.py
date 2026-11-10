import os

import httpx
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing")

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
                },
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=503,
                detail="Authentication service unavailable"
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )

    user = response.json()

    return {
        "id": user["id"],
        "email": user.get("email"),
    }