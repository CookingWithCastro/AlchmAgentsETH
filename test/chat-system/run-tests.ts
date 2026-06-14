// Test runner configuration for chat system comprehensive testing
// Orchestrates unit tests, integration tests, and performance benchmarks

import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import path from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: number
  performance?: {
    averageResponseTime: number
    maxMemoryUsage: number
    throughput: number
  }
}

interface TestReport {
  timestamp: string
  environment: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  overallDuration: number
  results: TestResult[]
  recommendations: string[]
}

class ChatSystemTestRunner {
  private results: TestResult[] = []
  private startTime: number = Date.now()

  async runAllTests(): Promise<TestReport> {
    console.log('🧪 Starting Chat System Comprehensive Test Suite\n')

    try {
      // Run unit tests
      await this.runUnitTests()

      // Run integration tests
      await this.runIntegrationTests()

      // Run performance benchmarks
      await this.runPerformanceBenchmarks()

      // Generate final report
      const report = this.generateReport()

      // Save report
      this.saveReport(report)

      // Display summary
      this.displaySummary(report)

      return report
    } catch (error) {
      console.error('❌ Test suite failed:', error)
      throw error
    }
  }

  private async runUnitTests(): Promise<void> {
    console.log('📋 Running Unit Tests...')

    try {
      // Historical Council Chat Tests
      const historicalResult = await this.runTestSuite(
        'Historical Council Chat',
        'test/chat-system/unit/historical-council-chat.test.tsx'
      )
      this.results.push(historicalResult)

      // Planetary Wisdom Chat: skipped (unit test file does not exist)

      // Consciousness Laboratory Chat Tests
      const labResult = await this.runTestSuite(
        'Consciousness Laboratory Chat',
        'test/chat-system/unit/consciousness-laboratory-chat.test.tsx'
      )
      this.results.push(labResult)

      console.log('✅ Unit tests completed\n')
    } catch (error) {
      console.error('❌ Unit tests failed:', error)
      throw error
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...')

    try {
      // Unified API Integration Tests
      const apiResult = await this.runTestSuite(
        'Unified Multi-Agent API',
        'test/chat-system/integration/unified-api.test.ts'
      )
      this.results.push(apiResult)

      console.log('✅ Integration tests completed\n')
    } catch (error) {
      console.error('❌ Integration tests failed:', error)
      throw error
    }
  }

  private async runPerformanceBenchmarks(): Promise<void> {
    console.log('⚡ Running Performance Benchmarks...')

    try {
      // Performance Benchmark Tests
      const perfResult = await this.runTestSuite(
        'Performance Benchmarks',
        'test/chat-system/performance/benchmark.test.ts'
      )
      this.results.push(perfResult)

      console.log('✅ Performance benchmarks completed\n')
    } catch (error) {
      console.error('❌ Performance benchmarks failed:', error)
      throw error
    }
  }

  private async runTestSuite(suiteName: string, testFile: string): Promise<TestResult> {
    const startTime = Date.now()

    try {
      console.log(`  Running ${suiteName}...`)

      // Run vitest on specific file
      const command = `bun vitest run ${testFile} --config vitest.unit.config.ts --reporter=json --silent`
      const output = execSync(command, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 })

      // Parse vitest JSON output
      const testResults = this.parseVitestOutput(output)

      const duration = Date.now() - startTime

      const result: TestResult = {
        suite: suiteName,
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
        duration,
        coverage: testResults.coverage,
        performance: testResults.performance,
      }

      console.log(
        `    ✅ ${result.passed} passed, ❌ ${result.failed} failed, ⏭️ ${result.skipped} skipped (${duration}ms)`
      )

      return result
    } catch (error) {
      console.error(`    ❌ ${suiteName} failed:`, error)

      return {
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
      }
    }
  }

  private parseVitestOutput(output: string): {
    passed: number
    failed: number
    skipped: number
    coverage?: number
    performance?: any
  } {
    try {
      // Parse JSON output from vitest
      const lines = output.split('\n').filter(line => line.trim())
      const jsonLine = lines.find(line => line.startsWith('{'))

      if (jsonLine) {
        const results = JSON.parse(jsonLine)
        return {
          passed: results.numPassedTests || 0,
          failed: results.numFailedTests || 0,
          skipped: results.numPendingTests || 0,
          coverage: results.coverageMap ? this.calculateCoverage(results.coverageMap) : undefined,
        }
      }

      // Fallback parsing for different output formats
      const passedMatch = output.match(/(\d+) passed/)
      const failedMatch = output.match(/(\d+) failed/)
      const skippedMatch = output.match(/(\d+) skipped/)

      return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      }
    } catch (error) {
      console.warn('Could not parse test output:', error)
      return { passed: 0, failed: 1, skipped: 0 }
    }
  }

  private calculateCoverage(coverageMap: any): number {
    // Calculate overall coverage percentage from coverage map
    if (!coverageMap) return 0

    let totalLines = 0
    let coveredLines = 0

    for (const file in coverageMap) {
      const fileCoverage = coverageMap[file]
      if (fileCoverage.s) {
        // Statement coverage
        const statements = Object.values(fileCoverage.s) as number[]
        totalLines += statements.length
        coveredLines += statements.filter(count => count > 0).length
      }
    }

    return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
  }

  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)

    const recommendations = this.generateRecommendations()

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      totalTests: totalPassed + totalFailed + totalSkipped,
      totalPassed,
      totalFailed,
      totalSkipped,
      overallDuration: totalDuration,
      results: this.results,
      recommendations,
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []

    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0)
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0

    if (passRate < 90) {
      recommendations.push('🔧 Consider increasing test coverage - current pass rate is below 90%')
    }

    const perfResult = this.results.find(r => r.suite === 'Performance Benchmarks')
    if (perfResult?.performance) {
      if (perfResult.performance.averageResponseTime > 2000) {
        recommendations.push('⚡ Response times are above 2 seconds - consider optimization')
      }
      if (perfResult.performance.maxMemoryUsage > 100 * 1024 * 1024) {
        recommendations.push('💾 Memory usage is high - investigate potential memory leaks')
      }
      if (perfResult.performance.throughput < 1) {
        recommendations.push('🚀 Low throughput detected - consider scaling optimizations')
      }
    }

    const integrationResult = this.results.find(r => r.suite === 'Unified Multi-Agent API')
    if (integrationResult && integrationResult.failed > 0) {
      recommendations.push(
        '🔗 API integration issues detected - review error handling and model selection'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('✨ All tests passing! System is ready for production deployment')
    }

    return recommendations
  }

  private saveReport(report: TestReport): void {
    const reportPath = path.join(
      process.cwd(),
      'test-results',
      `chat-system-report-${Date.now()}.json`
    )

    try {
      // Ensure directory exists
      execSync('mkdir -p test-results', { stdio: 'ignore' })

      // Save detailed report
      writeFileSync(reportPath, JSON.stringify(report, null, 2))

      // Save summary for CI/CD
      const summary = {
        passed: report.totalPassed,
        failed: report.totalFailed,
        passRate: ((report.totalPassed / report.totalTests) * 100).toFixed(1),
        duration: report.overallDuration,
        timestamp: report.timestamp,
      }

      writeFileSync(
        path.join(process.cwd(), 'test-results', 'latest-summary.json'),
        JSON.stringify(summary, null, 2)
      )

      console.log(`📊 Report saved to ${reportPath}`)
    } catch (error) {
      console.warn('Could not save report:', error)
    }
  }

  private displaySummary(report: TestReport): void {
    console.log('\n🎯 Chat System Test Summary')
    console.log('================================')
    console.log(`Total Tests: ${report.totalTests}`)
    console.log(`✅ Passed: ${report.totalPassed}`)
    console.log(`❌ Failed: ${report.totalFailed}`)
    console.log(`⏭️ Skipped: ${report.totalSkipped}`)
    console.log(`⏱️ Duration: ${(report.overallDuration / 1000).toFixed(1)}s`)
    console.log(`📈 Pass Rate: ${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%`)

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.forEach(rec => console.log(`  ${rec}`))
    }

    console.log('\n🔍 Test Suite Results:')
    report.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌'
      console.log(
        `  ${status} ${result.suite}: ${result.passed}/${result.passed + result.failed + result.skipped} (${(result.duration / 1000).toFixed(1)}s)`
      )
    })

    if (report.totalFailed === 0) {
      console.log('\n🎉 All tests passed! Chat system is ready for deployment.')
    } else {
      console.log('\n⚠️ Some tests failed. Please review and fix issues before deployment.')
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new ChatSystemTestRunner()

  runner
    .runAllTests()
    .then(report => {
      process.exit(report.totalFailed === 0 ? 0 : 1)
    })
    .catch(error => {
      console.error('Test runner failed:', error)
      process.exit(1)
    })
}

export { ChatSystemTestRunner }
export type { TestResult, TestReport }
