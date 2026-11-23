"""Giới hạn số lần gọi trong một khoảng thời gian — chống dò mật khẩu (brute-force).

Lưu trong bộ nhớ tiến trình, đủ cho đồ án chạy 1 server uvicorn.
Mỗi khóa có cửa sổ trượt đơn giản: giữ danh sách mốc thời gian các lần gọi,
loại bỏ các mốc cũ hơn `window_seconds` rồi đếm.
"""
import time
from collections import defaultdict, deque

from app.core.errors import ApiError


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        """Ghi nhận 1 lần gọi cho `key`; vượt `limit` trong `window_seconds` thì báo 429."""
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] >= window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = max(1, int(window_seconds - (now - hits[0])))
            raise ApiError(
                429,
                f"Bạn đã thử quá nhiều lần, vui lòng thử lại sau {retry_after} giây",
                code="TOO_MANY_REQUESTS",
            )
        hits.append(now)

    def reset(self, key: str) -> None:
        self._hits.pop(key, None)

    def clear(self) -> None:
        self._hits.clear()


login_limiter = InMemoryRateLimiter()
