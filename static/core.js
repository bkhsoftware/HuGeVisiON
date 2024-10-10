import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';

import { updateCamera } from './cameraControls.js';
import { checkNodeClick, checkNodeHover, updateLabels } from './nodeManager.js';
import { loadNodesInView } from './dataLoader.js';
import { loadDataset } from './datasetManager.js';

export let controls;
export let mouse;
export let raycaster;
export let camera;
export let renderer;
export let scene;

export function initCore() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.body.appendChild(renderer.domElement);
    raycaster = new THREE.Raycaster();

    mouse = new THREE.Vector2();

    // Initialize OrbitControls
    initOrbitControls();

    // Test OrbitControls
    if (controls) {
        console.log('Testing OrbitControls...');
        controls.target.set(0, 0, 0);
        controls.update();
        console.log('OrbitControls test complete');
    }

    initializeSceneLights();

    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    renderer.domElement.addEventListener('click', checkNodeClick);

    loadNodesInView();
}

export function initOrbitControls() {
    console.log('Initializing OrbitControls...');
    
    try {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 1000;
        controls.maxPolarAngle = Math.PI;
        controls.keyPanSpeed = 0; // Disable default key controls
        console.log('OrbitControls initialized successfully:', controls);
    } catch (error) {
        console.error('Error initializing OrbitControls:', error);
    }
}

export function initializeSceneLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);
}

export function refreshScene(currentDatasetId) {
    // Store current camera position and rotation
    const cameraPosition = camera.position.clone();
    const cameraRotation = camera.rotation.clone();

    // Clear the existing scene
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }

    // Reinitialize scene (lights, etc.)
    initializeSceneLights();

    // Reload the current dataset
    loadDataset(currentDatasetId);

    // Restore camera position and rotation
    camera.position.copy(cameraPosition);
    camera.rotation.copy(cameraRotation);

    // Force a render
    renderer.render(scene, camera);
}

export function animate() {
    requestAnimationFrame(animate);
    try {
      controls.update();
      updateCamera();
      checkNodeHover();
      updateLabels();
      renderer.render(scene, camera);
    } catch (error) {
        console.error("Error in animation loop:", error);
        console.error("Error stack:", error.stack);
        console.error("Current state:", {
            nodes: Object.keys(nodes).length,
            lines: Object.keys(lines).length,
            connectionLabels: Object.keys(connectionLabels).length
        });
    }
}

window.renderer = renderer;
window.camera = camera;

export { THREE };

//window.addEventListener('resize', onWindowResize);
