# Telegram Speech-to-Text Bot

Telegram bot for transcribing voice messages, video notes, and audio files using the Google Gemini API.

## Requirements

- Bun v1.1+ (or Docker)
- Telegram Bot Token (from @BotFather)
- Google Gemini API Key

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Create configuration file:
   ```bash
   cp config.example.json config.json
   ```

3. Configure `config.json` with your credentials, then start the bot:
   ```bash
   bun run dev   # Development (auto-reload)
   bun run start # Production
   ```

## Configuration

Settings can be specified in `config.json` or via environment variables:

```json
{
  "bot_token": "YOUR_TELEGRAM_BOT_TOKEN",
  "gemini_api_key": "YOUR_GEMINI_API_KEY",
  "model": "gemini-3.5-transcribe",
  "flash_model": "gemini-3.5-flash",
  "admin_user_ids": [123456789],
  "allowed_chat_ids": [],
  "enable_diarization": false,
  "default_language_codes": [],
  "chat_languages": {}
}
```

| Field | Environment Variable | Default | Description |
|---|---|---|---|
| `bot_token` | `TELEGRAM_BOT_TOKEN` | `""` | Telegram Bot API token. |
| `gemini_api_key` | `GEMINI_API_KEY` | `""` | Google Gemini API key. |
| `model` | `GEMINI_MODEL` | `gemini-3.5-transcribe` | Gemini speech-to-text model. |
| `flash_model` | `GEMINI_FLASH_MODEL` | `gemini-3.5-flash` | Gemini model used for summarization and action items. |
| `admin_user_ids` | `ADMIN_USER_IDS` | `[]` | User IDs with access to admin commands. Comma-separated in env. |
| `allowed_chat_ids` | - | `[]` | Allowed chat IDs. Updated automatically by `/allow` and `/disallow`. |
| `enable_diarization` | `ENABLE_DIARIZATION` | `false` | When true, labels multiple speakers (P1, P2). When false, applies smart transcription. |
| `default_language_codes` | `DEFAULT_LANGUAGE_CODES` | `[]` | Fallback BCP-47 language codes (e.g. `tr-TR,en-US`). Defaults to auto-detection. |
| `chat_languages` | - | `{}` | Per-chat language mappings managed via `/setlang`. |

## Features & Supported Media

- **Media Formats**: Voice messages (`.ogg`), video notes (`.mp4`), audio files (`.mp3`, `.m4a`, `.wav`, `.aac`, etc.), and audio documents (`.flac`, `.opus`, etc.).
- **Inline Audio Acceleration**: Files under 20 MB are sent directly via inline Base64, skipping Gemini Files API upload/deletion round-trips for faster response times.
- **Interactive Action Buttons**: Transcripts include inline buttons for on-demand post-processing:
  - `Summarize`: Generates a concise bullet-point summary using Gemini Flash.
  - `Action Items`: Extracts tasks, deadlines, and follow-ups into a checklist using Gemini Flash.
- **Smart Formatting & Diarization**: Multi-speaker attribution when diarization is enabled, or automatic filler-word cleanup and smart punctuation in standard mode.
- **Long Transcripts**: Transcripts up to 4,096 characters are sent as text messages; longer transcripts are attached as `transcript.txt`.

## Commands

### Access Control

The bot drops messages from unauthorized chats to avoid leaking bot presence.

- `/allow [chat_id]`: Add current or specified chat to the allowed list (Admin only).
- `/disallow [chat_id]`: Remove current or specified chat from the allowed list (Admin only).
- `/chats`: List all currently allowed chat IDs (Admin only).

### Language Configuration

- `/setlang`: View current language configuration and examples.
- `/setlang <lang1> [lang2...]`: Set language hints with code-switching support (e.g., `/setlang tr en`, `/setlang en`).
- `/setlang auto` (or `reset`): Reset to automatic language detection.
- `/setlang <chat_id> <lang1> [lang2...]`: Set language hints for a specific chat (Admin only).

## Docker Deployment

Start the service using Docker Compose:

```bash
cp config.example.json config.json
# Edit config.json
docker compose up -d --build
```

View logs:
```bash
docker compose logs -f
```

Stop the service:
```bash
docker compose down
```

## Development

- `bun run typecheck`: Run TypeScript compiler check.
- `bun run check`: Run Biome linter and formatter checks.
- `bun run format`: Format codebase with Biome.
- `bun run test`: Run test suite.
