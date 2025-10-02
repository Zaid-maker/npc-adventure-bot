# NPC Bot

A Discord bot for RPG-style quests and adventures, built with Discord.js and TypeScript.

## Features

- 🎯 **Daily Quests**: Complete various challenges to earn coins and rewards
- 🏆 **Leaderboards**: Compete with other adventurers for the top spots
- 🔥 **Streaks**: Maintain daily activity streaks for bonus rewards
- 💰 **Economy System**: Earn and spend coins on various activities
- 🔄 **Advanced Sharding**: Scale to thousands of servers with automatic sharding

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env` and configure your environment variables:

   ```bash
   cp .env .env.local
   ```

4. Build the project:

   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes | - |
| `CLIENT_ID` | Your Discord application ID | Yes | - |
| `TOTAL_SHARDS` | Number of shards (auto for automatic) | No | auto |
| `QUEST_CHANNEL_ID` | Default channel for quest announcements | No | - |

### Sharding

This bot supports advanced sharding for handling large numbers of guilds. There are several ways to run the bot:

#### Single Process (Development)

```bash
npm run dev
```

#### Sharded (Production)

```bash
# Using the sharding manager
npm run start:sharded
```

#### Manual Sharding Control

```bash
# Start sharded bot
npm run start:sharded

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
- `/balance` - Check your coin balance
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
npm run build
```

### Development Mode

```bash
npm run dev          # Single process with watch mode
npm run dev:sharded  # Sharded with watch mode
```

### Code Quality

```bash
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

## Architecture

### Directory Structure

```
├── commands/         # Discord commands
├── config/          # Configuration files
├── constants/       # Application constants
├── handlers/        # Command and event handlers
├── models/          # Sequelize database models
├── services/        # Business logic services
├── utils/           # Utility functions
└── shardManager.ts  # Sharding manager entry point
```

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
