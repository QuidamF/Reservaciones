from sqlalchemy import Column, Integer, JSON, String, Boolean
from database import Base

from pydantic import BaseModel
from typing import List, Optional
import datetime

class DbConfig(Base):
    __tablename__ = "config"
    id = Column(Integer, primary_key=True, index=True)
    data = Column(JSON)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    is_admin: bool = False

class UserInDB(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    password: Optional[str] = None
    is_admin: Optional[bool] = None

class TokenData(BaseModel):
    username: Optional[str] = None

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

class BookingRequest(BaseModel):
    start_time: datetime.datetime
    end_time: datetime.datetime
    user_details: dict
