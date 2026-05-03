// wallet.will frontend
const cfg = window.WALLET_WILL_CONFIG;
const STATE_NAMES = ["Active", "Triggered", "Cancelled", "Executed"];

const FACTORY_ABI = [
  "function createWill(bytes32 ownerENS, (address payoutAddress,bytes32 ensName,uint16 sharePoints)[] beneficiaries, address[] watchedTokens, uint256 inactivityPeriod, uint256 challengeWindow, bytes32 ensSubname, string memoryURI, address agentOperator) external returns (address willAddress, uint256 keeperTokenId)",
  "function getWillsByOwner(address) view returns (address[])",
  "event WillCreated(address indexed owner, address indexed willAddress, uint256 indexed keeperTokenId, bytes32 ownerENS)",
];

const WILL_ABI = [
  "function owner() view returns (address)",
  "function ownerENS() view returns (bytes32)",
  "function lastHeartbeat() view returns (uint256)",
  "function inactivityPeriod() view returns (uint256)",
  "function challengeWindow() view returns (uint256)",
  "function triggeredAt() view returns (uint256)",
  "function state() view returns (uint8)",
  "function beneficiaries() view returns (tuple(address payoutAddress,bytes32 ensName,uint16 sharePoints)[])",
  "function getWatchedTokens() view returns (address[])",
  "function timeUntilTrigger() view returns (uint256)",
  "function timeUntilExecutable() view returns (uint256)",
  "function heartbeat() external",
  "function cancel() external",
  "function triggerWill() external",
  "function execute() external",
];

const KEEPER_ABI = [
  "function keepers(uint256) view returns (address willAddress, bytes32 ensSubname, string memoryURI, uint256 alertnessScore, uint256 actionsFired, uint256 lastActionAt, address operator)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

let provider, signer, account;
let factory, keeper, will;
let pollHandle;

const $ = (id) => document.getElementById(id);
const log = (msg, kind = "") => {
  const el = $("console");
  const line = document.createElement("span");
  line.className = kind;
  line.textContent = `${new Date().toLocaleTimeString()}  ${msg}\n`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
};

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}
function fmtTime(s) {
  s = Number(s);
  if (s <= 0) return "00:00";
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}
function namehash(name) {
  // canonical ENS namehash
  let node = "0x" + "00".repeat(32);
  if (!name) return node;
  const labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
    node = ethers.keccak256(ethers.concat([node, labelHash]));
  }
  return node;
}

async function connect() {
  if (!window.ethereum) {
    alert("install metamask");
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== cfg.chainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + cfg.chainId.toString(16) }],
      });
    } catch (e) {
      log(`switch network manually to ${cfg.chainName}`, "warn");
    }
  }
  signer = await provider.getSigner();
  account = await signer.getAddress();
  $("connect-label").textContent = shortAddr(account);
  log(`connected ${shortAddr(account)}`, "ok");

  factory = new ethers.Contract(cfg.factoryAddress, FACTORY_ABI, signer);
  keeper = new ethers.Contract(cfg.keeperAddress, KEEPER_ABI, signer);

  if (cfg.willAddress) {
    await loadWill(cfg.willAddress);
  } else {
    try {
      const wills = await factory.getWillsByOwner(account);
      if (wills.length) await loadWill(wills[wills.length - 1]);
    } catch (_) {}
  }
}

async function loadWill(addr) {
  cfg.willAddress = addr;
  will = new ethers.Contract(addr, WILL_ABI, signer);
  $("will-addr-label").textContent = addr;
  log(`loaded will ${shortAddr(addr)}`, "ok");
  if (pollHandle) clearInterval(pollHandle);
  await refresh();
  pollHandle = setInterval(refresh, 5000);
}

async function refresh() {
  if (!will) return;
  try {
    const [stateCode, lastHb, inactivity, chWindow, triggeredAt, bens, watched] = await Promise.all([
      will.state(),
      will.lastHeartbeat(),
      will.inactivityPeriod(),
      will.challengeWindow(),
      will.triggeredAt(),
      will.beneficiaries(),
      will.getWatchedTokens(),
    ]);

    const state = STATE_NAMES[Number(stateCode)] || "Unknown";
    $("ui-state").textContent = state.toLowerCase();
    $("hero-state").textContent = state.toLowerCase();
    $("ui-heartbeat").textContent = new Date(Number(lastHb) * 1000).toLocaleTimeString();

    document.querySelectorAll(".state-track span").forEach((el) => {
      el.classList.toggle("on", el.dataset.state === state);
    });

    const now = Math.floor(Date.now() / 1000);
    let cdLabel = "trigger in", cdValue = 0, total = Number(inactivity);
    if (state === "Active") {
      cdValue = Math.max(0, Number(lastHb) + Number(inactivity) - now);
      total = Number(inactivity);
    } else if (state === "Triggered") {
      cdLabel = "execute in";
      cdValue = Math.max(0, Number(triggeredAt) + Number(chWindow) - now);
      total = Number(chWindow);
    } else {
      cdLabel = state.toLowerCase();
      cdValue = 0;
      total = 1;
    }
    $("countdown-label").textContent = cdLabel;
    $("ui-countdown").textContent = fmtTime(cdValue);
    $("hero-eta").textContent = fmtTime(cdValue);
    const pct = total > 0 ? Math.min(100, ((total - cdValue) / total) * 100) : 100;
    $("ui-progress").style.width = pct + "%";

    const tile = document.querySelector(".countdown-tile");
    tile.classList.toggle("warn", cdValue < total * 0.4 && cdValue > total * 0.15);
    tile.classList.toggle("crit", cdValue < total * 0.15);

    const benList = $("ui-bens");
    benList.innerHTML = "";
    if (!bens.length) benList.innerHTML = '<li class="muted">none</li>';
    for (const b of bens) {
      const li = document.createElement("li");
      const ens = b.ensName === ("0x" + "00".repeat(32)) ? "(no ens)" : shortAddr(b.ensName);
      li.innerHTML = `<span>${shortAddr(b.payoutAddress)} <span class="muted">${ens}</span></span><b>${(Number(b.sharePoints) / 100).toFixed(1)}%</b>`;
      benList.appendChild(li);
    }
    $("hero-bens").textContent = bens.length;

    const balList = $("ui-balances");
    balList.innerHTML = "";
    for (const t of watched) {
      try {
        const erc = new ethers.Contract(t, ERC20_ABI, provider);
        const [bal, sym, dec] = await Promise.all([erc.balanceOf(cfg.willAddress), erc.symbol().catch(() => "?"), erc.decimals().catch(() => 18)]);
        const li = document.createElement("li");
        li.innerHTML = `<span class="muted">${sym}</span><b>${ethers.formatUnits(bal, dec)}</b>`;
        balList.appendChild(li);
      } catch (e) {
        const li = document.createElement("li");
        li.innerHTML = `<span class="muted">${shortAddr(t)}</span><b>?</b>`;
        balList.appendChild(li);
      }
    }
    if (!watched.length) balList.innerHTML = '<li class="muted">none</li>';

    if (cfg.keeperTokenId) {
      try {
        const k = await keeper.keepers(cfg.keeperTokenId);
        $("keeper-id").textContent = `#${cfg.keeperTokenId}`;
        $("keeper-ens").textContent = shortAddr(k.ensSubname);
        $("keeper-uri").textContent = k.memoryURI || "—";
        $("keeper-uri").title = k.memoryURI;
        $("keeper-alert").textContent = String(k.alertnessScore);
        $("keeper-actions").textContent = String(k.actionsFired);
        $("hero-alert").textContent = String(k.alertnessScore);
        await loadAgentLog(k);
      } catch (_) {}
    }
  } catch (e) {
    log(`refresh error: ${e.message || e}`, "err");
  }
}

const seenLog = new Set();
async function loadAgentLog(k) {
  // pull recent events from the will to populate the log
  const logEl = $("agent-log");
  try {
    const events = await provider.getLogs({
      address: cfg.willAddress,
      fromBlock: -3000,
    });
    if (logEl.children.length === 1 && logEl.children[0].classList.contains("muted")) {
      logEl.innerHTML = "";
    }
    const iface = new ethers.Interface([
      "event Heartbeat(uint256 timestamp)",
      "event Triggered(address indexed caller, uint256 timestamp)",
      "event Cancelled(uint256 timestamp)",
      "event Executed(uint256 totalDistributed, uint256 timestamp)",
      "event BeneficiaryPaid(address indexed to, bytes32 indexed ensName, uint256 amount)",
    ]);
    for (const ev of events) {
      const key = `${ev.transactionHash}-${ev.logIndex}`;
      if (seenLog.has(key)) continue;
      seenLog.add(key);
      let parsed;
      try { parsed = iface.parseLog(ev); } catch { continue; }
      if (!parsed) continue;
      const li = document.createElement("li");
      let cls = "";
      let text = "";
      if (parsed.name === "Heartbeat") text = `heartbeat · owner alive`;
      else if (parsed.name === "Triggered") { text = `triggered by ${shortAddr(parsed.args.caller)}`; cls = "warn"; }
      else if (parsed.name === "Cancelled") text = `owner cancelled — back to active`;
      else if (parsed.name === "Executed") { text = `executed · distributed ${ethers.formatUnits(parsed.args.totalDistributed, 6)} USDC`; cls = "crit"; }
      else if (parsed.name === "BeneficiaryPaid") text = `paid ${shortAddr(parsed.args.to)} → ${ethers.formatUnits(parsed.args.amount, 6)} USDC`;
      li.className = cls;
      li.textContent = text;
      logEl.prepend(li);
    }
    if (logEl.children.length === 0) {
      logEl.innerHTML = '<li class="muted">awaiting events…</li>';
    }
  } catch (_) {}
}

// ----- form: beneficiary rows -----
function addBenRow(addr = "", ens = "", share = "") {
  const row = document.createElement("div");
  row.className = "ben-row";
  row.innerHTML = `
    <input class="ben-addr" placeholder="0x payout address" value="${addr}" />
    <input class="ben-ens" placeholder="alice.eth" value="${ens}" />
    <input class="ben-share" type="number" placeholder="bps" value="${share}" />
    <button type="button" class="rm">×</button>
  `;
  row.querySelector(".rm").addEventListener("click", () => row.remove());
  $("ben-rows").appendChild(row);
}

async function register(e) {
  e.preventDefault();
  if (!signer) { await connect(); }
  const ownerEns = $("ownerEns").value.trim();
  const inactivity = parseInt($("inactivity").value, 10);
  const chWindow = parseInt($("challenge").value, 10);
  const watched = $("watched").value.split(",").map(s => s.trim()).filter(Boolean);
  const passphrase = $("passphrase").value;

  const rows = [...document.querySelectorAll(".ben-row")];
  if (!rows.length) { alert("add at least one beneficiary"); return; }
  const bens = rows.map(r => ({
    payoutAddress: r.querySelector(".ben-addr").value.trim(),
    ensName: namehash(r.querySelector(".ben-ens").value.trim()),
    sharePoints: parseInt(r.querySelector(".ben-share").value, 10) || 0,
  }));
  const totalShares = bens.reduce((s, b) => s + b.sharePoints, 0);
  if (totalShares !== 10000) { alert(`shares must total 10000 bps (got ${totalShares})`); return; }

  log(`registering will for ${ownerEns}…`);

  const ensSubname = namehash(`willkeeper-${Date.now()}.wills.eth`);
  // for v1 we leave the encrypted-doc step client-side; full ENS write happens via CLI
  const memoryURI = "0g+local://pending";

  try {
    const tx = await factory.createWill(
      namehash(ownerEns),
      bens,
      watched,
      inactivity,
      chWindow,
      ensSubname,
      memoryURI,
      account
    );
    log(`tx ${tx.hash} — waiting…`);
    const r = await tx.wait();
    log(`registered. block ${r.blockNumber}`, "ok");

    const ev = r.logs.map(l => { try { return factory.interface.parseLog(l); } catch { return null; } }).find(p => p && p.name === "WillCreated");
    if (ev) {
      cfg.willAddress = ev.args.willAddress;
      cfg.keeperTokenId = Number(ev.args.keeperTokenId);
      log(`will ${shortAddr(cfg.willAddress)} · keeper #${cfg.keeperTokenId}`, "ok");
      await loadWill(cfg.willAddress);
    }

    if (passphrase) {
      log(`note: encrypted document is uploaded server-side via scripts/register_will.py`, "warn");
    }
  } catch (e) {
    log(`register failed: ${e.shortMessage || e.message}`, "err");
  }
}

async function send(method, label) {
  if (!will) return;
  log(`${label}…`);
  try {
    const tx = await will[method]();
    log(`tx ${tx.hash}`);
    await tx.wait();
    log(`${label} confirmed`, "ok");
    await refresh();
  } catch (e) {
    log(`${label} failed: ${e.shortMessage || e.message}`, "err");
  }
}

async function fundWill() {
  if (!cfg.willAddress) { log("no will loaded", "err"); return; }
  log("funding via wallet send… open metamask to confirm a USDC transfer.", "warn");
  const erc = new ethers.Contract(cfg.usdc, ["function transfer(address,uint256) returns (bool)", "function decimals() view returns (uint8)"], signer);
  try {
    const dec = await erc.decimals();
    const tx = await erc.transfer(cfg.willAddress, ethers.parseUnits("10", dec));
    await tx.wait();
    log("funded with 10 USDC", "ok");
    await refresh();
  } catch (e) {
    log(`fund failed: ${e.shortMessage || e.message}`, "err");
  }
}

async function skipTime() {
  try {
    await provider.send("evm_increaseTime", [180]);
    await provider.send("evm_mine", []);
    log("advanced 3 minutes (anvil)", "ok");
    await refresh();
  } catch (e) {
    log(`skip-time only works on a local anvil fork`, "err");
  }
}

// ----- wire up -----
document.addEventListener("DOMContentLoaded", () => {
  $("connect").addEventListener("click", connect);
  $("register-form").addEventListener("submit", register);
  $("add-ben").addEventListener("click", () => addBenRow());
  $("heartbeat-btn").addEventListener("click", () => send("heartbeat", "heartbeat"));
  $("cancel-btn").addEventListener("click", () => send("cancel", "cancel"));
  $("trigger-btn").addEventListener("click", () => send("triggerWill", "trigger"));
  $("execute-btn").addEventListener("click", () => send("execute", "execute"));
  $("fund-btn").addEventListener("click", fundWill);
  $("skip-btn").addEventListener("click", skipTime);
  $("refresh-btn").addEventListener("click", refresh);
  $("watched").value = cfg.usdc;
  addBenRow("", "alice.eth", 6000);
  addBenRow("", "bob.eth", 4000);
  log("frontend ready. connect a wallet to begin.");
});
