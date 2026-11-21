"""Upload ảnh đại diện (API.md mục 3.7): jpg/png/webp, tối đa 2MB, đổi tên ngẫu nhiên."""
import uuid
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings
from app.core.errors import ApiError

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MESSAGE = "Ảnh chỉ chấp nhận jpg, png, webp và tối đa 2MB"

def _kind(head: bytes) -> str | None:
    if head.startswith(b"\xff\xd8\xff"): return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"): return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP": return "webp"
    return None

async def save_avatar(file: UploadFile) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT: raise ApiError(400, MESSAGE, field="avatar")
    data = await file.read(settings.MAX_AVATAR_BYTES + 1)
    if len(data) > settings.MAX_AVATAR_BYTES or not data: raise ApiError(400, MESSAGE, field="avatar")
    kind = _kind(data[:16])
    if kind is None: raise ApiError(400, MESSAGE, field="avatar")
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{kind}"
    (settings.UPLOAD_DIR / filename).write_bytes(data)
    return filename

def delete_avatar(filename: str | None) -> None:
    if not filename or filename == "default-avatar.png": return
    path = (settings.UPLOAD_DIR / filename).resolve()
    if settings.UPLOAD_DIR.resolve() in path.parents and path.is_file(): path.unlink()