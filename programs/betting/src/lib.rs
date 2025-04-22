use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

declare_id!("3gfMFWRXqEqCEawUv7R2ZYwAmCHCppFkrwn6r5xYWchL");

#[ephemeral]
#[program]
pub mod betting {
    use super::*;

    pub fn create_bet(ctx: Context<CreateBet>, amount: u32, outcome: String) -> Result<()> {
        let bet = &mut ctx.accounts.bet;

        bet.amount = amount;
        bet.outcome = outcome;
        bet.bettor = ctx.accounts.authority.key();
        bet.settled = false;
        bet.won = false;
        bet.payout = amount * 2;
        Ok(())
    }

    pub fn payout_bet(ctx: Context<BetPayout>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateBet<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [b"bet".as_ref(), authority.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 64 + 8 + 8 + 64,
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BetPayout<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>,
}

#[account]
pub struct Bet {
    pub bettor: Pubkey,
    pub outcome: String,
    pub amount: u32,
    pub settled: bool,
    pub won: bool,
    pub payout: u32,
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
