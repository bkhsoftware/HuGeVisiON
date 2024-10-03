// visualization.js
import { initCore, animate } from './core.js';
import { initInputManager } from './inputManager.js';
import { initCameraControls } from './cameraControls.js';
import { addNewNode, initNodeManager } from './nodeManager.js';
import { addNewConnection, initConnectionManager } from './connectionManager.js';
import { initUIManager } from './uiManager.js';
import { initDataLoader, cleanupCache } from './dataLoader.js';
import { initModeManager, userAddNode, userAddConnection } from './modeManager.js';
import { initDataSync, triggerSync } from './dataSync.js';
import { initDatasetManager } from './datasetManager.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing visualization...');
    try {
        initCore();
        initInputManager();
        initNodeManager();
        initConnectionManager();
        initCameraControls();
        initUIManager();
        initModeManager();
        initDataSync();
        initDatasetManager();
        
        // Start the animation loop immediately
        animate();
        
        // Load data after everything else is initialized
        initDataLoader();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

export function startVisualization() {
    animate();
}

// Expose necessary functions to the global scope
window.userAddNode = userAddNode;
window.userAddConnection = userAddConnection;
window.triggerSync = triggerSync;
window.addNewNode = addNewNode;

setInterval(cleanupCache, 300000);

console.log('visualization.js loaded');


