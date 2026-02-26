import os
import time
from typing import Any, Dict, Optional, Tuple

import jwt
import requests
from fastapi import HTTPException, status

# Cache JWKS for a bit so we don't hit Supabase every request
_JWKS_CACHE: Optional[Dict[str, Any]] = None
_JWKS_CACHE_SET_AT: float = 0.0
_JWKS_TTL_SECONDS = 60 * 30  # 30 minutes


def _get_supabase_config() -> Tuple[str, str]:
    supabase_url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url:
        raise RuntimeError("SUPABASE_URL is not set")
    if not anon_key:
        raise RuntimeError("SUPABASE_ANON_KEY is not set")
    return supabase_url.rstrip("/"), anon_key


def _fetch_jwks() -> Dict[str, Any]:
    supabase_url, anon_key = _get_supabase_config()
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }

    resp = requests.get(jwks_url, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _get_jwks() -> Dict[str, Any]:
    global _JWKS_CACHE, _JWKS_CACHE_SET_AT
    now = time.time()
    if _JWKS_CACHE is None or (now - _JWKS_CACHE_SET_AT) > _JWKS_TTL_SECONDS:
        _JWKS_CACHE = _fetch_jwks()
        _JWKS_CACHE_SET_AT = now
    return _JWKS_CACHE


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    supabase_url, _anon_key = _get_supabase_config()

    issuer = f"{supabase_url}/auth/v1"
    audience = "authenticated"

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing kid")

        jwks = _get_jwks()
        jwk_set = jwt.PyJWKSet.from_dict(jwks)

        pyjwk = None
        for k in jwk_set.keys:
            if k.key_id == kid:
                pyjwk = k
                break

        if pyjwk is None:
            # Key rotation: refresh once and try again
            global _JWKS_CACHE
            _JWKS_CACHE = _fetch_jwks()
            jwk_set = jwt.PyJWKSet.from_dict(_JWKS_CACHE)
            for k in jwk_set.keys:
                if k.key_id == kid:
                    pyjwk = k
                    break

        if pyjwk is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signing key not found")

        public_key = pyjwk.key
        alg = header.get("alg")
        if not alg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing alg")

        payload = jwt.decode(
            token,
            public_key,
            algorithms=[alg],
            audience=audience,
            issuer=issuer,
        )
        return payload

    except requests.HTTPError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"JWKS fetch failed: {e}")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

from dataclasses import dataclass
from fastapi import Header

@dataclass
class CurrentUser:
    id: str
    token: str
    claims: Dict[str, Any]

def get_bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
        )
    return authorization.split(" ", 1)[1].strip()

async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    token = get_bearer_token(authorization)
    claims = verify_supabase_jwt(token)

    # Supabase puts the user id in the "sub" claim for JWTs
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub",
        )

    return CurrentUser(id=user_id, token=token, claims=claims)