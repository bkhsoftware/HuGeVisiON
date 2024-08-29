import psycopg2
from psycopg2.extras import RealDictCursor
import os
from contextlib import contextmanager

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

    @contextmanager
    def get_cursor(self):
        try:
            if self.conn is None or self.conn.closed:
                self.connect()
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            yield cursor
            self.conn.commit()
        except psycopg2.Error as e:
            self.conn.rollback()
            print(f"Database error: {e}")
            raise
        finally:
            if cursor:
                cursor.close()

    def connect(self):
        try:
            self.conn = psycopg2.connect(
                dbname=os.environ.get('DB_NAME', 'huge_vision'),
                user=os.environ.get('DB_USER', 'your_username'),
                password=os.environ.get('DB_PASSWORD', 'your_password'),
                host=os.environ.get('DB_HOST', 'localhost')
            )
            print("Database connection established successfully.")
        except psycopg2.Error as e:
            print(f"Error while connecting to PostgreSQL: {e}")
            raise

    def disconnect(self):
        if self.conn:
            self.conn.close()
            print("PostgreSQL connection is closed")
        self.conn = None

    def execute_query(self, query, params=None):
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            if cursor.description:  # Check if the query returns any results
                return cursor.fetchall()
            return None

    def execute_update(self, query, params=None):
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.rowcount
