import { camera } from './core.js';
import { nodes } from './nodeManager.js';
import { lines } from './connectionManager.js';

let RENDER_DISTANCE = 1000;

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
    
    // Update node visibility
    Object.values(nodes).forEach(node => {
        if (node && node.position) {
            const distance = node.position.distanceTo(position);
            node.visible = distance <= RENDER_DISTANCE;
        }
    });
    
    // Update connection visibility
    Object.values(lines).forEach(line => {
        if (line && line.userData) {
            const startNode = nodes[line.userData.from_node_id];
            const endNode = nodes[line.userData.to_node_id];
            line.visible = startNode && endNode && startNode.visible && endNode.visible;
        }
    });
}

// ... (other utility functions)
