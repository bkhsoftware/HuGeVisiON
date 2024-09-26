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
    Object.values(nodes).forEach(node => {
        if (!scene.getObjectById(node.id)) {
            scene.add(node);
        }
    });

    Object.values(lines).forEach(line => {
        if (!scene.getObjectById(line.id)) {
            scene.add(line);
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

