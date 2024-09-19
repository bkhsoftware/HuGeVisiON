from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request, render_template
from database import Database
from math import ceil
from config import Config
import psycopg2
import json
import tempfile
from flask import send_file
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY
db = Database.get_instance()

def ensure_default_dataset():
    # Check if any datasets exist
    existing_datasets = db.execute_query("SELECT COUNT(*) as count FROM Datasets")
    if existing_datasets[0]['count'] > 0:
        return  # Do nothing if any datasets exist

    default_dataset_name = "HuGe VisiON Default Dataset"
    dataset_id = db.execute_query("INSERT INTO Datasets (name) VALUES (%s) RETURNING id", (default_dataset_name,))[0]['id']
    
    # Generate default data
    default_nodes = [
        ('Node 1', 'Default', 0, 0, 0, dataset_id),
        ('Node 2', 'Default', 50, 50, 50, dataset_id),
        ('Node 3', 'Default', -50, -50, -50, dataset_id)
    ]
    for node in default_nodes:
        db.execute_query("INSERT INTO Nodes (name, type, x, y, z, dataset_id) VALUES (%s, %s, %s, %s, %s, %s)", node)
    
    node_ids = db.execute_query("SELECT id FROM Nodes WHERE dataset_id = %s ORDER BY id", (dataset_id,))
    node_ids = [row['id'] for row in node_ids]

    default_connections = [
        (node_ids[0], node_ids[1], 'Default', dataset_id),
        (node_ids[1], node_ids[2], 'Default', dataset_id),
        (node_ids[2], node_ids[0], 'Default', dataset_id)
    ]
    for conn in default_connections:
        db.execute_query("INSERT INTO Connections (from_node_id, to_node_id, type, dataset_id) VALUES (%s, %s, %s, %s)", conn)
    
    print(f"Default dataset created with ID: {dataset_id}")

@app.before_request
def before_request():
    if request.endpoint == 'get_datasets':
        ensure_default_dataset()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/most_recent_dataset')
def get_most_recent_dataset():
    try:
        dataset_id = ensure_default_dataset()
        dataset = db.execute_query("SELECT id, name FROM Datasets WHERE id = %s", (dataset_id,))[0]
        nodes = db.execute_query("SELECT * FROM Nodes WHERE dataset_id = %s", (dataset_id,))
        connections = db.execute_query("SELECT * FROM Connections WHERE dataset_id = %s", (dataset_id,))
        return jsonify({'dataset': dataset, 'nodes': nodes, 'connections': connections})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes')
def get_nodes():
    try:
        dataset_id = ensure_default_dataset()

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))
        x = float(request.args.get('x', 0))
        y = float(request.args.get('y', 0))
        z = float(request.args.get('z', 0))
        radius = float(request.args.get('radius', 1000))

        offset = (page - 1) * per_page

        query = """
        SELECT * FROM Nodes
        WHERE dataset_id = %s AND POWER(x - %s, 2) + POWER(y - %s, 2) + POWER(z - %s, 2) <= POWER(%s, 2)
        LIMIT %s OFFSET %s
        """
        nodes = db.execute_query(query, (dataset_id, x, y, z, radius, per_page, offset))

        count_query = """
        SELECT COUNT(*) FROM Nodes
        WHERE dataset_id = %s AND POWER(x - %s, 2) + POWER(y - %s, 2) + POWER(z - %s, 2) <= POWER(%s, 2)
        """
        count_result = db.execute_query(count_query, (dataset_id, x, y, z, radius))

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
        dataset_id = ensure_default_dataset()

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
        WHERE dataset_id = %s AND (from_node_id = ANY(%s) OR to_node_id = ANY(%s))
        LIMIT %s OFFSET %s
        """
        connections = db.execute_query(query, (dataset_id, node_ids, node_ids, per_page, offset))

        count_query = """
        SELECT COUNT(*) FROM Connections
        WHERE dataset_id = %s AND (from_node_id = ANY(%s) OR to_node_id = ANY(%s))
        """
        count_result = db.execute_query(count_query, (dataset_id, node_ids, node_ids))

        total_count = count_result[0]['count']
        total_pages = ceil(total_count / per_page)

        return jsonify({
            'connections': connections,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_count': total_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_data', methods=['POST'])
def save_data():
    try:
        data = request.json
        
        # Save data to a temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            json.dump(data, temp_file, indent=2)
            temp_filename = temp_file.name

        # Send the file to the client
        return send_file(temp_filename, as_attachment=True, attachment_filename='huge_vision_data.json')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/load_data', methods=['POST'])
def load_data():
    try:
        data = request.json
        
        # Use the provided name or generate a default one
        dataset_name = data.get('name', f"Imported Dataset {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        dataset_id = db.execute_query("INSERT INTO Datasets (name) VALUES (%s) RETURNING id", (dataset_name,))[0]['id']

        # Insert new nodes
        for node in data['nodes']:
            query = """
            INSERT INTO Nodes (id, name, type, x, y, z, dataset_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            db.execute_query(query, (node['id'], node['name'], node['type'], node['x'], node['y'], node['z'], dataset_id))

        # Insert new connections
        for conn in data['connections']:
            query = """
            INSERT INTO Connections (id, from_node_id, to_node_id, type, dataset_id) 
            VALUES (%s, %s, %s, %s, %s)
            """
            db.execute_query(query, (conn['id'], conn['from_node_id'], conn['to_node_id'], conn['type'], dataset_id))

        return jsonify({'message': 'Data loaded successfully', 'dataset_id': dataset_id, 'dataset_name': dataset_name}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync_data', methods=['POST'])
def sync_data():
    try:
        data = request.json
        
        # Sync nodes
        for node in data['nodes']:
            query = """
            INSERT INTO Nodes (id, name, type, x, y, z)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name, type = EXCLUDED.type, x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z
            """
            db.execute_query(query, (node['id'], node['name'], node['type'], node['x'], node['y'], node['z']))

        # Sync connections
        for conn in data['connections']:
            query = """
            INSERT INTO Connections (id, from_node_id, to_node_id, type)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET from_node_id = EXCLUDED.from_node_id, to_node_id = EXCLUDED.to_node_id, type = EXCLUDED.type
            """
            db.execute_query(query, (conn['id'], conn['from_node_id'], conn['to_node_id'], conn['type']))

        return jsonify({'message': 'Data synchronized successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    datasets = db.execute_query("SELECT id, name FROM Datasets")
    return jsonify(datasets)

@app.route('/api/dataset/<int:dataset_id>', methods=['GET'])
def get_dataset(dataset_id):
    nodes = db.execute_query("SELECT * FROM Nodes WHERE dataset_id = %s", (dataset_id,))
    connections = db.execute_query("SELECT * FROM Connections WHERE dataset_id = %s", (dataset_id,))
    print(f"Retrieved dataset {dataset_id}: {len(nodes)} nodes and {len(connections)} connections")
    return jsonify({'nodes': nodes, 'connections': connections})

@app.route('/api/dataset', methods=['POST'])
def create_dataset():
    data = request.json
    dataset_name = data['name']
    nodes = data['nodes']
    connections = data['connections']
    
    # Create new dataset
    dataset_id = db.execute_query("INSERT INTO Datasets (name) VALUES (%s) RETURNING id", (dataset_name,))[0]['id']
    
    # Insert nodes
    for node in nodes:
        db.execute_query("""
            INSERT INTO Nodes (id, name, type, x, y, z, dataset_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (node['id'], node['name'], node['type'], node['x'], node['y'], node['z'], dataset_id))
    
    # Insert connections
    for conn in connections:
        db.execute_query("""
            INSERT INTO Connections (id, from_node_id, to_node_id, type, dataset_id) 
            VALUES (%s, %s, %s, %s, %s)
        """, (conn['id'], conn['from_node_id'], conn['to_node_id'], conn['type'], dataset_id))
    
    return jsonify({'message': 'Dataset created successfully', 'dataset_id': dataset_id})

@app.route('/api/dataset/<int:dataset_id>', methods=['DELETE'])
def delete_dataset(dataset_id):
    try:
        # Delete connections associated with the dataset
        db.execute_query("DELETE FROM Connections WHERE dataset_id = %s", (dataset_id,))
        
        # Delete nodes associated with the dataset
        db.execute_query("DELETE FROM Nodes WHERE dataset_id = %s", (dataset_id,))
        
        # Delete the dataset
        db.execute_query("DELETE FROM Datasets WHERE id = %s", (dataset_id,))
        
        return jsonify({'message': 'Dataset deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
