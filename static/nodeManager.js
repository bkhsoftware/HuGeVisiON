import { raycaster, scene, camera, mouse } from './core.js';
import { getColorForType } from './utils.js';
import * as THREE from './lib/three.module.js';
import { infoPanel, hideInfoPanelWithDelay, showNodeInfo, showInfoPanelWithDelay } from './uiManager.js';
import { triggerSync } from './dataSync.js';
import { handleNodeClick } from './uiManager.js';
import { updateConnectionLabels } from './connectionManager.js';

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

    sphere.addEventListener('click', (event) => {
        event.stopPropagation();
        handleNodeClick(sphere);
    });
    
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
    canvas.width = 512;
    canvas.height = 128;
    
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
    
    sprite.scale.set(30, 7.5, 1); // Adjusted scale to match connection labels
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
                const scale = Math.max(1, 15 / Math.sqrt(distance));
                label.scale.set(30 * scale, 7.5 * scale, 1);
                
                // Make label always face the camera
                label.quaternion.copy(camera.quaternion);
            }
        }
    });
    
    // Update connection labels as well
    updateConnectionLabels();
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

export function addNewNode(x, y, z, name = "New Node", type = "Concept") {
    const newNode = {
        id: Date.now().toString(), // Use timestamp as a simple unique ID
        name: name,
        type: type,
        x: x,
        y: y,
        z: z
    };
    
    const nodeObject = addNode(newNode, true);
    triggerSync();
    return nodeObject;
}

export function checkNodeClick(event) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Object.values(nodes));
    
    if (intersects.length > 0) {
        const clickedNode = intersects[0].object;
        handleNodeClick(clickedNode);
    }
}

