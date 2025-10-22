"""
基于test.ipynb的数据生成逻辑
作者: 孙石，朱虹翱
"""

import random
import numpy as np
import uuid
from sklearn.cluster import KMeans
from typing import List, Dict, Tuple, Any

# 全局参数配置
parameters = {
    "station_num": 25,
    "center_num": 5,
    "packet_num": 10,
}

def data_gen() -> Dict[str, Any]:
    """
    生成站点、中心、边和包裹数据
    返回包含所有生成数据的字典
    """
    # Generate Stations
    station_pos = []
    # properties are defined here: throughput/tick, time_delay, money_cost
    station_prop_candidates = [
        (10, 2, 0.5), (15, 2, 0.6), (20, 1, 0.8), (25, 1, 0.9)]
    station_prop = []
    
    for i in range(parameters["station_num"]):
        # Map size is defined here, which is 100*100
        station_pos.append((random.randint(0, 100), random.randint(0, 100)))
        station_prop.append(
            station_prop_candidates[random.randint(0, len(station_prop_candidates)-1)])

    # Generate Centers by clustering
    kmeans = KMeans(n_clusters=parameters["center_num"], random_state=42, n_init=10)
    kmeans.fit(station_pos)
    station_labels = kmeans.predict(station_pos)
    center_pos = [(int(x[0]), int(x[1])) for x in kmeans.cluster_centers_]
    
    for i in range(len(center_pos)):
        while center_pos[i] in station_pos:
            # move slightly if center is overlapped with station
            print("Warning: Center moved")
            center_pos[i] = (center_pos[i][0] + 1, center_pos[i][1] + 1)
    
    # properties are defined here: throughput/tick, time_delay, money_cost
    center_prop_candidates = [
        (100, 2, 0.5), (150, 2, 0.5), (125, 1, 0.5), (175, 1, 0.5)]
    center_prop = []
    
    for i in range(parameters["center_num"]):
        center_prop.append(
            center_prop_candidates[random.randint(0, len(center_prop_candidates)-1)])

    # Generate Edges
    edges = []
    
    # 中心到中心的边（航线）
    for i in range(parameters["center_num"]):
        for j in range(parameters["center_num"]):
            if j > i:
                dist = np.linalg.norm(
                    np.array(center_pos[i]) - np.array(center_pos[j]))
                # src, dst, time_cost, money_cost
                edges.append((f"c{i}", f"c{j}", 0.25 * dist, 0.2 * dist))
                edges.append((f"c{j}", f"c{i}", 0.25 * dist, 0.2 * dist))

    # 中心到站点的边（高速公路）
    for i in range(parameters["center_num"]):
        for j in range(parameters["station_num"]):
            if station_labels[j] == i:
                dist = np.linalg.norm(
                    np.array(center_pos[i]) - np.array(station_pos[j]))
                edges.append((f"c{i}", f"s{j}", 0.6 * dist, 0.12 * dist))
                edges.append((f"s{j}", f"c{i}", 0.6 * dist, 0.12 * dist))

    # 站点到站点的边（道路）
    for i in range(parameters["station_num"]):
        for j in range(parameters["station_num"]):
            if i > j and (np.linalg.norm(np.array(station_pos[i]) - np.array(station_pos[j])) < 30):
                dist = np.linalg.norm(
                    np.array(station_pos[i]) - np.array(station_pos[j]))
                edges.append((f"s{i}", f"s{j}", 0.8 * dist, 0.07*dist))
                edges.append((f"s{j}", f"s{i}", 0.8 * dist, 0.07*dist))

    # 构建成本矩阵
    M = np.zeros((2*(parameters["center_num"]+parameters["station_num"]),
                  2*(parameters["center_num"]+parameters["station_num"])))
    for i in range(2*(parameters["center_num"]+parameters["station_num"])):
        for j in range(2*(parameters["center_num"]+parameters["station_num"])):
            M[i][j] = np.inf
    
    for i in range(parameters["center_num"]+parameters["station_num"]):
        M[2*i][2*i+1] = 0.01

    # 填充时间成本矩阵
    for i in range(parameters["center_num"]):
        for j in range(parameters["center_num"]):
            if j > i:
                M[2*i+1][2*j] = 0.25*np.linalg.norm(
                    np.array(center_pos[i]) - np.array(center_pos[j]))
                M[2*j+1][2*i] = M[2*i+1][2*j]

    for i in range(parameters["center_num"]):
        for j in range(parameters["station_num"]):
            if station_labels[j] == i:
                M[2*i+1][2*j+2*parameters["center_num"]] = 0.6*np.linalg.norm(
                    np.array(center_pos[i]) - np.array(station_pos[j]))
                M[2*j+2*parameters["center_num"]+1][2*i] = M[2*i+1][2*j+2*parameters["center_num"]]

    for i in range(parameters["station_num"]):
        for j in range(parameters["station_num"]):
            if i > j and (np.linalg.norm(np.array(station_pos[i]) - np.array(station_pos[j])) < 30):
                M[2*i+2*parameters["center_num"]+1][2*j+2*parameters["center_num"]] = 0.8*np.linalg.norm(
                    np.array(station_pos[i]) - np.array(station_pos[j]))
                M[2*j+2*parameters["center_num"]+1][2*i+2*parameters["center_num"]] = M[2*i+2*parameters["center_num"]+1][2*j+2*parameters["center_num"]]

    # 构建金钱成本矩阵
    N = np.zeros((2*(parameters["center_num"]+parameters["station_num"]),
                  2*(parameters["center_num"]+parameters["station_num"])))
    for i in range(2*(parameters["center_num"]+parameters["station_num"])):
        for j in range(2*(parameters["center_num"]+parameters["station_num"])):
            N[i][j] = np.inf

    for i in range(parameters["center_num"]):
        for j in range(parameters["center_num"]):
            if j > i:
                N[2*i+1][2*j] = 0.2*np.linalg.norm(
                    np.array(center_pos[i]) - np.array(center_pos[j]))
                N[2*j+1][2*i] = N[2*i+1][2*j]

    for i in range(parameters["center_num"]):
        for j in range(parameters["station_num"]):
            if station_labels[j] == i:
                N[2*i+1][2*j+2*parameters["center_num"]] = 0.12*np.linalg.norm(
                    np.array(center_pos[i]) - np.array(station_pos[j]))
                N[2*j+2*parameters["center_num"]+1][2*i] = N[2*i+1][2*j+2*parameters["center_num"]]

    for i in range(parameters["station_num"]):
        for j in range(parameters["station_num"]):
            if i > j and (np.linalg.norm(np.array(station_pos[i]) - np.array(station_pos[j])) < 30):
                N[2*i+2*parameters["center_num"]+1][2*j+2*parameters["center_num"]] = 0.07*np.linalg.norm(
                    np.array(station_pos[i]) - np.array(station_pos[j]))
                N[2*j+2*parameters["center_num"]+1][2*i+2*parameters["center_num"]] = N[2*i+2*parameters["center_num"]+1][2*j+2*parameters["center_num"]]

    # 添加节点处理成本
    for i in range(parameters["center_num"]):
        N[2*i][2*i+1] = center_prop[i][2]
    for i in range(parameters["station_num"]):
        N[2*i+2*parameters["center_num"]][2*i+2*parameters["center_num"]+1] = station_prop[i][2]

    # Generate Packets
    packets = []
    src_prob = np.random.random(parameters["station_num"])
    src_prob = src_prob / np.sum(src_prob)
    dst_prob = np.random.random(parameters["station_num"])
    dst_prob = dst_prob / np.sum(dst_prob)
    # Package categories are defined here: 0 for Regular, 1 for Express
    speed_prob = [0.7, 0.3]
    
    for i in range(parameters["packet_num"]):
        src = np.random.choice(parameters["station_num"], p=src_prob)
        dst = np.random.choice(parameters["station_num"], p=dst_prob)
        while dst == src:
            dst = np.random.choice(parameters["station_num"], p=dst_prob)
        category = np.random.choice(2, p=speed_prob)
        # Create time of the package, during 12 time ticks(hours)
        create_time = np.random.random() * 12
        packet_id = str(uuid.uuid4())
        packets.append((packet_id, create_time, f"s{src}", f"s{dst}", category))

    # Sort packets by create time
    packets.sort(key=lambda x: x[1])

    return {
        "station_pos": station_pos,
        "station_prop": station_prop,
        "center_pos": center_pos,
        "center_prop": center_prop,
        "edges": edges,
        "packets": packets,
        "station_labels": station_labels.tolist(),
        "time_cost_matrix": M,
        "money_cost_matrix": N,
        "parameters": parameters
    }

def format_data_for_api(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将生成的数据格式化为API友好的格式
    """
    # 格式化站点数据
    stations = []
    for i, (pos, prop) in enumerate(zip(data["station_pos"], data["station_prop"])):
        stations.append({
            "id": f"s{i}",
            "pos": list(pos),
            "throughput": prop[0],
            "delay": prop[1],
            "cost": prop[2],
            "type": "station"
        })

    # 格式化中心数据
    centers = []
    for i, (pos, prop) in enumerate(zip(data["center_pos"], data["center_prop"])):
        centers.append({
            "id": f"c{i}",
            "pos": list(pos),
            "throughput": prop[0],
            "delay": prop[1],
            "cost": prop[2],
            "type": "center"
        })

    # 格式化边数据
    edges = []
    for edge in data["edges"]:
        src, dst, time_cost, money_cost = edge
        # 确定边的类型
        edge_type = "road"  # 默认
        if src.startswith('c') and dst.startswith('c'):
            edge_type = "airline"
        elif (src.startswith('c') and dst.startswith('s')) or (src.startswith('s') and dst.startswith('c')):
            edge_type = "highway"
        
        edges.append({
            "src": src,
            "dst": dst,
            "timeCost": float(time_cost),
            "moneyCost": float(money_cost),
            "type": edge_type
        })

    # 格式化包裹数据
    packets = []
    for packet in data["packets"]:
        packet_id, create_time, src, dst, category = packet
        packets.append({
            "id": packet_id,
            "createTime": float(create_time),
            "src": src,
            "dst": dst,
            "category": int(category),
            "status": "created",
            "currentLocation": src,
            "history": [{
                "timestamp": float(create_time),
                "location": src,
                "action": "包裹已创建"
            }]
        })

    return {
        "stations": stations,
        "centers": centers,
        "edges": edges,
        "packets": packets,
        "parameters": data["parameters"],
        "timeCostMatrix": data["time_cost_matrix"].tolist(),
        "moneyCostMatrix": data["money_cost_matrix"].tolist()
    }