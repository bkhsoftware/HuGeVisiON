import { scene, raycaster, mouse, camera } from './core.js';
import { getNodes, nodes } from './nodeManager.js';
import { getColorForConnectionType } from './utils.js';
import { MAX_CONNECTIONS } from './config.js';
import * as THREE from './lib/three.module.js';
import { triggerSync } from './dataSync.js';
import { showInfoPanelWithDelay, hideInfoPanelWithDelay } from './uiManager.js';

export let lines = {};
export let loadedConnections = new Set();
let connectionLabels = {};
let isConnectionLabelsVisible = true;
let hoveredConnection = null;

export function initConnectionManager() {
    // ... (existing connection-related initialization)
}

export function getLines() {
    return lines;
}

export function checkConnectionHover() {
    raycaster.setFromCamera(mouse, camera);
    const lineObjects = Object.values(lines);
    const intersects = raycaster.intersectObjects(lineObjects);

    if (intersects.length > 0) {
        const closestConnection = intersects[0].object;
        if (closestConnection !== hoveredConnection) {
            if (hoveredConnection) {
                hoveredConnection.material.linewidth = 1;
            }
            hoveredConnection = closestConnection;
            hoveredConnection.material.linewidth = 2;
            showInfoPanelWithDelay(hoveredConnection);
        }
    } else if (hoveredConnection) {
        hoveredConnection.material.linewidth = 1;
        hoveredConnection = null;
        hideInfoPanelWithDelay();
    }
}

export function getHoveredConnection() {
    return hoveredConnection;
}

export function updateConnectionLabels() {
    const nodes = getNodes();
    Object.entries(lines).forEach(([id, line]) => {
        if (!line || !line.geometry || !line.geometry.attributes || !line.geometry.attributes.position) {
            console.warn(`Invalid line for connection ${id}. Skipping label update.`);
            return;
        }

        let label = connectionLabels[id];
        if (!label) {
            label = createTextSprite(line.userData.type);
            scene.add(label);
            connectionLabels[id] = label;
        }

        const positions = line.geometry.attributes.position.array;
        if (positions.length < 6) {
            console.warn(`Invalid position data for connection ${id}. Skipping label update.`);
            return;
        }

        const midpoint = new THREE.Vector3(
            (positions[0] + positions[3]) / 2,
            (positions[1] + positions[4]) / 2,
            (positions[2] + positions[5]) / 2
        );

        label.position.copy(midpoint);
        label.visible = isConnectionLabelsVisible;

        const distance = camera.position.distanceTo(midpoint);
        const scale = Math.max(1, 15 / Math.sqrt(distance));
        label.scale.set(30 * scale, 7.5 * scale, 1);
        label.quaternion.copy(camera.quaternion);
    });
}

export function addConnection(connection, addToScene = true) {
    const startNode = nodes[connection.from_node_id];
    const endNode = nodes[connection.to_node_id];

    if (!startNode || !endNode) {
        console.warn('Cannot add connection: one or both nodes not found', connection);
        return null;
    }

    const start = startNode.position;
    const end = endNode.position;

    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
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

    // Label will be created in updateConnectionLabels
    
    triggerSync();
    return line;
}

export function updateConnection(id, newData) {
    const connection = lines[id];
    if (connection) {
        connection.userData = { ...connection.userData, ...newData };
        connection.material.color.setHex(getColorForConnectionType(newData.type));
        updateConnectionLabel(connection);
        triggerSync();
    }
}

function updateConnectionLabel(connection) {
    const label = connectionLabels[connection.userData.id];
    if (label) {
        const newLabel = createTextSprite(connection.userData.name || connection.userData.type);
        newLabel.position.copy(label.position);
        newLabel.scale.copy(label.scale);
        scene.remove(label);
        scene.add(newLabel);
        connectionLabels[connection.userData.id] = newLabel;
    }
}

export function deleteConnection(id) {
    const connection = lines[id];
    if (connection) {
        scene.remove(connection);
        delete lines[id];
        if (connectionLabels[id]) {
            scene.remove(connectionLabels[id]);
            delete connectionLabels[id];
        }
        loadedConnections.delete(id);
        triggerSync();
    }
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
            }
        }
    });

    // Labels will be updated in updateConnectionLabels
}

export function toggleConnectionLabels() {
    isConnectionLabelsVisible = !isConnectionLabelsVisible;
    Object.values(connectionLabels).forEach(label => {
        if (label) {
            label.visible = isConnectionLabelsVisible;
        }
    });
}

export function clearConnections() {
    Object.values(lines).forEach(line => {
        scene.remove(line);
    });
    Object.values(connectionLabels).forEach(label => {
        scene.remove(label);
    });
    lines = {};
    connectionLabels = {};
    loadedConnections.clear();
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.scale.set(15, 3.75, 1);
    
    return sprite;
}
