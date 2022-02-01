import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { TwitterDappSolana } from '../target/types/twitter_dapp_solana';
import * as assert from 'assert';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

describe('twitter-dapp-solana', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.TwitterDappSolana as Program<TwitterDappSolana>;

  it('can send a new tweet', async () => {
    // Before sending the transaction to the blockchain
    const tweetAccountKeypair = anchor.web3.Keypair.generate();

    await program.rpc.sendTweet('veganism', 'Hummus. am I right?', {
      accounts: {
        tweet: tweetAccountKeypair.publicKey, 
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [ tweetAccountKeypair ]
    });

    // Fetch the account details of the newly created tweet
    const tweetAccount = await program.account.tweet.fetch(tweetAccountKeypair.publicKey);
    console.log(tweetAccount);

    assert.equal(tweetAccount.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic, 'veganism');
    assert.equal(tweetAccount.content, 'Hummus. am I right?');
    assert.ok(tweetAccount.timestamp);
  
  });

  it('can send a tweet without a topic', async () => {
    const tweetAccountKeypair = anchor.web3.Keypair.generate();

    await program.rpc.sendTweet('', 'Hummus. am I right?', {
      accounts: {
        tweet: tweetAccountKeypair.publicKey, 
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [ tweetAccountKeypair ]
    });

    // Fetch the account details of the newly created tweet
    const tweetAccount = await program.account.tweet.fetch(tweetAccountKeypair.publicKey);
    console.log(tweetAccount);
  });

  // Test that we should be able to tweet on behalf of any author
  // as long as we can prove we we own its public address by
  // signing the transaction.
  it('can send a new tweet from a different author', async () => {
    const otherUser = anchor.web3.Keypair.generate();

    // request lamports for otherUser and wait for confirmation
    const signature = await program.provider.connection.requestAirdrop(otherUser.publicKey, 1_000_000_000);
    await program.provider.connection.confirmTransaction(signature);

    const tweetAccountKeypair = anchor.web3.Keypair.generate();

    await program.rpc.sendTweet('This is a topic', 'This is a tweet!', {
      accounts: {
        tweet: tweetAccountKeypair.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [ otherUser, tweetAccountKeypair]
    });

    const tweetAccount = await program.account.tweet.fetch(tweetAccountKeypair.publicKey);
    console.log(tweetAccount);

  });

  it('cannot provide a topic with more than 50 characters', async () => {
    try {
      const tweetAccountKeypair = anchor.web3.Keypair.generate();
      const topic = 'x'.repeat(55);
      await program.rpc.sendTweet(topic, 'some content', {
        accounts: {
          tweet: tweetAccountKeypair.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        },
        signers: [ tweetAccountKeypair ]
      });
    } catch (err) {
      // It should fail and the catch block should be executed
      assert.equal(err.msg, 'The provided topic should be 50 characters long maximum.');
      return
    }

    assert.fail('The instruction should have failed already');
  });

  it('can fetch all tweets', async () => {
    const tweetAccounts = await program.account.tweet.all();
    assert.equal(tweetAccounts.length > 0, true);
  });

  it('can filter tweets by author', async () => {
    const authorPublicKey = program.provider.wallet.publicKey
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8, // Same size as discriminator 
          bytes: authorPublicKey.toBase58() // pub key shows up after offset of 8
        }
      }
    ]);

    assert.equal(tweetAccounts.length > 0, true);

    assert.ok(tweetAccounts.every(tweetAccount => {
      // a single tweetAccout's author public key should be the same as our author pub key
      return tweetAccount.account.author.toBase58() == authorPublicKey.toBase58();
    }));
  });

  it('can filter by topics', async () => {
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8 + // discriminator
                  32 + // author public key
                  8 + // Timestamp
                  4, // Topic String prefix
          bytes: bs58.encode(Buffer.from('veganism')) // Convert string to buffer, then base58
        }
      }
    ]);

  });
});
