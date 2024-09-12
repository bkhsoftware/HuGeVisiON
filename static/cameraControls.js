import { camera, renderer, controls } from './core.js';
import { updateVisibleElements } from './utils.js';
import { nodes } from './nodeManager.js';
import { loadNodesInView } from './dataLoader.js';
import { MAX_NODES } from './config.js';
import * as THREE from './lib/three.module.js';

let cameraMovePending = false;

export function initCameraControls() {
    camera.position.z = 300;
    // ... (existing camera and controls initialization)
}

export function updateCamera() {
    controls.update();
    onCameraMove();
}

export function onCameraMove() {
    if (!cameraMovePending) {
        cameraMovePending = true;
        setTimeout(() => {
            updateVisibleElements();
            // Only load new nodes if we're close to the edge of our loaded area
            if (Object.keys(nodes).length < MAX_NODES) {
                loadNodesInView();
            }
            cameraMovePending = false;
        }, 200); // 200ms debounce
    }
}

export function focusOnAllNodes() {
    if (Object.keys(nodes).length === 0) return;

    const box = new THREE.Box3();

    Object.values(nodes).forEach(node => {
        box.expandByObject(node);
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Compute the distance based on the size of the bounding box
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    // Add some padding
    cameraZ *= 1.5;

    camera.position.set(center.x, center.y, center.z + cameraZ);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controls) {
        controls.target.copy(center);
        controls.update();
    }
}
