"""Mọi lỗi trả về cùng một dạng, đúng như API.md mục 3.3:
    { "error": "...", "field": "..." | null, "code"?: "..." }
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status: int, error: str, field: str | None = None, code: str | None = None):
        self.status = status
        self.error = error
        self.field = field
        self.code = code


def error_body(error: str, field: str | None = None, code: str | None = None) -> dict:
    body = {"error": error, "field": field}
    if code:
        body["code"] = code
    return body


def _field_path(loc: tuple) -> str | None:
    parts = [p for p in loc if p not in ("body", "query", "path", "form")]
    out = ""
    for p in parts:
        out += f"[{p}]" if isinstance(p, int) else f".{p}"
    return out.lstrip(".") or None


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError):
        return JSONResponse(error_body(exc.error, exc.field, exc.code), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        field = _field_path(tuple(first.get("loc", ())))
        message = "Trường này là bắt buộc" if first.get("type") == "missing" else "Dữ liệu không hợp lệ"
        return JSONResponse(error_body(message, field), status_code=400)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        messages = {404: "Không tìm thấy", 405: "Phương thức không được hỗ trợ"}
        return JSONResponse(error_body(messages.get(exc.status_code, "Có lỗi xảy ra")), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        return JSONResponse(error_body("Lỗi máy chủ, vui lòng thử lại sau"), status_code=500)