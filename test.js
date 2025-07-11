import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Configuration
const TARGET_ADDRESS = '2gAwqZmY7nRi9XCNQs3CjfSzDiVe5npwK3yS7ijo3E8h';
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

// Initialize Solana connection
const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

/**
 * Test address validation
 */
function testAddressValidation() {
  console.log('🧪 Testing address validation...');
  try {
    new PublicKey(TARGET_ADDRESS);
    console.log('✅ Address validation passed');
    return true;
  } catch (error) {
    console.log('❌ Address validation failed:', error.message);
    return false;
  }
}

/**
 * Test connection to Solana devnet
 */
async function testConnection() {
  console.log('🧪 Testing Solana devnet connection...');
  try {
    const version = await connection.getVersion();
    console.log('✅ Connection successful. Solana version:', version['solana-core']);
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  }
}

/**
 * Test balance retrieval
 */
async function testBalanceRetrieval() {
  console.log('🧪 Testing balance retrieval...');
  try {
    const publicKey = new PublicKey(TARGET_ADDRESS);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`✅ Balance retrieval successful: ${solBalance.toFixed(4)} SOL`);
    return true;
  } catch (error) {
    console.log('❌ Balance retrieval failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Auto Devnet SOL Request Program Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Address Validation', fn: testAddressValidation },
    { name: 'Devnet Connection', fn: testConnection },
    { name: 'Balance Retrieval', fn: testBalanceRetrieval }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The program is ready to run.');
    console.log('💡 Run "pnpm start" to start the automated SOL requests.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your configuration.');
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error during testing:', error.message);
  process.exit(1);
});