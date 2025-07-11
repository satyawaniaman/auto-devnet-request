import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import express from 'express';
import axios from 'axios';
import winston from 'winston';

// Configuration
const TARGET_ADDRESS = '2gAwqZmY7nRi9XCNQs3CjfSzDiVe5npwK3yS7ijo3E8h';
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
const FAUCET_URL = 'https://faucet.solana.com/api/airdrop';
const SOL_AMOUNT = 5; // 5 SOL per request
const PORT = process.env.PORT || 10000;

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

// Initialize Express app
const app = express();
app.use(express.json());

// Track statistics
let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastRequestTime: null,
  lastSuccessTime: null,
  uptime: Date.now()
};

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
  stats.totalRequests++;
  stats.lastRequestTime = new Date().toISOString();
  
  logger.info(`🚀 Starting SOL request #${stats.totalRequests}`);
  
  try {
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
      stats.successfulRequests++;
      stats.lastSuccessTime = new Date().toISOString();
      
      // Check new balance after a short delay
      setTimeout(async () => {
        const newBalance = await getBalance(TARGET_ADDRESS);
        if (newBalance !== null) {
          logger.info(`New balance: ${newBalance.toFixed(4)} SOL`);
          const gained = currentBalance !== null ? newBalance - currentBalance : 'Unknown';
          logger.info(`SOL gained: ${typeof gained === 'number' ? gained.toFixed(4) : gained}`);
        }
      }, 5000);
      
      return {
        success: true,
        message: 'SOL request completed successfully',
        signature: result.signature,
        currentBalance,
        requestedAmount: result.signature ? SOL_AMOUNT : Math.min(SOL_AMOUNT, 2)
      };
    } else {
      stats.failedRequests++;
      return {
        success: false,
        message: 'SOL request failed',
        error: result.error,
        currentBalance
      };
    }
  } catch (error) {
    stats.failedRequests++;
    logger.error(`Request failed with error: ${error.message}`);
    return {
      success: false,
      message: 'SOL request failed with error',
      error: error.message
    };
  }
}

// API Routes

/**
 * GET / - Status and statistics
 */
app.get('/', async (req, res) => {
  try {
    const currentBalance = await getBalance(TARGET_ADDRESS);
    res.json({
      status: 'running',
      program: 'Auto Devnet SOL Request Service',
      address: TARGET_ADDRESS,
      solAmount: SOL_AMOUNT,
      currentBalance: currentBalance ? currentBalance.toFixed(4) : 'Unknown',
      statistics: {
        ...stats,
        uptime: Math.floor((Date.now() - stats.uptime) / 1000),
        successRate: stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%' : '0%'
      },
      endpoints: {
        'POST /request': 'Trigger SOL request',
        'GET /health': 'Health check',
        'GET /balance': 'Get current balance',
        'GET /stats': 'Get detailed statistics'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
});

/**
 * POST /request - Trigger SOL request
 */
app.post('/request', async (req, res) => {
  try {
    logger.info('📡 SOL request triggered via API');
    const result = await requestSol();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          signature: result.signature,
          requestedAmount: result.requestedAmount,
          currentBalance: result.currentBalance ? result.currentBalance.toFixed(4) : 'Unknown',
          timestamp: new Date().toISOString()
        },
        statistics: stats
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
        data: {
          currentBalance: result.currentBalance ? result.currentBalance.toFixed(4) : 'Unknown',
          timestamp: new Date().toISOString()
        },
        statistics: stats
      });
    }
  } catch (error) {
    logger.error(`API request failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - stats.uptime) / 1000)
  });
});

/**
 * GET /balance - Get current SOL balance
 */
app.get('/balance', async (req, res) => {
  try {
    const balance = await getBalance(TARGET_ADDRESS);
    res.json({
      address: TARGET_ADDRESS,
      balance: balance ? balance.toFixed(4) : 'Unknown',
      balanceSOL: balance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

/**
 * GET /stats - Get detailed statistics
 */
app.get('/stats', (req, res) => {
  res.json({
    statistics: {
      ...stats,
      uptime: Math.floor((Date.now() - stats.uptime) / 1000),
      successRate: stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%' : '0%'
    },
    configuration: {
      targetAddress: TARGET_ADDRESS,
      solAmount: SOL_AMOUNT,
      devnetRpcUrl: DEVNET_RPC_URL
    }
  });
});

/**
 * Initialize the server
 */
async function initialize() {
  logger.info('🌟 Auto Devnet SOL Request Service Started');
  logger.info(`Target Address: ${TARGET_ADDRESS}`);
  logger.info(`SOL Amount per request: ${SOL_AMOUNT}`);
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

  // Start HTTP server
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🌐 HTTP server running on port ${PORT}`);
    logger.info(`📡 Trigger SOL requests via: POST /request`);
    logger.info(`📊 View status at: GET /`);
    logger.info(`🔍 Health check at: GET /health`);
    logger.info('Ready to receive cron job requests!');
  });
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