"""
FastAPI数据模型定义
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class Position(BaseModel):
    """位置坐标"""
    x: float
    y: float

class Node(BaseModel):
    """节点（站点或中心）"""
    id: str
    pos: List[float]
    throughput: int
    delay: float
    cost: float
    type: str  # "station" or "center"

class Edge(BaseModel):
    """边/路径"""
    src: str
    dst: str
    timeCost: float
    moneyCost: float
    type: str  # "airline", "highway", "road"

class HistoryEvent(BaseModel):
    """历史事件"""
    timestamp: float
    location: str
    action: str

class Package(BaseModel):
    """包裹"""
    id: str
    createTime: float
    src: str
    dst: str
    category: int  # 0: 标准, 1: 快递
    status: str
    currentLocation: str
    history: List[HistoryEvent]

class PathSegment(BaseModel):
    """路径段"""
    from_node: str = None
    to_node: str = None
    cost: float

class PathInfo(BaseModel):
    """路径信息"""
    segments: List[Dict[str, Any]]
    totalTime: float
    totalMoney: float
    optimizedFor: str

class PathResult(BaseModel):
    """路径计算结果"""
    path: List[str]
    totalCost: float
    costType: str
    pathInfo: PathInfo

class SystemData(BaseModel):
    """系统完整数据"""
    stations: List[Node]
    centers: List[Node]
    edges: List[Edge]
    packets: List[Package]
    parameters: Dict[str, int]

class PathRequest(BaseModel):
    """路径计算请求"""
    src: str
    dst: str
    category: int = 0  # 0: 标准(成本优先), 1: 快递(时间优先)

class PackageSearchRequest(BaseModel):
    """包裹搜索请求"""
    query: str  # 包裹ID或关键词

class PackageUpdateRequest(BaseModel):
    """包裹更新请求"""
    packageId: str
    newLocation: Optional[str] = None
    newStatus: Optional[str] = None
    addHistory: Optional[HistoryEvent] = None

class SystemStats(BaseModel):
    """系统统计信息"""
    totalStations: int
    totalCenters: int
    totalPackages: int
    totalEdges: int
    packagesByCategory: Dict[str, int]
    packagesByStatus: Dict[str, int]