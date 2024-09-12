// data_handler.js

import { addNode, nodes } from './nodeManager.js';
import { addConnection, loadedConnections } from './connectionManager.js';
import { updateVisibleElements } from './utils.js';

function importJSON(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // Validate the data structure
        if (!data.nodes || !Array.isArray(data.nodes) || !data.connections || !Array.isArray(data.connections)) {
            throw new Error("Invalid JSON structure. Expected 'nodes' and 'connections' arrays.");
        }

        // Send data to the server to create a new dataset
        fetch('/api/load_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
            console.log("Data loaded successfully:", result);
            
            // Clear existing data
            Object.keys(nodes).forEach(key => delete nodes[key]);
            loadedConnections.clear();

            // Process nodes
            data.nodes.forEach(node => {
                if (!node.id || !node.name || !node.type || typeof node.x !== 'number' || typeof node.y !== 'number' || typeof node.z !== 'number') {
                    console.warn("Skipping invalid node:", node);
                    return;
                }
                addNode(node);
            });

            // Process connections
            data.connections.forEach(conn => {
                if (!conn.id || !conn.from_node_id || !conn.to_node_id || !conn.type) {
                    console.warn("Skipping invalid connection:", conn);
                    return;
                }
                addConnection(conn);
            });

            updateVisibleElements();
            console.log("Import successful");
        })
        .catch(error => {
            console.error("Error loading data to server:", error);
        });
    } catch (error) {
        console.error("Error importing JSON:", error);
    }
}

function exportJSON() {
    const data = {
        nodes: Object.values(nodes).map(node => node.userData),
        connections: Object.values(loadedConnections).map(conn => conn.userData)
    };
    return JSON.stringify(data, null, 2);
}

// Expose these functions globally
window.importJSON = importJSON;
window.exportJSON = exportJSON;
