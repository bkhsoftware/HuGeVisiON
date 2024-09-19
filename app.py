from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, jsonify, request, render_template, send_file
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from database import Database
from math import ceil
from config import Config
import psycopg2
import json
import tempfile
from datetime import datetime
from werkzeug.utils import secure_filename
from ged_parser import GEDParser

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'ged'}

app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
db = Database.get_instance()

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per minute"]
)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/create_default_dataset', methods=['POST'])
def create_default_dataset():
    try:
        existing_default = db.execute_query("SELECT id FROM Datasets WHERE name = 'Default Dataset' LIMIT 1")
        if existing_default:
            dataset_id = existing_default[0]['id']
            return jsonify({'dataset': {'id': dataset_id}, 'message': 'Default dataset already exists'})

        # Insert the dataset and get the ID
        result = db.execute_query("INSERT INTO Datasets (name) VALUES ('Default Dataset') RETURNING id")
        if not result or len(result) == 0:
            raise Exception("Dataset insertion did not return an ID")
        dataset_id = result[0]['id']
        
        print(f"Created dataset with ID: {dataset_id}")  # Debug print
        
        # Create some default nodes
        default_nodes = [
            ('Node 1', 'Default', 0, 0, 0),
            ('Node 2', 'Default', 50, 50, 50),
            ('Node 3', 'Default', -50, -50, -50)
        ]
        for name, type, x, y, z in default_nodes:
            result = db.execute_query("""
                INSERT INTO Nodes (name, type, x, y, z, dataset_id) 
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (name, type, x, y, z, dataset_id))
            node_id = result[0]['id']
            print(f"Created node with ID: {node_id}")  # Debug print
        
        # Create some default connections
        node_ids = db.execute_query("SELECT id FROM Nodes WHERE dataset_id = %s ORDER BY id", (dataset_id,))
        node_ids = [row['id'] for row in node_ids]
        
        if len(node_ids) < 3:
            raise Exception(f"Not enough nodes created. Expected 3, got {len(node_ids)}")
        
        default_connections = [
            (node_ids[0], node_ids[1], 'Default'),
            (node_ids[1], node_ids[2], 'Default'),
            (node_ids[2], node_ids[0], 'Default')
        ]
        for from_node_id, to_node_id, type in default_connections:
            result = db.execute_query("""
                INSERT INTO Connections (from_node_id, to_node_id, type, dataset_id) 
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (from_node_id, to_node_id, type, dataset_id))
            conn_id = result[0]['id']
            print(f"Created connection with ID: {conn_id}")  # Debug print

        return jsonify({'dataset': {'id': dataset_id}, 'message': 'Default dataset created'})
    except Exception as e:
        print(f"Error creating default dataset: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.before_request
def before_request():
    pass

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/most_recent_dataset')
def get_most_recent_dataset():
    try:
        dataset = db.execute_query("SELECT id FROM Datasets ORDER BY id DESC LIMIT 1")
        if not dataset:
            return jsonify({'message': 'No datasets found'}), 404
        
        dataset_id = dataset[0]['id']
        nodes = db.execute_query("SELECT * FROM Nodes WHERE dataset_id = %s", (dataset_id,))
        connections = db.execute_query("SELECT * FROM Connections WHERE dataset_id = %s", (dataset_id,))
        
        return jsonify({'dataset_id': dataset_id, 'nodes': nodes, 'connections': connections})
    except Exception as e:
        print(f"Error fetching most recent dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes')
def get_nodes():
    try:
        dataset_id = request.args.get('dataset_id')
        if not dataset_id:
            return jsonify({'error': 'No dataset_id provided'}), 400

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

        if not nodes:
            return jsonify({'nodes': [], 'page': page, 'per_page': per_page, 'total_pages': 0, 'total_count': 0})

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
        print(f"Error in get_nodes: {str(e)}")
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
@limiter.limit("100/minute")
def get_connections():
    try:
        dataset_id = request.args.get('dataset_id')
        if not dataset_id:
            return jsonify({'error': 'No dataset_id provided'}), 400

        node_ids = request.args.get('node_ids', '').split(',')
        node_ids = [id for id in node_ids if id and id.lower() != 'undefined']

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
        print(f"Error in get_connections: {str(e)}")
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
        dataset_id = data.get('dataset_id')
        if not dataset_id:
            return jsonify({'error': 'No dataset_id provided'}), 400
        
        with db.get_cursor() as cur:
            # Sync nodes
            for node in data['nodes']:
                cur.execute("""
                    INSERT INTO Nodes (id, name, type, x, y, z, dataset_id, sex)
                    VALUES (%(id)s, %(name)s, %(type)s, %(x)s, %(y)s, %(z)s, %(dataset_id)s, %(sex)s)
                    ON CONFLICT (id, dataset_id) DO UPDATE
                    SET name = EXCLUDED.name, type = EXCLUDED.type, x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, sex = EXCLUDED.sex
                """, node)

            # Sync connections
            for conn in data['connections']:
                cur.execute("""
                    INSERT INTO Connections (from_node_id, to_node_id, type, dataset_id)
                    VALUES (%(from_node_id)s, %(to_node_id)s, %(type)s, %(dataset_id)s)
                    ON CONFLICT (id) DO UPDATE
                    SET from_node_id = EXCLUDED.from_node_id, to_node_id = EXCLUDED.to_node_id, type = EXCLUDED.type
                """, conn)

        return jsonify({'message': 'Data synchronized successfully'}), 200
    except Exception as e:
        print(f"Error in sync_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    try:
        datasets = db.execute_query("SELECT id, name FROM Datasets")
        return jsonify(datasets if datasets else [])
    except Exception as e:
        print(f"Error fetching datasets: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
        # First, delete all connections associated with this dataset
        db.execute_query("DELETE FROM Connections WHERE dataset_id = %s", (dataset_id,))
        
        # Then, delete all nodes associated with this dataset
        db.execute_query("DELETE FROM Nodes WHERE dataset_id = %s", (dataset_id,))
        
        # Finally, delete the dataset itself
        db.execute_query("DELETE FROM Datasets WHERE id = %s", (dataset_id,))
        
        return jsonify({'message': f'Dataset {dataset_id} deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload_ged', methods=['POST'])
def upload_ged():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            parser = GEDParser()
            data = parser.parse_file(file_path)
            
            print(f"Parsed data: {data}")
            
            # Save parsed data to the database
            dataset_name = f"GED Import: {filename}"
            dataset_id = db.execute_query("INSERT INTO Datasets (name) VALUES (%s) RETURNING id", (dataset_name,))[0]['id']
            
            nodes = []
            for node in data['nodes']:
                db.execute_query(
                    "INSERT INTO Nodes (id, name, type, sex, dataset_id, x, y, z) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                    (node['id'], node['name'], node['type'], node.get('sex', 'U'), dataset_id, 0, 0, 0)
                )
                nodes.append(node)
            
            connections = []
            for conn in data['connections']:
                db.execute_query(
                    "INSERT INTO Connections (from_node_id, to_node_id, type, dataset_id) VALUES (%s, %s, %s, %s)",
                    (conn['from_node_id'], conn['to_node_id'], conn['type'], dataset_id)
                )
                connections.append(conn)
            
            print(f"Inserted {len(nodes)} nodes and {len(connections)} connections")
            
            return jsonify({
                'message': 'File uploaded and processed successfully',
                'dataset_id': dataset_id,
                'dataset_name': dataset_name,
                'nodes': nodes,
                'connections': connections
            })
        return jsonify({'error': 'File type not allowed'}), 400
    except Exception as e:
        print(f"Error in upload_ged: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
