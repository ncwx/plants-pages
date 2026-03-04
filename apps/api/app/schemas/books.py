from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID

ReadingStatus = Literal["want_to_read", "reading", "finished", "dnf"]


class BookOut(BaseModel):
    id: UUID
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    cover_url: Optional[str] = None
    published_year: Optional[int] = None


class BookCreate(BaseModel):
    title: str = Field(min_length=1)
    author: Optional[str] = None
    description: Optional[str] = None
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    cover_url: Optional[str] = None
    published_year: Optional[int] = None


class UserBookOut(BaseModel):
    id: UUID
    user_id: UUID
    book_id: UUID
    status: ReadingStatus
    rating: Optional[int] = None
    notes: Optional[str] = None
    progress: int = 0 
    books: Optional[BookOut] = None


class UserBookUpsert(BaseModel):
    status: ReadingStatus = "want_to_read"
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)