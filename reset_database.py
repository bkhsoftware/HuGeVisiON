import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def reset_database():
    # Ask for confirmation
    confirm = input("This will delete all data in the 'huge_vision' database. Are you sure? (y/n): ")
    if confirm.lower() != 'y':
        print("Database reset cancelled.")
        return

    # Connect to the default 'postgres' database
    conn = psycopg2.connect(
        dbname="postgres",
        user="bjornkennethholmstrom",
        password="HimitsuDesu009",
        host="localhost"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Terminate all connections to the huge_vision database
    cur.execute("""
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'huge_vision'
    AND pid <> pg_backend_pid();
    """)

    # Drop the huge_vision database if it exists
    cur.execute("DROP DATABASE IF EXISTS huge_vision")
    print("Dropped existing huge_vision database if it existed.")

    # Create a new huge_vision database
    cur.execute("CREATE DATABASE huge_vision")
    print("Created new huge_vision database.")

    # Close the connection to the 'postgres' database
    cur.close()
    conn.close()

    # Now connect to the new huge_vision database and create tables
    conn = psycopg2.connect(
        dbname="huge_vision",
        user="bjornkennethholmstrom",
        password="HimitsuDesu009",
        host="localhost"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Enable cube extension
    cur.execute("CREATE EXTENSION IF NOT EXISTS cube")

    # Read and execute the SQL from network_schema.sql
    with open('database/network_schema.sql', 'r') as schema_file:
        cur.execute(schema_file.read())

    conn.commit()
    print("Created tables in huge_vision database.")

    # Close the connection
    cur.close()
    conn.close()

if __name__ == "__main__":
    reset_database()
    print("Database reset complete.")
