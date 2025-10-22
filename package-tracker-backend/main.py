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

# 导入自定义模块
from data_generator import data_gen, format_data_for_api, parameters
from path_calculator import PathCalculator
from models import (
    SystemData, PathRequest, PathResult, PackageSearchRequest,
    PackageUpdateRequest, SystemStats, Package, PathInfo
)

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

def initialize_system():
    """初始化系统数据和路径计算器"""
    global current_system_data, path_calculator
    
    try:
        # 生成系统数据
        raw_data = data_gen()
        current_system_data = format_data_for_api(raw_data)
        
        # 创建路径计算器
        time_cost_matrix = np.array(raw_data["time_cost_matrix"])
        money_cost_matrix = np.array(raw_data["money_cost_matrix"])
        path_calculator = PathCalculator(time_cost_matrix, money_cost_matrix)
        
        # 为所有包裹计算初始路径
        for packet in current_system_data["packets"]:
            try:
                path_result = path_calculator.calculate_optimal_path(packet)
                packet["calculatedPath"] = path_result
                packet["path"] = path_result["path"]
            except Exception as e:
                logger.error(f"Error calculating path for packet {packet['id']}: {e}")
                packet["calculatedPath"] = {"path": [], "totalCost": 0, "pathInfo": {}}
                packet["path"] = []
        
        logger.info("System initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize system: {e}")
        logger.error(traceback.format_exc())
        return False

# 启动时初始化系统
@app.on_event("startup")
async def startup_event():
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
    
    return current_system_data

@app.get("/api/system/stats", response_model=Dict[str, Any], tags=["系统"])
async def get_system_stats():
    """获取系统统计信息"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    
    # 计算统计信息
    packages_by_category = {"标准": 0, "快递": 0}
    packages_by_status = {}
    
    for packet in current_system_data["packets"]:
        # 统计类别
        category_name = "快递" if packet["category"] == 1 else "标准"
        packages_by_category[category_name] += 1
        
        # 统计状态
        status = packet["status"]
        packages_by_status[status] = packages_by_status.get(status, 0) + 1
    
    return {
        "totalStations": len(current_system_data["stations"]),
        "totalCenters": len(current_system_data["centers"]),
        "totalPackages": len(current_system_data["packets"]),
        "totalEdges": len(current_system_data["edges"]),
        "packagesByCategory": packages_by_category,
        "packagesByStatus": packages_by_status,
        "parameters": current_system_data["parameters"]
    }

@app.post("/api/system/regenerate", tags=["系统"])
async def regenerate_system():
    """重新生成系统数据"""
    try:
        success = initialize_system()
        if not success:
            raise HTTPException(status_code=500, detail="系统重新生成失败")
        
        return {
            "message": "系统数据已重新生成",
            "timestamp": current_system_data.get("timestamp", "unknown")
        }
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
    
    packages = current_system_data["packets"]
    
    # 按类别筛选
    if category is not None:
        packages = [p for p in packages if p["category"] == category]
    
    # 限制数量
    if limit is not None:
        packages = packages[:limit]
    
    return packages

@app.get("/api/packages/{package_id}", response_model=Dict[str, Any], tags=["包裹"])
async def get_package(package_id: str):
    """根据ID获取特定包裹信息"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    
    # 查找包裹
    for packet in current_system_data["packets"]:
        if packet["id"] == package_id or packet["id"].startswith(package_id):
            return packet
    
    raise HTTPException(status_code=404, detail="包裹未找到")

@app.post("/api/packages/search", response_model=List[Dict[str, Any]], tags=["包裹"])
async def search_packages(request: Dict[str, str]):
    """搜索包裹"""
    if current_system_data is None:
        raise HTTPException(status_code=500, detail="系统未初始化")
    
    query = request.get("query", "").lower().strip()
    if not query:
        return current_system_data["packets"][:10]  # 返回前10个包裹
    
    # 搜索匹配的包裹
    matches = []
    for packet in current_system_data["packets"]:
        if (query in packet["id"].lower() or 
            query in packet["src"].lower() or 
            query in packet["dst"].lower() or
            query in packet["status"].lower()):
            matches.append(packet)
    
    return matches[:20]  # 最多返回20个结果

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

@app.get("/api/health", tags=["系统"])
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "system_initialized": current_system_data is not None,
        "path_calculator_ready": path_calculator is not None,
        "message": "服务运行正常"
    }

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