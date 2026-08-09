document.addEventListener("DOMContentLoaded", async () => {
  let SANGHA_DATA;

  // ฟังก์ชันดึงข้อมูลอัจฉริยะ (ดึงจาก PHP MySQL Database ก่อนเสมอ + ป้องกัน HTTP Cache)
  async function loadSanghaData(forceRefresh = false) {
    const timestamp = Date.now();
    let data = null;
    let dataSource = "unknown";

    // 1. ถ้าต้องการบังคับโหลดข้อมูลสดจากฐานข้อมูล ให้ล้าง cache ใน browser ก่อน
    if (forceRefresh) {
      try { localStorage.removeItem("SANGHA_DATABASE"); } catch(e) {}
    }

    // 2. พยายามดึงข้อมูลสดจาก PHP Backend API (api_get_data.php) ก่อนเสมอ พร้อม no-cache headers
    try {
      const response = await fetch(`api_get_data.php?t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.status === 'success') {
          data = result;
          dataSource = "MySQL Database (Live API)";
          try {
            localStorage.setItem("SANGHA_DATABASE", JSON.stringify(result));
          } catch(e) {}
        }
      }
    } catch (err) {
      console.warn("PHP API not reachable, attempting static fallbacks...", err);
    }

    // 3. ถ้าไม่มี PHP API (เช่น รันบน Static GitHub Pages) ให้ลองดึง static data.json ล่าสุด
    if (!data) {
      try {
        const response = await fetch(`data.json?t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          const result = await response.json();
          if (result && result.status === 'success') {
            data = result;
            dataSource = "Static data.json";
            try {
              localStorage.setItem("SANGHA_DATABASE", JSON.stringify(result));
            } catch(e) {}
          }
        }
      } catch (err) {
        console.warn("data.json fetch failed", err);
      }
    }

    // 4. ถ้าดึงจาก Network ไม่ได้ ให้ใช้ข้อมูลจาก localStorage
    if (!data) {
      try {
        const cached = localStorage.getItem("SANGHA_DATABASE");
        if (cached) {
          data = JSON.parse(cached);
          dataSource = "localStorage Cache";
        }
      } catch (e) {
        console.error("localStorage parse error", e);
      }
    }

    // 5. Fallback ลำดับสุดท้าย: INITIAL_SANGHA_DATA (data.js)
    if (!data && typeof INITIAL_SANGHA_DATA !== "undefined") {
      data = INITIAL_SANGHA_DATA;
      dataSource = "INITIAL_SANGHA_DATA (data.js)";
    }

    console.log(`[Sangha App] Loaded data from: ${dataSource}`);
    return { data, dataSource };
  }

  // โหลดข้อมูลเริ่มต้น
  const { data: loadedData, dataSource } = await loadSanghaData();
  SANGHA_DATA = loadedData;

  if (!SANGHA_DATA) {
    alert("ไม่สามารถเชื่อมต่อระบบฐานข้อมูลคณะสงฆ์ได้ กรุณาตรวจสอบการเชื่อมต่อ");
    return;
  }

  // เผยแพร่ตัวแปรไปสู่ Global Scope สำหรับฟังก์ชันหน้าต่าง Modal
  window.SANGHA_DATA = SANGHA_DATA;

  // แสดง Badge หากไม่ได้ดึงตรงจาก Live MySQL Database
  const headerTitle = document.querySelector(".header-title");
  if (headerTitle && dataSource !== "MySQL Database (Live API)") {
    const badge = document.createElement("span");
    badge.textContent = `โหมดจำลอง (${dataSource})`;
    badge.style.fontSize = "11px";
    badge.style.marginLeft = "10px";
    badge.style.background = "rgba(245, 158, 11, 0.2)";
    badge.style.color = "#f59e0b";
    badge.style.border = "1px solid rgba(245, 158, 11, 0.3)";
    badge.style.padding = "2px 8px";
    badge.style.borderRadius = "4px";
    badge.style.verticalAlign = "middle";
    badge.style.display = "inline-block";
    headerTitle.appendChild(badge);
  }

  // ผูกปุ่มกด "โหลดข้อมูลใหม่"
  const refreshBtn = document.getElementById("refresh-data-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      const oldText = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> กำลังโหลด...';
      if (typeof lucide !== "undefined") lucide.createIcons();

      const { data: newData, dataSource: newSource } = await loadSanghaData(true);
      if (newData) {
        window.SANGHA_DATA = newData;
        SANGHA_DATA = newData;
        alert(`ดึงข้อมูลล่าสุดเรียบร้อยแล้ว (${newSource})`);
        window.location.reload();
      } else {
        alert("ไม่สามารถดึงข้อมูลล่าสุดได้ กรุณาตรวจสอบการเชื่อมต่อ");
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = oldText;
        if (typeof lucide !== "undefined") lucide.createIcons();
      }
    });
  }

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

  // 7. Directory Filter, Search, Table View & Pagination Logic
  const monksGrid = document.getElementById("monks-grid");
  const monksTableWrapper = document.getElementById("monks-table-wrapper");
  const monksTableBody = document.getElementById("monks-table-body");
  const emptyState = document.getElementById("empty-state");
  const resultsCount = document.getElementById("results-count");
  const searchInput = document.getElementById("search-input");
  const positionFilter = document.getElementById("position-filter");
  const paliFilter = document.getElementById("pali-filter");
  const factionFilter = document.getElementById("faction-filter");
  const upajjhayaFilter = document.getElementById("upajjhaya-filter");
  const resetFiltersBtn = document.getElementById("reset-filters");

  const viewGridBtn = document.getElementById("view-grid-btn");
  const viewTableBtn = document.getElementById("view-table-btn");
  const itemsPerPageSelect = document.getElementById("items-per-page");
  const paginationContainer = document.getElementById("pagination-container");
  const paginationInfo = document.getElementById("pagination-info");
  const paginationControls = document.getElementById("pagination-controls");

  // State Management
  let currentViewMode = localStorage.getItem("monk_view_mode") || "grid"; // 'grid' | 'table'
  let currentPage = 1;
  let itemsPerPage = parseInt(localStorage.getItem("monk_items_per_page")) || 24;
  let currentFilteredMonks = [];

  // Bind View Mode Switcher
  if (itemsPerPageSelect) {
    itemsPerPageSelect.value = itemsPerPage.toString();
    itemsPerPageSelect.addEventListener("change", (e) => {
      itemsPerPage = parseInt(e.target.value) || 24;
      localStorage.setItem("monk_items_per_page", itemsPerPage);
      currentPage = 1;
      renderCurrentMonkList();
    });
  }

  if (viewGridBtn && viewTableBtn) {
    updateViewModeButtons();

    viewGridBtn.addEventListener("click", () => {
      currentViewMode = "grid";
      localStorage.setItem("monk_view_mode", "grid");
      updateViewModeButtons();
      renderCurrentMonkList();
    });

    viewTableBtn.addEventListener("click", () => {
      currentViewMode = "table";
      localStorage.setItem("monk_view_mode", "table");
      updateViewModeButtons();
      renderCurrentMonkList();
    });
  }

  function updateViewModeButtons() {
    if (!viewGridBtn || !viewTableBtn) return;
    if (currentViewMode === "grid") {
      viewGridBtn.classList.add("active");
      viewTableBtn.classList.remove("active");
    } else {
      viewTableBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
    }
  }

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

    currentFilteredMonks = SANGHA_DATA.monks.filter(monk => {
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

      // Position
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

    currentPage = 1;
    renderCurrentMonkList();
  }

  function renderCurrentMonkList() {
    const totalItems = currentFilteredMonks.length;
    if (resultsCount) resultsCount.textContent = totalItems.toLocaleString("th-TH");

    if (totalItems === 0) {
      emptyState.classList.remove("hidden");
      if (monksGrid) monksGrid.classList.add("hidden");
      if (monksTableWrapper) monksTableWrapper.classList.add("hidden");
      if (paginationContainer) paginationContainer.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Calculate pagination slices
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pagedMonks = currentFilteredMonks.slice(startIndex, endIndex);

    // Render Grid vs Table
    if (currentViewMode === "grid") {
      if (monksTableWrapper) monksTableWrapper.classList.add("hidden");
      if (monksGrid) {
        monksGrid.classList.remove("hidden");
        renderGridCards(pagedMonks);
      }
    } else {
      if (monksGrid) monksGrid.classList.add("hidden");
      if (monksTableWrapper) {
        monksTableWrapper.classList.remove("hidden");
        renderTableRows(pagedMonks);
      }
    }

    // Render Pagination Controls & Info
    renderPagination(totalItems, startIndex, endIndex, totalPages);

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  function renderGridCards(monks) {
    if (!monksGrid) return;
    monksGrid.innerHTML = "";

    monks.forEach(monk => {
      const nameShort = monk.title ? monk.title : `${monk.firstName}`;
      const initials = nameShort.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา/g, "").trim().substring(0, 2);
      
      const card = document.createElement("div");
      card.className = "monk-card";
      
      let positionBadge = monk.sanghaPosition !== "ไม่มี" ? monk.sanghaPosition : monk.templePosition;
      let contactInfo = monk.phone ? `โทร: ${monk.phone}` : "";
      if (monk.lineId) {
        contactInfo += contactInfo ? ` | Line: ${monk.lineId}` : `Line: ${monk.lineId}`;
      }
      if (!contactInfo) contactInfo = "ไม่ระบุ";

      let avatarHTML = `<span>${initials || "พ"}</span>`;
      if (monk.image) {
        avatarHTML = `<img src="${monk.image}" alt="${monk.title}" onerror="this.outerHTML='<span>${initials || "พ"}</span>'">`;
      }

      card.innerHTML = `
        <div class="card-content">
          <div class="card-top">
            <div class="card-avatar" title="คลิกเพื่อดูรูปใหญ่">
              ${avatarHTML}
            </div>
            <div class="card-title-info">
              <h4>${monk.title}</h4>
              <span class="badge badge-primary">${positionBadge}</span>
              <div class="monk-real-name-tag" style="font-size: 13px; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="user-check" style="width: 14px; height: 14px; color: var(--accent-gold); flex-shrink: 0;"></i>
                <span><strong style="color: var(--text-primary);">${monk.firstName} ${monk.chaya}</strong></span>
              </div>
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
            <div class="detail-row">
              <i data-lucide="phone"></i>
              <span><strong>${contactInfo}</strong></span>
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

      const avatarBtn = card.querySelector(".card-avatar");
      avatarBtn.addEventListener("click", () => {
        if (monk.image) {
          openImageLightbox(monk.image, `${monk.title} (${monk.firstName} ${monk.chaya})`);
        } else {
          openMonkModal(monk);
        }
      });

      const detailBtn = card.querySelector(".btn-sm-action");
      detailBtn.addEventListener("click", () => {
        openMonkModal(monk);
      });

      monksGrid.appendChild(card);
    });
  }

  function renderTableRows(monks) {
    if (!monksTableBody) return;
    monksTableBody.innerHTML = "";

    monks.forEach(monk => {
      const nameShort = monk.title ? monk.title : `${monk.firstName}`;
      const initials = nameShort.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา/g, "").trim().substring(0, 2);
      let positionBadge = monk.sanghaPosition !== "ไม่มี" ? monk.sanghaPosition : monk.templePosition;

      let avatarHTML = `<div class="table-monk-avatar"><span>${initials || "พ"}</span></div>`;
      if (monk.image) {
        avatarHTML = `<div class="table-monk-avatar"><img src="${monk.image}" alt="${monk.title}" onerror="this.outerHTML='<span>${initials || "พ"}</span>'"></div>`;
      }

      const tr = document.createElement("tr");
      tr.className = "monk-table-row";
      tr.innerHTML = `
        <td style="text-align: center;">${avatarHTML}</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${monk.title}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">${monk.firstName} ${monk.chaya}</div>
        </td>
        <td><span class="badge badge-primary">${positionBadge}</span></td>
        <td><strong>${monk.residingTemple}</strong></td>
        <td>ต.${monk.subdistrict} ${monk.district}</td>
        <td>${monk.dhammaEducation} / ${monk.paliEducation}</td>
        <td>${monk.phone || "-"}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-view-detail" style="padding: 6px 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="eye" style="width: 13px; height: 13px;"></i> ดูข้อมูล
          </button>
        </td>
      `;

      tr.addEventListener("click", (e) => {
        openMonkModal(monk);
      });

      monksTableBody.appendChild(tr);
    });
  }

  function renderPagination(totalItems, startIndex, endIndex, totalPages) {
    if (!paginationContainer) return;

    if (totalItems <= itemsPerPage) {
      paginationContainer.classList.add("hidden");
      return;
    }
    paginationContainer.classList.remove("hidden");

    if (paginationInfo) {
      paginationInfo.textContent = `แสดง ${(startIndex + 1).toLocaleString("th-TH")} - ${endIndex.toLocaleString("th-TH")} จากทั้งหมด ${totalItems.toLocaleString("th-TH")} รายการ (หน้า ${currentPage}/${totalPages})`;
    }

    if (!paginationControls) return;
    paginationControls.innerHTML = "";

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.disabled = currentPage === 1;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>';
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentMonkList();
        scrollToDirectoryTop();
      }
    });
    paginationControls.appendChild(prevBtn);

    // Page Numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      const p1 = createPageBtn(1);
      paginationControls.appendChild(p1);
      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        paginationControls.appendChild(ellipsis);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const pBtn = createPageBtn(p);
      paginationControls.appendChild(pBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        paginationControls.appendChild(ellipsis);
      }
      const pLast = createPageBtn(totalPages);
      paginationControls.appendChild(pLast);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>';
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentMonkList();
        scrollToDirectoryTop();
      }
    });
    paginationControls.appendChild(nextBtn);
  }

  function createPageBtn(pageNum) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn ${pageNum === currentPage ? "active" : ""}`;
    btn.textContent = pageNum.toLocaleString("th-TH");
    btn.addEventListener("click", () => {
      currentPage = pageNum;
      renderCurrentMonkList();
      scrollToDirectoryTop();
    });
    return btn;
  }

  function scrollToDirectoryTop() {
    const dirSection = document.getElementById("directory-section");
    if (dirSection) {
      dirSection.scrollIntoView({ behavior: "smooth", block: "start" });
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

    // Set Avatar Image / Initials
    const avatarEl = document.getElementById("modal-avatar");
    if (avatarEl) {
      if (monk.image) {
        avatarEl.innerHTML = `<img src="${monk.image}" alt="${monk.title}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; cursor:pointer;" onerror="this.outerHTML='<span>${initials || "พ"}</span>'">`;
        avatarEl.onclick = () => openImageLightbox(monk.image, `${monk.title} (${monk.firstName} ${monk.chaya})`);
      } else {
        avatarEl.innerHTML = `<span>${initials || "พ"}</span>`;
        avatarEl.onclick = null;
      }
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

  // 9. Image Lightbox Preview Functions
  window.openImageLightbox = function(imgUrl, captionText) {
    const lightbox = document.getElementById("image-lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");
    if (!lightbox || !lightboxImg) return;

    lightboxImg.src = imgUrl;
    lightboxCaption.textContent = captionText || "";
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  };

  function closeImageLightbox() {
    const lightbox = document.getElementById("image-lightbox");
    if (lightbox) {
      lightbox.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  const closeLightboxBtn = document.getElementById("close-lightbox-btn");
  const lightboxOverlay = document.getElementById("image-lightbox");

  if (closeLightboxBtn) closeLightboxBtn.addEventListener("click", closeImageLightbox);
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener("click", (e) => {
      if (e.target === lightboxOverlay) {
        closeImageLightbox();
      }
    });
  }

  // Keyboard Close ESC for Lightbox
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightboxOverlay && lightboxOverlay.classList.contains("active")) {
      closeImageLightbox();
    }
  });
});
