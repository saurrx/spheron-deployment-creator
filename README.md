# Spheron Deployment Creator

A Node.js application for managing blockchain deployments using the Spheron Protocol SDK. This application provides a robust backend for creating and managing deployments with advanced configuration and real-time monitoring capabilities.

## Features

- Express.js backend with comprehensive error handling
- Spheron Protocol SDK integration for blockchain deployments
- Real-time deployment status monitoring
- Advanced deployment configuration management
- Secure environment variable handling
- Support for CST token balance management
- Interactive deployment configuration using ICL YAML

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- A Spheron account with API access
- CST tokens in your wallet for deployments

## Installation

1. Clone the repository:
```bash
git clone https://github.com/saurrx/spheron-deployment-creator.git
cd spheron-deployment-creator
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your configuration:

```bash
cp .env.example .env
```

## Environment Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| SPHERON_PRIVATE_KEY | Your Spheron private key | - | Yes |
| SPHERON_NETWORK | Network to use (testnet/mainnet) | testnet | No |
| PROVIDER_PROXY_URL | Provider proxy URL | https://provider-proxy.spheron.network | No |
| WALLET_ADDRESS | Your wallet address | - | Yes |
| WALLET_PRIVATE_KEY | Your wallet private key | - | Yes |

## Running the Application

1. Development mode:
```bash
npm run dev
```
The server will start on port 5000.

2. Access the application:
- Open your browser and navigate to `http://localhost:5000`
- You should see the deployment creator interface

## Usage Guide

### 1. Balance Check
- The application automatically checks your CST balance
- Available balance and locked tokens are displayed
- Minimum required balance: 5.0 CST for standard deployments

### 2. Creating a Deployment

You can create deployments using ICL (Infrastructure Configuration Language) YAML. Here's an example configuration:

```yaml
version: "1.0"

services:
  web-app:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true
profiles:
  name: basic-web
  duration: 1h
  mode: provider
  tier:
    - community
  compute:
    web-app:
      resources:
        cpu:
          units: 1
        memory:
          size: 512Mi
        storage:
          - size: 1Gi
  placement:
    westcoast:
      attributes:
        region: us-west
      pricing:
        web-app:
          token: CST
          amount: 1
deployment:
  web-app:
    westcoast:
      profile: basic-web
      count: 1
```

### 3. Monitoring Deployments

After creating a deployment, you can monitor:
- Deployment status
- Container states
- Service availability
- Forwarded ports
- Resource usage
- Deployment logs

## API Endpoints

### Get CST Balance

```http
GET /api/balance
```

Returns the current CST balance from your Spheron escrow account.

#### Response
```json
{
  "lockedBalance": "string",
  "unlockedBalance": "string"
}
```

### Create Deployment

```http
POST /api/deployments
```

Creates a new deployment using the provided configuration.

#### Request Body
```json
{
  "name": "string",
  "iclConfig": "string" // YAML configuration
}
```

#### Response
```json
{
  "deployment": {
    "name": "string",
    "status": "string"
  },
  "transaction": {
    "leaseId": "string",
    "status": "number",
    "hash": "string"
  },
  "details": {
    "services": {},
    "forwarded_ports": {},
    "status": "string"
  }
}
```

## Error Handling

The application includes comprehensive error handling:
- Environment validation on startup
- API request validation using schema
- Detailed error responses with appropriate status codes
- Safe conversion of BigInt values in responses
- Balance verification before deployment creation

## Security

- Environment variables are validated at startup
- Sensitive information is excluded from responses
- API responses are sanitized before sending
- Error messages are standardized and safe
- Wallet private keys must be properly secured

## Development Guidelines

1. **Code Style**
   - Follow modern JavaScript/TypeScript practices
   - Use async/await for asynchronous operations
   - Maintain proper error handling
   - Keep code modular and documented

2. **Testing**
   - Run balance checks before deployment
   - Verify deployment configurations
   - Test with minimal CST amounts first
   - Monitor deployment status after creation

3. **Deployment**
   - Ensure sufficient CST balance
   - Verify wallet configuration
   - Check network settings (testnet/mainnet)
   - Monitor transaction status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

Common issues and solutions:

1. **Insufficient Balance**
   - Ensure wallet has sufficient CST tokens
   - Check token decimal conversion
   - Verify wallet address configuration

2. **Deployment Failures**
   - Validate ICL YAML syntax
   - Check resource specifications
   - Verify provider availability
   - Monitor deployment logs

3. **Connection Issues**
   - Verify network configuration
   - Check provider proxy URL
   - Ensure proper authentication
   - Validate API endpoints

## License

This project is licensed under the MIT License - see the LICENSE file for details.