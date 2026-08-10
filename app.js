document.addEventListener("DOMContentLoaded", async () => {
  // Override native alert with custom beautiful Toast notification
  window.showToast = function(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;

    let iconHtml = '<i data-lucide="check-circle-2"></i>';
    let titleText = "ดำเนินการสำเร็จ";
    if (type === "error") {
      iconHtml = '<i data-lucide="alert-triangle"></i>';
      titleText = "เกิดข้อผิดพลาด";
    } else if (type === "info") {
      iconHtml = '<i data-lucide="info"></i>';
      titleText = "แจ้งเตือนระบบ";
    }

    toast.innerHTML = `
      <div class="toast-icon">
        ${iconHtml}
      </div>
      <div class="toast-content">
        <div class="toast-title">${titleText}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    // Slide in
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // Click close
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 400);
    });

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove("show");
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 400);
      }
    }, 3500);
  };

  // Override standard alert function
  window.alert = function(msg) {
    let type = "success";
    if (msg.includes("ไม่สามารถ") || msg.includes("ผิดพลาด") || msg.includes("ล้มเหลว") || msg.includes("error")) {
      type = "error";
    } else if (msg.includes("แจ้งเตือน") || msg.includes("กรุณา") || msg.includes("ยืนยัน")) {
      type = "info";
    }
    window.showToast(msg, type);
  };

  let SANGHA_DATA;

  function cleanNameAndChaya(firstName, chaya) {
    if (!firstName) return { name: "", chaya: chaya || "" };
    let cleanName = firstName.trim();
    let cleanChaya = chaya ? chaya.trim() : "";
    
    if (cleanChaya) {
      const normName = cleanName.replace(/\u0e3a/g, "");
      const normChaya = cleanChaya.replace(/\u0e3a/g, "");
      
      if (normName.endsWith(normChaya)) {
        if (cleanName.endsWith(cleanChaya)) {
          cleanName = cleanName.substring(0, cleanName.length - cleanChaya.length).trim();
        } else {
          const words = cleanName.split(/\s+/);
          if (words.length > 1) {
            const lastWord = words[words.length - 1];
            if (lastWord.replace(/\u0e3a/g, "") === normChaya) {
              words.pop();
              cleanName = words.join(" ").trim();
            }
          } else if (cleanName.replace(/\u0e3a/g, "") === normChaya) {
            cleanName = "";
          }
        }
      }
    }
    return { name: cleanName, chaya: cleanChaya };
  }

  function formatTitleAndName(title, firstName) {
    const t = (title || "").trim();
    const f = (firstName || "").trim();

    if (!f || f === t) return t;
    if (!t) return f;

    const normT = t.replace(/\s+/g, "");
    const normF = f.replace(/\s+/g, "");

    // ถ้าสมณศักดิ์และชื่อเป็นข้อความเดียวกัน หรือซ้ำซ้อนกัน ให้แสดงแค่อันเดียว
    if (normT === normF || normT.endsWith(normF) || normT.startsWith(normF)) {
      return t;
    }

    // คำนำหน้ามาตรฐานที่สั้น ให้ต่อชื่อต่อหางทันที เช่น พระมหา สมัย
    const shortPrefixes = ["พระมหา", "พระอธิการ", "เจ้าอธิการ", "พระ", "สามเณร", "พระครูสังฆรักษ์", "พระครูใบฎีกา", "พระครูสมุห์", "พระครูวินัยธร", "พระครูธรรมธร"];
    if (shortPrefixes.includes(t)) {
      return `${t} ${f}`;
    }

    return `${t} (${f})`;
  }

  const formatTempleName = (t) => {
    if (!t) return "";
    return t.startsWith("วัด") ? t : "วัด" + t;
  };

  // ฟังก์ชันดึงข้อมูลอัจฉริยะ (ดึงจาก PHP MySQL Database ก่อนเสมอ + ป้องกัน HTTP Cache)
  async function loadSanghaData(forceRefresh = false) {
    const timestamp = Date.now();
    const CACHE_VERSION = "2.1.0_utf8";
    let data = null;
    let dataSource = "unknown";

    // ตรวจสอบและล้าง Cache เก่าที่รหัสอักขระผิดพลาด
    if (localStorage.getItem("SANGHA_CACHE_VER") !== CACHE_VERSION) {
      try {
        localStorage.removeItem("SANGHA_DATABASE");
        localStorage.setItem("SANGHA_CACHE_VER", CACHE_VERSION);
      } catch(e) {}
    }

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

  function filterSanghaDataByProvince(allData, province) {
    if (!allData || !allData.monks) return null;

    let filteredMonks = [];
    let filteredTemples = [];
    let filteredEvents = [];

    if (province === "REGION") {
      filteredMonks = allData.monks;
      filteredTemples = allData.temples;
      filteredEvents = allData.events;
    } else {
      filteredMonks = allData.monks.filter(m => m.province === province);
      filteredTemples = allData.temples.filter(t => t.province === province);
      filteredEvents = allData.events.filter(e => e.province === province || e.province === 'ภาค 2');
    }
    
    const totalMonks = filteredMonks.length;
    const totalTemples = filteredTemples.length;
    
    const districtsMap = {};
    filteredTemples.forEach(t => {
      if (t.district) {
        if (!districtsMap[t.district]) {
          districtsMap[t.district] = new Set();
        }
        if (t.subdistrict) {
          districtsMap[t.district].add(t.subdistrict);
        }
      }
    });
    
    let districtsList = Object.keys(districtsMap).sort().map(d => ({
      name: d,
      subdistricts: Array.from(districtsMap[d]).sort()
    }));

    if (districtsList.length === 0) {
      const monksDistricts = new Set();
      filteredMonks.forEach(m => {
        if (m.district) monksDistricts.add(m.district);
      });
      districtsList = Array.from(monksDistricts).sort().map(d => ({
        name: d,
        subdistricts: []
      }));
    }

    // Regional Hierarchy (ภาค 2)
    const regGovernor = allData.monks.find(m => (m.personCode === 'REG2-001' || m.sanghaPosition === 'เจ้าคณะภาค 2'));
    const regDeputies = allData.monks.filter(m => (m.personCode === 'REG2-002' || m.personCode === 'REG2-003' || m.sanghaPosition === 'รองเจ้าคณะภาค 2'));
    const regAdvisors = allData.monks.filter(m => (m.personCode === 'REG2-004' || m.personCode === 'REG2-005' || m.personCode === 'REG2-006' || m.sanghaPosition.includes('ที่ปรึกษาเจ้าคณะภาค 2')));
    const regSecretary = allData.monks.find(m => (m.personCode === 'REG2-007' || m.sanghaPosition === 'เลขานุการเจ้าคณะภาค 2'));

    // Provincial Hierarchy
    const governorMonk = filteredMonks.find(m => 
      m.sanghaPosition && (
        (m.sanghaPosition.startsWith("จจ.") && !m.sanghaPosition.includes("เลข.") && !m.sanghaPosition.includes("รจจ.") && !m.sanghaPosition.includes("ทป.")) || 
        m.sanghaPosition === "เจ้าคณะจังหวัด" || (m.remarks && m.remarks.includes("เจ้าคณะจังหวัด"))
      )
    );
    
    let govName = "";
    if (governorMonk) {
      const { name: cleanedName } = cleanNameAndChaya(governorMonk.firstName, governorMonk.chaya);
      const cleanTitle = (governorMonk.title || "").trim();
      const cleanNameVal = (cleanedName || "").trim();
      if (cleanNameVal && cleanNameVal !== cleanTitle) {
        if (cleanNameVal.startsWith(cleanTitle)) {
          govName = cleanNameVal;
        } else if (cleanTitle.startsWith(cleanNameVal)) {
          govName = cleanTitle;
        } else {
          govName = `${cleanTitle} ${cleanNameVal}`;
        }
      } else {
        govName = cleanTitle;
      }
    }

    let governor = null;
    if (governorMonk) {
      governor = {
        id: governorMonk.id,
        monkObj: governorMonk,
        name: govName,
        position: `เจ้าคณะจังหวัด${province}`,
        temple: governorMonk.residingTemple,
        district: governorMonk.district,
        subdistrict: governorMonk.subdistrict,
        rank: governorMonk.rankClass || "พระราชาคณะ",
        imageColor: "from-amber-700 to-amber-900",
        image: governorMonk.image || "",
        details: governorMonk.remarks || `เจ้าคณะจังหวัด${province}`
      };
    }
    
    const deputyMonks = filteredMonks.filter(m => 
      m.sanghaPosition && (
        (m.sanghaPosition.startsWith("รจจ.") && !m.sanghaPosition.includes("เลข.")) || 
        m.sanghaPosition === "รองเจ้าคณะจังหวัด" || (m.remarks && m.remarks.includes("รองเจ้าคณะจังหวัด"))
      )
    ).sort((a, b) => a.id - b.id);
    
    const deputies = deputyMonks.map((m, idx) => {
      const { name: cleanedName } = cleanNameAndChaya(m.firstName, m.chaya);
      const cleanTitle = (m.title || "").trim();
      const cleanNameVal = (cleanedName || "").trim();
      let depName = cleanTitle;
      if (cleanNameVal && cleanNameVal !== cleanTitle) {
        if (cleanNameVal.startsWith(cleanTitle)) {
          depName = cleanNameVal;
        } else if (cleanTitle.startsWith(cleanNameVal)) {
          depName = cleanTitle;
        } else {
          depName = `${cleanTitle} ${cleanNameVal}`;
        }
      }
      return {
        id: m.id,
        monkObj: m,
        name: depName,
        position: `รองเจ้าคณะจังหวัด${province} รูปที่ ${idx + 1}`,
        temple: m.residingTemple,
        district: m.district,
        subdistrict: m.subdistrict,
        rank: m.rankClass || "พระราชาคณะ",
        imageColor: "from-amber-600 to-amber-800",
        image: m.image || "",
        details: m.remarks || `รองเจ้าคณะจังหวัด${province}`
      };
    });

    const secretaryMonks = filteredMonks.filter(m =>
      m.sanghaPosition && (
        m.sanghaPosition.includes("เลข.จจ") || m.sanghaPosition.includes("เลข.รจจ")
      )
    );
    
    return {
      provinceName: province,
      statistics: {
        totalTemples,
        totalMonks,
        totalNovices: 2510,
        totalDistricts: districtsList.length
      },
      districts: districtsList,
      regionalHierarchy: {
        governor: regGovernor,
        deputies: regDeputies,
        advisors: regAdvisors,
        secretary: regSecretary
      },
      hierarchy: {
        governor,
        deputies,
        secretaries: secretaryMonks
      },
      monks: filteredMonks,
      temples: filteredTemples,
      events: filteredEvents
    };
  }

  // Global handler for province card navigation
  window.selectProvinceView = function(provName) {
    localStorage.setItem("SELECTED_PROVINCE", provName);
    const selectEl = document.getElementById("province-select");
    if (selectEl) selectEl.value = provName;
    window.location.reload();
  };

  // โหลดข้อมูลเริ่มต้น
  const { data: loadedData, dataSource } = await loadSanghaData();
  
  let selectedProvince = localStorage.getItem("SELECTED_PROVINCE") || "REGION";
  const provinceSelect = document.getElementById("province-select");
  if (provinceSelect) {
    provinceSelect.value = selectedProvince;
    provinceSelect.addEventListener("change", (e) => {
      localStorage.setItem("SELECTED_PROVINCE", e.target.value);
      window.location.reload();
    });
  }

  // UI Title / Subtitle updates
  const headerTitle = document.querySelector(".header-title");
  const heroMainTitle = document.getElementById("hero-main-title");
  const heroMainDesc = document.getElementById("hero-main-desc");
  const statsSectionTitle = document.getElementById("stats-section-title");
  const hierarchyTitle = document.getElementById("hierarchy-title");
  const provinceCardsSection = document.getElementById("province-cards-section");
  const backToRegionContainer = document.getElementById("back-to-region-container");
  const backToRegionBtn = document.getElementById("back-to-region-btn");

  if (backToRegionBtn) {
    backToRegionBtn.addEventListener("click", () => {
      window.selectProvinceView("REGION");
    });
  }

  const isRegionMode = (selectedProvince === "REGION");

  if (isRegionMode) {
    document.title = "ระบบข้อมูลทำเนียบคณะสงฆ์ ภาค 2 (อยุธยา, สระบุรี, อ่างทอง)";
    if (headerTitle) headerTitle.textContent = "คณะสงฆ์ภาค 2 (อยุธยา, สระบุรี, อ่างทอง)";
    if (heroMainTitle) heroMainTitle.textContent = "ระบบทะเบียนประวัติและทำเนียบปกครอง คณะสงฆ์ภาค 2";
    if (heroMainDesc) heroMainDesc.textContent = "ศูนย์กลางระบบทำเนียบประวัติและติดตามภารกิจปกครอง คณะสงฆ์ภาค 2 (อยุธยา, สระบุรี, อ่างทอง) ครอบคลุมทั้งตำแหน่งภาค 2 เจ้าคณะภาค รองเจ้าคณะภาค ที่ปรึกษา เลขานุการ และเจ้าคณะจังหวัด";
    if (statsSectionTitle) statsSectionTitle.textContent = "ข้อมูลสถิติคณะสงฆ์ภาค 2 (รวม 3 จังหวัด)";
    if (hierarchyTitle) hierarchyTitle.textContent = "โครงสร้างการบริหารคณะสงฆ์ภาค 2";
    if (provinceCardsSection) provinceCardsSection.classList.remove("hidden");
    if (backToRegionContainer) backToRegionContainer.classList.add("hidden");
  } else {
    document.title = `ระบบข้อมูลทำเนียบคณะสงฆ์ จังหวัด${selectedProvince}`;
    if (headerTitle) headerTitle.textContent = `คณะสงฆ์จังหวัด${selectedProvince}`;
    if (heroMainTitle) heroMainTitle.textContent = `ทำเนียบปกครอง คณะสงฆ์จังหวัด${selectedProvince}`;
    if (heroMainDesc) heroMainDesc.textContent = `สืบค้น ทะเบียนประวัติ และข้อมูลพระสังฆาธิการ เจ้าคณะจังหวัด รองเจ้าคณะจังหวัด เจ้าคณะอำเภอ และเจ้าคณะตำบลในจังหวัด${selectedProvince}`;
    if (statsSectionTitle) statsSectionTitle.textContent = `ข้อมูลสถิติคณะสงฆ์ จังหวัด${selectedProvince}`;
    if (hierarchyTitle) hierarchyTitle.textContent = `โครงสร้างการบริหารคณะสงฆ์ จังหวัด${selectedProvince}`;
    if (provinceCardsSection) provinceCardsSection.classList.add("hidden");
    if (backToRegionContainer) backToRegionContainer.classList.remove("hidden");
  }

  if (loadedData) {
    SANGHA_DATA = filterSanghaDataByProvince(loadedData, selectedProvince);
  } else {
    SANGHA_DATA = null;
  }

  if (!SANGHA_DATA) {
    alert("ไม่สามารถเชื่อมต่อระบบฐานข้อมูลคณะสงฆ์ได้ กรุณาตรวจสอบการเชื่อมต่อ");
    return;
  }

  window.SANGHA_DATA = SANGHA_DATA;

  // แสดง Badge หากไม่ได้ดึงตรงจาก Live MySQL Database
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

  if (districtFilter) {
    SANGHA_DATA.districts.forEach(dist => {
      const option = document.createElement("option");
      option.value = dist.name;
      option.textContent = dist.name;
      districtFilter.appendChild(option);
    });

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
  }

  // 5. Render Hierarchy Tree (Region 2 vs Province Hierarchy)
  const treeContainer = document.getElementById("hierarchy-tree-container");

  function createMonkCard(m, customPosition) {
    const card = document.createElement("div");
    card.className = "hierarchy-card";
    const avatar = m.image ? 
      `<img src="${m.image}" alt="${m.title}">` : 
      `<i data-lucide="crown"></i>`;

    const { name: cleanedName, chaya: cleanedChaya } = cleanNameAndChaya(m.firstName, m.chaya);
    const formattedTitleName = formatTitleAndName(m.title, cleanedName);
    const pos = customPosition || m.sanghaPosition || m.templePosition || "ผู้บริหาร";

    card.innerHTML = `
      <div class="h-avatar-glow">
        ${avatar}
      </div>
      <span class="h-pos">${pos}</span>
      <h4>${formattedTitleName}</h4>
      ${cleanedChaya ? `<div style="font-size: 13px; color: var(--accent-gold); margin-bottom: 4px;">ฉายา: <strong>${cleanedChaya}</strong></div>` : ''}
      <p class="h-temple">${formatTempleName(m.residingTemple)} ${m.province ? '(' + m.province + ')' : ''}</p>
    `;
    card.addEventListener("click", (e) => {
      if (e.target.tagName === 'IMG' && m.image) {
        e.stopPropagation();
        openImageLightbox(m.image, `${formattedTitleName} (${pos})`);
        return;
      }
      openMonkModal(m);
    });
    return card;
  }

  if (treeContainer) {
    treeContainer.innerHTML = "";

    if (isRegionMode) {
      // REGION MODE HIERARCHY
      const regData = SANGHA_DATA.regionalHierarchy;
      
      // Tier 1: เจ้าคณะภาค 2
      if (regData.governor) {
        const tier1 = document.createElement("div");
        tier1.className = "region-tier";
        tier1.innerHTML = `<span class="tier-label">เจ้าคณะภาค 2</span>`;
        tier1.appendChild(createMonkCard(regData.governor, "เจ้าคณะภาค 2"));
        treeContainer.appendChild(tier1);
      }

      // Connector
      treeContainer.appendChild(document.createElement("div")).className = "hierarchy-connector-vertical";

      // Tier 2: รองเจ้าคณะภาค 2
      if (regData.deputies && regData.deputies.length > 0) {
        const tier2 = document.createElement("div");
        tier2.className = "region-tier";
        tier2.innerHTML = `<span class="tier-label">รองเจ้าคณะภาค 2 (${regData.deputies.length} รูป)</span>`;
        const row = document.createElement("div");
        row.className = "tier-cards-row";
        regData.deputies.forEach(dep => {
          row.appendChild(createMonkCard(dep, "รองเจ้าคณะภาค 2"));
        });
        tier2.appendChild(row);
        treeContainer.appendChild(tier2);
      }

      // Connector
      treeContainer.appendChild(document.createElement("div")).className = "hierarchy-connector-vertical";

      // Tier 3: ที่ปรึกษาเจ้าคณะภาค 2
      if (regData.advisors && regData.advisors.length > 0) {
        const tier3 = document.createElement("div");
        tier3.className = "region-tier";
        tier3.innerHTML = `<span class="tier-label">ที่ปรึกษาเจ้าคณะภาค 2 (${regData.advisors.length} รูป)</span>`;
        const row = document.createElement("div");
        row.className = "tier-cards-row";
        regData.advisors.forEach(adv => {
          row.appendChild(createMonkCard(adv, "ที่ปรึกษาเจ้าคณะภาค 2"));
        });
        tier3.appendChild(row);
        treeContainer.appendChild(tier3);
      }

      // Connector
      treeContainer.appendChild(document.createElement("div")).className = "hierarchy-connector-vertical";

      // Tier 4: เลขานุการเจ้าคณะภาค 2
      if (regData.secretary) {
        const tier4 = document.createElement("div");
        tier4.className = "region-tier";
        tier4.innerHTML = `<span class="tier-label">เลขานุการเจ้าคณะภาค 2</span>`;
        tier4.appendChild(createMonkCard(regData.secretary, "เลขานุการเจ้าคณะภาค 2"));
        treeContainer.appendChild(tier4);
      }

    } else {
      // PROVINCIAL MODE HIERARCHY
      const provGov = SANGHA_DATA.hierarchy.governor;
      const provDeps = SANGHA_DATA.hierarchy.deputies;
      const provSecs = SANGHA_DATA.hierarchy.secretaries;

      // Tier 1: เจ้าคณะจังหวัด
      if (provGov && provGov.monkObj) {
        const tier1 = document.createElement("div");
        tier1.className = "region-tier";
        tier1.innerHTML = `<span class="tier-label">เจ้าคณะจังหวัด${selectedProvince}</span>`;
        tier1.appendChild(createMonkCard(provGov.monkObj, provGov.position));
        treeContainer.appendChild(tier1);
      }

      // Connector
      if (provDeps && provDeps.length > 0) {
        treeContainer.appendChild(document.createElement("div")).className = "hierarchy-connector-vertical";

        // Tier 2: รองเจ้าคณะจังหวัด
        const tier2 = document.createElement("div");
        tier2.className = "region-tier";
        tier2.innerHTML = `<span class="tier-label">รองเจ้าคณะจังหวัด${selectedProvince} (${provDeps.length} รูป)</span>`;
        const row = document.createElement("div");
        row.className = "tier-cards-row";
        provDeps.forEach(dep => {
          if (dep.monkObj) row.appendChild(createMonkCard(dep.monkObj, dep.position));
        });
        tier2.appendChild(row);
        treeContainer.appendChild(tier2);
      }

      // Tier 3: เลขานุการเจ้าคณะจังหวัด (ถ้ามี)
      if (provSecs && provSecs.length > 0) {
        treeContainer.appendChild(document.createElement("div")).className = "hierarchy-connector-vertical";

        const tier3 = document.createElement("div");
        tier3.className = "region-tier";
        tier3.innerHTML = `<span class="tier-label">เลขานุการ / ที่ปรึกษา เจ้าคณะจังหวัด${selectedProvince} (${provSecs.length} รูป)</span>`;
        const row = document.createElement("div");
        row.className = "tier-cards-row";
        provSecs.forEach(sec => {
          row.appendChild(createMonkCard(sec, sec.sanghaPosition));
        });
        tier3.appendChild(row);
        treeContainer.appendChild(tier3);
      }
    }
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
      const { name: cleanedName, chaya: cleanedChaya } = cleanNameAndChaya(monk.firstName, monk.chaya);
      const formattedTitleName = formatTitleAndName(monk.title, cleanedName);
      const initials = formattedTitleName.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา|เจ้าอธิการ|พระอธิการ|พระ/g, "").trim().substring(0, 2);
      
      const card = document.createElement("div");
      card.className = "monk-card";
      
      let positionBadge = "";
      if (monk.sanghaPosition && monk.sanghaPosition !== "ไม่มี" && monk.sanghaPosition.trim() !== "") {
        positionBadge = monk.sanghaPosition;
      } else if (monk.templePosition && monk.templePosition !== "ไม่มี" && monk.templePosition.trim() !== "") {
        positionBadge = monk.templePosition;
      }
      const hasPos = positionBadge && positionBadge !== "ไม่มี" && positionBadge.trim() !== "";
      const positionBadgeHTML = hasPos ? `<span class="badge badge-primary" style="margin-top: 2px;">${positionBadge}</span>` : "";

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
              <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${formattedTitleName}</h4>
              ${cleanedChaya ? `
              <div style="font-size: 13px; color: var(--accent-gold); margin-bottom: 4px;">
                ฉายา: <strong>${cleanedChaya}</strong>
              </div>` : ''}
              ${positionBadgeHTML}
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
          openImageLightbox(monk.image, `${monk.title} (${cleanedName} ${cleanedChaya})`);
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
      const { name: cleanedName, chaya: cleanedChaya } = cleanNameAndChaya(monk.firstName, monk.chaya);
      const formattedTitleName = formatTitleAndName(monk.title, cleanedName);
      const initials = formattedTitleName.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา|เจ้าอธิการ|พระอธิการ|พระ/g, "").trim().substring(0, 2);
      
      let positionBadge = "";
      if (monk.sanghaPosition && monk.sanghaPosition !== "ไม่มี" && monk.sanghaPosition.trim() !== "") {
        positionBadge = monk.sanghaPosition;
      } else if (monk.templePosition && monk.templePosition !== "ไม่มี" && monk.templePosition.trim() !== "") {
        positionBadge = monk.templePosition;
      }
      const hasPos = positionBadge && positionBadge !== "ไม่มี" && positionBadge.trim() !== "";
      const positionBadgeHTML = hasPos ? `<span class="badge badge-primary">${positionBadge}</span>` : "";

      let avatarHTML = `<div class="table-monk-avatar"><span>${initials || "พ"}</span></div>`;
      if (monk.image) {
        avatarHTML = `<div class="table-monk-avatar"><img src="${monk.image}" alt="${monk.title}" onerror="this.outerHTML='<span>${initials || "พ"}</span>'"></div>`;
      }

      const tr = document.createElement("tr");
      tr.className = "monk-table-row";
      tr.innerHTML = `
        <td style="text-align: center;">${avatarHTML}</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${formattedTitleName}</div>
          ${cleanedChaya ? `<div style="font-size: 11px; color: var(--accent-gold); margin-top: 2px;">ฉายา: ${cleanedChaya}</div>` : ""}
        </td>
        <td>${positionBadgeHTML}</td>
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
    const { name: cleanedName, chaya: cleanedChaya } = cleanNameAndChaya(monk.firstName, monk.chaya);
    const formattedTitleName = formatTitleAndName(monk.title, cleanedName);
    const initials = formattedTitleName.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา|เจ้าอธิการ|พระอธิการ|พระ/g, "").trim().substring(0, 2);

    let displayName = formattedTitleName;
    if (monk.lastName && monk.lastName.trim()) {
      displayName += ` ${monk.lastName.trim()}`;
    }

    // Header values
    document.getElementById("modal-name").textContent = displayName;
    
    // Position badge logic
    let positionText = "";
    if (monk.sanghaPosition && monk.sanghaPosition !== "ไม่มี" && monk.sanghaPosition.trim() !== "") {
      positionText = monk.sanghaPosition;
    } else if (monk.templePosition && monk.templePosition !== "ไม่มี" && monk.templePosition.trim() !== "") {
      positionText = monk.templePosition;
    }
    const hasPos = positionText && positionText !== "ไม่มี" && positionText.trim() !== "";
    const badgeSanghaPos = document.getElementById("modal-badge-sangha-pos");
    if (badgeSanghaPos) {
      if (hasPos) {
        badgeSanghaPos.textContent = positionText;
        badgeSanghaPos.style.display = "";
      } else {
        badgeSanghaPos.style.display = "none";
      }
    }

    document.getElementById("modal-badge-faction").textContent = monk.faction;
    document.getElementById("modal-badge-pali").textContent = monk.paliEducation !== "ไม่มี" ? monk.paliEducation : monk.dhammaEducation;

    // Set Avatar Image / Initials
    const avatarEl = document.getElementById("modal-avatar");
    if (avatarEl) {
      if (monk.image) {
        avatarEl.innerHTML = `<img src="${monk.image}" alt="${monk.title}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit; cursor:pointer;" onerror="this.outerHTML='<span>${initials || "พ"}</span>'">`;
        avatarEl.onclick = () => openImageLightbox(monk.image, `${monk.title} (${cleanedName} ${cleanedChaya})`);
      } else {
        avatarEl.innerHTML = `<span>${initials || "พ"}</span>`;
        avatarEl.onclick = null;
      }
    }

    // Tab 1: General Info
    document.getElementById("modal-title-rank").textContent = monk.rankClass || "พระภิกษุสงฆ์ทั่วไป";
    document.getElementById("modal-chaya").textContent = monk.chaya || "-";
    document.getElementById("modal-nickname").textContent = monk.nickname || "-";
    document.getElementById("modal-idcard").textContent = monk.idCard || monk.personCode || "-";
    document.getElementById("modal-birth-date").textContent = monk.birthDate || "-";
    document.getElementById("modal-general-edu").textContent = monk.education || "-";
    document.getElementById("modal-dhamma-edu").textContent = monk.dhammaEducation || "-";
    document.getElementById("modal-pali-edu").textContent = monk.paliEducation || monk.paliGrade || "-";
    document.getElementById("modal-phone").textContent = monk.phoneSecondary ? `${monk.phone} / ${monk.phoneSecondary}` : (monk.phone || "-");
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
