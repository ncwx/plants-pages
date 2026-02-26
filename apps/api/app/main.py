from dotenv import load_dotenv
load_dotenv()

from app.routers.books import router as books_router

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Plants & Pages API")

app.include_router(books_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .deps import get_current_user

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role"),
    }