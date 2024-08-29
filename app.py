from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request, render_template
from database import Database
from math import ceil
from config import Config
import psycopg2

app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY
db = Database.get_instance()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/nodes')
def get_nodes():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))
        x = float(request.args.get('x', 0))
        y = float(request.args.get('y', 0))
        z = float(request.args.get('z', 0))
        radius = float(request.args.get('radius', 1000))

        offset = (page - 1) * per_page

        query = """
        SELECT * FROM Nodes
        WHERE POWER(x - %s, 2) + POWER(y - %s, 2) + POWER(z - %s, 2) <= POWER(%s, 2)
        LIMIT %s OFFSET %s
        """
        nodes = db.execute_query(query, (x, y, z, radius, per_page, offset))

        count_query = """
        SELECT COUNT(*) FROM Nodes
        WHERE POWER(x - %s, 2) + POWER(y - %s, 2) + POWER(z - %s, 2) <= POWER(%s, 2)
        """
        count_result = db.execute_query(count_query, (x, y, z, radius))

        total_count = count_result[0]['count']
        total_pages = ceil(total_count / per_page)

        return jsonify({
            'nodes': nodes,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_count': total_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_node', methods=['POST'])
def update_node():
    try:
        data = request.json
        node_id = data['id']
        new_name = data['name']
        new_type = data['type']

        query = """
        UPDATE Nodes
        SET name = %s, type = %s
        WHERE id = %s
        RETURNING *
        """
        result = db.execute_query(query, (new_name, new_type, node_id))

        if result:
            return jsonify(result[0]), 200
        else:
            return jsonify({'error': 'Node not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/connections')
def get_connections():
    try:
        node_ids = request.args.get('node_ids', '').split(',')
        node_ids = [int(id) for id in node_ids if id and id.lower() != 'undefined']

        if not node_ids:
            return jsonify({
                'connections': [],
                'page': 1,
                'per_page': 0,
                'total_pages': 0,
                'total_count': 0
            })

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))

        offset = (page - 1) * per_page

        query = """
        SELECT * FROM Connections
        WHERE from_node_id = ANY(%s) OR to_node_id = ANY(%s)
        LIMIT %s OFFSET %s
        """
        connections = db.execute_query(query, (node_ids, node_ids, per_page, offset))

        count_query = """
        SELECT COUNT(*) FROM Connections
        WHERE from_node_id = ANY(%s) OR to_node_id = ANY(%s)
        """
        count_result = db.execute_query(count_query, (node_ids, node_ids))

        total_count = count_result[0]['count']
        total_pages = ceil(total_count / per_page)

        return jsonify({
            'connections': connections,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_count': total_count
        })
    except psycopg2.Error as e:
        return jsonify({'error': f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
