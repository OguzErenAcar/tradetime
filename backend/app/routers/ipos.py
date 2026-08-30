from fastapi import APIRouter

from app import ipo, schemas

router = APIRouter(prefix="/ipos", tags=["ipos"])


@router.get("", response_model=list[schemas.IpoOut])
def list_ipos():
    return ipo.get_ipos()
