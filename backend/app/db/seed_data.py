"""Dữ liệu mẫu dùng cho chế độ SQLite (DB_ENGINE=sqlite).

Nội dung trùng khớp với phần INSERT của `sql/schema.sql` để 2 chế độ cho cùng dữ liệu:
1 admin (admin/123456), 20 sinh viên (Ptit@2026), 4 ngành, 5 lớp, 10 kỹ năng.
"""
from datetime import date, datetime

from app.models import (
    AuditLog, ClassRoom, Major, ProfileUpdateRequest, Skill, SocialLink, Student, StudentSkill, User,
)

ADMIN_HASH = "$2b$12$nIz/0HqlstmpDpW5U6HUzemlTRHh0025YmpHRb73WA9DzqJM1h4Ze"        # 123456
STUDENT_HASH = "$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u"      # Ptit@2026


def _dt(text: str) -> datetime:
    return datetime.fromisoformat(text)


USERS = [
    {"id": 1, "username": "admin", "password_hash": ADMIN_HASH, "role": "admin", "is_active": 1, "must_change_password": 0},
    {"id": 2, "username": "B24DTCN001", "password_hash": STUDENT_HASH, "role": "student", "is_active": 1, "must_change_password": 0},
] + [
    {"id": uid, "username": f"B24DTCN{i:03d}", "password_hash": STUDENT_HASH, "role": "student",
     "is_active": 1, "must_change_password": 1}
    for i, uid in ((i, i + 1) for i in range(2, 21))
] + [
    {"id": 22, "username": "B24DTCN099_deleted_22", "password_hash": STUDENT_HASH, "role": "student",
     "is_active": 0, "must_change_password": 0},
]

MAJORS = [
    {"id": 1, "code": "CNTT", "name": "Công nghệ thông tin"},
    {"id": 2, "code": "DPT", "name": "Công nghệ đa phương tiện"},
    {"id": 3, "code": "ATTT", "name": "An toàn thông tin"},
    {"id": 4, "code": "KHMT", "name": "Khoa học máy tính"},
]

CLASSES = [
    {"id": 1, "code": "D24CNTT01", "name": "Công nghệ thông tin 1", "major_id": 1},
    {"id": 2, "code": "D24CNTT02", "name": "Công nghệ thông tin 2", "major_id": 1},
    {"id": 3, "code": "D24DPT01", "name": "Đa phương tiện 1", "major_id": 2},
    {"id": 4, "code": "D24ATTT01", "name": "An toàn thông tin 1", "major_id": 3},
    {"id": 5, "code": "D24KHMT01", "name": "Khoa học máy tính 1", "major_id": 4},
]

# id, user_id, mã SV, họ tên, ngày sinh, giới tính, email, SĐT, địa chỉ, sở thích, lớp, created_at
_STUDENTS = [
    (1, 2, "B24DTCN001", "Nguyễn Văn An", "2006-09-16", "Nam", "0978778932", "Hà Đông, Hà Nội", "Nghe nhạc, chụp ảnh", 1, "2026-10-02 08:01:00"),
    (2, 3, "B24DTCN002", "Trần Thị Bình", "2006-12-21", "Nữ", "0992174218", "Thanh Xuân, Hà Nội", "Bóng đá, chạy bộ", 2, "2026-10-03 08:02:00"),
    (3, 4, "B24DTCN003", "Lê Hoàng Cường", "2006-09-03", "Nam", "0909679290", "Nam Từ Liêm, Hà Nội", "Chơi game, lập trình", 3, "2026-10-04 08:03:00"),
    (4, 5, "B24DTCN004", "Phạm Minh Đức", "2006-08-19", "Nam", "0900339075", "Cầu Giấy, Hà Nội", "Du lịch, nấu ăn", 4, "2026-10-05 08:04:00"),
    (5, 6, "B24DTCN005", "Hoàng Thị Giang", "2006-11-09", "Nữ", "0938347017", "Hà Đông, Hà Nội", "Vẽ, xem phim", 5, "2026-10-06 08:05:00"),
    (6, 7, "B24DTCN006", "Vũ Quang Huy", "2006-01-03", "Nam", "0968145384", "Thanh Xuân, Hà Nội", "Đọc sách, chơi cờ vua", 1, "2026-10-07 08:06:00"),
    (7, 8, "B24DTCN007", "Đặng Thị Lan", "2006-11-01", "Nữ", "0991614610", "Nam Từ Liêm, Hà Nội", "Nghe nhạc, chụp ảnh", 2, "2026-10-08 08:07:00"),
    (8, 9, "B24DTCN008", "Bùi Tuấn Kiệt", "2006-10-21", "Nam", "0933076661", None, "Bóng đá, chạy bộ", 3, "2026-10-09 08:08:00"),
    (9, 10, "B24DTCN009", "Ngô Thanh Mai", "2006-02-05", "Nữ", "0934514506", "Hà Đông, Hà Nội", "Chơi game, lập trình", 4, "2026-10-10 08:09:00"),
    (10, 11, "B24DTCN010", "Đỗ Văn Nam", "2006-04-15", "Nam", "0931007728", "Thanh Xuân, Hà Nội", "Du lịch, nấu ăn", 5, "2026-10-11 08:10:00"),
    (11, 12, "B24DTCN011", "Dương Thị Oanh", "2006-04-01", "Nữ", "0983266166", "Nam Từ Liêm, Hà Nội", "Vẽ, xem phim", 1, "2026-10-12 08:11:00"),
    (12, 13, "B24DTCN012", "Lý Gia Phúc", "2006-11-19", "Nam", "0949403269", None, "Đọc sách, chơi cờ vua", 2, "2026-10-13 08:12:00"),
    (13, 14, "B24DTCN013", "Phan Thị Quỳnh", "2006-06-27", "Nữ", "0910237409", "Hà Đông, Hà Nội", "Nghe nhạc, chụp ảnh", 3, "2026-10-14 08:13:00"),
    (14, 15, "B24DTCN014", "Trịnh Đức Thắng", "2006-01-20", "Nam", "0946111393", "Thanh Xuân, Hà Nội", "Bóng đá, chạy bộ", 4, "2026-10-15 08:14:00"),
    (15, 16, "B24DTCN015", "Nguyễn Thị Thu Trang", "2006-03-28", "Nữ", "0955972979", "Nam Từ Liêm, Hà Nội", "Chơi game, lập trình", 5, "2026-10-16 08:15:00"),
    (16, 17, "B24DTCN016", "Lê Văn Tùng", "2006-03-24", "Nam", "0962243933", None, "Du lịch, nấu ăn", 1, "2026-10-17 08:16:00"),
    (17, 18, "B24DTCN017", "Trần Hải Yến", "2006-02-04", "Nữ", "0983679160", "Hà Đông, Hà Nội", "Vẽ, xem phim", 2, "2026-10-18 08:17:00"),
    (18, 19, "B24DTCN018", "Hồ Anh Khoa", "2006-08-10", "Nam", "0908436469", "Thanh Xuân, Hà Nội", "Đọc sách, chơi cờ vua", 3, "2026-10-19 08:18:00"),
    (19, 20, "B24DTCN019", "Nguyễn Hoàng Long Vũ Minh Quân Thiên Phúc", "2006-10-03", "Nữ", "0982123789", "Nam Từ Liêm, Hà Nội", "Nghe nhạc, chụp ảnh", 4, "2026-10-20 08:19:00"),
    (20, 21, "B24DTCN020", "Đinh Công Danh", "2006-04-02", "Nam", "0943301467", None, "Bóng đá, chạy bộ", 5, "2026-10-21 08:20:00"),
]

STUDENTS = [
    {
        "id": sid, "user_id": uid, "student_code": code, "full_name": name,
        "birth_date": date.fromisoformat(birth), "gender": gender,
        "email": f"{code.lower()}@stu.ptit.edu.vn", "phone": phone,
        "address": address, "avatar_filename": None, "hobbies": hobbies,
        "class_id": class_id, "created_at": _dt(created), "updated_at": None,
    }
    for sid, uid, code, name, birth, gender, phone, address, hobbies, class_id, created in _STUDENTS
]

SKILLS = [
    {"id": 1, "name": "Python"}, {"id": 2, "name": "SQL"}, {"id": 3, "name": "HTML/CSS"},
    {"id": 4, "name": "JavaScript"}, {"id": 5, "name": "PHP"}, {"id": 6, "name": "Java"},
    {"id": 7, "name": "Git"}, {"id": 8, "name": "Figma"}, {"id": 9, "name": "Photoshop"},
    {"id": 10, "name": "Tiếng Anh"},
]

# (student_id, skill_id, level)
_SKILL_LINKS = [
    (1, 10, 1), (1, 1, 1), (1, 2, 3), (1, 9, 4),
    (2, 7, 4), (2, 8, 5), (2, 9, 1),
    (3, 1, 5), (3, 2, 5), (3, 3, 1), (3, 4, 3), (3, 5, 5), (3, 6, 1), (3, 7, 4), (3, 8, 1),
    (4, 2, 5), (4, 8, 4),
    (6, 1, 2), (6, 6, 5), (6, 5, 2),
    (7, 6, 4), (7, 8, 2),
    (8, 7, 4), (8, 5, 2), (8, 4, 2),
    (9, 4, 2), (9, 6, 4), (9, 10, 3), (9, 2, 1),
    (10, 5, 2),
    (11, 8, 4),
    (13, 4, 5), (13, 7, 4), (13, 9, 3),
    (14, 6, 5), (14, 2, 1), (14, 1, 3), (14, 3, 5),
    (15, 5, 4), (15, 1, 4), (15, 3, 2),
    (16, 5, 2),
    (17, 1, 4), (17, 2, 1),
    (18, 2, 4), (18, 4, 3), (18, 9, 2),
    (19, 8, 5),
]

STUDENT_SKILLS = [{"student_id": s, "skill_id": k, "level": lv} for s, k, lv in _SKILL_LINKS]

# (student_id, platform, url)
_SOCIAL_LINKS = [
    (1, "Facebook", "https://facebook.com/b24dtcn001"), (1, "GitHub", "https://github.com/b24dtcn001"),
    (2, "Facebook", "https://facebook.com/b24dtcn002"),
    (3, "GitHub", "https://github.com/b24dtcn003"),
    (4, "Facebook", "https://facebook.com/b24dtcn004"),
    (5, "Facebook", "https://facebook.com/b24dtcn005"), (5, "GitHub", "https://github.com/b24dtcn005"),
    (5, "LinkedIn", "https://linkedin.com/in/b24dtcn005"),
    (7, "Facebook", "https://facebook.com/b24dtcn007"), (7, "GitHub", "https://github.com/b24dtcn007"),
    (8, "Facebook", "https://facebook.com/b24dtcn008"),
    (9, "GitHub", "https://github.com/b24dtcn009"),
    (10, "Facebook", "https://facebook.com/b24dtcn010"), (10, "LinkedIn", "https://linkedin.com/in/b24dtcn010"),
    (11, "Facebook", "https://facebook.com/b24dtcn011"), (11, "GitHub", "https://github.com/b24dtcn011"),
    (13, "Facebook", "https://facebook.com/b24dtcn013"), (13, "GitHub", "https://github.com/b24dtcn013"),
    (14, "Facebook", "https://facebook.com/b24dtcn014"),
    (15, "GitHub", "https://github.com/b24dtcn015"), (15, "LinkedIn", "https://linkedin.com/in/b24dtcn015"),
    (16, "Facebook", "https://facebook.com/b24dtcn016"),
    (17, "Facebook", "https://facebook.com/b24dtcn017"), (17, "GitHub", "https://github.com/b24dtcn017"),
    (19, "Facebook", "https://facebook.com/b24dtcn019"), (19, "GitHub", "https://github.com/b24dtcn019"),
    (20, "Facebook", "https://facebook.com/b24dtcn020"), (20, "LinkedIn", "https://linkedin.com/in/b24dtcn020"),
]

SOCIAL_LINKS = [
    {"id": i + 1, "student_id": s, "platform": p, "url": u}
    for i, (s, p, u) in enumerate(_SOCIAL_LINKS)
]

PROFILE_UPDATE_REQUESTS = [
    {
        "id": 1, "student_id": 2, "status": "pending", "pending_flag": 1, "reviewed_by": None,
        "reject_reason": None, "created_at": _dt("2026-11-14 09:00:00"), "reviewed_at": None,
        "new_data": {
            "phone": "0987654321", "hobbies": "Vẽ, đọc truyện",
            "skills": [{"name": "Python", "level": 4}, {"name": "SQL", "level": 3}],
            "social_links": [{"platform": "GitHub", "url": "https://github.com/b24dtcn002"}],
        },
    },
    {
        "id": 2, "student_id": 3, "status": "rejected", "pending_flag": None, "reviewed_by": 1,
        "reject_reason": "Số điện thoại phải gồm 10 chữ số",
        "created_at": _dt("2026-11-10 14:00:00"), "reviewed_at": _dt("2026-11-11 08:30:00"),
        "new_data": {"phone": "12345"},
    },
    {
        "id": 3, "student_id": 4, "status": "approved", "pending_flag": None, "reviewed_by": 1,
        "reject_reason": None,
        "created_at": _dt("2026-11-05 10:00:00"), "reviewed_at": _dt("2026-11-06 09:15:00"),
        "new_data": {"address": "Cầu Giấy, Hà Nội"},
    },
]

AUDIT_LOGS = [
    {"id": 1, "user_id": 1, "action": "create", "target_type": "student", "target_id": 1,
     "old_data": None, "created_at": _dt("2026-10-02 08:01:00"),
     "new_data": {"student_code": "B24DTCN001", "full_name": "Nguyễn Văn An", "class": "D24CNTT01"}},
    {"id": 2, "user_id": 1, "action": "approve", "target_type": "student", "target_id": 4,
     "old_data": {"address": None}, "new_data": {"address": "Cầu Giấy, Hà Nội"},
     "created_at": _dt("2026-11-06 09:15:00")},
    {"id": 3, "user_id": 1, "action": "reject", "target_type": "student", "target_id": 3,
     "old_data": None, "new_data": {"reject_reason": "Số điện thoại phải gồm 10 chữ số"},
     "created_at": _dt("2026-11-11 08:30:00")},
    {"id": 4, "user_id": 1, "action": "delete", "target_type": "student", "target_id": 99,
     "old_data": {"student_code": "B24DTCN099", "full_name": "Nguyễn Văn Z", "class": "D24CNTT01",
                  "skills": [{"name": "Python", "level": 3}],
                  "social_links": [{"platform": "GitHub", "url": "https://github.com/b24dtcn099"}]},
     "new_data": None, "created_at": _dt("2026-11-12 16:20:00")},
]

# Thứ tự chèn phải đúng khoá ngoại
SEED_STATEMENTS = [
    (User, USERS),
    (Major, MAJORS),
    (ClassRoom, CLASSES),
    (Student, STUDENTS),
    (Skill, SKILLS),
    (StudentSkill, STUDENT_SKILLS),
    (SocialLink, SOCIAL_LINKS),
    (ProfileUpdateRequest, PROFILE_UPDATE_REQUESTS),
    (AuditLog, AUDIT_LOGS),
]
