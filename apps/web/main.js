// Demandable Web DApp Main JavaScript Logic

// Backend endpoint configuration (falls back to mock database if server is offline)
const API_URL = "http://localhost:8000";

// Simulation Wallets representing different actors with Domesticoin Stable ($DMCS) & Domesticoin Utility ($DMCU)
const WALLETS = {
  homeowner: {
    address: "0x7a839Fde147A3e89DeCb01235477B79a785245d3",
    role: "Homeowner",
    label: "Homeowner (Alice)",
    balanceDMCS: 5000,
    balanceDMCU: 0,
    stakedDMCU: 0
  },
  contractor: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Apex Roofing Specialists address
    role: "Contractor",
    label: "Contractor (Apex Roofing)",
    balanceDMCS: 1000,
    balanceDMCU: 500,
    stakedDMCU: 0
  },
  inspector: {
    address: "0x90F8bf323369FD0297AB4208f93D8b8490b4698e", // Bob address
    role: "Inspector / Peer Pro",
    label: "Inspector (Bob - Precision Tile)",
    balanceDMCS: 800,
    balanceDMCU: 1200,
    stakedDMCU: 0
  },
  juror: {
    address: "0x2546BcD3c84621e9a6d9435b474955bbf8d7e1fd",
    role: "Jury Pool Member",
    label: "Juror (Charlie - EcoClean)",
    balanceDMCS: 200,
    balanceDMCU: 2000,
    stakedDMCU: 0
  }
};

// UX Terminology Translation Mappings
const UX_TRANSLATIONS = {
  traditional: {
    "wallet-connect": "Access Secure Account",
    "wallet-status-disconnected": "Account Not Connected",
    "wallet-status-connected": "Secure Account Active",
    "escrow-header": "Standard Contract & Service Deposit",
    "bid-placeholder": "Paste the contractor's raw estimate text here. Our system will distill it into clear project milestones...",
    "fund-btn-text": "Fund Deposit & Activate Contract",
    "total-cost-label": "Total Cost:",
    "inspector-staking-header": "Expert Verification & Inspection Bond",
    "register-inspector-btn": "Register as Verification Expert",
    "staked-label": "Your Security Bond",
    "stake-btn": "Deposit 500 Reputation Points",
    "dispute-header": "Disagreement Review Panel",
    "dispute-desc": "Review disagreements on project milestones. Aligning with other experts earns you part of the review fee. Incorrect feedback reduces your reputation points.",
    "raise-dispute-btn": "Submit to Dispute Review",
    "job-status-disputed": "⚠️ Under Review",
    "vote-contractor-btn": "Support Contractor",
    "vote-homeowner-btn": "Support Customer",
    "resolve-btn": "Simulate 7 days & Tally Decision",
    "token-symbol-dmcs": "USD",
    "token-symbol-dmcu": "Reputation Points",
    "inspector-jobs-title": "Milestone Inspections Assigned To You",
    "inspector-jobs-empty": "No inspection requests assigned to you.",
    "contractor-jobs-title": "Active Service Projects",
    "job-label": "Project",
    "contractor-label": "Service Provider",
    "customer-label": "Customer",
    "inspecting-reward": "Reward:",
    "active-milestone": "Current Step",
    "all-milestones-completed": "All steps completed successfully"
  },
  hybrid: {
    "wallet-connect": "Connect Secure Wallet (Base)",
    "wallet-status-disconnected": "Wallet Not Connected",
    "wallet-status-connected": "Secure Wallet Connected",
    "escrow-header": "Escrow Deposit (USD Stablecoin)",
    "bid-placeholder": "Paste the contractor's raw estimate text here. The AI Agent will convert it to blockchain escrow milestones...",
    "fund-btn-text": "Fund Escrow & Deploy Smart Contract",
    "total-cost-label": "Total Escrow Cost:",
    "inspector-staking-header": "Inspector Staking & Escrow Audit",
    "register-inspector-btn": "Register as Inspector (Stake DMCU)",
    "staked-label": "Your Staked Balance (DMCU)",
    "stake-btn": "Stake 500 $DMCU",
    "dispute-header": "Jury Pool & Schelling Point Voting",
    "dispute-desc": "Stake your $DMCU to vote on disputes. Voting with the majority distributes a share of the loser's arbitration fee ($DMCS). Incorrect votes result in a token slash.",
    "raise-dispute-btn": "Raise Escrow Dispute",
    "job-status-disputed": "⚠️ Disputed (Voting Active)",
    "vote-contractor-btn": "Vote Contractor (Coherent)",
    "vote-homeowner-btn": "Vote Homeowner (Coherent)",
    "resolve-btn": "Simulate 7 days & Tally Votes",
    "token-symbol-dmcs": "DMCS",
    "token-symbol-dmcu": "DMCU",
    "inspector-jobs-title": "Escrow Audits Assigned To You",
    "inspector-jobs-empty": "No audit requests assigned to you.",
    "contractor-jobs-title": "Escrow Projects",
    "job-label": "Escrow #",
    "contractor-label": "Contractor",
    "customer-label": "Homeowner",
    "inspecting-reward": "Auditor Reward:",
    "active-milestone": "Active Milestone",
    "all-milestones-completed": "All milestones resolved"
  },
  native: {
    "wallet-connect": "Connect Coinbase Smart Wallet",
    "wallet-status-disconnected": "Wallet Not Connected",
    "wallet-status-connected": "Wallet Connected",
    "escrow-header": "Smart Contract Escrow Generation",
    "bid-placeholder": "Paste the contractor's raw estimate text here. The AI Agent will distill it into binding smart contract milestones...",
    "fund-btn-text": "Fund Escrow & Deploy Smart Contract",
    "total-cost-label": "Total Cost:",
    "inspector-staking-header": "Peer Inspector Staking & Duties",
    "register-inspector-btn": "Register as Inspector",
    "staked-label": "Your Staked Balance",
    "stake-btn": "Stake 500 $DMCU",
    "dispute-header": "Decentralized Dispute Jury (Schelling Point)",
    "dispute-desc": "Stake your `$DMCU` to vote on disputes. Voting correctly (coherently with majority) distributes a share of the loser's arbitration fee. Voting incorrectly slashes 10% of your voting stake.",
    "raise-dispute-btn": "Escalate to Dispute Jury",
    "job-status-disputed": "⚠️ Contract Disputed",
    "vote-contractor-btn": "Vote Contractor",
    "vote-homeowner-btn": "Vote Homeowner",
    "resolve-btn": "Simulate 7 days & Tally Vote",
    "token-symbol-dmcs": "$DMCS",
    "token-symbol-dmcu": "$DMCU",
    "inspector-jobs-title": "Milestone Inspections Assigned To You",
    "inspector-jobs-empty": "No active milestone inspections assigned to your address.",
    "contractor-jobs-title": "Contractor Active Jobs",
    "job-label": "Job #",
    "contractor-label": "Vetted Pro",
    "customer-label": "Homeowner",
    "inspecting-reward": "Reward:",
    "active-milestone": "Active Milestone",
    "all-milestones-completed": "All milestones completed"
  }
};

// Global App State
let uxMode = localStorage.getItem("dw_ux_mode") || "traditional";
let currentActor = null; // Cycles through WALLETS
let activeTab = "homeowner";
let matchedContractors = [];
let selectedContractor = null;
let parsedMilestones = null;

// Mock blockchain database stored in localStorage for persistence
let db = {
  jobs: [],
  disputes: []
};

// Load database from storage if exists
if (localStorage.getItem("dw_blockchain_db")) {
  db = JSON.parse(localStorage.getItem("dw_blockchain_db"));
}

function saveDB() {
  localStorage.setItem("dw_blockchain_db", JSON.stringify(db));
}

// Translate Term Helper
function getUXTerm(termKey) {
  const modeTerms = UX_TRANSLATIONS[uxMode] || UX_TRANSLATIONS["traditional"];
  const term = modeTerms[termKey];
  if (!term) return "";
  
  // If hybrid mode, add descriptive tooltips to make it educational
  if (uxMode === 'hybrid') {
    if (termKey === 'wallet-connect' || termKey === 'wallet-status-connected') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">A wallet is a secure digital account on the blockchain that acts as your identity and holds funds.</span></span>`;
    }
    if (termKey === 'escrow-header') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">Escrow is a secure smart contract that holds project funds until milestones are audited and verified.</span></span>`;
    }
    if (termKey === 'fund-btn-text') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">Deploys automated code to the blockchain, locking funds in escrow to protect both parties.</span></span>`;
    }
    if (termKey === 'inspector-staking-header') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">Auditors stake tokens as collateral. Being dishonest results in losing (slashing) their collateral.</span></span>`;
    }
    if (termKey === 'dispute-header') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">A game-theoretic voting system (Schelling Point) where stakers vote honestly to reach agreement.</span></span>`;
    }
    if (termKey === 'token-symbol-dmcs') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">Domesticoin Stablecoin ($DMCS) is a token pegged 1:1 to the US Dollar value.</span></span>`;
    }
    if (termKey === 'token-symbol-dmcu') {
      return `<span class="ux-tooltip">${term}<span class="ux-tooltiptext">Domesticoin Utility ($DMCU) is a token used to stake, vote, and earn rewards.</span></span>`;
    }
  }
  return term;
}

// Apply Selected UX Level Terminology and Displays
function applyUXMode() {
  // Update elements with data-ux-term
  const elements = document.querySelectorAll("[data-ux-term]");
  elements.forEach(el => {
    const termKey = el.dataset.uxTerm;
    const translation = getUXTerm(termKey);
    if (translation) {
      el.innerHTML = translation;
    }
  });

  // Translate input/textarea placeholders
  const bidText = document.getElementById("bidText");
  if (bidText) {
    bidText.setAttribute("placeholder", getUXTerm("bid-placeholder"));
  }

  // Update change settings indicator text
  const currentUXDisplay = document.getElementById("currentUXDisplay");
  if (currentUXDisplay) {
    currentUXDisplay.textContent = uxMode.charAt(0).toUpperCase() + uxMode.slice(1);
  }

  // Hide or Show technical developer attributes
  const advancedEls = document.querySelectorAll(".ux-advanced");
  advancedEls.forEach(el => {
    if (uxMode === 'traditional') {
      el.classList.add("hidden");
    } else {
      el.classList.remove("hidden");
    }
  });

  // Highlight selection in Onboarding Dialog
  const cards = document.querySelectorAll(".onboarding-card");
  cards.forEach(card => {
    if (card.dataset.level === uxMode) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  const startBtn = document.getElementById("startAppBtn");
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = `Launch DApp (${uxMode.charAt(0).toUpperCase() + uxMode.slice(1)} Mode)`;
  }
}

// Initialization and Setup
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupWallet();
  setupOnboarding();
  setupHomeownerEvents();
  setupContractorEvents();
  setupInspectorEvents();
  renderAll();
});

// Onboarding Modal Handling
function setupOnboarding() {
  const modal = document.getElementById("onboardingModal");
  const changeUXBtn = document.getElementById("changeUXBtn");
  const startAppBtn = document.getElementById("startAppBtn");
  const cards = document.querySelectorAll(".onboarding-card");

  // Show onboarding overlay if it's the first visit
  if (!localStorage.getItem("dw_ux_onboarded")) {
    setTimeout(() => {
      modal.showModal();
      applyUXMode();
    }, 300);
  }

  // Setup click handlers for modal cards selection
  cards.forEach(card => {
    card.addEventListener("click", () => {
      uxMode = card.dataset.level;
      localStorage.setItem("dw_ux_mode", uxMode);
      applyUXMode();
    });
  });

  // Submit/close modal
  startAppBtn.addEventListener("click", () => {
    localStorage.setItem("dw_ux_onboarded", "true");
    modal.close();
    renderAll();
  });

  // Open modal anytime via Settings toggler
  changeUXBtn.addEventListener("click", () => {
    modal.showModal();
    applyUXMode();
  });

  // Backdrop light dismiss fallback for older browsers
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    modal.addEventListener("click", (event) => {
      if (event.target !== modal) return;
      
      const rect = modal.getBoundingClientRect();
      const isInsideContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );

      if (!isInsideContent && localStorage.getItem("dw_ux_onboarded")) {
        modal.close();
      }
    });
  }
}

// Tab Switcher Setup
function setupTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const tabId = tab.dataset.tab;
      activeTab = tabId;
      
      document.querySelectorAll(".tab-view").forEach(view => {
        view.classList.remove("active");
      });
      document.getElementById(`tab-${tabId}`).classList.add("active");
      
      renderAll();
    });
  });
}

// Toast helper
function showToast(text, isError = false) {
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  const toastIcon = document.getElementById("toastIcon");
  
  toast.className = `toast-msg ${isError ? 'error' : ''}`;
  toastText.textContent = text;
  toastIcon.textContent = isError ? "⚠" : "ℹ";
  toast.style.display = "flex";
  
  setTimeout(() => {
    toast.style.display = "none";
  }, 5000);
}

// Wallet setup
function setupWallet() {
  const walletBtn = document.getElementById("walletBtn");
  
  walletBtn.addEventListener("click", () => {
    const roles = Object.keys(WALLETS);
    if (!currentActor) {
      currentActor = "homeowner";
      walletBtn.classList.add("connected");
      
      const friendlyName = WALLETS[currentActor].label.split(" (")[0];
      if (uxMode === 'traditional') {
        showToast(`Secure Account Access granted for ${friendlyName}`);
      } else {
        showToast(`Connected Wallet: ${WALLETS[currentActor].label}`);
      }
    } else {
      // Cycle through actors for easy demoing
      const currIdx = roles.indexOf(currentActor);
      const nextIdx = (currIdx + 1) % roles.length;
      currentActor = roles[nextIdx];
      
      const friendlyName = WALLETS[currentActor].label.split(" (")[0];
      if (uxMode === 'traditional') {
        showToast(`Switched active profile to ${friendlyName}`);
      } else {
        showToast(`Switched active wallet to ${WALLETS[currentActor].label}`);
      }
    }
    
    // Save active wallet status
    renderAll();
  });
}

// Homeowner Logic
function setupHomeownerEvents() {
  const matchBtn = document.getElementById("matchBtn");
  const analyzeBidBtn = document.getElementById("analyzeBidBtn");
  const fundEscrowBtn = document.getElementById("fundEscrowBtn");

  matchBtn.addEventListener("click", async () => {
    if (!currentActor) {
      showToast("Please connect your wallet first", true);
      return;
    }
    
    const query = document.getElementById("searchQuery").value.trim();
    const category = document.getElementById("searchCategory").value;
    const radius = parseFloat(document.getElementById("searchRadius").value);
    
    if (!query) {
      showToast("Please enter a service query", true);
      return;
    }

    matchBtn.disabled = true;
    matchBtn.textContent = "AI Matching in progress...";

    try {
      // Attempt to hit the FastAPI backend
      const res = await fetch(`${API_URL}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          category: category,
          latitude: 37.7749, // Default to San Francisco
          longitude: -122.4194,
          limit: 3
        })
      });

      if (res.ok) {
        const data = await res.json();
        matchedContractors = data.matches;
        showToast("AI Match results fetched from backend server.");
      } else {
        throw new Error("API Offline");
      }
    } catch (e) {
      // Fallback matching logic in browser
      console.log("Using browser-side fallback matching logic...");
      const fallbackList = [
        {
          walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          name: "Apex Roofing Specialists",
          category: "Roofing",
          distance: 2.3,
          score: 0.945,
          metadataURI: "ipfs://factual-profile-data-apex",
          pros: ["C-39 Licensed Roofing Contractor", "Utilizes drone imagery and thermal scan equipment", "142 jobs completed without unresolved customer disputes"],
          cons: ["High demand structure, minimum project sizes of 500 DMCS may apply"]
        },
        {
          walletAddress: "0x90F8bf323369FD0297AB4208f93D8b8490b4698e",
          name: "Precision Tile & Roof Co",
          category: "Roofing",
          distance: 1.1,
          score: 0.812,
          metadataURI: "ipfs://factual-profile-data-precision",
          pros: ["Specialized in clay tile and slate repairs", "Local operations structure with rapid dispatch"],
          cons: ["Operation radius restricted to 15 miles", "Lacks structural sheet metal equipment"]
        },
        {
          walletAddress: "0x2546BcD3c84621e9a6d9435b474955bbf8d7e1fd",
          name: "EcoClean Housekeeping",
          category: "Housekeeping",
          distance: 4.8,
          score: 0.967,
          metadataURI: "ipfs://factual-profile-data-ecoclean",
          pros: ["Green Clean Certified environment", "Biodegradable chemical supply line verified", "310 jobs executed"],
          cons: ["Excludes industrial/construction site cleaning, strictly routine domestic support"]
        },
        {
          walletAddress: "0xcd3B766CCDd6AE471129600F2cd16d7a469B56e7",
          name: "A+ STEM Tutoring",
          category: "Tutoring",
          distance: 3.5,
          score: 0.92,
          metadataURI: "ipfs://factual-profile-data-tutoring",
          pros: ["Educators hold background check certifications", "Specialized physics and math support focus"],
          cons: ["Limited in-person service times; mostly remote study options offered"]
        }
      ];
      
      matchedContractors = fallbackList.filter(c => c.category === category);
      showToast("Flipped to local fallback contractor matching registry.");
    }

    matchBtn.disabled = false;
    matchBtn.innerHTML = "<span>🔍</span> AI Match Contractors";
    renderContractors();
  });

  analyzeBidBtn.addEventListener("click", async () => {
    const bidText = document.getElementById("bidText").value.trim();
    if (!bidText) {
      showToast("Please input contractor bid text", true);
      return;
    }

    analyzeBidBtn.disabled = true;
    analyzeBidBtn.textContent = "Analyzing estimate...";

    try {
      const res = await fetch(`${API_URL}/analyze-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_text: bidText })
      });

      if (res.ok) {
        parsedMilestones = await res.json();
        showToast("Estimate deconstructed via Gemini AI backend.");
      } else {
        throw new Error("API Offline");
      }
    } catch (e) {
      // Local fallback parser
      console.log("Using browser-side fallback bid parsing...");
      parsedMilestones = {
        milestones: [
          { amount: 600, description: "Milestone 1: Clean deck, repair wood substrates and lay waterproofing sheet" },
          { amount: 400, description: "Milestone 2: Install shingles, flashings, chimney seal and execute site cleaning" }
        ],
        totalAmount: 1000,
        contractMetadataURI: "ipfs://deconstructed-roofing-bid-specs"
      };
      showToast("Bid parsed using local mockup translator.");
    }

    analyzeBidBtn.disabled = false;
    analyzeBidBtn.innerHTML = "<span>⚙</span> Deconstruct Estimate via AI";
    renderMilestones();
  });

  fundEscrowBtn.addEventListener("click", () => {
    if (!currentActor || currentActor !== "homeowner") {
      const actorLabel = getUXTerm("customer-label");
      showToast(`Switch to ${actorLabel} to fund the project deposit`, true);
      return;
    }

    const homeownerInfo = WALLETS.homeowner;
    const totalCost = parsedMilestones.totalAmount;

    if (homeownerInfo.balanceDMCS < totalCost) {
      showToast(`Insufficient ${getUXTerm("token-symbol-dmcs")} balance`, true);
      return;
    }

    // Deploy contract simulation
    homeownerInfo.balanceDMCS -= totalCost;
    
    // Add job to local blockchain db
    const jobId = db.jobs.length + 1;
    const newJob = {
      id: jobId,
      homeowner: homeownerInfo.address,
      contractor: selectedContractor.walletAddress,
      contractorName: selectedContractor.name,
      totalAmount: totalCost,
      status: "Active",
      currentMilestoneIndex: 0,
      metadataURI: parsedMilestones.contractMetadataURI,
      milestones: parsedMilestones.milestones.map(m => ({
        ...m,
        status: "Pending",
        assignedInspector: null
      }))
    };

    db.jobs.push(newJob);
    saveDB();
    
    if (uxMode === 'traditional') {
      showToast(`Activated project agreement #${jobId}. Funded $${totalCost} USD.`);
    } else {
      showToast(`Deployed DWEscrow smart contract (Job ID: #${jobId}). Funded ${totalCost} $DMCS into escrow.`);
    }
    
    // Reset inputs
    selectedContractor = null;
    parsedMilestones = null;
    document.getElementById("bidText").value = "";
    
    renderAll();
  });
}

// Contractor Logic
function setupContractorEvents() {
  // Setup logic handles clicking buttons dynamically inside cards
}

// Inspector Logic
function setupInspectorEvents() {
  const stakeDWGBtn = document.getElementById("stakeDWGBtn");
  const registerInspectorBtn = document.getElementById("registerInspectorBtn");

  stakeDWGBtn.addEventListener("click", () => {
    if (!currentActor) {
      showToast("Connect your wallet first", true);
      return;
    }

    const actor = WALLETS[currentActor];
    if (actor.balanceDMCU < 500) {
      showToast(`Need at least 500 ${getUXTerm("token-symbol-dmcu")} in balance`, true);
      return;
    }

    actor.balanceDMCU -= 500;
    actor.stakedDMCU += 500;
    
    if (uxMode === 'traditional') {
      showToast(`Bonded 500 Reputation Points to qualify as verification expert.`);
    } else {
      showToast(`Staked 500 $DMCU to qualify as platform inspector`);
    }
    
    renderAll();
  });

  registerInspectorBtn.addEventListener("click", () => {
    if (!currentActor) return;
    const actor = WALLETS[currentActor];
    if (actor.stakedDMCU < 500) {
      showToast(`Must have staked at least 500 ${getUXTerm("token-symbol-dmcu")}`, true);
      return;
    }
    
    if (uxMode === 'traditional') {
      showToast(`Successfully registered as verification expert!`);
    } else {
      showToast(`Successfully registered ${actor.address.slice(0,6)}... as active inspector!`);
    }
    renderAll();
  });
}

// Rendering Functions
function renderAll() {
  renderWalletStatus();
  renderContractors();
  renderMilestones();
  renderContractorJobs();
  renderInspectorJobs();
  renderDisputes();
  applyUXMode();
}

function renderWalletStatus() {
  const walletBtn = document.getElementById("walletBtn");
  const walletText = document.getElementById("walletText");
  const contractorWalletDisplay = document.getElementById("contractorWalletDisplay");
  
  if (!currentActor) {
    walletText.textContent = getUXTerm("wallet-connect");
    contractorWalletDisplay.textContent = getUXTerm("wallet-status-disconnected");
    return;
  }
  
  const actor = WALLETS[currentActor];
  
  if (uxMode === 'traditional') {
    walletText.textContent = `${actor.label.split(' (')[0]} ($${actor.balanceDMCS} USD)`;
    contractorWalletDisplay.textContent = `${currentActor === 'contractor' ? 'Active Profile' : 'Viewing Role'}`;
    document.getElementById("stakedDMCU").textContent = `${actor.stakedDMCU.toFixed(0)} Points`;
  } else if (uxMode === 'hybrid') {
    walletText.textContent = `${actor.label} ($${actor.balanceDMCS} USD Stable | ${actor.balanceDMCU} DMCU)`;
    contractorWalletDisplay.textContent = `${currentActor === 'contractor' ? 'Active' : 'Viewing Role'} — ${actor.address.slice(0, 10)}...`;
    document.getElementById("stakedDMCU").textContent = `${actor.stakedDMCU.toFixed(1)} DMCU`;
  } else {
    walletText.textContent = `${actor.label} (${actor.balanceDMCS} DMCS | ${actor.balanceDMCU} DMCU)`;
    contractorWalletDisplay.textContent = `${currentActor === 'contractor' ? 'Active' : 'Viewing Role'} — ${actor.address.slice(0, 10)}...`;
    document.getElementById("stakedDMCU").textContent = `${actor.stakedDMCU.toFixed(1)} DMCU`;
  }
}

function renderContractors() {
  const list = document.getElementById("contractorsList");
  list.innerHTML = "";
  
  if (matchedContractors.length === 0) {
    list.innerHTML = `<div class="text-muted" style="text-align: center; font-size: 0.85rem; padding: 1rem 0;">Run AI Match to populate listings from the decentralized registry.</div>`;
    return;
  }

  matchedContractors.forEach(c => {
    const card = document.createElement("div");
    card.className = "factual-pro-card";
    
    const isSelected = selectedContractor && selectedContractor.walletAddress === c.walletAddress;
    if (isSelected) {
      card.style.borderColor = "var(--accent-cyan)";
      card.style.background = "rgba(0, 245, 255, 0.02)";
    }

    const displayCons = c.cons.map(cn => {
      return cn.replace("DWS", getUXTerm("token-symbol-dmcs"));
    });

    card.innerHTML = `
      <div class="pro-header">
        <div>
          <div class="pro-name">${c.name}</div>
          <div class="ux-advanced" style="font-size: 0.75rem; color: var(--text-muted);">${c.walletAddress}</div>
        </div>
        <div class="pro-metric" style="text-align: right;">
          <div style="color: var(--accent-mint); font-weight: 600;">Match: ${(c.score * 100).toFixed(1)}%</div>
          <div>Distance: ${c.distance} mi</div>
        </div>
      </div>
      <div class="pro-pros-cons">
        <div class="pros-list">
          <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.2rem;">Verified Pros</div>
          ${c.pros.map(p => `<span>${p}</span>`).join('')}
        </div>
        <div class="cons-list">
          <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.2rem;">Factual Cons</div>
          ${displayCons.map(cn => `<span>${cn}</span>`).join('')}
        </div>
      </div>
      <button class="select-pro-btn" data-address="${c.walletAddress}">
        ${isSelected ? 'Selected' : 'Select Provider'}
      </button>
    `;

    card.querySelector(".select-pro-btn").addEventListener("click", () => {
      selectedContractor = c;
      const displayBadge = document.getElementById("selectedContractorBadge");
      displayBadge.textContent = `Selected: ${c.name}`;
      displayBadge.style.display = "inline-block";
      
      // Enable Escrow Creation Inputs
      document.getElementById("escrowCreationSection").style.opacity = "1";
      document.getElementById("escrowCreationSection").style.pointerEvents = "auto";
      
      renderContractors();
      showToast(`Selected ${c.name}. You can now paste their bid estimate to analyze.`);
    });

    list.appendChild(card);
  });
}

function renderMilestones() {
  const container = document.getElementById("milestonesContainer");
  const panel = document.getElementById("parsedContractDetails");
  
  if (!parsedMilestones) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  container.innerHTML = "";

  parsedMilestones.milestones.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = "milestone-item";
    div.innerHTML = `
      <div class="milestone-name">${getUXTerm("active-milestone")} #${idx + 1}: ${m.description}</div>
      <div class="milestone-value">${m.amount} ${getUXTerm("token-symbol-dmcs")}</div>
    `;
    container.appendChild(div);
  });

  document.getElementById("totalEscrowCost").textContent = `${parsedMilestones.totalAmount} ${getUXTerm("token-symbol-dmcs")}`;
}

function renderContractorJobs() {
  const list = document.getElementById("contractorJobsList");
  list.innerHTML = "";

  if (db.jobs.length === 0) {
    list.innerHTML = `<div class="text-muted" style="text-align: center; padding: 20px;">No active service projects registered. Create a project first.</div>`;
    return;
  }

  db.jobs.forEach(job => {
    const activeIdx = job.currentMilestoneIndex;
    
    let activeMilestoneText = getUXTerm("all-milestones-completed");
    let milestoneAmount = "";
    
    if (activeIdx < job.milestones.length) {
      activeMilestoneText = `${getUXTerm("active-milestone")} #${activeIdx + 1}: ${job.milestones[activeIdx].description}`;
      milestoneAmount = `${job.milestones[activeIdx].amount} ${getUXTerm("token-symbol-dmcs")}`;
    }

    const jobCard = document.createElement("div");
    jobCard.className = "factual-pro-card";
    
    let actionButton = "";
    if (job.status === "Active" && activeIdx < job.milestones.length) {
      const activeM = job.milestones[activeIdx];
      if (activeM.status === "Pending" || activeM.status === "Rejected") {
        actionButton = `<button class="select-pro-btn request-verify-btn" data-job="${job.id}" style="background: var(--accent-purple); color: white;">Request Step Verification</button>`;
      } else if (activeM.status === "Requested") {
        actionButton = `<span class="text-muted" style="font-size: 0.85rem; font-style: italic;">Verification Requested (${activeM.assignedInspector ? 'Inspector Assigned' : 'Finding Inspector...'})</span>`;
      }
    } else if (job.status === "Disputed") {
      actionButton = `<span style="color: var(--accent-red); font-size: 0.85rem; font-weight: bold;">⚠️ Project Disputed. Resolution pending review.</span>`;
    }

    // Add Dispute escalation button if milestone was rejected
    let disputeButton = "";
    if (job.status === "Active" && activeIdx < job.milestones.length) {
      if (job.milestones[activeIdx].status === "Rejected") {
        disputeButton = `<button class="select-pro-btn raise-dispute-btn" data-job="${job.id}" style="background: var(--accent-red); color: white; border-color: var(--accent-red);">${getUXTerm("raise-dispute-btn")}</button>`;
      }
    }

    jobCard.innerHTML = `
      <div class="pro-header">
        <div>
          <div class="pro-name"><span data-ux-term="job-label">Project</span> #${job.id} — <span data-ux-term="contractor-label">Service Provider</span>: ${job.contractorName}</div>
          <div class="ux-advanced" style="font-size: 0.75rem; color: var(--text-muted);"><span data-ux-term="customer-label">Customer</span>: ${job.homeowner}</div>
        </div>
        <div class="pro-metric" style="text-align: right;">
          <div style="color: var(--accent-cyan); font-weight: 700;">Status: <span data-ux-term="job-status-${job.status.toLowerCase()}">${job.status}</span></div>
          <div>Total cost: ${job.totalAmount} ${getUXTerm("token-symbol-dmcs")}</div>
        </div>
      </div>
      <div style="font-size: 0.9rem; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 6px;">
        <div style="font-weight: 600; margin-bottom: 0.2rem; color: var(--text-secondary);">${activeMilestoneText}</div>
        <div style="font-size: 0.8rem; color: var(--accent-cyan);">${milestoneAmount}</div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
        ${disputeButton}
        ${actionButton}
      </div>
    `;

    // Hook events
    const verifyBtn = jobCard.querySelector(".request-verify-btn");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", () => {
        if (!currentActor || currentActor !== "contractor") {
          showToast("Switch to Contractor wallet to request verification", true);
          return;
        }
        
        // Trigger verification request on active milestone
        const m = job.milestones[activeIdx];
        m.status = "Requested";
        
        // Randomly assign inspector (Bob)
        m.assignedInspector = WALLETS.inspector.address;
        
        saveDB();
        showToast("Submitted milestone verification request to network inspectors.");
        renderAll();
      });
    }

    const disputeBtn = jobCard.querySelector(".raise-dispute-btn");
    if (disputeBtn) {
      disputeBtn.addEventListener("click", () => {
        if (!currentActor) {
          showToast("Please connect your wallet first", true);
          return;
        }

        const actor = WALLETS[currentActor];
        if (actor.balanceDMCS < 20) {
          showToast(`Must have at least 20 ${getUXTerm("token-symbol-dmcs")} in wallet to pay the flat review fee`, true);
          return;
        }

        actor.balanceDMCS -= 20;
        job.status = "Disputed";

        // Create dispute listing
        db.disputes.push({
          jobId: job.id,
          contractorName: job.contractorName,
          milestoneIndex: activeIdx,
          milestoneAmount: job.milestones[activeIdx].amount,
          description: job.milestones[activeIdx].description,
          homeownerVotes: 0,
          contractorVotes: 0,
          votedUsers: [],
          resolved: false
        });

        saveDB();
        showToast(`Dispute raised on Job #${job.id}. Locked 20 ${getUXTerm("token-symbol-dmcs")} review fee.`);
        renderAll();
      });
    }

    list.appendChild(jobCard);
  });
}

function renderInspectorJobs() {
  const list = document.getElementById("inspectorJobsList");
  list.innerHTML = "";

  let count = 0;
  db.jobs.forEach(job => {
    const mIdx = job.currentMilestoneIndex;
    if (job.status === "Active" && mIdx < job.milestones.length) {
      const m = job.milestones[mIdx];
      if (m.status === "Requested" && m.assignedInspector === WALLETS.inspector.address) {
        count++;
        const card = document.createElement("div");
        card.className = "factual-pro-card";
        card.innerHTML = `
          <div class="pro-header">
            <div>
              <div class="pro-name">Milestone Inspection — Job #${job.id}</div>
              <div class="ux-advanced" style="font-size: 0.75rem; color: var(--text-muted);">Contractor: ${job.contractorName}</div>
            </div>
            <div style="color: var(--accent-cyan); font-weight: 600;">Reward: 50.0 ${getUXTerm("token-symbol-dmcu")}</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            <strong>Scope to verify:</strong> ${m.description}
          </div>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="select-pro-btn reject-btn" style="background: rgba(255,51,102,0.1); border-color: var(--accent-red); color: var(--accent-red);">Reject Work</button>
            <button class="select-pro-btn approve-btn" style="background: rgba(0,255,204,0.1); border-color: var(--accent-mint); color: var(--accent-mint);">Approve Work</button>
          </div>
        `;

        card.querySelector(".approve-btn").addEventListener("click", () => {
          if (!currentActor || currentActor !== "inspector") {
            showToast("Switch to Inspector wallet to verify work", true);
            return;
          }
          
          m.status = "Approved";
          job.currentMilestoneIndex++;
          
          // Pay contractor
          WALLETS.contractor.balanceDMCS += m.amount;
          // Reward inspector in DMCU
          WALLETS.inspector.balanceDMCU += 50;

          if (job.currentMilestoneIndex === job.milestones.length) {
            job.status = "Completed";
          }
          
          saveDB();
          showToast(`Milestone approved. Released ${m.amount} ${getUXTerm("token-symbol-dmcs")} to contractor, and rewarded inspector.`);
          renderAll();
        });

        card.querySelector(".reject-btn").addEventListener("click", () => {
          if (!currentActor || currentActor !== "inspector") {
            showToast("Switch to Inspector wallet to verify work", true);
            return;
          }
          
          m.status = "Rejected";
          saveDB();
          showToast("Work rejected. Contractor notified to rectify or raise a dispute.");
          renderAll();
        });

        list.appendChild(card);
      }
    }
  });

  if (count === 0) {
    list.innerHTML = `<div class="text-muted" style="text-align: center; padding: 10px; font-size: 0.85rem;">No active milestone inspections assigned to your address.</div>`;
  }
}

function renderDisputes() {
  const list = document.getElementById("disputesList");
  list.innerHTML = "";

  const activeDisputes = db.disputes.filter(d => !d.resolved);

  if (activeDisputes.length === 0) {
    list.innerHTML = `<div class="text-muted" style="text-align: center; padding: 10px; font-size: 0.85rem;">No active contractor disputes in the network.</div>`;
    return;
  }

  activeDisputes.forEach(d => {
    const card = document.createElement("div");
    card.className = "factual-pro-card";

    // Check if current user has already voted
    let userHasVoted = false;
    if (currentActor) {
      userHasVoted = d.votedUsers.includes(WALLETS[currentActor].address);
    }

    let votingButtons = "";
    if (!userHasVoted) {
      votingButtons = `
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
          <button class="select-pro-btn vote-contractor-btn" style="border-color: var(--accent-purple); color: var(--text-primary);">${getUXTerm("vote-contractor-btn")}</button>
          <button class="select-pro-btn vote-homeowner-btn" style="border-color: var(--accent-cyan); color: var(--text-primary);">${getUXTerm("vote-homeowner-btn")}</button>
        </div>
      `;
    } else {
      votingButtons = `<div style="font-size: 0.8rem; font-style: italic; color: var(--accent-mint); text-align: right; margin-top: 0.5rem;">✓ You have voted on this dispute</div>`;
    }

    card.innerHTML = `
      <div class="pro-header">
        <div>
          <div class="pro-name">Dispute on Job #${d.jobId} — ${d.contractorName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Disputed milestone cost: ${d.milestoneAmount} ${getUXTerm("token-symbol-dmcs")}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--accent-red); font-weight: bold;">Active Voting</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">Votes: H: ${d.homeownerVotes} | C: ${d.contractorVotes}</div>
        </div>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
        <strong>Disputed scope:</strong> ${d.description}
      </div>
      
      ${votingButtons}
      
      <button class="btn-primary resolve-btn" style="margin-top: 0.75rem; padding: 0.4rem; font-size: 0.8rem; background: var(--text-muted); width: auto; align-self: flex-end;">
        ${getUXTerm("resolve-btn")}
      </button>
    `;

    // Hook vote events
    const voteH = card.querySelector(".vote-homeowner-btn");
    const voteC = card.querySelector(".vote-contractor-btn");
    const resolve = card.querySelector(".resolve-btn");

    if (voteH) {
      voteH.addEventListener("click", () => {
        castVote(d, true);
      });
    }
    if (voteC) {
      voteC.addEventListener("click", () => {
        castVote(d, false);
      });
    }

    resolve.addEventListener("click", () => {
      resolveDisputeTally(d);
    });

    list.appendChild(card);
  });
}

function castVote(dispute, voteForHomeowner) {
  if (!currentActor) {
    showToast("Connect your wallet first", true);
    return;
  }

  const actor = WALLETS[currentActor];
  if (actor.stakedDMCU < 250) {
    showToast(`Must have at least 250 ${getUXTerm("token-symbol-dmcu")} bonded to vote`, true);
    return;
  }

  // Record vote
  dispute.votedUsers.push(actor.address);
  if (voteForHomeowner) {
    dispute.homeownerVotes++;
  } else {
    dispute.contractorVotes++;
  }

  saveDB();
  
  if (uxMode === 'traditional') {
    showToast(`Voted for ${voteForHomeowner ? 'Customer' : 'Contractor'}. Locked 250 Reputation Points.`);
  } else {
    showToast(`Voted for ${voteForHomeowner ? 'Homeowner' : 'Contractor'}. Locked 250 $DMCU for jury duty.`);
  }
  
  renderAll();
}

function resolveDisputeTally(dispute) {
  dispute.resolved = true;
  
  // Find associated job
  const job = db.jobs.find(j => j.id === dispute.jobId);
  job.status = "Resolved";
  
  const homeownerWon = dispute.homeownerVotes >= dispute.contractorVotes;
  
  // Distribute escrow funds to winner
  if (homeownerWon) {
    // Refund milestone amount to homeowner wallet
    WALLETS.homeowner.balanceDMCS += dispute.milestoneAmount;
    showToast(`Dispute resolved. Refunded ${dispute.milestoneAmount} ${getUXTerm("token-symbol-dmcs")} to customer.`);
  } else {
    // Release payment to contractor wallet
    WALLETS.contractor.balanceDMCS += dispute.milestoneAmount;
    showToast(`Dispute resolved. Released ${dispute.milestoneAmount} ${getUXTerm("token-symbol-dmcs")} to contractor.`);
  }

  // Distribute arbitration fees to majority voters
  // Winner gets their 20 DMCS refunded. Loser's 20 DMCS split among majority voters.
  if (homeownerWon) {
    WALLETS.homeowner.balanceDMCS += 20; // refund
  } else {
    WALLETS.contractor.balanceDMCS += 20; // refund
  }

  const winningVotes = homeownerWon ? dispute.homeownerVotes : dispute.contractorVotes;

  // Simulate staking reward/slash adjustment in WALLETS
  if (dispute.votedUsers.includes(WALLETS.juror.address)) {
    const jurorVotedHomeowner = true; // Charlie voted for homeowner
    const jurorWon = (jurorVotedHomeowner === homeownerWon);
    
    if (jurorWon) {
      WALLETS.juror.balanceDMCS += 20 / (winningVotes || 1); // share of loser fee
      WALLETS.juror.balanceDMCU += 10; // extra reward yield
      
      if (uxMode === 'traditional') {
        showToast(`Review payout: Juror (Charlie) earned USD rewards and reputation points.`);
      } else {
        showToast(`Jury duty payout: Juror (Charlie) earned DMCS rewards and validator yield.`);
      }
    } else {
      WALLETS.juror.stakedDMCU -= 25; // Slashed 10% of 250 locked
      
      if (uxMode === 'traditional') {
        showToast(`Jury penalty: Juror (Charlie) was slashed 25 reputation points for voting with the minority.`, true);
      } else {
        showToast(`Jury penalty: Juror (Charlie) was slashed 25 $DMCU for voting with the minority.`, true);
      }
    }
  }

  saveDB();
  renderAll();
}
