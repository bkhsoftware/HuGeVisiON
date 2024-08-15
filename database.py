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

    def connect(self):
        if self.conn is None:
            try:
                self.conn = psycopg2.connect(
                    dbname=os.environ.get('DB_NAME', 'huge_vision'),
                    user=os.environ.get('DB_USER', 'bjornkennethholmstrom'),
                    password=os.environ.get('DB_PASSWORD', 'HimitsuDesu009'),
                    host=os.environ.get('DB_HOST', 'localhost')
                )
                self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            except (Exception, psycopg2.Error) as error:
                print("Error while connecting to PostgreSQL", error)

    def disconnect(self):
        if self.conn:
            if self.cursor:
                self.cursor.close()
            self.conn.close()
            print("PostgreSQL connection is closed")

    def execute_query(self, query, params=None):
        try:
            self.cursor.execute(query, params or ())
            if self.cursor.description:  # Check if the query returns any results
                return self.cursor.fetchall()
            else:
                self.conn.commit()
                return None
        except (Exception, psycopg2.Error) as error:
            print("Error executing query:", error)
            self.conn.rollback()
            return None

    def execute_update(self, query, params=None):
        try:
            self.cursor.execute(query, params or ())
            self.conn.commit()
            return self.cursor.rowcount
        except (Exception, psycopg2.Error) as error:
            print("Error executing update:", error)
            self.conn.rollback()
            return 0
