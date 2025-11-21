from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from typing import List, Dict, Any, Optional
import datetime
from datetime import timedelta

from models import AvailabilityConfig
import google_calendar

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

# In-memory storage for configuration and state
db: Dict[str, Any] = {
    "config": None,
    "google_auth_state": None
}

# --- Google Calendar Integration ---

@app.get("/auth/google")
def auth_google():
    """
    Initiates the Google authentication flow by redirecting the user.
    """
    try:
        flow = google_calendar.get_google_auth_flow()
        authorization_url, state = google_calendar.get_google_auth_url(flow)
        
        # Store the state so we can verify it in the callback
        db["google_auth_state"] = state
        
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


@app.post("/config")
def configure_availability(config: AvailabilityConfig):
    """
    Endpoint to set or update the owner's availability configuration.
    """
    db["config"] = config
    return {"message": "Configuration saved successfully."}


@app.get("/availability")
def get_availability(start_date: datetime.date, end_date: datetime.date, service = Depends(get_calendar_service)):
    """
    Endpoint to get available appointment slots within a date range,
    checking against the user's Google Calendar.
    """
    if not db["config"]:
        raise HTTPException(status_code=404, detail="Configuration not found. Please set the availability rules first.")

    config: AvailabilityConfig = db["config"]
    available_slots = []
    
    # Get busy times from Google Calendar
    time_min = datetime.datetime.combine(start_date, datetime.time.min)
    time_max = datetime.datetime.combine(end_date, datetime.time.max)
    busy_times = google_calendar.get_busy_times(service, time_min, time_max)

    current_day = start_date
    while current_day <= end_date:
        rule_for_day = next((rule for rule in config.rules if rule.day_of_week == current_day.weekday()), None)

        if rule_for_day and rule_for_day.is_available:
            for work_hour_range in rule_for_day.work_hours:
                slot_start = datetime.datetime.combine(current_day, work_hour_range.start)
                slot_end = slot_start + timedelta(minutes=config.appointment_duration_minutes)
                
                work_period_end = datetime.datetime.combine(current_day, work_hour_range.end)

                while slot_end <= work_period_end:
                    # Check against breaks
                    is_in_break = False
                    if config.breaks:
                        for break_range in config.breaks:
                            break_start = datetime.datetime.combine(current_day, break_range.start)
                            break_end = datetime.datetime.combine(current_day, break_range.end)
                            if max(slot_start, break_start) < min(slot_end, break_end):
                                is_in_break = True
                                break
                    if is_in_break:
                        slot_start = slot_end
                        slot_end += timedelta(minutes=config.appointment_duration_minutes)
                        continue

                    # Check against Google Calendar busy times
                    is_busy = False
                    for busy in busy_times:
                        if max(slot_start, busy['start'].replace(tzinfo=None)) < min(slot_end, busy['end'].replace(tzinfo=None)):
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
def book_appointment(start_time: datetime.datetime, end_time: datetime.datetime, user_details: dict, service = Depends(get_calendar_service)):
    """
    Endpoint to book a new appointment by creating an event in Google Calendar.
    """
    if not db["config"]:
        raise HTTPException(status_code=404, detail="Configuration not found.")

    summary = f"Appointment with {user_details.get('name', 'New Client')}"
    description = f"Details: {user_details.get('details', 'No details provided.')}"
    
    created_event = google_calendar.create_event(service, start_time, end_time, summary, description)

    if created_event:
        return {"message": "Appointment booked successfully.", "appointment": created_event}
    else:
        raise HTTPException(status_code=500, detail="Failed to create calendar event.")


@app.get("/")
def read_root(code: Optional[str] = None, state: Optional[str] = None):
    """
    Welcome endpoint and Google OAuth callback handler.
    """
    if code and state:
        stored_state = db.get("google_auth_state")
        if not stored_state or stored_state != state:
            raise HTTPException(status_code=400, detail="Invalid state parameter.")

        try:
            flow = google_calendar.get_google_auth_flow()
            google_calendar.get_google_credentials_from_code(flow, code)
            db["google_auth_state"] = None # Clear state after successful use
            return {"message": "Authentication successful. You can now use the API."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An error occurred while fetching tokens: {e}")
    
    return {"message": "Welcome to the Appointment Scheduling API. Please see /docs for API details and google_auth.md for setup."}
