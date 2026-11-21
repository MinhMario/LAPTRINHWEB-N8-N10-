"""Import đủ các model để SQLAlchemy cấu hình quan hệ giữa chúng."""
from app.models.audit_log import AuditLog
from app.models.class_ import ClassRoom
from app.models.major import Major
from app.models.skill import Skill, StudentSkill
from app.models.social_link import SocialLink
from app.models.student import Student
from app.models.update_request import ProfileUpdateRequest
from app.models.user import User

__all__ = [
    "AuditLog", "ClassRoom", "Major", "ProfileUpdateRequest",
    "Skill", "SocialLink", "Student", "StudentSkill", "User",
]