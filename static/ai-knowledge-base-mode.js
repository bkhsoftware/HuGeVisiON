const AIKnowledgeBaseMode = {
    name: 'AI Knowledge Base',

    activate() {
        console.log('Activating AI Knowledge Base mode');
        // Set up mode-specific UI elements
    },

    deactivate() {
        console.log('Deactivating AI Knowledge Base mode');
        // Clean up mode-specific UI elements
    },

    interpretData(rawData) {
        // Transform raw data into AI knowledge base representation
        return {
            nodes: rawData.nodes.map(node => ({
                ...node,
                importance: node.importance || 1,
                confidence: node.confidence || 1,
            })),
            connections: rawData.connections.map(conn => ({
                ...conn,
                strength: conn.strength || 1,
            })),
        };
    },

    customizeNode(node, nodeData) {
        // Customize node appearance for AI knowledge base
        node.scale.setScalar(nodeData.importance);
        node.material.color.setHex(this.getColorForConceptType(nodeData.type));
        node.material.opacity = nodeData.confidence;
    },

    customizeConnection(line, connData) {
        // Customize connection appearance for AI knowledge base
        line.material.color.setHex(this.getColorForRelationType(connData.type));
        line.material.linewidth = connData.strength * 2;
    },

    handleClick(object) {
        if (object.userData.type === 'concept') {
            this.showConceptDetails(object.userData);
        } else if (object.userData.type === 'relation') {
            this.showRelationDetails(object.userData);
        }
    },

    onNodeAdded(nodeData) {
        console.log('New concept added to AI Knowledge Base:', nodeData);
        // Here you could trigger an update to the backend or perform any other necessary actions
    },

    onConnectionAdded(connData) {
        console.log('New relation added to AI Knowledge Base:', connData);
        // Here you could trigger an update to the backend or perform any other necessary actions
    },

    showConceptDetails(conceptData) {
        // Display concept details in a side panel
        console.log('Concept details:', conceptData);
    },

    showRelationDetails(relationData) {
        // Display relation details in a side panel
        console.log('Relation details:', relationData);
    },

    validateNodeData(nodeData) {
        // Ensure the node data has all required fields for AI knowledge base
        return {
            ...nodeData,
            type: nodeData.type || 'Concept',
            importance: nodeData.importance || 1,
            confidence: nodeData.confidence || 1,
        };
    },

    validateConnectionData(connData) {
        // Ensure the connection data has all required fields for AI knowledge base
        return {
            ...connData,
            type: connData.type || 'RelatedTo',
            strength: connData.strength || 1,
        };
    },

    getColorForConceptType(type) {
        const colors = {
            'Entity': 0x00ff00,
            'Relationship': 0xff0000,
            'Attribute': 0x0000ff,
            'Process': 0xffff00
        };
        return colors[type] || 0xcccccc;
    },

    getColorForRelationType(type) {
        const colors = {
            'IsA': 0x00ff00,
            'HasA': 0xff0000,
            'PartOf': 0x0000ff,
            'RelatedTo': 0xffff00
        };
        return colors[type] || 0xaaaaaa;
    }
};

// Wait for the DOM to be fully loaded before registering the mode
document.addEventListener('DOMContentLoaded', () => {
    if (typeof registerMode === 'function') {
        registerMode('AIKnowledgeBase', AIKnowledgeBaseMode);
    } else {
        console.error('registerMode function is not available');
    }
});
