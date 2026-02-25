from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Plants & Pages API")

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

@app.get("/whoami")
def whoami(user=Depends(get_current_user)):
    # user contains JWT claims like sub, email, role, etc.
    return {
        "user_id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role"),
    }