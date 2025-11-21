from pydantic import BaseModel
from typing import List, Optional
import datetime

class TimeRange(BaseModel):
    start: datetime.time
    end: datetime.time

class AvailabilityRule(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    is_available: bool = True
    work_hours: List[TimeRange] = []

class BreakRule(BaseModel):
    start: datetime.time
    end: datetime.time

class AvailabilityConfig(BaseModel):
    rules: List[AvailabilityRule]
    breaks: Optional[List[BreakRule]] = None
    appointment_duration_minutes: int = 60
