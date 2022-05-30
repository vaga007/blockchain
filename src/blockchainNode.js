import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import Blockchain from "./blockchain.js";
import { GENESIS_BLOCK } from "./constants.js";

const app = express();
const port = process.argv[2];

const nodeAddress = uuid().split("-").join("");
const currentNodeUrl = process.argv[3];

const bitcoin = Object.create(Blockchain);
Object.defineProperties(bitcoin, {
  chain: { value: [GENESIS_BLOCK], enumerable: true, writable: true },
  pendingTransactions: { value: [], enumerable: true, writable: true },
  currentNodeUrl: { value: currentNodeUrl, enumerable: true },
  networkNodes: { value: [], enumerable: true, writable: true },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const HTTP_POST = axios.post;
const HTTP_GET = axios.get;

// gets entire blockchain
app.get("/blockchain", function (req, res) {
  res.send(bitcoin);
});

app.post("/transaction", function (req, res) {
  const newTransaction = req.body;
  bitcoin.addToPendingTransactions(newTransaction);
  const blockIndex = bitcoin.getIndexForNewBlock();

  res.json({
    note: `Transaction will be added in block ${blockIndex} . ${JSON.stringify(
      bitcoin.pendingTransactions
    )}`,
  });
});

app.post("/transaction/broadcast", function (req, res) {
  const newTransaction = bitcoin.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recipient
  );
  bitcoin.addToPendingTransactions(newTransaction);

  const requestPromises = bitcoin.networkNodes.map((networkNodeUrl) => {
    const uri = networkNodeUrl + "/transaction";
    const body = newTransaction;
    return HTTP_POST(uri, body);
  });

  Promise.all(requestPromises).then(() => {
    res.json({ note: "Transaction created and broadcast successfully." });
  });
});

// mine a block
app.get("/mine", function (req, res) {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock.hash;
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock["index"] + 1,
  };
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(
    nonce,
    previousBlockHash,
    currentBlockData
  );

  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

  const requestPromises = bitcoin.networkNodes.map((networkNodeUrl) => {
    const uri = networkNodeUrl + "/receive-new-block";

    const body = {
      newBlock,
    };

    return HTTP_POST(uri, body);
  });

  Promise.all(requestPromises)
    .then(() => {
      const uri = bitcoin.currentNodeUrl + "/transaction/broadcast";
      const body = {
        amount: 12.5,
        sender: "00",
        recipient: nodeAddress,
      };

      return HTTP_POST(uri, body);
    })
    .then(() => {
      res.json({
        note: "New block mined & broadcast successfully",
        block: newBlock,
      });
    });
});

app.post("/receive-new-block", function (req, res) {
  const { newBlock } = req.body;

  const lastBlock = bitcoin.getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock["index"] + 1 === newBlock["index"];

  if (correctHash && correctIndex) {
    bitcoin.chain.push(newBlock);

    bitcoin.pendingTransactions = [];
    res.json({
      note: "New block received and accepted.",
      newBlock,
    });
  } else {
    res.json({
      note: "New block rejected.",
      newBlock,
    });
  }
});

app.post("/register-and-broadcast-node", function (req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  if (
    bitcoin.networkNodes.indexOf(newNodeUrl) === -1 &&
    newNodeUrl !== bitcoin.currentNodeUrl
  )
    bitcoin.networkNodes.push(newNodeUrl);
  const regNodesPromises = bitcoin.networkNodes.map((networkNodeUrl) => {
    const uri = networkNodeUrl + "/register-node";
    const body = { newNodeUrl };
    return HTTP_POST(uri, body);
  });

  Promise.all(regNodesPromises)
    .then(() => {
      const uri = newNodeUrl + "/register-nodes-bulk";
      const body = {
        allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl],
      };

      return HTTP_POST(uri, body);
    })
    .then(() => {
      res.json({ note: "New node registered with network successfully." });
    });
});

app.post("/register-node", function (req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  const isNodePresent = bitcoin.networkNodes.indexOf(newNodeUrl) !== -1;
  const isNodeCurrentNode = bitcoin.currentNodeUrl === newNodeUrl;
  if (!isNodePresent && !isNodeCurrentNode)
    bitcoin.networkNodes.push(newNodeUrl);
  res.json({ note: `New node registered successfully.` });
});

app.post("/register-nodes-bulk", function (req, res) {
  const { allNetworkNodes } = req.body;
  allNetworkNodes.forEach((networkNodeUrl) => {
    const isNodePresent = bitcoin.networkNodes.indexOf(networkNodeUrl) !== -1;
    const isNodeCurrentNode = bitcoin.currentNodeUrl === networkNodeUrl;
    if (!isNodePresent && !isNodeCurrentNode)
      bitcoin.networkNodes.push(networkNodeUrl);
  });

  res.json({ note: "Bulk registration successful." });
});

// consensus
app.get("/consensus", function (req, res) {
  const requestPromises = bitcoin.networkNodes.map((networkNodeUrl) => {
    const uri = networkNodeUrl + "/blockchain";
    return HTTP_GET(uri);
  });

  Promise.all(requestPromises).then((rez) => {
    const blockchains = rez.map((obj) => {
      return obj.data;
    });

    const currentChainLength = bitcoin?.chain?.length;
    let maxChainLength = currentChainLength;
    let newLongestChain = null;
    let newPendingTransactions = null;

    const otherNetworkNodesSortedByLength = blockchains.sort(
      (blockchain1, blockchain2) =>
        blockchain2?.chain?.length - blockchain1?.chain?.length
    );

    
    const longestBlockchain = otherNetworkNodesSortedByLength[0];
    
    maxChainLength = Math.max(longestBlockchain?.chain?.length, currentChainLength);
    newLongestChain = currentChainLength < longestBlockchain?.chain?.length ? longestBlockchain?.chain : null ;
    newPendingTransactions = currentChainLength < longestBlockchain?.chain?.length ? longestBlockchain?.pendingTransactions: null;


    // if longest chain on the n/w is not valid, don't replace the chain on current node
    if (
      !newLongestChain ||
      (newLongestChain && !bitcoin.isChainValid(newLongestChain))
    )
      return res.json({
        note: "Current chain has not been replaced.",
        chain: bitcoin.chain,
      });

    bitcoin.chain = newLongestChain;
    bitcoin.pendingTransactions = newPendingTransactions;
    res.json({
      note: "This chain has been replaced.",
      chain: bitcoin.chain,
    });
  });
});

// get block by blockHash
app.get("/block/:blockHash", function (req, res) {
  const blockHash = req.params.blockHash;
  const correctBlock = bitcoin.getBlock(blockHash);
  res.json({
    block: correctBlock,
  });
});

// get transaction by transactionId
app.get("/transaction/:transactionId", function (req, res) {
  const transactionId = req.params.transactionId;
  const trasactionData = bitcoin.getTransaction(transactionId);
  res.json({
    transaction: trasactionData.transaction,
    block: trasactionData.block,
  });
});

// get address by address
app.get("/address/:address", function (req, res) {
  const address = req.params.address;
  const addressData = bitcoin.getAddressData(address);
  res.json({
    addressData: addressData,
  });
});

// block explorer
app.get("/block-explorer", function (req, res) {
  res.sendFile("./block-explorer/index.html", { root: __dirname });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}...`);
});
