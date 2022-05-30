import { v4 as uuid } from "uuid";
import crypto from "node:crypto";
import { GENESIS_BLOCK, BITCOIN_LEADING_HASH_CHARACTERS } from "./constants.js";
const { createHash } = crypto;
const HASH = createHash;

const MUSCLE_POWER = {
  proofOfWork: function (previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(nonce, previousBlockHash, currentBlockData);

    while (hash.substring(0, BITCOIN_LEADING_HASH_CHARACTERS.length) !== BITCOIN_LEADING_HASH_CHARACTERS) {
      nonce++;
      hash = this.hashBlock(nonce, previousBlockHash, currentBlockData);
    }
    return nonce;
  },
};

const BLOCKS = {
  createNewBlock: function (nonce, previousBlockHash, currentDataHash) {
    const newBlock = {
      index: this.chain.length + 1,
      timestamp: Date.now(),
      transactions: this.pendingTransactions,
      nonce,
      hash: currentDataHash,
      previousBlockHash,
    };
    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
  },
  getLastBlock: function () {
    return this.chain[this.chain.length - 1];
  },
  getBlock: function (blockHash) {
    let correctBlock = null;
    const match = this.chain.filter((block) => block.hash === blockHash);
    if (Array.isArray(match) && match.length > 0) correctBlock = match[0];

    return correctBlock;
  },
  hashBlock: function (nonce, previousBlockHash, currentBlockData) {
    const dataStr =
      previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = HASH("sha256").update(dataStr).digest("hex");

    return hash;
  },
  getAddressData: function (address) {
    let balance = 0;
    const txWithAddresses = this.chain.reduce(
      (addressTransactions = [], block) => {
        const matchingTx = block.transactions.filter(
          (tx) => tx.sender === address || tx.recipient === address
        );
        return (addressTransactions = [...addressTransactions, ...matchingTx]);
      },
      []
    );

    txWithAddresses.forEach((transaction) => {
      const { recipient, sender, amount } = transaction;
      if (recipient === address) balance += amount;
      else if (sender === address) balance -= amount;
    });

    return {
      addressTransactions: txWithAddresses,
      addressBalance: balance,
    };
  },
  isChainValid: function (blockchain) {
    let validChain = true;

    const genesisBlock = blockchain[0];
    const { nonce, previousBlockHash, hash, transactions } = genesisBlock;
    const correctNonce = nonce === GENESIS_BLOCK.nonce;
    const correctPreviousBlockHash =
      previousBlockHash === GENESIS_BLOCK.previousBlockHash;
    const correctHash = hash === GENESIS_BLOCK.hash;
    const correctTransactions = transactions.length === 0;

    if (
      !correctNonce ||
      !correctPreviousBlockHash ||
      !correctHash ||
      !correctTransactions
    )
      return (validChain = false);

    for (let i = 1; i < blockchain.length; i++) {
      const currentBlock = blockchain[i];
      const prevBlock = blockchain[i - 1];

      const {
        transactions: currTxs,
        index: currIdx,
        nonce: currNonce,
        previousBlockHash,
      } = currentBlock;

      const { hash: prevHash } = prevBlock;
      const blockHash = this.hashBlock(currNonce, prevHash, {
        transactions: currTxs,
        index: currIdx,
      });
      if (
        blockHash.substring(0, BITCOIN_LEADING_HASH_CHARACTERS.length) !==
        BITCOIN_LEADING_HASH_CHARACTERS
      )
        validChain = false;
      if (previousBlockHash !== prevHash) validChain = false;

      if (!validChain) break;
    }
    return validChain;
  },
  getIndexForNewBlock: function () {
    return this.chain.length;
  },
};

const TRANSACTIONS = {
  createNewTransaction: function (amount, sender, recipient) {
    const newTransaction = {
      amount,
      sender,
      recipient,
      transactionId: uuid().split("-").join(""),
    };
    return newTransaction;
  },
  addToPendingTransactions: function (transaction) {
    this.pendingTransactions.push(transaction);
  },
  getTransaction: function (transactionId) {
    let block = null,
      transaction = null;
    const correctBlock = this.chain.filter((block) =>
      block.transactions.some((tx) => tx.transactionId === transactionId)
    );

    if (Array.isArray(correctBlock) & (correctBlock.length > 0)) {
      block = correctBlock;
      transaction = correctBlock.transactions[0];
    }
    return {
      transaction,
      block,
    };
  },
};

const Blockchain = {
  ...BLOCKS,
  ...TRANSACTIONS,
  ...MUSCLE_POWER,
};

export default Blockchain;
