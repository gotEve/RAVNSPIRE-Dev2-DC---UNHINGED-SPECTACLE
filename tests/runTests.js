// Test runner for the security system
const SecurityTests = require('./securityTests');

async function runTests() {
    console.log('🚀 Starting Ravnspire Security System Tests\n');
    
    const tests = new SecurityTests();
    const results = await tests.runAllTests();
    
    // Exit with appropriate code
    const hasFailures = results.some(test => !test.passed);
    process.exit(hasFailures ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests };
