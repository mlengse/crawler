# Contributing to URL to Markdown Converter

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](../../issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](../../issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

People *love* thorough bug reports. I'm not even kidding.

## Development Setup

1. **Clone your fork of the repository**
   ```bash
   git clone https://github.com/your-username/url-to-markdown-converter.git
   cd url-to-markdown-converter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

5. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

6. **Build and verify**
   ```bash
   npm run build
   ```

## Code Style

- Use consistent indentation (2 spaces)
- Follow React best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### ESLint

We use ESLint to maintain code quality. Run the linter before submitting:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues when possible
```

## Testing

- Write tests for new features
- Ensure all existing tests pass
- Add integration tests for user workflows
- Test edge cases and error conditions

```bash
npm test                    # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

## Component Guidelines

### Creating New Components

1. Create component files in the `src/` directory
2. Follow the naming convention: `ComponentName.js`
3. Export as default
4. Add corresponding CSS in `App.css` or create separate CSS files

### Component Structure

```javascript
import React from 'react';

function ComponentName({ prop1, prop2, onAction }) {
  // Component logic here
  
  return (
    <div className="component-name">
      {/* JSX here */}
    </div>
  );
}

export default ComponentName;
```

## Feature Requests

We welcome feature requests! Before submitting:

1. Check if the feature already exists
2. Search existing issues for similar requests
3. Provide a clear description of the problem you're solving
4. Explain how this feature would benefit users
5. Consider providing a basic implementation outline

## Documentation

- Update README.md for significant changes
- Add inline code comments for complex logic
- Update component documentation
- Include examples for new features

## Deployment

The project is automatically deployed to Vercel on merge to main. Test your changes locally:

```bash
npm run build
npm run preview
```

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue with the `question` label if you have any questions about contributing!

## Recognition

Contributors will be recognized in the project documentation. Thank you for helping make this project better! 🙏
