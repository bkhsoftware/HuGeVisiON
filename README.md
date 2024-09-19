# HuGe VisiON (Huge General Visualizer in Open Networks)

Version: 0.3.1

HuGe VisiON is a powerful 3D visualization tool designed to present dynamically updated, large and accurate trees of relations which can be browsed online. This project aims to provide a new and exciting way to discover ideas, people, and foster a sense of interconnectedness across various domains.

## Goal

Present dynamically updated, large and accurate trees of relations which can be browsed online.

## Features

- 3D visualization of diverse entities (people, organizations, places, concepts, etc.) and their relationships
- Interactive navigation using mouse and keyboard controls
- Color-coded nodes and connections based on entity and relationship types
- Dynamic loading of data from a PostgreSQL database
- Scalable architecture to handle large, complex networks
- Pagination and spatial querying for improved performance with large datasets
- User-adjustable settings for maximum connections, maximum nodes, and render distance
- Modular architecture supporting different visualization modes
- AI Knowledge Base mode as an example of a specialized visualization mode
- Default dataset creation and loading
- Improved data persistence across page refreshes
- Enhanced label visibility for nodes
- JSON data import and export functionality

## Prerequisites

- Python 3.7+
- PostgreSQL
- Flask
- psycopg2
- Three.js (loaded via CDN)
- dotenv (for environment variable management)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/BjornKennethHolmstrom/HuGeVisiON.git
   cd HuGe-VisiON
   ```

2. Set up a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. Install the required Python packages:
   ```
   pip install Flask psycopg2-binary python-dotenv
   ```

4. Set up your PostgreSQL database and create a `.env` file with your database credentials:
   ```
   DB_NAME=huge_vision
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_HOST=localhost
   SECRET_KEY=your_secret_key
   ```

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

4. Adjust the visualization settings using the control panel on the right side of the screen.

## Generating Datasets

To generate the default dataset:

python generate_test_data.py DEFAULT=true

To generate a large test dataset:

python generate_test_data.py

You can customize the size of the test dataset by setting the TEST_NUM_NODES and TEST_NUM_CONNECTIONS environment variables.

## Project Structure

HuGeVisiON
├── app.py
├── CHANGELOG.md
├── config.py
├── database
│   └── network_schema.sql
├── database.py
├── docs
│   └── modular-visualization-architecture.md
├── generate_secret_key.py
├── generate_test_data.py
├── LICENSE.md
├── network_manager.py
├── README.md
├── reset_database.py
├── setup_database.py
├── static
│   ├── ai-knowledge-base-mode.js
│   ├── cameraControls.js
│   ├── config.js
│   ├── connectionManager.js
│   ├── core.js
│   ├── data_handler.js
│   ├── dataLoader.js
│   ├── favicon.ico
│   ├── inputManager.js
│   ├── lib
│   │   ├── OrbitControls.js
│   │   └── three.module.js
│   ├── modeManager.js
│   ├── nodeManager.js
│   ├── uiManager.js
│   ├── utils.js
│   └── visualization.js
└── templates
    └── index.html

Key files and their purposes:

- `app.py`: Flask application server
- `CHANGELOG.md`: Document tracking all notable changes to the project
- `config.py`: Configuration settings for the application
- `database/network_schema.sql`: SQL schema for the network database
- `database.py`: Database connection and query management
- `docs/modular-visualization-architecture.md`: Documentation of the modular visualization architecture
- `generate_secret_key.py`: Script to generate a secret key for the application
- `generate_test_data.py`: Script to generate sample data
- `LICENSE.md`: License information for the project
- `network_manager.py`: Manages network operations, including adding nodes and connections, and querying the database
- `README.md`: This file, containing project documentation
- `reset_database.py`: Script to reset and initialize the database
- `setup_database.py`: Script to set up the initial database schema using the SQL file in the database folder
- `static/ai-knowledge-base-mode.js`: Example specialized visualization mode
- `static/cameraControls.js`: Manages camera controls in the 3D environment
- `static/config.js`: Configuration settings for the frontend
- `static/connectionManager.js`: Manages connections between nodes
- `static/core.js`: Core functionality for the 3D visualization, including scene setup, lighting, and animation loop
- `static/data_handler.js`: Manages JSON data import and export operations
- `static/dataLoader.js`: Loads data for the visualization
- `static/dataSync.js`: Handles synchronization of data between client and server
- `static/favicon.ico`: Favicon for the web application
- `static/inputManager.js`: Manages user input for the visualization
- `static/lib/OrbitControls.js`: Three.js OrbitControls for camera manipulation
- `static/lib/three.module.js`: Three.js library for 3D rendering
- `static/modeManager.js`: Manages different visualization modes
- `static/nodeManager.js`: Manages node operations in the visualization
- `static/uiManager.js`: Manages the user interface elements
- `static/utils.js`: Utility functions for the frontend
- `static/visualization.js`: Main 3D visualization logic using Three.js (refactored)
- `templates/index.html`: Main HTML template for the web application
- `.env`: Environment variables for database configuration (not tracked in git)

## Extending the Network

HuGe VisiON is designed to be flexible and accommodate various types of entities and relationships. To add new types:

1. Update the `Nodes` table in the database to include new entity types.
2. Modify the `getColorForType` function in `visualization.js` to assign colors to new entity types.
3. Update the `Connections` table to include new relationship types.
4. Modify the `getColorForConnectionType` function in `visualization.js` for new relationship types.

To create a new visualization mode:

1. Create a new JavaScript file in the `static` folder (e.g., `my-new-mode.js`).
2. Implement the required mode functions (activate, deactivate, interpretData, etc.).
3. Register the new mode in `visualization.js` using the `registerMode` function.

## Recent Improvements

- Implemented a default dataset creation and loading mechanism
- Enhanced node label visibility and scaling based on camera distance
- Added data persistence functionality to maintain visualization state across page refreshes
- Improved error handling and data loading processes
- Implemented JSON data import and export features

## Future Plans

- Implement user authentication and personal networks
- Add functionality to import data from various sources
- Develop algorithms for suggesting connections and discovering patterns
- Create a more advanced search and filter system
- Optimize performance for very large networks
- Implement more specialized visualization modes

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
- My family for support and infrastructure
