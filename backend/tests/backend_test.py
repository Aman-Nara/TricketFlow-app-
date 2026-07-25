"""EventHub backend API test suite.

Covers auth, events, registration/tickets, chat, gallery, reviews,
notifications, and admin dashboard endpoints per the review request.
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"

ADMIN = {"email": "admin@eventhub.app", "password": "Admin@12345"}
ORGANIZER = {"email": "organizer@eventhub.app", "password": "Organizer@12345"}

RUN_ID = uuid.uuid4().hex[:8]


# ---------- shared fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password):
    r = session.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def admin_token(session):
    return _login(session, **ADMIN)["access_token"]


@pytest.fixture(scope="session")
def organizer_token(session):
    return _login(session, **ORGANIZER)["access_token"]


@pytest.fixture(scope="session")
def user_ctx(session):
    """Create a fresh regular user for testing user flows."""
    payload = {
        "email": f"TEST_user_{RUN_ID}@eventhub.app",
        "password": "TestPass@123",
        "name": "TEST Attendee",
        "role": "user",
    }
    r = session.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["access_token"], "user": data["user"], "email": payload["email"]}


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def created_event(session, organizer_token):
    """A test-owned event with small capacity, created once per session."""
    payload = {
        "title": f"TEST Event {RUN_ID}",
        "description": "created by test", "category": "TESTCAT",
        "location": "test hall",
        "starts_at": "2026-06-01T18:00:00+00:00",
        "price": 12.5, "capacity": 10, "cover_image": "",
    }
    r = session.post(f"{BASE_URL}/events", json=payload, headers=auth(organizer_token))
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session")
def registered_ticket(session, user_ctx, created_event):
    """Registers user_ctx for created_event, returning the ticket dict."""
    r = session.post(f"{BASE_URL}/events/{created_event['id']}/register",
                     headers=auth(user_ctx["token"]))
    assert r.status_code == 200, r.text
    return r.json()


# ---------- health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{BASE_URL}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- auth ----------
class TestAuth:
    def test_signup_user(self, session):
        payload = {
            "email": f"TEST_su_{RUN_ID}@eventhub.app",
            "password": "TestPass@123",
            "name": "TEST Signup",
            "role": "user",
        }
        r = session.post(f"{BASE_URL}/auth/signup", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body and body["user"]["email"] == payload["email"]
        assert body["user"]["role"] == "user"

    def test_signup_organizer(self, session):
        payload = {
            "email": f"TEST_org_{RUN_ID}@eventhub.app",
            "password": "TestPass@123",
            "name": "TEST Org",
            "role": "organizer",
        }
        r = session.post(f"{BASE_URL}/auth/signup", json=payload)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "organizer"

    def test_signup_duplicate(self, session, user_ctx):
        r = session.post(f"{BASE_URL}/auth/signup", json={
            "email": user_ctx["email"], "password": "TestPass@123",
            "name": "dupe", "role": "user",
        })
        assert r.status_code == 400

    def test_signup_admin_forbidden(self, session):
        r = session.post(f"{BASE_URL}/auth/signup", json={
            "email": f"TEST_admin_{RUN_ID}@eventhub.app",
            "password": "TestPass@123", "name": "x", "role": "admin",
        })
        assert r.status_code == 400

    def test_signup_bad_email(self, session):
        r = session.post(f"{BASE_URL}/auth/signup", json={
            "email": "not-an-email", "password": "TestPass@123",
            "name": "x", "role": "user",
        })
        assert r.status_code == 422

    def test_signup_short_password(self, session):
        r = session.post(f"{BASE_URL}/auth/signup", json={
            "email": f"TEST_p_{RUN_ID}@eventhub.app",
            "password": "12", "name": "x", "role": "user",
        })
        assert r.status_code == 422

    def test_login_admin(self, session):
        body = _login(session, **ADMIN)
        assert body["user"]["role"] == "admin"
        assert body["user"]["email"] == ADMIN["email"]
        assert body["access_token"]

    def test_login_organizer(self, session):
        body = _login(session, **ORGANIZER)
        assert body["user"]["role"] == "organizer"

    def test_login_wrong_password(self, session):
        r = session.post(f"{BASE_URL}/auth/login",
                         json={"email": ADMIN["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_valid(self, session, user_ctx):
        r = session.get(f"{BASE_URL}/auth/me", headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == user_ctx["email"]

    def test_me_missing(self, session):
        r = session.get(f"{BASE_URL}/auth/me")
        assert r.status_code == 401

    def test_me_bad_token(self, session):
        r = session.get(f"{BASE_URL}/auth/me", headers=auth("bogus.token"))
        assert r.status_code == 401


# ---------- events ----------
class TestEvents:
    def test_list_seeded(self, session):
        r = session.get(f"{BASE_URL}/events")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 4
        for ev in data:
            assert set(["id", "title", "category", "starts_at", "organizer_id", "registered_count"]).issubset(ev)

    def test_filter_music(self, session):
        r = session.get(f"{BASE_URL}/events", params={"category": "Music"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert all(e["category"] == "Music" for e in data)

    def test_get_by_id(self, session):
        events = session.get(f"{BASE_URL}/events").json()
        ev = events[0]
        r = session.get(f"{BASE_URL}/events/{ev['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == ev["id"]

    def test_get_missing(self, session):
        r = session.get(f"{BASE_URL}/events/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_create_event_organizer(self, session, organizer_token, created_event):
        ev = created_event
        assert ev["title"].startswith("TEST Event ")
        # verify persistence
        r2 = session.get(f"{BASE_URL}/events/{ev['id']}")
        assert r2.status_code == 200 and r2.json()["title"] == ev["title"]

    def test_create_event_user_forbidden(self, session, user_ctx):
        payload = {
            "title": "should fail", "description": "", "category": "x",
            "location": "", "starts_at": "2026-06-01T18:00:00+00:00",
            "price": 0, "capacity": 5, "cover_image": "",
        }
        r = session.post(f"{BASE_URL}/events", json=payload, headers=auth(user_ctx["token"]))
        assert r.status_code == 403

    def test_create_event_unauth(self, session):
        r = session.post(f"{BASE_URL}/events", json={
            "title": "x", "starts_at": "2026-06-01T18:00:00+00:00",
        })
        assert r.status_code == 401


# ---------- registrations / tickets ----------
class TestRegistration:
    def test_register_and_ticket(self, session, user_ctx, created_event, registered_ticket):
        eid = created_event["id"]
        data = registered_ticket
        assert data["event_id"] == eid and data["ticket_code"]

        # idempotent - same ticket code
        r2 = session.post(f"{BASE_URL}/events/{eid}/register", headers=auth(user_ctx["token"]))
        assert r2.status_code == 200
        assert r2.json()["ticket_code"] == data["ticket_code"]

    def test_my_tickets(self, session, user_ctx, created_event, registered_ticket):
        r = session.get(f"{BASE_URL}/my/tickets", headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        tix = r.json()
        code = registered_ticket["ticket_code"]
        assert any(t["ticket_code"] == code for t in tix)
        t = next(t for t in tix if t["ticket_code"] == code)
        assert t["event"] and t["event"]["id"] == created_event["id"]

    def test_get_ticket_by_code(self, session, user_ctx, registered_ticket):
        code = registered_ticket["ticket_code"]
        r = session.get(f"{BASE_URL}/tickets/{code}", headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        assert r.json()["ticket_code"] == code

    def test_checkin_by_non_organizer_forbidden(self, session, user_ctx, registered_ticket):
        r = session.post(f"{BASE_URL}/tickets/{registered_ticket['ticket_code']}/checkin",
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 403

    def test_checkin_by_organizer(self, session, organizer_token, registered_ticket):
        r = session.post(f"{BASE_URL}/tickets/{registered_ticket['ticket_code']}/checkin",
                         headers=auth(organizer_token))
        assert r.status_code == 200
        assert r.json()["status"] == "checked_in"


# ---------- chat ----------
class TestChat:
    def test_post_and_list_messages(self, session, user_ctx, created_event):
        eid = created_event["id"]
        r = session.post(f"{BASE_URL}/events/{eid}/messages",
                         json={"text": f"hello {RUN_ID}"},
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        assert r.json()["text"] == f"hello {RUN_ID}"

        r2 = session.get(f"{BASE_URL}/events/{eid}/messages", headers=auth(user_ctx["token"]))
        assert r2.status_code == 200
        assert any(m["text"] == f"hello {RUN_ID}" for m in r2.json())

    def test_messages_require_auth(self, session, created_event):
        r = session.get(f"{BASE_URL}/events/{created_event['id']}/messages")
        assert r.status_code == 401


# ---------- gallery ----------
class TestGallery:
    def test_add_and_list(self, session, user_ctx, created_event):
        eid = created_event["id"]
        r = session.post(f"{BASE_URL}/events/{eid}/gallery",
                         json={"image": "https://example.com/x.jpg", "caption": "TEST"},
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        gid = r.json()["id"]

        r2 = session.get(f"{BASE_URL}/events/{eid}/gallery")
        assert r2.status_code == 200
        assert any(g["id"] == gid for g in r2.json())

        # delete by non-owner (organizer) is forbidden
        r3 = session.delete(f"{BASE_URL}/gallery/{gid}",
                            headers=auth(session.headers.get("X", ""))) if False else None
        # then by owner should succeed
        r4 = session.delete(f"{BASE_URL}/gallery/{gid}",
                            headers=auth(user_ctx["token"]))
        assert r4.status_code == 200

    def test_delete_by_other_forbidden(self, session, user_ctx, organizer_token, created_event):
        # create a fresh item
        r = session.post(f"{BASE_URL}/events/{created_event['id']}/gallery",
                         json={"image": "https://example.com/y.jpg", "caption": "TEST2"},
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        gid = r.json()["id"]
        r2 = session.delete(f"{BASE_URL}/gallery/{gid}", headers=auth(organizer_token))
        assert r2.status_code == 403
        # cleanup
        session.delete(f"{BASE_URL}/gallery/{gid}", headers=auth(user_ctx["token"]))


# ---------- reviews ----------
@pytest.fixture(scope="session")
def any_event_id(session):
    events = session.get(f"{BASE_URL}/events").json()
    assert events, "no events available"
    return events[0]["id"]


class TestReviews:
    def test_upsert_and_list(self, session, user_ctx, any_event_id):
        eid = any_event_id
        r = session.post(f"{BASE_URL}/events/{eid}/reviews",
                         json={"rating": 4, "comment": "nice"},
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        rid = r.json()["id"]

        # upsert - same id
        r2 = session.post(f"{BASE_URL}/events/{eid}/reviews",
                          json={"rating": 5, "comment": "updated"},
                          headers=auth(user_ctx["token"]))
        assert r2.status_code == 200
        assert r2.json()["id"] == rid and r2.json()["rating"] == 5

        r3 = session.get(f"{BASE_URL}/events/{eid}/reviews")
        assert r3.status_code == 200
        assert any(x["id"] == rid and x["rating"] == 5 for x in r3.json())

    def test_invalid_rating(self, session, user_ctx, any_event_id):
        eid = any_event_id
        r = session.post(f"{BASE_URL}/events/{eid}/reviews",
                         json={"rating": 9, "comment": ""},
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 422


# ---------- notifications ----------
class TestNotifications:
    def test_list_after_register(self, session, user_ctx, registered_ticket):
        r = session.get(f"{BASE_URL}/notifications", headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert any(i["title"] == "Ticket confirmed" for i in items)

    def test_read_all(self, session, user_ctx, registered_ticket):
        r = session.post(f"{BASE_URL}/notifications/read-all",
                         headers=auth(user_ctx["token"]))
        assert r.status_code == 200
        r2 = session.get(f"{BASE_URL}/notifications", headers=auth(user_ctx["token"]))
        assert r2.status_code == 200
        assert all(i["read"] is True for i in r2.json())


# ---------- admin ----------
class TestAdmin:
    def test_stats_admin(self, session, admin_token):
        r = session.get(f"{BASE_URL}/admin/stats", headers=auth(admin_token))
        assert r.status_code == 200
        s = r.json()
        for k in ["total_users", "total_events", "total_registrations",
                  "total_revenue", "recent_events", "recent_users"]:
            assert k in s
        assert isinstance(s["recent_events"], list)
        assert isinstance(s["recent_users"], list)
        assert s["total_events"] >= 4

    def test_stats_forbidden_for_user(self, session, user_ctx):
        r = session.get(f"{BASE_URL}/admin/stats", headers=auth(user_ctx["token"]))
        assert r.status_code == 403

    def test_users_admin(self, session, admin_token):
        r = session.get(f"{BASE_URL}/admin/users", headers=auth(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN["email"] for u in users)
        # no password leak
        assert all("password" not in u for u in users)

    def test_admin_self_delete_blocked(self, session, admin_token):
        me = session.get(f"{BASE_URL}/auth/me", headers=auth(admin_token)).json()
        r = session.delete(f"{BASE_URL}/admin/users/{me['id']}", headers=auth(admin_token))
        assert r.status_code == 400

    def test_admin_delete_user(self, session, admin_token):
        # create a throwaway user then delete
        email = f"TEST_del_{uuid.uuid4().hex[:6]}@eventhub.app"
        s = session.post(f"{BASE_URL}/auth/signup", json={
            "email": email, "password": "TestPass@123",
            "name": "TEST del", "role": "user",
        })
        assert s.status_code == 200
        uid = s.json()["user"]["id"]
        r = session.delete(f"{BASE_URL}/admin/users/{uid}", headers=auth(admin_token))
        assert r.status_code == 200
        # verify gone
        users = session.get(f"{BASE_URL}/admin/users", headers=auth(admin_token)).json()
        assert not any(u["id"] == uid for u in users)
