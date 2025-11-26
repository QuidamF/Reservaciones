from sqlalchemy.orm import Session
import models
import json
import auth

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: models.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, is_admin=user.is_admin)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user: models.User, updates: models.UserUpdate):
    if updates.password:
        user.hashed_password = auth.get_password_hash(updates.password)
    if updates.is_admin is not None:
        user.is_admin = updates.is_admin
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user: models.User):
    db.delete(user)
    db.commit()
    return user

def get_users_count(db: Session):
    return db.query(models.User).count()

def get_config(db: Session):
    return db.query(models.DbConfig).first()

def create_config(db: Session, config: models.AvailabilityConfig):
    db_config = models.DbConfig(data=json.loads(config.json()))
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

def update_config(db: Session, config: models.AvailabilityConfig):
    db_config = get_config(db)
    if db_config:
        db_config.data = json.loads(config.json())
        db.commit()
        db.refresh(db_config)
    return db_config

def delete_config(db: Session):
    db_config = get_config(db)
    if db_config:
        db.delete(db_config)
        db.commit()
    return db_config
