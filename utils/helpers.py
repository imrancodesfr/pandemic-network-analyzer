from typing import Any

def result(status: str, code: str, message: str, affected_records: int = 0) -> dict[str, Any]:
    return {
        "status": status,
        "code": code,
        "message": message,
        "affected_records": affected_records,
    }

def pass_result(message: str = "OK") -> dict:
    return result("PASS", "PASS", message)

def warning_result(code: str, message: str, n: int = 0) -> dict:
    return result("WARNING", code, message, n)

def error_result(code: str, message: str, n: int = 0) -> dict:
    return result("ERROR", code, message, n)

def format_pct(value: float) -> str:
    return f"{value * 100:.1f}%"

def safe_divide(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b > 0 else default
