# Auto Devnet SOL Request Service

A Node.js HTTP service that provides API endpoints to request Devnet SOL for a specified Solana address. Designed to work with external cron jobs or schedulers for automated SOL requests.

## Features

- **HTTP API**: RESTful endpoints for triggering SOL requests
- **External Cron Compatible**: Designed to work with external cron jobs (every 8 hours)
- **Configurable Amount**: Request up to 5 SOL per request
- **Statistics Tracking**: Real-time statistics and success rate monitoring
- **Balance Tracking**: Real-time balance monitoring via API
- **Comprehensive Logging**: Detailed logs with timestamps and status updates
- **Fallback Methods**: Primary faucet API with direct airdrop fallback
- **Error Handling**: Robust error handling with detailed API responses
- **Production Ready**: Includes health checks, monitoring endpoints, and graceful shutdown

## API Endpoints

- **POST /request**: Trigger a SOL request
- **GET /**: Service status and statistics
- **GET /health**: Health check endpoint
- **GET /balance**: Get current SOL balance
- **GET /stats**: Detailed statistics

## Target Configuration

- **Target Address**: `2gAwqZmY7nRi9XCNQs3CjfSzDiVe5npwK3yS7ijo3E8h`
- **SOL Amount**: 5 SOL per request
- **Port**: 10000 (configurable via PORT environment variable)

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

## Usage with External Cron

### Setting up a Cron Job (Every 8 Hours)

```bash
# Edit your crontab
crontab -e

# Add this line to run every 8 hours
0 */8 * * * curl -X POST http://localhost:10000/request

# Or with more detailed logging
0 */8 * * * curl -X POST http://localhost:10000/request >> /var/log/sol-requests.log 2>&1
```

### Using with External Services

**Render Cron Jobs**:
```bash
curl -X POST https://your-app.onrender.com/request
```

**GitHub Actions** (schedule every 8 hours):
```yaml
name: Request SOL
on:
  schedule:
    - cron: '0 */8 * * *'
jobs:
  request:
    runs-on: ubuntu-latest
    steps:
      - name: Request SOL
        run: curl -X POST ${{ secrets.SERVICE_URL }}/request
```

## API Response Examples

### Successful Request
```json
{
  "success": true,
  "message": "SOL request completed successfully",
  "data": {
    "signature": "5J7...",
    "requestedAmount": 5,
    "currentBalance": "25.3901",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "statistics": {
    "totalRequests": 10,
    "successfulRequests": 8,
    "failedRequests": 2
  }
}
```

### Failed Request
```json
{
  "success": false,
  "message": "SOL request failed",
  "error": "Rate limit exceeded",
  "data": {
    "currentBalance": "20.3901",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Logging

- **Console Output**: Real-time status and progress
- **Log File**: `devnet-requests.log` for persistent records
- **Balance Tracking**: Before/after SOL amounts
- **Transaction IDs**: All successful request signatures

## Service Flow

1. **Service Startup**:
   - Validates the target Solana address
   - Checks initial SOL balance
   - Starts HTTP server on specified port
   - Ready to receive API requests

2. **API Request Handling**:
   - Receives POST request to /request endpoint
   - Attempts SOL request using primary faucet API
   - Falls back to direct airdrop if faucet fails
   - Returns detailed response with transaction info

3. **Statistics Tracking**:
   - Tracks total, successful, and failed requests
   - Calculates success rate and uptime
   - Provides real-time statistics via API

4. **Balance Monitoring**:
   - Real-time balance checking via /balance endpoint
   - Balance included in request responses
   - Historical balance tracking

## Request Methods

### Primary Method: Faucet API
- Uses Solana's official faucet API
- Supports up to 5 SOL per request
- More reliable for larger amounts

### Fallback Method: Direct Airdrop
- Uses Solana Web3.js connection.requestAirdrop()
- Limited to 1-2 SOL per request
- Activated when faucet API fails

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

## 🚀 Deployment Options

### Option 1: Render Background Worker (Recommended)

1. **Create a new Background Worker** (not Web Service) on Render
2. **Connect your repository**
3. **Use these settings**:
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm start`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `RENDER=true`

### Option 2: Render Web Service (with HTTP endpoints)

If you accidentally created a Web Service:
1. The program will automatically create HTTP endpoints for monitoring
2. Access `https://your-app.onrender.com/` for status
3. Access `https://your-app.onrender.com/health` for health checks

### Option 3: Docker Deployment

```bash
# Build the image
docker build -t auto-devnet-request .

# Run the container
docker run -d --name devnet-sol-request auto-devnet-request

# View logs
docker logs -f devnet-sol-request
```

### Option 4: Local Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Start the program
pnpm start
```

## 🔧 Troubleshooting Render Deployment

### Issue: "No open ports detected"

**Problem**: Render Web Services expect HTTP traffic on a port.

**Solutions**:
1. **Best**: Delete the Web Service and create a **Background Worker** instead
2. **Alternative**: Keep as Web Service - the program will auto-create HTTP endpoints

### Issue: Deployment stuck at "Deploying..."

**Causes & Solutions**:
- **Port binding timeout**: Use Background Worker service type
- **Long-running process**: This is expected behavior for scheduled tasks
- **Resource limits**: Upgrade from Free tier if needed

### Issue: Faucet requests failing

**Expected behavior**: Devnet faucets have rate limits and may be temporarily unavailable. The program includes:
- Automatic fallback methods
- Retry logic with exponential backoff
- Comprehensive error logging

## 📊 Monitoring & Status

### HTTP Endpoints (when deployed as Web Service)

- **Status**: `GET /` - Program status and statistics
- **Health**: `GET /health` - Health check endpoint

### Log Files

- **Console**: Real-time output in deployment logs
- **File**: `devnet-requests.log` (local development only)

## 🔒 Security Considerations

- No sensitive data is stored or transmitted
- Uses public devnet endpoints only
- No private keys or authentication required
- Rate limiting respects faucet policies

## 📈 Performance Optimization

- **Memory**: ~50MB RAM usage
- **CPU**: Minimal usage (only during requests)
- **Network**: Periodic API calls every 8 hours
- **Storage**: Log files grow over time

## Notes

- Devnet SOL has no real value
- Faucets may have rate limits or temporary outages
- Program runs continuously until manually stopped
- Logs are saved to `devnet-requests.log` file (local only)
- For production use, consider implementing database logging
- Monitor deployment logs for request success/failure patterns