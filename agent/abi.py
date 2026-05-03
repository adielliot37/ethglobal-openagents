"""Minimal ABIs the agent uses to talk to the Will/Keeper contracts."""

WILL_ABI = [
    {"inputs": [], "name": "owner", "outputs": [{"type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "ownerENS", "outputs": [{"type": "bytes32"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "lastHeartbeat", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "inactivityPeriod", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "challengeWindow", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "triggeredAt", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "state", "outputs": [{"type": "uint8"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "timeUntilTrigger", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "timeUntilExecutable", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "triggerWill", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "execute", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "heartbeat", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "cancel", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
]

KEEPER_ABI = [
    {"inputs": [{"type": "uint256"}], "name": "keepers", "outputs": [
        {"type": "address", "name": "willAddress"},
        {"type": "bytes32", "name": "ensSubname"},
        {"type": "string", "name": "memoryURI"},
        {"type": "uint256", "name": "alertnessScore"},
        {"type": "uint256", "name": "actionsFired"},
        {"type": "uint256", "name": "lastActionAt"},
        {"type": "address", "name": "operator"},
    ], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256"}, {"type": "string"}], "name": "updateMemory",
     "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"type": "uint256"}, {"type": "uint8"}], "name": "recordAction",
     "outputs": [], "stateMutability": "nonpayable", "type": "function"},
]

ERC20_ABI = [
    {"inputs": [{"type": "address"}], "name": "balanceOf",
     "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]

WILL_STATES = {0: "Active", 1: "Triggered", 2: "Cancelled", 3: "Executed"}
ACTION_HEARTBEAT = 0
ACTION_REMINDER = 1
ACTION_TRIGGER = 2
ACTION_EXECUTE = 3
ACTION_MEMORY_UPDATE = 4
