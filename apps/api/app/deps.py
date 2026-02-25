from fastapi import Header, HTTPException, status
from .auth import verify_supabase_jwt


def get_current_user(authorization: str = Header(default="")):
    """
    Reads Authorization: Bearer <token>
    Returns decoded JWT claims.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
        )

    token = authorization.removeprefix("Bearer ").strip()
    return verify_supabase_jwt(token)