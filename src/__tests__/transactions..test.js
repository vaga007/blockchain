import { v4 as uuid } from "uuid";
import { GENESIS_BLOCK } from "../constants.js";
import Blockchain from "./../blockchain.js";

let blockchain = null;
describe("TRANSACTIONS", () => {
  beforeEach(() => {
    blockchain = Object.create(Blockchain);
    Object.defineProperties(blockchain, {
      chain: { value: [GENESIS_BLOCK], enumerable: true, writable: true },
      pendingTransactions: { value: [], enumerable: true, writable: true },
      currentNodeUrl: { value: "http://fake/url", enumerable: true },
      networkNodes: { value: [], enumerable: true, writable: true },
    });
  });

  afterEach(() => {
    blockchain = null;
  });

  it("CREATE TRANSACTION : should create and return a transaction", () => {
    const tx = blockchain.createNewTransaction(12, "senderxyz", "recabc");
    expect(tx.amount).toBe(12);
  });

  it("ADD TO PENDING TRANSACTION : should add tx to pending transactions on the chain", () => {
    const tx = blockchain.createNewTransaction(12, "senderxyz", "recabc");

    blockchain.addToPendingTransactions(tx);

    expect(
      blockchain.pendingTransactions[blockchain.pendingTransactions.length - 1]
        .sender
    ).toBe(tx.sender);
    expect(
      blockchain.pendingTransactions[blockchain.pendingTransactions.length - 1]
        .recipient
    ).toBe(tx.recipient);
    expect(
      blockchain.pendingTransactions[blockchain.pendingTransactions.length - 1]
        .amount
    ).toBe(tx.amount);
  });
});
