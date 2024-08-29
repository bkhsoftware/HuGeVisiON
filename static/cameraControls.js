import { camera, renderer, controls } from './core.js';
import { updateVisibleElements } from './utils.js';
import { nodes } from './nodeManager.js';
import { loadNodesInView } from './dataLoader.js';
import { MAX_NODES } from './config.js';

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
