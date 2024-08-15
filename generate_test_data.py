import random
from database import Database

def generate_test_data(num_nodes=100, num_connections=200):
    db = Database.get_instance()
    db.connect()

    # Generate nodes
    for i in range(num_nodes):
        name = f"Node {i}"
        node_type = random.choice(["Person", "Organization", "Place", "Concept"])
        x = random.uniform(-100, 100)
        y = random.uniform(-100, 100)
        z = random.uniform(-100, 100)
        url = f"https://example.com/node{i}"

        db.execute_query(
            "INSERT INTO Nodes (name, type, x, y, z, url) VALUES (%s, %s, %s, %s, %s, %s)",
            (name, node_type, x, y, z, url)
        )

    # Get all node IDs
    node_ids = db.execute_query("SELECT id FROM Nodes")
    node_ids = [row['id'] for row in node_ids]

    # Generate connections
    for _ in range(num_connections):
        from_node = random.choice(node_ids)
        to_node = random.choice(node_ids)
        while to_node == from_node:
            to_node = random.choice(node_ids)
        
        connection_type = random.choice(["Friend", "Colleague", "Family", "Associated"])

        db.execute_query(
            "INSERT INTO Connections (from_node_id, to_node_id, type) VALUES (%s, %s, %s)",
            (from_node, to_node, connection_type)
        )

    db.disconnect()
    print(f"Generated {num_nodes} nodes and {num_connections} connections.")

if __name__ == "__main__":
    generate_test_data()
