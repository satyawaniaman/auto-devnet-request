import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import cron from 'node-cron';
import axios from 'axios';
import winston from 'winston';

// Configuration
const TARGET_ADDRESS = '2gAwqZmY7nRi9XCNQs3CjfSzDiVe5npwK3yS7ijo3E8h';
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
const FAUCET_URL = 'https://faucet.solana.com/api/airdrop';
const SOL_AMOUNT = 5; // 5 SOL per request
const MAX_REQUESTS_PER_SESSION = 2;
const INTERVAL_HOURS = 8;

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'devnet-requests.log' })
  ]
});

// Initialize Solana connection
const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

// Track request count for current session
let requestCount = 0;

/**
 * Validate the target address
 */
function validateAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    logger.error(`Invalid Solana address: ${address}`);
    return false;
  }
}

/**
 * Get current SOL balance for the address
 */
async function getBalance(address) {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    logger.error(`Error getting balance: ${error.message}`);
    return null;
  }
}

/**
 * Request SOL from devnet faucet using HTTP API
 */
async function requestDevnetSol(address, amount = 1) {
  try {
    logger.info(`Requesting ${amount} SOL for address: ${address}`);
    
    const response = await axios.post(FAUCET_URL, {
      address: address,
      amount: amount * LAMPORTS_PER_SOL
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    if (response.data && response.data.signature) {
      logger.info(`✅ Successfully requested ${amount} SOL. Transaction: ${response.data.signature}`);
      return { success: true, signature: response.data.signature };
    } else {
      logger.error(`❌ Faucet request failed: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'No signature returned' };
    }
  } catch (error) {
    if (error.response) {
      logger.error(`❌ Faucet request failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`❌ Network error during faucet request: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Alternative method using Solana connection airdrop
 */
async function requestAirdrop(address, amount = 1) {
  try {
    logger.info(`Requesting ${amount} SOL airdrop for address: ${address}`);
    
    const publicKey = new PublicKey(address);
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    logger.info(`✅ Successfully received ${amount} SOL airdrop. Transaction: ${signature}`);
    return { success: true, signature };
  } catch (error) {
    logger.error(`❌ Airdrop request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to request SOL with fallback methods
 */
async function requestSol() {
  if (requestCount >= MAX_REQUESTS_PER_SESSION) {
    logger.info(`Maximum requests (${MAX_REQUESTS_PER_SESSION}) reached for this session. Waiting for next cycle.`);
    return;
  }

  requestCount++;
  logger.info(`\n🚀 Starting request #${requestCount} of ${MAX_REQUESTS_PER_SESSION}`);
  
  // Check current balance
  const currentBalance = await getBalance(TARGET_ADDRESS);
  if (currentBalance !== null) {
    logger.info(`Current balance: ${currentBalance.toFixed(4)} SOL`);
  }

  // Try faucet API first
  let result = await requestDevnetSol(TARGET_ADDRESS, SOL_AMOUNT);
  
  // If faucet fails, try direct airdrop (usually limited to 1-2 SOL)
  if (!result.success) {
    logger.info('Faucet API failed, trying direct airdrop method...');
    result = await requestAirdrop(TARGET_ADDRESS, Math.min(SOL_AMOUNT, 2)); // Airdrop usually limited to 2 SOL
  }

  if (result.success) {
    // Check new balance after a short delay
    setTimeout(async () => {
      const newBalance = await getBalance(TARGET_ADDRESS);
      if (newBalance !== null) {
        logger.info(`New balance: ${newBalance.toFixed(4)} SOL`);
        const gained = currentBalance !== null ? newBalance - currentBalance : 'Unknown';
        logger.info(`SOL gained: ${typeof gained === 'number' ? gained.toFixed(4) : gained}`);
      }
    }, 5000);
  }

  logger.info(`Request #${requestCount} completed. Next request in ${INTERVAL_HOURS} hours.\n`);
}

/**
 * Reset request counter for new session
 */
function resetRequestCounter() {
  requestCount = 0;
  logger.info(`🔄 Request counter reset. Starting new session.`);
}

/**
 * Initialize the program
 */
async function initialize() {
  logger.info('🌟 Auto Devnet SOL Request Program Started');
  logger.info(`Target Address: ${TARGET_ADDRESS}`);
  logger.info(`SOL Amount per request: ${SOL_AMOUNT}`);
  logger.info(`Requests per session: ${MAX_REQUESTS_PER_SESSION}`);
  logger.info(`Interval: Every ${INTERVAL_HOURS} hours`);
  logger.info('=' .repeat(60));

  // Validate address
  if (!validateAddress(TARGET_ADDRESS)) {
    logger.error('Invalid target address. Exiting...');
    process.exit(1);
  }

  // Check initial balance
  const initialBalance = await getBalance(TARGET_ADDRESS);
  if (initialBalance !== null) {
    logger.info(`Initial balance: ${initialBalance.toFixed(4)} SOL`);
  }

  // Make first request immediately
  await requestSol();

  // Schedule requests every 8 hours
  cron.schedule(`0 */${INTERVAL_HOURS} * * *`, async () => {
    await requestSol();
  });

  // Reset counter every 24 hours (3 cycles of 8 hours)
  cron.schedule('0 0 * * *', () => {
    resetRequestCounter();
  });

  logger.info(`⏰ Scheduler started. Next request in ${INTERVAL_HOURS} hours.`);
  logger.info('Press Ctrl+C to stop the program.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n👋 Program interrupted. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n👋 Program terminated. Shutting down gracefully...');
  process.exit(0);
});

// Start the program
initialize().catch((error) => {
  logger.error(`Fatal error during initialization: ${error.message}`);
  process.exit(1);
});