# Contributing to Chrome Debug MCP

Thank you for your interest in contributing to Chrome Debug MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/chrome-debug-mcp.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```

## Development Process

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure:
   - Code follows existing style (TypeScript)
   - Documentation is updated
   - Tests are added/updated
   - All tests pass

3. Commit your changes:
   ```bash
   git commit -m "Description of changes"
   ```

4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request

## Current Focus Areas

We're particularly interested in contributions for:

1. Extension Loading Support
   - Improving extension loading reliability
   - Adding extension debugging capabilities
   - Extension state management

2. Documentation
   - More examples
   - Use case documentation
   - Troubleshooting guides

3. Testing
   - Additional test cases
   - Test coverage improvements
   - Performance testing

## Pull Request Guidelines

1. Keep PRs focused on a single change
2. Update documentation as needed
3. Add tests for new features
4. Follow existing code style
5. Describe your changes in detail

## Running Tests

```bash
npm test
```

## Reporting Issues

When reporting issues, please include:

1. Chrome version
2. Node.js version
3. Operating system
4. Steps to reproduce
5. Expected vs actual behavior
6. Relevant logs or error messages

## Questions?

Feel free to open an issue for questions or join the discussion in existing issues.

## License

By contributing, you agree that your contributions will be licensed under the ISC License.