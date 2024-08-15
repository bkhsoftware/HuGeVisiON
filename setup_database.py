import psycopg2

def setup_database():
    conn = psycopg2.connect(
        dbname="huge_vision",
        user="bjornkennethholmstrom",
        password="HimitsuDesu009",
        host="localhost"
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
