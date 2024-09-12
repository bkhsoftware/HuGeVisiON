// visualization.js
import { initCore, animate } from './core.js';
import { initInputManager } from './inputManager.js';
import { initCameraControls } from './cameraControls.js';
import { initNodeManager } from './nodeManager.js';
import { initConnectionManager } from './connectionManager.js';
import { initUIManager } from './uiManager.js';
import { initDataLoader, cleanupCache } from './dataLoader.js';
import { initModeManager, userAddNode, userAddConnection } from './modeManager.js';
import { initDataSync, triggerSync } from './dataSync.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing visualization...');
    initCore();
    initInputManager();
    initNodeManager();
    initConnectionManager();
    initCameraControls();
    initUIManager();
    initDataLoader();
    initModeManager();
    initDataSync();
    animate();
});

// Expose necessary functions to the global scope
window.userAddNode = userAddNode;
window.userAddConnection = userAddConnection;
window.triggerSync = triggerSync;

setInterval(cleanupCache, 300000);

console.log('visualization.js loaded');
