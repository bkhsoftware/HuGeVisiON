import random
from database import Database
from dotenv import load_dotenv
import os
from psycopg2.extras import execute_values

load_dotenv()

def generate_default_dataset(dataset_id):
    db = Database.get_instance()
    
    default_nodes = [
        (f"Node {i}", "Default", random.uniform(-100, 100), random.uniform(-100, 100), random.uniform(-100, 100), dataset_id)
        for i in range(1, 11)  # Generate 10 default nodes
    ]
    
    query = "INSERT INTO Nodes (name, type, x, y, z, dataset_id) VALUES %s"
    execute_values(db.cursor, query, default_nodes)
    
    # Generate some connections between these nodes
    node_ids = db.execute_query("SELECT id FROM Nodes WHERE dataset_id = %s", (dataset_id,))
    node_ids = [row['id'] for row in node_ids]
    
    default_connections = [
        (random.choice(node_ids), random.choice(node_ids), "Default", dataset_id)
        for _ in range(15)  # Generate 15 default connections
    ]
    
    query = "INSERT INTO Connections (from_node_id, to_node_id, type, dataset_id) VALUES %s"
    execute_values(db.cursor, query, default_connections)
    
    db.conn.commit()

def generate_test_data(num_nodes=10000, num_connections=50000, batch_size=1000):
    # ... (keep the existing code for generating large test datasets)

if __name__ == "__main__":
    if 'DEFAULT' in os.environ:
        dataset_id = ensure_default_dataset()
        generate_default_dataset(dataset_id)
        print("Default dataset generated successfully.")
    else:
        num_nodes = int(os.getenv('TEST_NUM_NODES', 10000))
        num_connections = int(os.getenv('TEST_NUM_CONNECTIONS', 50000))
        generate_test_data(num_nodes, num_connections)
        print(f"Test data generated: {num_nodes} nodes and {num_connections} connections.")
