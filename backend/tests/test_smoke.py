"""Kiểm thử nhanh khung back-end. Cần đã nạp schema.sql vào MySQL và cấu hình .env.

Chạy:  pytest -v
"""
import asyncio
import io
import json

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, update
from starlette.datastructures import UploadFile
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.deps import admin_required, login_required, student_required
from app.core.errors import ApiError, register_error_handlers
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.main import app
from app.models import AuditLog, ClassRoom, Major, ProfileUpdateRequest, Skill, Student, User
from app.routers import auth as auth_router
from app.services import audit_service, upload_service

SEED_STUDENT_PASSWORD = "Ptit@2026"


@pytest.fixture
def client():
    return TestClient(app)


def login(c, username, password):
    return c.post("/api/login", json={"username": username, "password": password})


@pytest.fixture
def restore_student_002():
    """Các test đổi mật khẩu sinh viên B24DTCN002: trả về trạng thái ban đầu của dữ liệu mẫu."""
    yield
    with SessionLocal() as db:
        db.execute(
            update(User)
            .where(User.username == "B24DTCN002")
            .values(password_hash=hash_password(SEED_STUDENT_PASSWORD), must_change_password=True)
        )
        db.commit()


# ---------- dữ liệu công khai ----------
def test_majors_and_classes(client):
    majors = client.get("/api/majors").json()
    assert len(majors) == 4 and {"id", "code", "name", "class_count"} <= majors[0].keys()
    assert next(m for m in majors if m["code"] == "CNTT")["class_count"] == 2

    classes = client.get("/api/classes").json()
    assert len(classes) == 5
    assert all(c["student_count"] == 4 for c in classes)
    assert len(client.get("/api/classes", params={"major_id": 1}).json()) == 2


def test_students_default_list(client):
    r = client.get("/api/students")
    assert r.status_code == 200
    body = r.json()
    assert (body["page"], body["page_size"], body["total"], body["total_pages"]) == (1, 12, 20, 2)
    assert len(body["items"]) == 12
    assert body["items"][0]["student_code"] == "B24DTCN020"
    first = body["items"][0]
    assert first["email"] is None
    assert first["avatar_url"].startswith("/uploads/")
    assert {"class_code", "class_name", "major_id", "major_name"} <= first.keys()


def test_students_filters_search_sort_paging(client):
    get = lambda **p: client.get("/api/students", params=p).json()
    assert get(class_id=1)["total"] == 4
    assert get(major_id=1)["total"] == 8
    assert get(q="B24DTCN019")["total"] == 1
    assert get(q="b24dtcn019")["total"] == 1
    assert get(q="Cường")["total"] == 1
    assert get(q="cuong")["total"] == 1
    assert get(q="%")["total"] == 0
    assert get(q="' OR 1=1 --")["total"] == 0

    assert get(sort="class")["items"][0]["class_code"] == "D24ATTT01"
    names = [i["full_name"] for i in get(sort="name", page_size=50)["items"]]
    with SessionLocal() as db:
        expected = list(db.scalars(select(Student.full_name).order_by(Student.full_name, Student.id)))
    assert len(names) == 20 and names == expected

    assert len(get(page=2)["items"]) == 8
    assert get(page=3)["items"] == [] and get(page=3)["total"] == 20
    assert get(page_size=100)["page_size"] == 50
    assert get(q="zzzz-khong-co") == {"items": [], "page": 1, "page_size": 12, "total": 0, "total_pages": 0}


def test_invalid_params_use_error_format(client):
    r = client.get("/api/students", params={"page": 0})
    assert r.status_code == 400 and r.json() == {"error": "Dữ liệu không hợp lệ", "field": "page"}
    r = client.get("/api/students", params={"sort": "abc"})
    assert r.status_code == 400 and r.json()["field"] == "sort"


def test_student_detail_and_privacy(client):
    d = client.get("/api/students/3").json()
    assert d["student_code"] == "B24DTCN003"
    assert len(d["skills"]) == 8
    levels = [s["level"] for s in d["skills"]]
    assert levels == sorted(levels, reverse=True)
    assert d["class_code"] == "D24DPT01" and d["major_code"] == "DPT"
    assert d["email"] is None and d["phone"] is None and d["address"] is None and d["birth_date"] is None
    assert d["updated_at"] is None

    me = TestClient(app)
    assert login(me, "B24DTCN001", SEED_STUDENT_PASSWORD).status_code == 200
    own = me.get("/api/students/1").json()
    assert own["email"] == "b24dtcn001@stu.ptit.edu.vn" and own["birth_date"] and own["phone"].startswith("0")
    assert me.get("/api/students/3").json()["phone"] is None

    adm = TestClient(app)
    assert login(adm, "admin", "123456").status_code == 200
    assert adm.get("/api/students/3").json()["email"] == "b24dtcn003@stu.ptit.edu.vn"
    assert adm.get("/api/students").json()["items"][0]["email"]

    r = client.get("/api/students/9999")
    assert r.status_code == 404 and r.json() == {"error": "Không tìm thấy sinh viên", "field": None}


def test_special_seed_cases(client):
    assert client.get("/api/students/2").json()["avatar_url"] == "/uploads/default-avatar.png"
    assert client.get("/api/students/5").json()["skills"] == []
    assert client.get("/api/students/6").json()["social_links"] == []
    assert len(client.get("/api/students/19").json()["full_name"]) > 35


# ---------- xác thực ----------
def test_login_errors(client):
    r = login(client, "admin", "sai-mat-khau")
    assert r.status_code == 401 and r.json() == {"error": "Sai tên đăng nhập hoặc mật khẩu", "field": None}
    assert login(client, "khong-ton-tai", "x").status_code == 401
    r = login(client, "B24DTCN099_deleted_22", SEED_STUDENT_PASSWORD)
    assert r.status_code == 403 and r.json()["code"] == "ACCOUNT_LOCKED"
    r = client.post("/api/login", json={})
    assert r.status_code == 400 and r.json() == {"error": "Trường này là bắt buộc", "field": "username"}


def test_login_me_logout(client):
    assert client.get("/api/me").status_code == 401
    r = login(client, "admin", "123456")
    assert r.json() == {"ok": True, "username": "admin", "role": "admin", "must_change_password": False}
    assert client.get("/api/me").json() == {
        "username": "admin", "role": "admin", "must_change_password": False, "student_id": None}
    assert client.post("/api/logout").json() == {"ok": True}
    assert client.get("/api/me").status_code == 401
    assert client.post("/api/logout").status_code == 200

    login(client, "B24DTCN001", SEED_STUDENT_PASSWORD)
    assert client.get("/api/me").json()["student_id"] == 1


def test_must_change_password_flow(client, restore_student_002):
    r = login(client, "B24DTCN002", SEED_STUDENT_PASSWORD)
    assert r.json()["must_change_password"] is True

    r = client.get("/api/students")
    assert r.status_code == 403 and r.json()["code"] == "MUST_CHANGE_PASSWORD"
    assert client.get("/api/me").status_code == 200

    cp = lambda cur, new: client.post("/api/change-password", json={"current_password": cur, "new_password": new})
    r = cp("sai-mat-khau", "MatKhauMoi@123")
    assert r.status_code == 400 and r.json()["field"] == "current_password"
    r = cp(SEED_STUDENT_PASSWORD, "ngan")
    assert r.status_code == 400 and r.json()["field"] == "new_password"
    r = cp(SEED_STUDENT_PASSWORD, SEED_STUDENT_PASSWORD)
    assert r.status_code == 400 and r.json()["field"] == "new_password"

    assert cp(SEED_STUDENT_PASSWORD, "MatKhauMoi@123").json() == {"ok": True}
    assert client.get("/api/students").status_code == 200
    assert client.get("/api/me").json()["must_change_password"] is False

    client.post("/api/logout")
    assert login(client, "B24DTCN002", SEED_STUDENT_PASSWORD).status_code == 401
    assert login(client, "B24DTCN002", "MatKhauMoi@123").status_code == 200


def test_unauthenticated_change_password(client):
    r = client.post("/api/change-password", json={"current_password": "a", "new_password": "b" * 8})
    assert r.status_code == 401


# ---------- phân quyền (dependency) ----------
def _mini_app() -> FastAPI:
    mini = FastAPI()
    mini.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
    register_error_handlers(mini)
    mini.include_router(auth_router.router, prefix="/api")
    mini.get("/t/any")(lambda u=Depends(login_required): {"role": u.role})
    mini.get("/t/admin")(lambda u=Depends(admin_required): {"role": u.role})
    mini.get("/t/student")(lambda u=Depends(student_required): {"role": u.role})
    return mini


def test_role_dependencies():
    mini = _mini_app()
    guest, adm, stu = TestClient(mini), TestClient(mini), TestClient(mini)
    login(adm, "admin", "123456")
    login(stu, "B24DTCN001", SEED_STUDENT_PASSWORD)

    for path in ("/t/any", "/t/admin", "/t/student"):
        assert guest.get(path).status_code == 401
    assert adm.get("/t/admin").status_code == 200 and stu.get("/t/student").status_code == 200
    r = stu.get("/t/admin")
    assert r.status_code == 403 and r.json() == {"error": "Bạn không có quyền thực hiện thao tác này", "field": None}
    assert adm.get("/t/student").status_code == 403


# ---------- lỗi chung, file tĩnh ----------
def test_unknown_api_returns_json_404(client):
    r = client.get("/api/khong-co")
    assert r.status_code == 404 and r.json()["field"] is None and "error" in r.json()


def test_static_files(client):
    r = client.get("/")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    r = client.get("/uploads/default-avatar.png")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert client.get("/docs").status_code == 200


# ---------- services ----------
def _upload(name, data):
    return UploadFile(file=io.BytesIO(data), filename=name)


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 100
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 100


def test_upload_service(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", tmp_path)
    save = lambda name, data: asyncio.run(upload_service.save_avatar(_upload(name, data)))

    for name, data, ext in (("a.png", PNG, "png"), ("b.JPEG", JPG, "jpg"), ("c.webp", WEBP, "webp")):
        filename = save(name, data)
        assert filename.endswith("." + ext) and len(filename) > 30
        assert (tmp_path / filename).read_bytes() == data
        upload_service.delete_avatar(filename)
        assert not (tmp_path / filename).exists()

    def rejected(name, data):
        with pytest.raises(ApiError) as e:
            save(name, data)
        assert e.value.status == 400 and e.value.field == "avatar"

    rejected("virus.exe", PNG)
    rejected("fake.png", b"day-khong-phai-anh" * 10)
    rejected("big.png", PNG + b"\x00" * settings.MAX_AVATAR_BYTES)
    rejected("empty.png", b"")
    rejected("noext", PNG)

    (tmp_path / "default-avatar.png").write_bytes(PNG)
    upload_service.delete_avatar("default-avatar.png")
    upload_service.delete_avatar("../../etc/passwd")
    assert (tmp_path / "default-avatar.png").exists()


def test_audit_service_writes_valid_rows():
    with SessionLocal() as db:
        admin_id = db.scalar(select(User.id).where(User.username == "admin"))
        log = audit_service.write_log(
            db, user_id=admin_id, action="delete", target_type="student", target_id=5,
            old_data={"student_code": "X", "skills": [{"name": "Python", "level": 3}]},
        )
        db.flush()
        assert log.id is not None
        db.rollback()
        with pytest.raises(ValueError):
            audit_service.write_log(db, user_id=admin_id, action="create", target_type="user", target_id=1)


# ---------- mốc 2: thống kê dashboard ----------
def test_stats_endpoint():
    guest, stu, adm = TestClient(app), TestClient(app), TestClient(app)
    login(stu, "B24DTCN001", SEED_STUDENT_PASSWORD)
    login(adm, "admin", "123456")

    assert guest.get("/api/stats").status_code == 401
    assert stu.get("/api/stats").status_code == 403

    r = adm.get("/api/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["total_students"] == 20
    assert body["total_classes"] == 5
    assert body["total_majors"] == 4
    assert body["pending_requests"] == 1
    assert len(body["by_class"]) == 5 and all(c["count"] == 4 for c in body["by_class"])
    assert len(body["recent"]) == 5 and body["recent"][0]["student_code"] == "B24DTCN020"


# ---------- mốc 3: kỹ năng + CRUD sinh viên + xuất Excel ----------
def test_skills_autocomplete():
    guest, stu = TestClient(app), TestClient(app)
    login(stu, "B24DTCN001", SEED_STUDENT_PASSWORD)

    assert guest.get("/api/skills").status_code == 401
    all_skills = stu.get("/api/skills").json()
    assert len(all_skills) == 10
    filtered = stu.get("/api/skills", params={"q": "py"}).json()
    assert len(filtered) == 1 and filtered[0]["name"] == "Python"


def test_student_crud_and_export(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", tmp_path)
    (tmp_path / "default-avatar.png").write_bytes(PNG)

    adm = TestClient(app)
    login(adm, "admin", "123456")

    try:
        r = adm.post("/api/students", data={"student_code": "sai-ma"})
        assert r.status_code == 400 and r.json()["field"] == "student_code"

        base_form = {
            "student_code": "b24dtcn888",
            "full_name": "Nguyễn Văn Thử Nghiệm",
            "gender": "Nam",
            "birth_date": "2006-05-20",
            "email": "b24dtcn888@stu.ptit.edu.vn",
            "phone": "0912345678",
            "address": "Hà Đông, Hà Nội",
            "hobbies": "Đọc sách",
            "class_id": "1",
            "skills": json.dumps([{"name": "Python", "level": 4}, {"name": "FastAPI_Test", "level": 5}]),
            "social_links": json.dumps([{"platform": "GitHub", "url": "https://github.com/b24dtcn888"}]),
        }

        r = adm.post("/api/students", data={**base_form, "student_code": "B24DTCN001"})
        assert r.status_code == 400 and r.json() == {"error": "Mã sinh viên đã tồn tại", "field": "student_code"}

        r = adm.post("/api/students", data={**base_form, "email": "b24dtcn001@stu.ptit.edu.vn"})
        assert r.status_code == 400 and r.json() == {"error": "Email đã được sử dụng", "field": "email"}

        r = adm.post("/api/students", data={**base_form, "phone": "12345"})
        assert r.status_code == 400 and r.json() == {"error": "Số điện thoại phải gồm 10 chữ số", "field": "phone"}

        r = adm.post(
            "/api/students",
            data={**base_form, "skills": json.dumps([{"name": "Python", "level": 9}])},
        )
        assert r.status_code == 400 and r.json() == {
            "error": "Mức kỹ năng phải từ 1 đến 5",
            "field": "skills[0].level",
        }

        r = adm.post(
            "/api/students",
            data=base_form,
            files={"avatar": ("avatar.png", PNG, "image/png")},
        )
        assert r.status_code == 201
        created = r.json()
        sid = created["id"]
        assert created["student_code"] == "B24DTCN888"
        assert created["avatar_url"].endswith(".png") and created["avatar_url"] != "/uploads/default-avatar.png"
        avatar_file_1 = created["avatar_url"].split("/")[-1]
        assert (tmp_path / avatar_file_1).is_file()
        assert [s["name"] for s in created["skills"]] == ["FastAPI_Test", "Python"]

        stu_client = TestClient(app)
        r_login = login(stu_client, "B24DTCN888", settings.DEFAULT_STUDENT_PASSWORD)
        assert r_login.status_code == 200 and r_login.json()["must_change_password"] is True

        update_form = {
            **base_form,
            "student_code": "B24DTCN889",
            "address": "",
            "skills": json.dumps([{"name": "SQL", "level": 3}]),
            "remove_avatar": "1",
        }
        del update_form["social_links"]
        r = adm.put(f"/api/students/{sid}", data=update_form)
        assert r.status_code == 200
        updated = r.json()
        assert updated["student_code"] == "B24DTCN889"
        assert updated["address"] is None
        assert updated["avatar_url"] == "/uploads/default-avatar.png"
        assert not (tmp_path / avatar_file_1).exists()
        assert [s["name"] for s in updated["skills"]] == ["SQL"]
        assert len(updated["social_links"]) == 1

        assert login(TestClient(app), "B24DTCN889", settings.DEFAULT_STUDENT_PASSWORD).status_code == 200

        r_exp = adm.get("/api/students/export", params={"q": "B24DTCN889"})
        assert r_exp.status_code == 200
        assert "spreadsheetml.sheet" in r_exp.headers["content-type"]
        assert r_exp.content[:2] == b"PK"

        r_del = adm.delete(f"/api/students/{sid}")
        assert r_del.status_code == 200 and r_del.json() == {"ok": True}
        assert adm.get(f"/api/students/{sid}").status_code == 404
        assert login(TestClient(app), "B24DTCN889", settings.DEFAULT_STUDENT_PASSWORD).status_code == 401
    finally:
        with SessionLocal() as db:
            db.execute(delete(AuditLog).where(AuditLog.id > 4))
            db.execute(delete(Student).where(Student.id > 20))
            db.execute(delete(User).where(User.id > 22))
            db.execute(delete(Skill).where(Skill.id > 10))
            db.commit()


# ---------- mốc 4: CRUD lớp và ngành ----------
def test_classes_and_majors_crud():
    adm = TestClient(app)
    login(adm, "admin", "123456")

    try:
        r = adm.delete("/api/majors/1")
        assert r.status_code == 400 and r.json() == {"error": "Không thể xóa ngành đang có lớp", "field": None}
        r = adm.delete("/api/classes/1")
        assert r.status_code == 400 and r.json() == {"error": "Không thể xóa lớp đang có sinh viên", "field": None}

        r = adm.post("/api/majors", json={"code": "CNTT", "name": "Ngành mới"})
        assert r.status_code == 400 and r.json()["field"] == "code"
        r = adm.post("/api/majors", json={"code": "MOI", "name": "Công nghệ thông tin"})
        assert r.status_code == 400 and r.json()["field"] == "name"

        r = adm.post("/api/majors", json={"code": "ktdt", "name": "Kỹ thuật điện tử"})
        assert r.status_code == 201
        major = r.json()
        mid = major["id"]
        assert major["code"] == "KTDT" and major["class_count"] == 0

        r = adm.put(f"/api/majors/{mid}", json={"code": "KTDT1", "name": "Kỹ thuật điện tử 1"})
        assert r.status_code == 200 and r.json()["code"] == "KTDT1"

        r = adm.post("/api/classes", json={"code": "d24ktdt01", "name": "Điện tử 1", "major_id": mid})
        assert r.status_code == 201
        cls = r.json()
        cid = cls["id"]
        assert cls["code"] == "D24KTDT01" and cls["major_name"] == "Kỹ thuật điện tử 1"

        r = adm.put(f"/api/classes/{cid}", json={"code": "D24KTDT02", "name": "Điện tử 2", "major_id": mid})
        assert r.status_code == 200 and r.json()["code"] == "D24KTDT02"

        assert adm.delete(f"/api/majors/{mid}").status_code == 400
        assert adm.delete(f"/api/classes/{cid}").status_code == 200
        assert adm.delete(f"/api/majors/{mid}").status_code == 200
    finally:
        with SessionLocal() as db:
            db.execute(delete(AuditLog).where(AuditLog.id > 4))
            db.execute(delete(ClassRoom).where(ClassRoom.id > 5))
            db.execute(delete(Major).where(Major.id > 4))
            db.commit()


# ---------- mốc 5 & 6: yêu cầu cập nhật hồ sơ + nhật ký thao tác ----------
def test_student_update_requests_and_audit_logs():
    stu = TestClient(app)
    adm = TestClient(app)
    login(stu, "B24DTCN001", SEED_STUDENT_PASSWORD)
    login(adm, "admin", "123456")

    orig_profile = stu.get("/api/me/profile").json()
    assert orig_profile["student_code"] == "B24DTCN001" and orig_profile["phone"] == "0978778932"
    assert adm.get("/api/me/profile").status_code == 403

    try:
        r = stu.post("/api/me/update-requests", json={"email": "new@stu.ptit.edu.vn"})
        assert r.status_code == 400 and r.json() == {"error": "Trường này chỉ admin được sửa", "field": "email"}

        r = stu.post("/api/me/update-requests", json={"phone": "123"})
        assert r.status_code == 400 and r.json() == {"error": "Số điện thoại phải gồm 10 chữ số", "field": "phone"}

        r = stu.post(
            "/api/me/update-requests",
            json={"phone": "0911222333", "hobbies": "Cờ tướng"},
        )
        assert r.status_code == 201
        req1 = r.json()
        assert req1["status"] == "pending"

        r_dup = stu.post("/api/me/update-requests", json={"phone": "0911222444"})
        assert r_dup.status_code == 400 and r_dup.json() == {"error": "Bạn đang có yêu cầu chờ duyệt", "field": None}

        detail = adm.get(f"/api/update-requests/{req1['id']}").json()
        assert detail["current"] == {"phone": "0978778932", "hobbies": "Nghe nhạc, chụp ảnh"}
        assert detail["new_data"] == {"phone": "0911222333", "hobbies": "Cờ tướng"}

        r_rej_err = adm.post(f"/api/update-requests/{req1['id']}/reject", json={"reject_reason": "  "})
        assert r_rej_err.status_code == 400 and r_rej_err.json() == {
            "error": "Vui lòng nhập lý do từ chối",
            "field": "reject_reason",
        }

        r_rej = adm.post(
            f"/api/update-requests/{req1['id']}/reject",
            json={"reject_reason": "Thông tin chưa chính xác"},
        )
        assert r_rej.status_code == 200
        assert adm.post(f"/api/update-requests/{req1['id']}/approve").status_code == 400

        r2 = stu.post("/api/me/update-requests", json={"phone": "0988777666"})
        assert r2.status_code == 201
        req2 = r2.json()
        assert adm.post(f"/api/update-requests/{req2['id']}/approve").status_code == 200
        assert stu.get("/api/me/profile").json()["phone"] == "0988777666"

        logs = adm.get("/api/audit-logs", params={"target_type": "student", "target_id": 1}).json()
        actions = [item["action"] for item in logs["items"]]
        assert "approve" in actions and "reject" in actions
    finally:
        with SessionLocal() as db:
            db.execute(
                update(Student)
                .where(Student.id == 1)
                .values(phone="0978778932", hobbies="Nghe nhạc, chụp ảnh")
            )
            db.execute(delete(ProfileUpdateRequest).where(ProfileUpdateRequest.id > 3))
            db.execute(delete(AuditLog).where(AuditLog.id > 4))
            db.commit()
