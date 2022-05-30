import Blockchain from "../blockchain";
import crypto from "node:crypto";
import { GENESIS_BLOCK } from "../constants";
const { createHash } = crypto;
const sha256 = createHash("sha256");

describe("TESTS FOR BLOCKS ", () => {
  let blockchain = null;
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

  it("CREATE NEW BLOCK : should create new block on the chain", () => {
    const nonce = 1234;

    const newBlock = blockchain.createNewBlock(nonce, "0", "abc456");
    expect(newBlock.nonce).toBe(nonce);
  });

  it("GET LAST BLOCK : should return the last block on the chain", () => {
    const blockData = [
      { nonce: 1234, previousBlockHash: "0", currentDataHash: "abc678" },
      { nonce: 3456, previousBlockHash: "abc678", currentDataHash: "ghi567" },
    ];
    blockData.map(({ nonce, previousBlockHash, currentDataHash }) => {
      return blockchain.createNewBlock(
        nonce,
        previousBlockHash,
        currentDataHash
      );
    });

    const lastBlock = blockchain.getLastBlock();
    expect(lastBlock.nonce).toBe(blockData[1].nonce);
  });

  it("GET BLOCK : should return block with hash provided", () => {
    const blockData = [
      { nonce: 1234, previousBlockHash: "0", currentDataHash: "abc678" },
      { nonce: 3456, previousBlockHash: "abc678", currentDataHash: "ghi567" },
    ];
    blockData.map(({ nonce, previousBlockHash, currentDataHash }) => {
      return blockchain.createNewBlock(
        nonce,
        previousBlockHash,
        currentDataHash
      );
    });

    const block = blockchain.getBlock("abc678");
    expect(block.nonce).toBe(blockData[0].nonce);
  });

  it("GET BLOCK : should return null when incorrect hash is provided", () => {
    const blockData = [
      { nonce: 1234, previousBlockHash: "0", currentDataHash: "abc678" },
      { nonce: 3456, previousBlockHash: "abc678", currentDataHash: "ghi567" },
    ];
    blockData.map(({ nonce, previousBlockHash, currentDataHash }) => {
      return blockchain.createNewBlock(
        nonce,
        previousBlockHash,
        currentDataHash
      );
    });

    const block = blockchain.getBlock("INVALID_HASH");
    expect(block).toBe(null);
  });

  it("HASH BLOCK : should return hash of data", () => {
    const blockData = [
      {
        data: "hello",
        nonce: 1234,
        previousBlockHash: "0",
        currentDataHash: "abc678",
      },
      {
        data: "Ola!!",
        nonce: 3456,
        previousBlockHash: "abc678",
        currentDataHash: "some_random_incorrect_hash",
      },
    ];

    const { data, nonce, previousBlockHash } = blockData[1];
    const manualHash = sha256
      .update(
        previousBlockHash + nonce.toString() + JSON.stringify(data),
        "utf8"
      )
      .digest("hex");

    const hash = blockchain.hashBlock(nonce, previousBlockHash, data);
    expect(hash).toBe(manualHash);
  });
});
