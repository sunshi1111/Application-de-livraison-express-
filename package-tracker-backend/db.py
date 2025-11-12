"""
数据库初始化与会话管理
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


DATABASE_URL = "sqlite:///./data.db"


class Base(DeclarativeBase):
    pass


# echo=False 以减少日志噪音；check_same_thread=False 允许多线程（FastAPI 开发环境）
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}, echo=False
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    """创建数据库表结构"""
    import orm_models  # noqa: F401 触发表定义导入
    Base.metadata.create_all(bind=engine)
