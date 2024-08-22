import psycopg2
from psycopg2.extras import RealDictCursor
import os

class Database:
    _instance = None

    @staticmethod
    def get_instance():
        if Database._instance is None:
            Database()
        return Database._instance

    def __init__(self):
        if Database._instance is not None:
            raise Exception("This class is a singleton!")
        else:
            Database._instance = self
            self.conn = None
            self.cursor = None
            self.connect()

    def connect(self):
        if self.conn is None:
            try:
                self.conn = psycopg2.connect(
                    dbname=os.environ.get('DB_NAME', 'huge_vision'),
                    user=os.environ.get('DB_USER', 'your_username'),
                    password=os.environ.get('DB_PASSWORD', 'your_password'),
                    host=os.environ.get('DB_HOST', 'localhost')
                )
                self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
                print("Database connection established successfully.")
            except (Exception, psycopg2.Error) as error:
                print("Error while connecting to PostgreSQL", error)

    def disconnect(self):
        if self.conn:
            if self.cursor:
                self.cursor.close()
            self.conn.close()
            print("PostgreSQL connection is closed")
        self.conn = None
        self.cursor = None

    def execute_query(self, query, params=None):
        if not self.conn or not self.cursor:
            self.connect()
        try:
            self.cursor.execute(query, params or ())
            if self.cursor.description:  # Check if the query returns any results
                return self.cursor.fetchall()
            else:
                self.conn.commit()
                return None
        except (Exception, psycopg2.Error) as error:
            print("Error executing query:", error)
            if self.conn:
                self.conn.rollback()
            return None

    def execute_update(self, query, params=None):
        if not self.conn or not self.cursor:
            self.connect()
        try:
            self.cursor.execute(query, params or ())
            self.conn.commit()
            return self.cursor.rowcount
        except (Exception, psycopg2.Error) as error:
            print("Error executing update:", error)
            if self.conn:
                self.conn.rollback()
            return 0
