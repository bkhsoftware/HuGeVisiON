import { scene } from './core.js';
import { nodes } from './nodeManager.js';
import { getColorForConnectionType } from './utils.js';
import { MAX_CONNECTIONS } from './config.js';
import * as THREE from './lib/three.module.js';

let lines = {};
export let loadedConnections = new Set();

export function initConnectionManager() {
    // ... (existing connection-related initialization)
}

export function addConnection(connection) {
    if (loadedConnections.size >= MAX_CONNECTIONS) {
        return;
    }

    const startNode = nodes[connection.from_node_id];
    const endNode = nodes[connection.to_node_id];

    if (!startNode || !endNode) {
        return;  // Silently skip connections with missing nodes
    }

    const start = startNode.position;
    const end = endNode.position;

    const points = [];
    points.push(new THREE.Vector3(start.x, start.y, start.z));
    points.push(new THREE.Vector3(end.x, end.y, end.z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: getColorForConnectionType(connection.type),
        opacity: 0.8,
        transparent: true
    });
    const line = new THREE.Line(geometry, material);
    line.userData = connection;
    scene.add(line);
    lines[connection.id] = line;
    loadedConnections.add(connection.id);
}

// ... (other connection-related functions)

export { lines };
