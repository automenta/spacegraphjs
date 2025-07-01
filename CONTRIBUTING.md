# Contributing to SpaceGraph ZUI

First off, thank you for considering contributing to SpaceGraph ZUI! We welcome any type of contribution, from reporting bugs and suggesting features to writing code and improving documentation.

## How Can I Contribute?

### Reporting Bugs

- If you find a bug, please ensure the bug was not already reported by searching on GitHub under [Issues](https://github.com/TTime/spacegraphjs/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/TTime/spacegraphjs/issues/new/choose). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample or an executable test case** demonstrating the expected behavior that is not occurring.
- Use the "Bug Report" template if available.

### Suggesting Enhancements

- If you have an idea for a new feature or an improvement to an existing one, please search for existing suggestions under [Issues](https://github.com/TTime/spacegraphjs/issues) to see if it has been discussed before.
- If not, [open a new issue](https://github.com/TTime/spacegraphjs/issues/new/choose) to suggest your enhancement. Provide a clear description of the proposed feature and its potential benefits.
- Use the "Feature Request" template if available.

### Code Contributions

#### Setting Up Your Development Environment

1.  Fork the repository on GitHub.
2.  Clone your fork locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/spacegraphjs.git
    cd spacegraphjs
    ```
3.  Install dependencies. We use npm.
    ```bash
    npm install
    ```
    This will also set up Husky pre-commit hooks.

#### Making Changes

1.  Create a new branch for your changes:
    ```bash
    git checkout -b feature/your-feature-name # For new features
    # or
    git checkout -b fix/your-bug-fix-name    # For bug fixes
    ```
2.  Make your code changes.
3.  Ensure your code adheres to our coding standards by running the linter and formatter. Pre-commit hooks should handle this automatically, but you can run them manually:
    ```bash
    npm run lint
    npm run format
    ```
4.  Add or update tests for your changes. Run tests to ensure everything passes:
    ```bash
    npm test
    ```
    You can also run tests in watch mode during development:
    ```bash
    npm run test:watch
    ```
    Check test coverage:
    ```bash
    npm run coverage
    ```
5.  Build the library to ensure it compiles correctly:
    ```bash
    npm run build
    ```

#### Commit Messages

- We encourage using [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages (e.g., `feat: add new layout algorithm`, `fix: resolve issue with node rendering`). This helps in automating changelog generation and version bumping in the future.

#### Submitting Pull Requests

1.  Commit your changes with a clear and descriptive commit message.
2.  Push your branch to your fork on GitHub:
    ```bash
    git push origin feature/your-feature-name
    ```
3.  Open a pull request from your fork to the `main` branch of the `TTime/spacegraphjs` repository.
4.  Provide a clear description of your changes in the pull request. Link to any relevant issues.
5.  Ensure all CI checks pass.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms. (We will add a `CODE_OF_CONDUCT.md` file shortly).

## Questions?

Feel free to open an issue if you have any questions or need clarification on the contribution process.

Thank you for your contribution!
