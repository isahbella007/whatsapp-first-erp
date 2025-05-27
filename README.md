# WhatsApp ERP System

A WhatsApp-focused ERP system that enables businesses to manage sales, inventory, and customer interactions through WhatsApp messaging using Twilio integration.

## Features

- **WhatsApp Integration**: Process and respond to messages using Twilio's WhatsApp API
- **Command Processing**: Natural language command processing for business operations
- **Sales Management**: Track and manage sales transactions
- **Inventory Management**: Upload and manage inventory items with real-time updates
- **Customer Management**: Maintain customer records and interaction history
- **Payment Processing**: Handle payments and generate receipts
- **Real-time Communication**: Process user requests in real-time with intelligent response generation
- **Robust Error Handling**: Comprehensive error handling and logging system

## Tech Stack

- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB with Mongoose ORM
- **Caching**: Redis for performance optimization
- **Messaging**: Twilio WhatsApp API
- **Logging**: Winston logger
- **Security**: Helmet, Rate Limiting, CORS

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis
- Twilio Account with WhatsApp API access
- Environment variables configured

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whatsapp-first-erp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Database
MONGODB_URI=mongodb://localhost:27017/whatsapp-erp

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=1d

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
```

4. Build the application:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

For development with hot-reload:
```bash
npm run dev
```

## Project Structure

```
src/
├── config/         # Application configuration
├── interfaces/     # TypeScript interfaces
├── models/         # Mongoose data models
├── services/       # Business logic
│   ├── commands/   # Command handlers
│   └── LLM/        # Language model integration
├── test/          # Test files
├── utils/         # Utility functions
│   ├── errors/    # Error handling
│   └── logger/    # Logging system
├── app.ts         # Express application setup
└── server.ts      # Server initialization
```

## Core Services

- **Command Processing**: Natural language command parsing and routing
- **Message Handling**: WhatsApp message processing and response generation
- **Sales Management**: Sales tracking and transaction processing
- **Inventory Management**: Stock tracking and updates
- **Customer Management**: Customer data and interaction history
- **Payment Processing**: Payment handling and receipt generation
- **User Management**: User authentication and profile management

## API Endpoints

### WhatsApp Endpoints
- `POST /webhook/twilio` - Receive WhatsApp messages via Twilio webhook

### Health Check
- `GET /health` - Server health check endpoint

## Development

The project follows a modular architecture with clear separation of concerns:

- **Services**: Core business logic implementation
- **Models**: Data structure definitions
- **Interfaces**: TypeScript type definitions
- **Utils**: Shared utility functions
- **Config**: Application configuration

## Error Handling

The system implements comprehensive error handling:
- Global error handler
- Custom error classes
- Structured error responses
- Error logging and monitoring

## Security Features

- Rate limiting
- Security headers (Helmet)
- CORS configuration
- Request size limits
- Trust proxy settings

## License

[MIT](LICENSE)
