import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import os

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
    CREATE TABLE Nodes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        z FLOAT NOT NULL,
        url VARCHAR(255)
    )
    """)

    cur.execute("""
    CREATE TABLE Connections (
        id SERIAL PRIMARY KEY,
        from_node_id INTEGER REFERENCES Nodes(id),
        to_node_id INTEGER REFERENCES Nodes(id),
        type VARCHAR(50) NOT NULL
    )
    """)

    print("Created tables in the database.")

    # Close the connection
    cur.close()
    conn.close()

if __name__ == "__main__":
    reset_database()
    print("Database reset complete.")
