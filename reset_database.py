import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import os
import uuid 

load_dotenv()

def reset_database():
    # Connect to the default 'postgres' database
    conn = psycopg2.connect(
        dbname="postgres",
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        host=os.getenv('DB_HOST', 'localhost')
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    db_name = os.getenv('DB_NAME', 'huge_vision')

    # Terminate all connections to the database
    cur.execute(f"""
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '{db_name}'
    AND pid <> pg_backend_pid();
    """)

    # Drop the database if it exists
    cur.execute(f"DROP DATABASE IF EXISTS {db_name}")
    print(f"Dropped existing {db_name} database if it existed.")

    # Create a new database
    cur.execute(f"CREATE DATABASE {db_name}")
    print(f"Created new {db_name} database.")

    # Close the connection to the 'postgres' database
    cur.close()
    conn.close()

    # Connect to the new database and create tables
    conn = psycopg2.connect(
        dbname=db_name,
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        host=os.getenv('DB_HOST', 'localhost')
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Create tables
    cur.execute("""
    CREATE TABLE Datasets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE Nodes (
        id VARCHAR(255) NOT NULL,
        dataset_id INTEGER REFERENCES Datasets(id),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        z FLOAT NOT NULL,
        url VARCHAR(255),
        sex CHAR(1) NOT NULL DEFAULT 'U',
        PRIMARY KEY (id, dataset_id)
    )
    """)

    cur.execute("""
    CREATE TABLE Connections (
        id SERIAL PRIMARY KEY,
        from_node_id VARCHAR(255) NOT NULL,
        to_node_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        dataset_id INTEGER REFERENCES Datasets(id),
        FOREIGN KEY (from_node_id, dataset_id) REFERENCES Nodes (id, dataset_id),
        FOREIGN KEY (to_node_id, dataset_id) REFERENCES Nodes (id, dataset_id)
    )
    """)

    print("Created Datasets, Nodes, and Connections tables with updated schema.")

    # Create a default dataset
    cur.execute("INSERT INTO Datasets (name) VALUES ('Default Dataset') RETURNING id")
    default_dataset_id = cur.fetchone()[0]
    print(f"Created default dataset with ID: {default_dataset_id}")

    # Create some default nodes
    default_nodes = [
        ('Node 1', 'Default', 0, 0, 0),
        ('Node 2', 'Default', 50, 50, 50),
        ('Node 3', 'Default', -50, -50, -50)
    ]
    node_ids = []
    for name, node_type, x, y, z in default_nodes:
        node_id = f"N{uuid.uuid4().hex[:8]}"  # Generate a unique string ID
        cur.execute("""
            INSERT INTO Nodes (id, name, type, x, y, z, dataset_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (node_id, name, node_type, x, y, z, default_dataset_id))
        node_ids.append(node_id)
        print(f"Created node: {name} with ID: {node_id}")

    # Create some default connections
    default_connections = [
        (node_ids[0], node_ids[1], 'Default'),
        (node_ids[1], node_ids[2], 'Default'),
        (node_ids[2], node_ids[0], 'Default')
    ]
    for from_node_id, to_node_id, conn_type in default_connections:
        cur.execute("""
            INSERT INTO Connections (from_node_id, to_node_id, type, dataset_id) 
            VALUES (%s, %s, %s, %s)
        """, (from_node_id, to_node_id, conn_type, default_dataset_id))
        print(f"Created connection: {from_node_id} -> {to_node_id}")

    print("Default dataset with nodes and connections created successfully.")

    # Close the connection
    cur.close()
    conn.close()

if __name__ == "__main__":
    reset_database()
    print("Database reset complete.")
