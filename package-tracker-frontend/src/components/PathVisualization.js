import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './PathVisualization.css';

const PathVisualization = ({ 
  stations, 
  centers, 
  edges, 
  selectedPackage, 
  calculatedPath,
  onNodeClick,
  simTime,
  packagesAtSimTime
}) => {
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [showEdges, setShowEdges] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        // 目标设计基准：原始逻辑地图范围 0-100 x 0-100
        // 根据容器宽度计算缩放，使完整地图（含边距）可见
        const baseSize = 100; // 数据空间范围
        const paddingFactor = 1.15; // 留白系数
        const w = container.clientWidth;
        const h = Math.max(500, container.clientHeight || 500);
        const scaleToFit = Math.min(w / (baseSize * paddingFactor), h / (baseSize * paddingFactor));
        setDimensions({ width: w, height: h });
        setScale(scaleToFit);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!stations || !centers) return;

    drawVisualization();
  }, [stations, centers, edges, selectedPackage, calculatedPath, dimensions, showEdges, packagesAtSimTime, scale]);

  const drawVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

  const { width, height } = dimensions;
  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

    // 创建比例尺
  const logicalSize = 100;
  const viewWidth = logicalSize * scale;
  const viewHeight = logicalSize * scale;
  // 居中绘图区域（当可视区域小于容器时）
  const offsetX = Math.max(0, (innerWidth - viewWidth) / 2);
  const offsetY = Math.max(0, (innerHeight - viewHeight) / 2);

    const xScale = d3.scaleLinear()
      .domain([0, logicalSize])
      .range([0, viewWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, logicalSize])
      .range([viewHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + offsetX},${margin.top + offsetY})`);

    // 绘制背景网格
    const xAxis = d3.axisBottom(xScale).tickSize(-innerHeight);
    const yAxis = d3.axisLeft(yScale).tickSize(-innerWidth);

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${viewHeight})`)
      .call(xAxis);

    g.append('g')
      .attr('class', 'grid')
      .call(yAxis);

    // 计算节点位置缓存
    const allNodes = [...(stations||[]), ...(centers||[])];
    const nodePositions = {};
    allNodes.forEach(node => {
      nodePositions[node.id] = {
        x: xScale(node.pos[0]),
        y: yScale(node.pos[1])
      };
    });

    // 绘制边（道路风格）
    if (showEdges && edges) {
      const edgeGroup = g.append('g').attr('class', 'edges');
      // Base layer for roads/highways
      edges.forEach(d => {
        const p1 = nodePositions[d.src];
        const p2 = nodePositions[d.dst];
        if (!p1 || !p2) return;
        if (d.type === 'airline') {
          // 弧线虚线
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2 - 20; // 向上拱起
          const pathData = `M ${p1.x},${p1.y} Q ${mx},${my} ${p2.x},${p2.y}`;
          edgeGroup.append('path')
            .attr('class', 'edge edge-airline')
            .attr('d', pathData)
            .attr('fill', 'none')
            .attr('stroke', '#60a5fa')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '6,6')
            .attr('opacity', 0.6);
        } else if (d.type === 'highway') {
          // 宽底线 + 中央黄虚线
          edgeGroup.append('line')
            .attr('class', 'edge edge-highway-base')
            .attr('x1', p1.x).attr('y1', p1.y)
            .attr('x2', p2.x).attr('y2', p2.y)
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 8)
            .attr('opacity', 0.8);
          edgeGroup.append('line')
            .attr('class', 'edge edge-highway-center')
            .attr('x1', p1.x).attr('y1', p1.y)
            .attr('x2', p2.x).attr('y2', p2.y)
            .attr('stroke', '#facc15')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '16,10')
            .attr('opacity', 0.9);
        } else {
          // 普通道路：灰色底线 + 白色中线虚线
          edgeGroup.append('line')
            .attr('class', 'edge edge-road-base')
            .attr('x1', p1.x).attr('y1', p1.y)
            .attr('x2', p2.x).attr('y2', p2.y)
            .attr('stroke', '#bfc7d1')
            .attr('stroke-width', 6)
            .attr('opacity', 0.8);
          edgeGroup.append('line')
            .attr('class', 'edge edge-road-center')
            .attr('x1', p1.x).attr('y1', p1.y)
            .attr('x2', p2.x).attr('y2', p2.y)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '10,10')
            .attr('opacity', 0.9);
        }
      });
    }

    // 高亮显示计算出的路径
    if (calculatedPath && calculatedPath.pathInfo) {
      calculatedPath.pathInfo.segments.forEach((segment, index) => {
        const fromPos = nodePositions[segment.from];
        const toPos = nodePositions[segment.to];
        
        if (fromPos && toPos) {
          g.append('line')
            .attr('class', 'path-segment')
            .attr('x1', fromPos.x)
            .attr('y1', fromPos.y)
            .attr('x2', toPos.x)
            .attr('y2', toPos.y)
            .attr('stroke', '#22c55e')
            .attr('stroke-width', 5)
            .attr('opacity', 0.8);

          // 添加路径方向箭头
          const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
          const arrowLength = 10;
          const arrowAngle = Math.PI / 6;

          g.append('polygon')
            .attr('class', 'path-arrow')
            .attr('points', () => {
              const x = toPos.x - arrowLength * Math.cos(angle);
              const y = toPos.y - arrowLength * Math.sin(angle);
              const x1 = x - arrowLength * Math.cos(angle - arrowAngle);
              const y1 = y - arrowLength * Math.sin(angle - arrowAngle);
              const x2 = x - arrowLength * Math.cos(angle + arrowAngle);
              const y2 = y - arrowLength * Math.sin(angle + arrowAngle);
              return `${toPos.x},${toPos.y} ${x1},${y1} ${x2},${y2}`;
            })
            .attr('fill', '#667eea');
        }
      });
    }

    // 绘制包裹当前位置标记（卡车图标）
    if (packagesAtSimTime && packagesAtSimTime.length > 0) {
      const markerGroup = g.append('g').attr('class', 'package-markers');
      const ICON_W = 20, ICON_H = 10;
      packagesAtSimTime.forEach(d => {
        const pos = d.simPos;
        if (!pos) return;
        let cx = 0, cy = 0, angle = 0;
        if (pos.status === 'not_created') {
          const p = nodePositions[d.src]; if (!p) return; cx = p.x; cy = p.y;
        } else if (pos.status === 'delivered') {
          const p = nodePositions[pos.location] || nodePositions[d.dst]; if (!p) return; cx = p.x; cy = p.y;
        } else if (pos.status === 'in_transit') {
          const from = nodePositions[pos.from];
          const to = nodePositions[pos.to];
          if (!from || !to) return;
          cx = from.x + (to.x - from.x) * (pos.progress || 0);
          cy = from.y + (to.y - from.y) * (pos.progress || 0);
          angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
        } else if (pos.status === 'staying') {
          const p = nodePositions[pos.location] || nodePositions[d.currentLocation] || nodePositions[d.src]; if (!p) return; cx = p.x; cy = p.y;
        } else {
          const p = nodePositions[d.currentLocation] || nodePositions[d.src]; if (!p) return; cx = p.x; cy = p.y;
        }
        const grp = markerGroup.append('g')
          .attr('class', 'package-marker')
          .attr('transform', `translate(${cx},${cy}) rotate(${angle})`);
        grp.append('image')
          .attr('href', '/assets/truck.svg')
          .attr('x', -ICON_W/2)
          .attr('y', -ICON_H/2)
          .attr('width', ICON_W)
          .attr('height', ICON_H)
          .attr('opacity', 0.95);
      });
    }

  // 绘制中心点（用图标）
  // 图标大小因缩放而轻微变化，但不超过原始大小，避免图标过大影响观感
  const sizeFactor = Math.min(1, Math.max(0.65, scale));
  const CENTER_SIZE = 24 * sizeFactor;
    g.selectAll('.center')
      .data(centers)
      .enter()
      .append('image')
      .attr('class', 'center')
      .attr('href', '/assets/center.svg')
      .attr('x', d => xScale(d.pos[0]) - CENTER_SIZE/2)
      .attr('y', d => yScale(d.pos[1]) - CENTER_SIZE/2)
      .attr('width', CENTER_SIZE)
      .attr('height', CENTER_SIZE)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('width', CENTER_SIZE * 1.15).attr('height', CENTER_SIZE * 1.15);
        
        // 显示提示信息
        const tooltip = g.append('g').attr('class', 'tooltip');
        const rect = tooltip.append('rect')
          .attr('x', xScale(d.pos[0]) + 15)
          .attr('y', yScale(d.pos[1]) - 30)
          .attr('width', 120)
          .attr('height', 60)
          .attr('fill', 'rgba(0,0,0,0.8)')
          .attr('rx', 5);
        
        tooltip.append('text')
          .attr('x', xScale(d.pos[0]) + 20)
          .attr('y', yScale(d.pos[1]) - 15)
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .text(`Centre : ${d.id}`);
        
        tooltip.append('text')
          .attr('x', xScale(d.pos[0]) + 20)
          .attr('y', yScale(d.pos[1]) - 5)
          .attr('fill', 'white')
          .attr('font-size', '10px')
          .text(`Débit : ${d.throughput}`);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('width', CENTER_SIZE).attr('height', CENTER_SIZE);
        g.selectAll('.tooltip').remove();
      });

  // 绘制站点（用图标）——降低基准尺寸并限制放大上限
  const STATION_SIZE = 16 * sizeFactor;
    g.selectAll('.station')
      .data(stations)
      .enter()
      .append('image')
      .attr('class', 'station')
      .attr('href', '/assets/station.svg')
      .attr('x', d => xScale(d.pos[0]) - STATION_SIZE/2)
      .attr('y', d => yScale(d.pos[1]) - STATION_SIZE/2)
      .attr('width', STATION_SIZE)
      .attr('height', STATION_SIZE)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('width', STATION_SIZE * 1.15)
          .attr('height', STATION_SIZE * 1.15);
        
        // 显示提示信息
        const tooltip = g.append('g').attr('class', 'tooltip');
        const rect = tooltip.append('rect')
          .attr('x', xScale(d.pos[0]) + 15)
          .attr('y', yScale(d.pos[1]) - 30)
          .attr('width', 120)
          .attr('height', 60)
          .attr('fill', 'rgba(0,0,0,0.8)')
          .attr('rx', 5);
        
        tooltip.append('text')
          .attr('x', xScale(d.pos[0]) + 20)
          .attr('y', yScale(d.pos[1]) - 15)
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .text(`Point de distribution : ${d.id}`);
        
        tooltip.append('text')
          .attr('x', xScale(d.pos[0]) + 20)
          .attr('y', yScale(d.pos[1]) - 5)
          .attr('fill', 'white')
          .attr('font-size', '10px')
          .text(`Débit : ${d.throughput}`);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('width', STATION_SIZE)
          .attr('height', STATION_SIZE);
        g.selectAll('.tooltip').remove();
      });

    // 高亮选中的包裹起点和终点
    if (selectedPackage) {
      const highlightNodes = [selectedPackage.src, selectedPackage.dst];
      const allNodes = [...stations, ...centers];
      
      highlightNodes.forEach(nodeId => {
        const node = allNodes.find(n => n.id === nodeId);
        if (node) {
          g.append('circle')
            .attr('cx', xScale(node.pos[0]))
            .attr('cy', yScale(node.pos[1]))
            .attr('r', 16 * sizeFactor)
            .attr('fill', 'none')
            .attr('stroke', '#667eea')
            .attr('stroke-width', 3)
            .attr('opacity', 0.8)
            .style('animation', 'pulse 2s infinite');
        }
      });
    }

    // 添加标签
    g.selectAll('.center-label')
      .data(centers)
      .enter()
      .append('text')
      .attr('class', 'center-label')
      .attr('x', d => xScale(d.pos[0]))
      .attr('y', d => yScale(d.pos[1]) + 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .text(d => d.id);

    g.selectAll('.station-label')
      .data(stations)
      .enter()
      .append('text')
      .attr('class', 'station-label')
      .attr('x', d => xScale(d.pos[0]))
      .attr('y', d => yScale(d.pos[1]) + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', '#666')
      .text(d => d.id);
  };

  return (
    <div className="path-visualization">
    <div className="visualization-controls">
      <h3>Visualisation du trajet</h3>
        <div className="controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
            />
            Afficher les liaisons
          </label>
          <div className="zoom-control">
            <label style={{fontSize:'0.75rem', color:'#555'}}>Zoom: {(scale).toFixed(2)}</label>
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.05}
              value={scale}
              onChange={(e)=> setScale(Number(e.target.value))}
              style={{width:'140px'}}
            />
            <button className="btn btn-small" style={{marginLeft:8}} onClick={()=>setScale(1)}>Réinitialiser</button>
          </div>
        </div>
        
        {selectedPackage && (
          <div className="package-info">
            <h4>Colis actuel : {selectedPackage.id.substring(0, 8)}...</h4>
            <p>Itinéraire : {selectedPackage.src} → {selectedPackage.dst}</p>
            <p>Type : {selectedPackage.category === 1 ? 'Express' : 'Standard'}</p>
          </div>
        )}

        {calculatedPath && (
          <div className="path-info">
            <h4>Informations du trajet</h4>
            {calculatedPath.pathInfo?.totalDistance !== undefined && (
              <p>Distance totale : {Number(calculatedPath.pathInfo?.totalDistance || 0).toFixed(2)} unités</p>
            )}
            <p>Temps total : {calculatedPath.pathInfo?.totalTime?.toFixed(2)} heures</p>
            <p>Coût total : {calculatedPath.pathInfo?.totalMoney?.toFixed(2)} €</p>
            <div className="path-segments">
              <h5>Segments du trajet :</h5>
              {calculatedPath.pathInfo?.segments?.map((segment, index) => {
                const type = segment.type || 'Trajet';
                const t = segment.timeCost ?? segment.cost;
                const m = segment.moneyCost;
                return (
                  <div key={index} className="segment">
                    {segment.from} → {segment.to} ({type})
                    {t !== undefined && (
                      <span style={{marginLeft:6, color:'#6b7280'}}>
                        Durée : {Number(t).toFixed(2)}
                      </span>
                    )}
                    {m !== undefined && (
                      <span style={{marginLeft:6, color:'#6b7280'}}>
                        Coût : {Number(m).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="legend">
        <div className="legend-item">
          <img src="/assets/center.svg" alt="center" width="16" height="16" style={{verticalAlign:'middle'}} />
          <span>Centre de distribution</span>
        </div>
        <div className="legend-item">
          <img src="/assets/station.svg" alt="station" width="16" height="16" style={{verticalAlign:'middle'}} />
          <span>Point de distribution</span>
        </div>
        <div className="legend-item">
          <div className="legend-line airline-line"></div>
          <span>Ligne aérienne (arc pointillé)</span>
        </div>
        <div className="legend-item">
          <div className="legend-line highway-line"></div>
          <span>Autoroute (ligne jaune pointillée)</span>
        </div>
        <div className="legend-item">
          <div className="legend-line road-line"></div>
          <span>Route (ligne pointillée blanche)</span>
        </div>
        <div className="legend-item">
          <div className="legend-line path-line"></div>
          <span>Chemin calculé</span>
        </div>
      </div>

      <div className="visualization-wrapper">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="visualization-svg"
        />
      </div>
    </div>
  );
};

export default PathVisualization;