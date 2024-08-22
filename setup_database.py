import psycopg2
from config import Config

def setup_database():
    conn = psycopg2.connect(
        dbname=Config.DB_NAME
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        host=Config.DB_HOST
    )
    cursor = conn.cursor()

    with open('database/network_schema.sql', 'r') as sql_file:
        cursor.execute(sql_file.read())

    conn.commit()
    cursor.close()
    conn.close()

    print("Database setup complete.")

if __name__ == "__main__":
    setup_database()
