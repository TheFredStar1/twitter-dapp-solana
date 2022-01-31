import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { TwitterDappSolana } from '../target/types/twitter_dapp_solana';

describe('twitter-dapp-solana', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.TwitterDappSolana as Program<TwitterDappSolana>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
