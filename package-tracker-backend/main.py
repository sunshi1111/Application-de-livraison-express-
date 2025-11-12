"""
包裹追踪系统 FastAPI 后端服务器
基于test.ipynb的逻辑实现
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from typing import List, Dict, Any, Optional
import logging
import traceback
from contextlib import contextmanager

# 导入自定义模块
from data_generator import data_gen, format_data_for_api, parameters
from path_calculator import PathCalculator
from models import (
    SystemData, PathRequest, PathResult, PackageSearchRequest,
    PackageUpdateRequest, PackageScheduleRequest, PackageBatchRequest, SystemStats, Package, PathInfo
)
from db import SessionLocal, init_db
from orm_models import (
    PackageORM, HistoryEventORM,
    NodeORM, EdgeORM, SystemSnapshotORM, UserORM
)
from db import engine
from sqlalchemy import text, func
import random

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="包裹追踪系统 API",
    description="基于智能路径规划算法的包裹追踪系统后端API",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量存储系统数据
current_system_data = None
path_calculator = None
current_snapshot_id = None


@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def orm_package_to_dict(p: PackageORM) -> Dict[str, Any]:
    return {
        "id": p.id,
        "createTime": float(p.create_time),
        "src": p.src,
        "dst": p.dst,
        "category": int(p.category),
        "status": p.status,
        "currentLocation": p.current_location,
        "history": [
            {
                "timestamp": float(h.timestamp),
                "location": h.location,
                "action": h.action,
                "stayDuration": float(h.stay_duration) if getattr(h, 'stay_duration', None) is not None else None,
            }
            for h in sorted(p.history_events, key=lambda x: x.timestamp)
        ],
    }

def initialize_system():
    """初始化系统数据、路径计算器，并持久化拓扑与快照"""
    global current_system_data, path_calculator, current_snapshot_id
    try:
        raw_data = data_gen()
        current_system_data = format_data_for_api(raw_data)

        # 创建路径计算器
        time_cost_matrix = np.array(raw_data["time_cost_matrix"])
        money_cost_matrix = np.array(raw_data["money_cost_matrix"])
        path_calculator = PathCalculator(time_cost_matrix, money_cost_matrix)

        # 写入或复用数据库拓扑与包裹
        init_db()
        from sqlalchemy import select
        import json, hashlib
        with get_db() as db:
            # 创建系统快照
            time_checksum = hashlib.md5(time_cost_matrix.tobytes()).hexdigest()
            money_checksum = hashlib.md5(money_cost_matrix.tobytes()).hexdigest()
            snapshot = SystemSnapshotORM(
                station_num=parameters["station_num"],
                center_num=parameters["center_num"],
                packet_num=parameters["packet_num"],
                parameters_json=json.dumps(parameters, ensure_ascii=False),
                time_checksum=time_checksum,
                money_checksum=money_checksum,
                active=True,
            )
            db.add(snapshot)
            db.commit()
            current_snapshot_id = snapshot.id

            # 确保 history_events 表包含 stay_duration 列（向后兼容）
            try:
                with engine.connect() as conn:
                    cols = [r[1] for r in conn.execute(text("PRAGMA table_info('history_events')")).fetchall()]
                    if 'stay_duration' not in cols:
                        conn.execute(text("ALTER TABLE history_events ADD COLUMN stay_duration REAL"))
            except Exception:
                # 非关键，继续初始化
                pass

            # 若节点表为空则写入 nodes 与 edges
            node_exists = db.execute(select(NodeORM).limit(1)).first() is not None
            if not node_exists:
                node_objs = []
                for s in current_system_data["stations"]:
                    node_objs.append(NodeORM(
                        id=s["id"], node_type="station", pos_x=s["pos"][0], pos_y=s["pos"][1],
                        throughput=s["throughput"], delay=s["delay"], cost=s["cost"]
                    ))
                for c in current_system_data["centers"]:
                    node_objs.append(NodeORM(
                        id=c["id"], node_type="center", pos_x=c["pos"][0], pos_y=c["pos"][1],
                        throughput=c["throughput"], delay=c["delay"], cost=c["cost"]
                    ))
                if node_objs:
                    db.bulk_save_objects(node_objs)

                edge_objs = []
                for e in current_system_data["edges"]:
                    # 可能没有 distance，尝试推算
                    distance = 0.0
                    edge_objs.append(EdgeORM(
                        src_id=e["src"], dst_id=e["dst"], time_cost=e["timeCost"],
                        money_cost=e["moneyCost"], edge_type=e.get("type", "road"), distance=distance
                    ))
                if edge_objs:
                    db.bulk_save_objects(edge_objs)
                db.commit()

            # 包裹数据（若为空则写入）
            pkg_exists = db.execute(select(PackageORM).limit(1)).first() is not None
            if not pkg_exists:
                packages = []
                histories = []
                for packet in current_system_data["packets"]:
                    # persist package
                    packages.append(PackageORM(
                        id=packet["id"], create_time=packet["createTime"], src=packet["src"],
                        dst=packet["dst"], category=packet["category"], status=packet["status"],
                        current_location=packet["currentLocation"],
                    ))

                    # 生成更完整的历史事件：基于路径计算器推断经过的节点、每段旅行时间与停留时间
                    try:
                        temp = {"src": packet["src"], "dst": packet["dst"], "category": int(packet["category"]) }
                        path_result = path_calculator.calculate_optimal_path(temp)
                        # 使用 time 作为旅行时间来源
                        time_total, time_info = path_calculator.calculate_path_cost(path_result.get("path", []), "time")
                        segments = time_info.get("segments", [])
                    except Exception:
                        segments = []

                    # 模拟时间轴：从 create_time 开始，先在 src 停留一段时间再出发
                    cur_time = float(packet["createTime"])
                    # 初始停留（发货准备时间）——延长以提高在站点驻留概率
                    init_stay = float(random.uniform(0.5, 2.0))
                    histories.append(HistoryEventORM(
                        package_id=packet["id"], timestamp=cur_time,
                        location=packet["src"], action="Colis créé", stay_duration=init_stay
                    ))
                    cur_time += init_stay

                    # 每个 segment 对应 path[i] -> path[i+1]
                    path_nodes = path_result.get("path", []) if 'path_result' in locals() else []
                    for i, seg in enumerate(segments):
                        travel_time = float(seg.get("cost", 0.0))
                        # 出发 -> 到达下一个节点
                        arrival_time = cur_time + travel_time
                        next_node = path_nodes[i+1] if i+1 < len(path_nodes) else None
                        if next_node is None:
                            cur_time = arrival_time
                            continue
                        # 停留时长可基于节点吞吐做简单映射（吞吐越大停留越短），但这里用随机近似
                        # 延长停留时长：中间节点停留设为 0.5-4h，最后到达的节点停留更长（6-24h）以便在仿真结束时可见
                        if i == len(segments) - 1:
                            stay = float(random.uniform(6.0, 24.0))
                        else:
                            stay = float(random.uniform(0.5, 4.0))
                        histories.append(HistoryEventORM(
                            package_id=packet["id"], timestamp=arrival_time,
                            location=next_node, action="Arrivé", stay_duration=stay
                        ))
                        # 更新当前时间为到达后离开时间
                        cur_time = arrival_time + stay
                if packages:
                    db.bulk_save_objects(packages)
                if histories:
                    db.bulk_save_objects(histories)
                db.commit()
                # 在写入历史后，更新每个包裹的 current_location 为其最后一次历史事件位置（若存在）
                try:
                    for pkg in db.execute(select(PackageORM)).scalars().all():
                        last_ev = db.execute(
                            select(HistoryEventORM).where(HistoryEventORM.package_id == pkg.id).order_by(HistoryEventORM.timestamp.desc()).limit(1)
                        ).scalar_one_or_none()
                        if last_ev:
                            pkg.current_location = last_ev.location
                    db.commit()
                except Exception:
                    # 非关键失败：记录并继续
                    logger.exception('Failed to update package current_location from histories')

        logger.info("System initialized (snapshot persisted)")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize system: {e}")
        logger.error(traceback.format_exc())
        return False

# 启动时初始化系统
@app.on_event("startup")
async def startup_event():
    # 初始化数据库表
    init_db()
    success = initialize_system()
    if not success:
        logger.error("Failed to initialize system on startup")

@app.get("/", tags=["系统"])
async def root():
    """根路径 - 系统信息"""
    return {
        "message": "包裹追踪系统 API",
        "version": "1.0.0",
        "description": "基于智能路径规划算法的包裹追踪系统",
        "author": "孙石，朱虹翱"
    }

@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查端点"""
    try:
        # 检查系统是否初始化
        if current_system_data is None or path_calculator is None:
            return JSONResponse(
                status_code=503,
                content={"status": "unhealthy", "message": "System not initialized"}
            )
        
        return {
            "status": "healthy",
            "message": "Service is running",
            "timestamp": "2025-09-29",
            "components": {
                "system_data": "ok" if current_system_data is not None else "error",
                "path_calculator": "ok" if path_calculator is not None else "error"
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "message": f"Health check failed: {str(e)}"
            }
        )

@app.get("/api/system/data", response_model=Dict[str, Any], tags=["系统"])
async def get_system_data():
    """获取完整的系统数据（站点、中心、边、包裹）"""
    if current_system_data is None:
        success = initialize_system()
        if not success:
            raise HTTPException(status_code=500, detail="系统初始化失败")
    # 使用数据库中的包裹替换内存中的包裹
    from sqlalchemy import select
    packets: List[Dict[str, Any]] = []
    with get_db() as db:
        for (pkg,) in db.execute(select(PackageORM)).all():
            d = orm_package_to_dict(pkg)
            # 计算路径信息（不落库）
            try:
                path_result = path_calculator.calculate_optimal_path(d)
                d["calculatedPath"] = path_result
                d["path"] = path_result["path"]
            except Exception:
                d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
                d["path"] = []
            packets.append(d)

    result = dict(current_system_data)
    result["packets"] = packets
    return result

@app.get("/api/system/stats", response_model=Dict[str, Any], tags=["系统"])
async def get_system_stats():
    """获取系统统计信息"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    
    # 计算统计信息
    packages_by_category = {"标准": 0, "快递": 0}
    packages_by_status = {}
    
    from sqlalchemy import select
    total_packages = 0
    with get_db() as db:
        for (pkg,) in db.execute(select(PackageORM)).all():
            total_packages += 1
            category_name = "快递" if pkg.category == 1 else "标准"
            packages_by_category[category_name] += 1
            packages_by_status[pkg.status] = packages_by_status.get(pkg.status, 0) + 1
    
    return {
        "totalStations": len(current_system_data["stations"]),
        "totalCenters": len(current_system_data["centers"]),
        "totalPackages": total_packages,
        "totalEdges": len(current_system_data["edges"]),
        "packagesByCategory": packages_by_category,
        "packagesByStatus": packages_by_status,
        "parameters": current_system_data["parameters"]
    }

@app.post("/api/system/regenerate", tags=["系统"])
async def regenerate_system():
    """重新生成系统数据（新快照），保留已有节点/边，更新包裹与快照"""
    global current_system_data, path_calculator, current_snapshot_id
    try:
        raw_data = data_gen()
        current_system_data = format_data_for_api(raw_data)
        path_calculator = PathCalculator(
            np.array(raw_data["time_cost_matrix"]),
            np.array(raw_data["money_cost_matrix"]),
        )

        init_db()
        from sqlalchemy import select, delete
        import json, hashlib
        with get_db() as db:
            # 旧快照标记不再 active
            if current_snapshot_id is not None:
                snap = db.execute(select(SystemSnapshotORM).where(SystemSnapshotORM.id == current_snapshot_id)).scalar_one_or_none()
                if snap:
                    snap.active = False

            # 新快照
            time_checksum = hashlib.md5(np.array(raw_data["time_cost_matrix"]).tobytes()).hexdigest()
            money_checksum = hashlib.md5(np.array(raw_data["money_cost_matrix"]).tobytes()).hexdigest()
            new_snap = SystemSnapshotORM(
                station_num=parameters["station_num"],
                center_num=parameters["center_num"],
                packet_num=parameters["packet_num"],
                parameters_json=json.dumps(parameters, ensure_ascii=False),
                time_checksum=time_checksum,
                money_checksum=money_checksum,
                active=True,
            )
            db.add(new_snap)
            db.commit()
            current_snapshot_id = new_snap.id

            # 仅重置包裹相关表
            db.execute(delete(HistoryEventORM))
            db.execute(delete(PackageORM))

            packages = []
            histories = []
            for packet in current_system_data["packets"]:
                packages.append(PackageORM(
                    id=packet["id"], create_time=packet["createTime"], src=packet["src"],
                    dst=packet["dst"], category=packet["category"], status=packet["status"],
                    current_location=packet["currentLocation"],
                ))

                # 为每个包裹生成基于路径的历史事件（到达时间 + 停留）
                try:
                    temp = {"src": packet["src"], "dst": packet["dst"], "category": int(packet["category"]) }
                    path_result = path_calculator.calculate_optimal_path(temp)
                    time_total, time_info = path_calculator.calculate_path_cost(path_result.get("path", []), "time")
                    segments = time_info.get("segments", [])
                except Exception:
                    segments = []

                cur_time = float(packet["createTime"])
                # 初始停留延长，避免立即离开导致无法在后续时间点看到包裹
                init_stay = float(random.uniform(0.5, 2.0))
                histories.append(HistoryEventORM(
                    package_id=packet["id"], timestamp=cur_time,
                    location=packet["src"], action="Colis créé", stay_duration=init_stay
                ))
                cur_time += init_stay

                path_nodes = path_result.get("path", []) if 'path_result' in locals() else []
                for i, seg in enumerate(segments):
                    travel_time = float(seg.get("cost", 0.0))
                    arrival_time = cur_time + travel_time
                    next_node = path_nodes[i+1] if i+1 < len(path_nodes) else None
                    if next_node is None:
                        cur_time = arrival_time
                        continue
                    # 中间节点停留设为 0.5-4h，最后到达的节点停留更长以便在仿真结束时可见
                    if i == len(segments) - 1:
                        stay = float(random.uniform(6.0, 24.0))
                    else:
                        stay = float(random.uniform(0.5, 4.0))
                    histories.append(HistoryEventORM(
                        package_id=packet["id"], timestamp=arrival_time,
                        location=next_node, action="Arrivé", stay_duration=stay
                    ))
                    cur_time = arrival_time + stay
            if packages:
                db.bulk_save_objects(packages)
            if histories:
                db.bulk_save_objects(histories)
            db.commit()

            # 在写入历史后，尝试更新每个包裹的 current_location 为其最后一次历史事件位置（若存在）
            try:
                for pkg in db.execute(select(PackageORM)).scalars().all():
                    last_ev = db.execute(
                        select(HistoryEventORM).where(HistoryEventORM.package_id == pkg.id).order_by(HistoryEventORM.timestamp.desc()).limit(1)
                    ).scalar_one_or_none()
                    if last_ev:
                        pkg.current_location = last_ev.location
                db.commit()
            except Exception:
                # 非关键失败：记录并继续
                logger.exception('Failed to update package current_location from histories')

        return {"message": "系统数据已重新生成", "snapshotId": current_snapshot_id}
    except Exception as e:
        logger.error(f"Error regenerating system: {e}")
        raise HTTPException(status_code=500, detail=f"重新生成失败: {str(e)}")

@app.get("/api/packages", response_model=List[Dict[str, Any]], tags=["包裹"])
async def get_packages(
    limit: Optional[int] = Query(None, description="返回包裹数量限制"),
    category: Optional[int] = Query(None, description="包裹类别筛选 (0=标准, 1=快递)")
):
    """获取包裹列表"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    from sqlalchemy import select
    results: List[Dict[str, Any]] = []
    with get_db() as db:
        query = select(PackageORM)
        if category is not None:
            # 简单在内存过滤即可（SQLite也可用 where，但保持简洁）
            pkgs = [
                (pkg,)
                for (pkg,) in db.execute(query).all()
                if pkg.category == int(category)
            ]
        else:
            pkgs = db.execute(query).all()

        for (pkg,) in pkgs[: (limit or len(pkgs))]:
            d = orm_package_to_dict(pkg)
            try:
                path_result = path_calculator.calculate_optimal_path(d)
                d["calculatedPath"] = path_result
                d["path"] = path_result["path"]
            except Exception:
                d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
                d["path"] = []
            results.append(d)

    return results

@app.get("/api/packages/{package_id}", response_model=Dict[str, Any], tags=["包裹"])
async def get_package(package_id: str):
    """根据ID获取特定包裹信息"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    from sqlalchemy import select
    with get_db() as db:
        row = db.execute(
            select(PackageORM).where(PackageORM.id.like(f"{package_id}%"))
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="包裹未找到")
        pkg = row[0]
        d = orm_package_to_dict(pkg)
        try:
            path_result = path_calculator.calculate_optimal_path(d)
            d["calculatedPath"] = path_result
            d["path"] = path_result["path"]
        except Exception:
            d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
            d["path"] = []
        return d

@app.post("/api/packages/search", response_model=List[Dict[str, Any]], tags=["包裹"])
async def search_packages(request: Dict[str, str]):
    """搜索包裹"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    q = request.get("query", "").lower().strip()
    from sqlalchemy import select
    results: List[Dict[str, Any]] = []
    with get_db() as db:
        pkgs = [pkg for (pkg,) in db.execute(select(PackageORM)).all()]
        if not q:
            pkgs = pkgs[:10]
        else:
            pkgs = [
                p for p in pkgs
                if (
                    q in p.id.lower()
                    or q in p.src.lower()
                    or q in p.dst.lower()
                    or q in (p.status or "").lower()
                )
            ][:20]

        for pkg in pkgs:
            d = orm_package_to_dict(pkg)
            try:
                path_result = path_calculator.calculate_optimal_path(d)
                d["calculatedPath"] = path_result
                d["path"] = path_result["path"]
            except Exception:
                d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
                d["path"] = []
            results.append(d)

    return results

@app.post("/api/path/calculate", response_model=Dict[str, Any], tags=["路径"])
async def calculate_path(request: Dict[str, Any]):
    """计算两点间的最优路径"""
    if path_calculator is None:
        raise HTTPException(status_code=500, detail="路径计算器未初始化")
    
    try:
        src = request.get("src")
        dst = request.get("dst")
        category = request.get("category", 0)
        
        if not src or not dst:
            raise HTTPException(status_code=400, detail="源点和目标点不能为空")
        
        # 创建临时包裹对象进行路径计算
        temp_packet = {
            "src": src,
            "dst": dst,
            "category": category
        }
        
        # 计算路径
        path_result = path_calculator.calculate_optimal_path(temp_packet)
        
        return path_result
        
    except Exception as e:
        logger.error(f"Error calculating path: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"路径计算失败: {str(e)}")

@app.post("/api/path/alternative", response_model=Dict[str, Any], tags=["路径"])
async def calculate_alternative_path(request: Dict[str, Any]):
    """计算避开特定节点的替代路径"""
    if path_calculator is None:
        raise HTTPException(status_code=500, detail="路径计算器未初始化")
    
    try:
        src = request.get("src")
        dst = request.get("dst")
        avoid_node = request.get("avoid_node")
        category = request.get("category", 0)
        
        if not all([src, dst, avoid_node]):
            raise HTTPException(status_code=400, detail="源点、目标点和避开节点不能为空")
        
        # 计算替代路径
        if category == 1:  # 快递包裹
            path = path_calculator.find_alternative_time_path(src, dst, avoid_node)
        else:  # 标准包裹
            path = path_calculator.find_alternative_cost_path(src, dst, avoid_node)
        
        if not path:
            return {
                "path": [],
                "totalCost": float('inf'),
                "costType": "time" if category == 1 else "money",
                "pathInfo": {
                    "segments": [],
                    "totalTime": float('inf'),
                    "totalMoney": float('inf'),
                    "optimizedFor": "time" if category == 1 else "money"
                },
                "message": "无法找到替代路径"
            }
        
        # 计算路径成本
        cost_type = "time" if category == 1 else "money"
        total_cost, path_info = path_calculator.calculate_path_cost(path, cost_type)
        time_cost, _ = path_calculator.calculate_path_cost(path, "time")
        money_cost, _ = path_calculator.calculate_path_cost(path, "money")
        
        return {
            "path": path,
            "totalCost": total_cost,
            "costType": cost_type,
            "pathInfo": {
                "segments": path_info["segments"],
                "totalTime": float(time_cost),
                "totalMoney": float(money_cost),
                "optimizedFor": cost_type
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating alternative path: {e}")
        raise HTTPException(status_code=500, detail=f"替代路径计算失败: {str(e)}")

@app.get("/api/nodes", response_model=Dict[str, List[Dict[str, Any]]], tags=["网络"])
async def get_nodes():
    """获取所有节点（站点和中心）"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    
    return {
        "stations": current_system_data["stations"],
        "centers": current_system_data["centers"]
    }

@app.get("/api/edges", response_model=List[Dict[str, Any]], tags=["网络"])
async def get_edges(
    edge_type: Optional[str] = Query(None, description="边类型筛选 (airline/highway/road)")
):
    """获取所有边/连接"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    
    edges = current_system_data["edges"]
    
    # 按类型筛选
    if edge_type:
        edges = [e for e in edges if e["type"] == edge_type]
    
    return edges


@app.get("/api/nodes/counts", tags=["网络"])
async def get_node_counts():
    """返回每个节点当前驻留的包裹数量（用于管理员界面展示）"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    # 为了避免把“累计发出”当作当前驻留，使用仿真时间范围的 max（结束时间）计算每个节点在该时刻的驻留数量。
    try:
        bounds = await get_sim_bounds()
        t = float(bounds.get('max', 12.0))
        return await get_node_counts_at(timestamp=t)
    except Exception:
        # 如果计算 sim_bounds 失败，则回退到基于 current_location 的简单计算
        from sqlalchemy import select, func
        results = []
        with get_db() as db:
            # 获取所有节点
            nodes = db.execute(select(NodeORM)).scalars().all()
            for node in nodes:
                cnt = db.execute(select(func.count()).select_from(PackageORM).where(PackageORM.current_location == node.id)).scalar()
                results.append({
                    "id": node.id,
                    "type": node.node_type,
                    "pos": [node.pos_x, node.pos_y],
                    "throughput": node.throughput,
                    "currentPackageCount": int(cnt or 0)
                })

        results.sort(key=lambda x: (0 if x["type"] == "station" else 1, x["id"]))
        return results


@app.get("/api/nodes/{node_id}/packages_at", tags=["网络"])
async def get_packages_at_node(node_id: str, timestamp: float = Query(None, description="仿真时间（小时）")):
    """返回指定节点在给定时间点驻留的包裹简要信息（id, status, create_time）。
    若 timestamp 未提供，则使用当前时刻近似（等同于 /api/nodes/{node_id}/current_packages）。
    """
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    t = float(timestamp) if timestamp is not None else None
    from sqlalchemy import select
    result = []
    with get_db() as db:
        # 读取所有包裹和历史
        pkgs = db.execute(select(PackageORM)).scalars().all()
        hist_rows = db.execute(select(HistoryEventORM)).scalars().all()

        events_by_pkg = {}
        for h in hist_rows:
            events_by_pkg.setdefault(h.package_id, []).append(h)
        for pkg_id, evs in events_by_pkg.items():
            evs.sort(key=lambda x: x.timestamp)

        for pkg in pkgs:
            ct = float(getattr(pkg, 'create_time', 0.0) or 0.0)
            if t is not None and ct > t:
                continue

            evs = events_by_pkg.get(pkg.id, [])
            found = False
            for i, ev in enumerate(evs):
                ev_ts = float(ev.timestamp)
                ev_stay = float(ev.stay_duration) if getattr(ev, 'stay_duration', None) is not None else 0.0
                if t is not None:
                    if ev_ts <= t < (ev_ts + ev_stay):
                        if ev.location == node_id:
                            found = True
                            break
                else:
                    # 未提供时间，判断包裹当前位置
                    pass

            if t is None:
                # fallback: current_location
                if getattr(pkg, 'current_location', None) == node_id:
                    found = True

            if found:
                result.append({"id": pkg.id, "status": pkg.status, "createTime": float(pkg.create_time)})

    return result


@app.get("/api/nodes/counts_at", tags=["网络"])
async def get_node_counts_at(timestamp: float = Query(None, description="仿真时间（小时），例如 3.5")):
    """返回每个节点在指定时间点的驻留包裹数量（用于时间轴回放）。
    若未提供 timestamp，则等同于 /api/nodes/counts（当前时刻）。
    """
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    # 若 timestamp 未提供，退回到当前计数
    if timestamp is None:
        return await get_node_counts()

    from sqlalchemy import select
    results = []
    with get_db() as db:
        # 获取所有节点
        nodes = db.execute(select(NodeORM)).scalars().all()

        # 获取所有包裹和它们的历史事件（不受时间过滤，按包裹分组）
        packages = db.execute(select(PackageORM)).scalars().all()
        hist_rows = db.execute(select(HistoryEventORM)).scalars().all()

        # 将历史事件按包裹分组并按时间排序
        events_by_pkg = {}
        for h in hist_rows:
            events_by_pkg.setdefault(h.package_id, []).append(h)
        for pkg_id, evs in events_by_pkg.items():
            evs.sort(key=lambda x: x.timestamp)

        # 统计每个节点的包裹数（基于停留区间）
        counts = {n.id: 0 for n in nodes}

        for pkg in packages:
            pkg_id = pkg.id
            ct = float(getattr(pkg, 'create_time', 0.0) or 0.0)
            t = float(timestamp)

            # 未创建则跳过
            if ct > t:
                continue

            # 检查该包裹的历史事件，判断在时间 t 时是否处于某个事件的停留区间
            evs = events_by_pkg.get(pkg_id, [])
            found_loc = None

            for i, ev in enumerate(evs):
                ev_ts = float(ev.timestamp)
                ev_stay = float(ev.stay_duration) if getattr(ev, 'stay_duration', None) is not None else 0.0

                # 如果 t 在 [ev_ts, ev_ts + ev_stay) 内，视为停留在该位置
                if ev_ts <= t < (ev_ts + ev_stay):
                    found_loc = ev.location
                    break

                # 如果这是最后一个事件且没有显式停留，则也可以认为包裹在该位置从事件时刻起（用于兼容旧数据）
                if i == len(evs) - 1 and ev_ts <= t and ev_stay == 0.0:
                    # 只有当没有后续事件时才把它视为仍在该位置
                    found_loc = ev.location
                    break

            # 若没有历史事件匹配，仅在包裹没有任何历史事件记录时才回退到 current_location
            if found_loc is None:
                if not evs:
                    # 如果数据库中记录了 current_location 且 create_time <= t，则视为在 current_location
                    if getattr(pkg, 'current_location', None) and ct <= t:
                        found_loc = pkg.current_location

            if found_loc and found_loc in counts:
                counts[found_loc] += 1

        # 构造返回结果
        for node in nodes:
            results.append({
                "id": node.id,
                "type": node.node_type,
                "pos": [node.pos_x, node.pos_y],
                "throughput": node.throughput,
                "currentPackageCount": int(counts.get(node.id, 0))
            })

    results.sort(key=lambda x: (0 if x["type"] == "station" else 1, x["id"]))
    return results


@app.get("/api/system/sim_bounds", tags=["系统"])
async def get_sim_bounds():
    """返回仿真时间范围 {min: float, max: float}。
    max 会根据每个包裹的 create_time + path_total_time 计算（使用路径计算器缓存以减小开销）。
    """
    if current_system_data is None or path_calculator is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    from sqlalchemy import select
    max_t = 0.0
    with get_db() as db:
        pkgs = db.execute(select(PackageORM)).scalars().all()
        # 为降低重复计算，只对唯一 (src,dst,category) 计算路径
        seen = {}
        for pkg in pkgs:
            key = (pkg.src, pkg.dst, int(pkg.category))
            if key in seen:
                total_time = seen[key]
            else:
                # 使用 path_calculator（会走缓存）
                try:
                    r = path_calculator.calculate_optimal_path({"src": pkg.src, "dst": pkg.dst, "category": int(pkg.category)})
                    total_time = float(r.get("pathInfo", {}).get("totalTime", 0.0))
                except Exception:
                    total_time = 0.0
                seen[key] = total_time

            ct = float(getattr(pkg, 'create_time', 0.0) or 0.0)
            end = ct + (total_time if total_time is not None else 0.0)
            if end > max_t:
                max_t = end

    if max_t <= 0:
        max_t = 12.0
    return {"min": 0.0, "max": float((int(max_t * 100) + (1 if max_t * 100 % 1 else 0)) / 100)}

@app.get("/api/health", tags=["系统"])
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "system_initialized": current_system_data is not None,
        "path_calculator_ready": path_calculator is not None,
        "message": "服务运行正常"
    }


@app.post("/api/packages/update", tags=["包裹"])
async def update_package(req: PackageUpdateRequest):
    """更新包裹位置/状态，并记录历史，写入数据库"""
    from sqlalchemy import select
    with get_db() as db:
        row = db.execute(select(PackageORM).where(PackageORM.id == req.packageId)).first()
        if not row:
            raise HTTPException(status_code=404, detail="包裹未找到")
        pkg: PackageORM = row[0]

        if req.newLocation is not None:
            pkg.current_location = req.newLocation
        if req.newStatus is not None:
            pkg.status = req.newStatus
        if req.addHistory is not None:
            db.add(
                HistoryEventORM(
                    package_id=pkg.id,
                    timestamp=float(req.addHistory.timestamp),
                    location=req.addHistory.location,
                    action=req.addHistory.action,
                    stay_duration=float(random.uniform(0.05, 0.5))
                )
            )
        db.commit()

        d = orm_package_to_dict(pkg)
        try:
            path_result = path_calculator.calculate_optimal_path(d)
            d["calculatedPath"] = path_result
            d["path"] = path_result["path"]
        except Exception:
            d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
            d["path"] = []
        return d


@app.post("/api/packages/schedule", tags=["包裹"])
async def schedule_package(req: PackageScheduleRequest):
    """创建新的包裹（可指定仿真 createTime）。
    sendTime 为仿真时间小时值，用于前端时间轴显示；立即持久化。
    """
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")

    # 基本校验
    if req.src == req.dst:
        raise HTTPException(status_code=400, detail="源站与目的站不能相同")
    if req.category not in (0, 1):
        raise HTTPException(status_code=400, detail="类别必须为 0 或 1")
    if req.sendTime < 0:
        raise HTTPException(status_code=400, detail="发送时间不能为负数")

    import uuid, time
    packet_id = str(uuid.uuid4())
    create_time = float(req.sendTime)

    from sqlalchemy import select
    with get_db() as db:
        # 写入包裹
        pkg = PackageORM(
            id=packet_id,
            create_time=create_time,
            src=req.src,
            dst=req.dst,
            category=req.category,
            status="created",  # 使用 created；前端若 simTime < createTime 会显示 not_created
            current_location=req.src,
        )
        db.add(pkg)
        # 初始历史事件
        db.add(
                HistoryEventORM(
                package_id=pkg.id,
                timestamp=create_time,
                location=req.src,
                action="Colis créé",
                stay_duration=float(random.uniform(0.05, 0.5)),
            )
        )
        db.commit()
        # 转换返回
        d = orm_package_to_dict(pkg)
        try:
            path_result = path_calculator.calculate_optimal_path(d)
            d["calculatedPath"] = path_result
            d["path"] = path_result["path"]
        except Exception:
            d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
            d["path"] = []
        return d


@app.post("/api/packages/batch", tags=["包裹"])
async def get_packages_batch(req: PackageBatchRequest):
    """批量获取多个包裹，按传入顺序返回。"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    if not req.ids:
        return []
    from sqlalchemy import select
    results = []
    with get_db() as db:
        rows = db.execute(select(PackageORM).where(PackageORM.id.in_(req.ids))).all()
        mapping = {pkg.id: pkg for (pkg,) in rows}
        for pid in req.ids:
            pkg = mapping.get(pid)
            if not pkg:
                continue
            d = orm_package_to_dict(pkg)
            try:
                path_result = path_calculator.calculate_optimal_path(d)
                d["calculatedPath"] = path_result
                d["path"] = path_result["path"]
            except Exception:
                d["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
                d["path"] = []
            results.append(d)
    return results

# 错误处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"服务器内部错误: {str(exc)}"}
    )

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 启动包裹追踪系统 FastAPI 服务器...")
    print("📍 API文档: http://localhost:8000/docs")
    print("🔄 重新加载: http://localhost:8000/redoc")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )