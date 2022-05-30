export const GENESIS_BLOCK = {
    nonce: 100,
    previousBlockHash: "0",
    hash: "0000",
    transactions: [],
    index: 1
  };
  
 export const BITCOIN_LEADING_HASH_CHARACTERS = "0000";


 // TODO: use constants to build api routes
 export const TRANSACTION_PATHS = {
  root: '/transaction',
  broadcast: '/broadcast',
  id: ':transactionId'

 }

 export const BLOCKS_PATHS = {
   receiveNewBlock: '/receive-new-block'
 }