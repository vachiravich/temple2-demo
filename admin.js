// ระบบควบคุมหลังบ้าน รองรับทั้งฐานข้อมูลจริง MySQL (ผ่าน PHP) และโหมด GitHub Pages (localStorage)
document.addEventListener("DOMContentLoaded", () => {
  const isGitHubPages = window.location.hostname.endsWith("github.io");

  // 1. Initial Lucide Icons
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // 2. Authentication System (Mock)
  const loginContainer = document.getElementById("login-container");
  const adminDashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");

  // ตรวจสอบสถานะการเข้าสู่ระบบปัจจุบัน
  const isLoggedIn = sessionStorage.getItem("admin_logged_in") === "true";
  if (isLoggedIn) {
    loginContainer.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    document.body.classList.add("admin-mode-active");
    initializeDashboard();
  } else {
    loginContainer.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
  }

  // Handle Login Submit
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userVal = document.getElementById("username").value.trim();
    const passVal = document.getElementById("password").value.trim();

    if (userVal === "072" && passVal === "072") {
      sessionStorage.setItem("admin_logged_in", "true");
      loginError.classList.add("hidden");
      loginContainer.classList.add("hidden");
      adminDashboard.classList.remove("hidden");
      document.body.classList.add("admin-mode-active");
      initializeDashboard();
      
      // ล้างรหัสผ่านฟอร์ม
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    } else {
      loginError.classList.remove("hidden");
    }
  });

  // Handle Logout
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("admin_logged_in");
    document.body.classList.remove("admin-mode-active");
    window.location.reload();
  });

  // 3. CSS Theme Toggle for Login Screen & Admin Dashboard
  const themeToggleLoginBtn = document.getElementById("login-theme-btn");
  const themeToggleAdminBtn = document.getElementById("admin-theme-btn");
  const htmlElement = document.documentElement;

  const applyTheme = (theme) => {
    htmlElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };

  const savedTheme = localStorage.getItem("theme") || "dark";
  applyTheme(savedTheme);

  themeToggleLoginBtn.addEventListener("click", () => {
    const current = htmlElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  if (themeToggleAdminBtn) {
    themeToggleAdminBtn.addEventListener("click", () => {
      const current = htmlElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  // ==================== DASHBOARD MANAGEMENT FUNCTIONS ====================
  async function initializeDashboard() {
    // 1. Sidebar Tab Switching
    const navItems = document.querySelectorAll(".nav-item");
    const panels = document.querySelectorAll(".admin-panel");
    const panelTitle = document.getElementById("current-panel-title");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const targetPanelId = item.getAttribute("data-target");

        // Remove active state
        navItems.forEach(i => i.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));

        // Add active state
        item.classList.add("active");
        const activePanel = document.getElementById(targetPanelId);
        if (activePanel) activePanel.classList.add("active");

        // Update Title text
        panelTitle.textContent = item.textContent.trim();
        
        // Refresh Lucide Icons for safety
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    });

    // 2. Fetch Data (Depending on Environment)
    let sanghaDb;
    if (isGitHubPages) {
      console.log("Admin Back-office running in Static Demo Mode on GitHub Pages");
      if (!localStorage.getItem("SANGHA_DATABASE") && typeof INITIAL_SANGHA_DATA !== "undefined") {
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(INITIAL_SANGHA_DATA));
      }
      try {
        sanghaDb = JSON.parse(localStorage.getItem("SANGHA_DATABASE")) || INITIAL_SANGHA_DATA;
      } catch (e) {
        sanghaDb = typeof INITIAL_SANGHA_DATA !== "undefined" ? INITIAL_SANGHA_DATA : null;
      }
      
      // แสดงป้ายบอกสถานะ GitHub Pages บนแผงแอดมิน
      const statusTitle = document.getElementById("current-panel-title");
      if (statusTitle && !statusTitle.querySelector(".badge-demo")) {
        const b = document.createElement("span");
        b.className = "badge-demo";
        b.textContent = "โหมดจำลอง (Static Demo)";
        b.style.fontSize = "11px";
        b.style.background = "rgba(245, 158, 11, 0.2)";
        b.style.color = "#f59e0b";
        b.style.padding = "2px 8px";
        b.style.marginLeft = "10px";
        b.style.borderRadius = "4px";
        b.style.display = "inline-block";
        statusTitle.appendChild(b);
      }
    } else {
      // โหมดฐานข้อมูลจริง (PHP Backend)
      try {
        const response = await fetch('api_get_data.php');
        const result = await response.json();
        if (result.status === 'success') {
          sanghaDb = result;
        } else {
          alert("ไม่สามารถดึงข้อมูลจากระบบได้: " + result.message);
          return;
        }
      } catch (e) {
        console.error(e);
        alert("เกิดข้อผิดพลาดในการต่อเชื่อม API หลังบ้าน");
        return;
      }
    }

    // Expose database globally so edit hooks can read it
    window.SANGHA_DATA = sanghaDb;

    // 3. Stats update
    updateStatsCounters(sanghaDb);

    // 4. Render tables
    renderMonksTable(sanghaDb.monks);
    renderTemplesTable(sanghaDb.temples);
    renderEventsTable(sanghaDb.events);

    // 5. Initialize search filters
    setupSearchFilters(sanghaDb);

    // 6. Init form structures (Cascading selects)
    setupFormCascadingSelects(sanghaDb);

    // 8. Form Tabs Switching (Monk Add/Edit Form Modal)
    const formTabBtns = document.querySelectorAll(".form-tab-btn");
    const formTabPanels = document.querySelectorAll(".form-tab-content-panel");

    formTabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTabId = btn.getAttribute("data-tab");
        
        formTabBtns.forEach(b => b.classList.remove("active"));
        formTabPanels.forEach(p => p.classList.add("hidden"));

        btn.classList.add("active");
        document.getElementById(targetTabId).classList.remove("hidden");
      });
    });
  }

  // 7. Reset DB Hook (Defined outside initialize so it doesn't double bind)
  const resetBtn = document.getElementById("reset-db-btn");
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "true";
    resetBtn.addEventListener("click", async () => {
      if (confirm("คุณต้องการล้างข้อมูลและเริ่มต้นฐานข้อมูลใหม่ทั้งหมดใช่หรือไม่?")) {
        if (isGitHubPages) {
          localStorage.removeItem("SANGHA_DATABASE");
          alert("รีเซ็ตระบบจำลองของเว็บบราวเซอร์เรียบร้อยแล้ว");
          window.location.reload();
        } else {
          try {
            const res = await fetch('api_manage.php?action=reset_db', { method: 'POST' });
            const r = await res.json();
            alert(r.message);
            if (r.status === 'success') {
              window.location.reload();
            }
          } catch (e) {
            alert("ไม่สามารถรีเซ็ตฐานข้อมูลได้: " + e.message);
          }
        }
      }
    });
  }

  // ==================== CRUD HOOKS & CONTROLLERS ====================
  const monkModal = document.getElementById("monk-form-modal");
  const monkForm = document.getElementById("monk-crud-form");
  const templeModal = document.getElementById("temple-form-modal");
  const templeForm = document.getElementById("temple-crud-form");
  const eventModal = document.getElementById("event-form-modal");
  const eventForm = document.getElementById("event-crud-form");

  // Add Monk Btn
  const addMonkBtn = document.getElementById("add-monk-btn");
  if (addMonkBtn && !addMonkBtn.dataset.bound) {
    addMonkBtn.dataset.bound = "true";
    addMonkBtn.addEventListener("click", () => {
      monkForm.reset();
      document.getElementById("form-monk-id").value = "";
      document.getElementById("form-monk-title").textContent = "เพิ่มข้อมูลพระภิกษุสงฆ์";
      
      // Default to first tab
      document.querySelectorAll(".form-tab-btn")[0].click();
      
      // Reset selects
      document.getElementById("f-district").value = "";
      const subSelect = document.getElementById("f-subdistrict");
      subSelect.innerHTML = '<option value="">เลือกตำบล (เลือกอำเภอก่อน)</option>';
      subSelect.disabled = true;

      monkModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
  }

  // Close Monk Modal
  const closeMonkFormBtn = document.getElementById("close-monk-form-btn");
  if (closeMonkFormBtn && !closeMonkFormBtn.dataset.bound) {
    closeMonkFormBtn.dataset.bound = "true";
    closeMonkFormBtn.addEventListener("click", closeMonkForm);
  }
  const cancelMonkBtn = document.getElementById("cancel-monk-btn");
  if (cancelMonkBtn && !cancelMonkBtn.dataset.bound) {
    cancelMonkBtn.dataset.bound = "true";
    cancelMonkBtn.addEventListener("click", closeMonkForm);
  }
  
  function closeMonkForm() {
    monkModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // Submit Monk Form (Add/Update)
  if (monkForm && !monkForm.dataset.bound) {
    monkForm.dataset.bound = "true";
    monkForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const monkId = document.getElementById("form-monk-id").value;
      const newMonkData = {
        id: monkId,
        title: document.getElementById("f-title").value.trim(),
        firstName: document.getElementById("f-firstname").value.trim(),
        lastName: document.getElementById("f-lastname").value.trim(),
        chaya: document.getElementById("f-chaya").value.trim(),
        nickname: document.getElementById("f-nickname").value.trim(),
        idCard: document.getElementById("f-idcard").value.trim(),
        birthDate: document.getElementById("f-birthdate").value.trim(),
        phone: document.getElementById("f-phone").value.trim(),
        lineId: document.getElementById("f-lineid").value.trim(),
        ordinationDate: document.getElementById("f-orddate").value.trim(),
        upajjhaya: document.getElementById("f-upajjhaya").value.trim(),
        vassa: parseInt(document.getElementById("f-vassa").value) || 0,
        age: parseInt(document.getElementById("f-age").value) || 0,
        residingTemple: document.getElementById("f-temple-residing").value.trim(),
        affiliatedTemple: document.getElementById("f-temple-affiliated").value.trim(),
        district: document.getElementById("f-district").value,
        subdistrict: document.getElementById("f-subdistrict").value,
        province: document.getElementById("f-province").value,
        region: document.getElementById("f-region").value,
        templePosition: document.getElementById("f-temple-pos").value,
        sanghaPosition: document.getElementById("f-sangha-pos").value,
        upajjhayaStatus: document.getElementById("f-upajjhaya-status").value,
        upajjhayaCode: document.getElementById("f-upajjhaya-code").value.trim(),
        rajathinnanam: document.getElementById("f-rajathinnanam").value.trim(),
        rankClass: document.getElementById("f-rankclass").value.trim(),
        faction: document.getElementById("f-faction").value,
        education: document.getElementById("f-education").value.trim(),
        dhammaEducation: document.getElementById("f-dhamma").value,
        paliEducation: document.getElementById("f-pali").value
      };

      if (isGitHubPages) {
        const currentDb = JSON.parse(localStorage.getItem("SANGHA_DATABASE")) || INITIAL_SANGHA_DATA;
        if (monkId) {
          const idx = currentDb.monks.findIndex(m => m.id == monkId);
          if (idx !== -1) {
            currentDb.monks[idx] = { ...newMonkData, id: monkId };
          }
        } else {
          newMonkData.id = "monk-" + Date.now();
          currentDb.monks.push(newMonkData);
        }
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(currentDb));
        alert("บันทึกข้อมูลพระสงฆ์เรียบร้อยแล้ว (บราวเซอร์)");
        closeMonkForm();
        initializeDashboard();
      } else {
        try {
          const response = await fetch('api_manage.php?action=save_monk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMonkData)
          });
          const r = await response.json();
          alert(r.message);
          if (r.status === 'success') {
            closeMonkForm();
            initializeDashboard();
          }
        } catch (err) {
          alert("ไม่สามารถบันทึกข้อมูลพระสงฆ์ได้: " + err.message);
        }
      }
    });
  }

  // Add Temple Btn
  const addTempleBtn = document.getElementById("add-temple-btn");
  if (addTempleBtn && !addTempleBtn.dataset.bound) {
    addTempleBtn.dataset.bound = "true";
    addTempleBtn.addEventListener("click", () => {
      templeForm.reset();
      document.getElementById("form-temple-id").value = "";
      document.getElementById("form-temple-title").textContent = "เพิ่มรายชื่อวัด";
      
      // Clear selects
      document.getElementById("ft-district").value = "";
      const subSelect = document.getElementById("ft-subdistrict");
      subSelect.innerHTML = '<option value="">เลือกตำบล (เลือกอำเภอก่อน)</option>';
      subSelect.disabled = true;

      templeModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
  }

  const closeTempleFormBtn = document.getElementById("close-temple-form-btn");
  if (closeTempleFormBtn && !closeTempleFormBtn.dataset.bound) {
    closeTempleFormBtn.dataset.bound = "true";
    closeTempleFormBtn.addEventListener("click", closeTempleForm);
  }
  const cancelTempleBtn = document.getElementById("cancel-temple-btn");
  if (cancelTempleBtn && !cancelTempleBtn.dataset.bound) {
    cancelTempleBtn.dataset.bound = "true";
    cancelTempleBtn.addEventListener("click", closeTempleForm);
  }

  function closeTempleForm() {
    templeModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (templeForm && !templeForm.dataset.bound) {
    templeForm.dataset.bound = "true";
    templeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const templeId = document.getElementById("form-temple-id").value;
      const newTempleData = {
        id: templeId,
        name: document.getElementById("ft-name").value.trim(),
        type: document.getElementById("ft-type").value.trim(),
        district: document.getElementById("ft-district").value,
        subdistrict: document.getElementById("ft-subdistrict").value,
        abbot: document.getElementById("ft-abbot").value.trim()
      };

      if (isGitHubPages) {
        const currentDb = JSON.parse(localStorage.getItem("SANGHA_DATABASE")) || INITIAL_SANGHA_DATA;
        if (templeId) {
          const idx = currentDb.temples.findIndex(t => t.id == templeId);
          if (idx !== -1) {
            currentDb.temples[idx] = { ...newTempleData, id: templeId };
          }
        } else {
          newTempleData.id = "tmp-" + Date.now();
          currentDb.temples.push(newTempleData);
        }
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(currentDb));
        alert("บันทึกข้อมูลวัดเรียบร้อยแล้ว (บราวเซอร์)");
        closeTempleForm();
        initializeDashboard();
      } else {
        try {
          const response = await fetch('api_manage.php?action=save_temple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTempleData)
          });
          const r = await response.json();
          alert(r.message);
          if (r.status === 'success') {
            closeTempleForm();
            initializeDashboard();
          }
        } catch (err) {
          alert("ไม่สามารถบันทึกข้อมูลวัดได้: " + err.message);
        }
      }
    });
  }

  // Add Event Btn
  const addEventBtn = document.getElementById("add-event-btn");
  if (addEventBtn && !addEventBtn.dataset.bound) {
    addEventBtn.dataset.bound = "true";
    addEventBtn.addEventListener("click", () => {
      eventForm.reset();
      document.getElementById("form-event-id").value = "";
      document.getElementById("form-event-title").textContent = "เพิ่มกิจกรรมคณะสงฆ์";
      
      eventModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
  }

  const closeEventFormBtn = document.getElementById("close-event-form-btn");
  if (closeEventFormBtn && !closeEventFormBtn.dataset.bound) {
    closeEventFormBtn.dataset.bound = "true";
    closeEventFormBtn.addEventListener("click", closeEventForm);
  }
  const cancelEventBtn = document.getElementById("cancel-event-btn");
  if (cancelEventBtn && !cancelEventBtn.dataset.bound) {
    cancelEventBtn.dataset.bound = "true";
    cancelEventBtn.addEventListener("click", closeEventForm);
  }

  function closeEventForm() {
    eventModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (eventForm && !eventForm.dataset.bound) {
    eventForm.dataset.bound = "true";
    eventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const eventId = document.getElementById("form-event-id").value;
      const newEventData = {
        id: eventId,
        title: document.getElementById("fe-title").value.trim(),
        date: document.getElementById("fe-date").value.trim(),
        type: document.getElementById("fe-type").value,
        description: document.getElementById("fe-desc").value.trim()
      };

      if (isGitHubPages) {
        const currentDb = JSON.parse(localStorage.getItem("SANGHA_DATABASE")) || INITIAL_SANGHA_DATA;
        if (eventId) {
          const idx = currentDb.events.findIndex(ev => ev.id == eventId);
          if (idx !== -1) {
            currentDb.events[idx] = { ...newEventData, id: eventId };
          }
        } else {
          newEventData.id = "evt-" + Date.now();
          currentDb.events.push(newEventData);
        }
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(currentDb));
        alert("บันทึกกิจกรรมเรียบร้อยแล้ว (บราวเซอร์)");
        closeEventForm();
        initializeDashboard();
      } else {
        try {
          const response = await fetch('api_manage.php?action=save_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEventData)
          });
          const r = await response.json();
          alert(r.message);
          if (r.status === 'success') {
            closeEventForm();
            initializeDashboard();
          }
        } catch (err) {
          alert("ไม่สามารถบันทึกกิจกรรมได้: " + err.message);
        }
      }
    });
  }

  // Update statistics dashboard counts
  function updateStatsCounters(db) {
    document.getElementById("admin-stat-monks").textContent = db.monks.length;
    document.getElementById("admin-stat-temples").textContent = db.temples.length;
    document.getElementById("admin-stat-events").textContent = db.events.length;
  }

  // Render Monks list into Admin Table
  function renderMonksTable(monks) {
    const tableBody = document.getElementById("admin-monk-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (monks.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center">ไม่พบข้อมูลพระภิกษุสงฆ์</td></tr>`;
      return;
    }

    monks.forEach(monk => {
      const tr = document.createElement("tr");
      const nameShort = monk.title ? monk.title : `${monk.firstName}`;
      const initials = nameShort.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา/g, "").trim().substring(0, 2);
      
      let positionText = monk.sanghaPosition !== "ไม่มี" ? monk.sanghaPosition : monk.templePosition;

      tr.innerHTML = `
        <td>
          <div class="card-avatar" style="width:40px; height:40px; font-size:14px; margin: 0 auto;">
            <span>${initials || "พ"}</span>
          </div>
        </td>
        <td>
          <strong>${monk.title} ${monk.firstName} ${monk.lastName}</strong>
          <div style="font-size:12px; color:var(--text-muted);">ฉายา: ${monk.chaya}</div>
        </td>
        <td><span class="badge badge-primary">${positionText}</span></td>
        <td><span class="badge badge-secondary">${monk.faction}</span></td>
        <td>${monk.residingTemple}</td>
        <td>${monk.vassa} พรรษา</td>
        <td>
          <div class="row-actions" style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-edit-monk" data-id="${monk.id}" style="padding: 6px 12px; font-size: 13px;">
              <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
            </button>
            <button class="btn btn-text btn-delete-monk" data-id="${monk.id}" style="padding: 6px 12px; font-size: 13px; color: #ef4444;">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </td>
      `;

      // Bind actions
      tr.querySelector(".btn-edit-monk").addEventListener("click", () => editMonkAction(monk.id));
      tr.querySelector(".btn-delete-monk").addEventListener("click", () => deleteMonkAction(monk.id));

      tableBody.appendChild(tr);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  // Render Temples list into Admin Table
  function renderTemplesTable(temples) {
    const tableBody = document.getElementById("admin-temple-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (temples.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center">ไม่พบข้อมูลวัด</td></tr>`;
      return;
    }

    temples.forEach(temple => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${temple.name}</strong></td>
        <td><span class="badge badge-secondary">${temple.type}</span></td>
        <td>${temple.subdistrict}</td>
        <td>${temple.district}</td>
        <td>${temple.abbot}</td>
        <td>
          <div class="row-actions" style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-edit-temple" data-id="${temple.id}" style="padding: 6px 12px; font-size: 13px;">
              <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
            </button>
            <button class="btn btn-text btn-delete-temple" data-id="${temple.id}" style="padding: 6px 12px; font-size: 13px; color: #ef4444;">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </td>
      `;

      // Bind actions
      tr.querySelector(".btn-edit-temple").addEventListener("click", () => editTempleAction(temple.id));
      tr.querySelector(".btn-delete-temple").addEventListener("click", () => deleteTempleAction(temple.id));

      tableBody.appendChild(tr);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  // Render Events list into Admin Table
  function renderEventsTable(events) {
    const tableBody = document.getElementById("admin-event-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (events.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center">ไม่พบข้อมูลกิจกรรม</td></tr>`;
      return;
    }

    events.forEach(evt => {
      const tr = document.createElement("tr");
      
      let typeText = "กิจกรรมสงฆ์";
      let typeBadge = "badge-secondary";
      if (evt.type === "holy-day") { typeText = "วันพระ"; typeBadge = "badge-primary"; }
      else if (evt.type === "meeting") { typeText = "การประชุม"; typeBadge = "badge-warning"; }
      else if (evt.type === "training") { typeText = "ฝึกอบรม"; typeBadge = "badge-info"; }

      tr.innerHTML = `
        <td><span class="badge ${typeBadge}">${typeText}</span></td>
        <td><span style="font-size:13px; font-weight:500;">${evt.date}</span></td>
        <td><strong>${evt.title}</strong></td>
        <td><p style="font-size:13px; max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${evt.description}</p></td>
        <td>
          <div class="row-actions" style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-edit-event" data-id="${evt.id}" style="padding: 6px 12px; font-size: 13px;">
              <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
            </button>
            <button class="btn btn-text btn-delete-event" data-id="${evt.id}" style="padding: 6px 12px; font-size: 13px; color: #ef4444;">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </td>
      `;

      // Bind actions
      tr.querySelector(".btn-edit-event").addEventListener("click", () => editEventAction(evt.id));
      tr.querySelector(".btn-delete-event").addEventListener("click", () => deleteEventAction(evt.id));

      tableBody.appendChild(tr);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  // Setup live search on tables
  function setupSearchFilters(db) {
    // Monk search
    document.getElementById("admin-search-monk").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = db.monks.filter(m => 
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.chaya.toLowerCase().includes(q) ||
        m.residingTemple.toLowerCase().includes(q) ||
        m.sanghaPosition.toLowerCase().includes(q)
      );
      renderMonksTable(filtered);
    });

    // Temple search
    document.getElementById("admin-search-temple").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = db.temples.filter(t => 
        t.name.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q) ||
        t.subdistrict.toLowerCase().includes(q) ||
        t.abbot.toLowerCase().includes(q)
      );
      renderTemplesTable(filtered);
    });

    // Event search
    document.getElementById("admin-search-event").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = db.events.filter(ev => 
        ev.title.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.date.toLowerCase().includes(q)
      );
      renderEventsTable(filtered);
    });
  }

  // Setup form select cascading dropdowns (District -> Subdistrict)
  function setupFormCascadingSelects(db) {
    const monkDistSelect = document.getElementById("f-district");
    const monkSubdistSelect = document.getElementById("f-subdistrict");
    const templeDistSelect = document.getElementById("ft-district");
    const templeSubdistSelect = document.getElementById("ft-subdistrict");

    // Clear and populate districts
    monkDistSelect.innerHTML = '<option value="">เลือกอำเภอ</option>';
    templeDistSelect.innerHTML = '<option value="">เลือกอำเภอ</option>';

    db.districts.forEach(dist => {
      const opt1 = document.createElement("option");
      opt1.value = dist.name;
      opt1.textContent = dist.name;
      monkDistSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = dist.name;
      opt2.textContent = dist.name;
      templeDistSelect.appendChild(opt2);
    });

    // Cascading listener for Monk form
    monkDistSelect.addEventListener("change", () => {
      handleDistrictSelectChange(monkDistSelect.value, monkSubdistSelect, db);
    });

    // Cascading listener for Temple form
    templeDistSelect.addEventListener("change", () => {
      handleDistrictSelectChange(templeDistSelect.value, templeSubdistSelect, db);
    });
  }

  function handleDistrictSelectChange(selectedDist, subdistSelect, db) {
    subdistSelect.innerHTML = '<option value="">เลือกตำบล</option>';
    
    if (!selectedDist) {
      subdistSelect.disabled = true;
      subdistSelect.innerHTML = '<option value="">เลือกตำบล (เลือกอำเภอก่อน)</option>';
      return;
    }

    const matched = db.districts.find(d => d.name === selectedDist);
    if (matched && matched.subdistricts) {
      subdistSelect.disabled = false;
      matched.subdistricts.forEach(sub => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;
        subdistSelect.appendChild(option);
      });
    }
  }

  // ==================== EDIT/DELETE ACTIONS (Read/Write via API) ====================

  // --- Monk Actions ---
  function editMonkAction(id) {
    const monk = window.SANGHA_DATA.monks.find(m => m.id == id);
    if (!monk) return;

    document.getElementById("form-monk-id").value = monk.id;
    document.getElementById("form-monk-title").textContent = "แก้ไขข้อมูลพระภิกษุสงฆ์";

    // Set simple inputs
    document.getElementById("f-title").value = monk.title;
    document.getElementById("f-firstname").value = monk.firstName;
    document.getElementById("f-lastname").value = monk.lastName;
    document.getElementById("f-chaya").value = monk.chaya;
    document.getElementById("f-nickname").value = monk.nickname || "";
    document.getElementById("f-idcard").value = monk.idCard;
    document.getElementById("f-birthdate").value = monk.birthDate;
    document.getElementById("f-phone").value = monk.phone;
    document.getElementById("f-lineid").value = monk.lineId || "";
    document.getElementById("f-orddate").value = monk.ordinationDate;
    document.getElementById("f-upajjhaya").value = monk.upajjhaya;
    document.getElementById("f-vassa").value = monk.vassa;
    document.getElementById("f-age").value = monk.age;
    document.getElementById("f-temple-residing").value = monk.residingTemple;
    document.getElementById("f-temple-affiliated").value = monk.affiliatedTemple;
    document.getElementById("f-upajjhaya-code").value = monk.upajjhayaCode || "";
    document.getElementById("f-rajathinnanam").value = monk.rajathinnanam || "";
    document.getElementById("f-rankclass").value = monk.rankClass;
    document.getElementById("f-other-pos").value = monk.otherPosition || "";

    // Set select inputs
    document.getElementById("f-dhamma").value = monk.dhammaEducation;
    document.getElementById("f-pali").value = monk.paliEducation;
    document.getElementById("f-temple-pos").value = monk.templePosition;
    document.getElementById("f-sangha-pos").value = monk.sanghaPosition;
    document.getElementById("f-upajjhaya-status").value = monk.upajjhayaStatus;
    document.getElementById("f-faction").value = monk.faction;

    // Set Cascading selects
    const districtSelect = document.getElementById("f-district");
    const subdistSelect = document.getElementById("f-subdistrict");
    
    districtSelect.value = monk.district;
    
    // Trigger populating subdistricts and select the correct one
    handleDistrictSelectChange(monk.district, subdistSelect, window.SANGHA_DATA);
    subdistSelect.value = monk.subdistrict;

    // Display
    document.querySelectorAll(".form-tab-btn")[0].click();
    monkModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  async function deleteMonkAction(id) {
    const monk = window.SANGHA_DATA.monks.find(m => m.id == id);
    if (!monk) return;

    if (confirm(`คุณยืนยันที่จะลบข้อมูลของ ${monk.title} หรือไม่?`)) {
      if (isGitHubPages) {
        const db = JSON.parse(localStorage.getItem("SANGHA_DATABASE"));
        db.monks = db.monks.filter(m => m.id != id);
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(db));
        alert("ลบข้อมูลพระสงฆ์เรียบร้อยแล้ว (บราวเซอร์)");
        initializeDashboard();
      } else {
        try {
          const response = await fetch('api_manage.php?action=delete_monk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
          });
          const r = await response.json();
          alert(r.message);
          if (r.status === 'success') {
            initializeDashboard();
          }
        } catch (err) {
          alert("ไม่สามารถลบข้อมูลได้: " + err.message);
        }
      }
    }
  }

  // --- Temple Actions ---
  function editTempleAction(id) {
    const temple = window.SANGHA_DATA.temples.find(t => t.id == id);
    if (!temple) return;

    document.getElementById("form-temple-id").value = temple.id;
    document.getElementById("form-temple-title").textContent = "แก้ไขรายชื่อวัด";

    document.getElementById("ft-name").value = temple.name;
    document.getElementById("ft-type").value = temple.type;
    document.getElementById("ft-abbot").value = temple.abbot;

    const districtSelect = document.getElementById("ft-district");
    const subdistSelect = document.getElementById("ft-subdistrict");

    districtSelect.value = temple.district;
    handleDistrictSelectChange(temple.district, subdistSelect, window.SANGHA_DATA);
    subdistSelect.value = temple.subdistrict;

    templeModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  async function deleteTempleAction(id) {
    const temple = window.SANGHA_DATA.temples.find(t => t.id == id);
    if (!temple) return;

    if (confirm(`คุณยืนยันที่จะลบวัด ${temple.name} หรือไม่?`)) {
      if (isGitHubPages) {
        const db = JSON.parse(localStorage.getItem("SANGHA_DATABASE"));
        db.temples = db.temples.filter(t => t.id != id);
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(db));
        alert("ลบข้อมูลวัดเรียบร้อยแล้ว (บราวเซอร์)");
        initializeDashboard();
      } else {
        try {
          const response = await fetch('api_manage.php?action=delete_temple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
          });
          const r = await response.json();
          alert(r.message);
          if (r.status === 'success') {
            initializeDashboard();
          }
        } catch (err) {
          alert("ไม่สามารถลบวัดได้: " + err.message);
        }
      }
    }
  }

  // --- Event Actions ---
  function editEventAction(id) {
    const evt = window.SANGHA_DATA.events.find(ev => ev.id == id);
    if (!evt) return;

    document.getElementById("form-event-id").value = evt.id;
    document.getElementById("form-event-title").textContent = "แก้ไขกิจกรรมคณะสงฆ์";

    document.getElementById("fe-title").value = evt.title;
    document.getElementById("fe-date").value = evt.date;
    document.getElementById("fe-type").value = evt.type;
    document.getElementById("fe-desc").value = evt.description;

    eventModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  async function deleteEventAction(id) {
    const evt = window.SANGHA_DATA.events.find(ev => ev.id == id);
    if (!evt) return;

    if (confirm(`คุณยืนยันที่จะลบกิจกรรม "${evt.title}" หรือไม่?`)) {
      if (isGitHubPages) {
        const db = JSON.parse(localStorage.getItem("SANGHA_DATABASE"));
        db.events = db.events.filter(ev => ev.id != id);
        localStorage.setItem("SANGHA_DATABASE", JSON.stringify(db));
        alert("ลบกิจกรรมเรียบร้อยแล้ว (บราวเซอร์)");
        initializeDashboard();
      } else {
        try {
          const response = await fetch('api_manage.php?action=delete_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
          });
          const r = await response.json();
          alert(r.message);
          if (r.status === 'success') {
            initializeDashboard();
          }
        } catch (err) {
          alert("ไม่สามารถลบกิจกรรมได้: " + err.message);
        }
      }
    }
  }
});
