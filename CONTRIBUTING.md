# Contributing to Intelligent Web Data Scraper

Thank you for your interest in contributing to the Intelligent Web Data Scraper! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Git
- Google Chrome
- Windows 10/11 (primary platform)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/Working-Data-Scraper.git
   cd Working-Data-Scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   npm start
   ```

## 🔧 Development Guidelines

### Code Style
- Use ES6+ modern JavaScript
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add JSDoc comments for functions and classes
- Use async/await for asynchronous operations

### Project Structure
```
src/
├── main-progressive.js     # Main Electron process
├── preload.js             # Security preload script
├── exporters/             # Data export modules
├── monitor/               # Browser monitoring
├── processor/             # Data processing
├── renderer/              # Frontend UI
├── scraper/               # Web scraping engines  
└── storage/               # Database management
```

### Testing
- Write tests for new features
- Run existing tests before submitting PR
- Test on real websites, not just mock data
- Include edge cases in your tests

```bash
# Run tests
node test-components.js
node test-chrome-connection.js
node debug-export.js
```

## 📝 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm test
   npm start # Verify app works
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format
Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix  
- `docs:` documentation changes
- `style:` formatting, missing semicolons
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## 🐛 Bug Reports

When reporting bugs, please include:

1. **System Information**
   - OS version (Windows 10/11)
   - Node.js version
   - Chrome version
   - Application version

2. **Steps to Reproduce**
   - Detailed steps to reproduce the issue
   - Expected behavior
   - Actual behavior

3. **Error Information**
   - Console logs
   - Error messages
   - Screenshots if applicable

4. **Additional Context**
   - URLs where the issue occurs
   - Configuration settings
   - Any workarounds found

## 💡 Feature Requests

For feature requests, please describe:
- The problem you're trying to solve
- Your proposed solution
- Alternative solutions considered
- Expected benefits
- Implementation complexity estimate

## 🔒 Security

If you discover security vulnerabilities:
- **Do NOT** open a public issue
- Email security concerns to the maintainers
- Provide detailed description and reproduction steps
- Allow time for fix before public disclosure

## 📋 Areas for Contribution

### High Priority
- [ ] macOS and Linux support
- [ ] Firefox browser monitoring
- [ ] Advanced AI-powered extraction
- [ ] Performance optimizations
- [ ] UI/UX improvements

### Medium Priority
- [ ] Additional export formats (JSON, XML)
- [ ] Custom extraction rules
- [ ] Scheduling and automation
- [ ] Data validation improvements
- [ ] Internationalization (i18n)

### Low Priority
- [ ] Plugin system
- [ ] API endpoints
- [ ] Mobile app companion
- [ ] Cloud sync options

## 🧪 Testing Guidelines

### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Cover edge cases and error conditions

### Integration Tests
- Test component interactions
- Use real but controlled data
- Verify end-to-end workflows

### Browser Testing
- Test Chrome browser monitoring
- Verify URL detection accuracy
- Test on various website types
- Validate extraction quality

## 📖 Documentation

When contributing documentation:
- Keep README.md updated with new features
- Update code comments and JSDoc
- Add examples for new functionality
- Update setup guides if needed

## 🤝 Code Review

Code reviews focus on:
- Functionality and correctness
- Performance implications
- Security considerations  
- Code maintainability
- Test coverage
- Documentation completeness

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for major contributions
- README acknowledgments section

Thank you for helping make the Intelligent Web Data Scraper better! 🚀