const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class EnhancedReporter {
  constructor(options = {}) {
    this.options = {
      outputFile: options.outputFile || 'enhanced-test-report.json',
      outputDir: options.outputDir || 'test-results',
      includeAssertions: options.includeAssertions !== false,
      cleanOutput: options.cleanOutput !== false,
      // Slack integration options
      slackWebhookUrl: options.slackWebhookUrl || null,
      slackChannel: options.slackChannel || '#test-results',
      slackUsername: options.slackUsername || 'Playwright Reporter',
      slackEnabled: options.slackEnabled !== false && options.slackWebhookUrl,
      ...options
    };

    // Simple Slack availability check
    if (options.slackWebhookUrl) {
      console.log('✅ Slack integration enabled (using built-in HTTPS)');
    }

    this.runStartTime = null;
    this.runEndTime = null;
    this.testSuites = new Map();
    this.config = null;
  }

  onBegin(config, suite) {
    this.runStartTime = new Date();
    this.config = config;

    console.log(`🚀 Enhanced Reporter: Starting test run with ${suite.allTests().length} tests`);

    // Ensure output directory exists
    fs.ensureDirSync(this.options.outputDir);
  }

  onTestBegin(test, result) {
    // Store test start time for additional tracking
    test._startTime = new Date();
  }

  onTestEnd(test, result) {
    // Extract the describe block name (suite name)
    const suiteName = this.extractSuiteName(test);

    // Extract assertions from steps
    const assertions = this.extractAssertions(result.steps);

    const testResult = {
      testName: test.title,
      result: result.status,
      duration: `${result.duration}ms`,
      assertions: assertions.map(assertion => ({
        name: assertion.description,
        status: assertion.passed ? 'passed' : 'failed',
        emoji: assertion.passed ? '✅' : '❌',
        duration: assertion.duration || 0
      })),
      retries: result.retry > 0 ? `${result.retry}/${test.retries}` : null,
      browser: test.parent.project()?.name || 'unknown',
      startTime: test._startTime || result.startTime,
      file: path.relative(process.cwd(), test.location.file),
      line: test.location.line
    };

    // Group tests by suite
    if (!this.testSuites.has(suiteName)) {
      this.testSuites.set(suiteName, []);
    }
    this.testSuites.get(suiteName).push(testResult);

    // Enhanced console logging with clean format
    const statusIcon = this.getStatusIcon(result.status);
    const retryInfo = result.retry > 0 ? ` (retry ${result.retry})` : '';
    console.log(`${statusIcon} ${test.title} (${result.duration}ms)${retryInfo} - ${assertions.length} assertions`);
  }

  extractSuiteName(test) {
    // Walk up the parent chain to find describe blocks
    let current = test.parent;

    // Return the top-level describe block name first, fallback to filename only if no describe blocks
    if (test.parent) {
      return test.parent.title; // Return the actual describe block name

    }

    // Only use filename as fallback if no describe blocks exist
    return path.basename(test.location.file, '.spec.js').replace(/-/g, ' ');
  }

  extractAssertions(steps) {
    const assertions = [];

    const processSteps = (stepList) => {
      for (const step of stepList) {
        // Check if this step is an assertion (expect)
        if (step.category === 'expect' || step.title.includes('expect(')) {
          assertions.push({
            description: this.cleanAssertionName(step.title),
            passed: !step.error,
            duration: step.duration || 0,
            location: step.location
          });
        }

        // Process nested steps recursively
        if (step.steps && step.steps.length > 0) {
          processSteps(step.steps);
        }
      }
    };

    processSteps(steps);
    return assertions;
  }

  cleanAssertionName(title) {
    // Clean up assertion names to be more readable
    return title
      .replace(/^Expect /, '')
      .replace(/"/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getStatusIcon(status) {
    const icons = {
      'passed': '✅',
      'failed': '❌',
      'skipped': '⏭️',
      'timedOut': '⏰',
      'interrupted': '🛑'
    };
    return icons[status] || '❓';
  }

  async onEnd(result) {
    this.runEndTime = new Date();

    // Calculate comprehensive summary statistics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let timedOutTests = 0;
    let totalAssertions = 0;
    let totalRetries = 0;

    // Convert Map to structured object with enhanced data
    const structuredReport = {};

    for (const [suiteName, tests] of this.testSuites) {
      structuredReport[suiteName] = tests;

      tests.forEach(test => {
        totalTests++;
        totalAssertions += test.assertions.length;
        if (test.retries) totalRetries++;

        switch (test.result) {
          case 'passed': passedTests++; break;
          case 'failed': failedTests++; break;
          case 'skipped': skippedTests++; break;
          case 'timedOut': timedOutTests++; break;
        }
      });
    }

    const summary = {
      totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      timedOut: timedOutTests,
      totalAssertions,
      totalRetries,
      duration: `${((this.runEndTime - this.runStartTime) / 1000).toFixed(2)}s`,
      timestamp: new Date().toISOString(),
      successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) + '%' : '0%'
    };

    const finalReport = {
      summary,
      testSuites: structuredReport,
      metadata: {
        reporterName: 'Enhanced Playwright Reporter',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    // Write the harmonized report
    const outputPath = path.join(this.options.outputDir, this.options.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(finalReport, null, 2));

    this.printEnhancedSummary(summary, outputPath);
    this.printStructuredResults(structuredReport);

    // Send Slack notification if enabled
    if (this.options.slackEnabled) {
      await this.sendSlackNotification(summary, structuredReport);
    }
  }

  async sendSlackNotification(summary, structuredReport) {
    try {
      console.log('\n📤 Sending Slack notification...');

      const statusColor = summary.failed > 0 ? 'danger' : summary.passed === summary.totalTests ? 'good' : 'warning';
      const statusEmoji = summary.failed > 0 ? '❌' : summary.passed === summary.totalTests ? '✅' : '⚠️';
      const titleText = 'Test Run Complete';

      // Create Slack message payload
      const slackPayload = {
        channel: this.options.slackChannel,
        username: this.options.slackUsername,
        icon_emoji: ':test_tube:',
        attachments: [
          {
            color: statusColor,
            title: `${statusEmoji} ${titleText}`,
            fields: [
              {
                title: 'Summary',
                value: `Total: ${summary.totalTests} | ✅ Passed: ${summary.passed} | ❌ Failed: ${summary.failed} | ⏭️ Skipped: ${summary.skipped}`,
                short: false
              },
              {
                title: 'Success Rate',
                value: summary.successRate,
                short: true
              },
              {
                title: 'Duration',
                value: summary.duration,
                short: true
              },
              {
                title: 'Assertions',
                value: `${summary.totalAssertions} total`,
                short: true
              },
              {
                title: 'Retries',
                value: `${summary.totalRetries} tests retried`,
                short: true
              }
            ],
            footer: 'Enhanced Playwright Reporter',
            ts: Math.floor(new Date().getTime() / 1000)
          }
        ]
      };



      // Add failed test details if any - IMPROVED FORMAT
      if (summary.failed > 0) {
        const failedTests = [];
        for (const [suiteName, tests] of Object.entries(structuredReport)) {
          tests.filter(test => test.result === 'failed').forEach(test => {
            const failedAssertions = test.assertions.filter(assertion => assertion.status === 'failed');
            failedTests.push(`:x: (${suiteName})\n *${test.testName}* (${test.duration})\n   └ Failed assertions: ${failedAssertions.map(a => a.name).join(', ')}`);
          });
        }
        slackPayload.attachments.push({
          color: 'danger',
          title: `:boom: Failure Tests (${summary.failed})`,
          text: failedTests.join('\n\n'),
          mrkdwn_in: ['text']
        });
      }
      // Add success test details if any - IMPROVED FORMAT
      if (summary.failed > 0) {
        const passedTests = [];
        for (const [suiteName, tests] of Object.entries(structuredReport)) {
          tests.filter(test => test.result === 'passed').forEach(test => {
            const SuccessAssertions = test.assertions.filter(assertion => assertion.status === 'passed');
            passedTests.push(`:white_check_mark: (${suiteName})\n *${test.testName}* (${test.duration})\n   └ Passed assertions: ${SuccessAssertions.map(a => a.name).join(', ')}`);
          });
        }
        slackPayload.attachments.push({
          color: 'danger',
          title: ` :white_check_mark: Passed Tests (${summary.passed})`,
          text: passedTests.join('\n\n'),
          mrkdwn_in: ['text']
        });
      }


      // Add test suite breakdown - CLEANER FORMAT
      const suiteBreakdown = Object.entries(structuredReport).map(([suiteName, tests]) => {
        const suitePassed = tests.filter(t => t.result === 'passed').length;
        const suiteFailed = tests.filter(t => t.result === 'failed').length;
        const suiteSkipped = tests.filter(t => t.result === 'skipped').length;



        let suiteStatus = '';
        if (suiteFailed > 0) suiteStatus = '❌';
        else if (suiteSkipped > 0) suiteStatus = '⚠️';
        else suiteStatus = '✅';

        return `${suiteStatus} *${suiteName}*: ${suitePassed} passed, ${suiteFailed} failed, ${suiteSkipped} skipped`;
      }).join('\n');

      slackPayload.attachments.push({
        color: summary.failed > 0 ? '#ff9500' : 'good',
        title: '📋 Test Suites Summary',
        text: suiteBreakdown,
        mrkdwn_in: ['text']
      });

      // Send to Slack using built-in HTTPS module
      await this.postToSlack(this.options.slackWebhookUrl, slackPayload);
      console.log('✅ Slack notification sent successfully!');

    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error.message);
    }
  }

  postToSlack(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      const postData = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  printEnhancedSummary(summary, outputPath) {
    console.log('\n📊 Enhanced Test Report Summary:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Clean, single-line format inspired by clean-reporter
    console.log(`Total: ${summary.totalTests} | ✅ Passed: ${summary.passed} | ❌ Failed: ${summary.failed} | ⏭️ Skipped: ${summary.skipped}${summary.timedOut > 0 ? ` | ⏰ Timed Out: ${summary.timedOut}` : ''}`);
    console.log(`📋 Assertions: ${summary.totalAssertions} | 🔄 Retries: ${summary.totalRetries} | 📈 Success Rate: ${summary.successRate}`);
    console.log(`⏱️ Duration: ${summary.duration} | 📄 Report: ${outputPath}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  printStructuredResults(structuredReport) {
    console.log('\n📋 Test Results by Suite:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (const [suiteName, tests] of Object.entries(structuredReport)) {
      console.log(`\n📁 ${suiteName}`);

      tests.forEach(test => {
        const statusIcon = this.getStatusIcon(test.result);
        const retryInfo = test.retries ? ` (retries: ${test.retries})` : '';
        console.log(`  ${statusIcon} ${test.testName} (${test.duration})${retryInfo}`);

        if (test.assertions.length > 0) {
          test.assertions.forEach(assertion => {
            const durationInfo = assertion.duration > 0 ? ` (${assertion.duration}ms)` : '';
            console.log(`    ${assertion.emoji} ${assertion.name}${durationInfo}`);
          });
        }
      });
    }
  }
}

module.exports = EnhancedReporter;