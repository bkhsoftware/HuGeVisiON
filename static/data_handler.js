// data_handler.js

function importJSON(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // Validate the data structure
        if (!data.nodes || !Array.isArray(data.nodes) || !data.connections || !Array.isArray(data.connections)) {
            throw new Error("Invalid JSON structure. Expected 'nodes' and 'connections' arrays.");
        }

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

        updateVisualization();
        console.log("Import successful");
    } catch (error) {
        console.error("Error importing JSON:", error);
    }
}

function exportJSON() {
    const data = {
        nodes: Object.values(nodes).map(node => node.userData),
        connections: Object.values(lines).map(line => line.userData)
    };
    return JSON.stringify(data, null, 2);
}

// Expose these functions globally
window.importJSON = importJSON;
window.exportJSON = exportJSON;
