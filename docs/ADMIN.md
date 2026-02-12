# Admin Dashboard

> **Status:** Skeleton only (Phase 12)

## Planned Features

### Dashboard Home
- Active tables count
- Players online
- Hands played today/week
- Revenue (rake collected)
- System health

### User Management
- List/search users
- View profile (balance, stats, history)
- Adjust balance
- Suspend/ban
- Change role

### Table Management
- Create/edit/close tables
- Set blinds, buy-in range
- Assign bots
- Live table peek
- Force end hand

### Bot Configuration
- Add/edit bot profiles
- Configure model, personality
- Enable/disable
- Performance stats (win rate)
- API key management

### Economy Dashboard
- Total chips in circulation
- House balance (rake)
- Top balances leaderboard
- Bulk balance adjustments

### Audit Log
- Filter by action, actor, date
- Full details view
- Export to CSV

## Current State

Basic admin page at `/admin` with:
- Settings controls (AI timeout, think time)
- Driver status
- System health display

Full admin CRUD in Phase 12.
