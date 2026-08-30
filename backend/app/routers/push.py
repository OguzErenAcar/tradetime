import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.push import VAPID_CONTACT_EMAIL

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", response_model=schemas.VapidPublicKeyResponse)
def get_vapid_public_key():
    return {"public_key": os.getenv("VAPID_PUBLIC_KEY", "")}


@router.post("/subscribe", status_code=201)
def subscribe(payload: schemas.PushSubscriptionCreate, db: Session = Depends(get_db)):
    crud.upsert_push_subscription(db, payload)
    return {"status": "ok"}


@router.post("/unsubscribe", status_code=204)
def unsubscribe(payload: schemas.PushSubscriptionDelete, db: Session = Depends(get_db)):
    crud.delete_push_subscription(db, payload.endpoint)


@router.get("/status")
def push_status():
    return {"configured": bool(VAPID_CONTACT_EMAIL)}
