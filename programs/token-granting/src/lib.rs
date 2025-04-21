use anchor_lang::prelude::*;
pub mod instructions;

use crate::instructions::*;

declare_id!("9rKCGNBQTjvzFgAjZ5RhJ6ZvL8i2FvUvwKQjr8hXvQWe");

#[program]
pub mod token_granting {
    use super::*;

    pub fn create_token(
        ctx: Context<CreateToken>,
        token_name: String,
        token_symbol: String,
        token_uri: String,
    ) -> Result<()> {
        create::create_token(ctx, token_name, token_symbol, token_uri)
    }

    pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        mint::mint_token(ctx, amount)
    }
}
