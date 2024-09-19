# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added
- Genealogy mode

### Fixed
- Default data loaded without being selected

## [0.3.1] - 2024-09-01
### Added
- Implemented default dataset creation and loading mechanism
- Added data persistence functionality across page refreshes
- Implemented JSON data import and export features
- Created dataSync.js for handling data synchronization between client and server

### Changed
- Enhanced node label visibility and scaling based on camera distance
- Improved error handling in data loading processes
- Updated README with recent improvements and new file descriptions

### Fixed
- Resolved issues with data loading on page refresh
- Fixed label cutoff problems for nodes with long names
## [0.3.0] - 2024-08-29
### Added
- Implemented an info and edit panel when hovering over the nodes
- Added static/data_handler.js for import and export of JSON data

## Changed
- Refactored visualization.js
- Using locally stored THREE module and OrbitControls.

### Fixed
- Removed unnecessary server interactions by implementing a cache
- Favicon now loads

## [0.2.0] - 2024-08-22
### Added
- Implemented pagination and spatial querying for improved performance with large datasets
- Added user-adjustable settings for MAX_CONNECTIONS, MAX_NODES, and RENDER_DISTANCE
- Introduced a modular architecture to support different visualization modes
- Created an AI Knowledge Base mode as the first example of a specialized visualization mode
- Improved error handling and debugging in both frontend and backend

### Changed
- Updated OrbitControls initialization for better compatibility and robustness
- Refactored visualization.js to support the new modular architecture
- Modified the Flask backend to handle new query parameters for pagination and spatial queries

### Fixed
- Resolved issues with mouse controls not working properly
- Fixed errors related to loading and initializing OrbitControls

## [0.1.0] - 2024-03-10
### Added
- Initial project setup
- Basic 3D visualization of nodes and connections
- PostgreSQL database integration
- Flask server for serving data
- Interactive controls for navigation in 3D space
- README with project description and setup instructions
- LICENSE file with HuGeVisiON Software License
- This CHANGELOG file to track project evolution
