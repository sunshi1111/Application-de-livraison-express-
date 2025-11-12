"""SQLAlchemy ORM 模型定义"""

from datetime import datetime
from typing import List
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime

from db import Base


class PackageORM(Base):
    __tablename__ = "packages"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    create_time: Mapped[float] = mapped_column(Float, index=True)
    src: Mapped[str] = mapped_column(String, index=True)
    dst: Mapped[str] = mapped_column(String, index=True)
    category: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[str] = mapped_column(String, default="created")
    current_location: Mapped[str] = mapped_column(String, index=True)

    history_events: Mapped[List["HistoryEventORM"]] = relationship(
        back_populates="package", cascade="all, delete-orphan"
    )


class HistoryEventORM(Base):
    __tablename__ = "history_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    package_id: Mapped[str] = mapped_column(String, ForeignKey("packages.id", ondelete="CASCADE"))
    timestamp: Mapped[float] = mapped_column(Float, index=True)
    location: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(Text)
    # 停留时长，单位小时（可为 NULL）
    stay_duration: Mapped[float] = mapped_column(Float, nullable=True)

    package: Mapped[PackageORM] = relationship(back_populates="history_events")


# 统一节点表（站点/中心）
class NodeORM(Base):
    __tablename__ = "nodes"

    # 使用业务ID（如 s0/c0）作为主键，方便与前端/算法对齐
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    node_type: Mapped[str] = mapped_column(String, index=True)  # 'station' | 'center'
    pos_x: Mapped[float] = mapped_column(Float)
    pos_y: Mapped[float] = mapped_column(Float)
    throughput: Mapped[int] = mapped_column(Integer)
    delay: Mapped[float] = mapped_column(Float)
    cost: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EdgeORM(Base):
    __tablename__ = "edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    src_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    dst_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    time_cost: Mapped[float] = mapped_column(Float)
    money_cost: Mapped[float] = mapped_column(Float)
    edge_type: Mapped[str] = mapped_column(String, index=True)  # airline/highway/road
    distance: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SystemSnapshotORM(Base):
    __tablename__ = "system_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    station_num: Mapped[int] = mapped_column(Integer)
    center_num: Mapped[int] = mapped_column(Integer)
    packet_num: Mapped[int] = mapped_column(Integer)
    parameters_json: Mapped[str] = mapped_column(Text)  # JSON 字符串
    time_checksum: Mapped[str] = mapped_column(String, default="")
    money_checksum: Mapped[str] = mapped_column(String, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="customer")  # admin/customer/operator
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
