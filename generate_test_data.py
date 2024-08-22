import random
from database import Database
from dotenv import load_dotenv
import os
from psycopg2.extras import execute_values

load_dotenv()  # Load environment variables from .env file

def generate_test_data(num_nodes=10000, num_connections=50000, batch_size=1000):
    db = Database.get_instance()
    db.connect()

    print(f"Generating {num_nodes} nodes...")
    for i in range(0, num_nodes, batch_size):
        nodes_batch = []
        for j in range(min(batch_size, num_nodes - i)):
            name = f"Node {i+j}"
            node_type = random.choice(["Person", "Organization", "Place", "Concept"])
            x = random.uniform(-1000, 1000)
            y = random.uniform(-1000, 1000)
            z = random.uniform(-1000, 1000)
            url = f"https://example.com/node{i+j}"
            nodes_batch.append((name, node_type, x, y, z, url))

        query = "INSERT INTO Nodes (name, type, x, y, z, url) VALUES %s"
        execute_values(db.cursor, query, nodes_batch)
        db.conn.commit()
        print(f"Generated {min(i+batch_size, num_nodes)} nodes...")

    print("Fetching node IDs...")
    node_ids = db.execute_query("SELECT id FROM Nodes")
    node_ids = [row['id'] for row in node_ids]

    print(f"Generating {num_connections} connections...")
    for i in range(0, num_connections, batch_size):
        connections_batch = []
        for _ in range(min(batch_size, num_connections - i)):
            from_node = random.choice(node_ids)
            to_node = random.choice(node_ids)
            while to_node == from_node:
                to_node = random.choice(node_ids)
            
            connection_type = random.choice(["Friend", "Colleague", "Family", "Associated"])
            connections_batch.append((from_node, to_node, connection_type))

        query = "INSERT INTO Connections (from_node_id, to_node_id, type) VALUES %s"
        execute_values(db.cursor, query, connections_batch)
        db.conn.commit()
        print(f"Generated {min(i+batch_size, num_connections)} connections...")

    db.disconnect()
    print(f"Successfully generated {num_nodes} nodes and {num_connections} connections.")

if __name__ == "__main__":
    num_nodes = int(os.getenv('TEST_NUM_NODES', 10000))
    num_connections = int(os.getenv('TEST_NUM_CONNECTIONS', 50000))
    generate_test_data(num_nodes, num_connections)
