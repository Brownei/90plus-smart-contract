# 90plus Betting Platform

A peer-to-peer betting platform built on Solana blockchain.

## Deployed Program IDs

### Devnet
- Betting Program: `BRjpCHtyQLf1gWwUPQPqsqZbBsmXtmvUNVEi7t9kfPLe`
- Token Granting Program: `H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq`

### Testnet
- Betting Program: `9Td4ouVX6SUftqAYQozfNEwGp2v6m5XE83GQNS7F5K92`
- Token Granting Program: `H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq`

### Mainnet
- Not deployed yet

## Getting Started

### Prerequisites
- Solana CLI tools installed
- Anchor framework installed
- Node.js and yarn

### Building
```bash
yarn build
```

### Testing
```bash
# Run all tests with local validator
yarn test-with-validator

# Run tests against deployed programs on devnet
yarn test:deployed:devnet
```

## Deployment

### Network Configuration
You can deploy to different Solana networks (devnet, testnet, mainnet) using the provided scripts:

```bash
# Deploy to devnet
yarn deploy:devnet

# Deploy to testnet
yarn deploy:testnet

# Deploy to mainnet
yarn deploy:mainnet
```

### Switching Networks
Use the `switch-network.sh` script to easily switch between networks:

```bash
./switch-network.sh devnet
./switch-network.sh testnet
./switch-network.sh mainnet
```

This will:
1. Update your Solana CLI configuration
2. Update the Anchor.toml settings
3. Display the current program IDs for the selected network

### Updating Program IDs
After deploying to a new network or redeploying to an existing one, update your program IDs across all configuration files:

```bash
# Update betting program ID for devnet
./update-program-ids.sh devnet betting <new-program-id>

# Update token_granting program ID for testnet
./update-program-ids.sh testnet token_granting <new-program-id>
```

This script will update the program ID in:
- Anchor.toml
- switch-network.sh
- config.js (if it exists)
- tests/deployed-test.ts
- README.md

## Running Tests with Deployed Programs

You can test against the deployed programs on different networks:

```bash
# Test on devnet (default)
yarn test:deployed

# Test on specific network
yarn test:deployed:devnet
yarn test:deployed:testnet
yarn test:deployed:mainnet

# Test a specific file
./run-deployed-tests.sh devnet tests/custom-test.ts
```

## TypeScript Client

A TypeScript client library is available in the `/client` directory for interacting with the deployed programs from frontend applications.

### Building the Client
```bash
cd client
yarn install
yarn build
```

### Using the Client
```typescript
import { BettingClient, TokenGrantingClient } from '90plus-betting-client';

// Initialize clients
const bettingClient = new BettingClient(wallet, 'testnet');
const tokenClient = new TokenGrantingClient(wallet, 'testnet');

// Create a match
await bettingClient.createMatch('Team A', 'Team B', 'match123', startTime);

// Place a bet
await bettingClient.placeBet(matchId, amount, predictedWinner, tokenMint, bettorTokenAccount, escrowTokenAccount);
```

See the [client README](./client/README.md) for more detailed usage examples.

## Project Structure
- `/programs` - Solana programs (smart contracts)
- `/tests` - Test files
- `/client` - TypeScript client library for frontend integration
- `/migrations` - Migration scripts for program deployment
- Configuration files:
  - `Anchor.toml` - Anchor framework configuration
  - `switch-network.sh` - Network switching script
  - `run-deployed-tests.sh` - Script for running tests against deployed programs
  - `update-program-ids.sh` - Script for updating program IDs across configuration files