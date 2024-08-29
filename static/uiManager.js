import { camera } from './core.js';
import { nodes, pinnedNode, setPinnedNode } from './nodeManager.js';
import { getColorForType, updateVisibleElements } from './utils.js';
import { MAX_CONNECTIONS, MAX_NODES, RENDER_DISTANCE, setMaxConnections, setMaxNodes, setRenderDistance } from './config.js';
import * as THREE from './lib/three.module.js';

export let infoPanel;
let infoPanelTimeout;
let infoPanelHideTimeout;
const SHOW_DELAY = 300;
const HIDE_DELAY = 800;

export function initUIManager() {
    createInfoPanel();
    initControls();
}

function initControls() {
    const maxConnectionsSlider = document.getElementById('maxConnections');
    const maxNodesSlider = document.getElementById('maxNodes');
    const renderDistanceSlider = document.getElementById('renderDistance');

    maxConnectionsSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        setMaxConnections(value);
        document.getElementById('maxConnectionsValue').textContent = value;
        updateVisibleElements();
    });

    maxNodesSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        setMaxNodes(value);
        document.getElementById('maxNodesValue').textContent = value;
        updateVisibleElements();
    });

    renderDistanceSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        setRenderDistance(value);
        document.getElementById('renderDistanceValue').textContent = value;
        updateVisibleElements();
    });

    // Initialize slider values
    maxConnectionsSlider.value = MAX_CONNECTIONS;
    maxNodesSlider.value = MAX_NODES;
    renderDistanceSlider.value = RENDER_DISTANCE;
    document.getElementById('maxConnectionsValue').textContent = MAX_CONNECTIONS;
    document.getElementById('maxNodesValue').textContent = MAX_NODES;
    document.getElementById('renderDistanceValue').textContent = RENDER_DISTANCE;
}

function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.style.position = 'absolute';
    infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    infoPanel.style.color = 'white';
    infoPanel.style.padding = '10px';
    infoPanel.style.borderRadius = '5px';
    infoPanel.style.display = 'none';
    infoPanel.addEventListener('mouseenter', () => {
        clearTimeout(infoPanelHideTimeout);
    });
    infoPanel.addEventListener('mouseleave', () => {
        if (!pinnedNode) {
            hideInfoPanelWithDelay();
        }
    });
    document.body.appendChild(infoPanel);
}

export function showNodeInfo(node) {
    if (!node || !node.userData) {
        console.error('Invalid node data');
        return;
    }

    const nodeData = node.userData;
    const isPinned = pinnedNode === node;

    let infoHTML = `
        <h3>${nodeData.name || 'Unnamed Node'}</h3>
        <p>Type: ${nodeData.type || 'Unspecified'}</p>
    `;

    if (typeof nodeData.x === 'number' && 
        typeof nodeData.y === 'number' && 
        typeof nodeData.z === 'number') {
        infoHTML += `
            <p>X: ${nodeData.x.toFixed(2)}</p>
            <p>Y: ${nodeData.y.toFixed(2)}</p>
            <p>Z: ${nodeData.z.toFixed(2)}</p>
        `;
    }

    infoHTML += `
        <button id="editNodeButton">Edit</button>
        <button id="pinNodeButton">${isPinned ? 'Unpin' : 'Pin'}</button>
    `;

    infoPanel.innerHTML = infoHTML;

    // Add event listeners to the buttons
    document.getElementById('editNodeButton').addEventListener('click', () => editNodeInfo(nodeData.id));
    document.getElementById('pinNodeButton').addEventListener('click', () => togglePinNode(node));

    infoPanel.style.display = 'block';
    positionInfoPanelAtNode(node);
}

export function togglePinNode(node) {
    if (pinnedNode === node) {
        setPinnedNode(null);
        document.getElementById('pinNodeButton').textContent = 'Pin';
    } else {
        setPinnedNode(node);
        document.getElementById('pinNodeButton').textContent = 'Unpin';
    }
}

export function hideNodeInfo() {
    infoPanel.style.display = 'none';
}

function editNodeInfo(nodeId) {
    const node = nodes[nodeId];
    const nodeData = node.userData;
    infoPanel.innerHTML = `
        <h3>Edit Node</h3>
        <input id="nodeName" value="${nodeData.name}">
        <select id="nodeType">
            <option value="Person" ${nodeData.type === 'Person' ? 'selected' : ''}>Person</option>
            <option value="Organization" ${nodeData.type === 'Organization' ? 'selected' : ''}>Organization</option>
            <option value="Place" ${nodeData.type === 'Place' ? 'selected' : ''}>Place</option>
            <option value="Concept" ${nodeData.type === 'Concept' ? 'selected' : ''}>Concept</option>
        </select>
        <button id="saveNodeButton">Save</button>
    `;
    
    // Add event listener to the save button
    document.getElementById('saveNodeButton').addEventListener('click', () => saveNodeInfo(nodeId));
    
    positionInfoPanelAtNode(node);
}

export function saveNodeInfo(nodeId) {
    const node = nodes[nodeId];
    const newName = document.getElementById('nodeName').value;
    const newType = document.getElementById('nodeType').value;

    // Update node data
    node.userData.name = newName;
    node.userData.type = newType;

    // Update node appearance
    node.material.color.setHex(getColorForType(newType));

    // Send update to server
    fetch('/api/update_node', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: nodeId,
            name: newName,
            type: newType,
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Node updated successfully:', data);
        if (pinnedNode && pinnedNode.userData.id === nodeId) {
            showNodeInfo(node);
        } else {
            hideInfoPanelWithDelay();
        }
    })
    .catch((error) => {
        console.error('Error updating node:', error);
    });
    
    positionInfoPanelAtNode(node);
}

export function positionInfoPanelAtNode(node) {
    const vector = new THREE.Vector3();
    node.getWorldPosition(vector);
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    let x = (vector.x * widthHalf) + widthHalf;
    let y = -(vector.y * heightHalf) + heightHalf;

    // Position the panel above the node
    y -= 20; // Offset to position above the node

    // Ensure the panel stays within the window bounds
    const panelRect = infoPanel.getBoundingClientRect();
    x = Math.max(panelRect.width / 2, Math.min(x, window.innerWidth - panelRect.width / 2));
    y = Math.max(panelRect.height, Math.min(y, window.innerHeight - 20)); // 20px margin from bottom

    infoPanel.style.left = `${x}px`;
    infoPanel.style.top = `${y}px`;
    infoPanel.style.transform = 'translate(-50%, -100%)'; // Center horizontally and position above

    // Ensure the panel is fully visible
    keepPanelInView(infoPanel);
}

function keepPanelInView(panel) {
    const rect = panel.getBoundingClientRect();
    
    if (rect.left < 0) {
        panel.style.left = '0px';
        panel.style.transform = 'translate(0, -100%)';
    }
    if (rect.right > window.innerWidth) {
        panel.style.left = `${window.innerWidth - rect.width}px`;
        panel.style.transform = 'translate(0, -100%)';
    }
    if (rect.top < 0) {
        panel.style.top = '0px';
        panel.style.transform = 'translate(-50%, 0)';
    }
    if (rect.bottom > window.innerHeight) {
        panel.style.top = `${window.innerHeight - rect.height}px`;
        panel.style.transform = 'translate(-50%, 0)';
    }
}

export function showInfoPanelWithDelay(node) {
    clearTimeout(infoPanelTimeout);
    clearTimeout(infoPanelHideTimeout);
    infoPanelTimeout = setTimeout(() => {
        showNodeInfo(node);
        positionInfoPanelAtNode(node);
    }, SHOW_DELAY);
}

export function hideInfoPanelWithDelay() {
    clearTimeout(infoPanelHideTimeout);
    infoPanelHideTimeout = setTimeout(() => {
        if (!pinnedNode) {
            hideNodeInfo();
        }
    }, HIDE_DELAY);
}

function positionPanelWithinWindow(panel) {
    const rect = panel.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        panel.style.left = `${window.innerWidth - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        panel.style.top = `${window.innerHeight - rect.height}px`;
    }
    if (rect.left < 0) {
        panel.style.left = '0px';
    }
    if (rect.top < 0) {
        panel.style.top = '0px';
    }
}
