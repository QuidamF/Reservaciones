import pytz
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.responses import RedirectResponse
from typing import List, Dict, Any, Optional
import datetime
from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

import crud
import models
import auth
import google_calendar
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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

# Global flag to check if initial admin setup is needed
initial_admin_setup_needed = False
default_config_created = False

@app.on_event("startup")
async def startup_event():
    global initial_admin_setup_needed
    global default_config_created
    db = SessionLocal()
    try:
        # Check if any users exist
        user_count = crud.get_users_count(db)
        if user_count == 0:
            initial_admin_setup_needed = True

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
            default_config_created = True
            print("Default configuration created.")
    finally:
        db.close()

@app.post("/token", response_model=auth.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users", response_model=models.UserInDB)
def create_user(user: models.UserCreate, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users", response_model=List[models.UserInDB])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.put("/users/{user_id}", response_model=models.UserInDB)
def update_user(user_id: int, user_updates: models.UserUpdate, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, user=db_user, updates=user_updates)

@app.delete("/users/{user_id}", response_model=models.UserInDB)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.delete_user(db=db, user=db_user)

@app.get("/users/me", response_model=models.UserInDB)
async def read_users_me(current_user: models.UserInDB = Depends(auth.get_current_active_user)):
    return current_user

# Pydantic model for initial admin user creation
class InitialAdminUser(models.BaseModel):
    username: str
    password: str

@app.post("/initial-setup", response_model=models.UserInDB)
def create_initial_admin_user(user_data: InitialAdminUser, db: Session = Depends(get_db)):
    global initial_admin_setup_needed
    if not initial_admin_setup_needed:
        return RedirectResponse(url="/login", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    
    # Create the admin user
    admin_user_create = models.UserCreate(
        username=user_data.username,
        password=user_data.password,
        is_admin=True
    )
    db_user = crud.get_user_by_username(db, username=admin_user_create.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered.")
    
    created_user = crud.create_user(db=db, user=admin_user_create)
    initial_admin_setup_needed = False # Mark setup as complete
    return created_user

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

def get_calendar_service():
    """
    Dependency to get an authorized Google Calendar service instance.
    If not authorized, raises an exception.
    """
    service = google_calendar.get_calendar_service()
    if service is None:
        raise HTTPException(status_code=401, detail="Not authenticated. Please visit /auth/google to authorize.")
    return service

@app.post("/config", response_model=models.AvailabilityConfig)
def create_availability_config(config: models.AvailabilityConfig, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_config = crud.get_config(db)
    if db_config:
        raise HTTPException(status_code=400, detail="Configuration already exists. Use PUT to update.")
    crud.create_config(db=db, config=config)
    return config

@app.get("/config", response_model=models.AvailabilityConfig)
def read_availability_config(db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_config = crud.get_config(db)
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found.")
    return models.AvailabilityConfig.parse_obj(db_config.data)

@app.put("/config", response_model=models.AvailabilityConfig)
def update_availability_config(config: models.AvailabilityConfig, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_config = crud.update_config(db=db, config=config)
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found.")
    return models.AvailabilityConfig.parse_obj(db_config.data)

@app.delete("/config")
def delete_availability_config(db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    crud.delete_config(db)
    return {"message": "Configuration deleted successfully."}

@app.get("/availability")
def get_availability(start_date: datetime.date, end_date: datetime.date, timezone: str, service = Depends(get_calendar_service), db: Session = Depends(get_db)):
    # This endpoint can be public, but it needs a configuration to work
    db_config = crud.get_config(db)
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found. Please set the availability rules first.")

    config = models.AvailabilityConfig.parse_obj(db_config.data)
    available_slots = []
    
    try:
        user_tz = pytz.timezone(timezone)
    except pytz.UnknownTimeZoneError:
        raise HTTPException(status_code=400, detail="Invalid timezone")

    time_min = user_tz.localize(datetime.datetime.combine(start_date, datetime.time.min))
    time_max = user_tz.localize(datetime.datetime.combine(end_date, datetime.time.max))
    busy_times = google_calendar.get_busy_times(service, time_min, time_max)

    current_day = start_date
    while current_day <= end_date:
        rule_for_day = next((rule for rule in config.rules if rule.day_of_week == current_day.weekday()), None)

        if rule_for_day and rule_for_day.is_available:
            for work_hour_range in rule_for_day.work_hours:
                slot_start = user_tz.localize(datetime.datetime.combine(current_day, work_hour_range.start))
                slot_end = slot_start + timedelta(minutes=config.appointment_duration_minutes)
                
                work_period_end = user_tz.localize(datetime.datetime.combine(current_day, work_hour_range.end))

                while slot_end <= work_period_end:
                    is_in_break = False
                    if config.breaks:
                        for break_range in config.breaks:
                            break_start = user_tz.localize(datetime.datetime.combine(current_day, break_range.start))
                            break_end = user_tz.localize(datetime.datetime.combine(current_day, break_range.end))
                            if max(slot_start, break_start) < min(slot_end, break_end):
                                is_in_break = True
                                break
                    if is_in_break:
                        slot_start = slot_end
                        slot_end += timedelta(minutes=config.appointment_duration_minutes)
                        continue

                    is_busy = False
                    for busy in busy_times:
                        busy_start = busy['start'].astimezone(user_tz)
                        busy_end = busy['end'].astimezone(user_tz)
                        if max(slot_start, busy_start) < min(slot_end, busy_end):
                            is_busy = True
                            break
                    
                    if not is_busy:
                        available_slots.append({
                            "start_time": slot_start.isoformat(),
                            "end_time": slot_end.isoformat(),
                        })

                    slot_start = slot_end
                    slot_end += timedelta(minutes=config.appointment_duration_minutes)

        current_day += timedelta(days=1)

    return {"available_slots": available_slots}

@app.post("/book")
def book_appointment(booking_request: models.BookingRequest, service = Depends(get_calendar_service), db: Session = Depends(get_db)):
    db_config = crud.get_config(db)
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found.")

    summary = f"Appointment with {booking_request.user_details.get('name', 'New Client')}"
    description = f"Details: {booking_request.user_details.get('details', 'No details provided.')}"
    
    timezone = str(booking_request.start_time.tzinfo)
    created_event = google_calendar.create_event(service, booking_request.start_time, booking_request.end_time, summary, description, timezone=timezone)

    if created_event:
        return {"message": "Appointment booked successfully.", "appointment": created_event}
    else:
        raise HTTPException(status_code=500, detail="Failed to create calendar event.")

@app.get("/events")
def get_events(start_date: datetime.date, end_date: datetime.date, timezone: str, service = Depends(get_calendar_service), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    try:
        user_tz = pytz.timezone(timezone)
    except pytz.UnknownTimeZoneError:
        raise HTTPException(status_code=400, detail="Invalid timezone")

    time_min = user_tz.localize(datetime.datetime.combine(start_date, datetime.time.min))
    time_max = user_tz.localize(datetime.datetime.combine(end_date, datetime.time.max))
    
    events = google_calendar.get_events(service, time_min, time_max)
    return {"events": events}

@app.get("/initial-setup")
def initial_setup_redirect():
    if not initial_admin_setup_needed:
        return RedirectResponse(url="/login", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    # This will be handled by the frontend, just a placeholder for redirection
    return {"message": "Please complete initial admin setup."}

@app.get("/")
def read_root(code: Optional[str] = None, state: Optional[str] = None):
    """
    Welcome endpoint and Google OAuth callback handler.
    """
    global initial_admin_setup_needed
    global google_auth_state
    if initial_admin_setup_needed:
        return RedirectResponse(url="/initial-setup", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    
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
