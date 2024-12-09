export const genealogyMode = {
    name: 'Genealogy',
    uploadForm: null,
    data: null,
    initialize: function() {
        return Promise.resolve();  // Don't load any data by default
    },
    activate: function() {
        console.log('Activating Genealogy Mode');
        this.createUploadForm();
    },
    deactivate: function() {
        console.log('Deactivating Genealogy Mode');
        this.removeUploadForm();
    },
    interpretData: function(data) {
        console.log("Interpreting data for genealogy visualization");
        if (!data || !data.nodes || data.nodes.length === 0) {
            console.log("No data available for genealogy mode");
            return { nodes: [], connections: [] };
        }
        console.log("Raw data:", data);
        
        // Implement the tree layout logic here
        const layoutedNodes = this.layoutNodesAsTree(data.nodes, data.connections);
        
        console.log("Laid out nodes:", layoutedNodes);
        return { nodes: layoutedNodes, connections: data.connections };
    },
    customizeVisuals: function(scene, nodes, connections) {
        Object.values(nodes).forEach(node => {
            if (node.userData.sex === 'M') {
                node.material.color.setHex(0x4444ff); // Blue for male
            } else if (node.userData.sex === 'F') {
                node.material.color.setHex(0xff4444); // Red for female
            } else {
                node.material.color.setHex(0x44ff44); // Green for unknown/other
            }
        });

        Object.values(connections).forEach(connection => {
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
                
                // Update the dataset selector
                const datasetSelector = document.getElementById('datasetSelector');
                const option = document.createElement('option');
                option.value = data.dataset_id;
                option.textContent = data.dataset_name;
                datasetSelector.appendChild(option);
                datasetSelector.value = data.dataset_id;
                
                // Trigger change event to update UI
                datasetSelector.dispatchEvent(new Event('change'));
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
        
        // Log the positions of all nodes to verify
        console.log("Final node positions:");
        Object.values(getNodes()).forEach(node => {
            console.log(`Node ${node.id} position: (${node.position.x}, ${node.position.y}, ${node.position.z})`);
        });

        // Calculate and log the bounding box of all nodes
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
        Object.values(getNodes()).forEach(node => {
            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y);
            minZ = Math.min(minZ, node.position.z);
            maxZ = Math.max(maxZ, node.position.z);
        });
        console.log(`Bounding box: X(${minX}, ${maxX}), Y(${minY}, ${maxY}), Z(${minZ}, ${maxZ})`);
    },
    layoutNodesAsTree: function(nodes, connections) {
        const NODE_SPACING = 5000; // Spacing between siblings/individuals on X-axis
        const SPOUSE_SPACING = 3000; // Spacing between spouses on Y-axis
        const YEAR_SPACING = 1; // Scaling for birth years on Z-axis

        // Build the node map and relationships
        function buildNodeMap(nodes, connections) {
            const nodeMap = new Map(nodes.map(node => [node.id, {
                ...node,
                children: [],
                spouses: [],
                x: 0, y: 0, z: 0 // Adding coordinates
            }]));

            connections.forEach(conn => {
                if (conn.type === 'Parent-Child') {
                    const parent = nodeMap.get(conn.from_node_id);
                    const child = nodeMap.get(conn.to_node_id);
                    if (parent && child) {
                        parent.children.push(child);
                        child.parents.push(parent);
                    }
                } else if (conn.type === 'Spouse') {
                    const spouse1 = nodeMap.get(conn.from_node_id);
                    const spouse2 = nodeMap.get(conn.to_node_id);
                    if (spouse1 && spouse2) {
                        spouse1.spouses.push(spouse2);
                        spouse2.spouses.push(spouse1);
                    }
                }
            });
            return nodeMap;
        }

        // Position nodes based on birth year on Z-axis
        function positionNodes(nodeMap) {
            nodeMap.forEach(node => {
                node.z = (node.birthYear || 0) * YEAR_SPACING; // Birth year -> Z-axis
            });
        }

        // Position spouses along Y-axis
        function positionSpouses(nodeMap) {
            nodeMap.forEach(node => {
                node.spouses.forEach((spouse, index) => {
                    spouse.y = node.y + (index + 1) * SPOUSE_SPACING; // Y-axis spacing for spouses
                    spouse.x = node.x; // Keep spouses aligned on X-axis
                    spouse.z = node.z; // Same birth year
                });
            });
        }

        // Lay out families and siblings on the X-axis
        function layoutFamily(node, xOffset = 0, visited = new Set()) {
            if (visited.has(node.id)) return 0;
            visited.add(node.id);

            let totalWidth = NODE_SPACING;

            // Recursively position children
            node.children.forEach(child => {
                totalWidth += layoutFamily(child, xOffset + totalWidth, visited);
            });

            node.x = xOffset + totalWidth / 2; // Position the node on X-axis

            return Math.max(totalWidth, NODE_SPACING);
        }

        // Apply the layout to the nodes
        const nodeMap = buildNodeMap(nodes, connections);
        positionNodes(nodeMap); // Position nodes based on birth year
        positionSpouses(nodeMap); // Position spouses on Y-axis

        let xOffset = 0;
        nodeMap.forEach(node => {
            xOffset += layoutFamily(node, xOffset); // Lay out the family trees
        });

        nodeMap.forEach(node => {
            console.log(`Node: x(${node.x}), y(${node.y}), z(${node.z})`);
        });

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;

        nodeMap.forEach(node => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
            minZ = Math.min(minZ, node.z);
            maxZ = Math.max(maxZ, node.z);
        });

        console.log(`X Range: (${minX}, ${maxX}), Y Range: (${minY}, ${maxY}), Z Range: (${minZ}, ${maxZ})`);
        return Array.from(nodeMap.values());
    }
};

