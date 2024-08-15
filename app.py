from flask import Flask, jsonify, request, render_template
from database import Database

app = Flask(__name__)
db = Database.get_instance()

@app.route('/')
def index():
    return render_template('index.html')

# Get only the nodes within a certain radius
#@app.route('/api/nodes')
#def get_nodes():
#    x = float(request.args.get('x', 0))
#    y = float(request.args.get('y', 0))
#    z = float(request.args.get('z', 0))
#    radius = float(request.args.get('radius', 100))
#    
#    query = """
#    SELECT * FROM Nodes
#    WHERE cube(array[x, y, z]) <-> cube(array[%s, %s, %s]) < %s
#    """
#    nodes = db.execute_query(query, (x, y, z, radius))
#    return jsonify(nodes)
#
#@app.route('/api/connections')
#def get_connections():
#    node_ids = request.args.get('node_ids', '').split(',')
#    node_ids = [int(id) for id in node_ids if id]
#    
#    query = """
#    SELECT * FROM Connections
#    WHERE from_node_id = ANY(%s) OR to_node_id = ANY(%s)
#    """
#    connections = db.execute_query(query, (node_ids, node_ids))
#    return jsonify(connections)
#

# Get ALL nodes
@app.route('/api/nodes')
def get_nodes():
    query = "SELECT * FROM Nodes"
    nodes = db.execute_query(query)
    return jsonify(nodes)

@app.route('/api/connections')
def get_connections():
    query = "SELECT * FROM Connections"
    connections = db.execute_query(query)
    return jsonify(connections)

if __name__ == '__main__':
    db.connect()
    app.run(debug=True)
    db.disconnect()
