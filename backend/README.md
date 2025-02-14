# Telegram Bot

A feature-rich Telegram bot built with Node.js, Express, and MongoDB.

## Features

- Command handling (/start, /help, /about)
- Interactive inline keyboard buttons
- MongoDB integration for user data storage
- Webhook and polling support
- Comprehensive error handling and logging
- Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- A Telegram Bot Token (from @BotFather)
- (Optional) A domain with SSL for webhook support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
- Add your Telegram Bot Token
- Configure MongoDB URI
- Set webhook URL (if using webhook method)
- Customize bot messages

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Project Structure

```
src/
├── config/
│   ├── config.js     # Configuration management
│   ├── database.js   # MongoDB connection
│   └── logger.js     # Winston logger setup
├── handlers/
│   ├── commandHandlers.js  # Bot command handlers
│   └── callbackHandlers.js # Inline button handlers
├── middleware/
│   └── rateLimiter.js     # Rate limiting middleware
├── models/
│   └── user.model.js      # MongoDB user schema
└── index.js              # Main application file
```

## Monitoring and Logging

Logs are stored in the `logs` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 