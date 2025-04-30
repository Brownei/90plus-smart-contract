use anchor_lang::prelude::*;
// use anchor_lang::Bumps;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("3gfMFWRXqEqCEawUv7R2ZYwAmCHCppFkrwn6r5xYWchL");

#[program]
pub mod betting {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, platform_fee: u8) -> Result<()> {
        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.authority = ctx.accounts.authority.key();
        platform_config.platform_fee = platform_fee;
        platform_config.is_initialized = true;
        Ok(())
    }

    pub fn create_match(
        ctx: Context<CreateMatch>,
        team_a: String,
        team_b: String,
        match_id: String,
        start_time: i64,
    ) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        match_account.team_a = team_a;
        match_account.team_b = team_b;
        match_account.match_id = match_id;
        match_account.start_time = start_time;
        match_account.status = MatchStatus::Pending;
        match_account.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        predicted_winner: String,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let match_account = &ctx.accounts.match_account;
        
        require!(match_account.status == MatchStatus::Completed, ErrorCode::GameNotStarted);
        require!(amount > 0, ErrorCode::InvalidBetAmount);
        
        // Transfer tokens from bettor to escrow
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.bettor_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),
            },
        );
        anchor_spl::token::transfer(cpi_context, amount)?;

        bet.bettor = ctx.accounts.bettor.key();
        bet.match_account = ctx.accounts.match_account.key();
        bet.amount = amount;
        bet.predicted_winner = predicted_winner;
        bet.status = BetStatus::Active;
        
        Ok(())
    }

    pub fn settle_match(ctx: Context<SettleMatch>, winner: String) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        require!(match_account.status == MatchStatus::Pending, ErrorCode::GameAlreadySettled);
        
        match_account.winner = winner;
        match_account.status = MatchStatus::Completed;
        
        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let bet = &ctx.accounts.bet;
        let match_account = &ctx.accounts.match_account;
        
        require!(match_account.status == MatchStatus::Completed, ErrorCode::GameNotStarted);
        require!(bet.status == BetStatus::Active, ErrorCode::BetAlreadySettled);
        require!(bet.predicted_winner == match_account.winner, ErrorCode::NotWinner);
        
        // Calculate platform fee
        let platform_fee = (bet.amount * ctx.accounts.platform_config.platform_fee as u64) / 100;
        let winnings = bet.amount * 2 - platform_fee;
        
        // Transfer winnings to winner
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.platform_config.to_account_info(),
            },
        );
        anchor_spl::token::transfer(cpi_context, winnings)?;
        
        // Transfer platform fee
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.platform_token_account.to_account_info(),
                authority: ctx.accounts.platform_config.to_account_info(),
            },
        );
        anchor_spl::token::transfer(cpi_context, platform_fee)?;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 1,
        seeds = [b"platform_config".as_ref()],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(team_a: String, team_b: String, match_id: String, start_time: i64)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 32 + 8 + 1,
        seeds = [b"match".as_ref(), match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    #[account(
        init,
        payer = bettor,
        space = 8 + 32 + 32 + 32 + 8 + 1,
        seeds = [b"bet".as_ref(), bettor.key().as_ref(), match_account.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub match_account: Account<'info, Match>,
    
    #[account(mut)]
    pub bettor_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    #[account(mut)]
    pub match_account: Account<'info, Match>,
    
    #[account(
        constraint = platform_config.authority == authority.key()
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub match_account: Account<'info, Match>,
    
    #[account(mut)]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub winner_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub platform_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub platform_fee: u8,
    pub is_initialized: bool,
}

#[account]
pub struct Match {
    pub team_a: String,
    pub team_b: String,
    pub match_id: String,
    pub start_time: i64,
    pub status: MatchStatus,
    pub winner: String,
    pub authority: Pubkey,
}

#[account]
pub struct Bet {
    pub bettor: Pubkey,
    pub match_account: Pubkey,
    pub amount: u64,
    pub predicted_winner: String,
    pub status: BetStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MatchStatus {
    Pending,
    Completed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BetStatus {
    Active,
    Settled,
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
    
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    
    #[msg("Not the winner")]
    NotWinner,
    
    #[msg("Invalid platform fee")]
    InvalidPlatformFee,
}
