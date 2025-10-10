# Bot Owner Auto-Funding System

## Overview
The bot now automatically grants the bot owner 100,000 coins every 30 minutes for testing and administration purposes.

## Setup

1. **Set the BOT_OWNER environment variable** in your `.env` file:
   ```env
   BOT_OWNER=your_discord_user_id_here
   ```

2. **Get your Discord User ID:**
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click your username and select "Copy ID"
   - Paste the ID into the `.env` file

## How It Works

### Automatic Funding
- **Amount:** 100,000 coins per funding cycle
- **Frequency:** Every 30 minutes
- **Initial Funding:** Happens immediately when the bot starts
- **Shard:** Only runs on Shard 0 (to prevent duplicate funding in sharded mode)

### Logging
The system logs all funding operations:
```
🏦 Bot owner auto-funding scheduled: 100000 coins every 30 minutes
💰 Bot owner funded: 50000 → 150000 coins (+100000)
```

### Database Integration
- Creates a Player record if the bot owner doesn't have one
- Updates the `coins` field in the `Players` table
- Uses the same Player model as all other coin operations

## Code Structure

### Files Modified
1. **`services/scheduler.ts`**
   - Added `scheduleOwnerFunding()` function
   - Added `cancelOwnerFunding()` function
   - Added `fundBotOwner()` helper function
   - Constants: `OWNER_FUNDING_AMOUNT` (100k), `OWNER_FUNDING_INTERVAL` (30 min)

2. **`index.ts`**
   - Imported `scheduleOwnerFunding` from scheduler
   - Called `scheduleOwnerFunding()` on bot startup (shard 0 only)

3. **`.env.example`**
   - Updated to include `BOT_OWNER` with description

4. **`README.md`**
   - Added `BOT_OWNER` to environment variables table
   - Added note about auto-funding feature

## Functions

### `scheduleOwnerFunding()`
- Checks if `BOT_OWNER` is set in environment
- Funds immediately on startup
- Sets up interval to fund every 30 minutes
- Returns the interval handle (or null if BOT_OWNER not set)

### `cancelOwnerFunding()`
- Stops the auto-funding interval
- Called automatically when bot shuts down

### `fundBotOwner(userId: string)`
- Private helper function
- Creates or finds the Player record
- Adds 100,000 coins to current balance
- Logs the transaction

## Customization

To change the funding amount or frequency, edit the constants in `services/scheduler.ts`:

```typescript
const OWNER_FUNDING_AMOUNT = 100000; // Change amount here
const OWNER_FUNDING_INTERVAL = 30 * 60 * 1000; // Change interval here (in ms)
```

## Testing

1. Set your `BOT_OWNER` in `.env`
2. Start the bot: `bun run dev:sharded`
3. Check the logs for:
   ```
   🏦 Bot owner auto-funding scheduled: 100000 coins every 30 minutes
   💰 Bot owner funded: 0 → 100000 coins (+100000)
   ```
4. Use `/balance` in Discord to verify coins were added
5. Wait 30 minutes for the next funding cycle

## Security Notes

- ⚠️ Keep your `.env` file private (never commit it to git)
- ⚠️ Only set `BOT_OWNER` in development/testing environments
- ⚠️ In production, consider removing or adjusting this feature
- ✅ The `.env.example` file is safe to commit (doesn't contain actual values)

## Disabling Auto-Funding

To disable auto-funding, simply:
1. Remove the `BOT_OWNER` line from `.env`, or
2. Leave it blank: `BOT_OWNER=`

The system will detect this and skip auto-funding:
```
BOT_OWNER not set in .env, skipping auto-funding
```
