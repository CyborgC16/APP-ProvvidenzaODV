"""Backend tests for La Provvidenza ODV API."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

MASTER_USER = os.environ.get("MASTER_USERNAME", "")
MASTER_PASS = os.environ.get("MASTER_PASSWORD", "")


@pytest.fixture(scope="session")
def master_token():
    r = requests.post(f"{API}/auth/login", json={"username": MASTER_USER, "password": MASTER_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def master_headers(master_token):
    return {"Authorization": f"Bearer {master_token}"}


# ===== Health =====
def test_root_status_ok():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ===== Auth =====
def test_login_master_returns_token_and_role():
    r = requests.post(f"{API}/auth/login", json={"username": MASTER_USER, "password": MASTER_PASS})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["user"]["role"] == "master"
    assert "_id" not in data["user"]


def test_login_wrong_credentials_401():
    r = requests.post(f"{API}/auth/login", json={"username": MASTER_USER, "password": "WRONG"})
    assert r.status_code == 401


def test_auth_me_with_token(master_headers):
    r = requests.get(f"{API}/auth/me", headers=master_headers)
    assert r.status_code == 200
    assert r.json()["role"] == "master"
    assert "_id" not in r.json()


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ===== Users management =====
@pytest.fixture(scope="session")
def created_sc_user(master_headers):
    username = f"TEST_sc_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/users", headers=master_headers, json={
        "username": username,
        "full_name": "TEST Servizio Civile",
        "role": "servizio_civile",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["generated_password"] is not None
    assert body["user"]["role"] == "servizio_civile"
    assert "_id" not in body["user"]
    yield {"username": username, "password": body["generated_password"], "id": body["user"]["id"]}
    # cleanup
    requests.delete(f"{API}/users/{body['user']['id']}", headers=master_headers)


def test_create_user_returns_generated_password(created_sc_user):
    assert created_sc_user["password"]
    assert len(created_sc_user["password"]) >= 8


def test_create_user_unauthorized():
    r = requests.post(f"{API}/users", json={
        "username": "TEST_noauth", "full_name": "x", "role": "admin"
    })
    assert r.status_code == 401


def test_list_users_no_master_no_id(master_headers, created_sc_user):
    r = requests.get(f"{API}/users", headers=master_headers)
    assert r.status_code == 200
    users = r.json()
    assert all(u["role"] != "master" for u in users)
    for u in users:
        assert "_id" not in u


def test_reset_password_rotates(master_headers, created_sc_user):
    r = requests.post(f"{API}/users/{created_sc_user['id']}/reset-password", headers=master_headers)
    assert r.status_code == 200
    new_pw = r.json()["new_password"]
    assert new_pw and new_pw != created_sc_user["password"]
    # login with new pw works
    lr = requests.post(f"{API}/auth/login", json={"username": created_sc_user["username"], "password": new_pw})
    assert lr.status_code == 200
    created_sc_user["password"] = new_pw  # update for later tests


def test_reset_password_master_forbidden(master_headers):
    me = requests.get(f"{API}/auth/me", headers=master_headers).json()
    r = requests.post(f"{API}/users/{me['id']}/reset-password", headers=master_headers)
    assert r.status_code == 403


def test_delete_master_forbidden(master_headers):
    me = requests.get(f"{API}/auth/me", headers=master_headers).json()
    r = requests.delete(f"{API}/users/{me['id']}", headers=master_headers)
    assert r.status_code == 403


# ===== Slots =====
@pytest.fixture(scope="session")
def created_slot(master_headers, created_sc_user):
    r = requests.post(f"{API}/slots", headers=master_headers, json={
        "date": "2026-12-15",
        "time": "10:00",
        "vehicle_type": "ambulanza",
        "capacity": 1,
        "assigned_user_ids": [created_sc_user["id"]],
        "notes": "TEST slot",
    })
    assert r.status_code == 200, r.text
    slot = r.json()
    assert "_id" not in slot
    yield slot
    requests.delete(f"{API}/slots/{slot['id']}", headers=master_headers)


def test_slots_public_list_includes_created(created_slot):
    r = requests.get(f"{API}/slots")
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()]
    assert created_slot["id"] in ids
    for s in r.json():
        assert "_id" not in s


def test_slots_mine_for_sc_user(created_sc_user, created_slot):
    lr = requests.post(f"{API}/auth/login", json={
        "username": created_sc_user["username"], "password": created_sc_user["password"]
    })
    assert lr.status_code == 200
    sc_token = lr.json()["token"]
    r = requests.get(f"{API}/slots/mine", headers={"Authorization": f"Bearer {sc_token}"})
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()]
    assert created_slot["id"] in ids


# ===== Bookings =====
def _booking_payload(slot_id):
    return {
        "slot_id": slot_id,
        "requester_name": "TEST",
        "requester_surname": "User",
        "patient_name": "Pat",
        "patient_surname": "Ient",
        "phone": "+39 333 1234567",
        "email": "test@example.com",
        "address": "Via Test 1, Marsala",
        "vehicle_type": "ambulanza",
        "patient_weight_class": "normopeso",
        "has_elevator": True,
        "floor": 2,
        "notes": "TEST",
    }


def test_booking_create_no_auth_and_decrements(master_headers, created_slot):
    r = requests.post(f"{API}/bookings", json=_booking_payload(created_slot["id"]))
    assert r.status_code == 200, r.text
    booking = r.json()
    assert "_id" not in booking
    # slot now full -> second booking should fail with 400
    r2 = requests.post(f"{API}/bookings", json=_booking_payload(created_slot["id"]))
    assert r2.status_code == 400
    # list bookings as admin
    lr = requests.get(f"{API}/bookings", headers=master_headers, params={"date": created_slot["date"]})
    assert lr.status_code == 200
    assert any(b["id"] == booking["id"] for b in lr.json())
    # delete booking and verify capacity recovered
    dr = requests.delete(f"{API}/bookings/{booking['id']}", headers=master_headers)
    assert dr.status_code == 200
    sr = requests.get(f"{API}/slots")
    slot_after = next(s for s in sr.json() if s["id"] == created_slot["id"])
    assert slot_after["booked_count"] == 0


def test_bookings_list_requires_auth():
    r = requests.get(f"{API}/bookings")
    assert r.status_code == 401

