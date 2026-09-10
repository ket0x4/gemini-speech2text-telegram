# Telegram Speech-to-Text Bot

Telegram bot that transcribes voice messages and video notes using the Google Gemini API.

## Requirements

- Bun v1.1 or higher (or Docker)
- Telegram Bot Token (from @BotFather)
- Google Gemini API Key

## Installation

1. Clone or navigate to the repository directory:

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create your `config.json` from the template:
   ```bash
   cp config.example.json config.json
   ```

## Configuration

Configure the bot using `config.json` or corresponding environment variables.

### config.json

```json
{
  "bot_token": "YOUR_TELEGRAM_BOT_TOKEN",
  "gemini_api_key": "YOUR_GEMINI_API_KEY",
  "model": "gemini-3.5-transcribe",
  "admin_user_ids": [123456789],
  "allowed_chat_ids": []
}
```

### Configuration Fields

- `bot_token`: Telegram Bot API token. Can also be set via `TELEGRAM_BOT_TOKEN`.
- `gemini_api_key`: Google Gemini API key. Can also be set via `GEMINI_API_KEY`.
- `model`: Gemini model identifier for audio transcription (default: `gemini-3.5-transcribe`). Can also be set via `GEMINI_MODEL`.
- `admin_user_ids`: Array of Telegram user IDs permitted to execute administrative commands (`/allow`, `/disallow`, `/chats`). Can also be set as comma-separated integers via `ADMIN_USER_IDS`.
- `allowed_chat_ids`: Array of Telegram chat IDs permitted to use the bot. Updated automatically when admins run `/allow` or `/disallow`.

## Access Control

The bot enforces a whitelist policy:
- Only chats whose IDs are listed in `allowed_chat_ids` can interact with the bot.
- Messages from non-whitelisted chats are silently dropped to avoid leaking bot presence.
- Users listed in `admin_user_ids` can use administrative commands in any chat or direct message with the bot.

### Admin Commands

- `/allow`: Adds the current chat to the whitelist and persists the change to `config.json`.
- `/allow <chat_id>`: Adds a specific chat ID to the whitelist.
- `/disallow`: Removes the current chat from the whitelist.
- `/disallow <chat_id>`: Removes a specific chat ID from the whitelist.
- `/chats`: Displays the list of all currently whitelisted chat IDs.

## Supported Media

- **Voice messages**: Audio notes recorded using Telegram's microphone button.
- **Video notes**: Round video clips recorded in Telegram.

Transcripts shorter than 4,096 characters are sent as direct text replies. Transcripts exceeding 4,096 characters are delivered as an attached `transcript.txt` file reply.

## Running Locally

### Development Mode (auto-reload)

```bash
bun run dev
```

### Production Mode

```bash
bun run start
```

## Running with Docker

The setup uses a secure multi-stage Docker build (`oven/bun:latest`), dropping build tools in the final image and running under an unprivileged `bun` user.

### Docker Compose (Recommended)

1. Ensure `config.json` is configured:
   ```bash
   cp config.example.json config.json
   ```

2. Start the container in detached mode:
   ```bash
   docker compose up -d --build
   ```

3. View logs:
   ```bash
   docker compose logs -f
   ```

4. Stop the container:
   ```bash
   docker compose down
   ```

### Standalone Docker

1. Build the image:
   ```bash
   docker build -t telegram-s2t-bot .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name telegram-s2t-bot \
     --restart unless-stopped \
     -v $(pwd)/config.json:/app/config.json \
     telegram-s2t-bot
   ```

## Scripts

- `bun run check`: Lint and format code using Biome.
- `bun run format`: Format code using Biome.
- `bun run lint`: Run Biome linter.
- `bun run typecheck`: Run TypeScript compiler checks without emitting files.
- `bun run test`: Run the test suite.
