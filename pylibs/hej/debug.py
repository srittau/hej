import os


def debug() -> bool:
    return os.getenv("HEJ_DEBUG") in {"true", "True", "TRUE", "yes", "1"}
