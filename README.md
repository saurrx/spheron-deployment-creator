# Spheron Deployment Creator

A Node.js application for managing blockchain deployments using the Spheron Protocol SDK. This application provides a robust backend for creating and managing deployments with advanced configuration and real-time monitoring capabilities.

## Features

- Express.js backend with comprehensive error handling
- Spheron Protocol SDK integration for blockchain deployments
- Real-time deployment status monitoring
- Advanced deployment configuration management
- Secure environment variable handling

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- A Spheron account with API access

## Setup

1. Clone the repository:
```bash
git clone <your-repository-url>
cd spheron-deployment-creator
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Spheron Private Key and other configuration

```bash
cp .env.example .env
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| SPHERON_PRIVATE_KEY | Your Spheron private key (required) | - |
| SPHERON_NETWORK | Network to use (testnet/mainnet) | testnet |
| PROVIDER_PROXY_URL | Provider proxy URL | https://provider-proxy.spheron.network |

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
  "iclConfig": {
    // Deployment configuration object
  }
}
```

#### Response
```json
{
  "deployment": {
    "name": "string",
    // Additional deployment details
  },
  "transaction": {
    // Transaction details
  },
  "details": {
    // Comprehensive deployment information
  },
  "lease": {
    // Lease details if available
  }
}
```

## Error Handling

The application includes comprehensive error handling:

- Environment validation on startup
- API request validation using schema
- Detailed error responses with appropriate status codes
- Safe conversion of BigInt values in responses

## Security Considerations

- Environment variables are validated at startup
- Sensitive information is excluded from responses
- API responses are sanitized before sending
- Error messages are standardized and safe

## Development

To start the development server:

```bash
npm run dev
```

The server will start on port 5000 by default.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
