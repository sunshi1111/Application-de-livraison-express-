// 模拟包裹追踪系统的数据生成和管理
// 基于您的 Python 代码逻辑

class DataGenerator {
  constructor() {
    this.parameters = {
      station_num: 25,
      center_num: 5,
      packet_num: 10,
    };
  }

  // 生成随机站点位置和属性
  generateStations() {
    const stations = [];
    const stationPropCandidates = [
      [10, 2, 0.5], [15, 2, 0.6], [20, 1, 0.8], [25, 1, 0.9]
    ];

    for (let i = 0; i < this.parameters.station_num; i++) {
      const pos = [
        Math.floor(Math.random() * 100),
        Math.floor(Math.random() * 100)
      ];
      const prop = stationPropCandidates[
        Math.floor(Math.random() * stationPropCandidates.length)
      ];
      
      stations.push({
        id: `s${i}`,
        pos: pos,
        throughput: prop[0],
        delay: prop[1],
        cost: prop[2],
        type: 'station'
      });
    }

    return stations;
  }

  // 使用简单聚类算法生成中心点
  generateCenters(stations) {
    const centers = [];
    const centerPropCandidates = [
      [100, 2, 0.5], [150, 2, 0.5], [125, 1, 0.5], [175, 1, 0.5]
    ];

    // 简单的 K-means 聚类模拟
    const clusterCenters = this.simpleKMeans(
      stations.map(s => s.pos), 
      this.parameters.center_num
    );

    for (let i = 0; i < this.parameters.center_num; i++) {
      const prop = centerPropCandidates[
        Math.floor(Math.random() * centerPropCandidates.length)
      ];
      
      centers.push({
        id: `c${i}`,
        pos: [
          Math.round(clusterCenters[i][0]),
          Math.round(clusterCenters[i][1])
        ],
        throughput: prop[0],
        delay: prop[1],
        cost: prop[2],
        type: 'center'
      });
    }

    return centers;
  }

  // 简单的 K-means 聚类算法
  simpleKMeans(points, k) {
    // 初始化中心点
    let centers = [];
    for (let i = 0; i < k; i++) {
      centers.push([
        Math.random() * 100,
        Math.random() * 100
      ]);
    }

    // 迭代优化
    for (let iter = 0; iter < 10; iter++) {
      const clusters = Array(k).fill().map(() => []);
      
      // 分配点到最近的中心
      points.forEach(point => {
        let minDist = Infinity;
        let closestCenter = 0;
        
        centers.forEach((center, i) => {
          const dist = Math.sqrt(
            Math.pow(point[0] - center[0], 2) + 
            Math.pow(point[1] - center[1], 2)
          );
          if (dist < minDist) {
            minDist = dist;
            closestCenter = i;
          }
        });
        
        clusters[closestCenter].push(point);
      });

      // 更新中心点
      centers = clusters.map(cluster => {
        if (cluster.length === 0) return centers[0];
        
        const sumX = cluster.reduce((sum, p) => sum + p[0], 0);
        const sumY = cluster.reduce((sum, p) => sum + p[1], 0);
        return [sumX / cluster.length, sumY / cluster.length];
      });
    }

    return centers;
  }

  // 生成边/路径
  generateEdges(stations, centers) {
    const edges = [];
    
    // 中心到中心的连接（航线）
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const dist = this.calculateDistance(centers[i].pos, centers[j].pos);
        const timeCost = 0.25 * dist;
        const moneyCost = 0.2 * dist;
        
        edges.push({
          src: centers[i].id,
          dst: centers[j].id,
          timeCost: timeCost,
          moneyCost: moneyCost,
          distance: dist,
          type: 'airline'
        });
        
        edges.push({
          src: centers[j].id,
          dst: centers[i].id,
          timeCost: timeCost,
          moneyCost: moneyCost,
          distance: dist,
          type: 'airline'
        });
      }
    }

    // 为每个站点分配最近的中心
    const stationLabels = stations.map(station => {
      let minDist = Infinity;
      let closestCenter = 0;
      
      centers.forEach((center, i) => {
        const dist = this.calculateDistance(station.pos, center.pos);
        if (dist < minDist) {
          minDist = dist;
          closestCenter = i;
        }
      });
      
      return closestCenter;
    });

    // 中心到站点的连接（高速公路）
    stations.forEach((station, i) => {
      const centerIndex = stationLabels[i];
      const center = centers[centerIndex];
      const dist = this.calculateDistance(station.pos, center.pos);
      const timeCost = 0.6 * dist;
      const moneyCost = 0.12 * dist;
      
      edges.push({
        src: center.id,
        dst: station.id,
        timeCost: timeCost,
        moneyCost: moneyCost,
        distance: dist,
        type: 'highway'
      });
      
      edges.push({
        src: station.id,
        dst: center.id,
        timeCost: timeCost,
        moneyCost: moneyCost,
        distance: dist,
        type: 'highway'
      });
    });

    // 站点到站点的连接（道路）- 仅连接距离小于30的站点
    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        const dist = this.calculateDistance(stations[i].pos, stations[j].pos);
        if (dist < 30) {
          const timeCost = 0.8 * dist;
          const moneyCost = 0.07 * dist;
          
          edges.push({
            src: stations[i].id,
            dst: stations[j].id,
            timeCost: timeCost,
            moneyCost: moneyCost,
            distance: dist,
            type: 'road'
          });
          
          edges.push({
            src: stations[j].id,
            dst: stations[i].id,
            timeCost: timeCost,
            moneyCost: moneyCost,
            distance: dist,
            type: 'road'
          });
        }
      }
    }

    return { edges, stationLabels };
  }

  // 计算两点间距离
  calculateDistance(pos1, pos2) {
    return Math.sqrt(
      Math.pow(pos1[0] - pos2[0], 2) + 
      Math.pow(pos1[1] - pos2[1], 2)
    );
  }

  // 生成包裹
  generatePackets(stations) {
    const packets = [];
    
    for (let i = 0; i < this.parameters.packet_num; i++) {
      const srcIndex = Math.floor(Math.random() * stations.length);
      let dstIndex = Math.floor(Math.random() * stations.length);
      
      // 确保源和目标不同
      while (dstIndex === srcIndex) {
        dstIndex = Math.floor(Math.random() * stations.length);
      }
      
      const category = Math.random() < 0.7 ? 0 : 1; // 70% 普通包裹，30% 快递
      const createTime = Math.random() * 12; // 12小时内创建
      
      packets.push({
        id: this.generateUUID(),
        createTime: createTime,
        src: stations[srcIndex].id,
        dst: stations[dstIndex].id,
        category: category, // 0: 标准, 1: 快递
        status: 'created',
        currentLocation: stations[srcIndex].id,
        history: [{
          timestamp: createTime,
          location: stations[srcIndex].id,
          action: 'Colis créé'
        }],
        path: []
      });
    }
    
    // 按创建时间排序
    packets.sort((a, b) => a.createTime - b.createTime);
    
    return packets;
  }

  // 生成UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 生成完整的数据集
  generateData() {
    const stations = this.generateStations();
    const centers = this.generateCenters(stations);
    const { edges, stationLabels } = this.generateEdges(stations, centers);
    const packets = this.generatePackets(stations);

    return {
      stations,
      centers,
      edges,
      packets,
      stationLabels,
      parameters: this.parameters
    };
  }
}

export default DataGenerator;