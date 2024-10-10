import { scene } from './core.js';
import { nodes } from './nodeManager.js';
import { getColorForConnectionType } from './utils.js';
import { MAX_CONNECTIONS } from './config.js';
import * as THREE from './lib/three.module.js';
import { triggerSync } from './dataSync.js';

export let lines = {};
export let loadedConnections = new Set();
let connectionLabels = {};
let isConnectionLabelsVisible = true;

export function initConnectionManager() {
    // ... (existing connection-related initialization)
}

export function getLines() {
    return lines;
}

export function updateConnectionLabels() {
    Object.entries(connectionLabels).forEach(([id, label]) => {
        if (!label) {
            console.warn(`Label for connection ${id} is undefined`);
            return;
        }
        if (!label.position) {
            console.warn(`Label for connection ${id} has no position property`);
            return;
        }
        if (!label.visible) {
            return; // Skip invisible labels
        }
        
        try {
            const distance = camera.position.distanceTo(label.position);
            const scale = Math.max(1, 15 / Math.sqrt(distance));
            label.scale.set(30 * scale, 7.5 * scale, 1);
            
            // Make label always face the camera
            label.quaternion.copy(camera.quaternion);
        } catch (error) {
            console.error(`Error updating label for connection ${id}:`, error);
        }
    });
}

export function addConnection(connection, addToScene = true) {
    const startNode = nodes[connection.from_node_id];
    const endNode = nodes[connection.to_node_id];

    if (!startNode || !endNode) {
        return null;
    }

    const start = startNode.position;
    const end = endNode.position;

    const points = [];
    points.push(new THREE.Vector3(start.x, start.y, start.z));
    points.push(new THREE.Vector3(end.x, end.y, end.z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: getColorForConnectionType(connection.type),
        linewidth: 3,
        opacity: 0.8,
        transparent: true
    });
    const line = new THREE.Line(geometry, material);
    line.userData = connection;
    
    if (addToScene) {
        scene.add(line);
    }
    lines[connection.id] = line;
    loadedConnections.add(connection.id);

    // Add label
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const label = createTextSprite(connection.type);
    label.position.copy(midpoint);
    label.visible = isConnectionLabelsVisible;
    if (addToScene) {
        scene.add(label);
    }
    connectionLabels[connection.id] = label;

    console.log(`Added connection ${connection.id} with label:`, label);

    triggerSync();
    return line;
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;  // Increased width
    canvas.height = 128; // Increased height
    
    const context = canvas.getContext('2d');
    context.font = 'Bold 64px Arial';
    context.fillStyle = 'rgba(255,255,255,0.95)';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    
    // Draw text
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.scale.set(30, 7.5, 1); // Adjusted scale
    
    return sprite;
}

export function addConnectionToScene(connectionId) {
    if (lines[connectionId] && !scene.getObjectById(lines[connectionId].id)) {
        scene.add(lines[connectionId]);
        if (connectionLabels[connectionId]) {
            scene.add(connectionLabels[connectionId]);
        }
    }
}

export function addNewConnection(fromNodeId, toNodeId, type = "Default") {
    const newConnection = {
        id: Date.now().toString(),
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        type: type
    };
    
    const connectionObject = addConnection(newConnection, true);
    
    // Highlight the new connection temporarily
    const originalColor = connectionObject.material.color.getHex();
    connectionObject.material.color.setHex(0xff0000); // Set to red
    setTimeout(() => {
        connectionObject.material.color.setHex(originalColor);
    }, 1000); // Change back after 1 second
    
    triggerSync();
    return connectionObject;
}

export function updateNodeConnections(nodeId, newPosition) {
    Object.values(lines).forEach(line => {
        if (line.userData.from_node_id === nodeId || line.userData.to_node_id === nodeId) {
            const startNode = nodes[line.userData.from_node_id];
            const endNode = nodes[line.userData.to_node_id];
            
            if (startNode && endNode) {
                // Update the existing line geometry
                const positions = line.geometry.attributes.position.array;
                
                if (line.userData.from_node_id === nodeId) {
                    positions[0] = newPosition.x;
                    positions[1] = newPosition.y;
                    positions[2] = newPosition.z;
                } else {
                    positions[3] = newPosition.x;
                    positions[4] = newPosition.y;
                    positions[5] = newPosition.z;
                }

                line.geometry.attributes.position.needsUpdate = true;
                line.geometry.computeBoundingSphere();

                // Update label position
                const label = connectionLabels[line.userData.id];
                if (label && label.position) {
                    const midpoint = new THREE.Vector3(
                        (positions[0] + positions[3]) / 2,
                        (positions[1] + positions[4]) / 2,
                        (positions[2] + positions[5]) / 2
                    );
                    label.position.copy(midpoint);
                }
            }
        }
    });
}

export function toggleConnectionLabels() {
    isConnectionLabelsVisible = !isConnectionLabelsVisible;
    Object.values(connectionLabels).forEach(label => {
        if (label) {
            label.visible = isConnectionLabelsVisible;
        }
    });
    console.log(`Connection labels visibility set to: ${isConnectionLabelsVisible}`);
}

export function clearConnections() {
    Object.values(lines).forEach(line => {
        scene.remove(line);
    });
    Object.values(connectionLabels).forEach(label => {
        if (label) {
            scene.remove(label);
        }
    });
    lines = {};
    connectionLabels = {};
    loadedConnections.clear();
    console.log('Cleared all connections and labels');
}

