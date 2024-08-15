# HuGe VisiON (Huge General Visualizer in Open Networks)

Version: 0.1.0

HuGe VisiON is a powerful 3D visualization tool designed to present dynamically updated, large and accurate trees of relations which can be browsed online. This project aims to provide a new and exciting way to discover ideas, people, and foster a sense of interconnectedness across various domains.

## Goal

Present dynamically updated, large and accurate trees of relations which can be browsed online.

## Features

- 3D visualization of diverse entities (people, organizations, places, concepts, etc.) and their relationships
- Interactive navigation using mouse and keyboard controls
- Color-coded nodes and connections based on entity and relationship types
- Dynamic loading of data from a PostgreSQL database
- Scalable architecture to handle large, complex networks

## Prerequisites

- Python 3.7+
- PostgreSQL
- Flask
- psycopg2
- Three.js (loaded via CDN)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/HuGe-VisiON.git
   cd HuGe-VisiON
   ```

2. Set up a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. Install the required Python packages:
   ```
   pip install Flask psycopg2-binary
   ```

4. Set up your PostgreSQL database and update the connection details in `database.py`.

5. Run the database setup script:
   ```
   python reset_database.py
   ```

6. Generate test data (optional):
   ```
   python generate_test_data.py
   ```

## Usage

1. Start the Flask server:
   ```
   python app.py
   ```

2. Open a web browser and navigate to `http://localhost:5000`.

3. Use the following controls to navigate the 3D space:
   - Left-click and drag: Rotate view
   - Right-click and drag: Pan view
   - Scroll wheel: Zoom in/out
   - WASD / Arrow keys: Move camera
   - Q: Move forward, E: Move backward

## Project Structure

- `app.py`: Flask application server
- `database.py`: Database connection and query management
- `reset_database.py`: Script to reset and initialize the database
- `generate_test_data.py`: Script to generate sample data
- `static/visualization.js`: 3D visualization logic using Three.js
- `templates/index.html`: Main HTML template

## Extending the Network

HuGe VisiON is designed to be flexible and accommodate various types of entities and relationships. To add new types:

1. Update the `Nodes` table in the database to include new entity types.
2. Modify the `getColorForType` function in `visualization.js` to assign colors to new entity types.
3. Update the `Connections` table to include new relationship types.
4. Modify the `getColorForConnectionType` function in `visualization.js` for new relationship types.

## Future Plans

- Implement user authentication and personal networks
- Add functionality to import data from various sources
- Develop algorithms for suggesting connections and discovering patterns
- Create a more advanced search and filter system
- Optimize performance for very large networks

## Contributing

Contributions to HuGe VisiON are welcome! Whether you're fixing bugs, improving the documentation, or proposing new features, your efforts are appreciated. Please feel free to submit pull requests or create issues.

## License

HuGe VisiON is released under the HuGeVisiON Software License.
Please see the [LICENSE.md](LICENSE.md) file in the project repository.

## Acknowledgements

- Three.js for 3D rendering
- Flask for the web framework
- PostgreSQL for the database
- Claude A.I. for development assistance
