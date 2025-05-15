# WhatsApp ERP System

A WhatsApp-focused ERP system that allows users to make payments, upload inventory, and manage their business through WhatsApp messaging.

## Features

- **WhatsApp Integration**: Communicate with users through WhatsApp using Wasender API
- **Payment Processing**: Accept payments using OPay Checkout
- **Inventory Management**: Upload and manage inventory items
- **Subscription Model**: Users gain access to features after payment
- **Robust Error Handling**: Comprehensive error handling and logging
- **Real-time Communication**: Process user requests in real-time

## Tech Stack

- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB with Mongoose ORM
- **Messaging**: Wasender API (with Twilio as an alternative)
- **Payments**: OPay Checkout API
- **Logging**: Winston logger

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Wasender API account with API key
- OPay Merchant account with API credentials

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd whatsapp-first-erp
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Database
MONGODB_URI=mongodb://localhost:27017/whatsapp-erp

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=1d

# Wasender API Configuration
WASENDER_API_KEY=your_wasender_api_key
WASENDER_API_URL=https://api.wasenderapi.com
WASENDER_WEBHOOK_SECRET=your_webhook_secret

# OPay Checkout Configuration
OPAY_PUBLIC_KEY=your_opay_public_key
OPAY_MERCHANT_ID=your_opay_merchant_id
OPAY_MERCHANT_NAME=your_merchant_name
OPAY_ENVIRONMENT=sandbox # or production

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
```

4. Build the application:
```
npm run build
```

5. Start the server:
```
npm start
```

For development with hot-reload:
```
npm run dev
```

## API Endpoints

### WhatsApp Endpoints
- `POST /api/whatsapp/webhook` - Receive WhatsApp webhook events
- `POST /api/whatsapp/send` - Send WhatsApp messages

### Payment Endpoints
- `POST /api/payments/initialize` - Initialize a payment
- `GET /api/payments/verify/:reference` - Verify payment status
- `POST /api/payments/webhook` - Process payment webhooks

### Inventory Endpoints
- `POST /api/inventory` - Add inventory item
- `POST /api/inventory/upload` - Process inventory upload
- `GET /api/inventory` - Get user inventory
- `GET /api/inventory/:id` - Get inventory item details
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item

### User Endpoints
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Development

The project follows a structured architecture:

- `src/config` - Application configuration
- `src/controllers` - API endpoint controllers
- `src/interfaces` - TypeScript interfaces
- `src/middleware` - Express middleware
- `src/models` - Mongoose data models
- `src/routes` - API routes
- `src/services` - Business logic
- `src/utils` - Utility functions
- `src/utils/errors` - Error handling
- `src/utils/logger` - Logging system

## License

[MIT](LICENSE)

## Author

Your Name

## Acknowledgements

- Wasender API for WhatsApp messaging
- OPay for payment processing 