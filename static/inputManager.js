import { camera, mouse, renderer, controls, scene } from './core.js';
import { updateVisibleElements } from './utils.js';
import { pinnedNode } from './nodeManager.js';
import { togglePinNode } from './uiManager.js';
import { loadNodesInView } from './dataLoader.js';
import * as THREE from './lib/three.module.js';
import { onCameraMove } from './cameraControls.js';

export function initInputManager() {
    window.addEventListener('keydown', onKeyDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('click', onMouseClick, false);
    window.addEventListener('resize', onWindowResize);
}

function onKeyDown(event) {
    const moveSpeed = 5;
    const vector = new THREE.Vector3();

    switch(event.key) {
        case 'w':
        case 'ArrowUp':
            vector.z = -moveSpeed;
            break;
        case 's':
        case 'ArrowDown':
            vector.z = moveSpeed;
            break;
        case 'a':
        case 'ArrowLeft':
            vector.x = -moveSpeed;
            break;
        case 'd':
        case 'ArrowRight':
            vector.x = moveSpeed;
            break;
        case 'q':
            vector.y = moveSpeed;
            break;
        case 'e':
            vector.y = -moveSpeed;
            break;
    }

    // Apply the movement in the camera's local space
    vector.applyQuaternion(camera.quaternion);
    camera.position.add(vector);

    if (controls) {
        controls.target.add(vector);
        controls.update();
    }

    onCameraMove();
}

function onMouseClick(event) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.type === 'Mesh') {
            togglePinNode(object);
        }
    } else if (pinnedNode) {
        togglePinNode(pinnedNode);
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

