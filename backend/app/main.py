# backend/app/main.py
from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel

# Import routers
from app.api.v1.endpoints import voice_processing, samples, ai_suggestions, exports, billing # Added billing router
# from app.api.v1.endpoints import auth as auth_router # Assuming auth.py will be created for token endpoint
from app.core.config import settings # Import settings for Firebase credentials path

# Initialize Firebase Admin SDK
# This should be done once when the application starts.
if not firebase_admin._apps:
    try:
        if settings.FIREBASE_CREDENTIALS_PATH:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized with service account file.")
        else:
            firebase_admin.initialize_app()
            print("Firebase Admin SDK initialized with Application Default Credentials.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")

app = FastAPI(
    title="Cowriter API",
    description="API for the Cowriter application, supporting songwriting and collaboration.",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cowriter-frontend.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
 )

# Include API routers
# app.include_router(auth_router.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"]) # Example if auth.py exists

app.include_router(voice_processing.router, prefix=f"{settings.API_V1_STR}/process", tags=["Voice Processing"])
app.include_router(samples.router, prefix=f"{settings.API_V1_STR}/samples", tags=["Samples"])
app.include_router(ai_suggestions.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Suggestions"])
app.include_router(exports.router, prefix=f"{settings.API_V1_STR}/exports", tags=["Exports"])
app.include_router(billing.router, prefix=f"{settings.API_V1_STR}/billing", tags=["Billing"])

# Direct samples endpoint for frontend connection
class Sample(BaseModel):
    id: int
    name: str
    content: str

@app.get("/api/samples", response_model=List[Sample])
async def get_samples():
    # For testing, return some dummy data
    return [
        {"id": 1, "name": "Sample 1", "content": "This is sample content 1"},
        {"id": 2, "name": "Sample 2", "content": "This is sample content 2"}
    ]

@app.get("/", summary="Root endpoint for health check")
async def read_root():
    return {"message": "Welcome to the Cowriter API!"}

# Further configurations, middleware, event handlers can be added below
