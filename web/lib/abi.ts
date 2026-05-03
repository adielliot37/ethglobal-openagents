export const factoryAbi = [
  {
    type: "function",
    name: "createWill",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ownerENS", type: "bytes32" },
      {
        name: "beneficiaries",
        type: "tuple[]",
        components: [
          { name: "payoutAddress", type: "address" },
          { name: "ensName", type: "bytes32" },
          { name: "sharePoints", type: "uint16" },
        ],
      },
      { name: "watchedTokens", type: "address[]" },
      { name: "inactivityPeriod", type: "uint256" },
      { name: "challengeWindow", type: "uint256" },
      { name: "ensSubname", type: "bytes32" },
      { name: "memoryURI", type: "string" },
      { name: "agentOperator", type: "address" },
    ],
    outputs: [
      { name: "willAddress", type: "address" },
      { name: "keeperTokenId", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getWillsByOwner",
    stateMutability: "view",
    inputs: [{ name: "ownerAddr", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "totalWills",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "WillCreated",
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "willAddress", type: "address" },
      { indexed: true, name: "keeperTokenId", type: "uint256" },
      { indexed: false, name: "ownerENS", type: "bytes32" },
    ],
  },
] as const;

export const willAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "ownerENS", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "lastHeartbeat", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "inactivityPeriod", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "challengeWindow", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "triggeredAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "state", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "timeUntilTrigger", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "timeUntilExecutable", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "recoveryAsset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "beneficiaries",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "payoutAddress", type: "address" },
          { name: "ensName", type: "bytes32" },
          { name: "sharePoints", type: "uint16" },
        ],
      },
    ],
  },
  { type: "function", name: "getWatchedTokens", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", name: "heartbeat", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "triggerWill", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "execute", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "event",
    name: "Heartbeat",
    inputs: [{ indexed: false, name: "timestamp", type: "uint256" }],
  },
  {
    type: "event",
    name: "Triggered",
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Cancelled",
    inputs: [{ indexed: false, name: "timestamp", type: "uint256" }],
  },
  {
    type: "event",
    name: "Executed",
    inputs: [
      { indexed: false, name: "totalDistributed", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "BeneficiaryPaid",
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "ensName", type: "bytes32" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TokenSwept",
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amountIn", type: "uint256" },
      { indexed: false, name: "amountOut", type: "uint256" },
    ],
  },
] as const;

export const keeperAbi = [
  {
    type: "function",
    name: "keepers",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "willAddress", type: "address" },
      { name: "ensSubname", type: "bytes32" },
      { name: "memoryURI", type: "string" },
      { name: "alertnessScore", type: "uint256" },
      { name: "actionsFired", type: "uint256" },
      { name: "lastActionAt", type: "uint256" },
      { name: "operator", type: "address" },
    ],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
