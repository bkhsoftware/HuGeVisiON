import { raycaster, scene, camera, mouse } from './core.js';
import { getColorForType } from './utils.js';
import * as THREE from './lib/three.module.js';
import { infoPanel, hideInfoPanelWithDelay, showNodeInfo, showInfoPanelWithDelay } from './uiManager.js';
import { triggerSync } from './dataSync.js';

export let nodes = {};
const MAX_NODES = 1000;
let hoveredNode = null;
export let pinnedNode = null;
let showLabels = true;

export function initNodeManager() {
    // ... (existing node-related initialization)
}

export function getNodes() {
    return nodes;
}

export function addNode(node, addToScene = true) {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: getColorForType(node.type),
        emissive: getColorForType(node.type),
        emissiveIntensity: 0.2,
        specular: 0xffffff,
        shininess: 50
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(node.x || 0, node.y || 0, node.z || 0);
    
    sphere.userData = node;
    
    // Create label
    const label = createLabel(node.name);
    sphere.add(label);
    
    if (addToScene) {
        scene.add(sphere);
    }
    nodes[node.id] = sphere;
    return sphere;
}

export function clearNodes() {
    Object.values(nodes).forEach(node => {
        scene.remove(node);
    });
    nodes = {};
}

export function addNodeToScene(nodeId) {
    if (nodes[nodeId] && !scene.getObjectById(nodes[nodeId].id)) {
        scene.add(nodes[nodeId]);
    }
}

function createLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;  // Fixed width
    canvas.height = 128; // Fixed height
    
    const context = canvas.getContext('2d');
    context.font = 'Bold 64px Arial';
    context.fillStyle = 'rgba(255,255,255,0.95)';
    context.textBaseline = 'middle';
    
    // Measure text width
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    
    // Calculate scaling factor if text is too wide
    const maxWidth = canvas.width - 20; // Leave some padding
    const scale = Math.min(1, maxWidth / textWidth);
    
    // Scale context if necessary
    if (scale < 1) {
        context.save();
        context.scale(scale, 1);
    }
    
    // Draw text
    context.fillText(text, 10 / scale, canvas.height / 2);
    
    if (scale < 1) {
        context.restore();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.scale.set(40, 10, 1); // Fixed scale
    sprite.position.set(0, 10, 0);
    
    return sprite;
}

export function updateLabels() {
    Object.values(nodes).forEach(node => {
        const label = node.children[0];
        if (label) {
            label.visible = showLabels;
            if (showLabels) {
                const distance = camera.position.distanceTo(node.position);
                const scale = Math.max(1, 20 / Math.sqrt(distance));
                label.scale.set(40 * scale, 10 * scale, 1);
                
                // Make label always face the camera
                label.quaternion.copy(camera.quaternion);
            }
        }
    });
}

export function setShowLabels(show) {
    showLabels = show;
    updateLabels();
}

export function checkNodeHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0 && intersects[0].object.type === 'Mesh') {
        const closestNode = intersects[0].object;
        if (closestNode !== hoveredNode) {
            hoveredNode = closestNode;
            if (!pinnedNode) {
                showInfoPanelWithDelay(hoveredNode);
            }
        }
    } else if (hoveredNode && !pinnedNode) {
        hoveredNode = null;
        const infoPanelRect = infoPanel.getBoundingClientRect();
        const mouseOverInfoPanel = 
            mouse.x * window.innerWidth >= infoPanelRect.left &&
            mouse.x * window.innerWidth <= infoPanelRect.right &&
            mouse.y * window.innerHeight >= infoPanelRect.top &&
            mouse.y * window.innerHeight <= infoPanelRect.bottom;
        
        if (!mouseOverInfoPanel) {
            hideInfoPanelWithDelay();
        }
    }
}

export function setPinnedNode(node) {
    pinnedNode = node;
}

