# Event Scanner Service

A robust blockchain event scanning service that monitors and processes `FeesCollected` events across multiple EVM blockchain networks with real-time processing, gap detection, and recovery capabilities.

## 🚀 Features

- **Real-time Event Scanning**: Continuous monitoring of blockchain events with WebSocket connections
- **Multi-chain Support**: Simultaneous scanning across multiple blockchain networks
- **Gap Detection & Recovery**: Automatic detection and processing of missed blocks during downtime
- **Redis State Management**: Persistent state tracking and recovery
- **Manual Block Range Scanning**: On-demand scanning of specific block ranges
- **Rate Limiting Protection**: Built-in protection against RPC rate limits
- **Graceful Shutdown**: Clean resource cleanup on service termination
- **Comprehensive API**: RESTful endpoints for scanner management
- **Error Handling**: Robust error handling with automatic retries

## 📋 Prerequisites

- **Node.js** >= 20.x
- **Redis** >= 6.0
- **TypeScript** >= 5.x
- **Docker**

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fee-collection-monitor
   ```

2. **Install dependencies**
   ```bash
   yarn
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables in `.env`:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/event-scanner
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Start MongoDB and Redis
   docker-compose up -d
   ```

## 🏃‍♂️ Running the Service

### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up -d
```

```bash
yarn build
yarn start
```

## ✅ Health Check

### Basic Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

### Swagger UI
Access the complete API documentation at:
```
http://localhost:3000/docs
```

### Postman
Import Postman collection stored in fee-collection-monitor named: 
```
LiFi.postman_collection.json
```

### API Endpoints Overview

#### Scanner Management
- `POST /api/scanner/start` - Start event scanner for a blockchain
- `POST /api/scanner/stop` - Stop event scanner for a blockchain  
- `GET /api/scanner/status` - Get status of all running scanners
- `POST /api/scanner/scan-range` - Manually scan a specific block range

#### Events
- `GET /api/events/{integrator}` - Get events for a specific integrator
- `GET /api/events/debug/integrators` - Get all unique integrators

#### Blockchain Management
- `GET /api/blockchains/all` - Get all blockchain configurations
- `POST /api/blockchains` - Add new blockchain configuration
- `PATCH /api/blockchains/{id}/toggle` - Enable/disable blockchain
- `DELETE /api/blockchains/{id}` - Remove blockchain configuration

## 🧪 Testing

### Run All Tests
```bash
yarn test
```

### Run Specific Test Suites
```bash
# Unit tests
yarn test:unit

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

# Next steps

### Dockerise app
### E2E for scanner must be improved 
### Add better throtlling and limiters
### Small stuff like adding infura rpc, swagger for custom errors