import os
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from supabase import create_client

from app.auth import get_current_user, CurrentUser
from app.schemas.books import BookOut, BookCreate, UserBookOut, UserBookUpsert

router = APIRouter(prefix="/books", tags=["books"])

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

# anon client is fine for the public books catalogue (no RLS there)
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@router.get("", response_model=List[BookOut])
def list_books(
    q: Optional[str] = Query(default=None, description="Search title/author"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    query = (
        supabase.table("books")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("created_at", desc=True)
    )
    if q:
        query = query.or_(f"title.ilike.%{q}%,author.ilike.%{q}%")
    res = query.execute()
    return res.data or []


@router.get("/me/library")
def my_library(user: CurrentUser = Depends(get_current_user)):
    # IMPORTANT: use user's JWT so RLS policies on user_books apply
    authed = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    authed.postgrest.auth(user.token)

    res = (
        authed.table("user_books")
        .select("id,user_id,book_id,status,rating,notes,updated_at,books:books(id,title,author,cover_url)")
        .order("updated_at", desc=True)
        .execute()
    )
    return res.data or []


@router.delete("/me/library/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_library(book_id: UUID, user: CurrentUser = Depends(get_current_user)):
    authed = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    authed.postgrest.auth(user.token)

    authed.table("user_books").delete().eq("user_id", user.id).eq("book_id", str(book_id)).execute()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: UUID):
    res = supabase.table("books").select("*").eq("id", str(book_id)).limit(1).execute()
    data = res.data or []
    if len(data) == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    return data[0]


@router.post("", response_model=BookOut)
def create_book(payload: BookCreate):
    # MVP: open creation. Later: restrict to admin.
    res = supabase.table("books").insert(payload.model_dump()).execute()
    data = res.data or []
    if len(data) == 0:
        raise HTTPException(status_code=500, detail="Insert failed")
    return data[0]


@router.post("/{book_id}/save", response_model=UserBookOut)
def save_to_library(
    book_id: UUID,
    payload: UserBookUpsert,
    user: CurrentUser = Depends(get_current_user),
):
    # IMPORTANT: use user's JWT so RLS policies on user_books apply
    authed = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    authed.postgrest.auth(user.token)

    data = {
        "user_id": user.id,
        "book_id": str(book_id),
        **payload.model_dump(),
    }

    res = authed.table("user_books").upsert(data, on_conflict="user_id,book_id").execute()
    data_out = res.data or []
    if len(data_out) == 0:
        raise HTTPException(status_code=500, detail="Upsert failed")
    return data_out[0]