import { nodes } from './nodeManager.js';
import { lines } from './connectionManager.js';
import { getCurrentDatasetId } from './dataLoader.js';

export function initDataSync() {
    // Set up periodic sync
    setInterval(syncDataWithServer, 300000); // Sync every 5 minutes
}

function syncDataWithServer() {
    const currentDatasetId = getCurrentDatasetId();
    if (!currentDatasetId) {
        console.log("No dataset selected. Skipping data sync.");
        return Promise.resolve();
    }

    const data = {
        dataset_id: currentDatasetId,
        nodes: Object.values(nodes).map(node => ({
            id: node.userData.id,
            name: node.userData.name,
            type: node.userData.type,
            x: node.position.x,
            y: node.position.y,
            z: node.position.z,
            sex: node.userData.sex || 'U',
            dataset_id: currentDatasetId
        })),
        connections: Object.values(lines).map(line => ({
            from_node_id: line.userData.from_node_id,
            to_node_id: line.userData.to_node_id,
            type: line.userData.type,
            dataset_id: currentDatasetId
        }))
    };

    return fetch('/api/sync_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Sync successful:', data);
    })
    .catch(error => {
        console.error('Error during sync:', error);
        // You might want to implement some retry logic or user notification here
    });
}

let syncTimeout = null;

export function triggerSync() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        syncDataWithServer();
    }, 1000);  // Delay sync by 1 second to batch rapid changes
}
