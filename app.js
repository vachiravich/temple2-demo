// ระบบควบคุมระบบการทำหน้าที่และการกรองข้อมูลคณะสงฆ์ (Demo Logic)
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Lucide Icons
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // 2. Theme Toggle System
  const themeToggleBtn = document.getElementById("theme-toggle");
  const htmlElement = document.documentElement;

  const savedTheme = localStorage.getItem("theme") || "dark";
  htmlElement.setAttribute("data-theme", savedTheme);

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    htmlElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });

  // 3. Stats Counter Animation
  animateCounter("stat-temples", SANGHA_DATA.statistics.totalTemples, 1000);
  animateCounter("stat-monks", SANGHA_DATA.statistics.totalMonks, 1200);
  animateCounter("stat-novices", SANGHA_DATA.statistics.totalNovices, 1500);
  animateCounter("stat-districts", SANGHA_DATA.statistics.totalDistricts, 800);

  function animateCounter(id, targetValue, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentValue = Math.floor(progress * targetValue);
      obj.innerText = currentValue.toLocaleString("th-TH");
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerText = targetValue.toLocaleString("th-TH");
      }
    };
    window.requestAnimationFrame(step);
  }

  // 4. Populate District & Dynamic Subdistrict Filters
  const districtFilter = document.getElementById("district-filter");
  const subdistrictFilter = document.getElementById("subdistrict-filter");

  // Populate Districts
  SANGHA_DATA.districts.forEach(dist => {
    const option = document.createElement("option");
    option.value = dist.name;
    option.textContent = dist.name;
    districtFilter.appendChild(option);
  });

  // Handle District Change to Update Subdistrict Dropdown
  districtFilter.addEventListener("change", () => {
    const selectedDistName = districtFilter.value;
    subdistrictFilter.innerHTML = '<option value="">ทุกตำบลปกครอง</option>';
    
    if (!selectedDistName) {
      subdistrictFilter.disabled = true;
      subdistrictFilter.innerHTML = '<option value="">ทุกตำบลปกครอง (เลือกอำเภอก่อน)</option>';
      filterAndRenderMonks();
      return;
    }

    const matchedDistObj = SANGHA_DATA.districts.find(d => d.name === selectedDistName);
    if (matchedDistObj && matchedDistObj.subdistricts) {
      subdistrictFilter.disabled = false;
      matchedDistObj.subdistricts.forEach(sub => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;
        subdistrictFilter.appendChild(option);
      });
    }
    
    filterAndRenderMonks();
  });

  // 5. Render Hierarchy Tree (Governor and Deputies)
  const governorNode = document.getElementById("governor-node");
  const deputiesNodes = document.getElementById("deputies-nodes");

  // Render Governor
  const gov = SANGHA_DATA.hierarchy.governor;
  if (governorNode) {
    governorNode.innerHTML = `
      <div class="h-avatar-glow bg-gradient-to-br ${gov.imageColor}">
        <i data-lucide="crown"></i>
      </div>
      <span class="h-pos">${gov.position}</span>
      <h4>${gov.name}</h4>
      <p class="h-temple">${gov.temple} ต.${gov.subdistrict} ${gov.district}</p>
    `;
    governorNode.addEventListener("click", () => {
      // ค้นหาข้อมูลพระสังฆาธิการแบบเต็ม เพื่อแสดงใน Modal
      const fullMonkInfo = SANGHA_DATA.monks.find(m => m.title === gov.name.split(" (")[0]);
      if (fullMonkInfo) {
        openMonkModal(fullMonkInfo);
      }
    });
  }

  // Render Deputies
  if (deputiesNodes) {
    deputiesNodes.innerHTML = "";
    SANGHA_DATA.hierarchy.deputies.forEach(dep => {
      const wrapper = document.createElement("div");
      wrapper.className = "deputy-node-wrapper";
      
      const card = document.createElement("div");
      card.className = "hierarchy-card";
      card.innerHTML = `
        <div class="h-avatar-glow bg-gradient-to-br ${dep.imageColor}">
          <i data-lucide="user"></i>
        </div>
        <span class="h-pos">${dep.position}</span>
        <h4>${dep.name}</h4>
        <p class="h-temple">${dep.temple} ต.${dep.subdistrict} ${dep.district}</p>
      `;
      
      card.addEventListener("click", () => {
        const fullMonkInfo = SANGHA_DATA.monks.find(m => m.title === dep.name.split(" (")[0]);
        if (fullMonkInfo) {
          openMonkModal(fullMonkInfo);
        }
      });

      wrapper.innerHTML = `<div class="hierarchy-connector-vertical"></div>`;
      wrapper.appendChild(card);
      deputiesNodes.appendChild(wrapper);
    });
  }

  // 6. Render Events Calendar List
  const eventsListContainer = document.getElementById("events-list-container");
  if (eventsListContainer) {
    eventsListContainer.innerHTML = "";
    SANGHA_DATA.events.forEach(evt => {
      const card = document.createElement("div");
      card.className = `event-card ${evt.type}`;
      
      let iconName = "calendar";
      if (evt.type === "holy-day") iconName = "moon-star";
      else if (evt.type === "meeting") iconName = "message-square";
      else if (evt.type === "training") iconName = "book-open";

      card.innerHTML = `
        <div class="event-date-indicator">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="event-body">
          <span class="ev-date"><i data-lucide="clock" style="width:12px; height:12px; display:inline; vertical-align:middle; margin-right:4px;"></i> ${evt.date}</span>
          <h4>${evt.title}</h4>
          <p>${evt.description}</p>
        </div>
      `;
      eventsListContainer.appendChild(card);
    });
  }

  // 7. Directory Filter & Search Logic
  const monksGrid = document.getElementById("monks-grid");
  const emptyState = document.getElementById("empty-state");
  const resultsCount = document.getElementById("results-count");
  const searchInput = document.getElementById("search-input");
  const positionFilter = document.getElementById("position-filter");
  const paliFilter = document.getElementById("pali-filter");
  const factionFilter = document.getElementById("faction-filter");
  const upajjhayaFilter = document.getElementById("upajjhaya-filter");
  const resetFiltersBtn = document.getElementById("reset-filters");

  // Initial Render
  filterAndRenderMonks();

  // Bind Listeners
  searchInput.addEventListener("input", filterAndRenderMonks);
  subdistrictFilter.addEventListener("change", filterAndRenderMonks);
  positionFilter.addEventListener("change", filterAndRenderMonks);
  paliFilter.addEventListener("change", filterAndRenderMonks);
  factionFilter.addEventListener("change", filterAndRenderMonks);
  upajjhayaFilter.addEventListener("change", filterAndRenderMonks);
  
  resetFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    districtFilter.value = "";
    subdistrictFilter.value = "";
    subdistrictFilter.disabled = true;
    subdistrictFilter.innerHTML = '<option value="">ทุกตำบลปกครอง (เลือกอำเภอก่อน)</option>';
    positionFilter.value = "";
    paliFilter.value = "";
    factionFilter.value = "";
    upajjhayaFilter.value = "";
    filterAndRenderMonks();
  });

  function filterAndRenderMonks() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedDist = districtFilter.value;
    const selectedSubdist = subdistrictFilter.value;
    const selectedPos = positionFilter.value;
    const selectedPali = paliFilter.value;
    const selectedFaction = factionFilter.value;
    const selectedUpajjhaya = upajjhayaFilter.value;

    const filtered = SANGHA_DATA.monks.filter(monk => {
      // Text Search: check name, chaya, temple, rajathinnanam, code
      const nameFull = `${monk.title} ${monk.firstName} ${monk.lastName} ${monk.chaya}`.toLowerCase();
      const matchesSearch = !query || 
        nameFull.includes(query) ||
        monk.residingTemple.toLowerCase().includes(query) ||
        monk.sanghaPosition.toLowerCase().includes(query) ||
        monk.templePosition.toLowerCase().includes(query) ||
        (monk.upajjhayaCode && monk.upajjhayaCode.toLowerCase().includes(query));

      // District
      const matchesDistrict = !selectedDist || monk.district === selectedDist;
      
      // Subdistrict
      const matchesSubdist = !selectedSubdist || monk.subdistrict === selectedSubdist;

      // Position (looks at sanghaPosition or templePosition)
      let matchesPosition = true;
      if (selectedPos) {
        if (selectedPos === "เลขานุการ") {
          matchesPosition = monk.sanghaPosition.includes("เลขานุการ");
        } else {
          matchesPosition = monk.sanghaPosition === selectedPos || monk.templePosition === selectedPos;
        }
      }

      // Pali education
      const matchesPali = !selectedPali || 
        (selectedPali === "ไม่มี" && monk.paliEducation === "ไม่มี") || 
        monk.paliEducation === selectedPali;

      // Faction
      const matchesFaction = !selectedFaction || monk.faction === selectedFaction;

      // Preceptor Status
      const matchesUpajjhaya = !selectedUpajjhaya || 
        (selectedUpajjhaya === "ไม่มี" && monk.upajjhayaStatus === "ไม่มี") || 
        monk.upajjhayaStatus === selectedUpajjhaya;

      return matchesSearch && matchesDistrict && matchesSubdist && matchesPosition && matchesPali && matchesFaction && matchesUpajjhaya;
    });

    renderMonkGrid(filtered);
  }

  function renderMonkGrid(monks) {
    if (!monksGrid) return;
    monksGrid.innerHTML = "";
    resultsCount.textContent = monks.length;

    if (monks.length === 0) {
      emptyState.classList.remove("hidden");
      monksGrid.classList.add("hidden");
    } else {
      emptyState.classList.add("hidden");
      monksGrid.classList.remove("hidden");

      monks.forEach(monk => {
        const nameShort = monk.title ? monk.title : `${monk.firstName}`;
        const initials = nameShort.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา/g, "").trim().substring(0, 2);
        
        const card = document.createElement("div");
        card.className = "monk-card";
        
        // กำหนดป้ายแสดงสถานะ
        let positionBadge = monk.sanghaPosition !== "ไม่มี" ? monk.sanghaPosition : monk.templePosition;
        let secondaryBadge = monk.rajathinnanam || monk.rankClass || monk.paliEducation;

        card.innerHTML = `
          <div class="card-content">
            <div class="card-top">
              <div class="card-avatar">
                <span>${initials || "พ"}</span>
              </div>
              <div class="card-title-info">
                <h4>${monk.title} (${monk.chaya})</h4>
                <span class="badge badge-primary">${positionBadge}</span>
                <span class="badge badge-secondary">${secondaryBadge}</span>
              </div>
            </div>
            <div class="card-details">
              <div class="detail-row">
                <i data-lucide="home"></i>
                <span>วัดที่จำพรรษา: <strong>${monk.residingTemple}</strong></span>
              </div>
              <div class="detail-row">
                <i data-lucide="map-pin"></i>
                <span>ต.${monk.subdistrict} ${monk.district}</span>
              </div>
              <div class="detail-row">
                <i data-lucide="award"></i>
                <span>การศึกษา: ${monk.dhammaEducation} / ${monk.paliEducation}</span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <span class="vassa-label">พรรษา: ${monk.vassa} พรรษา</span>
            <button class="btn btn-secondary btn-sm-action" style="padding: 8px 14px; font-size: 13px;">
              <i data-lucide="file-spreadsheet" style="width: 14px; height: 14px;"></i> ข้อมูลสุทธิสงฆ์
            </button>
          </div>
        `;

        // Click Details Button
        const detailBtn = card.querySelector(".btn-sm-action");
        detailBtn.addEventListener("click", () => {
          openMonkModal(monk);
        });

        monksGrid.appendChild(card);
      });
    }

    // Refresh Lucide Icons inside dynamically created elements
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  // 8. Detailed Modal Logic
  const modalOverlay = document.getElementById("monk-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalCloseAction = document.getElementById("modal-close-action");

  function openMonkModal(monk) {
    const nameShort = monk.title ? monk.title : `${monk.firstName}`;
    const initials = nameShort.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา/g, "").trim().substring(0, 2);

    // Header values
    document.getElementById("modal-name").textContent = `${monk.title} (${monk.firstName} ${monk.lastName})`;
    document.getElementById("modal-badge-sangha-pos").textContent = monk.sanghaPosition !== "ไม่มี" ? monk.sanghaPosition : monk.templePosition;
    document.getElementById("modal-badge-faction").textContent = monk.faction;
    document.getElementById("modal-badge-pali").textContent = monk.paliEducation !== "ไม่มี" ? monk.paliEducation : monk.dhammaEducation;

    // Set Avatar Initials
    const avatarEl = document.getElementById("modal-avatar");
    if (avatarEl) {
      avatarEl.innerHTML = `<span>${initials || "พ"}</span>`;
    }

    // Tab 1: General Info
    document.getElementById("modal-title-rank").textContent = monk.rankClass || "พระภิกษุสงฆ์ทั่วไป";
    document.getElementById("modal-chaya").textContent = monk.chaya;
    document.getElementById("modal-nickname").textContent = monk.nickname || "-";
    document.getElementById("modal-idcard").textContent = monk.idCard;
    document.getElementById("modal-birth-date").textContent = monk.birthDate;
    document.getElementById("modal-general-edu").textContent = monk.education;
    document.getElementById("modal-dhamma-edu").textContent = monk.dhammaEducation;
    document.getElementById("modal-pali-edu").textContent = monk.paliEducation;
    document.getElementById("modal-phone").textContent = monk.phone;
    document.getElementById("modal-lineid").textContent = monk.lineId || "-";

    // Tab 2: Ordination Info
    document.getElementById("modal-ord-date").textContent = monk.ordinationDate;
    document.getElementById("modal-ord-upajjhaya").textContent = monk.upajjhaya;
    document.getElementById("modal-vassa").textContent = `${monk.vassa} พรรษา`;
    document.getElementById("modal-temples-info").textContent = `${monk.residingTemple} (สังกัดวัด: ${monk.affiliatedTemple})`;
    document.getElementById("modal-subdist").textContent = `ตำบล ${monk.subdistrict}`;
    document.getElementById("modal-geo-region").textContent = `${monk.district}, จังหวัด${monk.province}, เขตปกครอง ${monk.region}`;

    // Tab 3: Positions Info
    document.getElementById("modal-temple-pos").textContent = monk.templePosition;
    document.getElementById("modal-sangha-pos").textContent = monk.sanghaPosition;
    document.getElementById("modal-upajjhaya-status").textContent = monk.upajjhayaStatus;
    document.getElementById("modal-upajjhaya-code").textContent = monk.upajjhayaCode || "ไม่มีรหัสพระอุปัชฌาย์";
    document.getElementById("modal-other-pos").textContent = monk.otherPosition || "ไม่มีตำแหน่งอื่นเพิ่มเติมในระบบฐานข้อมูล";

    // Default to the first tab (General)
    switchModalTab("general");

    // Display modal
    modalOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeMonkModal() {
    modalOverlay.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeMonkModal);
  if (modalCloseAction) modalCloseAction.addEventListener("click", closeMonkModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeMonkModal();
      }
    });
  }

  // Keyboard Close ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay && !modalOverlay.classList.contains("hidden")) {
      closeMonkModal();
    }
  });

  // Expose Functions globally for tabs
  window.switchModalTab = function(tabId) {
    // Hide all contents
    document.getElementById("tab-general").classList.add("hidden");
    document.getElementById("tab-ordination").classList.add("hidden");
    document.getElementById("tab-positions").classList.add("hidden");

    // Show selected contents
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");

    // Toggle active state on tabs buttons
    const tabBtns = document.querySelectorAll(".modal-tab-btn");
    tabBtns.forEach(btn => {
      btn.classList.remove("active");
      btn.style.borderBottom = "none";
      btn.style.color = "var(--text-secondary)";
      btn.style.fontWeight = "400";
    });

    // Find clicked button
    let index = 0;
    if (tabId === "ordination") index = 1;
    else if (tabId === "positions") index = 2;

    const activeBtn = tabBtns[index];
    if (activeBtn) {
      activeBtn.classList.add("active");
      activeBtn.style.borderBottom = "2px solid var(--accent-gold)";
      activeBtn.style.color = "var(--accent-gold)";
      activeBtn.style.fontWeight = "600";
    }
  };
});
