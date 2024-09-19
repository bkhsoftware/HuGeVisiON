export const genealogyMode = {
    name: 'Genealogy',
    uploadForm: null,
    initialize: function() {
        return new Promise((resolve, reject) => {
            // Load the most recent dataset or a default dataset
            fetch('/api/most_recent_dataset')
                .then(response => response.json())
                .then(data => {
                    this.data = data;
                    resolve();
                })
                .catch(reject);
        });
    },
    activate: function() {
        console.log('Activating Genealogy Mode');
        this.createUploadForm();
    },
    deactivate: function() {
        console.log('Deactivating Genealogy Mode');
        this.removeUploadForm();
    },
    interpretData: function(rawData) {
        console.log("Interpreting data for genealogy visualization");
        if (!this.data || !this.data.nodes) {
            console.log("Data not yet available for genealogy mode");
            return { nodes: [], connections: [] };
        }
        const layoutedNodes = this.layoutNodesAsTree(rawData.nodes, rawData.connections);
        return { nodes: layoutedNodes, connections: rawData.connections };
    },
    customizeVisuals: function(scene, nodes, connections) {
        nodes.forEach(node => {
            if (node.userData.sex === 'M') {
                node.material.color.setHex(0x4444ff); // Blue for male
            } else if (node.userData.sex === 'F') {
                node.material.color.setHex(0xff4444); // Red for female
            } else {
                node.material.color.setHex(0x44ff44); // Green for unknown/other
            }
        });

        connections.forEach(connection => {
            if (connection.userData.type === 'Parent-Child') {
                connection.material.color.setHex(0xffff00); // Yellow for parent-child
            } else if (connection.userData.type === 'Spouse') {
                connection.material.color.setHex(0xff00ff); // Magenta for spouse
            }
        });
    },
    createUploadForm: function() {
        if (!this.uploadForm) {
            this.uploadForm = document.createElement('form');
            this.uploadForm.id = 'gedUploadForm';
            this.uploadForm.enctype = 'multipart/form-data';
            this.uploadForm.innerHTML = `
                <input type="file" id="gedFile" name="file" accept=".ged" style="display: none;">
                <button type="button" id="uploadButton">Upload GED File</button>
            `;
            document.getElementById('controls').appendChild(this.uploadForm);
            
            document.getElementById('uploadButton').addEventListener('click', () => {
                document.getElementById('gedFile').click();
            });
            
            document.getElementById('gedFile').addEventListener('change', this.handleFileUpload.bind(this));
        }
    },
    removeUploadForm: function() {
        if (this.uploadForm && this.uploadForm.parentNode) {
            this.uploadForm.parentNode.removeChild(this.uploadForm);
        }
    },
    handleFileUpload: function(e) {
        const file = e.target.files[0];
        if (!file) {
            console.error('No file selected');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/upload_ged', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('GED file processed:', data);
            if (data.nodes && data.connections) {
                console.log(`Received ${data.nodes.length} nodes and ${data.connections.length} connections`);
                this.loadDataset(data.dataset_id, data.nodes, data.connections);
            } else {
                console.error('Invalid data received from server');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    },
    loadDataset: function(datasetId, nodes, connections) {
        console.log(`Loading dataset ${datasetId} with ${nodes.length} nodes and ${connections.length} connections`);
        
        // Clear existing data
        clearNodes();
        clearConnections();

        // Apply layout
        const layoutedNodes = this.layoutNodesAsTree(nodes, connections);

        // Load new data
        layoutedNodes.forEach(node => {
            console.log(`Adding node: ${JSON.stringify(node)}`);
            addNode({
                id: node.id,
                name: node.name,
                type: node.type,
                x: node.x || 0,
                y: node.y || 0,
                z: node.z || 0,
                sex: node.sex
            });
        });
        connections.forEach(connection => {
            console.log(`Adding connection: ${JSON.stringify(connection)}`);
            addConnection(connection);
        });

        updateVisibleElements();
        
        // Log the positions of a few nodes to verify
        Object.values(getNodes()).slice(0, 5).forEach(node => {
            console.log(`Node ${node.id} position: (${node.position.x}, ${node.position.y}, ${node.position.z})`);
        });
    },
    layoutNodesAsTree: function(nodes, connections) {
        console.log("Starting layoutNodesAsTree");
        console.log("Input nodes:", nodes);
        console.log("Input connections:", connections);

        const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [], parents: [] }]));

        // Build the tree structure
        connections.forEach(conn => {
            const parent = nodeMap.get(conn.from_node_id);
            const child = nodeMap.get(conn.to_node_id);
            if (parent && child) {
                parent.children.push(child);
                child.parents.push(parent);
            }
        });

        // Find root nodes (nodes without parents)
        const rootNodes = Array.from(nodeMap.values()).filter(node => node.parents.length === 0);
        console.log(`Found ${rootNodes.length} root nodes`);

        // Recursively set positions
        function setPositions(node, x, y, level) {
            node.x = x;
            node.y = y;
            node.z = 0;
            console.log(`Set position for node ${node.id}: (${x}, ${y}, 0)`);

            const childSpacing = 100;
            const levelSpacing = 200;

            let totalWidth = (node.children.length - 1) * childSpacing;
            let startX = x - totalWidth / 2;

            node.children.forEach((child, index) => {
                setPositions(child, startX + index * childSpacing, y + levelSpacing, level + 1);
            });

            return node;  // Return the updated node
        }

        // Layout each tree
        rootNodes.forEach((root, index) => {
            setPositions(root, index * 500, 0, 0);
        });

        // Return the updated nodes
        const layoutedNodes = Array.from(nodeMap.values());
        console.log("Laid out nodes:", layoutedNodes);
        return layoutedNodes;
    }
};

