import { camera, scene } from './core.js';
import { nodes } from './nodeManager.js';
import { lines } from './connectionManager.js';

let RENDER_DISTANCE = 1000;
let MAX_VISIBLE_NODES = 1000;
let MAX_VISIBLE_CONNECTIONS = 1000;

export function getColorForType(type) {
    const colors = {
        'Person': 0x00ff00,
        'Organization': 0xff0000,
        'Place': 0x0000ff,
        'Concept': 0xffff00
    };
    return colors[type] || 0xcccccc;
}

export function getColorForConnectionType(type) {
    const colors = {
        'Friend': 0x00ff00,     // Bright green
        'Colleague': 0xff00ff,  // Bright magenta
        'Family': 0x00ffff,     // Bright cyan
        'Associated': 0xffff00  // Bright yellow
    };
    return colors[type] || 0xffffff;  // Default to white if type not found
}

export function updateVisibleElements() {
    const position = camera.position;
    
    // Sort nodes by distance to camera
    const sortedNodes = Object.values(nodes).sort((a, b) => 
        a.position.distanceTo(position) - b.position.distanceTo(position)
    );
    
    // Update node visibility
    let visibleNodeCount = 0;
    sortedNodes.forEach(node => {
        const distance = node.position.distanceTo(position);
        const shouldBeVisible = distance <= RENDER_DISTANCE && visibleNodeCount < MAX_VISIBLE_NODES;
        
        if (shouldBeVisible && !scene.getObjectById(node.id)) {
            scene.add(node);
            visibleNodeCount++;
        } else if (!shouldBeVisible && scene.getObjectById(node.id)) {
            scene.remove(node);
        }
        
        node.visible = shouldBeVisible;
    });
    
    // Update connection visibility
    let visibleConnectionCount = 0;
    Object.values(lines).forEach(line => {
        if (line && line.userData) {
            const startNode = nodes[line.userData.from_node_id];
            const endNode = nodes[line.userData.to_node_id];
            const shouldBeVisible = startNode && endNode && startNode.visible && endNode.visible && visibleConnectionCount < MAX_VISIBLE_CONNECTIONS;
            
            if (shouldBeVisible && !scene.getObjectById(line.id)) {
                scene.add(line);
                visibleConnectionCount++;
            } else if (!shouldBeVisible && scene.getObjectById(line.id)) {
                scene.remove(line);
            }
            
            line.visible = shouldBeVisible;
        }
    });
}

export function setRenderDistance(distance) {
    RENDER_DISTANCE = distance;
}

export function setMaxVisibleNodes(max) {
    MAX_VISIBLE_NODES = max;
}

export function setMaxVisibleConnections(max) {
    MAX_VISIBLE_CONNECTIONS = max;
}

