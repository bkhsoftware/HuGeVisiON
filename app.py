from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request, render_template
from database import Database
from math import ceil

from config import Config
app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY
db = Database.get_instance()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/nodes')
def get_nodes():
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

    if nodes is None:
        return jsonify({'error': 'Failed to fetch nodes'}), 500

    count_query = """
    SELECT COUNT(*) FROM Nodes
    WHERE POWER(x - %s, 2) + POWER(y - %s, 2) + POWER(z - %s, 2) <= POWER(%s, 2)
    """
    count_result = db.execute_query(count_query, (x, y, z, radius))
    
    if count_result is None:
        return jsonify({'error': 'Failed to fetch node count'}), 500

    total_count = count_result[0]['count']
    total_pages = ceil(total_count / per_page)

    return jsonify({
        'nodes': nodes,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages,
        'total_count': total_count
    })

@app.route('/api/connections')
def get_connections():
    node_ids = request.args.get('node_ids', '').split(',')
    node_ids = [int(id) for id in node_ids if id]
    
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))

    offset = (page - 1) * per_page

    query = """
    SELECT * FROM Connections
    WHERE from_node_id = ANY(%s) OR to_node_id = ANY(%s)
    LIMIT %s OFFSET %s
    """
    connections = db.execute_query(query, (node_ids, node_ids, per_page, offset))

    if connections is None:
        return jsonify({'error': 'Failed to fetch connections'}), 500

    count_query = """
    SELECT COUNT(*) FROM Connections
    WHERE from_node_id = ANY(%s) OR to_node_id = ANY(%s)
    """
    count_result = db.execute_query(count_query, (node_ids, node_ids))

    if count_result is None:
        return jsonify({'error': 'Failed to fetch connection count'}), 500

    total_count = count_result[0]['count']
    total_pages = ceil(total_count / per_page)

    return jsonify({
        'connections': connections,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages,
        'total_count': total_count
    })

if __name__ == '__main__':
    app.run(debug=True)
