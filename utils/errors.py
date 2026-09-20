class ValidationError(Exception):
    def __init__(self, code: str, message: str, affected_records: int = 0):
        self.code = code
        self.message = message
        self.affected_records = affected_records
        super().__init__(f"[{code}] {message}")

class InsufficientDataError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
