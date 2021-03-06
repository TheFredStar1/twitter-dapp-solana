use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;


declare_id!("8MHS3bdh7Q2TSz3aTy1RzrbwujYjn4uJcNdW5pe7o3Z1");

#[program]
pub mod twitter_dapp_solana {
    use super::*;
    pub fn send_tweet(ctx: Context<SendTweet>, topic: String, content: String) -> ProgramResult {
        let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
        let author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        if topic.chars().count() > 50 {
            return Err(ErrorCode::TopicTooLong.into())
        }

        if content.chars().count() > 280 {
            return Err(ErrorCode::ContentTooLong.into());
        }

        tweet.author = *author.key;
        tweet.timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SendTweet<'info> {
    #[account(init, payer = author, space = Tweet::LEN)]
    pub tweet: Account<'info, Tweet>, // Account to create
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>
}

#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const TOPIC_LENGTH: usize = 200 + 4; // topic is going to be max 50 chars + 4 byte vector prefix
const CONTENT_LENGTH: usize = 1124 + 4; // content is max 280 characters

impl Tweet {
    // Tweet::LEN
    const LEN: usize = DISCRIMINATOR_LENGTH 
                        + PUBLIC_KEY_LENGTH 
                        + TIMESTAMP_LENGTH
                        + TOPIC_LENGTH
                        + CONTENT_LENGTH;
}

#[error]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong
}