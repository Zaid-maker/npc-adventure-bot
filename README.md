# NPC Bot

A Discord bot for RPG-style quests and adventures, built with Discord.js and TypeScript.

## Features

- 🎯 **Daily Quests**: Complete various challenges to earn coins and rewards
- 🏆 **Leaderboards**: Compete with other adventurers for the top spots
- 🔥 **Streaks**: Maintain daily activity streaks for bonus rewards
- 💰 **Economy System**: Earn and spend coins on various activities
- 🏪 **Shop System**: Purchase power-ups, boosts, and cosmetic items
- 🎒 **Inventory**: Collect and manage your items
- 🔄 **Advanced Sharding**: Scale to thousands of servers with automatic sharding

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   bun install
   ```

3. Copy `.env` and configure your environment variables:

   ```bash
   cp .env .env.local
   ```

4. Build the project:

   ```bash
   bun run build
   ```

5. Run database migrations:

   ```bash
   bun run migrate:up
   ```

## Configuration

### Environment Variables

| Variable           | Description                               | Required | Default    |
| ------------------ | ----------------------------------------- | -------- | ---------- |
| `DISCORD_TOKEN`    | Your Discord bot token                    | Yes      | -          |
| `CLIENT_ID`        | Your Discord application ID               | Yes      | -          |
| `TOTAL_SHARDS`     | Number of shards (auto for automatic)     | No       | auto       |
| `QUEST_CHANNEL_ID` | Default channel for quest announcements   | No       | -          |
| `NODE_ENV`         | Environment mode (development/production) | No       | production |

### Sharding

This bot supports advanced sharding for handling large numbers of guilds. There are several ways to run the bot:

#### Single Process (Development)

```bash
bun run dev
```

#### Sharded (Production)

```bash
# Using the sharding manager
bun run start:sharded
```

#### Manual Sharding Control

```bash
# Start sharded bot
bun run start:sharded

# Monitor shards
/shards
```

### Shard Management

When running in sharded mode, the bot automatically distributes guilds across multiple processes. Each shard handles a subset of guilds, allowing the bot to scale to thousands of servers.

- **Automatic Shard Count**: Set `TOTAL_SHARDS=auto` for Discord to determine optimal shard count
- **Manual Shard Count**: Set `TOTAL_SHARDS=4` for a specific number of shards
- **Shard Monitoring**: Use `/shards` command to view real-time shard status
- **Cross-Shard Communication**: Statistics and announcements work across all shards

## Commands

### User Commands

- `/talk` - Chat with the NPC
- `/ask` - Ask questions to the NPC
- `/quest` - Check today's quest progress
- `/complete` - Claim quest rewards
- `/daily` - Claim your daily coin reward (24-hour cooldown)
- `/balance` - Check your coin balance
- `/shop` - Browse the adventurer's shop
- `/buy <item> [quantity]` - Purchase items from the shop
- `/inventory` (or `/inv`) - View your purchased items
- `/stats` - View your adventurer profile
- `/leaderboard` - See top adventurers
- `/streakboard` - View streak leaderboards

### Administrative Commands

- `/setquestchannel` - Set the quest announcement channel
- `/shards` - Monitor shard status (sharding only)

### Legacy Prefix Commands

All slash commands also work with the `!` prefix (e.g., `!stats`, `!quest`)

## Development

### Building

```bash
bun run build
```

### Development Mode

```bash
bun run dev          # Single process with watch mode
bun run dev:sharded  # Sharded with watch mode
```

### Code Quality

```bash
bun run format       # Format code with Prettier
bun run type-check   # Run TypeScript type checking
```

## Architecture

### Directory Structure

```
├── commands/         # Discord commands
├── config/          # Configuration files
├── constants/       # Application constants
├── handlers/        # Command and event handlers
├── migrations/      # Database migration files
├── models/          # Sequelize database models
├── services/        # Business logic services
├── utils/           # Utility functions
└── shardManager.ts  # Sharding manager entry point
```

### Database Migrations

This bot uses **Umzug** for proper database schema management. Migrations are:

- ✅ **Version controlled** - All schema changes are tracked in git
- ✅ **Explicit** - Each change is clearly defined in migration files
- ✅ **Reversible** - Can rollback migrations if needed
- ✅ **Production-safe** - No data loss or unexpected changes
- ✅ **Automatic** - Runs on bot startup (only on shard 0)

#### Migration Commands

```bash
bun run migrate:up       # Run all pending migrations
bun run migrate:down     # Rollback the last migration
bun run migrate:status   # Show migration status
bun run migrate:create   # Show template for new migration
```

Migrations run automatically when the bot starts, but you can also run them manually for testing.

### Sharding Architecture

- **Shard Manager**: `shardManager.ts` - Main process that spawns and manages shards
- **Shard Processes**: Individual bot instances handling subsets of guilds
- **Cross-Shard Communication**: Uses Discord.js built-in shard messaging
- **Database**: SQLite with proper sharding-aware operations
- **Monitoring**: Real-time shard status and health monitoring

### Key Components

- **Quest Service**: Manages daily quests, progress tracking, and rewards
- **Scheduler**: Handles automated quest resets and announcements
- **Command Router**: Processes both slash commands and legacy prefix commands
- **Embed Builder**: Consistent Discord embed formatting
- **Logger**: Structured logging with shard-aware context

## Database

The bot uses SQLite with Sequelize ORM. The database includes:

- **Players**: User profiles, coins, streaks
- **Quests**: Daily quest definitions
- **QuestProgress**: Individual quest completion tracking
- **GuildSettings**: Server-specific configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## License

ISC License
