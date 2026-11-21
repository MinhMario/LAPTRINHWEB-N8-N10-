"""Hàm dùng chung cho các service: phân trang, tìm kiếm LIKE."""
import math
from sqlalchemy.orm import Query
from app.core.config import settings

def like_pattern(keyword: str) -> str:
    escaped = keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"

def paginate(query: Query, page: int, page_size: int, mapper=None) -> dict:
    page_size = min(page_size, settings.PAGE_SIZE_MAX)
    total = query.order_by(None).count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    if mapper:
        items = [mapper(item) for item in items]
    return {"items": items, "page": page, "page_size": page_size, "total": total,
            "total_pages": math.ceil(total / page_size) if total else 0}