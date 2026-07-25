import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Literal

import jwt
from bcrypt import hashpw, gensalt, checkpw
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MIN = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
SEED_ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL")
SEED_ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="EventHub API")
api = APIRouter(prefix="/api")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("eventhub")


# ---------- helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> str:
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def hash_pw(pw: str) -> str:
    return hashpw(pw.encode("utf-8"), gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": now_utc() + timedelta(minutes=JWT_EXPIRE_MIN),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return _dep


# ---------- models ----------
Role = Literal["user", "organizer", "admin"]


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)
    role: Role = "user"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: Role
    created_at: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = ""
    category: str = "General"
    location: str = ""
    starts_at: str  # ISO
    price: float = 0.0
    capacity: int = 100
    cover_image: str = ""  # url or base64


class EventOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    location: str
    starts_at: str
    price: float
    capacity: int
    cover_image: str
    organizer_id: str
    organizer_name: str
    registered_count: int
    created_at: str


class RegistrationOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    ticket_code: str
    status: str
    created_at: str
    event: Optional[EventOut] = None


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class MessageOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str
    text: str
    created_at: str


class GalleryIn(BaseModel):
    image: str  # base64 or url
    caption: str = ""


class GalleryOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str
    image: str
    caption: str
    created_at: str


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class ReviewOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: str


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    event_id: Optional[str] = None
    read: bool
    created_at: str


def event_public(doc: dict, registered_count: int = 0) -> dict:
    return {
        "id": doc["id"],
        "title": doc["title"],
        "description": doc.get("description", ""),
        "category": doc.get("category", "General"),
        "location": doc.get("location", ""),
        "starts_at": to_iso(doc["starts_at"]),
        "price": float(doc.get("price", 0)),
        "capacity": int(doc.get("capacity", 0)),
        "cover_image": doc.get("cover_image", ""),
        "organizer_id": doc["organizer_id"],
        "organizer_name": doc.get("organizer_name", ""),
        "registered_count": registered_count,
        "created_at": to_iso(doc["created_at"]),
    }


async def push_notification(user_id: str, title: str, body: str, event_id: Optional[str] = None):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "body": body,
        "event_id": event_id,
        "read": False,
        "created_at": now_utc(),
    }
    await db.notifications.insert_one(doc)


# ---------- startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.events.create_index("starts_at")
    await db.registrations.create_index([("user_id", 1), ("event_id", 1)], unique=True)
    await db.registrations.create_index("ticket_code", unique=True)
    await db.messages.create_index([("event_id", 1), ("created_at", 1)])
    await db.gallery.create_index("event_id")
    await db.reviews.create_index([("user_id", 1), ("event_id", 1)], unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    # seed admin
    if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD:
        existing = await db.users.find_one({"email": SEED_ADMIN_EMAIL})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": SEED_ADMIN_EMAIL,
                "name": "Admin",
                "password": hash_pw(SEED_ADMIN_PASSWORD),
                "role": "admin",
                "created_at": now_utc(),
            })
            logger.info("Seeded admin: %s", SEED_ADMIN_EMAIL)

    # seed sample organizer + events if empty
    count = await db.events.count_documents({})
    if count == 0:
        org = await db.users.find_one({"email": "organizer@eventhub.app"})
        if not org:
            org_id = str(uuid.uuid4())
            await db.users.insert_one({
                "id": org_id,
                "email": "organizer@eventhub.app",
                "name": "Sample Organizer",
                "password": hash_pw("Organizer@12345"),
                "role": "organizer",
                "created_at": now_utc(),
            })
        else:
            org_id = org["id"]

        samples = [
            {
                "title": "Sunset Rooftop Jazz Night",
                "description": "An intimate live jazz performance under the stars with local wine tasting.",
                "category": "Music",
                "location": "The Rooftop, Downtown",
                "starts_at": now_utc() + timedelta(days=5),
                "price": 25.0,
                "capacity": 120,
                "cover_image": "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg?auto=compress&cs=tinysrgb&w=940",
            },
            {
                "title": "Startup Founders Meetup",
                "description": "Network with fellow founders, VCs, and hear inspiring pitches.",
                "category": "Business",
                "location": "Innovation Hub, Room 3B",
                "starts_at": now_utc() + timedelta(days=10),
                "price": 0.0,
                "capacity": 60,
                "cover_image": "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=940",
            },
            {
                "title": "Morning Yoga in the Park",
                "description": "Refresh your body and mind with a guided outdoor yoga session.",
                "category": "Wellness",
                "location": "Central Park, East Lawn",
                "starts_at": now_utc() + timedelta(days=2),
                "price": 10.0,
                "capacity": 40,
                "cover_image": "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=940",
            },
            {
                "title": "Indie Film Screening: Terracotta Dreams",
                "description": "A special screening followed by Q&A with the director.",
                "category": "Arts",
                "location": "The Grand Cinema",
                "starts_at": now_utc() + timedelta(days=15),
                "price": 15.0,
                "capacity": 200,
                "cover_image": "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=940",
            },
        ]
        for s in samples:
            await db.events.insert_one({
                "id": str(uuid.uuid4()),
                "organizer_id": org_id,
                "organizer_name": "Sample Organizer",
                "created_at": now_utc(),
                **s,
            })
        logger.info("Seeded %d sample events", len(samples))


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- auth ----------
@api.post("/auth/signup", response_model=TokenOut)
async def signup(body: SignupIn):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email already registered")
    if body.role == "admin":
        raise HTTPException(400, "Cannot self-register as admin")
    user = {
        "id": str(uuid.uuid4()),
        "email": body.email,
        "name": body.name,
        "password": hash_pw(body.password),
        "role": body.role,
        "created_at": now_utc(),
    }
    await db.users.insert_one(user)
    token = make_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "created_at": to_iso(user["created_at"]),
        },
    }


@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_pw(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "created_at": to_iso(user["created_at"]),
        },
    }


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "created_at": to_iso(user["created_at"]),
    }


# ---------- events ----------
@api.get("/events", response_model=List[EventOut])
async def list_events(category: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category and category.lower() != "all":
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    docs = await db.events.find(query, {"_id": 0}).sort("starts_at", 1).to_list(500)
    out = []
    for d in docs:
        rc = await db.registrations.count_documents({"event_id": d["id"]})
        out.append(event_public(d, rc))
    return out


@api.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: str):
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Event not found")
    rc = await db.registrations.count_documents({"event_id": event_id})
    return event_public(doc, rc)


@api.post("/events", response_model=EventOut)
async def create_event(body: EventIn, user: dict = Depends(require_role("organizer", "admin"))):
    doc = {
        "id": str(uuid.uuid4()),
        "organizer_id": user["id"],
        "organizer_name": user["name"],
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "location": body.location,
        "starts_at": body.starts_at,
        "price": float(body.price),
        "capacity": int(body.capacity),
        "cover_image": body.cover_image,
        "created_at": now_utc(),
    }
    await db.events.insert_one(doc)
    return event_public(doc, 0)


@api.put("/events/{event_id}", response_model=EventOut)
async def update_event(event_id: str, body: EventIn, user: dict = Depends(get_current_user)):
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Event not found")
    if doc["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not your event")
    updates = body.model_dump()
    updates["price"] = float(updates["price"])
    updates["capacity"] = int(updates["capacity"])
    await db.events.update_one({"id": event_id}, {"$set": updates})
    new = await db.events.find_one({"id": event_id}, {"_id": 0})
    rc = await db.registrations.count_documents({"event_id": event_id})
    # notify registered users
    regs = await db.registrations.find({"event_id": event_id}, {"_id": 0, "user_id": 1}).to_list(1000)
    for r in regs:
        await push_notification(r["user_id"], "Event updated", f"'{new['title']}' has been updated.", event_id)
    return event_public(new, rc)


@api.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Event not found")
    if doc["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not allowed")
    await db.events.delete_one({"id": event_id})
    await db.registrations.delete_many({"event_id": event_id})
    await db.messages.delete_many({"event_id": event_id})
    await db.gallery.delete_many({"event_id": event_id})
    await db.reviews.delete_many({"event_id": event_id})
    return {"ok": True}


@api.get("/my/events", response_model=List[EventOut])
async def my_events(user: dict = Depends(get_current_user)):
    docs = await db.events.find({"organizer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        rc = await db.registrations.count_documents({"event_id": d["id"]})
        out.append(event_public(d, rc))
    return out


# ---------- registrations / tickets ----------
@api.post("/events/{event_id}/register", response_model=RegistrationOut)
async def register(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(404, "Event not found")
    existing = await db.registrations.find_one({"event_id": event_id, "user_id": user["id"]}, {"_id": 0})
    if existing:
        return {**existing, "created_at": to_iso(existing["created_at"]), "event": event_public(event)}
    count = await db.registrations.count_documents({"event_id": event_id})
    if count >= event.get("capacity", 0):
        raise HTTPException(400, "Event is fully booked")
    reg = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "user_id": user["id"],
        "ticket_code": str(uuid.uuid4()),
        "status": "confirmed",
        "created_at": now_utc(),
    }
    await db.registrations.insert_one(reg)
    await push_notification(user["id"], "Ticket confirmed", f"You're registered for '{event['title']}'", event_id)
    await push_notification(event["organizer_id"], "New registration", f"{user['name']} joined '{event['title']}'", event_id)
    return {**reg, "created_at": to_iso(reg["created_at"]), "event": event_public(event, count + 1)}


@api.delete("/events/{event_id}/register")
async def cancel_reg(event_id: str, user: dict = Depends(get_current_user)):
    res = await db.registrations.delete_one({"event_id": event_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Registration not found")
    return {"ok": True}


@api.get("/my/tickets", response_model=List[RegistrationOut])
async def my_tickets(user: dict = Depends(get_current_user)):
    regs = await db.registrations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    out = []
    for r in regs:
        ev = await db.events.find_one({"id": r["event_id"]}, {"_id": 0})
        out.append({
            **r, "created_at": to_iso(r["created_at"]),
            "event": event_public(ev) if ev else None,
        })
    return out


@api.get("/tickets/{ticket_code}", response_model=RegistrationOut)
async def get_ticket(ticket_code: str, user: dict = Depends(get_current_user)):
    r = await db.registrations.find_one({"ticket_code": ticket_code}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Ticket not found")
    if r["user_id"] != user["id"] and user["role"] not in ("admin", "organizer"):
        raise HTTPException(403, "Not allowed")
    ev = await db.events.find_one({"id": r["event_id"]}, {"_id": 0})
    return {**r, "created_at": to_iso(r["created_at"]), "event": event_public(ev) if ev else None}


@api.post("/tickets/{ticket_code}/checkin", response_model=RegistrationOut)
async def checkin_ticket(ticket_code: str, user: dict = Depends(get_current_user)):
    r = await db.registrations.find_one({"ticket_code": ticket_code}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Ticket not found")
    ev = await db.events.find_one({"id": r["event_id"]}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    if ev["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Only organizer can check in")
    await db.registrations.update_one({"ticket_code": ticket_code}, {"$set": {"status": "checked_in"}})
    r["status"] = "checked_in"
    return {**r, "created_at": to_iso(r["created_at"]), "event": event_public(ev)}


# ---------- chat ----------
@api.get("/events/{event_id}/messages", response_model=List[MessageOut])
async def list_messages(event_id: str, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    msgs = await db.messages.find({"event_id": event_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [{**m, "created_at": to_iso(m["created_at"])} for m in msgs]


@api.post("/events/{event_id}/messages", response_model=MessageOut)
async def post_message(event_id: str, body: MessageIn, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    msg = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "text": body.text,
        "created_at": now_utc(),
    }
    await db.messages.insert_one(msg)
    return {**msg, "created_at": to_iso(msg["created_at"])}


# ---------- gallery ----------
@api.get("/events/{event_id}/gallery", response_model=List[GalleryOut])
async def list_gallery(event_id: str):
    items = await db.gallery.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [{**i, "created_at": to_iso(i["created_at"])} for i in items]


@api.post("/events/{event_id}/gallery", response_model=GalleryOut)
async def add_gallery(event_id: str, body: GalleryIn, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    doc = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "image": body.image,
        "caption": body.caption,
        "created_at": now_utc(),
    }
    await db.gallery.insert_one(doc)
    return {**doc, "created_at": to_iso(doc["created_at"])}


@api.delete("/gallery/{item_id}")
async def delete_gallery(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Not found")
    if item["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not allowed")
    await db.gallery.delete_one({"id": item_id})
    return {"ok": True}


# ---------- reviews ----------
@api.get("/events/{event_id}/reviews", response_model=List[ReviewOut])
async def list_reviews(event_id: str):
    revs = await db.reviews.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [{**r, "created_at": to_iso(r["created_at"])} for r in revs]


@api.post("/events/{event_id}/reviews", response_model=ReviewOut)
async def add_review(event_id: str, body: ReviewIn, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    existing = await db.reviews.find_one({"event_id": event_id, "user_id": user["id"]}, {"_id": 0})
    doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "event_id": event_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "rating": body.rating,
        "comment": body.comment,
        "created_at": now_utc(),
    }
    await db.reviews.update_one(
        {"event_id": event_id, "user_id": user["id"]},
        {"$set": doc},
        upsert=True,
    )
    return {**doc, "created_at": to_iso(doc["created_at"])}


# ---------- notifications ----------
@api.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [{**i, "created_at": to_iso(i["created_at"])} for i in items]


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    res = await db.notifications.update_one(
        {"id": nid, "user_id": user["id"]},
        {"$set": {"read": True}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- admin dashboard ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    total_users = await db.users.count_documents({})
    total_organizers = await db.users.count_documents({"role": "organizer"})
    total_events = await db.events.count_documents({})
    total_registrations = await db.registrations.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    revenue_pipeline = [
        {"$lookup": {"from": "events", "localField": "event_id", "foreignField": "id", "as": "ev"}},
        {"$unwind": "$ev"},
        {"$group": {"_id": None, "revenue": {"$sum": "$ev.price"}}},
    ]
    rev_cur = db.registrations.aggregate(revenue_pipeline)
    rev = 0.0
    async for r in rev_cur:
        rev = float(r.get("revenue", 0))
    recent_events = await db.events.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {
        "total_users": total_users,
        "total_organizers": total_organizers,
        "total_events": total_events,
        "total_registrations": total_registrations,
        "total_reviews": total_reviews,
        "total_revenue": rev,
        "recent_events": [event_public(e) for e in recent_events],
        "recent_users": [{**u, "created_at": to_iso(u["created_at"])} for u in recent_users],
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    return [{**u, "created_at": to_iso(u["created_at"])} for u in users]


@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, user: dict = Depends(require_role("admin"))):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    res = await db.users.delete_one({"id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.get("/")
async def root():
    return {"service": "EventHub API", "ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
