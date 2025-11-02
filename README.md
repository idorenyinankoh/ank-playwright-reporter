# ANK Playwright Reporter

A comprehensive and visually appealing reporter for Playwright test results with detailed insights, analytics, and **Slack notifications**.

## ✨ Features

- 📊 **Clean JSON Reports**: Hierarchical structure with describe blocks and test cases
- 🔍 **Detailed Assertion Tracking**: Captures all assertions with pass/fail status and emojis
- 📱 **Slack Integration**: Sends beautiful notifications to Slack channels via webhooks
- ⏱️ **Timing Analysis**: Detailed duration tracking for tests and assertions
- 🔄 **Retry Information**: Tracks retry attempts and configurations
- 🌐 **Multi-Browser Support**: Works with Chromium, Firefox, and WebKit
- 📈 **Success Rate Calculation**: Automatic test success percentage calculation
- 🎯 **Zero Dependencies**: Uses Node.js built-in modules (no external dependencies for Slack)

## 🚀 Installation

```bash
npm install ank-playwright-reporter
```

## 📋 Quick Start

Add the reporter to your `playwright.config.js`:

```javascript
module.exports = {
  // ... other config
  reporter: [
    ['ank-playwright-reporter', {
      outputFile: 'test-report.json',
      outputDir: 'test-results',
      slackWebhookUrl: 'your-slack-webhook-url' // Optional
    }]
  ]
};
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFile` | string | `'enhanced-test-report.json'` | Name of the JSON report file |
| `outputDir` | string | `'test-results'` | Directory to save reports |
| `slackWebhookUrl` | string | `null` | Slack webhook URL for notifications |
| `slackChannel` | string | `'#test-results'` | Slack channel to post to |
| `slackUsername` | string | `'Playwright Reporter'` | Bot username in Slack |
| `slackEnabled` | boolean | `true` | Enable/disable Slack notifications |

## 📊 Report Structure

The generated JSON report follows this clean structure:

```json
{
  "summary": {
    "totalTests": 10,
    "passed": 8,
    "failed": 2,
    "successRate": "80.0%",
    "duration": "15.32s"
  },
  "testSuites": {
    "Login Tests": [
      {
        "testName": "should login with valid credentials",
        "result": "passed",
        "duration": "2500ms",
        "assertions": [
          {
            "name": "toHaveURL",
            "status": "passed",
            "emoji": "✅"
          }
        ],
        "browser": "chromium"
      }
    ]
  }
}
```

## 💬 Slack Integration

Enable Slack notifications by providing a webhook URL:

```javascript
reporter: [
  ['playwright-enhanced-reporter', {
    slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    slackChannel: '#qa-team',
    slackUsername: 'QA Bot'
  }]
]
```

### Slack Notification Features:
- **Rich formatting** with color-coded attachments
- **Test summary** with pass/fail counts and success rate
- **Failed test details** with specific assertion failures
- **Test suite breakdown** organized by describe blocks
- **Emoji indicators** for quick visual feedback

## 🔧 Advanced Usage

### Multiple Reporters
Use alongside other Playwright reporters:

```javascript
reporter: [
  ['html'],
  ['ank-playwright-reporter'],
  ['list']
]
```

### Environment-Specific Configuration
```javascript
const config = {
  reporter: [
    ['ank-playwright-reporter', {
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      slackEnabled: process.env.CI === 'true'
    }]
  ]
};
```

## 📝 Example Output

### Console Output
```
🚀 Enhanced Reporter: Starting test run with 5 tests
✅ should login successfully (1250ms) - 3 assertions
❌ should handle invalid login (890ms) - 2 assertions

📊 Enhanced Test Report Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 5 | ✅ Passed: 4 | ❌ Failed: 1 | ⏭️ Skipped: 0
📋 Assertions: 12 | 🔄 Retries: 0 | 📈 Success Rate: 80.0%
⏱️ Duration: 5.23s | 📄 Report: test-results/enhanced-test-report.json
```

### Slack Notification
- 🎯 **Title**: Shows describe block name or test suite
- 📊 **Summary**: Test counts with emojis and success rate
- 💥 **Failed Tests**: Detailed breakdown of failures
- 📋 **Suite Breakdown**: Results per test suite

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/iankoh/ank-playwright-reporter.git

# Install dependencies
npm install

# Run tests
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/idorenyinankoh/ank-playwright-reporter)
- [npm Package](https://www.npmjs.com/package/ank-playwright-reporter)
- [Issues](https://github.com/idorenyinankoh/ank-playwright-reporter/issues)

## 🙏 Acknowledgments

- Built for the Playwright testing framework
- Inspired by the need for better test reporting and team collaboration
