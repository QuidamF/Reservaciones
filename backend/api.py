import pytz
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from typing import List
import datetime
from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

import crud
import models
import auth
import google_calendar
from database import SessionLocal
import globals

router = APIRouter()

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_calendar_service():
    """
    Dependency to get an authorized Google Calendar service instance.
    If not authorized, raises an exception.
    """
    service = google_calendar.get_calendar_service()
    if service is None:
        raise HTTPException(status_code=401, detail="Not authenticated. Please visit /auth/google to authorize.")
    return service

# Pydantic model for initial admin user creation
class InitialAdminUser(models.BaseModel):
    username: str
    password: str

@router.post("/initial-setup", response_model=models.UserInDB)
def create_initial_admin_user(user_data: InitialAdminUser, db: Session = Depends(get_db)):
    if not globals.initial_admin_setup_needed:
        # This endpoint should not be called if setup is not needed.
        # The frontend should prevent this.
        raise HTTPException(status_code=400, detail="Initial setup is not required.")

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
    globals.initial_admin_setup_needed = False # Mark setup as complete
    return created_user



@router.get("/initial-setup", response_model=models.SetupStatus)
def initial_setup_status():
    return {"setup_needed": globals.initial_admin_setup_needed}


@router.post("/token", response_model=auth.Token)
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

@router.post("/users", response_model=models.UserInDB)
def create_user(user: models.UserCreate, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

@router.get("/users", response_model=List[models.UserInDB])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.put("/users/{user_id}", response_model=models.UserInDB)
def update_user(user_id: int, user_updates: models.UserUpdate, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, user=db_user, updates=user_updates)

@router.delete("/users/{user_id}", response_model=models.UserInDB)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.delete_user(db=db, user=db_user)

@router.get("/users/me", response_model=models.UserInDB)
async def read_users_me(current_user: models.UserInDB = Depends(auth.get_current_active_user)):
    return current_user

@router.post("/config", response_model=models.AvailabilityConfig)
def create_availability_config(config: models.AvailabilityConfig, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_config = crud.get_config(db)
    if db_config:
        raise HTTPException(status_code=400, detail="Configuration already exists. Use PUT to update.")
    crud.create_config(db=db, config=config)
    return config

@router.get("/config", response_model=models.AvailabilityConfig)
def read_availability_config(db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_config = crud.get_config(db)
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found.")
    return models.AvailabilityConfig.parse_obj(db_config.data)

@router.put("/config", response_model=models.AvailabilityConfig)
def update_availability_config(config: models.AvailabilityConfig, db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    db_config = crud.update_config(db=db, config=config)
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found.")
    return models.AvailabilityConfig.parse_obj(db_config.data)

@router.delete("/config")
def delete_availability_config(db: Session = Depends(get_db), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    crud.delete_config(db)
    return {"message": "Configuration deleted successfully."}

@router.get("/availability")
def get_availability(start_date: datetime.date, end_date: datetime.date, timezone: str, service = Depends(get_calendar_service), db: Session = Depends(get_db)):
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

@router.post("/book")
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

@router.get("/events")
def get_events(start_date: datetime.date, end_date: datetime.date, timezone: str, service = Depends(get_calendar_service), current_user: models.UserInDB = Depends(auth.get_current_admin_user)):
    try:
        user_tz = pytz.timezone(timezone)
    except pytz.UnknownTimeZoneError:
        raise HTTPException(status_code=400, detail="Invalid timezone")

    time_min = user_tz.localize(datetime.datetime.combine(start_date, datetime.time.min))
    time_max = user_tz.localize(datetime.datetime.combine(end_date, datetime.time.max))
    
    events = google_calendar.get_events(service, time_min, time_max)
    return {"events": events}
