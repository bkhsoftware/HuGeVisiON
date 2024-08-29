import { raycaster, scene, camera, mouse } from './core.js';
import { getColorForType } from './utils.js';
import * as THREE from './lib/three.module.js';
import { infoPanel, hideInfoPanelWithDelay, showNodeInfo, showInfoPanelWithDelay } from './uiManager.js';

let nodes = {};
const MAX_NODES = 1000;
let hoveredNode = null;
export let pinnedNode = null;

export function initNodeManager() {
    // ... (existing node-related initialization)
}

export function addNode(node) {
    if (Object.keys(nodes).length >= MAX_NODES) {
        return;
    }
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshPhongMaterial({color: getColorForType(node.type)});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(node.x, node.y, node.z);
    
    // Set the entire node object as userData
    sphere.userData = node;
    
    scene.add(sphere);
    nodes[node.id] = sphere;
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

export { nodes };
