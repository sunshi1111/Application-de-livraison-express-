

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from data_generator import parameters

class PathCalculator:
    """路径计算器（Bellman-Ford + 结果缓存）

    当前问题：在获取大量包裹（如 1000 条）时，每个包裹都会重复运行 Bellman-Ford 三重循环，
    时间复杂度 O(P * N^3)。N=节点数(约60)，P=包裹数(1000) 时会导致前端 10s 超时。此类路径是按 src/dst/category 重复的，
    因此加入缓存显著降低重复计算。
    """

    def __init__(self, time_cost_matrix: np.ndarray, money_cost_matrix: np.ndarray):
        """初始化路径计算器并建立缓存"""
        self.timecost = time_cost_matrix
        self.moneycost = money_cost_matrix
        self.timecost_initial = time_cost_matrix.copy()
        self.moneycost_initial = money_cost_matrix.copy()
        # 缓存: key=(src,dst,category) value=路径结果字典
        self._cache: Dict[tuple, Dict[str, Any]] = {}
    
    def _node_to_index(self, node_id: str) -> int:
        """
        将节点ID转换为矩阵索引
        
        Args:
            node_id: 节点ID (如 's0', 'c1')
            
        Returns:
            矩阵中对应的索引
        """
        if node_id[0] == 's':
            if len(node_id) == 2:
                return int(node_id[1]) * 2 + 2 * parameters["center_num"]
            else:
                return int(node_id[1:]) * 2 + 2 * parameters["center_num"]
        else:  # center
            return int(node_id[1:]) * 2
    
    def _index_to_node(self, index: int) -> str:
        """
        将矩阵索引转换为节点ID
        
        Args:
            index: 矩阵索引
            
        Returns:
            节点ID
        """
        if index > 2 * parameters["center_num"] - 1:
            return f"s{int((index - 2 * parameters['center_num']) / 2)}"
        else:
            return f"c{int(index / 2)}"
    
    def find_shortest_time_path(self, src: str, dst: str) -> List[str]:
        """
        使用Bellman-Ford算法寻找最短时间路径
        
        Args:
            src: 源节点ID
            dst: 目标节点ID
            
        Returns:
            最短路径的节点列表
        """
        # 转换节点ID为矩阵索引
        a = self._node_to_index(src)
        b = self._node_to_index(dst)
        
        n = len(self.timecost)  # 图的阶数
        Delta = [np.inf] * n  # 距离数组
        Chemins = [[] for _ in range(n)]  # 路径数组
        Delta[a] = 0  # 起点距离为0
        Chemins[a] = [a]  # 起点到自身的路径
        
        # Bellman-Ford算法主循环
        for k in range(n - 1):
            for i in range(n):
                for j in range(n):
                    if (self.timecost[i][j] != 0 and 
                        self.timecost[i][j] != np.inf and 
                        Delta[i] + self.timecost[i][j] < Delta[j]):
                        Delta[j] = Delta[i] + self.timecost[i][j]
                        Chemins[j] = Chemins[i] + [j]
        
        # 重建路径
        d = Chemins
        path = []
        if b < len(d) and len(d[b]) > 0:
            for i in range(int((len(d[b]) + 1) / 2)):
                if 2 * i < len(d[b]):
                    path.append(self._index_to_node(d[b][2 * i]))
        
        return path
    
    def find_lowest_cost_path(self, src: str, dst: str) -> List[str]:
        """
        使用Bellman-Ford算法寻找最低成本路径
        
        Args:
            src: 源节点ID
            dst: 目标节点ID
            
        Returns:
            最低成本路径的节点列表
        """
        # 转换节点ID为矩阵索引
        a = self._node_to_index(src)
        b = self._node_to_index(dst)
        
        n = len(self.moneycost)  # 图的阶数
        Delta = [np.inf] * n  # 距离数组
        Chemins = [[] for _ in range(n)]  # 路径数组
        Delta[a] = 0  # 起点距离为0
        Chemins[a] = [a]  # 起点到自身的路径
        
        # Bellman-Ford算法主循环
        for k in range(n - 1):
            for i in range(n):
                for j in range(n):
                    if (self.moneycost[i][j] != 0 and 
                        self.moneycost[i][j] != np.inf and 
                        Delta[i] + self.moneycost[i][j] < Delta[j]):
                        Delta[j] = Delta[i] + self.moneycost[i][j]
                        Chemins[j] = Chemins[i] + [j]
        
        # 重建路径
        d = Chemins
        path = []
        if b < len(d) and len(d[b]) > 0:
            for i in range(int((len(d[b]) + 1) / 2)):
                if 2 * i < len(d[b]):
                    path.append(self._index_to_node(d[b][2 * i]))
        
        return path
    
    def find_alternative_time_path(self, src: str, dst: str, avoid_node: str) -> List[str]:
        """
        寻找避开特定节点的最短时间路径
        
        Args:
            src: 源节点ID
            dst: 目标节点ID
            avoid_node: 要避开的节点ID
            
        Returns:
            替代路径的节点列表
        """
        # 创建修改后的成本矩阵
        M = np.copy(self.timecost)
        
        # 设置要避开的节点的边为无穷大
        if avoid_node[0] == 'c':
            n = self._node_to_index(avoid_node)
            for j in range(2 * parameters["center_num"] + 2 * parameters["station_num"]):
                M[n][j] = np.inf
                M[j][n] = np.inf
        
        if avoid_node[0] == 's':
            m = self._node_to_index(avoid_node)
            for j in range(2 * parameters["center_num"] + 2 * parameters["station_num"]):
                M[m][j] = np.inf
                M[j][m] = np.inf
        
        # 使用修改后的矩阵运行Bellman-Ford
        a = self._node_to_index(src)
        b = self._node_to_index(dst)
        
        n = len(M)
        Delta = [np.inf] * n
        Chemins = [[] for _ in range(n)]
        Delta[a] = 0
        Chemins[a] = [a]
        
        for k in range(n - 1):
            for i in range(n):
                for j in range(n):
                    if (M[i][j] != 0 and 
                        M[i][j] != np.inf and 
                        Delta[i] + M[i][j] < Delta[j]):
                        Delta[j] = Delta[i] + M[i][j]
                        Chemins[j] = Chemins[i] + [j]
        
        # 重建路径
        d = Chemins
        path = []
        if Delta[b] > 100000:
            return []
        
        if b < len(d) and len(d[b]) > 0:
            for i in range(int((len(d[b]) + 1) / 2)):
                if 2 * i < len(d[b]):
                    path.append(self._index_to_node(d[b][2 * i]))
        
        if len(path) < 2:
            return []
        
        return path
    
    def calculate_path_cost(self, path: List[str], cost_type: str = "time") -> Tuple[float, Dict[str, Any]]:
        """
        计算路径的总成本和详细信息
        
        Args:
            path: 路径节点列表
            cost_type: 成本类型 ("time" 或 "money")
            
        Returns:
            总成本和路径详细信息
        """
        if len(path) < 2:
            return 0.0, {"segments": [], "totalCost": 0.0}
        
        total_cost = 0.0
        segments = []
        cost_matrix = self.timecost if cost_type == "time" else self.moneycost
        
        for i in range(len(path) - 1):
            src_idx = self._node_to_index(path[i]) + 1  # +1 for outgoing edge
            dst_idx = self._node_to_index(path[i + 1])
            
            if src_idx < len(cost_matrix) and dst_idx < len(cost_matrix):
                segment_cost = cost_matrix[src_idx][dst_idx]
                if segment_cost != np.inf:
                    total_cost += segment_cost
                    segments.append({
                        "from": path[i],
                        "to": path[i + 1],
                        "cost": float(segment_cost)
                    })
        
        return total_cost, {
            "segments": segments,
            "totalCost": float(total_cost),
            "costType": cost_type
        }
    
    def calculate_optimal_path(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        """为包裹计算最优路径（带缓存）"""
        src = packet["src"]
        dst = packet["dst"]
        category = packet["category"]

        key = (src, dst, int(category))
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        # 根据类别选择优化目标
        if category == 1:  # 快递包裹 - 最短时间路径
            path = self.find_shortest_time_path(src, dst)
            cost_type = "time"
        else:              # 标准包裹 - 最低金钱成本路径
            path = self.find_lowest_cost_path(src, dst)
            cost_type = "money"

        # 一次性计算两种成本，避免重复调用
        time_cost, time_info = self.calculate_path_cost(path, "time")
        money_cost, money_info = self.calculate_path_cost(path, "money")
        total_cost = time_cost if cost_type == "time" else money_cost

        result = {
            "path": path,
            "totalCost": total_cost,
            "costType": cost_type,
            "pathInfo": {
                "segments": (time_info["segments"] if cost_type == "time" else money_info["segments"]),
                "totalTime": float(time_cost),
                "totalMoney": float(money_cost),
                "optimizedFor": cost_type,
            },
        }

        # 写入缓存
        self._cache[key] = result
        return result
    
    def update_dynamic_costs(self, route_loads: Dict[str, int]):
        """
        根据路由负载动态更新成本矩阵
        
        Args:
            route_loads: 路由负载字典 {route_id: load_count}
        """
        # 重置为初始成本
        self.timecost = self.timecost_initial.copy()
        self.moneycost = self.moneycost_initial.copy()
        
        # 根据负载调整成本
        for route_id, load in route_loads.items():
            if load > 30:  # 极端负载阈值
                # 这里需要根据route_id解析出对应的矩阵索引
                # 实现负载调整逻辑
                pass