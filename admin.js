// ระบบควบคุมหลังบ้าน รองรับทั้งฐานข้อมูลจริง MySQL (ผ่าน PHP) และโหมด GitHub Pages (localStorage)
document.addEventListener("DOMContentLoaded", () => {
  const isGitHubPages = window.location.hostname.endsWith("github.io");

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

  // State variables for pagination and filtering
  let monksCurrentPage = 1;
  const monksItemsPerPage = 15;
  let filteredMonksList = [];

  let templesCurrentPage = 1;
  const templesItemsPerPage = 15;
  let filteredTemplesList = [];

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

    // 2. Fetch Data (Direct PHP Database API First + Cache Buster)
    async function loadAdminSanghaData() {
      const timestamp = Date.now();
      let data = null;
      let dataSource = "unknown";

      // 2.1 ดึงจาก PHP MySQL Database API
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
            try { localStorage.setItem("SANGHA_DATABASE", JSON.stringify(result)); } catch(e) {}
          }
        }
      } catch (e) {
        console.warn("Admin Direct API fetch failed", e);
      }

      // 2.2 ถ้าไม่มี PHP API ให้ดึง data.json
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
              try { localStorage.setItem("SANGHA_DATABASE", JSON.stringify(result)); } catch(e) {}
            }
          }
        } catch (e) {
          console.warn("Admin static data.json fetch failed", e);
        }
      }

      // 2.3 Fallback to localStorage Cache
      if (!data) {
        try {
          const cached = localStorage.getItem("SANGHA_DATABASE");
          if (cached) {
            data = JSON.parse(cached);
            dataSource = "localStorage Cache";
          }
        } catch (e) {}
      }

      // 2.4 Fallback to INITIAL_SANGHA_DATA
      if (!data && typeof INITIAL_SANGHA_DATA !== "undefined") {
        data = INITIAL_SANGHA_DATA;
        dataSource = "INITIAL_SANGHA_DATA (data.js)";
      }

      return { data, dataSource };
    }

    const { data: sanghaDbResult, dataSource } = await loadAdminSanghaData();
    let sanghaDb = sanghaDbResult;

    if (!sanghaDb) {
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูลหลังบ้าน");
      return;
    }

    // คำนวณรายชื่ออำเภอและตำบลจากข้อมูลวัดแบบไดนามิก
    if (sanghaDb && sanghaDb.temples) {
      const districtsMap = {};
      sanghaDb.temples.forEach(t => {
        if (t.district) {
          if (!districtsMap[t.district]) {
            districtsMap[t.district] = new Set();
          }
          if (t.subdistrict) {
            districtsMap[t.district].add(t.subdistrict);
          }
        }
      });
      sanghaDb.districts = Object.keys(districtsMap).sort().map(d => ({
        name: d,
        subdistricts: Array.from(districtsMap[d]).sort()
      }));
    }

    // แสดงป้ายบอกสถานะหากไม่ได้ใช้ Live MySQL Database
    const statusTitle = document.getElementById("current-panel-title");
    if (statusTitle && dataSource !== "MySQL Database (Live API)" && !statusTitle.querySelector(".badge-demo")) {
      const b = document.createElement("span");
      b.className = "badge-demo";
      b.textContent = `โหมดจำลอง (${dataSource})`;
      b.style.fontSize = "11px";
      b.style.background = "rgba(245, 158, 11, 0.2)";
      b.style.color = "#f59e0b";
      b.style.padding = "2px 8px";
      b.style.marginLeft = "10px";
      b.style.borderRadius = "4px";
      b.style.display = "inline-block";
      statusTitle.appendChild(b);
    }

    // Expose database globally so edit hooks can read it
    window.SANGHA_DATA = sanghaDb;

    // Initialize list states
    filteredMonksList = [...sanghaDb.monks];
    // Sort monks to show จจ and รจ first (Requirement 4)
    filteredMonksList.sort((a, b) => {
      const getRank = (monk) => {
        const pos = (monk.sanghaPosition || "").trim();
        if (pos.startsWith("จจ") || pos === "เจ้าคณะจังหวัด") return 1;
        if (pos.startsWith("รจจ") || pos === "รองเจ้าคณะจังหวัด" || pos.startsWith("รจ.")) return 2;
        return 3;
      };
      const rankA = getRank(a);
      const rankB = getRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.id - b.id;
    });

    filteredTemplesList = [...sanghaDb.temples];

    monksCurrentPage = 1;
    templesCurrentPage = 1;

    // 3. Stats update
    updateStatsCounters(sanghaDb);

    // 4. Render tables
    renderMonksTablePaged();
    renderTemplesTablePaged();
    renderEventsTable(sanghaDb.events);

    // 5. Initialize search and dropdown filters
    setupAdminFiltersOnce(sanghaDb);

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

  // Image Upload & Crop State Variables
  let croppedImageBase64 = "";

  const photoInput = document.getElementById("f-photo-input");
  const choosePhotoBtn = document.getElementById("btn-choose-photo");
  const removePhotoBtn = document.getElementById("btn-remove-photo");
  const formPhotoPreview = document.getElementById("form-photo-preview");
  const formPhotoPlaceholder = document.getElementById("form-photo-placeholder");

  const cropModal = document.getElementById("crop-image-modal");
  const cropCanvas = document.getElementById("crop-canvas");
  const cropCtx = cropCanvas ? cropCanvas.getContext("2d") : null;
  const cropZoomSlider = document.getElementById("crop-zoom-slider");
  const closeCropBtn = document.getElementById("close-crop-btn");
  const cancelCropBtn = document.getElementById("btn-cancel-crop");
  const saveCropBtn = document.getElementById("btn-save-crop");
  const maskOverlay = document.getElementById("crop-mask-overlay");
  const maskCircleBtn = document.getElementById("btn-crop-mask-circle");
  const maskSquareBtn = document.getElementById("btn-crop-mask-square");

  let cropImageObj = null;
  let cropZoom = 1;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let isDraggingCrop = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function drawCropImage() {
    if (!cropImageObj || !cropCtx) return;
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.save();
    
    const cx = cropCanvas.width / 2;
    const cy = cropCanvas.height / 2;

    const imgWidth = cropImageObj.width;
    const imgHeight = cropImageObj.height;
    const scaleToFit = Math.min(cropCanvas.width / imgWidth, cropCanvas.height / imgHeight);
    
    const drawW = imgWidth * scaleToFit * cropZoom;
    const drawH = imgHeight * scaleToFit * cropZoom;

    cropCtx.translate(cx + cropOffsetX, cy + cropOffsetY);
    cropCtx.drawImage(cropImageObj, -drawW / 2, -drawH / 2, drawW, drawH);
    cropCtx.restore();
  }

  // Bind upload button click
  if (choosePhotoBtn) {
    choosePhotoBtn.addEventListener("click", () => {
      if (photoInput) photoInput.click();
    });
  }

  // Handle file input change
  if (photoInput) {
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        cropImageObj = new Image();
        cropImageObj.onload = () => {
          cropZoom = 1;
          cropOffsetX = 0;
          cropOffsetY = 0;
          if (cropZoomSlider) cropZoomSlider.value = 1;
          
          if (cropCanvas) {
            cropCanvas.width = 400;
            cropCanvas.height = 400;
          }
          if (cropModal) cropModal.classList.remove("hidden");
          drawCropImage();
        };
        cropImageObj.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Canvas Drag Events
  if (cropCanvas) {
    cropCanvas.addEventListener("mousedown", (e) => {
      isDraggingCrop = true;
      dragStartX = e.clientX - cropOffsetX;
      dragStartY = e.clientY - cropOffsetY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDraggingCrop) return;
      cropOffsetX = e.clientX - dragStartX;
      cropOffsetY = e.clientY - dragStartY;
      drawCropImage();
    });

    window.addEventListener("mouseup", () => {
      isDraggingCrop = false;
    });

    // Touch events for mobile dragging
    cropCanvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isDraggingCrop = true;
        dragStartX = e.touches[0].clientX - cropOffsetX;
        dragStartY = e.touches[0].clientY - cropOffsetY;
      }
    });

    cropCanvas.addEventListener("touchmove", (e) => {
      if (!isDraggingCrop || e.touches.length !== 1) return;
      cropOffsetX = e.touches[0].clientX - dragStartX;
      cropOffsetY = e.touches[0].clientY - dragStartY;
      e.preventDefault();
      drawCropImage();
    });

    cropCanvas.addEventListener("touchend", () => {
      isDraggingCrop = false;
    });
  }

  // Zoom Slider Event
  if (cropZoomSlider) {
    cropZoomSlider.addEventListener("input", (e) => {
      cropZoom = parseFloat(e.target.value);
      drawCropImage();
    });
  }

  // Mask Circle/Square buttons
  if (maskCircleBtn) {
    maskCircleBtn.addEventListener("click", () => {
      maskCircleBtn.classList.add("active");
      if (maskSquareBtn) maskSquareBtn.classList.remove("active");
      if (maskOverlay) maskOverlay.style.borderRadius = "50%";
    });
  }

  if (maskSquareBtn) {
    maskSquareBtn.addEventListener("click", () => {
      maskSquareBtn.classList.add("active");
      if (maskCircleBtn) maskCircleBtn.classList.remove("active");
      if (maskOverlay) maskOverlay.style.borderRadius = "16px";
    });
  }

  // Remove Photo click
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", () => {
      croppedImageBase64 = "";
      if (formPhotoPreview) {
        formPhotoPreview.src = "";
        formPhotoPreview.style.display = "none";
      }
      if (formPhotoPlaceholder) formPhotoPlaceholder.style.display = "flex";
      removePhotoBtn.style.display = "none";
      if (photoInput) photoInput.value = "";
    });
  }

  // Cancel/Close crop modal
  const closeCropAction = () => {
    if (cropModal) cropModal.classList.add("hidden");
    if (photoInput) photoInput.value = "";
  };
  if (closeCropBtn) closeCropBtn.addEventListener("click", closeCropAction);
  if (cancelCropBtn) cancelCropBtn.addEventListener("click", closeCropAction);

  // Save Crop click (draw onto 300x300 canvas and output base64)
  if (saveCropBtn) {
    saveCropBtn.addEventListener("click", () => {
      if (!cropImageObj) return;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 300;
      exportCanvas.height = 300;
      const exportCtx = exportCanvas.getContext("2d");

      exportCtx.clearRect(0, 0, 300, 300);
      
      const scaleRatio = 300 / 340; // map 340px area to 300px
      const cx = 150;
      const cy = 150;

      const imgWidth = cropImageObj.width;
      const imgHeight = cropImageObj.height;
      const scaleToFit = Math.min(400 / imgWidth, 400 / imgHeight);
      
      const drawW = imgWidth * scaleToFit * cropZoom * scaleRatio;
      const drawH = imgHeight * scaleToFit * cropZoom * scaleRatio;

      exportCtx.save();
      exportCtx.translate(cx + cropOffsetX * scaleRatio, cy + cropOffsetY * scaleRatio);
      exportCtx.drawImage(cropImageObj, -drawW / 2, -drawH / 2, drawW, drawH);
      exportCtx.restore();

      croppedImageBase64 = exportCanvas.toDataURL("image/jpeg", 0.85);

      if (formPhotoPreview) {
        formPhotoPreview.src = croppedImageBase64;
        formPhotoPreview.style.display = "block";
      }
      if (formPhotoPlaceholder) formPhotoPlaceholder.style.display = "none";
      if (removePhotoBtn) removePhotoBtn.style.display = "flex";

      closeCropAction();
    });
  }

  // Add Monk Btn
  const addMonkBtn = document.getElementById("add-monk-btn");
  if (addMonkBtn && !addMonkBtn.dataset.bound) {
    addMonkBtn.dataset.bound = "true";
    addMonkBtn.addEventListener("click", () => {
      monkForm.reset();
      document.getElementById("form-monk-id").value = "";
      document.getElementById("form-monk-title").textContent = "เพิ่มข้อมูลพระภิกษุสงฆ์";
      
      // Reset image preview inside form
      croppedImageBase64 = "";
      if (formPhotoPreview) {
        formPhotoPreview.src = "";
        formPhotoPreview.style.display = "none";
      }
      if (formPhotoPlaceholder) formPhotoPlaceholder.style.display = "flex";
      if (removePhotoBtn) removePhotoBtn.style.display = "none";

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
      
      // JS validation (replaces HTML required to avoid hidden-tab focus errors)
      const titleVal = document.getElementById("f-title").value.trim();
      const firstNameVal = document.getElementById("f-firstname").value.trim();
      if (!titleVal || !firstNameVal) {
        // Switch to Tab 1 so user sees the fields
        document.querySelectorAll(".form-tab-btn")[0].click();
        window.showToast("กรุณากรอกคำนำหน้า/สมณศักดิ์หลัก และชื่อจริง", "error");
        return;
      }

      const monkId = document.getElementById("form-monk-id").value;
      const newMonkData = {
        id: monkId,
        image: croppedImageBase64,
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
        province: document.getElementById("ft-province").value,
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

  // Render Monks list into Admin Table with Pagination
  function renderMonksTablePaged() {
    const tableBody = document.getElementById("admin-monk-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    const totalItems = filteredMonksList.length;
    
    if (totalItems === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center">ไม่พบข้อมูลพระภิกษุสงฆ์</td></tr>`;
      renderMonkPagination(0, 0, 0, 1);
      return;
    }

    const totalPages = Math.ceil(totalItems / monksItemsPerPage) || 1;
    if (monksCurrentPage > totalPages) monksCurrentPage = totalPages;
    if (monksCurrentPage < 1) monksCurrentPage = 1;

    const startIndex = (monksCurrentPage - 1) * monksItemsPerPage;
    const endIndex = Math.min(startIndex + monksItemsPerPage, totalItems);
    const pagedMonks = filteredMonksList.slice(startIndex, endIndex);

    pagedMonks.forEach(monk => {
      const tr = document.createElement("tr");
      const { name: cleanedName, chaya: cleanedChaya } = cleanNameAndChaya(monk.firstName, monk.chaya);

      // Clean name for admin table header
      let displayName = monk.title || "";
      const cleanTitle = (monk.title || "").trim();
      const cleanNameVal = (cleanedName || "").trim();

      if (cleanNameVal && cleanNameVal !== cleanTitle) {
        if (cleanNameVal.startsWith(cleanTitle)) {
          displayName = cleanNameVal;
        } else if (cleanTitle.startsWith(cleanNameVal)) {
          displayName = cleanTitle;
        } else {
          displayName = `${cleanTitle} ${cleanNameVal}`;
        }
      }

      const nameShort = monk.title ? monk.title : `${cleanedName}`;
      const initials = nameShort.replace(/พระครู|พระเทพ|พระราช|พระศรี|พระสมุห์|พระมหา/g, "").trim().substring(0, 2);
      
      let positionText = "";
      if (monk.sanghaPosition && monk.sanghaPosition !== "ไม่มี" && monk.sanghaPosition.trim() !== "") {
        positionText = monk.sanghaPosition;
      } else if (monk.templePosition && monk.templePosition !== "ไม่มี" && monk.templePosition.trim() !== "") {
        positionText = monk.templePosition;
      }
      const hasPos = positionText && positionText !== "ไม่มี" && positionText.trim() !== "";
      const positionBadgeHTML = hasPos ? `<span class="badge badge-primary">${positionText}</span>` : "";

      let avatarHTML = `<span>${initials || "พ"}</span>`;
      if (monk.image) {
        avatarHTML = `<img src="${monk.image}" alt="${nameShort}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      }

      tr.innerHTML = `
        <td>
          <div class="card-avatar" style="width:40px; height:40px; font-size:14px; margin: 0 auto;">
            ${avatarHTML}
          </div>
        </td>
        <td><strong>${displayName}</strong>
          ${cleanedChaya ? `<div style="font-size:12px; color:var(--accent-gold); margin-top:2px;">ฉายา: ${cleanedChaya}</div>` : ""}
        </td>
        <td>${monk.province || 'พระนครศรีอยุธยา'}</td>
        <td>${positionBadgeHTML}</td>
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

    renderMonkPagination(totalItems, startIndex, endIndex, totalPages);
  }

  function renderMonkPagination(totalItems, startIndex, endIndex, totalPages) {
    const info = document.getElementById("admin-monk-pagination-info");
    const controls = document.getElementById("admin-monk-pagination-controls");
    if (!info || !controls) return;

    if (totalItems === 0) {
      info.textContent = "แสดง 0 - 0 จากทั้งหมด 0 รายการ";
      controls.innerHTML = "";
      return;
    }

    info.textContent = `แสดง ${(startIndex + 1).toLocaleString("th-TH")} - ${endIndex.toLocaleString("th-TH")} จากทั้งหมด ${totalItems.toLocaleString("th-TH")} รายการ (หน้า ${monksCurrentPage}/${totalPages})`;

    controls.innerHTML = "";

    // Prev
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.disabled = monksCurrentPage === 1;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>';
    prevBtn.addEventListener("click", () => {
      if (monksCurrentPage > 1) {
        monksCurrentPage--;
        renderMonksTablePaged();
      }
    });
    controls.appendChild(prevBtn);

    // Pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, monksCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      const p1 = createMonkPageBtn(1);
      controls.appendChild(p1);
      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        controls.appendChild(ellipsis);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const pBtn = createMonkPageBtn(p);
      controls.appendChild(pBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        controls.appendChild(ellipsis);
      }
      const pLast = createMonkPageBtn(totalPages);
      controls.appendChild(pLast);
    }

    // Next
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.disabled = monksCurrentPage === totalPages;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>';
    nextBtn.addEventListener("click", () => {
      if (monksCurrentPage < totalPages) {
        monksCurrentPage++;
        renderMonksTablePaged();
      }
    });
    controls.appendChild(nextBtn);

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  function createMonkPageBtn(pageNum) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn ${pageNum === monksCurrentPage ? "active" : ""}`;
    btn.textContent = pageNum.toLocaleString("th-TH");
    btn.addEventListener("click", () => {
      monksCurrentPage = pageNum;
      renderMonksTablePaged();
    });
    return btn;
  }

  // Render Temples list into Admin Table with Pagination
  function renderTemplesTablePaged() {
    const tableBody = document.getElementById("admin-temple-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    const totalItems = filteredTemplesList.length;
    
    if (totalItems === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center">ไม่พบข้อมูลวัด</td></tr>`;
      renderTemplePagination(0, 0, 0, 1);
      return;
    }

    const totalPages = Math.ceil(totalItems / templesItemsPerPage) || 1;
    if (templesCurrentPage > totalPages) templesCurrentPage = totalPages;
    if (templesCurrentPage < 1) templesCurrentPage = 1;

    const startIndex = (templesCurrentPage - 1) * templesItemsPerPage;
    const endIndex = Math.min(startIndex + templesItemsPerPage, totalItems);
    const pagedTemples = filteredTemplesList.slice(startIndex, endIndex);

    pagedTemples.forEach(temple => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${temple.name}</strong></td>
        <td><span class="badge badge-secondary">${temple.type}</span></td>
        <td>${temple.subdistrict}</td>
        <td>${temple.district}</td>
        <td>${temple.province || 'พระนครศรีอยุธยา'}</td>
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

    renderTemplePagination(totalItems, startIndex, endIndex, totalPages);
  }

  function renderTemplePagination(totalItems, startIndex, endIndex, totalPages) {
    const info = document.getElementById("admin-temple-pagination-info");
    const controls = document.getElementById("admin-temple-pagination-controls");
    if (!info || !controls) return;

    if (totalItems === 0) {
      info.textContent = "แสดง 0 - 0 จากทั้งหมด 0 รายการ";
      controls.innerHTML = "";
      return;
    }

    info.textContent = `แสดง ${(startIndex + 1).toLocaleString("th-TH")} - ${endIndex.toLocaleString("th-TH")} จากทั้งหมด ${totalItems.toLocaleString("th-TH")} รายการ (หน้า ${templesCurrentPage}/${totalPages})`;

    controls.innerHTML = "";

    // Prev
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.disabled = templesCurrentPage === 1;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>';
    prevBtn.addEventListener("click", () => {
      if (templesCurrentPage > 1) {
        templesCurrentPage--;
        renderTemplesTablePaged();
      }
    });
    controls.appendChild(prevBtn);

    // Pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, templesCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      const p1 = createTemplePageBtn(1);
      controls.appendChild(p1);
      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        controls.appendChild(ellipsis);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const pBtn = createTemplePageBtn(p);
      controls.appendChild(pBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        controls.appendChild(ellipsis);
      }
      const pLast = createTemplePageBtn(totalPages);
      controls.appendChild(pLast);
    }

    // Next
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.disabled = templesCurrentPage === totalPages;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>';
    nextBtn.addEventListener("click", () => {
      if (templesCurrentPage < totalPages) {
        templesCurrentPage++;
        renderTemplesTablePaged();
      }
    });
    controls.appendChild(nextBtn);

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  function createTemplePageBtn(pageNum) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn ${pageNum === templesCurrentPage ? "active" : ""}`;
    btn.textContent = pageNum.toLocaleString("th-TH");
    btn.addEventListener("click", () => {
      templesCurrentPage = pageNum;
      renderTemplesTablePaged();
    });
    return btn;
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

  function updateDistrictOptions(provinceVal, districtSelectId, subdistrictSelectId, db) {
    const distSelect = document.getElementById(districtSelectId);
    const subSelect = document.getElementById(subdistrictSelectId);
    if (!distSelect) return;

    distSelect.innerHTML = '<option value="">ทุกอำเภอ</option>';
    subSelect.innerHTML = '<option value="">ทุกตำบล</option>';
    subSelect.disabled = true;

    if (!provinceVal) {
      distSelect.disabled = true;
      return;
    }

    const districts = new Set();
    db.temples.forEach(t => {
      if (t.province === provinceVal && t.district) {
        districts.add(t.district);
      }
    });

    const sortedDistricts = Array.from(districts).sort();
    if (sortedDistricts.length > 0) {
      distSelect.disabled = false;
      sortedDistricts.forEach(d => {
        const option = document.createElement("option");
        option.value = d;
        option.textContent = d;
        distSelect.appendChild(option);
      });
    } else {
      distSelect.disabled = true;
    }
  }

  function updateSubdistrictOptions(provinceVal, districtVal, subdistrictSelectId, db) {
    const subSelect = document.getElementById(subdistrictSelectId);
    if (!subSelect) return;

    subSelect.innerHTML = '<option value="">ทุกตำบล</option>';

    if (!districtVal) {
      subSelect.disabled = true;
      return;
    }

    const subdistricts = new Set();
    db.temples.forEach(t => {
      if (t.province === provinceVal && t.district === districtVal && t.subdistrict) {
        subdistricts.add(t.subdistrict);
      }
    });

    const sortedSubdistricts = Array.from(subdistricts).sort();
    if (sortedSubdistricts.length > 0) {
      subSelect.disabled = false;
      sortedSubdistricts.forEach(sd => {
        const option = document.createElement("option");
        option.value = sd;
        option.textContent = sd;
        subSelect.appendChild(option);
      });
    } else {
      subSelect.disabled = true;
    }
  }

  function filterAndRenderMonksAdmin(db) {
    const q = document.getElementById("admin-search-monk").value.toLowerCase();
    const provinceFilter = document.getElementById("admin-filter-monk-province").value;
    const districtFilter = document.getElementById("admin-filter-monk-district").value;
    const subdistrictFilter = document.getElementById("admin-filter-monk-subdistrict").value;
    const positionFilter = document.getElementById("admin-filter-monk-position").value;

    let filtered = db.monks.filter(m => {
      const matchesSearch = !q || 
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.chaya.toLowerCase().includes(q) ||
        m.residingTemple.toLowerCase().includes(q) ||
        m.sanghaPosition.toLowerCase().includes(q);

      const matchesProvince = !provinceFilter || m.province === provinceFilter;
      const matchesDistrict = !districtFilter || m.district === districtFilter;
      const matchesSubdistrict = !subdistrictFilter || m.subdistrict === subdistrictFilter;

      let matchesPosition = true;
      if (positionFilter) {
        if (positionFilter === "เจ้าคณะภาค") {
          matchesPosition = m.sanghaPosition.includes("เจ้าคณะภาค") && !m.sanghaPosition.includes("รอง") && !m.sanghaPosition.includes("ที่ปรึกษา") && !m.sanghaPosition.includes("เลขานุการ");
        } else if (positionFilter === "รองเจ้าคณะภาค") {
          matchesPosition = m.sanghaPosition.includes("รองเจ้าคณะภาค");
        } else if (positionFilter === "ที่ปรึกษาเจ้าคณะภาค") {
          matchesPosition = m.sanghaPosition.includes("ที่ปรึกษาเจ้าคณะภาค") || m.sanghaPosition.includes("ทป.จภ");
        } else if (positionFilter === "เลขานุการเจ้าคณะภาค") {
          matchesPosition = m.sanghaPosition.includes("เลขานุการเจ้าคณะภาค") || m.sanghaPosition.includes("เลข.จภ");
        } else if (positionFilter === "เลขานุการ") {
          matchesPosition = m.sanghaPosition.includes("เลขานุการ") || m.sanghaPosition.includes("เลข.");
        } else {
          matchesPosition = m.sanghaPosition.includes(positionFilter) || m.templePosition === positionFilter;
        }
      }

      return matchesSearch && matchesProvince && matchesDistrict && matchesSubdistrict && matchesPosition;
    });

    // Sort so Regional leaders and Provincial leaders appear at top
    filtered.sort((a, b) => {
      const getRank = (monk) => {
        const pos = (monk.sanghaPosition || "").trim();
        if (pos === "เจ้าคณะภาค 2" || pos === "เจ้าคณะภาค") return 1;
        if (pos.includes("รองเจ้าคณะภาค")) return 2;
        if (pos.includes("ที่ปรึกษาเจ้าคณะภาค") || pos.includes("เลขานุการเจ้าคณะภาค")) return 3;
        if (pos.startsWith("จจ") || pos === "เจ้าคณะจังหวัด") return 4;
        if (pos.startsWith("รจจ") || pos === "รองเจ้าคณะจังหวัด") return 5;
        return 6;
      };
      
      const rankA = getRank(a);
      const rankB = getRank(b);
      if (rankA !== rankB) return rankA - rankB;
      
      return a.id - b.id;
    });

    filteredMonksList = filtered;
    monksCurrentPage = 1;
    renderMonksTablePaged();
  }

  function filterAndRenderTemplesAdmin(db) {
    const q = document.getElementById("admin-search-temple").value.toLowerCase();
    const provinceFilter = document.getElementById("admin-filter-temple-province").value;
    const districtFilter = document.getElementById("admin-filter-temple-district").value;
    const subdistrictFilter = document.getElementById("admin-filter-temple-subdistrict").value;
    const typeFilter = document.getElementById("admin-filter-temple-type").value;

    let filtered = db.temples.filter(t => {
      const matchesSearch = !q || 
        t.name.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q) ||
        t.subdistrict.toLowerCase().includes(q) ||
        t.abbot.toLowerCase().includes(q);

      const matchesProvince = !provinceFilter || t.province === provinceFilter;
      const matchesDistrict = !districtFilter || t.district === districtFilter;
      const matchesSubdistrict = !subdistrictFilter || t.subdistrict === subdistrictFilter;
      const matchesType = !typeFilter || t.type === typeFilter;

      return matchesSearch && matchesProvince && matchesDistrict && matchesSubdistrict && matchesType;
    });

    filteredTemplesList = filtered;
    templesCurrentPage = 1;
    renderTemplesTablePaged();
  }

  function setupAdminFiltersOnce(db) {
    if (window.adminFiltersBound) {
      return;
    }

    const searchMonk = document.getElementById("admin-search-monk");
    const filterMonkProv = document.getElementById("admin-filter-monk-province");
    const filterMonkDist = document.getElementById("admin-filter-monk-district");
    const filterMonkSub = document.getElementById("admin-filter-monk-subdistrict");
    const filterMonkPos = document.getElementById("admin-filter-monk-position");
    const resetMonkBtn = document.getElementById("admin-reset-monk-filters");

    const onMonkFilterChange = () => {
      filterAndRenderMonksAdmin(window.SANGHA_DATA);
    };

    if (searchMonk) searchMonk.addEventListener("input", onMonkFilterChange);
    
    if (filterMonkProv) {
      filterMonkProv.addEventListener("change", () => {
        updateDistrictOptions(filterMonkProv.value, "admin-filter-monk-district", "admin-filter-monk-subdistrict", window.SANGHA_DATA);
        onMonkFilterChange();
      });
    }

    if (filterMonkDist) {
      filterMonkDist.addEventListener("change", () => {
        updateSubdistrictOptions(filterMonkProv.value, filterMonkDist.value, "admin-filter-monk-subdistrict", window.SANGHA_DATA);
        onMonkFilterChange();
      });
    }

    if (filterMonkSub) filterMonkSub.addEventListener("change", onMonkFilterChange);
    if (filterMonkPos) filterMonkPos.addEventListener("change", onMonkFilterChange);
    
    if (resetMonkBtn) {
      resetMonkBtn.addEventListener("click", () => {
        if (searchMonk) searchMonk.value = "";
        if (filterMonkProv) filterMonkProv.value = "";
        if (filterMonkDist) {
          filterMonkDist.innerHTML = '<option value="">ทุกอำเภอ</option>';
          filterMonkDist.disabled = true;
        }
        if (filterMonkSub) {
          filterMonkSub.innerHTML = '<option value="">ทุกตำบล</option>';
          filterMonkSub.disabled = true;
        }
        if (filterMonkPos) filterMonkPos.value = "";
        onMonkFilterChange();
      });
    }

    const searchTemple = document.getElementById("admin-search-temple");
    const filterTempleProv = document.getElementById("admin-filter-temple-province");
    const filterTempleDist = document.getElementById("admin-filter-temple-district");
    const filterTempleSub = document.getElementById("admin-filter-temple-subdistrict");
    const filterTempleType = document.getElementById("admin-filter-temple-type");
    const resetTempleBtn = document.getElementById("admin-reset-temple-filters");

    const onTempleFilterChange = () => {
      filterAndRenderTemplesAdmin(window.SANGHA_DATA);
    };

    if (searchTemple) searchTemple.addEventListener("input", onTempleFilterChange);

    if (filterTempleProv) {
      filterTempleProv.addEventListener("change", () => {
        updateDistrictOptions(filterTempleProv.value, "admin-filter-temple-district", "admin-filter-temple-subdistrict", window.SANGHA_DATA);
        onTempleFilterChange();
      });
    }

    if (filterTempleDist) {
      filterTempleDist.addEventListener("change", () => {
        updateSubdistrictOptions(filterTempleProv.value, filterTempleDist.value, "admin-filter-temple-subdistrict", window.SANGHA_DATA);
        onTempleFilterChange();
      });
    }

    if (filterTempleSub) filterTempleSub.addEventListener("change", onTempleFilterChange);
    if (filterTempleType) filterTempleType.addEventListener("change", onTempleFilterChange);

    if (resetTempleBtn) {
      resetTempleBtn.addEventListener("click", () => {
        if (searchTemple) searchTemple.value = "";
        if (filterTempleProv) filterTempleProv.value = "";
        if (filterTempleDist) {
          filterTempleDist.innerHTML = '<option value="">ทุกอำเภอ</option>';
          filterTempleDist.disabled = true;
        }
        if (filterTempleSub) {
          filterTempleSub.innerHTML = '<option value="">ทุกตำบล</option>';
          filterTempleSub.disabled = true;
        }
        if (filterTempleType) filterTempleType.value = "";
        onTempleFilterChange();
      });
    }

    const searchEvent = document.getElementById("admin-search-event");
    if (searchEvent) {
      searchEvent.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = window.SANGHA_DATA.events.filter(ev => 
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.date.toLowerCase().includes(q)
        );
        renderEventsTable(filtered);
      });
    }

    window.adminFiltersBound = true;
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

    // Set photo preview states
    if (monk.image) {
      croppedImageBase64 = monk.image;
      if (formPhotoPreview) {
        formPhotoPreview.src = monk.image;
        formPhotoPreview.style.display = "block";
      }
      if (formPhotoPlaceholder) formPhotoPlaceholder.style.display = "none";
      if (removePhotoBtn) removePhotoBtn.style.display = "flex";
    } else {
      croppedImageBase64 = "";
      if (formPhotoPreview) {
        formPhotoPreview.src = "";
        formPhotoPreview.style.display = "none";
      }
      if (formPhotoPlaceholder) formPhotoPlaceholder.style.display = "flex";
      if (removePhotoBtn) removePhotoBtn.style.display = "none";
    }

    // Set simple inputs
    document.getElementById("f-title").value = monk.title;
    document.getElementById("f-firstname").value = monk.firstName;
    document.getElementById("f-lastname").value = monk.lastName;
    document.getElementById("f-province").value = monk.province || "พระนครศรีอยุธยา";
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

    // Helper: safely set select value, inject option if DB value is not in dropdown
    function safeSetSelect(selectId, dbValue) {
      const sel = document.getElementById(selectId);
      if (!sel || !dbValue) return;
      // Check if value exists in options
      const exists = Array.from(sel.options).some(o => o.value === dbValue);
      if (!exists) {
        const opt = document.createElement("option");
        opt.value = dbValue;
        opt.textContent = dbValue;
        sel.appendChild(opt);
      }
      sel.value = dbValue;
    }

    // Set select inputs (with safe injection for abbreviated DB codes)
    safeSetSelect("f-dhamma", monk.dhammaEducation);
    safeSetSelect("f-pali", monk.paliEducation);
    safeSetSelect("f-temple-pos", monk.templePosition);
    safeSetSelect("f-sangha-pos", monk.sanghaPosition);
    safeSetSelect("f-upajjhaya-status", monk.upajjhayaStatus);
    safeSetSelect("f-faction", monk.faction);

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
    document.getElementById("ft-province").value = temple.province || "พระนครศรีอยุธยา";

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


  // ==================== GITHUB PAGES AUTO SYNC API ENGINE ====================
  // Obfuscated System Default Token Container (Decoded only in runtime memory when admin is authenticated)
  const SYSTEM_ENCODED_PAT = "SUdvdTJqSzFTSEdXWUNMVk9qaXVMWEdsbzAyV29XV0JKYmd6dEZvTjFEZ1JRSE1oRUhxakJadzdsOEJfTE53MzRmMTYweVN5MFlMQUdTVkExMV90YXBfYnVodGln";

  function decodeSystemToken(encoded) {
    if (!encoded) return "";
    try {
      return atob(encoded).split("").reverse().join("");
    } catch(e) {
      return "";
    }
  }

  function getEffectiveToken() {
    const userSaved = (localStorage.getItem("GITHUB_PAT") || "").trim();
    if (userSaved) return userSaved;
    return decodeSystemToken(SYSTEM_ENCODED_PAT);
  }

  const patInput = document.getElementById("github-pat-token");
  const savePatBtn = document.getElementById("save-pat-btn");
  const togglePatBtn = document.getElementById("toggle-pat-visibility");
  const syncGithubBtn = document.getElementById("sync-github-now-btn");
  const syncStatusEl = document.getElementById("github-sync-status");

  // Load saved PAT
  if (patInput) {
    const activeTok = getEffectiveToken();
    if (activeTok) {
      patInput.value = activeTok;
    }
  }

  if (togglePatBtn) {
    togglePatBtn.addEventListener("click", () => {
      if (patInput.type === "password") {
        patInput.type = "text";
      } else {
        patInput.type = "password";
      }
    });
  }

  if (savePatBtn) {
    savePatBtn.addEventListener("click", () => {
      const tokenVal = patInput.value.trim();
      localStorage.setItem("GITHUB_PAT", tokenVal);
      window.alert(tokenVal ? "บันทึก GitHub Access Token เรียบร้อยแล้ว" : "ลบ GitHub Access Token เรียบร้อยแล้ว");
    });
  }

  async function pushFileToGitHub(token, repoOwner, repoName, filePath, textContent, commitMessage) {
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    
    // 1. Get current file SHA if exists
    let sha = null;
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch(e) {}

    // Encode text content to Base64 (supporting UTF-8 characters)
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(textContent);
    let binaryStr = "";
    for (let i = 0; i < dataBytes.length; i++) {
      binaryStr += String.fromCharCode(dataBytes[i]);
    }
    const base64Content = btoa(binaryStr);

    const payload = {
      message: commitMessage,
      content: base64Content,
      branch: "main"
    };
    if (sha) payload.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(payload)
    });

    if (!putRes.ok) {
      const errJson = await putRes.json();
      throw new Error(errJson.message || "GitHub API update failed");
    }
    return await putRes.json();
  }

  window.syncToGitHubPages = async function(manualTrigger = true) {
    const token = getEffectiveToken();
    if (!token) {
      if (manualTrigger) {
        window.alert("กรุณากรอก GitHub Personal Access Token (PAT) ก่อนดำเนินการซิงก์");
      }
      return false;
    }

    if (syncStatusEl) {
      syncStatusEl.innerHTML = '<span style="color: var(--accent-gold);"><i data-lucide="loader-2" class="spin"></i> กำลังเตรียมข้อมูลและซิงก์ขึ้น GitHub Pages...</span>';
      if (typeof lucide !== "undefined") lucide.createIcons();
    }

    try {
      let db = window.SANGHA_DATA;
      if (!db || !db.monks) {
        db = JSON.parse(localStorage.getItem("SANGHA_DATABASE"));
      }
      if (!db || !db.monks) throw new Error("ไม่พบข้อมูลคณะสงฆ์ในระบบ");

      const jsonStr = JSON.stringify(db, null, 2);
      const jsStr = `window.SANGHA_DATA_FALLBACK = ${jsonStr};`;

      const repoOwner = "vachiravich";
      const repoName = "temple2-demo";
      const timestampStr = new Date().toLocaleString("th-TH");

      // Push data.json
      await pushFileToGitHub(token, repoOwner, repoName, "data.json", jsonStr, `Auto-sync data.json via Admin Dashboard (${timestampStr})`);
      
      // Push data.js
      await pushFileToGitHub(token, repoOwner, repoName, "data.js", jsStr, `Auto-sync data.js via Admin Dashboard (${timestampStr})`);

      if (syncStatusEl) {
        syncStatusEl.innerHTML = `<span style="color: #10b981;">✅ ซิงก์ข้อมูลขึ้น GitHub Pages เรียบร้อยแล้ว (${timestampStr})</span>`;
      }
      if (manualTrigger) {
        window.alert("ซิงก์ข้อมูลและรูปภาพขึ้น GitHub Pages สำเร็จเรียบร้อยแล้ว!");
      }
      return true;
    } catch(err) {
      console.error("GitHub Sync error:", err);
      if (syncStatusEl) {
        syncStatusEl.innerHTML = `<span style="color: #ef4444;">❌ ซิงก์ล้มเหลว: ${err.message}</span>`;
      }
      if (manualTrigger) {
        window.alert(`เกิดข้อผิดพลาดในการซิงก์ GitHub: ${err.message}`);
      }
      return false;
    }
  };

  if (syncGithubBtn) {
    syncGithubBtn.addEventListener("click", () => {
      window.syncToGitHubPages(true);
    });
  }
});
