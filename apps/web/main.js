// Demandable Web DApp Main JavaScript Logic

// Backend endpoint configuration (falls back to mock database if server is offline)
const API_URL = "http://localhost:8000";

// Simulation Wallets representing different actors
const WALLETS = {
  homeowner: {
    address: "0x7a839Fde147A3e89DeCb01235477B79a785245d3",
    role: "Homeowner",
    label: "Homeowner (Alice)",
    balanceDWS: 5000,
    balanceDWG: 0,
    stakedDWG: 0
  },
  contractor: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Apex Roofing Specialists address
    role: "Contractor",
    label: "Contractor (Apex Roofing)",
    balanceDWS: 1000,
    balanceDWG: 500,
    stakedDWG: 0
  },
  inspector: {
    address: "0x90F8bf323369FD0297AB4208f93D8b8490b4698e", // Bob address
    role: "Inspector / Peer Pro",
    label: "Inspector (Bob - Precision Tile)",
    balanceDWS: 800,
    balanceDWG: 1200,
    stakedDWG: 0
  },
  juror: {
    address: "0x2546BcD3c84621e9a6d9435b474955bbf8d7e1fd",
    role: "Jury Pool Member",
    label: "Juror (Charlie - EcoClean)",
    balanceDWS: 200,
    balanceDWG: 2000,
    stakedDWG: 0
  }
};

// Global App State
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

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupWallet();
  setupHomeownerEvents();
  setupContractorEvents();
  setupInspectorEvents();
  renderAll();
});

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
  const walletText = document.getElementById("walletText");
  
  walletBtn.addEventListener("click", () => {
    const roles = Object.keys(WALLETS);
    if (!currentActor) {
      currentActor = "homeowner";
      walletBtn.classList.add("connected");
      showToast(`Coinbase Smart Wallet Connected as ${WALLETS[currentActor].label}`);
    } else {
      // Cycle through actors for easy demoing
      const currIdx = roles.indexOf(currentActor);
      const nextIdx = (currIdx + 1) % roles.length;
      currentActor = roles[nextIdx];
      showToast(`Switched active wallet to ${WALLETS[currentActor].label}`);
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
      // Apex Roofing, Precision Tile, EcoClean, A+ STEM
      const fallbackList = [
        {
          walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          name: "Apex Roofing Specialists",
          category: "Roofing",
          distance: 2.3,
          score: 0.945,
          metadataURI: "ipfs://factual-profile-data-apex",
          pros: ["C-39 Licensed Roofing Contractor", "Utilizes drone imagery and thermal scan equipment", "142 jobs completed without unresolved customer disputes"],
          cons: ["High demand structure, minimum project sizes of 500 DWS may apply"]
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
      showToast("Switch to Homeowner wallet to fund the contract escrow", true);
      return;
    }

    const homeownerInfo = WALLETS.homeowner;
    const totalCost = parsedMilestones.totalAmount;

    if (homeownerInfo.balanceDWS < totalCost) {
      showToast("Insufficient DWS stable token balance", true);
      return;
    }

    // Deploy contract simulation
    homeownerInfo.balanceDWS -= totalCost;
    
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
    
    showToast(`Deployed DWEscrow smart contract (Job ID: #${jobId}). funded ${totalCost} $DWS into escrow.`);
    
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
    if (actor.balanceDWG < 500) {
      showToast("Need at least 500 $DWG utility tokens in wallet balance", true);
      return;
    }

    actor.balanceDWG -= 500;
    actor.stakedDWG += 500;
    showToast(`Staked 500 $DWG to qualify as platform inspector`);
    
    renderAll();
  });

  registerInspectorBtn.addEventListener("click", () => {
    if (!currentActor) return;
    const actor = WALLETS[currentActor];
    if (actor.stakedDWG < 500) {
      showToast("Must have staked at least 500 $DWG", true);
      return;
    }
    
    showToast(`Successfully registered ${actor.address.slice(0,6)}... as active inspector!`);
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
}

function renderWalletStatus() {
  const walletBtn = document.getElementById("walletBtn");
  const walletText = document.getElementById("walletText");
  const contractorWalletDisplay = document.getElementById("contractorWalletDisplay");
  
  if (!currentActor) {
    walletText.textContent = "Connect Coinbase Smart Wallet";
    contractorWalletDisplay.textContent = "Wallet Not Connected";
    return;
  }
  
  const actor = WALLETS[currentActor];
  walletText.textContent = `${actor.label} (${actor.balanceDWS} DWS | ${actor.balanceDWG} DWG)`;
  contractorWalletDisplay.textContent = `${currentActor === 'contractor' ? 'Active' : 'Viewing Role'} — ${actor.address.slice(0, 10)}...`;

  // Staked DWG display in inspector board
  document.getElementById("stakedDWG").textContent = `${actor.stakedDWG.toFixed(1)} DWG`;
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

    card.innerHTML = `
      <div class="pro-header">
        <div>
          <div class="pro-name">${c.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${c.walletAddress}</div>
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
          ${c.cons.map(cn => `<span>${cn}</span>`).join('')}
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
      <div class="milestone-name">Milestone #${idx + 1}: ${m.description}</div>
      <div class="milestone-value">${m.amount} DWS</div>
    `;
    container.appendChild(div);
  });

  document.getElementById("totalEscrowCost").textContent = `${parsedMilestones.totalAmount} DWS`;
}

function renderContractorJobs() {
  const list = document.getElementById("contractorJobsList");
  list.innerHTML = "";

  if (db.jobs.length === 0) {
    list.innerHTML = `<div class="text-muted" style="text-align: center; padding: 20px;">No active escrows registered under this wallet. Create a job first.</div>`;
    return;
  }

  db.jobs.forEach(job => {
    const activeIdx = job.currentMilestoneIndex;
    const isCompleted = job.status === "Completed" || job.status === "Resolved";
    
    let activeMilestoneText = "All milestones completed";
    let milestoneAmount = "";
    
    if (activeIdx < job.milestones.length) {
      activeMilestoneText = `Active Milestone #${activeIdx + 1}: ${job.milestones[activeIdx].description}`;
      milestoneAmount = `${job.milestones[activeIdx].amount} DWS`;
    }

    const jobCard = document.createElement("div");
    jobCard.className = "factual-pro-card";
    
    let actionButton = "";
    if (job.status === "Active" && activeIdx < job.milestones.length) {
      const activeM = job.milestones[activeIdx];
      if (activeM.status === "Pending" || activeM.status === "Rejected") {
        actionButton = `<button class="select-pro-btn request-verify-btn" data-job="${job.id}" style="background: var(--accent-purple); color: white;">Request Milestone Verification</button>`;
      } else if (activeM.status === "Requested") {
        actionButton = `<span class="text-muted" style="font-size: 0.85rem; font-style: italic;">Verification Requested (${activeM.assignedInspector ? 'Inspector Assigned' : 'Finding Inspector...'})</span>`;
      }
    } else if (job.status === "Disputed") {
      actionButton = `<span style="color: var(--accent-red); font-size: 0.85rem; font-weight: bold;">⚠️ Contract Disputed. Resolution pending jury votes.</span>`;
    }

    // Add Dispute escalation button for Homeowner / Contractor if milestone was rejected
    let disputeButton = "";
    if (job.status === "Active" && activeIdx < job.milestones.length) {
      if (job.milestones[activeIdx].status === "Rejected") {
        disputeButton = `<button class="select-pro-btn raise-dispute-btn" data-job="${job.id}" style="background: var(--accent-red); color: white; border-color: var(--accent-red);">Escalate to Dispute Jury</button>`;
      }
    }

    jobCard.innerHTML = `
      <div class="pro-header">
        <div>
          <div class="pro-name">Job #${job.id} — Vetted Pro: ${job.contractorName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Homeowner: ${job.homeowner}</div>
        </div>
        <div class="pro-metric" style="text-align: right;">
          <div style="color: var(--accent-cyan); font-weight: 700;">Status: ${job.status}</div>
          <div>Total cost: ${job.totalAmount} DWS</div>
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
        if (actor.balanceDWS < 20) {
          showToast("Must have at least 20 $DWS in wallet to pay the flat dispute arbitration fee", true);
          return;
        }

        actor.balanceDWS -= 20;
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
        showToast(`Dispute raised on Job #${job.id}. locked $20 DWS arbitration fee.`);
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
              <div style="font-size: 0.75rem; color: var(--text-muted);">Contractor: ${job.contractorName}</div>
            </div>
            <div style="color: var(--accent-cyan); font-weight: 600;">Reward: 50.0 $DWG</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            <strong>Scope to audit:</strong> ${m.description}
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
          WALLETS.contractor.balanceDWS += m.amount;
          // Reward inspector in DWG
          WALLETS.inspector.balanceDWG += 50;

          if (job.currentMilestoneIndex === job.milestones.length) {
            job.status = "Completed";
          }
          
          saveDB();
          showToast("Milestone approved. Funds released to contractor, and $DWG rewards minted to inspector.");
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
          <button class="select-pro-btn vote-contractor-btn" style="border-color: var(--accent-purple); color: var(--text-primary);">Vote Contractor</button>
          <button class="select-pro-btn vote-homeowner-btn" style="border-color: var(--accent-cyan); color: var(--text-primary);">Vote Homeowner</button>
        </div>
      `;
    } else {
      votingButtons = `<div style="font-size: 0.8rem; font-style: italic; color: var(--accent-mint); text-align: right; margin-top: 0.5rem;">✓ You have voted on this dispute</div>`;
    }

    card.innerHTML = `
      <div class="pro-header">
        <div>
          <div class="pro-name">Dispute on Job #${d.jobId} — ${d.contractorName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Disputed milestone cost: ${d.milestoneAmount} DWS</div>
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
      
      <button class="btn-primary resolve-btn" style="margin-top: 0.75rem; padding: 0.4rem; font-size: 0.8rem; background: var(--text-muted);">
        Simulate 7 days & Tally Vote
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
  if (actor.stakedDWG < 250) {
    showToast("Must have at least 250 $DWG staked as inspector/juror to vote", true);
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
  showToast(`Voted for ${voteForHomeowner ? 'Homeowner' : 'Contractor'}. Locked 250 $DWG for jury duty.`);
  renderAll();
}

function resolveDisputeTally(dispute) {
  dispute.resolved = true;
  
  // Find associated job
  const job = db.jobs.find(j => j.id === dispute.jobId);
  job.status = "Resolved";
  
  const homeownerWon = dispute.homeownerVotes >= dispute.contractorVotes;
  const winner = homeownerWon ? "Homeowner" : "Contractor";
  
  // Distribute escrow funds to winner
  if (homeownerWon) {
    // Refund milestone amount to homeowner wallet
    WALLETS.homeowner.balanceDWS += dispute.milestoneAmount;
    showToast(`Dispute resolved. Refunded ${dispute.milestoneAmount} DWS to homeowner.`);
  } else {
    // Release payment to contractor wallet
    WALLETS.contractor.balanceDWS += dispute.milestoneAmount;
    showToast(`Dispute resolved. Released ${dispute.milestoneAmount} DWS to contractor.`);
  }

  // Distribute arbitration fees to majority voters
  // Total fees collected = 40 DWS (20 DWS from homeowner, 20 DWS from contractor)
  // Winner gets their 20 DWS refunded. Loser's 20 DWS split among majority voters.
  if (homeownerWon) {
    WALLETS.homeowner.balanceDWS += 20; // refund
  } else {
    WALLETS.contractor.balanceDWS += 20; // refund
  }

  // Distribute the remaining 20 DWS to winning voters
  // Slashes 10% (25 DWG) from losing voters and distributes to winning voters or burns it
  // For simplicity, we slash losing stakers and add yield to winning stakers in the WALLETS simulation:
  const winningVotes = homeownerWon ? dispute.homeownerVotes : dispute.contractorVotes;
  const losingVotes = homeownerWon ? dispute.contractorVotes : dispute.homeownerVotes;

  // Simulate staking reward/slash adjustment in WALLETS
  // If juror voted, we adjust their balances
  if (dispute.votedUsers.includes(WALLETS.juror.address)) {
    const jurorVotedHomeowner = true; // Simulating Charlie's vote in the test UI
    const jurorWon = (jurorVotedHomeowner === homeownerWon);
    
    if (jurorWon) {
      WALLETS.juror.balanceDWS += 20 / winningVotes; // share of loser fee
      WALLETS.juror.balanceDWG += 10; // extra reward yield
      showToast(`Jury duty payout: Juror (Charlie) earned DWS rewards and validator yield.`);
    } else {
      WALLETS.juror.stakedDWG -= 25; // Slashed 10% of 250 locked
      showToast(`Jury penalty: Juror (Charlie) was slashed 25 $DWG for voting with the minority.`, true);
    }
  }

  saveDB();
  renderAll();
}
