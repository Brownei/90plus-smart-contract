use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::*;
use ephemeral_rollups_sdk::{
    cpi::DelegateConfig,
    ephem::{commit_accounts, commit_and_undelegate_accounts},
};

declare_id!("3gfMFWRXqEqCEawUv7R2ZYwAmCHCppFkrwn6r5xYWchL");

pub const TEST_PDA_SEED: &[u8] = b"test-pda";

#[ephemeral]
#[program]
pub mod betting {
    use super::*;

    /// Initialize the platform.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let platform = &mut ctx.accounts.platform;

        // Default protocol fee 1.5%
        platform.fee = 150;
        platform.total_bets = 0;
        platform.total_volume = 0;
        // Treasury will collect fees
        platform.treasury = ctx.accounts.treasury.key();

        // Initialize token mint
        let token_mint = &mut ctx.accounts.token_mint;

        msg!("Platform initialized with decentralized governance");
        Ok(())
    }

    /// Increment the bet.
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        bet.amount += 1;
        if bet.amount > 1000 {
            bet.amount = 0;
        }
        Ok(())
    }

    /// Delegate the account to the delegation program
    pub fn delegate(ctx: Context<DelegateInput>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[TEST_PDA_SEED],
            DelegateConfig::default(),
        )?;

        Ok(())
    }

    // Transfer an amount of tokens from the balance
    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_type: u8,
        player_name: String,
        stat_value: u8,
        amount: u64,
    ) -> Result<()> {
        let game = &ctx.accounts.game;
        let current_time = Clock::get()?.unix_timestamp;

        // Ensure game hasn't started yet
        require!(
            game.start_time > current_time,
            ErrorCode::GameAlreadyStarted
        );

        // Ensure user has enough tokens
        require!(
            ctx.accounts.user_account.token_balance >= amount,
            ErrorCode::InsufficientBalance
        );

        // Calculate odds based on the oracle data for this type of bet
        let odds = calculate_odds(
            &ctx.accounts.odds_oracle,
            bet_type,
            &player_name,
            stat_value,
            &game.game_id,
        )?;

        // Create the bet
        let bet = &mut ctx.accounts.bet;
        bet.bettor = ctx.accounts.bettor.key();
        bet.game = ctx.accounts.game.key();
        bet.bet_type = bet_type;
        bet.player_name = player_name.clone();
        bet.stat_value = stat_value;
        bet.amount = amount;
        bet.odds = odds;
        bet.settled = false;
        bet.won = false;
        bet.payout = 0;

        // Update user account
        ctx.accounts.user_account.token_balance = ctx
            .accounts
            .user_account
            .token_balance
            .checked_sub(amount)
            .ok_or(ErrorCode::NumericalOverflow)?;
        ctx.accounts.user_account.active_bets = ctx
            .accounts
            .user_account
            .active_bets
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;
        ctx.accounts.user_account.total_bets = ctx
            .accounts
            .user_account
            .total_bets
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;

        // Update platform stats
        let platform = &mut ctx.accounts.platform;
        platform.total_bets = platform
            .total_bets
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;
        platform.total_volume = platform
            .total_volume
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflow)?;

        // Update game stats
        let game = &mut ctx.accounts.game;
        game.total_bets = game
            .total_bets
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;

        emit!(BetPlaced {
            bettor: ctx.accounts.bettor.key(),
            game: ctx.accounts.game.key(),
            amount,
            player_name,
            stat_value,
            odds,
        });

        msg!(
            "Bet placed: {} 90plus tokens on {} with odds {}",
            amount,
            bet.player_name,
            odds
        );
        Ok(())
    }

    /// Undelegate the account from the delegation program
    pub fn undelegate(ctx: Context<IncrementAndCommit>) -> Result<()> {
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.bet.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }

    // // Increment the bet + manual commit the account in the ER.
    //pub fn increment_and_commit(ctx: Context<IncrementAndCommit>) -> Result<()> {
    //    let bet = &mut ctx.accounts.counter;
    //    bet.count += 1;
    //    commit_accounts(
    //        &ctx.accounts.payer,
    //        vec![&ctx.accounts.bet.to_account_info()],
    //        &ctx.accounts.magic_context,
    //        &ctx.accounts.magic_program,
    //    )?;
    //    Ok(())
    //}
    //
    // // Increment the bet + manual commit the account in the ER.
    //pub fn increment_and_undelegate(ctx: Context<IncrementAndCommit>) -> Result<()> {
    //    let bet = &mut ctx.accounts.counter;
    //    bet.count += 1;
    //    // Serialize the Anchor bet account, commit and undelegate
    //    bet.exit(&crate::ID)?;
    //    commit_and_undelegate_accounts(
    //        &ctx.accounts.payer,
    //        vec![&ctx.accounts.bet.to_account_info()],
    //        &ctx.accounts.magic_context,
    //        &ctx.accounts.magic_program,
    //    )?;
    //    Ok(())
    //}
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 8 + 8 + 8 + 32,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        init,
        payer = payer,
        space = 8 + 82,
        seeds = [b"token_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + 32,
        seeds = [b"treasury"],
        bump
    )]
    /// CHECK: Treasury PDA to collect fees
    pub treasury: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(seeds = [b"platform"], bump)]
    pub platform: Account<'info, Platform>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"treasury"],
        bump
    )]
    /// CHECK: Treasury PDA
    pub treasury: AccountInfo<'info>,

    #[account(
        seeds = [b"token_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    /// CHECK: Price feed oracle account
    pub price_feed: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/// Account for the increment instruction.
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, seeds = [TEST_PDA_SEED], bump)]
    pub bet: Account<'info, Bet>,
}

#[account]
pub struct Platform {
    pub fee: u64, // Fee in basis points (e.g., 150 = 1.5%)
    pub total_bets: u64,
    pub total_volume: u64,
    pub treasury: Pubkey, // Treasury PDA to collect fees
}

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub token_balance: u64,
    pub active_bets: u64,
    pub total_bets: u64,
    pub won_bets: u64,
}

#[account]
pub struct Game {
    pub home_team: String,
    pub away_team: String,
    pub start_time: i64,
    pub is_settled: bool,
    pub game_id: String,
    pub total_bets: u64,
    pub oracle_account: Pubkey, // Reference to the sports oracle account
}

#[account]
pub struct Bet {
    pub bettor: Pubkey,
    pub game: Pubkey,
    pub bet_type: u8,
    pub player_name: String,
    pub stat_value: u8,
    pub amount: u64,
    pub odds: u64,
    pub settled: bool,
    pub won: bool,
    pub payout: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Insufficient funds")]
    InsufficientBalance,

    #[msg("Game has already started")]
    GameAlreadyStarted,

    #[msg("Game has not started yet")]
    GameNotStarted,

    #[msg("Bet has already been settled")]
    BetAlreadySettled,

    #[msg("Game has already been settled")]
    GameAlreadySettled,

    #[msg("Numerical overflow")]
    NumericalOverflow,

    #[msg("Invalid game data provided")]
    InvalidGameData,

    #[msg("Oracle data verification failed")]
    OracleVerificationFailed,

    #[msg("Invalid rollup data")]
    InvalidRollupData,

    #[msg("Insufficient votes for governance action")]
    InsufficientVotes,

    #[msg("Invalid fee amount")]
    InvalidFeeAmount,
}

// Events
#[event]
pub struct TokensMinted {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct GameCreated {
    pub game: Pubkey,
    pub home_team: String,
    pub away_team: String,
    pub start_time: i64,
}

#[event]
pub struct BetPlaced {
    pub bettor: Pubkey,
    pub game: Pubkey,
    pub amount: u64,
    pub player_name: String,
    pub stat_value: u8,
    pub odds: u64,
}

#[event]
pub struct BetSettled {
    pub bettor: Pubkey,
    pub game: Pubkey,
    pub won: bool,
    pub payout: u64,
}
