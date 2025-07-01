# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial setup of the library structure.
- Core `SpaceGraph` class for managing the graph.
- Plugin system for extensibility (`PluginManager`, `Plugin` base class).
- Default plugins for camera, rendering, nodes, edges, layout, UI, minimap, and data.
- Support for multiple node types (HTML, Shape, Image, etc.).
- Various layout algorithms (Force, Circular, Grid, etc.).
- Build system using Vite for ESM, CJS, and UMD outputs.
- TypeScript declaration file generation from JSDoc.
- ESLint and Prettier for code quality.
- Vitest for unit testing.
- JSDoc configuration for API documentation generation (using `docdash` template).
- GitHub Actions workflow for demo deployment.

### Changed

- Refactored project from a demo application to a general-purpose library.
- `package.json` updated for library publication (entry points, files, peer dependencies).
- README.md updated with library-specific information, installation instructions, and quick start.

### Fixed

- Corrected library entry point in Vite configuration.
- Ensured necessary dependencies are externalized in the build.

## [0.1.0] - YYYY-MM-DD (To be released)

- First official release.
- All features from the `[Unreleased]` section above will be part of this version.

---

_Note: This changelog will be updated with each new release. For automated changelog generation based on conventional commits, consider tools like `standard-version` or `semantic-release`._
