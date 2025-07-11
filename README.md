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

### Render Deployment (Recommended)

#### Step 1: Deploy the Service
1. **Connect Repository**: Link your GitHub repository to Render
2. **Service Type**: Choose "Web Service"
3. **Build Command**: `pnpm install`
4. **Start Command**: `pnpm start`
5. **Environment Variables**: 
   - `PORT`: Will be automatically set by Render
   - Add any custom environment variables if needed

#### Step 2: Set Up External Cron Job
Since Render doesn't have built-in cron jobs for the free tier, use one of these options:

**Option A: External Cron Service (Recommended)**
- Use services like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com)
- Set up a cron job to hit: `POST https://your-app.onrender.com/request`
- Schedule: Every 8 hours (`0 */8 * * *`)

**Option B: GitHub Actions (Free)**
Add this workflow file to `.github/workflows/cron.yml`:
```yaml
name: SOL Request Cron
on:
  schedule:
    - cron: '0 */8 * * *'  # Every 8 hours
  workflow_dispatch:  # Manual trigger

jobs:
  request-sol:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SOL Request
        run: |
          curl -X POST ${{ secrets.SERVICE_URL }}/request
```
Then add your service URL as a secret: `SERVICE_URL=https://your-app.onrender.com`

**Option C: Render Cron Jobs (Paid Plans)**
If you have a paid Render plan, you can create a separate Cron Job service:
- **Service Type**: Cron Job
- **Schedule**: `0 */8 * * *`
- **Command**: `curl -X POST https://your-app.onrender.com/request`

### Local Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Start the service
pnpm start

# Development mode
pnpm run dev
```

## 🔧 Troubleshooting

### Render Deployment Issues

**Issue**: Service fails to start
- **Solution**: Check build logs for dependency installation errors
- **Verify**: Ensure `pnpm start` is set as the start command
- **Check**: Verify all dependencies are in `package.json`

**Issue**: External cron job not working
- **Solution**: Verify the service URL is correct and accessible
- **Test**: Try manually calling `POST /request` endpoint
- **Check**: Ensure the service is running and not sleeping (Render free tier)

**Issue**: Service goes to sleep (Free tier)
- **Solution**: Use external cron services to keep it active
- **Alternative**: Upgrade to paid plan for always-on services

### API Issues

**Issue**: POST /request returns errors
- **Solution**: Check service logs for detailed error messages
- **Common cause**: Invalid Solana address or network connectivity
- **Verify**: Test other endpoints like GET /health first

### Rate Limiting

**Issue**: "429 Too Many Requests"
- **Expected behavior**: Solana devnet has rate limits
- **Solution**: The program includes exponential backoff and will retry
- **Note**: This is normal and requests will eventually succeed

### Network Issues

**Issue**: Connection timeouts
- **Solution**: Check internet connectivity and Solana devnet status
- **Alternative**: The program will automatically retry failed requests
- **Monitor**: Use GET /stats to track success rates

## 📊 Monitoring & Status

### Real-time Monitoring
- **API Endpoints**: Use GET / for service status and statistics
- **Console Logs**: Real-time status updates
- **File Logs**: Persistent logging in `devnet-requests.log`
- **Balance Tracking**: Real-time balance via GET /balance
- **Success Rate**: Track successful vs failed requests via GET /stats

### Health Checks
- **Health Endpoint**: `GET /health` for service health
- **Status Endpoint**: `GET /` for comprehensive status
- **Balance Endpoint**: `GET /balance` for current SOL balance
- **Statistics Endpoint**: `GET /stats` for detailed metrics

### Performance Metrics
- **Request Success Rate**: Percentage of successful SOL requests
- **Total Requests**: Count of all API-triggered requests
- **Uptime Tracking**: Service availability since startup
- **Error Rate Analysis**: Types and frequency of errors

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