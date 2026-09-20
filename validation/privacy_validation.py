import re
from typing import Any
from utils.helpers import pass_result, warning_result


def validate_privacy(df_columns: list[str], sample_values: list[str] | None = None) -> list[dict[str, Any]]:
    r = []
    pii_patterns = [
        r"\b\d{3}-\d{2}-\d{4}\b",
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        r"\b\d{10}\b",
    ]
    if sample_values:
        for val in sample_values:
            for pat in pii_patterns:
                if re.search(pat, str(val)):
                    r.append(warning_result("PII_DETECTED", f"Potential PII found: {val}", 1))
                    break
    if not r:
        r.append(pass_result("Privacy validation passed"))
    return r
