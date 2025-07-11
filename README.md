# Auto Devnet SOL Request Program

An automated program that requests devnet SOL from Solana's faucet at scheduled intervals.

## Features

- 🕐 **Automated Scheduling**: Requests SOL every 8 hours
- 🔢 **Session Limits**: Maximum 2 requests per session
- 💰 **Configurable Amount**: Requests 5 SOL per transaction
- 📊 **Balance Tracking**: Shows balance before and after requests
- 📝 **Comprehensive Logging**: Console and file logging
- 🔄 **Fallback Methods**: Uses both faucet API and direct airdrop
- ⚡ **Real-time Monitoring**: Live status updates

## Target Configuration

- **Address**: `2gAwqZmY7nRi9XCNQs3CjfSzDiVe5npwK3yS7ijo3E8h`
- **Amount**: 5 SOL per request
- **Frequency**: Every 8 hours
- **Max Requests**: 2 per session

## Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run the program**:
   ```bash
   pnpm start
   ```

   Or for development with auto-restart:
   ```bash
   pnpm run dev
   ```

## How It Works

1. **Immediate Request**: Makes the first SOL request when started
2. **Scheduled Requests**: Continues requesting every 8 hours
3. **Session Management**: Tracks requests and resets counter daily
4. **Dual Methods**: 
   - Primary: Solana faucet API
   - Fallback: Direct airdrop (limited to 2 SOL)
5. **Balance Monitoring**: Shows SOL balance before and after each request

## Program Flow

```
Start Program
    ↓
Validate Address
    ↓
Check Initial Balance
    ↓
Make First Request
    ↓
Schedule Future Requests (every 8 hours)
    ↓
Reset Counter Daily
```

## Logging

- **Console Output**: Real-time status and progress
- **Log File**: `devnet-requests.log` for persistent records
- **Balance Tracking**: Before/after SOL amounts
- **Transaction IDs**: All successful request signatures

## Request Methods

### Primary: Faucet API
- Endpoint: `https://faucet.solana.com/api/airdrop`
- Amount: Up to 5 SOL per request
- More reliable for larger amounts

### Fallback: Direct Airdrop
- Uses Solana Web3.js connection
- Limited to 1-2 SOL per request
- Used when faucet API fails

## Error Handling

- **Network Issues**: Automatic retry with fallback method
- **Rate Limits**: Respects faucet limitations
- **Invalid Address**: Validates before starting
- **Connection Errors**: Comprehensive error logging

## Stopping the Program

Press `Ctrl+C` to gracefully shutdown the program.

## Configuration

To modify settings, edit the constants in `index.js`:

```javascript
const TARGET_ADDRESS = '2gAwqZmY7nRi9XCNQs3CjfSzDiVe5npwK3yS7ijo3E8h';
const SOL_AMOUNT = 5; // SOL per request
const MAX_REQUESTS_PER_SESSION = 2;
const INTERVAL_HOURS = 8;
```

## Dependencies

- `@solana/web3.js`: Solana blockchain interaction
- `node-cron`: Task scheduling
- `axios`: HTTP requests to faucet API
- `winston`: Logging framework

## Notes

- Devnet SOL has no real value
- Faucets may have rate limits or temporary outages
- Program runs continuously until manually stopped
- Logs are saved to `devnet-requests.log` file