from database import Database

class NetworkManager:
    def __init__(self):
        self.db = Database.get_instance()

    def add_node(self, name, type, x, y, z, url=None):
        query = """
        INSERT INTO Nodes (name, type, x, y, z, url) 
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        """
        result = self.db.execute_query(query, (name, type, x, y, z, url))
        return result[0]['id'] if result else None

    def add_connection(self, from_node_id, to_node_id, type):
        query = """
        INSERT INTO Connections (from_node_id, to_node_id, type) 
        VALUES (%s, %s, %s) RETURNING id
        """
        result = self.db.execute_query(query, (from_node_id, to_node_id, type))
        return result[0]['id'] if result else None

    def get_nodes_in_range(self, center_x, center_y, center_z, radius):
        query = """
        SELECT * FROM Nodes
        WHERE POWER(x - %s, 2) + POWER(y - %s, 2) + POWER(z - %s, 2) <= POWER(%s, 2)
        """
        return self.db.execute_query(query, (center_x, center_y, center_z, radius))

    def get_connections_for_nodes(self, node_ids):
        query = """
        SELECT * FROM Connections
        WHERE from_node_id = ANY(%s) OR to_node_id = ANY(%s)
        """
        return self.db.execute_query(query, (node_ids, node_ids))

    def close(self):
        self.db.disconnect()
