import pytz
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.responses import RedirectResponse
from typing import List, Dict, Any, Optional
import datetime
from datetime import timedelta
from sqlalchemy.orm import Session

import crud
import models
import auth
import google_calendar
from database import SessionLocal, engine
from api import router as api_router
import globals

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(api_router, prefix="/api/v1")

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",  # Assuming frontend runs on Vite's default port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        # Check if any users exist
        user_count = crud.get_users_count(db)
        if user_count == 0:
            globals.initial_admin_setup_needed = True

        # Check if a configuration exists, if not, create a default one
        existing_config = crud.get_config(db)
        if not existing_config:
            default_config = models.AvailabilityConfig(
                rules=[
                    models.AvailabilityRule(day_of_week=0, is_available=True, work_hours=[models.TimeRange(start=datetime.time(9,0), end=datetime.time(17,0))]),
                    models.AvailabilityRule(day_of_week=1, is_available=True, work_hours=[models.TimeRange(start=datetime.time(9,0), end=datetime.time(17,0))]),
                    models.AvailabilityRule(day_of_week=2, is_available=True, work_hours=[models.TimeRange(start=datetime.time(9,0), end=datetime.time(17,0))]),
                    models.AvailabilityRule(day_of_week=3, is_available=True, work_hours=[models.TimeRange(start=datetime.time(9,0), end=datetime.time(17,0))]),
                    models.AvailabilityRule(day_of_week=4, is_available=True, work_hours=[models.TimeRange(start=datetime.time(9,0), end=datetime.time(17,0))]),
                    models.AvailabilityRule(day_of_week=5, is_available=False, work_hours=[]),
                    models.AvailabilityRule(day_of_week=6, is_available=False, work_hours=[]),
                ],
                breaks=[models.BreakRule(start=datetime.time(12,0), end=datetime.time(13,0))],
                appointment_duration_minutes=60
            )
            crud.create_config(db=db, config=default_config)
            print("Default configuration created.")
    finally:
        db.close()

google_auth_state = None

# --- Google Calendar Integration ---

@app.get("/auth/google")
def auth_google():
    """
    Initiates the Google authentication flow by redirecting the user.
    """
    global google_auth_state
    try:
        flow = google_calendar.get_google_auth_flow()
        authorization_url, state = google_calendar.get_google_auth_url(flow)
        
        google_auth_state = state
        
        return RedirectResponse(authorization_url)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e) + " Please refer to google_auth.md for instructions.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during authentication: {e}")

@app.get("/")
def read_root(code: Optional[str] = None, state: Optional[str] = None):
    """
    Welcome endpoint and Google OAuth callback handler.
    """
    global google_auth_state

    
    if code and state:
        if not google_auth_state or google_auth_state != state:
            raise HTTPException(status_code=400, detail="Invalid state parameter.")

        try:
            flow = google_calendar.get_google_auth_flow()
            google_calendar.get_google_credentials_from_code(flow, code)
            google_auth_state = None
            return {"message": "Authentication successful. You can now use the API."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An error occurred while fetching tokens: {e}")
    
    return {"message": "Welcome to the Appointment Scheduling API. Please see /docs for API details and google_auth.md for setup."}
