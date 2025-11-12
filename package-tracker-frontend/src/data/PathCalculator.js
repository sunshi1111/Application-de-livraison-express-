// 路径计算算法 - 模拟您的 Bellman-Ford 算法

class PathCalculator {
  constructor(nodes, edges) {
    this.nodes = nodes; // stations + centers
    this.edges = edges;
    this.graph = this.buildGraph();
  }

  // 构建图数据结构
  buildGraph() {
    const graph = {};
    
    // 初始化所有节点
    this.nodes.forEach(node => {
      graph[node.id] = {};
    });

    // 添加所有边
    this.edges.forEach(edge => {
      graph[edge.src][edge.dst] = {
        timeCost: edge.timeCost,
        moneyCost: edge.moneyCost,
        distance: edge.distance,
        type: edge.type
      };
    });

    return graph;
  }

  // Dijkstra算法 - 寻找最短时间路径（用于快递包裹）
  findShortestTimePath(src, dst) {
    return this.dijkstra(src, dst, 'timeCost');
  }

  // Dijkstra算法 - 寻找最低成本路径（用于标准包裹）
  findLowestCostPath(src, dst) {
    return this.dijkstra(src, dst, 'moneyCost');
  }

  // Dijkstra算法实现
  dijkstra(src, dst, costType) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // 初始化距离
    this.nodes.forEach(node => {
      distances[node.id] = Infinity;
      previous[node.id] = null;
      unvisited.add(node.id);
    });

    distances[src] = 0;

    while (unvisited.size > 0) {
      // 找到未访问节点中距离最小的
      let current = null;
      let minDistance = Infinity;
      
      for (let nodeId of unvisited) {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          current = nodeId;
        }
      }

      if (current === null || distances[current] === Infinity) {
        break; // 无法到达剩余节点
      }

      unvisited.delete(current);

      // 如果到达目标节点，停止搜索
      if (current === dst) {
        break;
      }

      // 更新邻居节点的距离
      if (this.graph[current]) {
        Object.keys(this.graph[current]).forEach(neighbor => {
          if (unvisited.has(neighbor)) {
            const edge = this.graph[current][neighbor];
            const newDistance = distances[current] + edge[costType];
            
            if (newDistance < distances[neighbor]) {
              distances[neighbor] = newDistance;
              previous[neighbor] = current;
            }
          }
        });
      }
    }

    // 重建路径
    const path = [];
    let currentNode = dst;
    
    while (currentNode !== null) {
      path.unshift(currentNode);
      currentNode = previous[currentNode];
    }

    // 如果路径不完整，返回空数组
    if (path.length === 0 || path[0] !== src) {
      return [];
    }

    // 计算路径详细信息
    const pathInfo = this.calculatePathInfo(path, costType);

    return {
      path: path,
      totalCost: distances[dst],
      costType: costType,
      pathInfo: pathInfo
    };
  }

  // 计算路径详细信息
  calculatePathInfo(path, costType) {
    const pathInfo = [];
    let totalTime = 0;
    let totalMoney = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      
      if (this.graph[current] && this.graph[current][next]) {
        const edge = this.graph[current][next];
        
        pathInfo.push({
          from: current,
          to: next,
          timeCost: edge.timeCost,
          moneyCost: edge.moneyCost,
          distance: edge.distance,
          type: edge.type
        });
        
        totalTime += edge.timeCost;
        totalMoney += edge.moneyCost;
      }
    }

    return {
      segments: pathInfo,
      totalTime: totalTime,
      totalMoney: totalMoney,
      totalDistance: pathInfo.reduce((sum, segment) => sum + segment.distance, 0)
    };
  }

  // 为包裹计算最优路径
  calculateOptimalPath(packet) {
    if (packet.category === 1) {
      // 快递包裹 - 最短时间路径
      return this.findShortestTimePath(packet.src, packet.dst);
    } else {
      // 标准包裹 - 最低成本路径
      return this.findLowestCostPath(packet.src, packet.dst);
    }
  }

  // 获取节点的邻居
  getNeighbors(nodeId) {
    return Object.keys(this.graph[nodeId] || {});
  }

  // 获取两个节点间的边信息
  getEdgeInfo(src, dst) {
    if (this.graph[src] && this.graph[src][dst]) {
      return this.graph[src][dst];
    }
    return null;
  }
}

export default PathCalculator;