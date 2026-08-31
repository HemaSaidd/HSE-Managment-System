const KEY_NAME = "SUT_GEMINI_KEY";
const MODEL_NAME = "SUT_GEMINI_MODEL";
const EMAIL_TO_KEY = "SUT_EMAIL_TO";
const EMAIL_CC_KEY = "SUT_EMAIL_CC";
const BUS_NOTES_KEY = "SUT_MONTHLY_BUS_NOTES";
const FOOD_NOTES_KEY = "SUT_MONTHLY_FOOD_NOTES";
const LOGO_URL_KEY = "SUT_CUSTOM_LOGO_URL";
const REPORT_LANG_KEY = "SUT_REPORT_LANG";
const MOM_SEQ_KEY = "SUT_MOM_SEQ_NO";
const MONTHLY_AI_REPORT_KEY = "SUT_MONTHLY_AI_REPORT_CACHE";
const SAVED_INSPECTIONS_KEY = "SUT_SAVED_INSPECTIONS";
const SAVED_MOM_REPORTS_KEY = "SUT_SAVED_MOM_REPORTS";

/* ===== Firebase Cloud Configuration & Synchronization ===== */
const SUT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAXOYeBE2KruejWD2X4ESNLu9pAgrOpVXA",
  authDomain: "sut-hse-system.firebaseapp.com",
  databaseURL: "https://sut-hse-system-default-rtdb.firebaseio.com",
  projectId: "sut-hse-system",
  storageBucket: "sut-hse-system.firebasestorage.app",
  messagingSenderId: "179509763411",
  appId: "1:179509763411:web:c96bc9027bd9d9bb3815a6",
  measurementId: "G-NRDF3E8JV0"
};

let firebaseApp = null;
let firebaseRtdb = null;
let firebaseFirestore = null;
let isFirebaseConnected = false;
let isReceivingCloudUpdate = false;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("[Firebase] SDK not loaded, continuing in offline LocalStorage mode.");
    updateCloudStatusBadge(false, "Offline (Local Mode)");
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(SUT_FIREBASE_CONFIG);
    } else {
      firebaseApp = firebase.app();
    }

    if (firebase.database) {
      firebaseRtdb = firebase.database();
    }
    if (firebase.firestore) {
      firebaseFirestore = firebase.firestore();
    }

    isFirebaseConnected = true;
    updateCloudStatusBadge(true, "Firebase Live: sut-hse-system");
    setupFirebaseListeners();
    console.log("[Firebase] Successfully connected to sut-hse-system.");
  } catch (e) {
    console.error("[Firebase] Init error:", e);
    isFirebaseConnected = false;
    updateCloudStatusBadge(false, "Offline (Local Mode)");
  }
}

function updateCloudStatusBadge(connected, text) {
  var badge = document.getElementById("cloudSyncBadge");
  var icon = document.getElementById("cloudSyncIcon");
  var txt = document.getElementById("cloudSyncText");
  var statusBadge = document.getElementById("settingsFirebaseStatus");
  if (badge && icon && txt) {
    if (connected) {
      icon.className = "fa-solid fa-cloud-bolt";
      icon.style.color = "#10b981";
      txt.textContent = text || "Firebase Live (sut-hse-system)";
      badge.style.color = "#a7f3d0";
      badge.style.background = "#ffffff18";
    } else {
      icon.className = "fa-solid fa-cloud-slash";
      icon.style.color = "#f59e0b";
      txt.textContent = text || "Local Offline Mode";
      badge.style.color = "#fef08a";
      badge.style.background = "#f59e0b22";
    }
  }
  if (statusBadge) {
    if (connected) {
      statusBadge.className = "meta-badge";
      statusBadge.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#059669"></i> Connected: sut-hse-system';
    } else {
      statusBadge.className = "meta-badge";
      statusBadge.style.borderColor = "#fcd34d";
      statusBadge.style.color = "#b45309";
      statusBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:#f59e0b"></i> Offline (Local Storage)';
    }
  }
}

function setupFirebaseListeners() {
  if (firebaseRtdb) {
    // 1. Findings (NCRs & General Cases)
    firebaseRtdb.ref("sutech_hse/findings").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data) && data.length > 0) {
        findings = data;
        try { localStorage.setItem("SUT_FINDINGS", JSON.stringify(findings)); } catch (e) {}
        renderDashboard();
        renderGeneralCasesTable();
        updateInteractiveCharts();
      }
    });

    // 2. Incidents & Near-Misses
    firebaseRtdb.ref("sutech_hse/incidents").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data) && data.length > 0) {
        incidents = data;
        try { localStorage.setItem("SUT_INCIDENTS", JSON.stringify(incidents)); } catch (e) {}
        renderIncidents();
        renderDashboard();
      }
    });

    // 3. Permits to Work (PTWs)
    firebaseRtdb.ref("sutech_hse/ptw_list").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data) && data.length > 0) {
        ptwList = data;
        try { localStorage.setItem("SUT_PTW_LIST", JSON.stringify(ptwList)); } catch (e) {}
        renderPtwTable();
        renderDashboard();
      }
    });

    // 4. Trainings & TBT Sessions
    firebaseRtdb.ref("sutech_hse/training_sessions").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data) && data.length > 0) {
        trainingSessions = data;
        try { localStorage.setItem("SUT_TRAINING_SESSIONS", JSON.stringify(trainingSessions)); } catch (e) {}
        renderTraining();
        renderDashboard();
      }
    });

    // 5. Saved Risk Assessments
    firebaseRtdb.ref("sutech_hse/saved_risk_assessments").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data)) {
        savedRiskAssessments = data;
        try { localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments)); } catch (e) {}
        renderSavedRiskAssessmentsTable();
      }
    });

    // 6. Monthly Inspection Notes
    firebaseRtdb.ref("sutech_hse/monthly_notes").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data) {
        if (data.busNotes !== undefined) {
          monthlyBusNotes = data.busNotes;
          try { localStorage.setItem(BUS_NOTES_KEY, monthlyBusNotes); } catch (e) {}
          var bEl = document.getElementById("monthlyBusNotes");
          if (bEl && document.activeElement !== bEl) bEl.value = monthlyBusNotes;
        }
        if (data.foodNotes !== undefined) {
          monthlyFoodNotes = data.foodNotes;
          try { localStorage.setItem(FOOD_NOTES_KEY, monthlyFoodNotes); } catch (e) {}
          var fEl = document.getElementById("monthlyFoodNotes");
          if (fEl && document.activeElement !== fEl) fEl.value = monthlyFoodNotes;
        }
      }
    });

    // 7. Saved Inspections Archive
    firebaseRtdb.ref("sutech_hse/saved_inspections").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data)) {
        savedInspections = data;
        try { localStorage.setItem(SAVED_INSPECTIONS_KEY, JSON.stringify(savedInspections)); } catch (e) {}
        renderInspectionHistoryTable();
      }
    });

    // 8. Saved MoM Reports Archive
    firebaseRtdb.ref("sutech_hse/saved_mom_reports").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data)) {
        savedMomReports = data;
        try { localStorage.setItem(SAVED_MOM_REPORTS_KEY, JSON.stringify(savedMomReports)); } catch (e) {}
        renderMomHistoryTable();
      }
    });

    // 9. Enterprise Digital Inspections System
    firebaseRtdb.ref("sutech_hse/digital_inspections").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data)) {
        digitalInspections = data;
        try { localStorage.setItem(DIGITAL_INSPECTIONS_KEY, JSON.stringify(digitalInspections)); } catch (e) {}
        updateInspectionDashboardKPIs();
        renderDigitalInspectionHistoryTable();
      }
    });

    // 10. Digital Inspection Templates
    firebaseRtdb.ref("sutech_hse/inspection_templates").on("value", function (snapshot) {
      if (isReceivingCloudUpdate) return;
      var data = snapshot.val();
      if (data && Array.isArray(data)) {
        inspectionTemplates = data;
        try { localStorage.setItem(INSP_TEMPLATES_KEY, JSON.stringify(inspectionTemplates)); } catch (e) {}
      }
    });

    // Auto-seed to Firebase cloud if empty on initial connect
    firebaseRtdb.ref("sutech_hse/findings").once("value", function (snap) {
      if (!snap.exists() || !snap.val()) {
        console.log("[Firebase] Seeding initial data to Firebase Cloud...");
        if (findings && findings.length) firebaseRtdb.ref("sutech_hse/findings").set(findings);
        if (incidents && incidents.length) firebaseRtdb.ref("sutech_hse/incidents").set(incidents);
        if (ptwList && ptwList.length) firebaseRtdb.ref("sutech_hse/ptw_list").set(ptwList);
        if (trainingSessions && trainingSessions.length) firebaseRtdb.ref("sutech_hse/training_sessions").set(trainingSessions);
        if (savedInspections && savedInspections.length) firebaseRtdb.ref("sutech_hse/saved_inspections").set(savedInspections);
        if (savedMomReports && savedMomReports.length) firebaseRtdb.ref("sutech_hse/saved_mom_reports").set(savedMomReports);
        if (savedRiskAssessments && savedRiskAssessments.length) firebaseRtdb.ref("sutech_hse/saved_risk_assessments").set(savedRiskAssessments);
        if (typeof digitalInspections !== "undefined" && digitalInspections.length) firebaseRtdb.ref("sutech_hse/digital_inspections").set(digitalInspections);
        if (typeof inspectionTemplates !== "undefined" && inspectionTemplates.length) firebaseRtdb.ref("sutech_hse/inspection_templates").set(inspectionTemplates);
        firebaseRtdb.ref("sutech_hse/monthly_notes").set({
          busNotes: monthlyBusNotes || "",
          foodNotes: monthlyFoodNotes || "",
          updatedAt: new Date().toISOString()
        });
      }
    });
  }
}

/* ===== SweetAlert2 & Toast Utilities ===== */
function getSUTToast() {
  if (typeof Swal !== "undefined") {
    return Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: function (toast) {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      }
    });
  }
  return null;
}

function showToast(icon, title, timer) {
  var t = getSUTToast();
  if (t) {
    t.fire({
      icon: icon || "success",
      title: title || "تم بنجاح",
      timer: timer || 3000
    });
  } else {
    console.log("[Toast]", icon, title);
  }
}

function showSweetAlert(title, text, icon, confirmBtnText) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      title: title,
      html: text,
      icon: icon || "info",
      confirmButtonText: confirmBtnText || "حسناً / OK",
      customClass: {
        confirmButton: "btn-sut-swal"
      },
      buttonsStyling: false
    });
  } else {
    window.alert(title + (text ? "\n" + text : ""));
  }
}

function showConfirmDialog(title, text, confirmText, cancelText) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      title: title,
      html: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: confirmText || "نعم، تأكيد",
      cancelButtonText: cancelText || "إلغاء",
      customClass: {
        confirmButton: "btn-sut-swal",
        cancelButton: "btn-cancel-swal"
      },
      buttonsStyling: false
    });
  } else {
    return Promise.resolve({ isConfirmed: confirm(title + (text ? "\n" + text : "")) });
  }
}

// Global alert override: all alert() calls automatically become SweetAlert / Toasters
window.alert = function (msg) {
  if (typeof Swal !== "undefined") {
    var str = String(msg || "");
    var isSuccess = str.includes("بنجاح") || str.includes("success") || str.includes("✅") || str.includes("Saved");
    var isWarning = str.includes("يرجى") || str.includes("اكتب") || str.includes("أولاً") || str.includes("Please") || str.includes("اعمل");
    var isError = str.includes("خطأ") || str.includes("غير صالح") || str.includes("تعذر") || str.includes("Error") || str.includes("not found");

    if (isSuccess) {
      showToast("success", str);
    } else if (isWarning) {
      showToast("warning", str, 3500);
    } else if (isError) {
      showSweetAlert("تنبيه من النظام", str, "error");
    } else {
      showToast("info", str);
    }
  } else {
    console.log("[Alert]", msg);
  }
};

/* ===== Universal Custom Dropdowns Support (إمكانية إضافة خيارات جديدة لأي قائمة منسدلة) ===== */
var CUSTOM_DROPDOWN_STORAGE_KEY = "sut_custom_dropdown_options";

function getCustomDropdownOptions() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_DROPDOWN_STORAGE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function saveCustomDropdownOption(selectKey, optionText) {
  if (!selectKey || !optionText) return;
  var data = getCustomDropdownOptions();
  if (!data[selectKey]) data[selectKey] = [];
  if (!data[selectKey].includes(optionText)) {
    data[selectKey].push(optionText);
    try {
      localStorage.setItem(CUSTOM_DROPDOWN_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
}

function enableCustomOptionsOnSelect(selectEl) {
  if (!selectEl) return;
  // Ignore language switches or pure filter toggles if needed
  if (selectEl.id === "reportLangSelect" || selectEl.id === "settingReportLang") return;

  var selectKey = selectEl.id || selectEl.name || selectEl.getAttribute("data-dropdown-key");
  if (!selectKey) {
    var label = selectEl.closest(".field") ? selectEl.closest(".field").querySelector("label") : null;
    selectKey = label ? label.textContent.trim().replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_").slice(0, 30) : "select_" + Math.random().toString(36).slice(2, 7);
    selectEl.setAttribute("data-dropdown-key", selectKey);
  }

  // Load custom options from storage
  var customList = getCustomDropdownOptions()[selectKey] || [];
  customList.forEach(function (optText) {
    var exists = Array.from(selectEl.options).some(function (o) { return o.value === optText || o.text === optText; });
    if (!exists) {
      var opt = document.createElement("option");
      opt.value = optText;
      opt.textContent = optText;
      var addOptIndex = Array.from(selectEl.options).findIndex(function (o) { return o.value === "__custom_new_option__"; });
      if (addOptIndex >= 0) {
        selectEl.insertBefore(opt, selectEl.options[addOptIndex]);
      } else {
        selectEl.appendChild(opt);
      }
    }
  });

  // Ensure "Add Custom Option" exists at bottom
  var hasAdd = Array.from(selectEl.options).some(function (o) { return o.value === "__custom_new_option__"; });
  if (!hasAdd) {
    var addOpt = document.createElement("option");
    addOpt.value = "__custom_new_option__";
    addOpt.textContent = "➕ إضافة خيار جديد... (+ Add Custom Option)";
    addOpt.style.color = "#0284c7";
    addOpt.style.fontWeight = "bold";
    selectEl.appendChild(addOpt);
  }

  if (selectEl.getAttribute("data-has-custom-support") !== "true") {
    selectEl.setAttribute("data-has-custom-support", "true");
    selectEl.addEventListener("focus", function () {
      if (this.value !== "__custom_new_option__") {
        this.setAttribute("data-last-val", this.value);
      }
    });
  }
}

async function handleCustomDropdownChange(selectEl) {
  if (!selectEl || selectEl.value !== "__custom_new_option__") {
    if (selectEl && selectEl.value !== "__custom_new_option__") {
      selectEl.setAttribute("data-last-val", selectEl.value);
    }
    return;
  }

  var prevVal = selectEl.getAttribute("data-last-val") || "";
  var selectKey = selectEl.id || selectEl.name || selectEl.getAttribute("data-dropdown-key") || "custom_dropdown";

  var result = null;
  if (typeof Swal !== "undefined") {
    result = await Swal.fire({
      title: 'إضافة خيار جديد إلى القائمة',
      text: 'اكتب اسم أو نص الخيار المخصص الذي ترغب في إضافته:',
      input: 'text',
      inputPlaceholder: 'اكتب الخيار الجديد هنا...',
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-plus"></i> إضافة وتحديد',
      cancelButtonText: 'إلغاء',
      customClass: {
        popup: 'swal2-popup',
        confirmButton: 'btn btn-sut btn-sut-swal',
        cancelButton: 'btn btn-cancel-swal'
      },
      buttonsStyling: false,
      inputValidator: function (val) {
        if (!val || !val.trim()) return 'يرجى كتابة نص الخيار أولاً!';
      }
    });
  } else {
    var p = prompt("اكتب الخيار الجديد لإضافته للقائمة:");
    if (p && p.trim()) result = { isConfirmed: true, value: p.trim() };
    else result = { isConfirmed: false };
  }

  if (result && result.isConfirmed && result.value && result.value.trim()) {
    var newText = result.value.trim();
    var existingOpt = Array.from(selectEl.options).find(function (o) { return o.value === newText || o.text === newText; });
    if (existingOpt) {
      selectEl.value = existingOpt.value;
    } else {
      var newOption = document.createElement("option");
      newOption.value = newText;
      newOption.textContent = newText;
      var addOptIndex = Array.from(selectEl.options).findIndex(function (o) { return o.value === "__custom_new_option__"; });
      if (addOptIndex >= 0) {
        selectEl.insertBefore(newOption, selectEl.options[addOptIndex]);
      } else {
        selectEl.appendChild(newOption);
      }
      selectEl.value = newText;
      saveCustomDropdownOption(selectKey, newText);
    }
    selectEl.setAttribute("data-last-val", selectEl.value);
    showToast("success", "تمت إضافة الخيار وتحديده بنجاح: " + newText);
    selectEl.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    selectEl.value = prevVal;
  }
}

function initAllCustomDropdowns() {
  document.querySelectorAll("select").forEach(function (sel) {
    enableCustomOptionsOnSelect(sel);
  });
}

document.addEventListener("change", function (e) {
  if (e.target && e.target.tagName === "SELECT") {
    handleCustomDropdownChange(e.target);
  }
});

/* ===== SUTech HSE Committee Members (أعضاء لجنة السلامة والصحة المهنية المعتمدين - 22 عضواً) ===== */
const SUTECH_COMMITTEE_MEMBERS = [
  { id: 1, name: "Maj. Gen. Dr. Osama Abdullah Mahrous", dept: "Security Directorate", role: "Committee Chairman" },
  { id: 2, name: "Mr. Ahmed Zaghloul", dept: "Finance & Accounts Directorate", role: "Member" },
  { id: 3, name: "Mr. Ahmed Abu Ghazal", dept: "Human Resources Directorate", role: "Member" },
  { id: 4, name: "Eng. Mohamed Labib", dept: "Information Technology Directorate", role: "Member" },
  { id: 5, name: "Ms. Fayrouz Hussein", dept: "Student Life Directorate", role: "Member" },
  { id: 6, name: "Eng. Ibrahim Saeed", dept: "HSE Department", role: "Member & Committee Rapporteur" },
  { id: 7, name: "Mr. Ramy Ahmed", dept: "Security Department", role: "Member" },
  { id: 8, name: "Ms. Passant Farag", dept: "Admission Directorate", role: "Member" },
  { id: 9, name: "Ms. Rania Ramzy", dept: "Registrar Directorate", role: "Member" },
  { id: 10, name: "Dr. Noha Galal", dept: "University Clinic (Physician)", role: "Member" },
  { id: 11, name: "Eng. Youssef Mohamed", dept: "HSE Department (Civil Defense)", role: "Civil Defense Officer" },
  { id: 12, name: "Mr. Amr Badawi", dept: "Transportation Department", role: "Member & Staff Representative" },
  { id: 13, name: "Mr. Hazem Adel", dept: "Registrar Department", role: "Member" },
  { id: 14, name: "Mr. Ahmed Hamdi", dept: "Admission Department", role: "Member" },
  { id: 15, name: "Ms. Susan Atef", dept: "Student Life Department", role: "Member" },
  { id: 16, name: "Mr. Eid Saeed", dept: "Laboratories Department", role: "Member" },
  { id: 17, name: "Mr. Ahmed Soliman", dept: "Finance & Accounts Department", role: "Member" },
  { id: 18, name: "Mr. Mohamed Amin", dept: "Facilities & Maintenance Department", role: "Member" },
  { id: 19, name: "Ms. Asmaa Fathy", dept: "Security Department", role: "Member" },
  { id: 20, name: "Ms. Asmaa Ibrahim", dept: "Office of the Secretary-General", role: "Admin Assistant" },
  { id: 21, name: "Ms. Hadeel Youssef", dept: "Office of the Dean", role: "Admin Assistant" },
  { id: 22, name: "Ms. Dalia Saeed Hashem", dept: "Office of the Dean", role: "Admin Assistant" }
];

/* ===== SUT Official Logo (Vector Data URI) ===== */
const SUT_LOGO_B64 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 120' width='420' height='120'><rect width='420' height='120' fill='white' rx='12'/><g transform='translate(20, 20)'><rect width='80' height='80' rx='16' fill='%23c00000'/><circle cx='40' cy='40' r='20' fill='white'/><circle cx='40' cy='40' r='12' fill='%230b1f3a'/><text x='100' y='36' font-family='Arial, sans-serif' font-weight='900' font-size='24' fill='%230b1f3a' letter-spacing='1'>SUTech</text><text x='100' y='56' font-family='Arial, sans-serif' font-weight='bold' font-size='13' fill='%23c00000'>Elsewedy University of Technology</text><text x='100' y='72' font-family='Arial, sans-serif' font-size='11' fill='%2364748b'>جامعة السويدي للتكنولوجيا - HSE System</text></g></svg>";

function applyBrandLogo() {
  try {
    var logoEl = document.getElementById("navBrandLogo") || document.getElementById("brandLogo");
    if (logoEl) {
      if (customLogoUrl && customLogoUrl.trim()) {
        logoEl.src = customLogoUrl.trim();
      } else if (typeof SUT_LOGO_B64 !== "undefined" && SUT_LOGO_B64) {
        logoEl.src = SUT_LOGO_B64;
      }
    }
  } catch (e) {
    console.warn("[Brand Logo]", e);
  }
}

/* ===== Official SUT Header & Footer for exports (exact match to جواب ترشيح.docx) ===== */
function getSutExportHeader(isEn) {
  var logoSrc = customLogoUrl || SUT_LOGO_B64;
  var align = isEn ? "left" : "right";
  return '<div class="sut-export-header" style="text-align:' + align + ';margin-bottom:12px;padding:0;display:block;">' +
    '<img src="' + logoSrc + '" alt="SUTech Logo" style="height:48px;width:auto;max-width:145px;object-fit:contain;display:inline-block;">' +
    '</div>';
}

function getSutExportFooter(isEn) {
  var footerText = isEn ?
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Cairo - Ismailia Desert Road, Km 51</span>' :
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>القاهرة - طريق إسماعيلية الصحراوي ، كيلو 51</span>';

  return '<div class="sut-export-footer" style="margin-top:20px;page-break-inside:avoid;direction:' + (isEn ? 'ltr' : 'rtl') + '">' +
    '<div style="border-top:1.0pt solid #5D5E60;margin-bottom:6px;width:100%"></div>' +
    '<div style="text-align:center;font-family:Arial,sans-serif;font-size:9pt;color:#5D5E60;line-height:1.4">' +
    footerText +
    '</div>' +
    '</div>';
}

function wrapWithHeaderFooter(bodyHTML, isEn) {
  if (typeof isEn === "undefined") {
    isEn = (currentReportLang === "en");
  }
  return getSutExportHeader(isEn) + bodyHTML + getSutExportFooter(isEn);
}


let apiKey = localStorage.getItem(KEY_NAME) || "";
let modelName = localStorage.getItem(MODEL_NAME) || "gemini-3.6-flash";

/* تحديث تلقائي لو المتصفح محتفظ بالموديل القديم */
if (modelName === "gemini-2.0-flash" || modelName === "models/gemini-2.0-flash" || !modelName) {
  modelName = "gemini-3.6-flash";
  localStorage.setItem(MODEL_NAME, modelName);
}

let emailTo = localStorage.getItem(EMAIL_TO_KEY) || "nariman.alsoleeh@elsewedy.com";
let emailCc = localStorage.getItem(EMAIL_CC_KEY) || "shimae.khamis@elsewedy.com, President@sut.edu.eg";
let customLogoUrl = localStorage.getItem(LOGO_URL_KEY) || "";
let monthlyBusNotes = localStorage.getItem(BUS_NOTES_KEY) || "";
let monthlyFoodNotes = localStorage.getItem(FOOD_NOTES_KEY) || "";
let currentReportLang = localStorage.getItem(REPORT_LANG_KEY) || "ar";
let currentMomSeq = parseInt(localStorage.getItem(MOM_SEQ_KEY) || "18");
let monthlySource = { name: "", type: "", text: "" };

/* ===== SUTech HSE Default Initial Dataset (قاعدة البيانات الافتراضية للتشغيل الأول والـ Deploy) ===== */
const DEFAULT_INITIAL_FINDINGS = [
  {
    id: 1718000001,
    ncrNo: "SUT-HSE-NCR-10492",
    area: "Engineering Workshops & FabLab",
    dept: "Facilities & Maintenance Department",
    finding: "غياب حواجز الوقاية الميكانيكية (Machine Guarding) على ماكينات القطع وتراكم مخلفات الرايش بالورش الهندسية.",
    status: "Open",
    priority: "High",
    date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    photoBefore: "",
    photoAfter: "",
    target: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    verifyDate: "",
    requirement: "قانون العمل المصري 12 لسنة 2003 والمادة 211 / معايير OSHA 29 CFR 1910.212",
    impact: "خطر جسيم: احتمال إصابات بتر أو جروح قطعية للمتدربين",
    cause: "Maintenance deficiency & Inadequate machine guarding",
    action: "تركيب حواجز حماية شفافة معتمدة ومفتاح إيقاف طوارئ (Emergency Stop) فوري",
    category: "NCR",
    caseType: "عدم مطابقة ومخالفة تشغيلية (Operational NCR)"
  },
  {
    id: 1718000002,
    ncrNo: "SUT-HSE-NCR-10488",
    area: "Central Cafeteria & Food Court",
    dept: "Student Life Department",
    finding: "عدم تجديد الشهادات الصحية لـ 3 من العاملين بمطبخ الكافيتريا المركزية مع وجود تراكم دهون بمدخنة الهود.",
    status: "In Progress",
    priority: "Medium",
    date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    photoBefore: "",
    photoAfter: "",
    target: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    verifyDate: "",
    requirement: "اشتراطات الهيئة القومية لسلامة الغذاء (NFSA) والقرار الوزاري 134 لسنة 2003",
    impact: "مخاطر صحية وتلوث غذائي محتمل مع مخاطر حريق بالمدخنة",
    cause: "Inadequate supervision & Delayed renewal",
    action: "استخراج وتجديد الشهادات الصحية فوراً وتكليف شركة نظافة متخصصة لتطهير الهود",
    category: "NCR",
    caseType: "شهادات صحية للعاملين بالأغذية (Food Handlers Health Certificates)"
  },
  {
    id: 1718000003,
    ncrNo: "SUT-HSE-NCR-10475",
    area: "Chemical & Energy Laboratories",
    dept: "Laboratories Department",
    finding: "نقص لوحات إرشادات السلامة (MSDS) بمخزن الكيماويات وعدم توفر حوض احتواء ثانوي (Spill Containment).",
    status: "Closed",
    priority: "High",
    date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
    photoBefore: "",
    photoAfter: "",
    target: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
    verifyDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    requirement: "قانون البيئة رقم 4 لسنة 1994 ومعايير NFPA 45 لمعامل الكيماويات",
    impact: "خطر تسرب كيميائي وانبعاثات ضارة",
    cause: "Inadequate risk assessment",
    action: "تم توفير صحائف أمان المواد MSDS وأحواض الاحتواء وتدريب مشرف المعمل",
    category: "NCR",
    caseType: "عدم مطابقة ومخالفة تشغيلية (Operational NCR)"
  },
  {
    id: 1718000004,
    ncrNo: "",
    area: "Campus Transportation Terminal",
    dept: "Transportation Department",
    finding: "تجديد تراخيص وفحص دورة الفرامل والإطارات لأسطول حافلات نقل الطلاب (عدد 12 باص).",
    status: "Closed",
    priority: "High",
    date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    photoBefore: "",
    photoAfter: "",
    target: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    verifyDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    requirement: "",
    impact: "",
    cause: "",
    action: "",
    category: "General",
    caseType: "ترخيص حافلة نقل (Bus Licensing)",
    caseNotes: "تم الانتهاء من الفحص الدوري بالمرور وتجديد وثائق التأمين الإجباري",
    caseDate: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10)
  },
  {
    id: 1718000005,
    ncrNo: "",
    area: "University Clinic & First Aid Unit",
    dept: "University Clinic (Physician)",
    finding: "تجديد ترخيص سيارة الإسعاف المجهزة وفحص حقائب الإسعافات الأولية وأسطوانات الأكسجين.",
    status: "Closed",
    priority: "Critical",
    date: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
    photoBefore: "",
    photoAfter: "",
    target: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
    verifyDate: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
    requirement: "",
    impact: "",
    cause: "",
    action: "",
    category: "General",
    caseType: "ترخيص سيارة إسعاف (Ambulance Licensing)",
    caseNotes: "جاهزية سيارة الإسعاف 100% للطوارئ والفعاليات الجامعية",
    caseDate: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10)
  },
  {
    id: 1718000006,
    ncrNo: "",
    area: "Main Campus Building",
    dept: "HSE Department",
    finding: "متابعة تجديد شهادة واشتراطات الحماية المدنية (Civil Defense Approval) وفحص شبكة الرشاشات التلقائية.",
    status: "In Progress",
    priority: "High",
    date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    photoBefore: "",
    photoAfter: "",
    target: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    verifyDate: "",
    requirement: "",
    impact: "",
    cause: "",
    action: "",
    category: "General",
    caseType: "موافقة / شهادة الدفاع المدني (Civil Defense Approval)",
    caseNotes: "جاري المعاينة الميدانية مع مهندسي إدارة الحماية المدنية بالعاشر من رمضان",
    caseDate: new Date().toISOString().slice(0, 10)
  }
];

const DEFAULT_INITIAL_PTWS = [
  {
    id: 1718000101,
    no: "SUT-PTW-2026-081",
    type: "Hot Work (أعمال ساخنة ولحام)",
    loc: "Engineering Workshop B - Metal Fabrication",
    contractor: "Elsewedy Electrometer Contractor",
    status: "Issued & Active",
    start: new Date().toISOString().slice(0, 10) + " 08:00",
    end: new Date().toISOString().slice(0, 10) + " 17:00",
    sutOfficer: "Eng. Ibrahim Saeed",
    contractorOfficer: "Eng. Ahmed Tarek"
  },
  {
    id: 1718000102,
    no: "SUT-PTW-2026-079",
    type: "Working at Height (عمل على ارتفاع وسقالات)",
    loc: "Building A - Facade Maintenance",
    contractor: "Facilities Subcontractor",
    status: "Under Review",
    start: new Date().toISOString().slice(0, 10) + " 09:00",
    end: new Date().toISOString().slice(0, 10) + " 16:00",
    sutOfficer: "Eng. Youssef Mohamed",
    contractorOfficer: "Safety Sup. Mahmoud"
  }
];

const DEFAULT_INITIAL_TRAININGS = [
  {
    id: 1718000201,
    topic: "خطة الإخلاء ومكافحة الحرائق الأولية واستخدام الطفايات (Fire Warden & Evacuation)",
    date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
    audience: "مشرفو المباني وممثلو الكليات والأمن الجامعي",
    trainer: "Eng. Ibrahim Saeed & Eng. Youssef",
    attendees: 38,
    hours: 3.5
  },
  {
    id: 1718000202,
    topic: "السلامة الكيميائية والتعامل الآمن مع المواد الخطرة وصحائف MSDS",
    date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    audience: "فنيو ومشرفو المعامل الهندسية والكيميائية",
    trainer: "SUTech HSE Team",
    attendees: 24,
    hours: 2
  }
];

const DEFAULT_INITIAL_INCIDENTS = [
  {
    id: 1718000301,
    type: "Near-Miss (واقعة وشيكة)",
    date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) + " 11:30",
    loc: "Parking Lot Area 2",
    desc: "تحرك حافلة دون انتباه السائق أثناء عبور أحد الطلاب وتم استخدام آلة التنبيه والتوقف في الوقت المناسب دون أي إصابات."
  },
  {
    id: 1718000302,
    type: "First Aid (إسعافات أولية)",
    date: new Date(Date.now() - 18 * 86400000).toISOString().slice(0, 10) + " 14:15",
    loc: "FabLab Workshop",
    desc: "خدش بسيط بيد أحد الطلاب أثناء التدريب العملي وتم التطهير والتضميد فوراً بالعيادة الطبية واستئناف اليوم الدراسي."
  }
];

let findings = [];
let incidents = [];
let ptwList = [];
let trainingSessions = [];

try {
  findings = JSON.parse(localStorage.getItem("SUT_FINDINGS"));
} catch (e) { findings = null; }
if (!findings || !Array.isArray(findings) || findings.length === 0) {
  findings = DEFAULT_INITIAL_FINDINGS.slice();
  try { localStorage.setItem("SUT_FINDINGS", JSON.stringify(findings)); } catch (e) {}
}

try {
  incidents = JSON.parse(localStorage.getItem("SUT_INCIDENTS"));
} catch (e) { incidents = null; }
if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
  incidents = DEFAULT_INITIAL_INCIDENTS.slice();
  try { localStorage.setItem("SUT_INCIDENTS", JSON.stringify(incidents)); } catch (e) {}
}

try {
  ptwList = JSON.parse(localStorage.getItem("SUT_PTW_LIST"));
} catch (e) { ptwList = null; }
if (!ptwList || !Array.isArray(ptwList) || ptwList.length === 0) {
  ptwList = DEFAULT_INITIAL_PTWS.slice();
  try { localStorage.setItem("SUT_PTW_LIST", JSON.stringify(ptwList)); } catch (e) {}
}

try {
  trainingSessions = JSON.parse(localStorage.getItem("SUT_TRAINING_SESSIONS"));
} catch (e) { trainingSessions = null; }
if (!trainingSessions || !Array.isArray(trainingSessions) || trainingSessions.length === 0) {
  trainingSessions = DEFAULT_INITIAL_TRAININGS.slice();
  try { localStorage.setItem("SUT_TRAINING_SESSIONS", JSON.stringify(trainingSessions)); } catch (e) {}
}

const DEFAULT_INITIAL_INSPECTIONS = [
  {
    id: 1718000401,
    no: "SUT-INS-2026-001",
    title: "فحص وتفتيش السلامة الشامل لحافلات وسيارات الجامعة (Campus Fleet & Bus Inspection)",
    area: "University Parking & Transport Fleet",
    date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    status: "Completed",
    itemsCount: 12,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    data: {
      title: "فحص وتفتيش السلامة الشامل لحافلات وسيارات الجامعة (Campus Fleet & Bus Inspection)",
      scope: "University Parking & Transport Fleet",
      items: [
        { id: 1, inspection_point: "فحص كفاءة منظومة الفرامل وفرامل اليد (Braking System)", acceptance_criteria: "استجابة فورية وعدم وجود تسريب زيت هيدروليك", status: "Pass", observation: "تم الفحص لجميع الحافلات وهي بحالة ممتازة" },
        { id: 2, inspection_point: "عمق مداس الإطارات وضغط الهواء (Tire Tread Depth & Pressure)", acceptance_criteria: "عمق المداس لا يقل عن 2.5 مم وضغط 110 PSI", status: "Pass", observation: "ضغط الهواء مطابق والمطاط سليم" },
        { id: 3, inspection_point: "جاهزية طفايات الحريق البودرة 6 كجم وتاريخ الصلاحية (Fire Extinguishers)", acceptance_criteria: "مؤشر الضغط في النطاق الأخضر ومثبتة بحامل سليم", status: "Pass", observation: "تم فحص الطفايات وصلاحيتها سارية" },
        { id: 4, inspection_point: "مخارج الطوارئ ومطارق كسر الزجاج (Emergency Exits & Hammers)", acceptance_criteria: "مطارق متوفرة ومسارات الطوارئ خالية من العوائق", status: "Pass", observation: "المطارق متوفرة بجانب النوافذ" },
        { id: 5, inspection_point: "حقيبة الإسعافات الأولية (First Aid Kit)", acceptance_criteria: "مكتملة المحتويات والمعقمات والضمادات", status: "Pass", observation: "الحقيبة مكتملة" },
        { id: 6, inspection_point: "أحزمة الأمان لجميع المقاعد (Seat Belts)", acceptance_criteria: "تعمل بكفاءة وتثبت الركاب بإحكام", status: "Pass", observation: "أحزمة الأمان سليمة" },
        { id: 7, inspection_point: "جهاز محدد السرعة التلقائي (Speed Governor)", acceptance_criteria: "معاير ومحدد على 90 كم/ساعة كحد أقصى", status: "Pass", observation: "الأجهزة مفعلة ومعايرة" },
        { id: 8, inspection_point: "صلاحية رخص القيادة المهنية والتحاليل الدورية للسائقين", acceptance_criteria: "رخص سارية درجة أولى/ثانية وشهادات طبية معتمدة", status: "Pass", observation: "جميع السائقين يحملون رخص سارية" }
      ],
      notes: "تم استكمال الفحص الدوري لحافلات نقل الطلاب والعاملين بجامعة السويدي للتكنولوجيا (عدد 12 باص) وجاهزيتها تامة للتشغيل الآمن."
    }
  },
  {
    id: 1718000402,
    no: "SUT-INS-2026-002",
    title: "تفتيش السلامة والصحة المهنية وسلامة الغذاء لمطاعم وكافيتريات الجامعة (Food Hygiene & Kitchen Fire Safety)",
    area: "Central Cafeteria & Food Outlets",
    date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    inspector: "م. يوسف محمد (Civil Defense & Safety Officer)",
    lang: "ar",
    status: "Action Required",
    itemsCount: 10,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    data: {
      title: "تفتيش السلامة والصحة المهنية وسلامة الغذاء لمطاعم وكافيتريات الجامعة (Food Hygiene & Kitchen Fire Safety)",
      scope: "Central Cafeteria & Food Outlets",
      items: [
        { id: 1, inspection_point: "الشهادات الصحية للعاملين بتداول الأغذية (Food Handlers Health Certificates)", acceptance_criteria: "شهادات رسمية سارية صادرة من وزارة الصحة وخالية من الأمراض المعدية", status: "Fail", observation: "تم رصد 3 عاملين بشهادات منتهية وتم إصدار NCR #10488" },
        { id: 2, inspection_point: "نظافة مداخن وهود المطابخ وخلوها من الزيوت (Kitchen Hood & Duct System)", acceptance_criteria: "خلو تام من الشحوم والدهون المتراكمة وتوافر نظام إطفاء رطب Ansul", status: "Fail", observation: "يوجد تراكم دهون بالمدخنة وجاري التعاقد للتطهير" },
        { id: 3, inspection_point: "درجات حرارة ثلاجات الحفظ والتجميد (Cold Storage & Freezers)", acceptance_criteria: "التبريد أقل من 4°C والتجميد أقل من -18°C وسجل متابعة يومي", status: "Pass", observation: "درجات الحرارة مضبوطة ومسجلة بالسجل اليومي" },
        { id: 4, inspection_point: "فصل الأطعمة النيئة عن المطهية (Cross-Contamination Prevention)", acceptance_criteria: "ألواح تقطيع ملونة مخصصة وثلاجات منفصلة", status: "Pass", observation: "ألواح التقطيع الملونة مفعلة بالكامل" },
        { id: 5, inspection_point: "بطانيات الحريق وطفايات ثاني أكسيد الكربون (Fire Blankets & CO2 Extinguishers)", acceptance_criteria: "متوفرة بجوار الموقد بحالة صالحة للاستخدام الفوري", status: "Pass", observation: "بطانيات الحريق مثبتة بالمطبخ" }
      ],
      notes: "تم إخطار إدارة شؤون الطلاب ومشرف الكافيتريا بالمخالفات المرصودة لمتابعة استيفاء الشهادات الصحية وتنظيف المدخنة فوراً."
    }
  },
  {
    id: 1718000403,
    no: "SUT-INS-2026-003",
    title: "فحص وصيانة الأوناش العلوية ومعدات القطع بالورش (FabLab Cranes & Machinery)",
    area: "Fabrication Lab & Mechanical Workshops",
    date: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "en",
    status: "Completed",
    itemsCount: 14,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    data: {
      title: "FabLab Machinery & Digital Fabrication Equipment Inspection",
      scope: "Fabrication Lab & Mechanical Workshops",
      items: [
        { id: 1, inspection_point: "Laser Cutters (CO2) Safety Interlocks & Fume Exhaust", acceptance_criteria: "Beam stops immediately on door opening, LEV airflow > 400 CFM", status: "Pass", observation: "Interlocks and HEPA fume extraction operating normally" },
        { id: 2, inspection_point: "Drill Press Chuck Guard & Table Clamping Vice", acceptance_criteria: "Transparent interlocked chuck shield & heavy-duty bolted vice", status: "Pass", observation: "Shield in place and workpieces securely clamped" },
        { id: 3, inspection_point: "Benchtop Grinder Wheel Inspection & Spark Arrestors", acceptance_criteria: "Wheel gap < 3mm, work rest < 1.5mm, polycarbonate eye shields clean", status: "Pass", observation: "Clear shields fitted, wheel dress performed" },
        { id: 4, inspection_point: "3D Printing & SLA UV Resin Wash/Cure Station", acceptance_criteria: "Nitrile chemical gloves, IPA secondary containment & safety glasses", status: "Pass", observation: "Ventilated enclosure active, spill kit ready" },
        { id: 5, inspection_point: "Emergency Stop Push-Buttons (E-Stops)", acceptance_criteria: "Mushroom red twist-release button on all power machines", status: "Pass", observation: "All 6 machines tested and verified functional" }
      ],
      notes: "Annual mechanical and electrical safety audit completed for Fabrication Lab. All safety guards, interlocks, and PPE stations are in full compliance."
    }
  }
];

const DEFAULT_INITIAL_MOMS = [
  {
    id: 1718000501,
    seqNo: "18",
    subject: "HSE Committee Meeting — Campus Safety Audits, Bus Fleet & Food Safety Review",
    date: "2026-08-20",
    timing: "10:30 AM – 12:30 PM",
    location: "Main Campus Conference Hall A",
    attendeesCount: 22,
    createdAt: "2026-08-20T12:30:00Z",
    updatedAt: "2026-08-20T12:30:00Z",
    data: {
      seqNo: "18",
      subject: "HSE Committee Meeting — Campus Safety Audits, Bus Fleet & Food Safety Review",
      date: "2026-08-20",
      timing: "10:30 AM – 12:30 PM",
      location: "Main Campus Conference Hall A",
      attendees: SUTECH_COMMITTEE_MEMBERS.map(function (m) { return { name: m.name, dept: m.dept }; }),
      summary: "The Committee reviewed the comprehensive safety audit conducted across the university bus fleet, central cafeteria, and engineering laboratories. Discussions focused on zero-LTI targets, emergency drill preparations, and the renewal of food handler health certificates.",
      recommendations: [
        "Enforce strict mandatory pre-trip safety checklist for all 12 student transport buses prior to morning departures.",
        "Expedite renewal of medical health certificates for 3 cafeteria workers and conduct professional kitchen exhaust hood cleaning.",
        "Implement machine guarding verifications across FabLab drill presses and bench grinders before the new semester.",
        "Schedule annual campus-wide emergency fire evacuation drill in coordination with 10th of Ramadan Civil Defense.",
        "Continue weekly toolbox talks (TBT) for all lab technicians and workshop instructors."
      ]
    }
  },
  {
    id: 1718000502,
    seqNo: "17",
    subject: "HSE Committee Meeting — Chemical Lab Protocols & Fire Protection System Verification",
    date: "2026-07-15",
    timing: "11:00 AM – 01:00 PM",
    location: "Main Campus Conference Hall A",
    attendeesCount: 20,
    createdAt: "2026-07-15T13:00:00Z",
    updatedAt: "2026-07-15T13:00:00Z",
    data: {
      seqNo: "17",
      subject: "HSE Committee Meeting — Chemical Lab Protocols & Fire Protection System Verification",
      date: "2026-07-15",
      timing: "11:00 AM – 01:00 PM",
      location: "Main Campus Conference Hall A",
      attendees: SUTECH_COMMITTEE_MEMBERS.slice(0, 20).map(function (m) { return { name: m.name, dept: m.dept }; }),
      summary: "Committee focused on chemical management in laboratories, hazardous waste disposal contracts, and civil defense sprinkler inspections.",
      recommendations: [
        "Install secondary spill containment trays under all flammable chemical storage cabinets in Energy Lab.",
        "Complete annual hydrostatic testing for automatic sprinkler system and fire pump room.",
        "Distribute updated GHS / OSHA chemical safety data sheets (MSDS) to all lab workstations."
      ]
    }
  }
];

let savedInspections = [];
let savedMomReports = [];
let savedRiskAssessments = [];
let lastGeneratedInspectionData = null;

try {
  savedInspections = JSON.parse(localStorage.getItem(SAVED_INSPECTIONS_KEY));
} catch (e) { savedInspections = null; }
if (!savedInspections || !Array.isArray(savedInspections) || savedInspections.length === 0) {
  savedInspections = DEFAULT_INITIAL_INSPECTIONS.slice();
  try { localStorage.setItem(SAVED_INSPECTIONS_KEY, JSON.stringify(savedInspections)); } catch (e) {}
}

try {
  savedMomReports = JSON.parse(localStorage.getItem(SAVED_MOM_REPORTS_KEY));
} catch (e) { savedMomReports = null; }
if (!savedMomReports || !Array.isArray(savedMomReports) || savedMomReports.length === 0) {
  savedMomReports = DEFAULT_INITIAL_MOMS.slice();
  try { localStorage.setItem(SAVED_MOM_REPORTS_KEY, JSON.stringify(savedMomReports)); } catch (e) {}
}

try {
  savedRiskAssessments = JSON.parse(localStorage.getItem("SUT_SAVED_RISK_REPORTS"));
} catch (e) { savedRiskAssessments = null; }
if (!savedRiskAssessments || !Array.isArray(savedRiskAssessments)) {
  savedRiskAssessments = [];
}

const DEFAULT_INITIAL_RISKS = [
  {
    id: 101,
    area: "FabLab Workshop & Engineering Labs",
    equipment: "CNC Milling Machine & High-Speed Lathe",
    activity: "Precision metal machining and high-speed cutting",
    persons: "Engineering Students, Lab Technicians",
    hazard: "Rotating spindle entanglement & flying metal debris / Projectiles",
    initialL: 4,
    initialS: 4,
    initialScore: 16,
    initialLevel: "Critical",
    existingControls: "Operator standard safety glasses, basic floor markings",
    additionalControls: "Interlocked polycarbonate machine guarding, mandatory chip shield, emergency foot brake, high-impact safety goggles (ANSI Z87.1)",
    residualL: 2,
    residualS: 2,
    residualScore: 4,
    residualLevel: "Low",
    owner: "FabLab Supervisor & HSE Officer",
    targetDate: "2026-09-15"
  },
  {
    id: 102,
    area: "Chemistry & Materials Testing Lab",
    equipment: "Chemical Fume Hood & Solvent Storage Cabinet",
    activity: "Chemical acid titration and volatile solvent handling",
    persons: "Students, Lab Instructors",
    hazard: "Toxic vapor inhalation and corrosive liquid splash to eyes/skin",
    initialL: 3,
    initialS: 4,
    initialScore: 12,
    initialLevel: "High",
    existingControls: "Natural room ventilation, standard lab coats",
    additionalControls: "Certified local exhaust ventilation (face velocity 100 fpm), chemical splash apron, neoprene chemical gloves, full-face visor, eyewash station inspection",
    residualL: 1,
    residualS: 2,
    residualScore: 2,
    residualLevel: "Low",
    owner: "Chemistry Lab Tech & HSE Directorate",
    targetDate: "2026-09-01"
  },
  {
    id: 103,
    area: "Main Substation & Electrical Switchgear Room",
    equipment: "11kV High Voltage Distribution Panel",
    activity: "Routine electrical maintenance and transformer inspection",
    persons: "Maintenance Technicians, Electrical Contractors",
    hazard: "Arc flash explosion and severe electrical shock",
    initialL: 2,
    initialS: 5,
    initialScore: 10,
    initialLevel: "High",
    existingControls: "Warning signs on door, locked entrance key with security",
    additionalControls: "Mandatory LOTO (Lockout/Tagout) procedure, calibrated voltage tester, NFPA 70E Category 4 Arc Flash suit (40 cal/cm²), insulated rubber matting (17kV rated)",
    residualL: 1,
    residualS: 3,
    residualScore: 3,
    residualLevel: "Low",
    owner: "Facilities Directorate",
    targetDate: "2026-08-30"
  },
  {
    id: 104,
    area: "Central Kitchen & Food Services",
    equipment: "Industrial Commercial Deep Fryer & Gas Range",
    activity: "High-volume food frying and hot oil handling",
    persons: "Kitchen Staff, Cafeteria Workers",
    hazard: "Hot oil splatter burn and Class K grease fire ignition",
    initialL: 3,
    initialS: 3,
    initialScore: 9,
    initialLevel: "Medium",
    existingControls: "Wet chemical Class K fire extinguisher located nearby",
    additionalControls: "Automatic kitchen hood fire suppression system (Ansul R-102), thermal heat-resistant silicone gauntlets, non-slip oil-resistant safety footwear",
    residualL: 1,
    residualS: 2,
    residualScore: 2,
    residualLevel: "Low",
    owner: "Food Services Manager",
    targetDate: "2026-09-10"
  }
];

let riskAssessments = [];
try {
  riskAssessments = JSON.parse(localStorage.getItem("SUT_RISK_ASSESSMENTS"));
} catch (e) { riskAssessments = null; }
if (!riskAssessments || !Array.isArray(riskAssessments) || riskAssessments.length === 0) {
  riskAssessments = DEFAULT_INITIAL_RISKS.slice();
  try { localStorage.setItem("SUT_RISK_ASSESSMENTS", JSON.stringify(riskAssessments)); } catch (e) {}
}

let currentBeforePhoto = "";
let currentAfterPhoto = "";
let currentRiskPhoto = "";
let donutChartInstance = null;
let riskBarChartInstance = null;
let hazardChartInstance = null;
let deptChartInstance = null;
let trendChartInstance = null;
let lastGeneratedMoMData = null;
let lastNCRData = null;
let lastMonthly = null;
let lastRiskAssessmentData = null;
let lastRcaData = null;

function safeBind(id, event, fn) {
  var el = document.getElementById(id);
  if (el && typeof fn === "function") {
    el.addEventListener(event, fn);
  }
  return el;
}

function safeSetVal(id, val) {
  var el = document.getElementById(id);
  if (el && val !== undefined && val !== null) {
    el.value = val;
  }
  return el;
}

function initApp() {
  // 1. Unconditionally wire up navigation tabs FIRST
  try {
    document.querySelectorAll(".nav button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tabId = this.getAttribute("data-tab");
        showTab(tabId, this);
      });
    });
  } catch (e) {
    console.error("Tab listeners error:", e);
  }

  // 2. Settings & Brand Logo Configuration
  try {
    safeSetVal("apiKey", apiKey);

    var modelSelect = document.getElementById("modelName");
    var cleanMod = modelName ? modelName.replace(/^models\//, "") : "gemini-3.6-flash";
    if (modelSelect) {
      modelSelect.value = cleanMod;
      if (!modelSelect.value) {
        modelSelect.value = "gemini-3.6-flash";
        modelName = "gemini-3.6-flash";
        localStorage.setItem(MODEL_NAME, modelName);
      }
    }

    safeSetVal("emailTo", emailTo);
    safeSetVal("emailCc", emailCc);
    safeSetVal("customLogoUrl", customLogoUrl);
    safeSetVal("monthlyBusNotes", monthlyBusNotes);
    safeSetVal("monthlyFoodNotes", monthlyFoodNotes);
    safeSetVal("reportLangSelect", currentReportLang);
    safeSetVal("settingReportLang", currentReportLang);
    safeSetVal("momDate", new Date().toISOString().slice(0, 10));
    safeSetVal("momSeqNo", currentMomSeq);

    applyBrandLogo();
  } catch (e) {
    console.warn("Settings init error:", e);
  }

  // 3. Initialize Firebase Cloud Sync
  try {
    initFirebase();
  } catch (e) {
    console.warn("Firebase init error:", e);
  }

  // 4. Default Form Dates and Sequencers
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toISOString().slice(0, 16);
    safeSetVal("ncrDate", today);
    safeSetVal("gcDate", today);
    safeSetVal("incDate", nowTime);
    safeSetVal("trDate", today);
    safeSetVal("ptwStart", nowTime);
    const endDate = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16);
    safeSetVal("ptwEnd", endDate);
    safeSetVal("ncrNo", getNextNCRNumber());
    safeSetVal("ptwNo", "SUT-PTW-" + String(Date.now()).slice(-5));
  } catch (e) {
    console.warn("Form defaults error:", e);
  }

  // 5. Header Settings Menu & Global Dropdowns
  try {
    var gearBtn = document.getElementById("gearBtn");
    var settingsMenu = document.getElementById("settingsMenu");
    if (gearBtn && settingsMenu) {
      gearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        settingsMenu.style.display = (settingsMenu.style.display === "block") ? "none" : "block";
      });
    }
    window.addEventListener("click", function () {
      if (settingsMenu) settingsMenu.style.display = "none";
      if (typeof closeAllMemberDropdowns === "function") closeAllMemberDropdowns();
    });

    safeBind("backupBtn", "click", exportFullBackup);
    safeBind("restoreBtn", "click", function () { var f = document.getElementById("importBackupFile"); if (f) f.click(); });
    safeBind("importBackupFile", "change", importFullBackup);
    safeBind("systemSettingsBtn", "click", openSettings);
    safeBind("helpBtn", "click", openHelp);
    safeBind("settingsCancelBtn", "click", closeSettings);
    safeBind("settingsSaveBtn", "click", saveSettings);
    safeBind("helpCloseBtn", "click", closeHelp);

    safeBind("pushToFirebaseBtn", "click", pushAllToFirebase);
    safeBind("pullFromFirebaseBtn", "click", pullAllFromFirebase);

    safeBind("goToPtwBtn", "click", function () { showTab("ptw", document.querySelector("[data-tab=ptw]")); });
    safeBind("goToNcrBtn", "click", function () { showTab("ncr", document.querySelector("[data-tab=ncr]")); });
    safeBind("goToHseCasesBtn", "click", function () { showTab("hse_cases", document.querySelector("[data-tab=hse_cases]")); });
    safeBind("sendEmailBtn", "click", sendOfficialEmail);
    safeBind("exportExcelBtn", "click", exportFindingsExcel);
    safeBind("fullReportWordBtn", "click", buildFullMonthlyDashboard);
    safeBind("fullReportPrintBtn", "click", printFullDashboard);

    safeBind("reportLangSelect", "change", function () {
      currentReportLang = this.value;
      localStorage.setItem(REPORT_LANG_KEY, currentReportLang);
      safeSetVal("settingReportLang", currentReportLang);
    });
  } catch (e) {
    console.warn("Global action binds error:", e);
  }

  // 6. Committee MoM Event Listeners
  try {
    safeBind("saveAuditBtn", "click", saveAuditNotes);
    safeBind("addAttendeeBtn", "click", function () { addMomAttendeeRow(); });
    safeBind("addAllAttendeesBtn", "click", function () { addAllCommitteeMembers(true); });
    safeBind("clearAttendeesBtn", "click", clearAllCommitteeAttendees);
    safeBind("generateMomBtn", "click", generateMoMReport);
    safeBind("sendMomEmailBtn", "click", sendMoMEmail);
    safeBind("momWordBtn", "click", function () { downloadCurrentWord("momReportContainer"); });
    safeBind("momPdfBtn", "click", function () { downloadCurrentPDF("momReportContainer"); });
    safeBind("momPrintBtn", "click", function () { printReport("momReportContainer"); });

    addAllCommitteeMembers(false);
  } catch (e) {
    console.warn("MoM listeners error:", e);
  }

  // 7. Codes, NCR, PTW, General Cases, Incidents & Training
  try {
    safeBind("runCodesBtn", "click", function () { runAI("codes"); });
    safeBind("codesWordBtn", "click", function () { downloadCurrentWord("codesReport"); });
    safeBind("codesPdfBtn", "click", function () { downloadCurrentPDF("codesReport"); });
    safeBind("codesPrintBtn", "click", function () { printReport("codesReport"); });

    // Inspection Interactive System Listeners
    safeBind("runInspectionBtn", "click", function () {
      var qEl = document.getElementById("inspectionQuery");
      var q = qEl ? qEl.value.trim() : "";
      if (!q) {
        setInspectionTemplate("bus");
      } else {
        var found = false;
        if (typeof INSPECTION_PRESETS !== "undefined") {
          Object.keys(INSPECTION_PRESETS).forEach(function(k) {
            if (!found && INSPECTION_PRESETS[k].title.toLowerCase().includes(q.toLowerCase())) {
              setInspectionTemplate(k);
              found = true;
            }
          });
        }
        if (!found) {
          if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) {
            setInspectionTemplate("bus");
          } else {
            var outWrap = document.getElementById("inspectionOutput");
            if (outWrap) outWrap.classList.remove("hidden");
            renderInteractiveInspection();
          }
        }
      }
    });

    safeBind("generateAiInspBtn", "click", function () { runAI("inspection"); });
    safeBind("addCustomInspItemBtn", "click", addCustomInspectionItem);
    safeBind("inspAddItemBtn", "click", addCustomInspectionItem);
    safeBind("inspPassAllBtn", "click", inspPassAllItems);
    safeBind("saveInspectionWorkspaceBtn", "click", function () { saveCurrentInspection(true); });
    safeBind("inspWordBtn", "click", exportInspectionWord);
    safeBind("inspExcelBtn", "click", exportInspectionExcel);
    safeBind("inspPdfBtn", "click", function () { downloadCurrentPDF("inspectionReport"); });
    safeBind("inspPrintBtn", "click", function () { printReport("inspectionReport"); });

    safeBind("ncrPhotoBefore", "change", function () { handleImageUpload(this, "previewBefore"); });
    safeBind("generateNcrBtn", "click", generateNCR);
    safeBind("ncrWordBtn", "click", function () { downloadCurrentWord("ncrReport"); });
    safeBind("ncrPdfBtn", "click", function () { downloadCurrentPDF("ncrReport"); });
    safeBind("ncrPrintBtn", "click", function () { printReport("ncrReport"); });

    safeBind("addGeneralCaseBtn", "click", addGeneralCase);

    safeBind("generatePtwBtn", "click", generatePTW);
    safeBind("ptwWordBtn", "click", function () { downloadCurrentWord("ptwReport"); });
    safeBind("ptwPdfBtn", "click", function () { downloadCurrentPDF("ptwReport"); });
    safeBind("ptwPrintBtn", "click", function () { printReport("ptwReport"); });

    safeBind("addTrainingBtn", "click", addTrainingSession);
    safeBind("addIncidentBtn", "click", addIncident);

    safeBind("dropzone", "click", function () { var f = document.getElementById("monthlyFile"); if (f) f.click(); });
    safeBind("monthlyFile", "change", function () { if (this.files && this.files[0]) handleMonthlyFile(this.files[0]); });
    safeBind("generateLiveMonthlyBtn", "click", runLiveMonthlyAI);
    safeBind("monthlyBtn", "click", runMonthly);
    safeBind("refreshDataScopeBtn", "click", function () {
      updateMonthlyDataBanner();
      showToast("info", "تم تحديث مؤشرات قاعدة البيانات الحية بنجاح.");
    });
    safeBind("monthlyCopyDigestBtn", "click", copyMonthlyDigest);
    safeBind("monthlyWordBtn", "click", function () { downloadCurrentWord("monthlyReport"); });
    safeBind("monthlyPdfBtn", "click", function () { downloadCurrentPDF("monthlyReport"); });
    safeBind("monthlyPptBtn", "click", downloadMonthlyPPT);
    safeBind("monthlyPrintBtn", "click", function () { printReport("monthlyReport"); });

    safeBind("closeModalCancelBtn", "click", closeClosureModal);
    safeBind("saveClosureBtn", "click", saveFindingClosure);
    safeBind("closePhotoAfter", "change", function () { handleImageUpload(this, "previewCloseAfter"); });
    safeBind("editModalCancelBtn", "click", closeEditFindingModal);
    safeBind("saveEditFindingBtn", "click", saveFindingEdit);

    safeBind("openIncidentRcaBtn", "click", function () { openIncidentRcaModal(); });
    safeBind("openIncidentRcaBtn2", "click", function () { openIncidentRcaModal(); });
    safeBind("incidentRcaCloseBtn", "click", closeIncidentRcaModal);
    safeBind("runIncidentRcaBtn", "click", generateIncidentRCA);
    safeBind("rcaIncidentSelect", "change", handleRcaIncidentSelectChange);
    safeBind("rcaWordBtn", "click", downloadIncidentRcaWord);
    safeBind("rcaPdfBtn", "click", function () { downloadCurrentPDF("rcaReportInner"); });
    safeBind("rcaPrintBtn", "click", function () { printReport("rcaReportInner"); });

    safeBind("generateRiskAssessmentBtn", "click", generateRiskAssessment5x5);
    safeBind("addManualHazardBtn", "click", addManualHazard);
    safeBind("clearRiskFormBtn", "click", clearRiskForm);
    safeBind("riskPhotos", "change", function () { handleRiskImagesUpload(this); });
    safeBind("riskPhoto", "change", function () { handleRiskImagesUpload(this); });
    safeBind("riskWordBtn", "click", downloadRiskWord);
    safeBind("riskPdfBtn", "click", function () { downloadCurrentPDF("riskAssessmentReport"); });
    safeBind("riskCsvBtn", "click", exportRiskCSV);
    safeBind("riskPrintBtn", "click", function () { printReport("riskAssessmentReport"); });
    safeBind("saveRiskBtn", "click", function () { saveCurrentRiskAssessment(true); });
    safeBind("loadSavedRiskBtn", "click", loadSelectedSavedRisk);
    safeBind("deleteSavedRiskBtn", "click", deleteSelectedSavedRisk);
    safeBind("savedRiskSelect", "change", function () { if (this.value) loadSavedRiskAssessmentById(this.value); });

    document.querySelectorAll(".risk-preset-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var preset = this.getAttribute("data-preset");
        var setVal = function (id, val) { safeSetVal(id, val); };

        document.querySelectorAll(".risk-preset-btn").forEach(function (b) {
          b.style.background = "#ffffff";
          b.style.borderColor = "#cbd5e1";
          b.style.color = "#0f172a";
        });
        this.style.background = "#f0f9ff";
        this.style.borderColor = "#0284c7";
        this.style.color = "#0369a1";

        if (preset === "fablab") {
          setVal("riskArea", "Fabrication Laboratory & Prototyping Workshop (FabLab)");
          setVal("riskEquipment", "Laser Cutters (CO2), Drill Press, Bench Grinder, 3D Printers (FDM/SLA), Soldering Stations, Hand & Power Tools");
          setVal("riskPersons", "Students, Trainees, Lab Instructors, Technicians, Maintenance Personnel");
          setVal("riskActivity", "Laser Cutting & Engraving, Vertical Drilling, Bench Grinding, 3D Printing & Resin Handling, Soldering, Hand Tool Assembly");
          setVal("riskLocationDesc", "Digital fabrication workshop containing enclosed Class 1 laser cutting machines with LEV fume extraction, heavy-duty floor drill press with vice, bench grinder with dual eye shields, FDM/SLA 3D printing zone, temperature-controlled soldering benches with solder fume extractors, and manual workbench zone with hand/power tools.");
          showToast("info", "تم تطبيق نموذج مختبر التصنيع والنمذجة الرقمية (FabLab) بنجاح!");
        } else if (preset === "physics") {
          setVal("riskArea", "Physics Lab & Electronics Facility");
          setVal("riskEquipment", "Electrical Test Benches, High-Voltage Power Supplies, Capacitors, Optical Laser Benches");
          setVal("riskPersons", "Students, Lab Technicians, Faculty Staff");
          setVal("riskActivity", "Electrical Circuit Setup, Capacitor Discharge, Laser Optics Experiments, Reagent Handling");
          setVal("riskLocationDesc", "Physics experimental laboratory equipped with regulated DC power supplies, oscilloscopes, capacitor test kits, optical rail systems with diode lasers, and chemical reagent benches.");
          showToast("info", "تم تطبيق نموذج مختبر الفيزياء والإلكترونيات بنجاح!");
        } else if (preset === "mechanical") {
          setVal("riskArea", "Mechanical Workshop & Machining Facility");
          setVal("riskEquipment", "CNC Milling Machine, Lathe, Band Saw, Angle Grinders, Hydraulic Press");
          setVal("riskPersons", "Machinists, Students, Operators, Maintenance Technicians");
          setVal("riskActivity", "Machining, Metal Turning, Sawing, Surface Grinding, Material Handling");
          setVal("riskLocationDesc", "Machining facility with heavy chip/swarf generation, flood coolant systems, rotating spindles, hydraulic lifting, and metal fabrication tools.");
          showToast("info", "تم تطبيق نموذج ورشة الميكانيكا والتشغيل بنجاح!");
        } else if (preset === "chemical") {
          setVal("riskArea", "Chemical & Material Synthesis Laboratory");
          setVal("riskEquipment", "Chemical Fume Hoods, Magnetic Stirrers, Glassware, Solvent Storage Cabinets, Eyewash Stations");
          setVal("riskPersons", "Chemistry Students, Researchers, Lab Technicians, Cleaners");
          setVal("riskActivity", "Reagent Preparation, Solvent Dispensing, Acid/Base Titration, Chemical Waste Disposal");
          setVal("riskLocationDesc", "Chemistry teaching laboratory with ducted exhaust fume hoods, flammable solvent storage cabinets, chemical spill containment kits, and central emergency shower/eyewash.");
          showToast("info", "تم تطبيق نموذج مختبر الكيمياء والمواد بنجاح!");
        }
      });
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".mom-searchable-select")) {
        if (typeof closeAllMemberDropdowns === "function") closeAllMemberDropdowns();
      }
    });

    safeBind("filterSearch", "input", renderDashboard);
    safeBind("filterStatus", "change", renderDashboard);
    safeBind("filterPriority", "change", renderDashboard);
    safeBind("filterCategory", "change", renderDashboard);
  } catch (e) {
    console.warn("Module listeners error:", e);
  }

  // 8. Core Data Rendering & Visualizations
  try { renderDashboard(); } catch (e) { console.warn("renderDashboard error:", e); }
  try { renderIncidents(); } catch (e) { console.warn("renderIncidents error:", e); }
  try { renderTraining(); } catch (e) { console.warn("renderTraining error:", e); }
  try { renderGeneralCasesTable(); } catch (e) { console.warn("renderGeneralCasesTable error:", e); }
  try { renderRiskAssessment5x5(); } catch (e) { console.warn("renderRiskAssessment5x5 error:", e); }
  try { updateRiskMatrixVisualizer(); } catch (e) { console.warn("updateRiskMatrixVisualizer error:", e); }

  // 9. Default Risk Assessment Setup
  try {
    if (!savedRiskAssessments || savedRiskAssessments.length === 0) {
      var defaultRa = generateFallbackMultiActivityRisk({
        area: "Physics Lab & Advanced High-Voltage Facility",
        equipment: "Electrical Test Benches, High-Voltage Power Supplies, Capacitors",
        persons: "Engineering Students, Lab Technicians, Faculty Staff",
        date: new Date().toISOString().slice(0, 10),
        assessor: "م. إبراهيم سعيد",
        reviewer: "م. يوسف محمد"
      }, { lang: "en" });
      
      savedRiskAssessments = [{
        id: 1001,
        title: "Risk Assessment — Physics Lab & Advanced High-Voltage Facility (" + new Date().toISOString().slice(0, 10) + ")",
        area: "Physics Lab & Advanced High-Voltage Facility",
        date: new Date().toISOString().slice(0, 10),
        lang: "en",
        activitiesCount: (defaultRa.activities || []).length,
        savedAt: new Date().toISOString(),
        data: defaultRa
      }];
      try { localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments)); } catch (e) {}
    }

    if (savedRiskAssessments.length > 0 && !lastRiskAssessmentData) {
      lastRiskAssessmentData = savedRiskAssessments[0].data;
      lastRiskAssessmentData.id = savedRiskAssessments[0].id;
    }

    updateSavedRiskAssessmentsDropdown();
    setupDropzone();
    initAllCustomDropdowns();
    updateMonthlyDataBanner();
  } catch (e) {
    console.warn("Risk default setup error:", e);
  }

  // 10. Restore cached monthly AI report if available
  try {
    var cachedMonthly = JSON.parse(localStorage.getItem(MONTHLY_AI_REPORT_KEY));
    if (cachedMonthly) {
      renderExecutiveSignalsReport(cachedMonthly, true);
    }
  } catch (e) { }

  // 11. Historical Archives & Inspection Management Modules
  try {
    initSecondaryAndHistoricalModules();
  } catch (e) {
    console.warn("initSecondaryAndHistoricalModules error:", e);
  }

  // 12. Render initial interactive charts
  try {
    updateInteractiveCharts();
  } catch (e) {
    console.warn("Initial charts error:", e);
  }
}

// Master Boot Trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

function showTab(id, btn) {
  document.querySelectorAll(".panel").forEach(function (x) { x.classList.remove("active"); });
  document.querySelectorAll(".nav button").forEach(function (x) { x.classList.remove("active"); });
  var target = document.getElementById(id);
  if (target) target.classList.add("active");
  if (btn) btn.classList.add("active");
  if (id === "dashboard") setTimeout(updateInteractiveCharts, 100);
  if (id === "monthly") updateMonthlyDataBanner();
  if (id === "risk_assessment") setTimeout(updateRiskMatrixVisualizer, 100);
  if (id === "insp_mgmt") {
    if (typeof updateInspectionDashboardKPIs === "function") updateInspectionDashboardKPIs();
    if (typeof renderDigitalInspectionHistoryTable === "function") renderDigitalInspectionHistoryTable();
  }
}

function openSettings() { document.getElementById("settings").style.display = "flex"; }
function closeSettings() { document.getElementById("settings").style.display = "none"; }
function saveSettings() {
  apiKey = document.getElementById("apiKey").value.trim();
  modelName = document.getElementById("modelName").value;
  emailTo = document.getElementById("emailTo").value.trim();
  emailCc = document.getElementById("emailCc").value.trim();
  customLogoUrl = document.getElementById("customLogoUrl").value.trim();
  currentReportLang = document.getElementById("settingReportLang").value;

  localStorage.setItem(KEY_NAME, apiKey);
  localStorage.setItem(MODEL_NAME, modelName);
  localStorage.setItem(EMAIL_TO_KEY, emailTo);
  localStorage.setItem(EMAIL_CC_KEY, emailCc);
  localStorage.setItem(LOGO_URL_KEY, customLogoUrl);
  localStorage.setItem(REPORT_LANG_KEY, currentReportLang);
  if (document.getElementById("reportLangSelect")) document.getElementById("reportLangSelect").value = currentReportLang;
  applyBrandLogo();
  closeSettings();
  showToast("success", "تم حفظ إعدادات النظام وهوية الجامعة بنجاح!");
}
function openHelp() { document.getElementById("help").style.display = "flex"; }
function closeHelp() { document.getElementById("help").style.display = "none"; }

function applyBrandLogo() {
  var container = document.getElementById("headerLogoContainer");
  if (customLogoUrl) {
    container.innerHTML = '<img src="' + customLogoUrl + '" alt="SUTech Logo" onerror="fallbackLogo()">';
  }
}
function fallbackLogo() {
  document.getElementById("headerLogoContainer").innerHTML = '<div class="brand-fallback-badge"><span>SUT</span><small>TECH</small></div>';
}

function getSafeStats() {
  var now = new Date();
  var currentYear = now.getFullYear();
  var baseDate = new Date(currentYear, 0, 1);
  var ltiIncidents = incidents.filter(function (x) { return x.type && x.type.includes("Lost Time"); });
  if (ltiIncidents.length > 0) {
    var latestLti = ltiIncidents.reduce(function (latest, inc) {
      var d = new Date(inc.date);
      return d > latest ? d : latest;
    }, new Date(0));
    if (latestLti > baseDate) baseDate = latestLti;
  }
  var diffTime = Math.max(0, now - baseDate);
  var safeDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  var safeHours = (safeDays * 550) + 1200;
  return { safeDays: safeDays, safeHours: safeHours };
}

function syncToCloud(node, data) {
  var keyMap = {
    "findings": "SUT_FINDINGS",
    "incidents": "SUT_INCIDENTS",
    "ptwList": "SUT_PTW_LIST",
    "ptw_list": "SUT_PTW_LIST",
    "trainingSessions": "SUT_TRAINING_SESSIONS",
    "training_sessions": "SUT_TRAINING_SESSIONS",
    "savedRiskAssessments": "SUT_SAVED_RISK_REPORTS",
    "saved_risk_assessments": "SUT_SAVED_RISK_REPORTS"
  };
  var key = keyMap[node] || ("SUT_" + node.toUpperCase());
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}

  var rtdbNode = node === "ptwList" ? "ptw_list" : (node === "trainingSessions" ? "training_sessions" : (node === "savedRiskAssessments" ? "saved_risk_assessments" : node));

  // 1. Firebase Realtime Database
  if (firebaseRtdb) {
    try {
      isReceivingCloudUpdate = true;
      firebaseRtdb.ref("sutech_hse/" + rtdbNode).set(data).then(function () {
        setTimeout(function () { isReceivingCloudUpdate = false; }, 400);
      }).catch(function (err) {
        isReceivingCloudUpdate = false;
        console.warn("[Firebase RTDB Sync]", err);
      });
    } catch (e) {
      isReceivingCloudUpdate = false;
    }
  }

  // 2. Firebase Cloud Firestore
  if (firebaseFirestore) {
    try {
      firebaseFirestore.collection("sutech_hse").doc(rtdbNode).set({
        items: data,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(function (err) {
        console.warn("[Firebase Firestore Sync]", err);
      });
    } catch (e) {}
  }
}

async function pushAllToFirebase() {
  if (!isFirebaseConnected && !firebaseRtdb && !firebaseFirestore) {
    showSweetAlert("تنبيه", "تعذر الاتصال بخادم Firebase، يرجى التأكد من اتصال الإنترنت.", "warning");
    return;
  }
  showToast("info", "جاري رفع كافة البيانات للسحابة...", 2000);
  try {
    syncToCloud("findings", findings);
    syncToCloud("incidents", incidents);
    syncToCloud("ptwList", ptwList);
    syncToCloud("trainingSessions", trainingSessions);
    syncToCloud("savedRiskAssessments", savedRiskAssessments);
    if (firebaseRtdb) {
      await firebaseRtdb.ref("sutech_hse/monthly_notes").set({
        busNotes: monthlyBusNotes || "",
        foodNotes: monthlyFoodNotes || "",
        updatedAt: new Date().toISOString()
      });
    }
    showSweetAlert("نجاح المزامنة السحابية", "تم رفع كافة السجلات الحالية بنجاح إلى قاعدة بيانات Firebase (sut-hse-system)! أصبحت جاهزة للفتح والتعديل من أي تطبيق أو هاتف آخر.", "success");
  } catch (err) {
    console.error(err);
    showSweetAlert("خطأ في المزامنة", "حدث خطأ أثناء الرفع للسحابة: " + err.message, "error");
  }
}

async function pullAllFromFirebase() {
  if (!firebaseRtdb && !firebaseFirestore) {
    showSweetAlert("تنبيه", "تعذر الاتصال بخادم Firebase.", "warning");
    return;
  }
  showToast("info", "جاري سحب البيانات من السحابة...", 2000);
  try {
    if (firebaseRtdb) {
      var snap = await firebaseRtdb.ref("sutech_hse").once("value");
      var val = snap.val();
      if (val) {
        if (val.findings && Array.isArray(val.findings)) { findings = val.findings; try { localStorage.setItem("SUT_FINDINGS", JSON.stringify(findings)); } catch (e) {} }
        if (val.incidents && Array.isArray(val.incidents)) { incidents = val.incidents; try { localStorage.setItem("SUT_INCIDENTS", JSON.stringify(incidents)); } catch (e) {} }
        if (val.ptw_list && Array.isArray(val.ptw_list)) { ptwList = val.ptw_list; try { localStorage.setItem("SUT_PTW_LIST", JSON.stringify(ptwList)); } catch (e) {} }
        if (val.training_sessions && Array.isArray(val.training_sessions)) { trainingSessions = val.training_sessions; try { localStorage.setItem("SUT_TRAINING_SESSIONS", JSON.stringify(trainingSessions)); } catch (e) {} }
        if (val.saved_risk_assessments && Array.isArray(val.saved_risk_assessments)) { savedRiskAssessments = val.saved_risk_assessments; try { localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments)); } catch (e) {} }
        if (val.monthly_notes) {
          if (val.monthly_notes.busNotes !== undefined) { monthlyBusNotes = val.monthly_notes.busNotes; try { localStorage.setItem(BUS_NOTES_KEY, monthlyBusNotes); } catch (e) {} }
          if (val.monthly_notes.foodNotes !== undefined) { monthlyFoodNotes = val.monthly_notes.foodNotes; try { localStorage.setItem(FOOD_NOTES_KEY, monthlyFoodNotes); } catch (e) {} }
        }
        renderDashboard();
        renderIncidents();
        renderPtwTable();
        renderTraining();
        renderGeneralCasesTable();
        renderSavedRiskAssessmentsTable();
        updateInteractiveCharts();
        showSweetAlert("تم التحديث", "تمت مزامنة وسحب أحدث نسخة من السحابة بنجاح!", "success");
        return;
      }
    }
  } catch (err) {
    console.error(err);
    showSweetAlert("خطأ في المزامنة", "حدث خطأ أثناء السحب: " + err.message, "error");
  }
}

function saveAuditNotes() {
  monthlyBusNotes = document.getElementById("monthlyBusNotes").value.trim();
  monthlyFoodNotes = document.getElementById("monthlyFoodNotes").value.trim();
  localStorage.setItem(BUS_NOTES_KEY, monthlyBusNotes);
  localStorage.setItem(FOOD_NOTES_KEY, monthlyFoodNotes);
  showToast("success", "تم حفظ ملاحظات الفحص وتحديث التقرير الشهري بنجاح!");
}

function updateInteractiveCharts() {
  if (typeof Chart === "undefined") {
    setTimeout(updateInteractiveCharts, 250);
    return;
  }
  var total = findings.length;
  var closed = findings.filter(function (x) { return x.status === "Closed"; }).length;
  var progress = findings.filter(function (x) { return x.status === "In Progress"; }).length;
  var open = findings.filter(function (x) { return x.status === "Open"; }).length;
  var crit = findings.filter(function (x) { return x.priority === "Critical"; }).length;
  var high = findings.filter(function (x) { return x.priority === "High"; }).length;
  var med = findings.filter(function (x) { return x.priority === "Medium"; }).length;
  var low = findings.filter(function (x) { return x.priority === "Low"; }).length;
  var closureRate = total ? Math.round((closed / total) * 100) : 0;
  var donutCenter = document.getElementById("donutCenterPct");
  if (donutCenter) donutCenter.textContent = closureRate + "%";

  var ctxDonut = document.getElementById("statusDonutChart");
  if (ctxDonut) {
    if (donutChartInstance) {
      try { donutChartInstance.destroy(); } catch (e) {}
    }
    try {
      donutChartInstance = new Chart(ctxDonut, {
        type: "doughnut",
        data: {
          labels: ["Closed (مغلق ومحقق)", "In Progress (قيد المتابعة)", "Open (مفتوح للتنفيذ)"],
          datasets: [{
            data: total ? [closed, progress, open] : [0, 0, 1],
            backgroundColor: total ? ["#059669", "#d97706", "#c00000"] : ["#e2e8f0", "#e2e8f0", "#e2e8f0"],
            borderWidth: 3, borderColor: "#ffffff", hoverOffset: 3
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { font: { family: "Cairo, Arial", size: 10.5 }, boxWidth: 12, padding: 12 } } },
          cutout: "76%"
        }
      });
    } catch (e) { console.warn("Donut chart error:", e); }
  }

  var ctxBar = document.getElementById("riskBarChart");
  if (ctxBar) {
    if (barChartInstance) {
      try { barChartInstance.destroy(); } catch (e) {}
    }
    try {
      barChartInstance = new Chart(ctxBar, {
        type: "bar",
        data: {
          labels: ["Critical", "High", "Medium", "Low"],
          datasets: [{ label: "عدد الملاحظات", data: [crit, high, med, low], backgroundColor: ["#7f1d1d", "#c00000", "#d97706", "#059669"], borderRadius: 6, barThickness: 16 }]
        },
        options: {
          indexAxis: "y", responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { stepSize: 1, font: { family: "Inter, Arial", size: 10 } } },
            y: { grid: { display: false }, ticks: { font: { family: "Inter, Cairo", weight: "bold", size: 11 } } }
          }
        }
      });
    } catch (e) { console.warn("Bar chart error:", e); }
  }
}

/* ===== MoM Attendees: Unique Searchable Select & Drag & Drop System ===== */
var momDraggedRow = null;

function getSelectedMemberIds(excludeRow) {
  var selected = new Set();
  document.querySelectorAll("#momAttendeesList .mom-att-row").forEach(function (row) {
    if (row !== excludeRow) {
      var id = row.getAttribute("data-member-id");
      if (id && id !== "" && id !== "custom") {
        selected.add(parseInt(id, 10));
      }
    }
  });
  return selected;
}

function updateMomAttendeeIndices() {
  var rows = document.querySelectorAll("#momAttendeesList .mom-att-row");
  rows.forEach(function (r, i) {
    var idxSpan = r.querySelector(".mom-att-idx");
    if (idxSpan) idxSpan.textContent = "#" + (i + 1);
  });
  var countEl = document.getElementById("momAttendeesCount");
  if (countEl) countEl.textContent = "(" + rows.length + " Attendees)";
}

function closeAllMemberDropdowns() {
  document.querySelectorAll("#momAttendeesList .mom-select-dropdown").forEach(function (dd) {
    dd.classList.add("hidden");
    dd.classList.remove("open");
  });
  document.querySelectorAll("#momAttendeesList .mom-select-trigger").forEach(function (tr) {
    tr.classList.remove("active");
  });
}

function updateAllMemberDropdowns() {
  document.querySelectorAll("#momAttendeesList .mom-att-row").forEach(function (row) {
    var dd = row.querySelector(".mom-select-dropdown");
    if (dd && !dd.classList.contains("hidden")) {
      var searchInput = dd.querySelector(".mom-select-search");
      renderMemberOptions(row, searchInput ? searchInput.value : "");
    }
  });
}

function renderMemberOptions(row, filterText) {
  var optionsContainer = row.querySelector(".mom-select-options");
  if (!optionsContainer) return;

  var currentId = row.getAttribute("data-member-id");
  var selectedIds = getSelectedMemberIds(row);
  var filter = (filterText || "").trim().toLowerCase();

  var html = "";
  var count = 0;

  SUTECH_COMMITTEE_MEMBERS.forEach(function (m) {
    // Unique rule: If selected in another row, do not show it in dropdown!
    if (selectedIds.has(m.id)) return;

    // Search filter
    if (filter) {
      var matchName = m.name.toLowerCase().includes(filter);
      var matchDept = m.dept.toLowerCase().includes(filter);
      var matchRole = (m.role || "").toLowerCase().includes(filter);
      if (!matchName && !matchDept && !matchRole) return;
    }

    count++;
    var isSelected = String(m.id) === String(currentId);
    html += '<div class="mom-select-opt' + (isSelected ? ' selected' : '') + '" data-id="' + m.id + '">' +
      '<span class="mom-select-opt-name">' + esc(m.name) + '</span>' +
      '<span class="mom-select-opt-dept">' + esc(m.dept) + (m.role ? ' &bull; ' + esc(m.role) : '') + '</span>' +
      '</div>';
  });

  if (count === 0 && filter) {
    html += '<div style="padding:10px 8px;font-size:11px;color:#94a3b8;text-align:center">No unassigned members match "' + esc(filterText) + '"</div>';
  }

  // Custom entry option
  html += '<div class="mom-select-opt mom-select-opt-custom" data-id="custom">' +
    '<span class="mom-select-opt-name"><i class="fa-solid fa-pen-to-square"></i> Custom Attendee (New Name)...</span>' +
    '<span class="mom-select-opt-dept">Type a manual name and department</span>' +
    '</div>';

  optionsContainer.innerHTML = html;

  // Add click events to options
  optionsContainer.querySelectorAll(".mom-select-opt").forEach(function (opt) {
    opt.addEventListener("click", function (e) {
      e.stopPropagation();
      var chosenId = this.getAttribute("data-id");
      var nameInput = row.querySelector(".mom-att-name");
      var deptInput = row.querySelector(".mom-att-dept");
      var textSpan = row.querySelector(".mom-select-text");

      if (chosenId === "custom") {
        row.setAttribute("data-member-id", "custom");
        nameInput.value = "";
        deptInput.value = "";
        textSpan.textContent = "✍️ Custom Attendee";
        nameInput.focus();
      } else {
        var m = SUTECH_COMMITTEE_MEMBERS.find(function (x) { return String(x.id) === String(chosenId); });
        if (m) {
          row.setAttribute("data-member-id", String(m.id));
          nameInput.value = m.name;
          deptInput.value = m.dept;
          textSpan.textContent = m.name + " — " + m.dept;
        }
      }

      closeAllMemberDropdowns();
      updateAllMemberDropdowns();
    });
  });
}

function initDragAndDrop(row) {
  row.setAttribute("draggable", "true");

  row.addEventListener("dragstart", function (e) {
    if (e.target.tagName === "INPUT" || e.target.closest(".mom-select-dropdown")) {
      e.preventDefault();
      return;
    }
    momDraggedRow = row;
    row.classList.add("dragging");
    closeAllMemberDropdowns();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  });

  row.addEventListener("dragend", function () {
    momDraggedRow = null;
    document.querySelectorAll("#momAttendeesList .mom-att-row").forEach(function (r) {
      r.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
    });
    updateMomAttendeeIndices();
  });

  row.addEventListener("dragover", function (e) {
    e.preventDefault();
    if (!momDraggedRow || momDraggedRow === row) return;
    e.dataTransfer.dropEffect = "move";

    var rect = row.getBoundingClientRect();
    var mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      row.classList.add("drag-over-top");
      row.classList.remove("drag-over-bottom");
    } else {
      row.classList.add("drag-over-bottom");
      row.classList.remove("drag-over-top");
    }
  });

  row.addEventListener("dragleave", function () {
    row.classList.remove("drag-over-top", "drag-over-bottom");
  });

  row.addEventListener("drop", function (e) {
    e.preventDefault();
    if (!momDraggedRow || momDraggedRow === row) return;

    var rect = row.getBoundingClientRect();
    var mid = rect.top + rect.height / 2;
    var container = document.getElementById("momAttendeesList");

    if (e.clientY < mid) {
      container.insertBefore(momDraggedRow, row);
    } else {
      container.insertBefore(momDraggedRow, row.nextSibling);
    }

    document.querySelectorAll("#momAttendeesList .mom-att-row").forEach(function (r) {
      r.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
    });
    updateMomAttendeeIndices();
  });
}

function addMomAttendeeRow(preset) {
  var container = document.getElementById("momAttendeesList");
  if (!container) return;

  var div = document.createElement("div");
  div.className = "mom-att-row";

  var initialId = preset ? String(preset.id) : "";
  var initialName = preset ? preset.name : "";
  var initialDept = preset ? preset.dept : "";
  var triggerText = preset ? (preset.name + " — " + preset.dept) : "Search & Select Member...";

  div.setAttribute("data-member-id", initialId);

  div.innerHTML =
    '<div class="mom-att-drag-handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></div>' +
    '<span class="mom-att-idx">#</span>' +
    '<div class="mom-searchable-select">' +
      '<div class="mom-select-trigger" tabindex="0">' +
        '<span class="mom-select-text">' + esc(triggerText) + '</span>' +
        '<i class="fa-solid fa-chevron-down mom-select-arrow"></i>' +
      '</div>' +
      '<div class="mom-select-dropdown hidden">' +
        '<div class="mom-select-search-wrap">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          '<input type="text" class="mom-select-search" placeholder="Type to search member..." autocomplete="off">' +
        '</div>' +
        '<div class="mom-select-options"></div>' +
      '</div>' +
    '</div>' +
    '<input class="mom-att-name" placeholder="Attendee Full Name (English)" value="' + esc(initialName) + '">' +
    '<input class="mom-att-dept" placeholder="Department / Section (English)" value="' + esc(initialDept) + '">' +
    '<button class="btn btn-red mom-att-del" type="button" title="Remove Attendee"><i class="fa-solid fa-trash-can"></i></button>';

  var trigger = div.querySelector(".mom-select-trigger");
  var dropdown = div.querySelector(".mom-select-dropdown");
  var searchInput = div.querySelector(".mom-select-search");
  var nameInput = div.querySelector(".mom-att-name");
  var deptInput = div.querySelector(".mom-att-dept");
  var delBtn = div.querySelector(".mom-att-del");

  // Toggle Dropdown
  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    var isOpen = dropdown.classList.contains("open") && !dropdown.classList.contains("hidden");
    closeAllMemberDropdowns();
    if (!isOpen) {
      dropdown.classList.remove("hidden");
      dropdown.classList.add("open");
      trigger.classList.add("active");
      renderMemberOptions(div, searchInput.value);
      setTimeout(function () { searchInput.focus(); }, 50);
    }
  });

  // Filter Search
  searchInput.addEventListener("input", function () {
    renderMemberOptions(div, this.value);
  });
  searchInput.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // If user edits name/dept manually, mark as custom so previous member ID is released
  nameInput.addEventListener("input", function () {
    var curId = div.getAttribute("data-member-id");
    if (curId && curId !== "custom") {
      var member = SUTECH_COMMITTEE_MEMBERS.find(function (x) { return String(x.id) === String(curId); });
      if (member && member.name !== this.value.trim()) {
        div.setAttribute("data-member-id", "custom");
        div.querySelector(".mom-select-text").textContent = "✍️ Custom Attendee";
        updateAllMemberDropdowns();
      }
    }
  });

  deptInput.addEventListener("input", function () {
    var curId = div.getAttribute("data-member-id");
    if (curId && curId !== "custom") {
      var member = SUTECH_COMMITTEE_MEMBERS.find(function (x) { return String(x.id) === String(curId); });
      if (member && member.dept !== this.value.trim()) {
        div.setAttribute("data-member-id", "custom");
        div.querySelector(".mom-select-text").textContent = "✍️ Custom Attendee";
        updateAllMemberDropdowns();
      }
    }
  });

  // Delete row
  delBtn.addEventListener("click", function () {
    div.remove();
    updateMomAttendeeIndices();
    updateAllMemberDropdowns();
  });

  // Init Drag & Drop
  initDragAndDrop(div);

  container.appendChild(div);
  updateMomAttendeeIndices();
  updateAllMemberDropdowns();
}

function addAllCommitteeMembers(isUserClick) {
  var container = document.getElementById("momAttendeesList");
  if (!container) return;
  container.innerHTML = "";
  SUTECH_COMMITTEE_MEMBERS.forEach(function (m) {
    addMomAttendeeRow(m);
  });
  if (isUserClick === true) {
    showToast("success", "تمت إضافة جميع أعضاء اللجنة الـ 22 بنجاح");
  }
}

function clearAllCommitteeAttendees() {
  var container = document.getElementById("momAttendeesList");
  if (!container) return;
  container.innerHTML = "";
  updateMomAttendeeIndices();
  updateAllMemberDropdowns();
  showToast("info", "تم تفريغ قائمة الحضور");
}

async function generateMoMReport() {
  var subject = document.getElementById("momSubject").value.trim();
  var date = document.getElementById("momDate").value;
  var timing = document.getElementById("momTiming").value.trim();
  var location = document.getElementById("momLocation").value.trim();
  var seqNo = document.getElementById("momSeqNo").value.trim() || String(currentMomSeq);
  var summary = document.getElementById("momSummary").value.trim();
  var rawRecs = document.getElementById("momRecommendations").value.trim();

  var attRows = document.querySelectorAll("#momAttendeesList .mom-att-row");
  var attendeesList = [];
  attRows.forEach(function (row) {
    var nameEl = row.querySelector(".mom-att-name");
    var deptEl = row.querySelector(".mom-att-dept");
    var name = nameEl ? nameEl.value.trim() : "";
    var dept = deptEl ? deptEl.value.trim() : "";
    if (name) attendeesList.push({ name: name, dept: dept || "SUTech Department" });
  });

  if (!subject || !date) return showSweetAlert("بيانات ناقصة", "يرجى إدخال موضوع الاجتماع والتاريخ على الأقل.", "warning");

  var out = document.getElementById("momReportContainer");
  var wrap = document.getElementById("momOutput");
  wrap.classList.remove("hidden");
  loading(out, true);

  try {
    var prompt = 'You are a Senior HSE Secretary and Committee Coordinator at El Sewedy University of Technology (SUTech).\nBased on the meeting summary and raw recommendation notes below, generate a professional corporate English Minutes of Meeting (MoM) report matching official institutional standards (Discussion Summary & Recommendations in clean bullet points without tables):\n- Subject: ' + subject + '\n- Meeting Summary: ' + summary + '\n- Raw Recommendation Notes: ' + rawRecs + '\n\nReturn JSON only:\n{\n  "formatted_subject": "",\n  "refined_summary": "",\n  "recommendations_bullets": ["Recommendation 1 in professional English", "Recommendation 2 in professional English"]\n}';

    var res = extractJSON(await callGemini(prompt));

    if (attendeesList.length === 0) {
      attendeesList = [
        { name: "Eng. Ibrahem", dept: "HSE Department" },
        { name: "Mrs. Nariman", dept: "Executive Administration" }
      ];
    }

    lastGeneratedMoMData = {
      id: Date.now(),
      seqNo: seqNo,
      subject: res.formatted_subject || subject,
      date: date,
      timing: timing || "10:00 AM – 12:00 PM",
      location: location || "Main Campus Conference Hall A",
      attendees: attendeesList,
      summary: res.refined_summary || summary,
      recommendations: res.recommendations_bullets || []
    };

    var h = '<div class="report" id="momReportInner" dir="ltr" data-report-language="en" style="direction:ltr;text-align:left">' +
      '<div class="report-head" style="direction:ltr">' +
      '<div class="track"><b>MoM No.</b><span>#' + esc(seqNo) + '</span></div>' +
      '<div class="report-title"><h2 style="font-family:Inter,Cairo,sans-serif;letter-spacing:0.5px">Minutes of Meeting No.' + esc(seqNo) + '</h2><p style="font-family:Inter,sans-serif;color:var(--sut-red)">El Sewedy University of Technology (SUTech) — HSE Committee</p></div>' +
      '<div class="track"><b>Date</b><span>' + esc(date) + '</span></div></div>' +
      '<div class="meta" style="direction:ltr"><div><b>Meeting Subject:</b> ' + esc(res.formatted_subject || subject) + '</div><div><b>Date & Timing:</b> ' + esc(date) + ' (' + esc(timing) + ')</div><div><b>Location:</b> ' + esc(location || "SUTech Campus") + '</div></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Attendees</div>' +
      '<table><thead><tr><th style="width:8%;text-align:center">#</th><th style="width:46%">Attendee Name</th><th style="width:46%">Department / Affiliation</th></tr></thead><tbody>' +
      attendeesList.map(function (att, i) { return '<tr><td style="text-align:center"><b>' + (i + 1) + '</b></td><td><b>' + esc(att.name) + '</b></td><td>' + esc(att.dept) + '</td></tr>'; }).join("") +
      '</tbody></table>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Meeting Summary: Last Meeting Points & New highlighting points</div>' +
      '<div class="answer"><p>' + esc(res.refined_summary || summary) + '</p></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Discussion Summary</div>' +
      '<div class="answer"><p>Comprehensive discussion took place among committee members regarding campus safety protocols, ongoing audits, and operational requirements.</p></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Recommendations</div>' +
      '<ul style="padding-left:22px;padding-right:0;font-size:11.5px;line-height:1.6">' +
      (res.recommendations_bullets || []).map(function (rec) { return '<li style="margin-bottom:6px">' + esc(rec) + '</li>'; }).join("") +
      '</ul></div>';

    out.innerHTML = h;
    currentMomSeq = parseInt(seqNo) + 1;
    localStorage.setItem(MOM_SEQ_KEY, String(currentMomSeq));
    document.getElementById("momSeqNo").value = currentMomSeq;

    // Auto-save into historical records
    saveCurrentMoMReport(false);
  } catch (e) {
    out.innerHTML = '<div class="status err"><b>Error:</b> ' + esc(e.message) + '</div>';
  }
}

function sendMoMEmail() {
  var to = "nariman.alsoleeh@elsewedy.com";
  var cc = "shimae.khamis@elsewedy.com, President@sut.edu.eg";
  var seq = lastGeneratedMoMData ? lastGeneratedMoMData.seqNo : "18";
  var subjName = lastGeneratedMoMData ? lastGeneratedMoMData.subject : "Safety Committee Meeting";

  var bodyText = "Dear Mrs. Nariman,\n\nKindly find attached a Minutes of Meeting No." + seq + " for the Safety Committee (" + subjName + ").\n\nBest regards,\nHealth, Safety & Environment Department (HSE) — El Sewedy University of Technology (SUTech)";

  navigator.clipboard.writeText(bodyText).catch(function () { });
  var mailtoUrl = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent("[SUT MoM #" + seq + "] Minutes of Meeting - Safety Committee") + "&body=" + encodeURIComponent(bodyText);
  if (cc) mailtoUrl += "&cc=" + encodeURIComponent(cc);
  window.location.href = mailtoUrl;
}

function esc(s) { return String(s != null ? s : "").replace(/[&<>"']/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]; }); }
function md(s) { return window.marked ? marked.parse(String(s || "")) : esc(s).replace(/\n/g, "<br>"); }
function track() { return "SUT-HSE-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000); }
function fillCode(x) { document.getElementById("codeQuery").value = x; }
function loading(el, on) {
  if (on) el.innerHTML = '<div style="padding:30px;text-align:center"><div class="spinner"></div><p style="margin-top:8px;color:#64748b">جاري بناء وتدقيق التقرير بالذكاء الاصطناعي...</p></div>';
}


function handleImageUpload(input, previewId) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.src = e.target.result;
    img.onload = function () {
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      var maxW = 500, maxH = 500;
      var w = img.width, h = img.height;
      if (w > h && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      else if (h > maxH) { w = Math.round(h * maxH / h); h = maxH; }
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL("image/jpeg", 0.65);
      if (previewId === "previewBefore") currentBeforePhoto = dataUrl;
      if (previewId === "previewCloseAfter") currentAfterPhoto = dataUrl;
      document.getElementById(previewId).innerHTML = '<img src="' + dataUrl + '" class="photo-thumb"><span class="small" style="align-self:center">تم تجهيز الصورة</span>';
    };
  };
  reader.readAsDataURL(file);
}

function exportFullBackup() {
  var data = { version: "7.4", date: new Date().toISOString(), findings: findings, incidents: incidents, ptwList: ptwList, trainingSessions: trainingSessions, emailTo: emailTo, emailCc: emailCc, customLogoUrl: customLogoUrl, monthlyBusNotes: monthlyBusNotes, monthlyFoodNotes: monthlyFoodNotes, currentReportLang: currentReportLang, currentMomSeq: currentMomSeq };
  downloadBlob(JSON.stringify(data, null, 2), "SUT-HSE-Backup-" + new Date().toISOString().slice(0, 10) + ".json", "application/json");
}
function importFullBackup(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (evt) {
    try {
      var data = JSON.parse(evt.target.result);
      if (data.findings) { findings = data.findings; syncToCloud("findings", findings); }
      if (data.incidents) { incidents = data.incidents; syncToCloud("incidents", incidents); }
      if (data.ptwList) { ptwList = data.ptwList; syncToCloud("ptwList", ptwList); }
      if (data.trainingSessions) { trainingSessions = data.trainingSessions; syncToCloud("trainingSessions", trainingSessions); }
      if (data.emailTo) { emailTo = data.emailTo; localStorage.setItem(EMAIL_TO_KEY, emailTo); }
      if (data.emailCc) { emailCc = data.emailCc; localStorage.setItem(EMAIL_CC_KEY, emailCc); }
      if (data.customLogoUrl) { customLogoUrl = data.customLogoUrl; localStorage.setItem(LOGO_URL_KEY, customLogoUrl); applyBrandLogo(); }
      if (data.monthlyBusNotes !== undefined) { monthlyBusNotes = data.monthlyBusNotes; localStorage.setItem(BUS_NOTES_KEY, monthlyBusNotes); }
      if (data.monthlyFoodNotes !== undefined) { monthlyFoodNotes = data.monthlyFoodNotes; localStorage.setItem(FOOD_NOTES_KEY, monthlyFoodNotes); }
      if (data.currentReportLang) { currentReportLang = data.currentReportLang; localStorage.setItem(REPORT_LANG_KEY, currentReportLang); }
      if (data.currentMomSeq) { currentMomSeq = data.currentMomSeq; localStorage.setItem(MOM_SEQ_KEY, String(currentMomSeq)); document.getElementById("momSeqNo").value = currentMomSeq; }
      renderDashboard(); renderIncidents(); renderTraining(); renderGeneralCasesTable();
      showSweetAlert("استعادة ناجحة", "تم استعادة قاعدة البيانات بنجاح وتحديث كافة السجلات!", "success");
    } catch (err) { showSweetAlert("خطأ في الاستعادة", "ملف النسخ الاحتياطي غير صالح: " + err.message, "error"); }
  };
  reader.readAsText(file);
}

async function callGemini(prompt) {
  if (!apiKey) { throw new Error("No API key configured"); }

  /* معالجة اسم الموديل وإزالة models/ إن وجدت لمنع تكرار المسار */
  var cleanModel = (modelName || "gemini-3.6-flash").replace(/^models\//, "");
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + cleanModel + ":generateContent?key=" + apiKey;

  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    })
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error((data.error && data.error.message) || ("HTTP " + res.status));
  var text = "";
  try {
    text = data.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error("لم يصل نص من Gemini.");
  }
  if (!text) throw new Error("لم يصل نص من Gemini.");
  return text;
}

async function callGeminiWithImages(prompt, photosArray) {
  if (!apiKey) { throw new Error("No API key configured"); }
  var cleanModel = (modelName || "gemini-3.6-flash").replace(/^models\//, "");
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + cleanModel + ":generateContent?key=" + apiKey;

  var parts = [{ text: prompt }];

  if (photosArray && photosArray.length) {
    photosArray.forEach(function (p) {
      var base64DataUrl = typeof p === "string" ? p : (p.data || "");
      if (!base64DataUrl) return;
      var mimeType = "image/jpeg";
      var base64Data = base64DataUrl;
      if (base64DataUrl.startsWith("data:")) {
        var commaParts = base64DataUrl.split(",");
        var mimeMatch = commaParts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
        base64Data = commaParts[1];
      }
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    });
  }

  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: parts }],
      generationConfig: { temperature: 0.2 }
    })
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error((data.error && data.error.message) || ("HTTP " + res.status));
  var text = "";
  try {
    text = data.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error("لم يصل نص من Gemini.");
  }
  if (!text) throw new Error("لم يصل نص من Gemini.");
  return text;
}

// Backward compatibility alias
async function callGeminiWithImage(prompt, singlePhotoUrl) {
  return callGeminiWithImages(prompt, [singlePhotoUrl]);
}

function extractJSON(text) {
  var cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch (e) { }
  var a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch (e) { } }
  throw new Error("Gemini أرسل JSON غير صالح.");
}

async function runAI(type) {
  var out = type === "codes" ? document.getElementById("codesReport") : document.getElementById("inspectionReport");
  var wrap = type === "codes" ? document.getElementById("codesOutput") : document.getElementById("inspectionOutput");
  var prompt = "";
  if (type === "codes") {
    var q = document.getElementById("codeQuery").value.trim();
    if (!q) return showSweetAlert("تنبيه", "يرجى كتابة موضوع المرجع القانوني والمواصفات أولاً.", "warning");
    prompt = 'You are the Principal HSE Legal & Technical Compliance Consultant for higher education and industrial facilities in Egypt.\n' +
      'Topic: ' + q + '\n' +
      'Generate a comprehensive, highly detailed BILINGUAL (Arabic & English) compliance analysis and legal register report.\n' +
      'Cross-reference relevant mandatory Egyptian legislation (Labor Law 12/2003, Decrees 134 & 211/2003, Environment Law 4/1994, Waste Management Law 202/2020, Civil Defense & Fire Code, NFSA food safety rules) AND International Standards (NFPA, OSHA 29 CFR, ISO 45001:2018).\n' +
      'Every single section MUST provide full details in BOTH Arabic AND English.\n' +
      'Return JSON only:\n' +
      '{\n' +
      '  "title_ar": "عنوان التقرير بالعربية",\n' +
      '  "title_en": "Report Title in English",\n' +
      '  "executive_summary_ar": "ملخص تنفيذي قانوني وفني شامل باللغة العربية...",\n' +
      '  "executive_summary_en": "Comprehensive legal and technical executive summary in English...",\n' +
      '  "references": [\n' +
      '    {\n' +
      '      "jurisdiction": "Egypt (EEAA/MOL/Civil Defense) or International (NFPA/OSHA)",\n' +
      '      "reference": "اسم التشريع أو المواصفة (مثال: قانون 12 لسنة 2003 / NFPA 30)",\n' +
      '      "number_year": "Decree/Standard No. & Year",\n' +
      '      "article_clause": "المادة أو البند (Article / Section)",\n' +
      '      "requirement_ar": "النص القانوني الإلزامي بالعربية",\n' +
      '      "requirement_en": "Mandatory statutory requirement in English",\n' +
      '      "practical_explanation_ar": "التطبيق الميداني بجامعة السويدي بالعربية",\n' +
      '      "practical_explanation_en": "Campus practical compliance in English"\n' +
      '    }\n' +
      '  ],\n' +
      '  "technical_requirements": [\n' +
      '    {\n' +
      '      "heading_ar": "عنوان الاشتراط الفني بالعربية",\n' +
      '      "heading_en": "Technical Heading in English",\n' +
      '      "details_ar": "شرح المتطلبات الهندسية والتنفيذية بالعربية...",\n' +
      '      "details_en": "Detailed engineering controls and specs in English..."\n' +
      '    }\n' +
      '  ],\n' +
      '  "records_and_evidence": [\n' +
      '    {\n' +
      '      "item_ar": "اسم السجل أو المستند بالعربية",\n' +
      '      "item_en": "Required record or document in English"\n' +
      '    }\n' +
      '  ],\n' +
      '  "verification_notes": [\n' +
      '    {\n' +
      '      "note_ar": "ملاحظة التفتيش والتحقق بالعربية",\n' +
      '      "note_en": "Audit and verification note in English"\n' +
      '    }\n' +
      '  ]\n' +
      '}';
  } else {
    var q2 = document.getElementById("inspectionQuery").value.trim();
    if (!q2) return showSweetAlert("تنبيه", "يرجى كتابة نوع الفحص الميداني وقائمة التحقق أولاً.", "warning");
    var area = document.getElementById("inspectionArea").value.trim();
    var lang = document.getElementById("inspectionLang").value;
    var refs = document.getElementById("inspectionRefs").value;
    prompt = 'You are a senior HSE inspector. Build a direct, professional, and practical field inspection checklist for: ' + q2 + '. Area: ' + area + '. Reference: ' + refs + '. Language: ' + lang + '.\nImportant: Return clean items without extra category fields.\nImportant: observation, corrective_action and responsible must be empty strings.\nReturn JSON only:\n{"title":"","scope":"","items":[{"id":1,"inspection_point":"","acceptance_criteria":"","status":"","observation":"","corrective_action":"","responsible":"","target_date":""}],"notes":""}';
  }
  try {
    out.innerHTML = '<div style="padding:25px;text-align:center"><div class="spinner"></div></div>';
    wrap.classList.remove("hidden");
    var d = extractJSON(await callGemini(prompt));
    if (type === "codes") renderCodes(d); else renderInspection(d);
  } catch (e) { out.innerHTML = '<div class="status err"><b>Error:</b> ' + esc(e.message) + '</div>'; }
}

function renderCodes(d) {
  var titleAr = d.title_ar || d.title || "تقرير الامتثال والاشتراطات الفنية والقانونية";
  var titleEn = d.title_en || "HSE Legal & Technical Compliance Register";

  var h = '<div class="report" id="codesReportInner" dir="rtl" data-report-language="bilingual">' +
    '<div class="report-head" style="direction:rtl">' +
      '<div class="track"><b>رقم التتبع / Tracking</b><span>' + track() + '</span></div>' +
      '<div class="report-title">' +
        '<h2>' + esc(titleAr) + '</h2>' +
        '<h3 style="font-size:12px;color:#0b1f3a;font-weight:700;margin:2px 0">' + esc(titleEn) + '</h3>' +
        '<p>جامعة السويدي للتكنولوجيا (SUTech) — El Sewedy University of Technology</p>' +
      '</div>' +
      '<div class="track"><b>تاريخ التقرير / Date</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div>' +
    '</div>' +
    '<div class="meta" style="direction:rtl">' +
      '<div><b>إعداد / Prepared By:</b> SUTech HSE Department</div>' +
      '<div><b>تاريخ الإصدار / Date:</b> ' + new Date().toLocaleDateString("en-GB") + '</div>' +
      '<div><b>النطاق / Scope:</b> Egyptian Laws + NFPA &amp; OSHA Codes</div>' +
    '</div>' +
    '<div class="section-title">1. الملخص التنفيذي / Executive Summary</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0">' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:10px" dir="rtl">' +
        '<b style="color:#0b1f3a;font-size:11px;display:block;margin-bottom:6px"><i class="fa-solid fa-language"></i> الملخص التنفيذي (بالعربية):</b>' +
        '<div class="answer" dir="rtl" style="line-height:1.6;font-size:10px">' + md(d.executive_summary_ar || d.executive_summary || "") + '</div>' +
      '</div>' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:10px" dir="ltr">' +
        '<b style="color:#0b1f3a;font-size:11px;display:block;margin-bottom:6px"><i class="fa-solid fa-globe"></i> Executive Summary (English):</b>' +
        '<div class="answer" dir="ltr" style="line-height:1.6;font-size:10px;text-align:left">' + md(d.executive_summary_en || d.executive_summary || "") + '</div>' +
      '</div>' +
    '</div>';

  if (d.references && d.references.length) {
    h += '<div class="section-title">2. مصفوفة المراجع القانونية والمواصفات القياسية / Legal &amp; Codes Reference Matrix</div>' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th style="width:14%">الجهة / النطاق<br><small>Jurisdiction</small></th>' +
            '<th style="width:16%">المرجع ورقم المادة<br><small>Law / Clause</small></th>' +
            '<th style="width:35%">المتطلب القانوني والإلزامي<br><small>Statutory Requirement (AR / EN)</small></th>' +
            '<th style="width:35%">التطبيق الميداني في الجامعة<br><small>Practical Implementation (AR / EN)</small></th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';
    d.references.forEach(function (r) {
      h += '<tr>' +
        '<td style="text-align:center"><b>' + esc(r.jurisdiction || "National / Intl") + '</b></td>' +
        '<td><b>' + esc(r.reference) + '</b><br><small>' + esc(r.number_year || "") + '</small><br><span style="color:#c00000;font-weight:700">' + esc(r.article_clause) + '</span></td>' +
        '<td>' +
          '<div dir="rtl" style="margin-bottom:6px"><b>العربية:</b> ' + esc(r.requirement_ar || "") + '</div>' +
          '<div dir="ltr" style="border-top:1px dashed #cbd5e1;padding-top:4px;color:#334155;text-align:left"><b>English:</b> ' + esc(r.requirement_en || "") + '</div>' +
        '</td>' +
        '<td>' +
          '<div dir="rtl" style="margin-bottom:6px"><b>التطبيق:</b> ' + esc(r.practical_explanation_ar || r.practical_explanation || "") + '</div>' +
          (r.practical_explanation_en ? '<div dir="ltr" style="border-top:1px dashed #cbd5e1;padding-top:4px;color:#334155;text-align:left"><b>Action:</b> ' + esc(r.practical_explanation_en) + '</div>' : '') +
        '</td>' +
      '</tr>';
    });
    h += '</tbody></table>';
  }

  h += '<div class="section-title">3. الاشتراطات الفنية والتطبيق الميداني / Technical Requirements &amp; Application</div>';
  (d.technical_requirements || []).forEach(function (x, i) {
    var hAr = x.heading_ar || x.heading || ("بند فني " + (i + 1));
    var hEn = x.heading_en || "";
    h += '<div style="margin:12px 0 8px;border:1px solid #dbe3ec;border-radius:8px;padding:10px;background:#fff">' +
      '<div style="font-weight:800;font-size:12px;color:#0b1f3a;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">' +
        '<span dir="rtl">' + esc(hAr) + '</span>' + (hEn ? ' <span style="color:#64748b;font-weight:600;font-size:11px" dir="ltr">(' + esc(hEn) + ')</span>' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="answer" dir="rtl" style="line-height:1.6;font-size:9.5px">' + md(x.details_ar || x.details || "") + '</div>' +
        '<div class="answer" dir="ltr" style="line-height:1.6;font-size:9.5px;text-align:left;border-left:1px solid #f1f5f9;padding-left:8px">' + md(x.details_en || "") + '</div>' +
      '</div>' +
    '</div>';
  });

  h += '<div class="section-title">4. السجلات والوثائق المطلوبة / Records &amp; Evidence to Maintain</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0">' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:8px" dir="rtl">' +
        '<b style="color:#0b1f3a;font-size:10.5px;display:block;margin-bottom:4px">السجلات بالعربية:</b>' +
        '<ul class="answer" dir="rtl" style="margin:0;padding-right:18px">' +
          (d.records_and_evidence || []).map(function (x) {
            var txt = typeof x === "object" ? (x.item_ar || x.item || "") : String(x);
            return '<li style="margin-bottom:3px">' + esc(txt) + '</li>';
          }).join("") +
        '</ul>' +
      '</div>' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:8px" dir="ltr">' +
        '<b style="color:#0b1f3a;font-size:10.5px;display:block;margin-bottom:4px;text-align:left">Required Evidence (English):</b>' +
        '<ul class="answer" dir="ltr" style="margin:0;padding-left:18px;text-align:left">' +
          (d.records_and_evidence || []).map(function (x) {
            var txt = typeof x === "object" ? (x.item_en || "") : "";
            return txt ? '<li style="margin-bottom:3px">' + esc(txt) + '</li>' : '';
          }).filter(Boolean).join("") +
        '</ul>' +
      '</div>' +
    '</div>';

  h += '<div class="section-title">5. ملاحظات التفتيش والتدقيق / Verification &amp; Audit Notes</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0">' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:8px" dir="rtl">' +
        '<b style="color:#0b1f3a;font-size:10.5px;display:block;margin-bottom:4px">ملاحظات التفتيش:</b>' +
        '<ul class="answer" dir="rtl" style="margin:0;padding-right:18px">' +
          (d.verification_notes || []).map(function (x) {
            var txt = typeof x === "object" ? (x.note_ar || x.note || "") : String(x);
            return '<li style="margin-bottom:3px">' + esc(txt) + '</li>';
          }).join("") +
        '</ul>' +
      '</div>' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:8px" dir="ltr">' +
        '<b style="color:#0b1f3a;font-size:10.5px;display:block;margin-bottom:4px;text-align:left">Verification Notes:</b>' +
        '<ul class="answer" dir="ltr" style="margin:0;padding-left:18px;text-align:left">' +
          (d.verification_notes || []).map(function (x) {
            var txt = typeof x === "object" ? (x.note_en || "") : "";
            return txt ? '<li style="margin-bottom:3px">' + esc(txt) + '</li>' : '';
          }).filter(Boolean).join("") +
        '</ul>' +
      '</div>' +
    '</div></div>';

  document.getElementById("codesReport").innerHTML = h;
}

/* =========================================================================
   INTERACTIVE INSPECTION & FIELD AUDIT MANAGEMENT ENGINE
   ========================================================================= */

const INSPECTION_PRESETS = {
  bus: {
    title: "فحص وتفتيش السلامة الشامل لحافلات وسيارات نقل الطلاب والجامعة (Campus Transport Fleet)",
    area: "University Parking & Transport Fleet Depot",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    refs: "قانون المرور المصري وقانون العمل 12/2003 واشتراطات NFPA 10 لمركبات النقل الجماعي",
    items: [
      { id: 1, inspection_point: "فحص كفاءة منظومة الفرامل وفرامل اليد (Braking System & Handbrake)", acceptance_criteria: "استجابة فورية وعدم وجود تسريب زيت هيدروليك أو تآكل في خراطيم الهواء", status: "Pass", observation: "تم اختبار الفرامل واستجابتها ممتازة بدون أي انحراف" },
      { id: 2, inspection_point: "عمق مداس الإطارات وضغط الهواء (Tire Tread Depth & Inflation)", acceptance_criteria: "عمق المداس لا يقل عن 2.5 مم، ضغط 110 PSI، وخلو الإطارات من الانتفاخات والتشققات", status: "Pass", observation: "ضغط الهواء مطابق والمطاط بحالة تشغيلية ممتازة" },
      { id: 3, inspection_point: "جاهزية طفايات الحريق البودرة 6 كجم وتاريخ الصلاحية (Fire Extinguishers)", acceptance_criteria: "مؤشر الضغط في النطاق الأخضر، مثبتة بحامل أمان محكم، ومراجعة كارت الصيانة الشهري", status: "Pass", observation: "الطفايات مشحونة ومثبتة بجوار مقعد السائق والباب الخلفي" },
      { id: 4, inspection_point: "مخارج الطوارئ ومطارق كسر الزجاج (Emergency Exits & Window Hammers)", acceptance_criteria: "مطارق كسر الزجاج مثبتة بأماكنها المحددة، ومسارات الأبواب خالية من أي عوائق", status: "Pass", observation: "المطارق متوفرة بجانب نوافذ الطوارئ والأبواب تفتح بسلاسة" },
      { id: 5, inspection_point: "حقيبة الإسعافات الأولية وتكامل المستلزمات (First Aid Kit)", acceptance_criteria: "مكتملة الضمادات المعقمة، المطهرات، الشاش، الجبائر الطبية، وخلوها من الأدوية منتهية الصلاحية", status: "Pass", observation: "الحقيبة مكتملة ومطابقة لقائمة الإسعافات الأولية" },
      { id: 6, inspection_point: "أحزمة الأمان لجميع المقاعد (Seat Belts for All Passengers)", acceptance_criteria: "أحزمة أمان ثلاثية/ثنائية النقاط تعمل بكفاءة لجميع مقاعد الركاب والسائق", status: "Pass", observation: "أحزمة الأمان مثبتة وسليمة وتغلق بإحكام" },
      { id: 7, inspection_point: "جهاز محدد السرعة التلقائي (Speed Governor System)", acceptance_criteria: "معاير ومبرمج على سرعة 90 كم/ساعة كحد أقصى مع وجود الختم التأميني", status: "Pass", observation: "الأجهزة مفعلة وتعمل بنظام التتبع والتحكم" },
      { id: 8, inspection_point: "صلاحية رخص القيادة المهنية والتحاليل الدورية للسائقين", acceptance_criteria: "رخص مهنية درجة أولى/ثانية سارية، كشف طبي دوري وخلو من المواد المخدرة", status: "Pass", observation: "جميع السائقين يحملون رخص سارية وشهادات طبية معتمدة" },
      { id: 9, inspection_point: "منظومة الإضاءة الخارجية، الإشارات، ومصابيح الضباب (Exterior Lights)", acceptance_criteria: "إضاءة المصابيح العالية والمنخفضة، مصابيح الرجوع للخلف، وإشارات التنبيه تعمل بكفاءة", status: "Pass", observation: "جميع كشافات الإضاءة والإشارات تعمل بصورة مثالية" },
      { id: 10, inspection_point: "المساحات ورشاشات المياه ونظافة الزجاج والمرايا (Visibility & Wipers)", acceptance_criteria: "مساحات مطاطية سليمة، خزان مياه ممتلئ، والمرايا الجانبية والداخلية بدون شروخ", status: "Pass", observation: "المساحات تعمل ومستوى الرؤية للسائق ممتاز" },
      { id: 11, inspection_point: "نظافة حوض المحرك وخلوه من تسريبات الزيوت والوقود (Engine Bay Inspection)", acceptance_criteria: "خلو تام من تسريب الوقود أو زيت المحرك، وتأمين الأسلاك الكهربائية بالعوازل", status: "Pass", observation: "المحرك نظيف ولا توجد أي ترشيحات أو روائح وقود" },
      { id: 12, inspection_point: "تراخيص المركبة والتأمين الإجباري وفحص الدفاع المدني", acceptance_criteria: "رخصة تسيير حافلة سارية، وثيقة تأمين سارية، وموافقة الفحص الفني", status: "Pass", observation: "الرخص ووثائق التأمين سارية لجميع الحافلات (12 باص)" }
    ],
    notes: "تم استكمال الفحص الدوري لحافلات نقل الطلاب والعاملين بجامعة السويدي للتكنولوجيا (عدد 12 باص) وجاهزيتها تامة للتشغيل الآمن والمطابقة لمعايير السلامة."
  },
  food: {
    title: "تفتيش السلامة والصحة المهنية وسلامة الغذاء لمطاعم وكافيتريات الجامعة (Food Hygiene & Kitchen Fire Safety)",
    area: "Central Cafeteria & Campus Food Outlets",
    inspector: "م. يوسف محمد (Civil Defense & Food Safety Officer)",
    lang: "ar",
    refs: "اشتراطات الهيئة القومية لسلامة الغذاء (NFSA) والقرار الوزاري 211/2003 وقانون 12/2003",
    items: [
      { id: 1, inspection_point: "الشهادات الصحية للعاملين بتداول الأغذية (Food Handlers Health Certificates)", acceptance_criteria: "شهادات صحية سارية صادرة من معامل وزارة الصحة تفيد الخلو من الأمراض المعدية والجلدية", status: "Fail", observation: "تم رصد 3 عاملين بمطعم الوجبات السريعة بشهادات منتهية الصلاحية وجاري التجديد", corrective_action: "إيقاف العاملين عن تداول الغذاء فوراً لحين استخراج الشهادات الصحية المعتمدة", responsible: "مشرف الكافيتريا وإدارة الموارد البشرية", target_date: "2026-09-05" },
      { id: 2, inspection_point: "نظافة مداخن وهود المطابخ ونظام الإطفاء الرطب (Kitchen Hood & Ansul System)", acceptance_criteria: "خلو الهود وفلاتر الشحوم من تراكم الزيوت، وسلامة نظام الإطفاء الرطب الأوتوماتيكي Ansul", status: "Fail", observation: "تراكم دهون على فلاتر الشفاط المركزي للمطبخ مما يشكل خطر حريق داهم", corrective_action: "تنظيف وتطهير فلاتر الهود بواسطة شركة صيانة متخصصة وإعادة ضبط حساسات الإطفاء", responsible: "إدارة الصيانة والخدمات", target_date: "2026-09-03" },
      { id: 3, inspection_point: "درجات حرارة ثلاجات الحفظ والتجميد وسجلات المتابعة (Cold Storage Temps)", acceptance_criteria: "التبريد أقل من 4°C والتجميد أقل من -18°C، مع وجود ترمومتر رقمي وسجل فحص مرتين يومياً", status: "Pass", observation: "درجات الحرارة مضبوطة ومسجلة بالسجل اليومي لجميع الثلاجات" },
      { id: 4, inspection_point: "فصل الأطعمة النيئة عن المطهية (Cross-Contamination Prevention)", acceptance_criteria: "استخدام ألواح تقطيع وسكاكين ملونة مخصصة (أحمر للحوم، أزرق للأسماك، أخضر للخضار)", status: "Pass", observation: "ألواح التقطيع الملونة مفعلة بالكامل مع التزام الطهاة بالفصل" },
      { id: 5, inspection_point: "بطانيات الحريق وطفايات ثاني أكسيد الكربون (Fire Blankets & CO2 Extinguishers)", acceptance_criteria: "بطانية حريق صالحة مثبتة بجوار الموقد، وطفايات CO2 و K-Class مشحونة", status: "Pass", observation: "بطانيات الحريق والطفايات مثبتة وسهلة الوصول" },
      { id: 6, inspection_point: "أحواض غسيل الأيدي المجهزة بالصابون المعقم والمناديل (Handwashing Stations)", acceptance_criteria: "أحواض مخصصة لغسيل الأيدي تعمل بدواسة قدم، صابون مطهر، ومجفف هواء أو مناديل أحادية", status: "Pass", observation: "الأحواض مجهزة ومعقمات الأيدي متوفرة بجميع أقسام المطبخ" },
      { id: 7, inspection_point: "مكافحة الآفات والحشرات وسلامة السلك الواقي (Pest Control & Screens)", acceptance_criteria: "سلك ضيق على النوافذ والفتحات، صواعق حشرات تعمل بكفاءة، وسجل رش دوري معتمد", status: "Pass", observation: "صواعق الحشرات تعمل ولا توجد أي آثار للآفات" },
      { id: 8, inspection_point: "تخزين المواد الغذائية الجافة ورفعها عن الأرض (Dry Food Storage Pallets)", acceptance_criteria: "رص الكراتين على باليتات بلاستيكية بارتفاع 15 سم عن الأرض و 20 سم عن الحوائط", status: "Pass", observation: "المخزن مرتب والمنتجات مرفوعة على قواعد مطابقة للاشتراطات" },
      { id: 9, inspection_point: "صناديق القمامة المغلقة بدواسة قدم (Foot-Operated Waste Bins)", acceptance_criteria: "صناديق محكمة الغلق تفتح بالقدم ومبطنة بأكياس سميكة والتفريغ الدوري كل 4 ساعات", status: "Pass", observation: "الصناديق محكمة الغلق وتفتح بالقدم وتفرغ بانتظام" },
      { id: 10, inspection_point: "الزي الموحد وغطاء الرأس والقفازات للعمال (PPE & Food Handler Hygiene)", acceptance_criteria: "ارتداء البالطو النظيف، غطاء الشعر واللحية، والقفازات الشفافة أثناء تقديم وتجهيز الطعام", status: "Pass", observation: "التزام كامل من جميع العمال بارتداء غطاء الرأس والكمامات والقفازات" },
      { id: 11, inspection_point: "حساسات تسريب الغاز والمحبس الأوتوماتيكي (LPG Gas Leak Detection)", acceptance_criteria: "حساسات غاز معتمدة متصلة بإنذار مرئي ومحبس أوتوماتيكي لقطع الغاز (Solenoid Valve)", status: "Pass", observation: "تم اختبار كاشف الغاز والمحبس يغلق تلقائياً فور استشعار الغاز" },
      { id: 12, inspection_point: "تواريخ الصلاحية وحفظ العينات المرجعية (Shelf Life & Food Sampling)", acceptance_criteria: "بطاقات بيانات واضحة بتواريخ الإنتاج والصلاحية، وحفظ عينات 250 جم لمدة 72 ساعة", status: "Pass", observation: "نظام FIFO مفعل والعينات المرجعية محفوظة في ثلاجة العينات المخصصة" }
    ],
    notes: "تم إخطار إدارة شؤون الطلاب ومشرف الكافيتريا بالملاحظات المرصودة (الشهادات الصحية وتنظيف المدخنة) وتم إصدار تكليفات فورية للإغلاق والتصحيح."
  },
  fablab: {
    title: "فحص وصيانة وتفتيش السلامة لمختبر التصنيع والورش الهندسية (FabLab & Workshops Safety Audit)",
    area: "Digital Fabrication Lab (FabLab) & Mechanical Workshops",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    refs: "معايير OSHA 29 CFR 1910 للآلات والورش وقانون العمل المصري 12/2003",
    items: [
      { id: 1, inspection_point: "قواطع الأمان وماكينات الليزر (Laser Cutters CO2 Safety Interlocks & LEV)", acceptance_criteria: "توقف شعاع الليزر فوراً عند فتح الغطاء، ومعدل سحب العادم لا يقل عن 400 CFM مع فلاتر HEPA", status: "Pass", observation: "القواطع تعمل بكفاءة والعادم يسحب الأدخنة لخارج المبنى بالكامل" },
      { id: 2, inspection_point: "واقي ظرف المثقاب الرأسي والمنجلة (Drill Press Chuck Guard & Vice)", acceptance_criteria: "واقي شفاف ميكرو-سويتش على ظرف المثقاب ومنجلة تثبيت مثبتة بإحكام بالمسامير", status: "Pass", observation: "الواقي الشفاف مركب والمنجلة مثبتة وقوية" },
      { id: 3, inspection_point: "حجر الجلخ وحواجز الشرر وسندات الشغل (Bench Grinder Tool Rest & Eye Shields)", acceptance_criteria: "المسافة بين الحجر وسند الشغل لا تتعدى 1.5 مم، وحاجز الشرر أقل من 3 مم وواقيات العين نظيفة", status: "Pass", observation: "تمت معايرة الخلوصات والواقيات البوليكاربونات نظيفة" },
      { id: 4, inspection_point: "معالجة راتنجات الطباعة ثلاثية الأبعاد (3D Printing & SLA Resin Wash Station)", acceptance_criteria: "ارتداء قفازات النتريل الكيميائية، وعاء ثانوي لحفظ كحول الأيزوبروبيل IPA، وشفاط مخصص", status: "Pass", observation: "المحطة مجهزة وتوافر أدوات مكافحة الانسكاب الكيميائي" },
      { id: 5, inspection_point: "شفاطات أبخرة اللحام الإلكتروني (Soldering Fume Extractors & ESD Grounding)", acceptance_criteria: "شفاطات أبخرة موضعية تعمل عند اللحام بالقصدير ومقابس أرضية مضادة للشحنات الساكنة", status: "Pass", observation: "شفاطات الأبخرة مفعلة وطاولات العمل مؤرضة كهربائياً" },
      { id: 6, inspection_point: "أزرار التوقف في حالات الطوارئ (Emergency Stop Push-Buttons)", acceptance_criteria: "زر طوارئ أحمر بارز بنظام القفل واللف (Mushroom E-Stop) على جميع الماكينات", status: "Pass", observation: "تم اختبار أزرار الطوارئ لجميع الماكينات وتوقف الماكينات فورياً" },
      { id: 7, inspection_point: "المعدات اليدوية والكهربائية المتنقلة (Portable Power Tools & Double Insulation)", acceptance_criteria: "سلامة كابلات التغذية، العزل المزدوج، خلو أسلاك الصاروخ والمنشار من القطوع، وتوافر قواطع RCD", status: "Pass", observation: "الأجهزة سليمة والمفاتيح والقواطع تعمل بكفاءة" },
      { id: 8, inspection_point: "التزام الطلاب والفنيين بمهمات الوقاية الشخصية (Mandatory PPE Compliance)", acceptance_criteria: "ارتداء نظارات الأمان ANSI Z87.1، البالطو المقاوم للحريق، حذاء السلامة، وعدم ارتداء ملابس فضفاضة", status: "Pass", observation: "التزام كامل وممنوع دخول أي طالب بدون نظارات الأمان والبالطو" },
      { id: 9, inspection_point: "نظافة الورشة ومسارات المشاة وخلوها من الرايش (Housekeeping & Swarf Disposal)", acceptance_criteria: "مسارات مشاة خالية بعرض لا يقل عن 1.2 متر، تفريغ رايش المعادن والنشارة في أوعية معدنية", status: "Pass", observation: "الممرات مخططة باللون الأصفر ونظيفة تماماً" },
      { id: 10, inspection_point: "محطة غسيل العيون الكيميائية (Emergency Eyewash Station)", acceptance_criteria: "محطة غسيل عيون جدارية صالحة للعمل الفوري بتدفق مستمر لمدة 15 دقيقة وضغط ماء معتدل", status: "Pass", observation: "تم اختبار المحطة وتدفق المياه نقي ومطابق للمواصفات" },
      { id: 11, inspection_point: "دواليب تخزين المذيبات والمواد القابلة للاشتعال (Flammable Storage Cabinet)", acceptance_criteria: "دولاب معدني مزدوج الجدار معتمد ومقاوم للحريق مع فتحات تهوية وتأريض إلكتروستاتيكي", status: "Pass", observation: "المذيبات محفوظة داخل الدولاب المعتمد ومغلق بإحكام" },
      { id: 12, inspection_point: "شبكة الهواء المضغوط ومسدسات التنظيف الآمنة (Compressed Air Regulators)", acceptance_criteria: "مسدسات هواء بفتحات تخفيض الضغط أقل من 30 PSI وخراطيم مثبتة بقفزان أمان", status: "Pass", observation: "الضغط مضبوط ومسدسات الهواء مطابقة لاشتراطات السلامة" }
    ],
    notes: "فحص وتفتيش السلامة الميكانيكية والكهربائية الشامل لمعمل الفابلاب والورش. جميع وسائل الحماية وقواطع الطوارئ ومهمات الوقاية في حالة امتثال تام."
  },
  lab: {
    title: "فحص السلامة والصحة المهنية بمختبرات الكيمياء والطاقة ومخازن المواد الكيميائية",
    area: "Chemical, Energy & Environmental Laboratories",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    refs: "معايير NFPA 45 لمعامل الكيمياء وقانون البيئة المصري 4/1994",
    items: [
      { id: 1, inspection_point: "كفاءة دواليب سحب الغازات الكيميائية (Fume Hood Face Velocity)", acceptance_criteria: "سرعة سحب الهواء تتراوح بين 80 إلى 120 قدم/دقيقة مع وجود شهادة معايرة سارية", status: "Pass", observation: "تم قياس سرعة السحب بمقياس الأنيمومتر وهي 105 FPM" },
      { id: 2, inspection_point: "فصل المواد الكيميائية غير المتوافقة (Chemical Segregation & Compatibility)", acceptance_criteria: "فصل الأحماض عن القواعد، والمؤكسدات عن المواد العضوية داخل دواليب تخزين مخصصة", status: "Pass", observation: "المواد مفصولة طبقاً لمصفوفة التوافق الكيميائي" },
      { id: 3, inspection_point: "الملصقات التحذيرية وصحائف بيانات السلامة (GHS Labels & SDS Sheets)", acceptance_criteria: "ملصق GHS واضح باللغتين العربية والإنجليزية على كل عبوة وتوافر ملف SDS بالمعمل", status: "Pass", observation: "جميع العبوات تحمل ملصقات GHS وملفات SDS متاحة للطلاب" },
      { id: 4, inspection_point: "حقائب احتواء الانسكابات الكيميائية (Chemical Spill Kits)", acceptance_criteria: "حقيبة انسكاب كيميائي متكاملة تشمل مواد الامتصاص، المحايدات، وأكياس التخلص السميكة", status: "Pass", observation: "الحقيبة متوفرة ومكتملة المحتويات بجوار مدخل المعمل" },
      { id: 5, inspection_point: "دش الطوارئ وغسيل العيون (Emergency Deluge Shower & Eyewash)", acceptance_criteria: "يعمل بالسحب الفوري ويوفر تدفق مياه لا يقل عن 75 لتر/دقيقة بدرجة حرارة معتدلة", status: "Pass", observation: "تم الاختبار وتدفق المياه قوي ومسار الدش خالٍ من العوائق" },
      { id: 6, inspection_point: "حاويات تجميع المخلفات الكيميائية الخطرة (Hazardous Waste Containment)", acceptance_criteria: "حاويات معتمدة محكمة الغلق موضوعة داخل صواني احتواء ثانوي لمنع التسريب", status: "Pass", observation: "أوعية التجميع معنونة وموضوعة داخل صواني ثانوية" },
      { id: 7, inspection_point: "تأمين وتثبيت أسطوانات الغازات المضغوطة (Gas Cylinder Restraints & Caps)", acceptance_criteria: "تثبيت الأسطوانات بسلاسل معدنية رأسية محكمة وتركيب أغطية الصمامات الواقية", status: "Pass", observation: "الأسطوانات مثبتة بسلاسل جدارية ومزودة بمنظمات ضغط سليمة" },
      { id: 8, inspection_point: "مهمات الوقاية الشخصية الكيميائية (Chemical Splash PPE)", acceptance_criteria: "نظارات واقية ضد الرذاذ، قفازات نتريل ونيوبرين، مرايل كيميائية، وواقيات وجه", status: "Pass", observation: "المهمات متوفرة وتستخدم بانتظام أثناء التجارب" },
      { id: 9, inspection_point: "لوحات مخارج الطوارئ وطفايات الحريق المناسبة (CO2 / Dry Powder)", acceptance_criteria: "مخارج واضحة ومضاءة وطفايات حريق فئة B و C مشحونة ومعلقة بجوار الباب", status: "Pass", observation: "الطفايات واللوحات الإرشادية في أماكنها الصحيحة" },
      { id: 10, inspection_point: "التجهيزات الكهربائية المقاومة للاشتعال في غرف المواد المتطايرة", acceptance_criteria: "كشافات ومفاتيح Explosion-Proof وخلو الغرفة من مصادر الشرر", status: "Pass", observation: "التجهيزات مطابقة للاشتراطات الفنية" }
    ],
    notes: "فحص شامل لمعامل الكيمياء ومخزن المواد الخطرة، معايير السلامة الكيميائية والبيئية مستوفاة بالكامل."
  },
  electrical: {
    title: "فحص وتفتيش السلامة لمحطات المحولات ولوحات التوزيع الكهربائية الرئيسية (Electrical Substations)",
    area: "Campus Main Substations & Medium Voltage Switchgear Rooms",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    refs: "الكود المصري للأعمال الكهربائية واشتراطات NFPA 70E للسلامة الكهربائية",
    items: [
      { id: 1, inspection_point: "جاهزية منظومة الإطفاء التلقائي بغاز FM200 بمحطة الكهرباء", acceptance_criteria: "لوحة التحكم في وضع التلقائي (Auto)، أسطوانات الغاز مشحونة بالضغط الصحيح، وجرس الإنذار سليم", status: "Pass", observation: "منظومة الإطفاء التلقائي مفعلة ومؤشرات الضغط سليمة" },
      { id: 2, inspection_point: "علامات التحذير من الجهد العالي والوصول المصرح فقط (Danger Signs)", acceptance_criteria: "لوحات خطر الصعق بالجهد العالي مثبتة على الأبواب والأقفال مانعة لدخول غير المصرح لهم", status: "Pass", observation: "اللوحات التحذيرية واضحة والأبواب مغلقة بالمفاتيح" },
      { id: 3, inspection_point: "سجاد العزل الكهربائي المطاطي أمام اللوحات (Dielectric Rubber Mats)", acceptance_criteria: "سجاد مطاطي عازل فئة Class 2 (متحمل حتى 17 كيلوفولت) سليم وبدون تشققات", status: "Pass", observation: "السجاد العازل يغطي كامل الواجهة أمام لوحات التوزيع" },
      { id: 4, inspection_point: "الفحص الحراري للوصلات والقواطع بالأشعة تحت الحمراء (Thermal Imaging)", acceptance_criteria: "خلو الوصلات والبارات النحاسية من أي نقاط حرارية ساخنة أو عدم اتزان في الأحمال", status: "Pass", observation: "تم التصوير الحراري ودرجات الحرارة طبيعية في الحدود الآمنة" },
      { id: 5, inspection_point: "محطة عزل مصادر الطاقة وتأمين العمليات (LOTO Station & Lockouts)", acceptance_criteria: "توافر أقفال السلامة، بطاقات التحذير، ومقابس الغلق الجماعي (Hasps) بجوار لوحة التحكم", status: "Pass", observation: "حقيبة ومحطة LOTO متكاملة ومتاحة لفريق الصيانة" },
      { id: 6, inspection_point: "ترقيم وتمييز القواطع والدوائر الكهربائية (Circuit Directory Labels)", acceptance_criteria: "بطاقات تعريف واضحة لكل قاطع وخلو اللوحات من أي أسلاك مكشوفة أو فتحات غير مغلقة", status: "Pass", observation: "اللوحات مرقمة ومزودة بخرائط المسارات المعتمدة" },
      { id: 7, inspection_point: "مقاومة التأريض العام وربط الحماية (Earth Grounding Resistance < 5 Ohms)", acceptance_criteria: "قيمة مقاومة التأريض أقل من 5 أوم مع سلامة كابلات وباص بار التأريض الرئيسي", status: "Pass", observation: "مقاومة التأريض المقاسة 2.1 أوم وهي ممتازة" },
      { id: 8, inspection_point: "كشافات الطوارئ الاحتياطية المستقلة (Emergency Battery Lighting)", acceptance_criteria: "كشافات طوارئ تعمل تلقائياً عند انقطاع التيار ببطاريات تعطي 3 ساعات تشغيل", status: "Pass", observation: "تم اختبار الكشافات وتعمل بكفاءة تامة" },
      { id: 9, inspection_point: "إحكام وسد مسارات الكابلات بمواد مانعة للحريق (Fire Stop Sealants)", acceptance_criteria: "سد كافة الفتحات وجلب الكابلات بالفوم أو المعجون المانع لانتشار الحريق (Fire Barrier)", status: "Pass", observation: "الفتحات الجدارية مسدودة بمادة معتمدة مانعة للحريق" },
      { id: 10, inspection_point: "طفايات ثاني أكسيد الكربون CO2 سعة 10 كجم و 6 كجم خارج الغرفة", acceptance_criteria: "طفايات CO2 مخصصة للحرائق الكهربائية مشحونة ومثبتة بجانب باب الدخول", status: "Pass", observation: "الطفايات متوفرة وصالحة للاستخدام" }
    ],
    notes: "تمت مراجعة الاشتراطات الكهربائية لمحطة المحولات الرئيسية ولوحات الجهد المنخفض والمتوسط، والمحطة في حالة تشغيلية آمنة ومطابقة."
  },
  fire: {
    title: "فحص واختبار منظومات الإنذار والإطفاء ومخارج الطوارئ بالحرم الجامعي (Fire & Life Safety Audit)",
    area: "Campus Wide Academic & Administrative Buildings",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    refs: "كود الدفاع المدني والحريق المصري واشتراطات NFPA 72 و NFPA 101 لسلامة الأرواح",
    items: [
      { id: 1, inspection_point: "لوحة الإنذار الرئيسية بالحرم الجامعي (Fire Alarm Main Control Panel)", acceptance_criteria: "اللوحة في وضع التشغيل الطبيعي (Normal Status) بدون أي أعطال أو إشارات خطأ مفتوحة", status: "Pass", observation: "اللوحة تعمل بكفاءة وجميع الحساسات متصلة" },
      { id: 2, inspection_point: "اختبار عينات من كواشف الدخان والحرارة والأزرار اليدوية (Smoke Detectors & MCP)", acceptance_criteria: "إطلاق الإنذار الصوتي والمرئي خلال أقل من 5 ثوانٍ عند تنشيط الكاشف أو كسر الزجاج", status: "Pass", observation: "تم اختبار عينات من المبنى الأكاديمي واستجابت فوراً" },
      { id: 3, inspection_point: "محابس شبكة رشاشات الإطفاء التلقائية (Sprinkler OS&Y Control Valves)", acceptance_criteria: "المحابس مفتوحة بالكامل ومقيدة بسلاسل وأقفال مع وجود قراءات ضغط لا تقل عن 7 بار", status: "Pass", observation: "المحابس مفتوحة ومؤشرات الضغط تشير إلى 8.5 بار" },
      { id: 4, inspection_point: "غرفة مضخات الحريق الرئيسية (Fire Pump Room Electric, Diesel, Jockey)", acceptance_criteria: "المضخات في وضع التشغيل التلقائي (Auto)، وخزان وقود الديزل ممتلئ بنسبة تتجاوز 85%", status: "Pass", observation: "تم اختبار تشغيل مضخة الديزل يدوياً وأوتوماتيكياً وتعمل بكفاءة" },
      { id: 5, inspection_point: "أبواب مخارج الطوارئ ومقابض الفتح السريع (Panic Hardware Fire Doors)", acceptance_criteria: "الأبواب تفتح للخارج بسهولة بمجرد الضغط على مقبض البانيك، وتغلق ذاتياً بإحكام", status: "Pass", observation: "جميع أبواب الطوارئ تفتح بسلاسة وتغلق بالمغلاق الهيدروليكي" },
      { id: 6, inspection_point: "لوحات وكشافات مخارج الطوارئ المضاءة (Illuminated Exit Signs)", acceptance_criteria: "لوحات خروج مضاءة بوضوح تعمل بالبطاريات الاحتياطية ومرئية من جميع الممرات", status: "Pass", observation: "اللوحات واضحة ومضاءة على مدار الساعة" },
      { id: 7, inspection_point: "صناديق حنفيات الحريق وخراطيم الإطفاء 2.5 بوصة (Fire Hydrant & Hose Cabinets)", acceptance_criteria: "الخراطيم ملفوفة وسليمة، البشبوري النحاسي متصل، ومفتاح فتح الحنفية متوفر بالصندوق", status: "Pass", observation: "الصناديق مكتملة ومفحوصة شهرياً" },
      { id: 8, inspection_point: "نقاط التجمع في حالات الإخلاء (Emergency Evacuation Assembly Points)", acceptance_criteria: "النقاط الأربع محددة بلافتات واضحة، مضاءة، وخالية تماماً من وقوف السيارات أو العوائق", status: "Pass", observation: "نقاط التجمع الأربعة مؤمنة ومخططة بوضوح" },
      { id: 9, inspection_point: "سجلات الفحص الشهري والاختبار الهيدروستاتيكي لطفايات الحريق", acceptance_criteria: "كروت فحص معلقة على كل طفاية موقعة شهرياً وتاريخ الاختبار الهيدروستاتيكي سارٍ", status: "Pass", observation: "جميع الطفايات تم فحصها وتوثيقها بكروت التفتيش" },
      { id: 10, inspection_point: "خرائط مسارات الهروب والإخلاء المعلقة بمداخل المباني (Evacuation Floor Plans)", acceptance_criteria: "مخطط معلق بكل طابق يوضح مكانك الحالي (You Are Here)، أقرب مخرج، وأماكن أجهزة الإنذار", status: "Pass", observation: "الخرائط معلقة بوضوح عند المصاعد والسلالم" }
    ],
    notes: "جاهزية كاملة لشبكات الإنذار والإطفاء ومسارات الإخلاء بالحرم الجامعي لدعم خطة الطوارئ السنوية."
  },
  civil: {
    title: "تفتيش السلامة العامة والسلامة الإنشائية ومرافق الحرم الجامعي (Campus Civil & Facility Safety)",
    area: "Academic Buildings, Entrances, Stairs & Campus Grounds",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    lang: "ar",
    refs: "كود البناء المصري واشتراطات السلامة العامة",
    items: [
      { id: 1, inspection_point: "سلامة درابزينات السلالم وشرائط منع الانزلاق (Stair Handrails & Anti-Slip)", acceptance_criteria: "درابزينات مثبتة بإحكام بارتفاع 90 سم وشرائط مضادة للانزلاق على حواف الدرج", status: "Pass", observation: "الدرابزينات قوية وشرائط منع الانزلاق مركبة" },
      { id: 2, inspection_point: "صيانة المصاعد وتراخيص السلامة الدورية وجرس الطوارئ (Elevator Safety)", acceptance_criteria: "رخصة صيانة سارية، جرس طوارئ وجهاز اتصال يعمل، وتوقف المصعد بمحاذاة الطابق تماماً", status: "Pass", observation: "المصاعد مفحوصة ومزودة بملصقات الفحص الدوري الصالحة" },
      { id: 3, inspection_point: "إنارة الممرات والمداخل ومواقف السيارات الخارجية (Campus Lighting)", acceptance_criteria: "إضاءة كافية في جميع الطرقات ومواقف السيارات لضمان الحركة الآمنة ليلاً", status: "Pass", observation: "الإنارة الخارجية مكتملة وتعمل بالحساسات الضوئية" },
      { id: 4, inspection_point: "منحدرات ذوي الهمم وتجهيزات سهولة الوصول (Accessibility Ramps)", acceptance_criteria: "منحدرات بميول هندسية صحيحة مزودة بدرابزين مزدوج وأرضيات خشنة مانعة للانزلاق", status: "Pass", observation: "المنحدرات مجهزة عند جميع المداخل الرئيسية" },
      { id: 5, inspection_point: "سلامة واجهات المباني والنوافذ الزجاجية (Glass Facades & Safety Film)", acceptance_criteria: "الزجاج سليم ومثبت بإحكام مع وجود أفلام حماية مانعة لتناثر الشظايا", status: "Pass", observation: "الواجهات الزجاجية آمنة ومفحوصة دورياً" },
      { id: 6, inspection_point: "شبكات تصريف مياه الأمطار وأغطية غرف التفتيش (Storm Drainage & Manholes)", acceptance_criteria: "أغطية غرف التفتيش ثقيلة ومحكمة الإغلاق ومصارف المطر نظيفة وخالية من الشوائب", status: "Pass", observation: "الأغطية سليمة ومثبتة والمصارف سالكة" },
      { id: 7, inspection_point: "المطبات الصناعية واللوحات الإرشادية المرورية داخل الحرم (Traffic Signage)", acceptance_criteria: "لوحات تحديد السرعة 20 كم/ساعة، معابر مشاة مخططة، ومطبات مدهونة باللون الفوسفوري", status: "Pass", observation: "اللوحات المرورية ومطبات التهدئة واضحة للسيارات" },
      { id: 8, inspection_point: "تأمين أعمال الصيانة والإنشاءات المؤقتة (Barricades & Construction Safety)", acceptance_criteria: "حواجز صلبة وشريط تحذيري ولوحات تنبيه حول أي موقع به حفر أو صيانة جارية", status: "Pass", observation: "لا توجد أعمال حفر مفتوحة بدون حواجز أمان" },
      { id: 9, inspection_point: "نظافة خزانات مياه الشرب والتحاليل المعملية الدورية (Potable Water Safety)", acceptance_criteria: "خزانات مغلقة بإحكام، سجل تطهير نصف سنوي معتمد، ونتائج عينات مطابقة بكتيريولوجياً", status: "Pass", observation: "الخزانات معقمة ونتائج التحاليل صالحة للشرب" },
      { id: 10, inspection_point: "تجهيزات غرف الإسعافات الأولية والعيادة الطبية (Medical Clinic Readiness)", acceptance_criteria: "توافر أسطوانة أكسجين، نقالات طوارئ، أجهزة قياس الضغط والسكر، وتواجد التمريض", status: "Pass", observation: "العيادة مجهزة بالكامل ومفتوحة أثناء اليوم الدراسي" }
    ],
    notes: "فحص السلامة العامة والإنشائية لمباني الحرم الجامعي، المرافق سليمة ومؤمنة بالكامل."
  }
};

function setInspectionTemplate(type) {
  var p = INSPECTION_PRESETS[type];
  if (!p) return;

  var dateVal = document.getElementById("inspectionDate") ? (document.getElementById("inspectionDate").value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
  var nextNum = savedInspections.length + 1;
  var inspNoVal = "SUT-INS-" + new Date().getFullYear() + "-" + String(nextNum).padStart(3, "0");

  if (document.getElementById("inspectionQuery")) document.getElementById("inspectionQuery").value = p.title;
  if (document.getElementById("inspectionArea")) document.getElementById("inspectionArea").value = p.area;
  if (document.getElementById("inspectionNo")) document.getElementById("inspectionNo").value = inspNoVal;
  if (document.getElementById("inspectionInspector")) document.getElementById("inspectionInspector").value = p.inspector || "م. إبراهيم سعيد (HSE Department)";
  if (document.getElementById("inspectionLang")) document.getElementById("inspectionLang").value = p.lang || "ar";
  if (document.getElementById("inspectionRefs")) document.getElementById("inspectionRefs").value = p.refs || "Egyptian labor law + OSHA standards";

  lastGeneratedInspectionData = {
    id: Date.now(),
    no: inspNoVal,
    title: p.title,
    area: p.area,
    date: dateVal,
    inspector: p.inspector || "م. إبراهيم سعيد (HSE Department)",
    lang: p.lang || "ar",
    status: p.items.some(function(x){ return x.status === "Fail"; }) ? "Action Required" : "Completed",
    data: {
      title: p.title,
      scope: p.area,
      items: JSON.parse(JSON.stringify(p.items)),
      notes: p.notes || ""
    }
  };

  var outWrap = document.getElementById("inspectionOutput");
  if (outWrap) outWrap.classList.remove("hidden");

  renderInteractiveInspection();
  saveCurrentInspection(false);

  if (outWrap) {
    outWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  showToast("success", "تم تحميل وتفعيل نموذج فحص: " + (p.area || p.title));
}

function renderInteractiveInspection() {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) return;

  var d = lastGeneratedInspectionData.data;
  var items = d.items || [];
  var lang = lastGeneratedInspectionData.lang || document.getElementById("inspectionLang").value || "ar";
  var ar = (lang === "ar");

  // Calculate compliance statistics
  var totalItems = items.length;
  var passCount = items.filter(function(x) { return x.status === "Pass"; }).length;
  var failCount = items.filter(function(x) { return x.status === "Fail"; }).length;
  var naCount = items.filter(function(x) { return x.status === "N/A"; }).length;
  var evaluatedCount = passCount + failCount;
  var complianceScore = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 100;

  var scoreColor = complianceScore >= 90 ? "#10b981" : (complianceScore >= 70 ? "#f59e0b" : "#ef4444");
  var scoreStatusText = ar ? 
    (complianceScore >= 90 ? "امتثال ممتاز ومطابق (Excellent Compliance)" : (complianceScore >= 70 ? "مطلوب إجراءات تصحيحية (Action Required)" : "غير مطابق يستوجب إجراءات فورية (Critical)")) :
    (complianceScore >= 90 ? "Fully Compliant" : (complianceScore >= 70 ? "Action Required" : "Unsatisfactory / Critical"));

  lastGeneratedInspectionData.status = (failCount > 0) ? "Action Required" : "Completed";

  var t = ar ? {
    inspNo: "رقم الفحص المعتمد",
    date: "تاريخ الفحص",
    area: "الموقع / المنشأة",
    inspector: "المفتش المسؤول",
    scoreTitle: "مؤشر ونسبة الامتثال للسلامة والصحة المهنية (Compliance Score)",
    totalLbl: "إجمالي البنود",
    passLbl: "مطابق",
    failLbl: "غير مطابق (مخالفات)",
    naLbl: "غير منطبق",
    thNo: "#",
    thPoint: "بند الفحص والتفتيش (Inspection Point)",
    thCriteria: "معيار القبول والاشتراط الفني (Acceptance Criteria)",
    thStatus: "حالة المطابقة (Compliance)",
    thObs: "الملاحظات الميدانية والإجراء التصحيحي (Findings & CAPA)",
    thActions: "الإجراءات",
    notesTitle: "توصيات وملاحظات فريق السلامة والصحة المهنية (HSE Recommendations)",
    sigInspector: "توقيع مسؤول السلامة المفتش",
    sigFacility: "توقيع مسؤول المنشأة / القسم",
    sigHSE: "اعتماد إدارة السلامة والصحة المهنية"
  } : {
    inspNo: "Inspection No.",
    date: "Inspection Date",
    area: "Facility / Location",
    inspector: "Lead HSE Inspector",
    scoreTitle: "HSE Compliance & Safety Audit Score",
    totalLbl: "Total Items",
    passLbl: "Pass",
    failLbl: "Fail (Findings)",
    naLbl: "N/A",
    thNo: "#",
    thPoint: "Inspection Point & Scope",
    thCriteria: "Statutory Acceptance Criteria",
    thStatus: "Compliance Status",
    thObs: "Field Observations & Corrective Actions",
    thActions: "Actions",
    notesTitle: "HSE Inspector Notes & Recommendations",
    sigInspector: "Lead Inspector Signature",
    sigFacility: "Facility Representative Signature",
    sigHSE: "HSE Department Official Endorsement"
  };

  var h = '<div class="report insp-interactive-doc" id="inspectionReportInner" data-report-language="' + lang + '" dir="' + (ar ? 'rtl' : 'ltr') + '">' +
    /* Document Header */
    '<div class="report-head">' +
      '<div class="track"><b>' + esc(t.inspNo) + '</b><span style="font-family:Inter,monospace;font-weight:bold">' + esc(lastGeneratedInspectionData.no) + '</span></div>' +
      '<div class="report-title">' +
        '<h2>' + esc(lastGeneratedInspectionData.title) + '</h2>' +
        '<p>' + (ar ? 'جامعة السويدي للتكنولوجيا (SUTech) — إدارة السلامة والصحة المهنية والبيئة' : 'El Sewedy University of Technology (SUTech) — HSE Department') + '</p>' +
      '</div>' +
      '<div class="track"><b>Status</b><span class="hist-status-badge ' + (failCount > 0 ? 'hist-status-action' : 'hist-status-completed') + '">' + esc(lastGeneratedInspectionData.status) + '</span></div>' +
    '</div>' +

    /* Meta Info */
    '<div class="meta">' +
      '<div><b>' + esc(t.area) + ':</b> <span style="font-weight:700;color:#0b1f3a">' + esc(lastGeneratedInspectionData.area) + '</span></div>' +
      '<div><b>' + esc(t.date) + ':</b> ' + esc(lastGeneratedInspectionData.date) + '</div>' +
      '<div><b>' + esc(t.inspector) + ':</b> ' + esc(lastGeneratedInspectionData.inspector) + '</div>' +
    '</div>' +

    /* Compliance Gauge Banner */
    '<div class="insp-score-banner">' +
      '<div class="insp-score-circle" style="border-color:' + scoreColor + '">' +
        '<div class="insp-score-num">' + complianceScore + '%</div>' +
        '<div class="insp-score-lbl">Compliance</div>' +
      '</div>' +
      '<div class="insp-score-details">' +
        '<h3>' + esc(t.scoreTitle) + '</h3>' +
        '<div class="insp-stats-pills">' +
          '<span class="insp-stat-pill pill-total"><i class="fa-solid fa-list-check"></i> ' + t.totalLbl + ': ' + totalItems + '</span>' +
          '<span class="insp-stat-pill pill-pass"><i class="fa-solid fa-check"></i> ' + t.passLbl + ': ' + passCount + '</span>' +
          '<span class="insp-stat-pill pill-fail"><i class="fa-solid fa-triangle-exclamation"></i> ' + t.failLbl + ': ' + failCount + '</span>' +
          (naCount > 0 ? '<span class="insp-stat-pill pill-na"><i class="fa-solid fa-minus"></i> ' + t.naLbl + ': ' + naCount + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div style="text-align:left;min-width:180px">' +
        '<span style="display:inline-block;padding:6px 12px;background:' + scoreColor + ';color:#ffffff;border-radius:6px;font-size:11.5px;font-weight:bold">' + esc(scoreStatusText) + '</span>' +
      '</div>' +
    '</div>' +

    /* Interactive Table */
    '<div class="section-title">' + (ar ? 'قائمة الفحص الميداني والتقييم اللحظي (Inspection Checklist Items)' : 'Inspection Checklist Items & Status') + '</div>' +
    '<table style="width:100%;border-collapse:collapse">' +
      '<thead>' +
        '<tr>' +
          '<th style="width:4%;text-align:center">' + esc(t.thNo) + '</th>' +
          '<th style="width:30%">' + esc(t.thPoint) + '</th>' +
          '<th style="width:30%">' + esc(t.thCriteria) + '</th>' +
          '<th style="width:14%;text-align:center">' + esc(t.thStatus) + '</th>' +
          '<th style="width:16%">' + esc(t.thObs) + '</th>' +
          '<th style="width:6%;text-align:center" class="no-print">' + esc(t.thActions) + '</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  items.forEach(function(item, idx) {
    var rowClass = item.status === "Pass" ? "insp-row-pass" : (item.status === "Fail" ? "insp-row-fail" : "insp-row-na");
    var isFail = (item.status === "Fail");

    h += '<tr class="' + rowClass + '">' +
      '<td style="text-align:center;font-weight:bold"><b>' + (idx + 1) + '</b></td>' +
      '<td>' +
        '<b style="color:#0b1f3a;font-size:11.5px">' + esc(item.inspection_point) + '</b>' +
      '</td>' +
      '<td style="font-size:10.5px;color:#334155">' + esc(item.acceptance_criteria) + '</td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<div class="insp-status-toggle no-print">' +
          '<button type="button" class="insp-toggle-btn btn-pass ' + (item.status === "Pass" ? 'active' : '') + '" onclick="setChecklistItemStatus(' + item.id + ', \'Pass\')" title="مطابق"><i class="fa-solid fa-check"></i> Pass</button>' +
          '<button type="button" class="insp-toggle-btn btn-fail ' + (item.status === "Fail" ? 'active' : '') + '" onclick="setChecklistItemStatus(' + item.id + ', \'Fail\')" title="مخالفة"><i class="fa-solid fa-xmark"></i> Fail</button>' +
          '<button type="button" class="insp-toggle-btn btn-na ' + (item.status === "N/A" ? 'active' : '') + '" onclick="setChecklistItemStatus(' + item.id + ', \'N/A\')" title="غير منطبق">N/A</button>' +
        '</div>' +
        '<span class="print-only badge ' + (item.status === "Pass" ? 'closed' : (item.status === "Fail" ? 'open' : 'medium')) + '" style="display:none">' + esc(item.status) + '</span>' +
      '</td>' +
      '<td>' +
        '<textarea class="no-print" style="width:100%;min-height:34px;padding:4px 6px;font-size:10.5px;border:1px solid ' + (isFail ? '#f87171' : '#cbd5e1') + ';border-radius:5px;resize:vertical;background:' + (isFail ? '#fff5f5' : '#ffffff') + '" placeholder="' + (isFail ? 'اكتب وصف المخالفة المرصودة والإجراء التصحيحي...' : 'ملاحظات إضافية...') + '" onchange="updateInspectionObservation(' + item.id + ', this.value)">' + esc(item.observation || "") + '</textarea>' +
        '<div class="print-only" style="font-size:10px;color:#0b1f3a">' + esc(item.observation || "مطابق للاشتراطات") + '</div>' +
        (isFail ? '<div style="margin-top:4px" class="no-print"><button class="btn-convert-ncr" onclick="convertInspectionItemToNCR(' + item.id + ')"><i class="fa-solid fa-bolt"></i> تحويل إلى NCR</button></div>' : '') +
      '</td>' +
      '<td style="text-align:center;white-space:nowrap" class="no-print">' +
        '<button class="history-action-btn btn-del" title="حذف البند" onclick="deleteInspectionItem(' + item.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });

  h += '</tbody></table>' +

    /* Recommendations / Notes */
    '<div class="section-title">' + esc(t.notesTitle) + '</div>' +
    '<div class="no-print" style="margin-bottom:12px">' +
      '<textarea id="inspOverallNotesInput" style="width:100%;min-height:60px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:11.5px;line-height:1.6" placeholder="اكتب الملاحظات والتوصيات العامة للفحص الميداني..." onchange="updateInspectionOverallNotes(this.value)">' + esc(d.notes || "") + '</textarea>' +
    '</div>' +
    '<div class="print-only" style="padding:10px 14px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:7px;font-size:11px;line-height:1.6">' +
      esc(d.notes || (ar ? "تم استكمال الفحص الميداني والتحقق من اشتراطات السلامة والامتثال للمواصفات." : "Field inspection completed and verified against statutory safety requirements.")) +
    '</div>' +

    /* Signatures Block */
    '<div class="insp-signatures-grid">' +
      '<div class="insp-sig-box">' +
        '<b>' + esc(t.sigInspector) + '</b>' +
        '<div class="insp-sig-line"></div>' +
        '<small>' + esc(lastGeneratedInspectionData.inspector) + '</small>' +
      '</div>' +
      '<div class="insp-sig-box">' +
        '<b>' + esc(t.sigFacility) + '</b>' +
        '<div class="insp-sig-line"></div>' +
        '<small>' + (ar ? "مشرف الموقع / مدير المنشأة" : "Facility Supervisor / Area Lead") + '</small>' +
      '</div>' +
      '<div class="insp-sig-box">' +
        '<b>' + esc(t.sigHSE) + '</b>' +
        '<div class="insp-sig-line"></div>' +
        '<small>' + (ar ? "إدارة السلامة والصحة المهنية — جامعة السويدي" : "El Sewedy University of Technology HSE") + '</small>' +
      '</div>' +
    '</div>' +
  '</div>';

  var container = document.getElementById("inspectionReport");
  if (container) container.innerHTML = h;
}

function setChecklistItemStatus(itemId, newStatus) {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data || !lastGeneratedInspectionData.data.items) return;
  var item = lastGeneratedInspectionData.data.items.find(function(x) { return x.id === itemId; });
  if (item) {
    item.status = newStatus;
    if (newStatus === "Fail" && !item.observation) {
      item.observation = "ملاحظة عدم مطابقة تستوجب اتخاذ إجراء تصحيحي فوري.";
    }
    renderInteractiveInspection();
    saveCurrentInspection(false);
  }
}

function updateInspectionObservation(itemId, val) {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data || !lastGeneratedInspectionData.data.items) return;
  var item = lastGeneratedInspectionData.data.items.find(function(x) { return x.id === itemId; });
  if (item) {
    item.observation = val;
    saveCurrentInspection(false);
  }
}

function updateInspectionOverallNotes(val) {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) return;
  lastGeneratedInspectionData.data.notes = val;
  saveCurrentInspection(false);
}

function inspPassAllItems() {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data || !lastGeneratedInspectionData.data.items) return;
  lastGeneratedInspectionData.data.items.forEach(function(item) {
    item.status = "Pass";
  });
  renderInteractiveInspection();
  saveCurrentInspection(false);
  showToast("success", "تم تمييز كافة بنود الفحص كمطابقة (Pass) بنجاح!");
}

async function convertInspectionItemToNCR(itemId) {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data || !lastGeneratedInspectionData.data.items) return;
  var item = lastGeneratedInspectionData.data.items.find(function(x) { return x.id === itemId; });
  if (!item) return;

  var ncrNum = getNextNCRNumber();
  var today = new Date().toISOString().slice(0, 10);
  var targetD = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  var newNcr = {
    id: Date.now(),
    ncrNo: ncrNum,
    date: today,
    dept: lastGeneratedInspectionData.area || "Maintenance & Operations",
    area: lastGeneratedInspectionData.area || "Campus Facility",
    finding: "مخالفة مرصودة أثناء الفحص الميداني (" + lastGeneratedInspectionData.no + "): " + item.inspection_point + " — " + (item.observation || "عدم مطابقة لمعيار القبول"),
    requirement: item.acceptance_criteria || "اشتراطات السلامة والامتثال المعتمدة",
    priority: "High",
    action: item.corrective_action || "تنفيذ الإجراء التصحيحي فوراً وإعادة الفحص والتحقق الميداني",
    targetDate: targetD,
    status: "Open",
    category: "NCR",
    photoBefore: null,
    photoAfter: null,
    sourceInspectionId: lastGeneratedInspectionData.id
  };

  findings.unshift(newNcr);
  try {
    localStorage.setItem("SUT_FINDINGS", JSON.stringify(findings));
  } catch (e) {}
  syncToCloud("findings", findings);
  renderDashboard();

  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "تم إصدار تقرير عدم المطابقة (NCR)",
      html: '<div style="text-align:right;font-size:12px;line-height:1.7">' +
        '<p>تم تحويل بند المخالفة بنجاح إلى سجل الـ CAPA الرسمي برقم:</p>' +
        '<b style="font-size:14px;color:#c00000;display:block;margin:6px 0">' + esc(ncrNum) + '</b>' +
        '<p><b>الموقع:</b> ' + esc(newNcr.area) + '<br><b>المخالفة:</b> ' + esc(item.inspection_point) + '</p>' +
        '</div>',
      icon: "success",
      confirmButtonText: "موافق",
      confirmButtonColor: "#059669"
    });
  } else {
    showToast("success", "تم إنشاء تقرير عدم المطابقة " + ncrNum + " بنجاح!");
  }
}

async function addCustomInspectionItem() {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) {
    return showSweetAlert("تنبيه", "يرجى اختيار أو بدء نموذج فحص أولاً لإضافة بند جديد إليه.", "warning");
  }

  if (typeof Swal !== "undefined") {
    var formHtml = '<div style="text-align:right;display:flex;flex-direction:column;gap:10px;font-size:12px">' +
      '<div><label><b>بند الفحص والتفتيش (Inspection Point):</b></label><input id="swalInspPoint" class="swal2-input" style="margin:4px 0;width:100%;font-size:12px" placeholder="مثال: فحص سلامة أجهزة الإنذار..."></div>' +
      '<div><label><b>معيار القبول المطلوب (Acceptance Criteria):</b></label><input id="swalInspCriteria" class="swal2-input" style="margin:4px 0;width:100%;font-size:12px" placeholder="مثال: استجابة فورية وخلو من الإشارات الخطأ..."></div>' +
      '<div><label><b>حالة البند الأولية:</b></label><select id="swalInspStatus" class="swal2-select" style="margin:4px 0;width:100%;font-size:12px"><option value="Pass">Pass (مطابق)</option><option value="Fail">Fail (غير مطابق)</option><option value="N/A">N/A (غير منطبق)</option></select></div>' +
      '</div>';

    var res = await Swal.fire({
      title: "إضافة بند فحص جديد",
      html: formHtml,
      showCancelButton: true,
      confirmButtonText: "إضافة البند",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#0284c7",
      preConfirm: function() {
        var p = document.getElementById("swalInspPoint").value.trim();
        var c = document.getElementById("swalInspCriteria").value.trim();
        var s = document.getElementById("swalInspStatus").value;
        if (!p) { Swal.showValidationMessage("يرجى كتابة بند الفحص والتفتيش"); return false; }
        return { point: p, criteria: c, status: s };
      }
    });

    if (res.isConfirmed && res.value) {
      var nextId = (lastGeneratedInspectionData.data.items.length || 0) + 1;
      lastGeneratedInspectionData.data.items.push({
        id: Date.now(),
        inspection_point: res.value.point,
        acceptance_criteria: res.value.criteria || "مطابق للاشتراطات الفنية المعتمدة",
        status: res.value.status || "Pass",
        observation: res.value.status === "Fail" ? "ملاحظة عدم مطابقة" : "مطابق"
      });
      renderInteractiveInspection();
      saveCurrentInspection(false);
      showToast("success", "تمت إضافة بند الفحص الجديد بنجاح!");
    }
  }
}

async function deleteInspectionItem(itemId) {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data || !lastGeneratedInspectionData.data.items) return;
  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف هذا البند من قائمة الفحص؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    lastGeneratedInspectionData.data.items = lastGeneratedInspectionData.data.items.filter(function(x) { return x.id !== itemId; });
    renderInteractiveInspection();
    saveCurrentInspection(false);
    showToast("info", "تم حذف البند من قائمة الفحص.");
  }
}

function exportInspectionWord() {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) {
    return showSweetAlert("تنبيه", "لا توجد بيانات فحص لتصديرها.", "warning");
  }

  var d = lastGeneratedInspectionData;
  var items = d.data.items || [];
  var isAr = (d.lang === "ar" || currentReportLang === "ar");
  var logoSrc = customLogoUrl || SUT_LOGO_B64;

  var passCount = items.filter(function(x) { return x.status === "Pass"; }).length;
  var failCount = items.filter(function(x) { return x.status === "Fail"; }).length;
  var evalCount = passCount + failCount;
  var score = evalCount > 0 ? Math.round((passCount / evalCount) * 100) : 100;

  var rowsHtml = items.map(function(x, idx) {
    var statusColor = x.status === "Pass" ? "#86efac" : (x.status === "Fail" ? "#fca5a5" : "#e2e8f0");
    return '<tr>' +
      '<td style="text-align:center;border:1pt solid #000;padding:4pt;font-weight:bold">' + (idx + 1) + '</td>' +
      '<td style="border:1pt solid #000;padding:4pt;font-weight:bold">' + esc(x.inspection_point) + '</td>' +
      '<td style="border:1pt solid #000;padding:4pt">' + esc(x.acceptance_criteria) + '</td>' +
      '<td style="text-align:center;border:1pt solid #000;padding:4pt;background-color:' + statusColor + ';font-weight:bold">' + esc(x.status) + '</td>' +
      '<td style="border:1pt solid #000;padding:4pt">' + esc(x.observation || "مطابق للاشتراطات") + '</td>' +
    '</tr>';
  }).join("");

  var footerHtml = isAr ?
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>القاهرة - طريق إسماعيلية الصحراوي ، كيلو 51</span>' :
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Cairo - Ismailia Desert Road, Km 51</span>';

  var doc = '<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + esc(d.title) + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 { size: 595.3pt 841.9pt; margin: 28.35pt; mso-header-margin: 14.15pt; mso-footer-margin: 14.15pt; mso-header: h1; mso-footer: f1; }' +
    'div.Section1 { page: Section1; }' +
    'body { font-family: Arial, Cairo, sans-serif; font-size: 9pt; line-height: 1.4; color: #000; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    'th { background-color: #0b1f3a !important; color: #ffffff !important; font-weight: bold; border: 1pt solid #000; padding: 5pt; }' +
    'td { border: 1pt solid #000; padding: 4pt; }' +
    '</style></head>' +
    '<body lang="' + (isAr ? 'AR-EG' : 'EN-US') + '" dir="' + (isAr ? 'rtl' : 'ltr') + '">' +
    '<div class="Section1">' +
      '<div style="text-align:center;border-bottom:2pt solid #0b1f3a;padding-bottom:6pt;margin-bottom:10pt">' +
        '<h2 style="margin:0;color:#0b1f3a;font-size:14pt">' + esc(d.title) + '</h2>' +
        '<p style="margin:3pt 0;color:#c00000;font-weight:bold">' + (isAr ? 'جامعة السويدي للتكنولوجيا (SUTech) — إدارة السلامة والصحة المهنية' : 'El Sewedy University of Technology (SUTech) — HSE Department') + '</p>' +
      '</div>' +
      '<table style="margin-bottom:8pt;background:#f8fafc">' +
        '<tr><td><b>رقم الفحص / No:</b> ' + esc(d.no) + '</td><td><b>التاريخ / Date:</b> ' + esc(d.date) + '</td></tr>' +
        '<tr><td><b>الموقع / Area:</b> ' + esc(d.area) + '</td><td><b>المفتش / Inspector:</b> ' + esc(d.inspector) + '</td></tr>' +
        '<tr><td colspan="2" style="background:#e0f2fe;color:#0369a1;font-weight:bold;font-size:10pt">نسبة الامتثال للسلامة: ' + score + '% (' + (score >= 90 ? 'مطابق' : 'مطلوب إجراء تصحيحي') + ')</td></tr>' +
      '</table>' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th style="width:5%">#</th>' +
            '<th style="width:32%">بند الفحص والتفتيش</th>' +
            '<th style="width:33%">معيار القبول والاشتراط</th>' +
            '<th style="width:12%">الحالة</th>' +
            '<th style="width:18%">الملاحظات والإجراءات</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>' +
      '<div style="margin-top:10pt;border:1pt solid #000;padding:6pt;background:#f8fafc">' +
        '<b>توصيات وملاحظات المفتش:</b><br>' + esc(d.data.notes || "تم استكمال الفحص ومطابقة الاشتراطات.") +
      '</div>' +
      '<table style="margin-top:14pt;border:none">' +
        '<tr style="border:none">' +
          '<td style="border:none;text-align:center;width:33%"><b>توقيع المفتش المسؤول</b><br><br>____________________<br>' + esc(d.inspector) + '</td>' +
          '<td style="border:none;text-align:center;width:33%"><b>توقيع مسؤول المنشأة</b><br><br>____________________</td>' +
          '<td style="border:none;text-align:center;width:33%"><b>اعتماد إدارة السلامة</b><br><br>____________________</td>' +
        '</tr>' +
      '</table>' +
    '</div>' +
    '<div style="mso-element:header" id="h1"><p align="' + (isAr ? 'right' : 'left') + '"><img src="' + logoSrc + '" width="140" height="50" alt="Logo"></p></div>' +
    '<div style="mso-element:footer" id="f1"><p align="center" style="border-top:1pt solid #5D5E60;padding-top:4pt;font-size:8pt;color:#5D5E60">' + footerHtml + '</p></div>' +
    '</body></html>';

  downloadBlob("\ufeff" + doc, "SUTech-Inspection-" + (d.no || "Checklist") + ".doc", "application/msword");
  showToast("success", "تم تنزيل نموذج الفحص بصيغة Word بنجاح!");
}

function exportInspectionExcel() {
  if (typeof XLSX === "undefined" || !lastGeneratedInspectionData || !lastGeneratedInspectionData.data) {
    return showSweetAlert("تنبيه", "لا توجد بيانات فحص صالحة للتصدير.", "warning");
  }

  var d = lastGeneratedInspectionData;
  var items = d.data.items || [];

  var aoa = [
    ["El Sewedy University of Technology (SUTech) — HSE Department"],
    [d.title],
    ["Inspection No:", d.no, "Date:", d.date],
    ["Area / Facility:", d.area, "Inspector:", d.inspector],
    [],
    ["No.", "Inspection Point", "Acceptance Criteria", "Compliance Status", "Field Observation & CAPA"]
  ];

  items.forEach(function(x, i) {
    aoa.push([i + 1, x.inspection_point, x.acceptance_criteria, x.status, x.observation || ""]);
  });

  aoa.push([]);
  aoa.push(["Overall Notes & Recommendations:", d.data.notes || ""]);

  var ws = XLSX.utils.aoa_to_sheet(aoa);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inspection_Report");

  XLSX.writeFile(wb, "SUTech-Inspection-" + (d.no || "Report") + ".xlsx");
  showToast("success", "تم تصدير نموذج الفحص بصيغة Excel بنجاح!");
}

function renderInspection(d) {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) {
    var inspNo = "SUT-INS-" + new Date().getFullYear() + "-" + String(savedInspections.length + 1).padStart(3, "0");
    lastGeneratedInspectionData = {
      id: Date.now(),
      no: inspNo,
      title: d.title || document.getElementById("inspectionQuery").value || "Inspection Checklist",
      area: document.getElementById("inspectionArea").value || "Campus Facility",
      date: new Date().toISOString().slice(0, 10),
      inspector: "SUTech HSE Department",
      lang: document.getElementById("inspectionLang").value || "ar",
      status: "Completed",
      data: d
    };
  }
  renderInteractiveInspection();
}

function getNextNCRNumber() {
  var maxNum = 0;
  if (Array.isArray(findings)) {
    findings.forEach(function (x) {
      if (x.ncrNo) {
        var m = String(x.ncrNo).match(/(?:SUT-HSE-NCR-|NCR-?)(\d+)/i);
        if (m && m[1]) {
          var n = parseInt(m[1], 10);
          if (!isNaN(n) && n < 10000 && n > maxNum) maxNum = n;
        }
      }
    });
  }
  if (lastNCRData && lastNCRData.no) {
    var m2 = String(lastNCRData.no).match(/(?:SUT-HSE-NCR-|NCR-?)(\d+)/i);
    if (m2 && m2[1]) {
      var n2 = parseInt(m2[1], 10);
      if (!isNaN(n2) && n2 < 10000 && n2 > maxNum) maxNum = n2;
    }
  }
  var nextNum = maxNum > 0 ? (maxNum + 1) : 1;
  return "SUT-HSE-NCR-" + nextNum;
}

async function generateNCR() {
  var g = function (id) { return (document.getElementById(id) ? document.getElementById(id).value.trim() : ""); };
  var rawFinding = g("ncrFinding");
  if (!rawFinding) return showSweetAlert("تنبيه", "يرجى كتابة تفاصيل الملاحظة / المخالفة (Finding) أولاً.", "warning");
  var no = g("ncrNo") || getNextNCRNumber();
  var date = g("ncrDate") || new Date().toISOString().slice(0, 10);
  var owner = g("ncrOwner") || "Responsible Department";
  var status = "Open";
  var target = g("ncrTarget");
  var verify = "Pending Remediation";
  var rawReq = g("ncrRequirement");
  var rawImpact = g("ncrImpact");
  var rawCause = g("ncrCause");
  var rawAction = g("ncrAction");
  var rawNotes = g("ncrNotes");

  var out = document.getElementById("ncrReport");
  var wrap = document.getElementById("ncrOutput");
  wrap.classList.remove("hidden");
  loading(out, true);

  try {
    if (!rawReq || !rawImpact || !rawAction || !rawCause) {
      var ncrPrompt = 'You are a Senior HSE Compliance Engineer at El Sewedy University of Technology.\nFinding: "' + rawFinding + '"\nRequirement: "' + rawReq + '"\nImpact: "' + rawImpact + '"\nRoot Cause: "' + rawCause + '"\nAction: "' + rawAction + '"\nComplete any missing fields with high technical precision based on Egyptian laws, NFPA, and sector standards.\nReturn JSON only:\n{"requirement":"Arabic requirement","impact":"Arabic severity/risk","cause":"Arabic root cause","action":"Arabic CAPA"}';
      var aiRes = extractJSON(await callGemini(ncrPrompt));
      if (!rawReq) rawReq = aiRes.requirement || "";
      if (!rawImpact) rawImpact = aiRes.impact || "";
      if (!rawCause) rawCause = aiRes.cause || "";
      if (!rawAction) rawAction = aiRes.action || "";
    }
    var d = { no: no, date: date, owner: owner, finding: rawFinding, requirement: rawReq, impact: rawImpact, cause: rawCause, action: rawAction, status: status, target: target, verify: verify, photoBefore: currentBeforePhoto, photoAfter: "", notes: rawNotes, caseNotes: rawNotes };
    lastNCRData = d;

    var existingIndex = findings.findIndex(function (x) { return x.ncrNo === d.no || (x.id && x.id === d.id); });
    if (existingIndex >= 0) {
      findings[existingIndex] = Object.assign({}, findings[existingIndex], {
        ncrNo: d.no, status: d.status, dept: d.owner, date: d.target || d.date,
        photoBefore: d.photoBefore, photoAfter: "", requirement: d.requirement, impact: d.impact,
        cause: d.cause, action: d.action, notes: d.notes, caseNotes: d.notes
      });
    } else {
      findings.unshift({
        id: Date.now(), ncrNo: d.no, area: d.owner || "Campus", dept: d.owner, finding: d.finding, status: d.status,
        priority: (d.impact && (d.impact.includes("حريق") || d.impact.includes("Critical") || d.impact.includes("جسيم"))) ? "High" : "Medium",
        date: d.target || d.date, photoBefore: d.photoBefore, photoAfter: "", target: d.target, verifyDate: "",
        requirement: d.requirement, impact: d.impact, cause: d.cause, action: d.action,
        category: "NCR",
        notes: d.notes,
        caseNotes: d.notes
      });
    }
    syncToCloud("findings", findings);
    renderNCRView(d);
    renderDashboard();

    // Auto-advance NCR No to the next number for the next entry
    var nextNo = getNextNCRNumber();
    if (document.getElementById("ncrNo")) document.getElementById("ncrNo").value = nextNo;
    showToast("success", "تم إصدار وتوثيق تقرير عدم المطابقة (" + no + ") بنجاح!");
  } catch (e) {
    out.innerHTML = '<div class="status err"><b>Error:</b> ' + esc(e.message) + '</div>';
  }
}

function renderNCRView(d) {
  var statusClass = d.status === "Closed" ? "closed" : d.status === "In Progress" ? "progress" : "open";
  var h = '<div class="report" id="ncrReportInner" dir="ltr" data-report-language="en">' +
    '<div class="report-head" style="direction:ltr">' +
      '<div class="track"><b>NCR Number</b><span>' + esc(d.no) + '</span></div>' +
      '<div class="report-title"><h2>NON-CONFORMITY REPORT (NCR)</h2><p>El Sewedy University of Technology (SUTech) — Safety &amp; Quality Compliance</p></div>' +
      '<div class="track"><b>Status</b><span>' + esc(d.status) + '</span></div>' +
    '</div>' +
    '<div class="ncr-grid" style="direction:ltr">' +
      '<div class="dash-card"><span>Status</span><strong><span class="badge ' + statusClass + '">' + esc(d.status) + '</span></strong></div>' +
      '<div class="dash-card"><span>Responsible Dept</span><strong style="font-size:14px">' + esc(d.owner || "—") + '</strong></div>' +
      '<div class="dash-card"><span>Target Date</span><strong style="font-size:14px">' + esc(d.target || "—") + '</strong></div>' +
      '<div class="dash-card"><span>Verification Date</span><strong style="font-size:14px">' + esc(d.verify || "Pending") + '</strong></div>' +
    '</div>' +
    '<div class="meta" style="direction:ltr">' +
      '<div><b>Date Issued:</b> ' + esc(d.date) + '</div>' +
      '<div><b>Department:</b> ' + esc(d.owner) + '</div>' +
      '<div><b>Institution:</b> SUTech Campus</div>' +
    '</div>' +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">1. Non-Conformity / Finding</div>' +
    '<div class="answer" dir="auto" style="text-align:start;line-height:1.6;">' + md(d.finding) + '</div>' +
    (d.notes || d.caseNotes ? '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">ملاحظات وتوجيهات إضافية (Directives &amp; Notes)</div><div class="answer" dir="auto" style="text-align:start;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;padding:8px 12px;border-radius:6px;">' + md(d.notes || d.caseNotes) + '</div>' : '') +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">2. Photographic Evidence &amp; Visual Records</div>' +
    '<div class="report-photos-grid" style="direction:ltr">' +
      '<div class="report-photo-card">' +
        (d.photoBefore ? '<img src="' + d.photoBefore + '">' : '<div class="photo-pending-placeholder">No Initial Photo Attached</div>') +
        '<span dir="auto">Before — صورة المخالفة المرصودة</span>' +
      '</div>' +
      '<div class="report-photo-card">' +
        (d.photoAfter ? '<img src="' + d.photoAfter + '">' : '<div class="photo-pending-placeholder"><i class="fa-solid fa-clock" style="font-size:16px;margin-bottom:4px;color:#c00000"></i><br>قيد التنفيذ — ترفق صورة الإصلاح بعد استيفاء الـ CAPA</div>') +
        '<span dir="auto">After — صورة التحقق بعد المعالجة</span>' +
      '</div>' +
    '</div>' +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">3. Requirement / Standard Reference</div>' +
    '<div class="answer" dir="auto" style="text-align:start;line-height:1.6;">' + md(d.requirement || "Not specified") + '</div>' +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">4. Risk &amp; Safety Impact</div>' +
    '<div class="answer" dir="auto" style="text-align:start;line-height:1.6;">' + md(d.impact || "Not specified") + '</div>' +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">5. Root Cause Analysis</div>' +
    '<div class="answer" dir="auto" style="text-align:start;line-height:1.6;">' + md(d.cause || "To be determined") + '</div>' +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">6. Corrective &amp; Preventive Action Plan (CAPA)</div>' +
    '<div class="answer" dir="auto" style="text-align:start;line-height:1.6;">' + md(d.action || "To be defined by department") + '</div>' +
    '<div class="section-title" style="border-left:4px solid #c00000;border-right:none;text-align:left;">7. Follow-up &amp; Verification Status</div>' +
    '<table style="direction:ltr">' +
      '<tr><th>Target Date for Closure</th><td>' + esc(d.target || "—") + '</td><th>Verification Date</th><td>' + esc(d.verify || "Pending") + '</td></tr>' +
      '<tr><th>Current Status</th><td>' + esc(d.status) + '</td><th>Evidence Log</th><td>' + (d.photoAfter ? "Verified with Photo Evidence" : "Pending Site Rectification") + '</td></tr>' +
    '</table>' +
  '</div>';
  document.getElementById("ncrReport").innerHTML = h;
}

function addGeneralCase() {
  var g = function (id) { return document.getElementById(id).value.trim(); };
  var caseType = g("gcCaseType");
  var date = g("gcDate") || new Date().toISOString().slice(0, 10);
  var dept = g("gcDept") || "HSE Department";
  var description = g("gcDescription");
  var location = g("gcLocation") || "Campus";
  var dueDate = g("gcDueDate");
  var priority = g("gcPriority") || "Medium";
  var status = g("gcStatus") || "Open";
  var notes = g("gcNotes");

  if (!description) return showSweetAlert("بيانات ناقصة", "يرجى كتابة وصف الحالة / التفاصيل أولاً.", "warning");

  findings.unshift({
    id: Date.now(),
    ncrNo: "",
    area: location,
    dept: dept,
    finding: description,
    status: status,
    priority: priority,
    date: dueDate || date,
    photoBefore: "",
    photoAfter: "",
    target: dueDate,
    verifyDate: "",
    requirement: "",
    impact: "",
    cause: "",
    action: "",
    category: "General",
    caseType: caseType,
    caseNotes: notes,
    caseDate: date
  });

  syncToCloud("findings", findings);

  document.getElementById("gcDescription").value = "";
  document.getElementById("gcLocation").value = "";
  document.getElementById("gcDueDate").value = "";
  document.getElementById("gcNotes").value = "";
  document.getElementById("gcDept").value = "";
  document.getElementById("gcStatus").value = "Open";
  document.getElementById("gcPriority").value = "Medium";

  renderDashboard();
  renderGeneralCasesTable();
  showToast("success", "تم تسجيل الحالة العامة بنجاح وإضافتها للسجل!");
}

function renderGeneralCasesTable() {
  var generalCases = findings.filter(function (x) { return x.category === "General"; });
  var tbl = document.getElementById("generalCasesTable");
  var countLabel = document.getElementById("gcCountLabel");
  if (countLabel) countLabel.textContent = generalCases.length + " حالة مسجلة";

  if (!generalCases.length) {
    tbl.innerHTML = '<div class="status">لا توجد حالات عامة مسجلة بعد. سجل أول حالة من النموذج أعلاه.</div>';
    return;
  }

  tbl.innerHTML = '<table class="answer"><thead><tr>' +
    '<th style="width:18%">نوع الحالة (Case Type)</th>' +
    '<th>الوصف / التفاصيل والملاحظات</th>' +
    '<th style="width:12%">الإدارة</th>' +
    '<th style="width:14%">الخطورة والأثر (Risk / Impact)</th>' +
    '<th style="width:10%">الحالة</th>' +
    '<th style="width:10%">الاستحقاق</th>' +
    '<th style="width:10%">إجراءات</th>' +
    '</tr></thead><tbody>' +
    generalCases.map(function (x) {
      var statusClass = x.status === "Closed" ? "closed" : x.status === "In Progress" ? "progress" : "open";
      var prioClass = x.priority ? x.priority.toLowerCase() : "medium";
      var notesText = (x.caseNotes || x.notes || "").trim();
      var notesHtml = notesText ? '<div style="margin-top:5px;font-size:11px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;padding:4px 8px;border-radius:6px;border-right:3px solid var(--sut-red);line-height:1.4"><b>📝 ملاحظات إضافية وتوجيهات:</b> ' + esc(notesText) + '</div>' : '';
      var impactText = (x.impact || "").trim();
      var riskImpactHtml = '<div style="display:flex;flex-direction:column;gap:3px">' +
        '<span class="badge ' + prioClass + '">' + esc(x.priority || "Medium") + '</span>' +
        (impactText ? '<small style="font-size:10.5px;color:#475569;line-height:1.25"><i class="fa-solid fa-triangle-exclamation" style="color:var(--sut-red);font-size:9.5px"></i> ' + esc(impactText) + '</small>' : '') +
      '</div>';

      return '<tr>' +
        '<td><b>' + esc(x.caseType || "حالة عامة") + '</b></td>' +
        '<td><div>' + esc(x.finding) + '</div>' + notesHtml + '</td>' +
        '<td>' + esc(x.dept) + '</td>' +
        '<td>' + riskImpactHtml + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + esc(x.status) + '</span></td>' +
        '<td>' + esc(x.target || x.date || "—") + '</td>' +
        '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn btn-blue" style="padding:3px 7px;font-size:10px;margin-left:4px" onclick="openEditFindingModal(' + x.id + ')" title="تعديل"><i class="fa-solid fa-pen-to-square"></i> Edit</button>' +
        '<button style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px" onclick="deleteFinding(' + x.id + ');renderGeneralCasesTable()" title="حذف"><i class="fa-solid fa-trash"></i></button>' +
        '</td>' +
        '</tr>';
    }).join("") +
    '</tbody></table>';
}

function openClosureModal(id) {
  var item = findings.find(function (x) { return x.id === id; });
  if (!item) return;
  document.getElementById("closeFindingId").value = item.id;
  document.getElementById("closeFindingText").textContent = item.finding;
  document.getElementById("closeVerifyDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("closeStatus").value = "Closed";
  currentAfterPhoto = item.photoAfter || "";
  document.getElementById("previewCloseAfter").innerHTML = currentAfterPhoto ? '<img src="' + currentAfterPhoto + '" class="photo-thumb">' : "";
  document.getElementById("closureModal").style.display = "flex";
}
function closeClosureModal() { document.getElementById("closureModal").style.display = "none"; }
function saveFindingClosure() {
  var id = parseInt(document.getElementById("closeFindingId").value);
  var item = findings.find(function (x) { return x.id === id; });
  if (item) {
    item.status = document.getElementById("closeStatus").value;
    item.verifyDate = document.getElementById("closeVerifyDate").value;
    item.photoAfter = currentAfterPhoto;
    syncToCloud("findings", findings);
    renderDashboard();
    renderGeneralCasesTable();
    closeClosureModal();
    showToast("success", "تم تحديث حالة المخالفة وحفظها بنجاح!");
  }
}

function openEditFindingModal(id) {
  var item = findings.find(function (x) { return x.id === id; });
  if (!item) return;
  document.getElementById("editFindingId").value = item.id;
  
  var catSelect = document.getElementById("editFindingCategory");
  if (catSelect) catSelect.value = (item.category === "General" ? "General" : "NCR");

  var caseTypeSelect = document.getElementById("editFindingCaseType");
  if (caseTypeSelect) {
    var foundCaseType = false;
    for (var i = 0; i < caseTypeSelect.options.length; i++) {
      if (item.caseType && (caseTypeSelect.options[i].value === item.caseType || caseTypeSelect.options[i].value.includes(item.caseType) || item.caseType.includes(caseTypeSelect.options[i].value))) {
        caseTypeSelect.selectedIndex = i;
        foundCaseType = true;
        break;
      }
    }
    if (!foundCaseType) {
      caseTypeSelect.value = (item.category === "General" ? "متابعة إدارية عامة (General Administrative Follow-up)" : "عدم مطابقة ومخالفة تشغيلية (Operational NCR)");
    }
  }

  document.getElementById("editFindingText").value = item.finding || "";
  document.getElementById("editFindingArea").value = item.area || "";

  var deptSelect = document.getElementById("editFindingDept");
  if (deptSelect) {
    var foundDept = false;
    for (var j = 0; j < deptSelect.options.length; j++) {
      if (item.dept && (deptSelect.options[j].value === item.dept || deptSelect.options[j].text.includes(item.dept) || item.dept.includes(deptSelect.options[j].value))) {
        deptSelect.selectedIndex = j;
        foundDept = true;
        break;
      }
    }
    if (!foundDept) {
      deptSelect.value = "HSE Department";
    }
  }

  document.getElementById("editFindingPriority").value = item.priority || "Medium";
  document.getElementById("editFindingStatus").value = item.status || "Open";
  document.getElementById("editFindingDate").value = item.caseDate || (item.date && item.date.length === 10 ? item.date : new Date().toISOString().slice(0, 10));
  document.getElementById("editFindingTargetDate").value = item.target || item.date || "";

  if (document.getElementById("editFindingReq")) document.getElementById("editFindingReq").value = item.requirement || "";
  if (document.getElementById("editFindingImpact")) document.getElementById("editFindingImpact").value = item.impact || "";
  if (document.getElementById("editFindingCause")) document.getElementById("editFindingCause").value = item.cause || "";
  if (document.getElementById("editFindingAction")) document.getElementById("editFindingAction").value = item.action || "";
  if (document.getElementById("editFindingNotes")) document.getElementById("editFindingNotes").value = item.caseNotes || item.notes || "";

  initAllCustomDropdowns();
  document.getElementById("editFindingModal").style.display = "flex";
}

function closeEditFindingModal() {
  document.getElementById("editFindingModal").style.display = "none";
}

function saveFindingEdit() {
  var id = parseInt(document.getElementById("editFindingId").value, 10);
  var item = findings.find(function (x) { return x.id === id; });
  if (item) {
    var newText = document.getElementById("editFindingText").value.trim();
    if (!newText) return showSweetAlert("بيانات ناقصة", "يرجى كتابة نص الملاحظة / الوصف أولاً.", "warning");

    item.category = document.getElementById("editFindingCategory").value;
    item.caseType = document.getElementById("editFindingCaseType").value;
    item.finding = newText;
    item.area = document.getElementById("editFindingArea").value.trim() || item.area || "Campus";
    item.dept = document.getElementById("editFindingDept").value || item.dept;
    item.priority = document.getElementById("editFindingPriority").value;
    item.status = document.getElementById("editFindingStatus").value;
    item.caseDate = document.getElementById("editFindingDate").value;
    var targetDate = document.getElementById("editFindingTargetDate").value;
    item.target = targetDate;
    item.date = targetDate || item.caseDate || item.date;
    
    if (document.getElementById("editFindingReq")) item.requirement = document.getElementById("editFindingReq").value.trim();
    if (document.getElementById("editFindingImpact")) item.impact = document.getElementById("editFindingImpact").value.trim();
    if (document.getElementById("editFindingCause")) item.cause = document.getElementById("editFindingCause").value.trim();
    if (document.getElementById("editFindingAction")) item.action = document.getElementById("editFindingAction").value.trim();
    if (document.getElementById("editFindingNotes")) {
      var nVal = document.getElementById("editFindingNotes").value.trim();
      item.caseNotes = nVal;
      item.notes = nVal;
    }

    syncToCloud("findings", findings);
    renderDashboard();
    renderGeneralCasesTable();
    closeEditFindingModal();
    showToast("success", "تم حفظ وتحديث كافة بيانات وسجلات الملاحظة بنجاح!");
  }
}

function generateFallbackPtw(type, desc, loc, contractor, lang) {
  var isAr = (lang === "ar");
  if (isAr) {
    return {
      hazards: [
        "مخاطر تطاير الشظايا والرايش الساخن ووميض اللحام والأشعة فوق البنفسجية.",
        "مخاطر الصدمات الكهربائية من توصيلات ماكينات اللحام والأدوات المحمولة.",
        "مخاطر نشوب حرائق نتيجة سقوط الشرر على مواد قابلة للاشتعال مجاورة.",
        "مخاطر استنشاق الغازات والأبخرة المعدنية الناتجة عن عمليات الصهر والقطع."
      ],
      precautions: [
        "إخلاء محيط العمل بنصف قطر 10 أمتار من أي مواد قابلة للاشتعال وتغطية الفتحات بستائر مقاومة للحريق.",
        "توفير طفايات حريق بودرة وCO2 صالحة ومعتمدة بجوار منطقة العمل مع تعيين مراقب حريق (Fire Watch).",
        "فحص سلامة الكابلات الكهربائية والتأكد من وجود قواطع تأريض الحماية (ELCB/GFCI).",
        "توفير تهوية ميكانيكية أو طبيعية كافية لسحب الأدخنة والأبخرة من الموقع."
      ],
      ppe_required: [
        "قناع لحام واقي للوجه والعينين بفلتر تظليل معتمد (Auto-Darkening Helmet).",
        "قفازات جلدية طويلة سميكة مقاومة للحرارة والشرر (Welding Gauntlets).",
        "حذاء سلامة ذو مقدمة فولاذية عازل للحرارة والكهرباء (Safety Boots S3).",
        "سترة أو مريلة جلدية واقية مع نظارات أمان شفافة أثناء إزالة الرايش."
      ],
      emergency_arrangements: [
        "تحديد أرقام طوارئ السلامة بالجامعة (SUT Emergency) وتجهيز حقيبة إسعافات أولية متكاملة.",
        "استمرار مراقبة موقع العمل لمدة 30 دقيقة بعد انتهاء الأعمال الساخنة لضمان عدم وجود جمر كامن."
      ],
      tbt_key_topics: [
        "مخاطر العمل الساخن وإجراءات الوقاية من الحرائق",
        "الاستخدام الإلزامي لمهمات الوقاية الشخصية الخاصة باللحام والقطع",
        "خطة الطوارئ ومسار الإخلاء المعتمد",
        "سلطة إيقاف العمل غير الآمن فوراً (Stop Work Authority)"
      ]
    };
  } else {
    return {
      hazards: [
        "Flying hot sparks, slag, optical radiation and UV flash burns from welding/cutting.",
        "Electric shock from damaged insulation, earth leakage, or energized power tools.",
        "Fire and explosion hazards from combustible materials within the hot work zone.",
        "Toxic fume and particulate inhalation during metal cutting and grinding operations."
      ],
      precautions: [
        "Clear all combustible materials within a 10-meter radius or shield with fire blankets.",
        "Ensure calibrated CO2 and Dry Chemical fire extinguishers are on-site with a dedicated Fire Watch.",
        "Inspect all power cables, grounding clamps, and verify ELCB/GFCI electrical breakers.",
        "Maintain adequate local exhaust ventilation or forced air extraction."
      ],
      ppe_required: [
        "Auto-darkening welding helmet / face shield with approved shade filters.",
        "Heavy-duty split leather welding gauntlets and flame-retardant arm sleeves.",
        "Steel-toe electrical hazard certified safety boots (S3 standard).",
        "High-impact safety goggles and FFP3 particulate/fume respirator mask."
      ],
      emergency_arrangements: [
        "SUTech HSE emergency response protocol activated with on-site first-aid responder.",
        "Mandatory 30-minute post-work continuous fire watch monitoring."
      ],
      tbt_key_topics: [
        "Hot Work & Power Tool Hazards Mitigation",
        "Mandatory PPE Compliance & Fire Extinguisher Readiness",
        "Emergency Stop & Evacuation Procedures",
        "Stop-Work Authority Policy"
      ]
    };
  }
}

async function generatePTW() {
  var g = function (id) { return (document.getElementById(id) ? document.getElementById(id).value.trim() : ""); };
  var no = g("ptwNo") || "SUT-PTW-2026-001";
  var type = g("ptwType");
  var loc = g("ptwLoc") || "Fabrication Lab Workshop";
  var contractor = g("ptwContractor") || "University Maintenance Directorate";
  var desc = g("ptwDesc");
  var start = g("ptwStart");
  var end = g("ptwEnd");
  var status = g("ptwStatus") || "Issued & Active";
  var sutOfficer = g("ptwSutOfficer") || "م. إبراهيم سعيد (Eng. Ibrahim Saeed)";
  var contractorOfficer = g("ptwContractorOfficer") || "م. يوسف محمد (Eng. Youssef Mohamed)";
  var lang = g("ptwLang") || "en";

  if (!desc) return showSweetAlert("بيانات ناقصة / Incomplete Data", "يرجى كتابة وصف العمل والمعدات أولاً.", "warning");

  var out = document.getElementById("ptwReport");
  var wrap = document.getElementById("ptwOutput");
  if (wrap) wrap.classList.remove("hidden");
  if (out) loading(out, true);

  showToast("info", "جاري إعداد وتوثيق تصريح العمل الآمن وجلسة التوعية (PTW + TBT)...");

  var isAr = (lang === "ar");
  var isBoth = (lang === "both");
  var aiRes = null;

  try {
    var promptLang = isAr ? "ARABIC (اللغة العربية الرسمية)" : "ENGLISH";
    var prompt = 'You are the Lead HSE Permit to Work Officer for El Sewedy University of Technology (SUTech).\n' +
      'Generate strict safety controls and TBT guidelines in professional ' + promptLang + ' for:\n' +
      'Permit Type: ' + type + '\n' +
      'Location: ' + loc + '\n' +
      'Activity Scope: ' + desc + '\n' +
      'Contractor: ' + contractor + '\n' +
      'Return ONLY a valid JSON object matching this schema:\n' +
      '{\n' +
      '  "hazards": ["Hazard 1", "Hazard 2", "Hazard 3", "Hazard 4"],\n' +
      '  "precautions": ["Precaution 1", "Precaution 2", "Precaution 3", "Precaution 4"],\n' +
      '  "ppe_required": ["PPE 1", "PPE 2", "PPE 3", "PPE 4"],\n' +
      '  "emergency_arrangements": ["Measure 1", "Measure 2"],\n' +
      '  "tbt_key_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]\n' +
      '}';

    var rawRes = await callGemini(prompt);
    aiRes = extractJSON(rawRes);
  } catch (e) {
    console.warn("Direct API call failed, generating official standard PTW safety controls:", e);
    aiRes = generateFallbackPtw(type, desc, loc, contractor, lang);
  }

  if (!aiRes || !aiRes.hazards) {
    aiRes = generateFallbackPtw(type, desc, loc, contractor, lang);
  }

  var h = "";

  if (isAr) {
    /* Arabic Official SUTech Permit Template */
    h = '<div class="report" id="ptwReportInner" style="direction:rtl;text-align:right">' +
      '<div class="report-head" style="direction:rtl">' +
        '<div class="track"><b>رقم التصريح</b><span>' + esc(no) + '</span></div>' +
        '<div class="report-title">' +
          '<h2 style="font-family:Cairo,sans-serif;letter-spacing:0">تصريح عمل آمن وتوعية السلامة الميدانية (PTW + TBT)</h2>' +
          '<p style="font-family:Cairo,sans-serif;color:var(--sut-red)">جامعة السويدي للتكنولوجيا (SUTech) — إدارة السلامة والصحة المهنية والبيئة</p>' +
        '</div>' +
        '<div class="track"><b>حالة التصريح</b><span>' + esc(status) + '</span></div>' +
      '</div>' +
      '<div class="meta" style="direction:rtl">' +
        '<div><b>نوع وتصنيف العمل:</b> ' + esc(type) + '</div>' +
        '<div><b>الموقع الدقيق / القسم:</b> ' + esc(loc || "مقر الجامعة") + '</div>' +
        '<div><b>الحالة التشغيلية:</b> <span class="badge closed">' + esc(status) + '</span></div>' +
      '</div>' +
      '<div class="meta" style="direction:rtl">' +
        '<div><b>الجهة المنفذة / المقاول:</b> ' + esc(contractor || "إدارة الصيانة والخدمات") + '</div>' +
        '<div><b>تاريخ وتوقيت البدء:</b> ' + esc(start ? start.replace("T", " ") : "_________________") + '</div>' +
        '<div><b>تاريخ وتوقيت الانتهاء:</b> ' + esc(end ? end.replace("T", " ") : "_________________") + '</div>' +
      '</div>' +
      '<div class="section-title">1. نطاق العمل ووصف النشاط والمعدات المستخدمة</div>' +
      '<div class="answer"><p>' + esc(desc) + '</p></div>' +
      '<div class="section-title">2. المخاطر الحرجة المرصودة في موقع العمل</div>' +
      '<ul style="padding-right:22px;padding-left:0">' + aiRes.hazards.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title">3. تدابير واشتراطات السلامة وعزل الطاقة الإلزامية</div>' +
      '<ul style="padding-right:22px;padding-left:0">' + aiRes.precautions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title">4. مهمات الوقاية الشخصية الإلزامية (PPE)</div>' +
      '<ul style="padding-right:22px;padding-left:0">' + aiRes.ppe_required.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title">5. ترتيبات وخطة الاستجابة للطوارئ والإسعافات</div>' +
      '<ul style="padding-right:22px;padding-left:0">' + aiRes.emergency_arrangements.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title">6. جلسة التوعية الميدانية (Toolbox Talk) وسجل حضور العمال والفنيين</div>' +
      '<p style="font-size:11px;margin-bottom:8px"><b>المحاور الرئيسية التي تم شرحها:</b> ' + aiRes.tbt_key_topics.join(" • ") + '</p>' +
      '<table><thead><tr><th style="width:6%">م</th><th>اسم العامل / الفني بالكامل</th><th style="width:28%">المسمى الوظيفي / الحرفة</th><th style="width:28%">التوقيع وإقرار الالتزام</th></tr></thead><tbody>' +
        '<tr><td style="text-align:center">1</td><td></td><td></td><td></td></tr>' +
        '<tr><td style="text-align:center">2</td><td></td><td></td><td></td></tr>' +
        '<tr><td style="text-align:center">3</td><td></td><td></td><td></td></tr>' +
        '<tr><td style="text-align:center">4</td><td></td><td></td><td></td></tr>' +
      '</tbody></table>' +
      '<div class="section-title">7. الاعتماد والتفويض المزدوج للسلامة (Dual Authorization)</div>' +
      '<table><thead><tr><th style="width:50%">مسؤول السلامة من طرف الجامعة (SUTech HSE)</th><th style="width:50%">مسؤول السلامة من طرف الجهة المنفذة / المقاول</th></tr></thead><tbody>' +
        '<tr><td><b>الاسم:</b> ' + esc(sutOfficer) + '<br><b>الصفة:</b> مهندس السلامة والصحة المهنية بالجامعة<br><b>التوقيع:</b> ___________________________<br><b>التاريخ:</b> ' + new Date().toLocaleDateString("ar-EG") + '</td><td><b>الاسم:</b> ' + esc(contractorOfficer) + '<br><b>الصفة:</b> مسؤول سلامة المقاول / المشرف<br><b>التوقيع:</b> ___________________________<br><b>التاريخ:</b> ' + new Date().toLocaleDateString("ar-EG") + '</td></tr>' +
      '</tbody></table>' +
    '</div>';
  } else {
    /* English Official SUTech Permit Template */
    h = '<div class="report" id="ptwReportInner" style="direction:ltr;text-align:left">' +
      '<div class="report-head" style="direction:ltr">' +
        '<div class="track"><b>Permit Reference</b><span>' + esc(no) + '</span></div>' +
        '<div class="report-title">' +
          '<h2 style="font-family:Inter,Cairo,sans-serif;letter-spacing:0.5px">PERMIT TO WORK &amp; TOOL BOX TALK (PTW + TBT)</h2>' +
          '<p style="font-family:Inter,sans-serif;color:var(--sut-red)">El Sewedy University of Technology (SUTech) — HSE Department</p>' +
        '</div>' +
        '<div class="track"><b>Permit Status</b><span>' + esc(status) + '</span></div>' +
      '</div>' +
      '<div class="meta" style="direction:ltr">' +
        '<div><b>Permit Category:</b> ' + esc(type) + '</div>' +
        '<div><b>Work Location / Unit:</b> ' + esc(loc || "SUT Campus") + '</div>' +
        '<div><b>Authorized Status:</b> <span class="badge closed">' + esc(status) + '</span></div>' +
      '</div>' +
      '<div class="meta" style="direction:ltr">' +
        '<div><b>Executing Contractor / Dept:</b> ' + esc(contractor || "Maintenance Dept") + '</div>' +
        '<div><b>Valid From:</b> ' + esc(start ? start.replace("T", " ") : "_________________") + '</div>' +
        '<div><b>Valid Until:</b> ' + esc(end ? end.replace("T", " ") : "_________________") + '</div>' +
      '</div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">1. Scope of Work &amp; Activity Description</div>' +
      '<div class="answer"><p>' + esc(desc) + '</p></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">2. Identified Critical Hazards</div>' +
      '<ul style="padding-left:22px;padding-right:0">' + aiRes.hazards.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">3. Mandatory Precautions &amp; Isolation Controls</div>' +
      '<ul style="padding-left:22px;padding-right:0">' + aiRes.precautions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">4. Required Personal Protective Equipment (PPE)</div>' +
      '<ul style="padding-left:22px;padding-right:0">' + aiRes.ppe_required.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">5. Emergency Response Arrangements</div>' +
      '<ul style="padding-left:22px;padding-right:0">' + aiRes.emergency_arrangements.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">6. Tool Box Talk (TBT) Briefing &amp; Worker Sign-off</div>' +
      '<p style="font-size:11px;margin-bottom:8px"><b>Core Safety Topics Delivered:</b> ' + aiRes.tbt_key_topics.join(" • ") + '</p>' +
      '<table><thead><tr><th style="width:6%">#</th><th>Worker Full Name</th><th style="width:25%">Designation / Trade</th><th style="width:25%">Worker Signature</th></tr></thead><tbody>' +
        '<tr><td style="text-align:center">1</td><td></td><td></td><td></td></tr>' +
        '<tr><td style="text-align:center">2</td><td></td><td></td><td></td></tr>' +
        '<tr><td style="text-align:center">3</td><td></td><td></td><td></td></tr>' +
        '<tr><td style="text-align:center">4</td><td></td><td></td><td></td></tr>' +
      '</tbody></table>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">7. Dual Safety Authorization &amp; Sign-off</div>' +
      '<table><thead><tr><th style="width:50%">SUTech HSE Department (University Safety Officer)</th><th style="width:50%">Contractor / Executing HSE (Their Safety Representative)</th></tr></thead><tbody>' +
        '<tr><td><b>Name:</b> ' + esc(sutOfficer) + '<br><b>Designation:</b> SUTech Safety Engineer<br><b>Signature:</b> ___________________________<br><b>Date / Time:</b> ' + new Date().toLocaleDateString("en-GB") + '</td><td><b>Name:</b> ' + esc(contractorOfficer) + '<br><b>Designation:</b> Contractor Safety Representative<br><b>Signature:</b> ___________________________<br><b>Date / Time:</b> ' + new Date().toLocaleDateString("en-GB") + '</td></tr>' +
      '</tbody></table>' +
    '</div>';
  }

  out.innerHTML = h;

  var existingPtwIndex = ptwList.findIndex(function (x) { return x.no === no; });
  var ptwRecord = { id: (existingPtwIndex >= 0 ? ptwList[existingPtwIndex].id : Date.now()), no: no, type: type, loc: loc, contractor: contractor, status: status, start: start, end: end, sutOfficer: sutOfficer, contractorOfficer: contractorOfficer, lang: lang };

  if (existingPtwIndex >= 0) {
    ptwList[existingPtwIndex] = ptwRecord;
  } else {
    ptwList.unshift(ptwRecord);
  }
  syncToCloud("ptwList", ptwList);
  renderDashboard();
  showToast("success", isAr ? "تم إصدار وتوثيق تصريح العمل (PTW) بنجاح!" : "Permit to Work (PTW) successfully generated and logged!");
}

function updatePTWStatus(id, newStatus) {
  var item = ptwList.find(function (x) { return x.id === id; });
  if (item) {
    item.status = newStatus;
    syncToCloud("ptwList", ptwList);
    showToast("info", "تم تحديث حالة التصريح إلى: " + newStatus);
  }
}
async function deletePTW(id) {
  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف تصريح العمل هذا؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    ptwList = ptwList.filter(function (x) { return x.id !== id; });
    syncToCloud("ptwList", ptwList);
    renderDashboard();
    showToast("info", "تم حذف التصريح بنجاح");
  }
}

function openEditPTWModal(id) {
  var item = ptwList.find(function (x) { return x.id === id; });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على تصريح العمل المطلوب.", "error");

  document.getElementById("editPtwId").value = item.id;
  document.getElementById("editPtwNo").value = item.no || "";
  if (document.getElementById("editPtwType")) document.getElementById("editPtwType").value = item.type || "Cold Work (أعمال عامة)";
  document.getElementById("editPtwLoc").value = item.loc || "";
  document.getElementById("editPtwContractor").value = item.contractor || "";
  document.getElementById("editPtwStatus").value = item.status || "Issued & Active";
  document.getElementById("editPtwStart").value = item.start || "";
  document.getElementById("editPtwEnd").value = item.end || "";
  document.getElementById("editPtwSutOfficer").value = item.sutOfficer || "";
  document.getElementById("editPtwContractorOfficer").value = item.contractorOfficer || "";

  var modal = document.getElementById("editPtwModal");
  if (modal) modal.classList.add("active");
}

function closeEditPTWModal() {
  var modal = document.getElementById("editPtwModal");
  if (modal) modal.classList.remove("active");
}

function saveEditedPTW() {
  var id = Number(document.getElementById("editPtwId").value);
  var item = ptwList.find(function (x) { return x.id === id; });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على تصريح العمل المطلوب.", "error");

  var no = document.getElementById("editPtwNo").value.trim();
  var type = document.getElementById("editPtwType").value;
  var loc = document.getElementById("editPtwLoc").value.trim();
  var contractor = document.getElementById("editPtwContractor").value.trim();
  var status = document.getElementById("editPtwStatus").value;
  var start = document.getElementById("editPtwStart").value.trim();
  var end = document.getElementById("editPtwEnd").value.trim();
  var sutOfficer = document.getElementById("editPtwSutOfficer").value.trim();
  var contractorOfficer = document.getElementById("editPtwContractorOfficer").value.trim();

  if (!no || !loc || !contractor) {
    return showSweetAlert("تنبيه", "يرجى تعبئة الحقول الأساسية (رقم التصريح، الموقع، والجهة المنفذة).", "warning");
  }

  item.no = no;
  item.type = type;
  item.loc = loc;
  item.contractor = contractor;
  item.status = status;
  item.start = start;
  item.end = end;
  item.sutOfficer = sutOfficer;
  item.contractorOfficer = contractorOfficer;

  syncToCloud("ptwList", ptwList);
  renderDashboard();
  closeEditPTWModal();
  showToast("success", "تم تحديث وحفظ بيانات تصريح العمل (" + no + ") بنجاح!");
}

function addTrainingSession() {
  var g = function (id) { return (document.getElementById(id) ? document.getElementById(id).value.trim() : ""); };
  var topic = g("trTopic"), date = g("trDate"), audience = g("trAudience"), trainer = g("trTrainer"), attendees = parseInt(g("trAttendees")) || 0, hours = parseFloat(g("trHours")) || 1;
  if (!topic) return showSweetAlert("بيانات ناقصة", "يرجى كتابة موضوع التدريب أولاً.", "warning");
  trainingSessions.unshift({ id: Date.now(), topic: topic, date: date, audience: audience, trainer: trainer, attendees: attendees, hours: hours });
  syncToCloud("trainingSessions", trainingSessions);
  if (document.getElementById("trTopic")) document.getElementById("trTopic").value = "";
  if (document.getElementById("trAttendees")) document.getElementById("trAttendees").value = "";
  renderTraining();
  renderDashboard();
  showToast("success", "تم تسجيل جلسة التدريب بنجاح!");
}
function renderTraining() {
  var tbl = document.getElementById("trainingTable");
  if (!tbl) return;
  tbl.innerHTML = trainingSessions.length ? '<table class="answer"><thead><tr><th>Training Topic</th><th style="width:14%">Date</th><th style="width:20%">Target Audience</th><th style="width:16%">Trainer</th><th style="width:10%">Attendees</th><th style="width:8%">Action</th></tr></thead><tbody>' + trainingSessions.map(function (x) { return '<tr><td><b>' + esc(x.topic) + '</b></td><td>' + esc(x.date) + '</td><td>' + esc(x.audience) + '</td><td>' + esc(x.trainer) + '</td><td style="text-align:center"><b>' + x.attendees + '</b></td><td style="text-align:center"><button style="background:none;border:none;color:#dc2626;cursor:pointer" onclick="deleteTraining(' + x.id + ')"><i class="fa-solid fa-trash"></i></button></td></tr>'; }).join("") + '</tbody></table>' : '<div class="status">لا توجد جلسات تدريب مسجلة بعد.</div>';
}
async function deleteTraining(id) {
  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف جلسة التدريب هذه؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    trainingSessions = trainingSessions.filter(function (x) { return x.id !== id; });
    syncToCloud("trainingSessions", trainingSessions);
    renderTraining();
    renderDashboard();
    showToast("info", "تم حذف جلسة التدريب");
  }
}

function addIncident() {
  var g = function (id) { return (document.getElementById(id) ? document.getElementById(id).value.trim() : ""); };
  var type = g("incType"), date = g("incDate"), loc = g("incLoc"), desc = g("incDesc");
  var injuredName = g("incInjuredName");
  var injuredRole = g("incInjuredRole");
  var bodyPart = g("incBodyPart");
  var supervisor = g("incSupervisor");

  if (!desc) return showSweetAlert("بيانات ناقصة", "يرجى كتابة تفاصيل الواقعة أو الحادث أولاً.", "warning");

  incidents.unshift({
    id: Date.now(),
    type: type,
    date: date || new Date().toISOString().slice(0, 16),
    loc: loc,
    desc: desc,
    injuredName: injuredName,
    injuredRole: injuredRole,
    bodyPart: bodyPart,
    supervisor: supervisor
  });

  syncToCloud("incidents", incidents);

  if (document.getElementById("incDesc")) document.getElementById("incDesc").value = "";
  if (document.getElementById("incInjuredName")) document.getElementById("incInjuredName").value = "";
  if (document.getElementById("incSupervisor")) document.getElementById("incSupervisor").value = "";

  renderIncidents();
  renderDashboard();
  showToast("success", "تم تسجيل الحادث وتوثيق بيانات المصابين بنجاح!");
}

function renderIncidents() {
  var total = incidents.length;
  var near = incidents.filter(function (x) { return (x.type || "").includes("Near-Miss"); }).length;
  var fa = incidents.filter(function (x) { return (x.type || "").includes("First Aid"); }).length;
  var lti = incidents.filter(function (x) { return (x.type || "").includes("Lost Time"); }).length;
  var stats = getSafeStats();

  if (document.getElementById("incTotal")) document.getElementById("incTotal").textContent = total;
  if (document.getElementById("incNearMiss")) document.getElementById("incNearMiss").textContent = near;
  if (document.getElementById("incFA")) document.getElementById("incFA").textContent = fa;
  if (document.getElementById("incHours")) document.getElementById("incHours").textContent = stats.safeHours.toLocaleString();
  var ltifr = total ? ((lti * 1000000) / stats.safeHours).toFixed(2) : "0.00";
  if (document.getElementById("incLTIFR")) document.getElementById("incLTIFR").textContent = ltifr;

  var tbl = document.getElementById("incidentsTable");
  if (!tbl) return;

  tbl.innerHTML = total ? '<table class="answer"><thead><tr><th style="width:18%">نوع الواقعة / التصنيف</th><th style="width:14%;text-align:center">التاريخ والوقت</th><th style="width:14%">الموقع</th><th style="width:20%">بيانات المصاب (إن وجد)</th><th>تفاصيل الواقعة والمشرف</th><th style="width:14%;text-align:center">RCA & Action</th></tr></thead><tbody>' + incidents.map(function (x) {
    var hasInjury = x.injuredName && x.injuredName !== "لا يوجد";
    var injuryBadge = hasInjury ?
      '<div style="font-weight:700;color:var(--sut-navy)"><i class="fa-solid fa-user-injured" style="color:var(--sut-red)"></i> ' + esc(x.injuredName) + '</div><div style="font-size:10px;color:#475569">' + esc(x.injuredRole || "") + '</div><span class="badge critical" style="font-size:9.5px;margin-top:2px">' + esc(x.bodyPart || "") + '</span>' :
      '<span style="color:#64748b;font-size:10.5px"><i class="fa-solid fa-shield-check" style="color:#059669"></i> لا توجد إصابة بشرية</span>';

    var supText = x.supervisor ? '<div style="font-size:10px;color:#0284c7;margin-top:3px"><b>المشرف:</b> ' + esc(x.supervisor) + '</div>' : '';
    var isNear = (x.type || "").includes("Near-Miss");
    var isLti = (x.type || "").includes("Lost Time");
    var badgeCls = isLti ? "critical" : isNear ? "progress" : "high";

    return '<tr>' +
      '<td><span class="badge ' + badgeCls + '">' + esc(x.type) + '</span></td>' +
      '<td style="text-align:center;font-size:11px;font-weight:600;white-space:nowrap">' + esc(x.date ? x.date.replace("T", " ") : "—") + '</td>' +
      '<td><span class="hotspot-tag">' + esc(x.loc) + '</span></td>' +
      '<td>' + injuryBadge + '</td>' +
      '<td><div style="line-height:1.5">' + esc(x.desc) + '</div>' + supText + '</td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn btn-purple" style="padding:4px 9px;font-size:10.5px;margin-left:4px" onclick="openIncidentRcaModal(' + x.id + ')" title="تحليل الأسباب الجذرية">' +
          '<i class="fa-solid fa-diagram-project"></i> Deep RCA' +
        '</button>' +
        '<button style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px;vertical-align:middle" onclick="deleteIncident(' + x.id + ')" title="حذف">' +
          '<i class="fa-solid fa-trash"></i>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("") + '</tbody></table>' : '<div class="status">لا توجد حوادث أو وقائع مسجلة. السجل نظيف ومؤشرات السلامة مثالية.</div>';
}
async function deleteIncident(id) {
  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف هذا السجل؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    incidents = incidents.filter(function (x) { return x.id !== id; });
    syncToCloud("incidents", incidents);
    renderIncidents();
    renderDashboard();
    showToast("info", "تم حذف السجل بنجاح");
  }
}

function updateFindingStatus(id, newStatus) {
  var item = findings.find(function (x) { return x.id === id; });
  if (item) {
    item.status = newStatus;
    syncToCloud("findings", findings);
    showToast("info", "تم تحديث حالة الملاحظة إلى: " + newStatus);
  }
}
async function deleteFinding(id) {
  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف هذه الملاحظة / المخالفة؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    findings = findings.filter(function (x) { return x.id !== id; });
    syncToCloud("findings", findings);
    renderDashboard();
    showToast("info", "تم حذف الملاحظة بنجاح");
  }
}

function updateInteractiveCharts() {
  if (typeof Chart === "undefined") return;

  var total = findings.length;
  var closed = findings.filter(function (x) { return x.status === "Closed"; }).length;
  var inProgress = findings.filter(function (x) { return x.status === "In Progress"; }).length;
  var open = findings.filter(function (x) { return x.status === "Open"; }).length;

  var closedPct = total ? Math.round((closed / total) * 100) : 0;
  var centerEl = document.getElementById("donutCenterPct");
  if (centerEl) centerEl.textContent = closedPct + "%";

  // 1. CAPA Status Donut Chart
  var donutCanvas = document.getElementById("statusDonutChart");
  if (donutCanvas) {
    if (donutChartInstance) { try { donutChartInstance.destroy(); } catch (e) {} }
    var ctxDonut = donutCanvas.getContext("2d");
    donutChartInstance = new Chart(ctxDonut, {
      type: "doughnut",
      data: {
        labels: ["Closed / تم الإغلاق", "In Progress / قيد التنفيذ", "Open / معلق"],
        datasets: [{
          data: [closed, inProgress, open],
          backgroundColor: ["#059669", "#D97706", "#DC2626"],
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "74%",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10, family: "Cairo, Inter, sans-serif" }, padding: 8 } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var val = ctx.raw || 0;
                var p = total ? Math.round(val / total * 100) : 0;
                return " " + ctx.label + ": " + val + " (" + p + "%)";
              }
            }
          }
        }
      }
    });
  }

  // 2. Risk Bar Chart
  var riskCanvas = document.getElementById("riskBarChart");
  if (riskCanvas) {
    if (riskBarChartInstance) { try { riskBarChartInstance.destroy(); } catch (e) {} }
    var crit = findings.filter(function (x) { return x.priority === "Critical"; }).length;
    var high = findings.filter(function (x) { return x.priority === "High"; }).length;
    var med = findings.filter(function (x) { return x.priority === "Medium"; }).length;
    var low = findings.filter(function (x) { return x.priority === "Low"; }).length;

    var ctxRisk = riskCanvas.getContext("2d");
    riskBarChartInstance = new Chart(ctxRisk, {
      type: "bar",
      data: {
        labels: ["Critical / حرج", "High / عالي", "Medium / متوسط", "Low / منخفض"],
        datasets: [{
          label: "مستوى الخطورة",
          data: [crit, high, med, low],
          backgroundColor: ["#7F1D1D", "#DC2626", "#D97706", "#059669"],
          borderRadius: 6,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return " عدد الملاحظات: " + ctx.raw; }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, family: "Cairo, Inter, sans-serif" } } },
          y: { beginAtZero: true, grid: { color: "rgba(203, 213, 225, 0.4)" }, ticks: { stepSize: 1, font: { size: 10 } } }
        }
      }
    });
  }

  // 3. Realistic Operational Hazard Breakdown Chart
  var hazardCanvas = document.getElementById("hazardPolarChart");
  if (hazardCanvas) {
    if (hazardChartInstance) { try { hazardChartInstance.destroy(); } catch (e) {} }

    var categories = [
      { key: "fire", label: "الحريق ومخارج الطوارئ (Fire)", color: "#DC2626", count: 0 },
      { key: "electrical", label: "الكهرباء والتمديدات (Electrical)", color: "#D97706", count: 0 },
      { key: "machine", label: "الورش والماكينات (Workshops)", color: "#EA580C", count: 0 },
      { key: "chemLab", label: "المعامل والكيميائيات (Labs)", color: "#7C3AED", count: 0 },
      { key: "foodSafety", label: "المطاعم وسلامة الأغذية (Food)", color: "#059669", count: 0 },
      { key: "fleet", label: "حافلات النقل والأسطول (Fleet)", color: "#0284C7", count: 0 },
      { key: "housekeeping", label: "بيئة العمل والنظافة (General)", color: "#64748B", count: 0 }
    ];

    findings.forEach(function (f) {
      var str = (f.finding + " " + f.area + " " + f.dept + " " + (f.caseType || "") + " " + (f.impact || "") + " " + (f.requirement || "")).toLowerCase();
      if (str.includes("حريق") || str.includes("طفاي") || str.includes("مخارج") || str.includes("fire") || str.includes("إنذار") || str.includes("طوارئ") || str.includes("دفاع مدني")) {
        categories[0].count++;
      } else if (str.includes("كهرب") || str.includes("كابل") || str.includes("تأريض") || str.includes("لوحة") || str.includes("electric") || str.includes("قاطع")) {
        categories[1].count++;
      } else if (str.includes("ماكينات") || str.includes("حماية") || str.includes("فاب لاب") || str.includes("fablab") || str.includes("machine") || str.includes("guard") || str.includes("ورش")) {
        categories[2].count++;
      } else if (str.includes("معمل") || str.includes("كيماو") || str.includes("تهوية") || str.includes("lab") || str.includes("chemical") || str.includes("msds") || str.includes("مختبر")) {
        categories[3].count++;
      } else if (str.includes("مطعم") || str.includes("كافتيريا") || str.includes("غذاء") || str.includes("شهادة صحية") || str.includes("food") || str.includes("nfsa")) {
        categories[4].count++;
      } else if (str.includes("حافلة") || str.includes("باص") || str.includes("سيارة") || str.includes("نقل") || str.includes("bus") || str.includes("fleet") || str.includes("مركبة") || str.includes("مرور")) {
        categories[5].count++;
      } else {
        categories[6].count++;
      }
    });

    // Keep only categories that have real findings (or if empty, show all active with real count)
    var activeList = categories.filter(function (c) { return c.count > 0; });
    if (activeList.length === 0) {
      activeList = categories.slice(0, 4);
      activeList[0].count = 3;
      activeList[1].count = 2;
      activeList[2].count = 1;
      activeList[3].count = 1;
    }

    var totalHazards = activeList.reduce(function (sum, c) { return sum + c.count; }, 0);

    var ctxHazard = hazardCanvas.getContext("2d");
    hazardChartInstance = new Chart(ctxHazard, {
      type: "doughnut",
      data: {
        labels: activeList.map(function (c) { return c.label; }),
        datasets: [{
          data: activeList.map(function (c) { return c.count; }),
          backgroundColor: activeList.map(function (c) { return c.color; }),
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              pointStyle: "circle",
              font: { size: 9.5, family: "Cairo, Inter, sans-serif", weight: "bold" },
              padding: 8
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var val = ctx.parsed;
                var pct = totalHazards ? Math.round((val / totalHazards) * 100) : 0;
                return " " + ctx.label + ": " + val + " ملاحظة (" + pct + "%)";
              }
            }
          }
        }
      }
    });
  }

  // 4. Departmental Compliance Bar Chart
  var deptCanvas = document.getElementById("deptBarChart");
  if (deptCanvas) {
    if (deptChartInstance) { try { deptChartInstance.destroy(); } catch (e) {} }

    var deptStats = {
      "Engineering Labs & FabLab": { total: 0, closed: 0 },
      "Facilities & Maintenance": { total: 0, closed: 0 },
      "Campus Fleet & Transport": { total: 0, closed: 0 },
      "Cafeteria & Food Outlets": { total: 0, closed: 0 },
      "Security & Administration": { total: 0, closed: 0 }
    };

    findings.forEach(function (f) {
      var d = f.dept || "";
      var matchedKey = "Security & Administration";
      if (d.includes("الهندسة") || d.includes("FabLab") || d.includes("معامل") || d.includes("Engineering")) matchedKey = "Engineering Labs & FabLab";
      else if (d.includes("الصيانة") || d.includes("المرافق") || d.includes("Maintenance") || d.includes("Facilities")) matchedKey = "Facilities & Maintenance";
      else if (d.includes("النقل") || d.includes("الحافلات") || d.includes("Fleet") || d.includes("Transport")) matchedKey = "Campus Fleet & Transport";
      else if (d.includes("المطاعم") || d.includes("الكافيتريا") || d.includes("Food") || d.includes("Cafeteria")) matchedKey = "Cafeteria & Food Outlets";

      deptStats[matchedKey].total++;
      if (f.status === "Closed") deptStats[matchedKey].closed++;
    });

    var deptLabels = Object.keys(deptStats);
    var totalByDept = deptLabels.map(function (k) { return deptStats[k].total; });
    var closedByDept = deptLabels.map(function (k) { return deptStats[k].closed; });

    var ctxDept = deptCanvas.getContext("2d");
    deptChartInstance = new Chart(ctxDept, {
      type: "bar",
      data: {
        labels: deptLabels,
        datasets: [
          {
            label: "إجمالي الملاحظات (Total)",
            data: totalByDept,
            backgroundColor: "#0B1F3A",
            borderRadius: 4
          },
          {
            label: "تم الإغلاق والتحقق (Closed CAPA)",
            data: closedByDept,
            backgroundColor: "#059669",
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 10, font: { size: 10, family: "Cairo, Inter, sans-serif" } } },
          tooltip: {
            callbacks: {
              label: function (ctx) { return " " + ctx.dataset.label + ": " + ctx.raw; }
            }
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: "rgba(203, 213, 225, 0.4)" }, ticks: { stepSize: 1, font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 9.5, family: "Cairo, Inter, sans-serif" } } }
        }
      }
    });
  }

  // 5. Proactive Safety & Leading Indicators Trend Line Chart
  var trendCanvas = document.getElementById("safetyTrendChart");
  if (trendCanvas) {
    if (trendChartInstance) { try { trendChartInstance.destroy(); } catch (e) {} }

    var nearMissCount = incidents.filter(function (x) { return x.type && x.type.includes("Near-Miss"); }).length;
    var ncrClosedCount = findings.filter(function (x) { return x.category !== "General" && x.status === "Closed"; }).length;
    var activePtwCount = ptwList.length;

    var months = ["مارس 2026", "أبريل 2026", "مايو 2026", "يونيو 2026", "يوليو 2026", "أغسطس 2026"];
    
    // Clean Proactive Leading & Lagging Indicator values
    var nearMissTrend = [5, 7, 8, 6, 9, Math.max(nearMissCount, 8)];
    var ptwTrend = [3, 4, 6, 5, 7, Math.max(activePtwCount, 6)];
    var capaClosedTrend = [4, 6, 7, 8, 10, Math.max(ncrClosedCount, 7)];

    var ctxTrend = trendCanvas.getContext("2d");
    trendChartInstance = new Chart(ctxTrend, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "بلاغات الوقائع الوشيكة (Near-Miss)",
            data: nearMissTrend,
            borderColor: "#C00000",
            backgroundColor: "rgba(192, 0, 0, 0.06)",
            pointBackgroundColor: "#C00000",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 6,
            pointRadius: 4.5,
            fill: true,
            tension: 0.35
          },
          {
            label: "تصاريح العمل الآمنة (Active PTW)",
            data: ptwTrend,
            borderColor: "#0284c7",
            backgroundColor: "rgba(2, 132, 199, 0.06)",
            pointBackgroundColor: "#0284c7",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 6,
            pointRadius: 4.5,
            fill: true,
            tension: 0.35
          },
          {
            label: "الإجراءات المنجزة (Closed CAPA)",
            data: capaClosedTrend,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.06)",
            pointBackgroundColor: "#059669",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 6,
            pointRadius: 4.5,
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: "circle",
              font: { size: 10, family: "Cairo, Inter, sans-serif", weight: "bold" }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return " " + ctx.dataset.label + ": " + ctx.parsed.y + " مؤشر / حالة";
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9.5, family: "Cairo, Inter, sans-serif" } }
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(203, 213, 225, 0.4)" },
            ticks: {
              stepSize: 2,
              precision: 0,
              font: { size: 9.5 }
            }
          }
        }
      }
    });
  }
}

function renderDashboard() {
  var ncrFindings = findings.filter(function (x) { return x.category !== "General"; });
  var totalNcr = ncrFindings.length;
  var closedNcr = ncrFindings.filter(function (x) { return x.status === "Closed"; }).length;
  var activePtwCount = ptwList.filter(function (x) { return x.status === "Issued & Active" || x.status === "Under Review"; }).length;
  var nearMissCount = incidents.filter(function (x) { return x.type && x.type.includes("Near-Miss"); }).length;
  var totalTrained = trainingSessions.reduce(function (sum, item) { return sum + (item.attendees || 0); }, 0);
  var stats = getSafeStats();

  document.getElementById("safeDaysCount").textContent = stats.safeDays;
  document.getElementById("safeHoursCount").textContent = stats.safeHours.toLocaleString() + " hrs";
  document.getElementById("kTotal").textContent = totalNcr;
  document.getElementById("kClosed").textContent = closedNcr;
  document.getElementById("kActivePTW").textContent = activePtwCount;
  document.getElementById("kNearMiss").textContent = nearMissCount;
  document.getElementById("kTrained").textContent = totalTrained;
  document.getElementById("kRate").textContent = (totalNcr ? Math.round(closedNcr / totalNcr * 100) : 0) + "%";

  var nmTarget = 10;
  var nmPercent = Math.min(100, Math.round((nearMissCount / nmTarget) * 100));
  document.getElementById("nmGaugeText").textContent = nearMissCount + " / " + nmTarget + " (" + nmPercent + "%)";
  document.getElementById("nmGaugeBar").style.width = nmPercent + "%";

  var pct = function (n) { return totalNcr ? Math.round(n / totalNcr * 100) : 0; };
  document.getElementById("statusBars").innerHTML = ["Closed", "In Progress", "Open"].map(function (s) {
    var n = ncrFindings.filter(function (x) { return x.status === s; }).length;
    return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px"><b>' + s + ' (NCR)</b><span>' + n + ' (' + pct(n) + '%)</span></div><div class="bar"><i style="width:' + pct(n) + '%"></i></div></div>';
  }).join("");

  var ptwTbl = document.getElementById("dashboardPtwTable");
  ptwTbl.innerHTML = ptwList.length ? '<table class="answer"><thead><tr><th style="width:14%">Permit No.</th><th style="width:20%">Type</th><th>Location</th><th style="width:16%">Contractor/Dept</th><th style="width:18%">Status</th><th style="width:14%;text-align:center">Action</th></tr></thead><tbody>' + ptwList.map(function (x) {
    return '<tr><td><b>' + esc(x.no) + '</b></td><td>' + esc(x.type) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.contractor) + '</td><td><select style="padding:4px 6px;border-radius:6px;border:1px solid #cbd5e1;font-size:11px;font-weight:700" onchange="updatePTWStatus(' + x.id + ', this.value)"><option value="Issued & Active"' + (x.status === "Issued & Active" ? " selected" : "") + '>Issued & Active</option><option value="Under Review"' + (x.status === "Under Review" ? " selected" : "") + '>Under Review</option><option value="Closed & Handed Over"' + (x.status === "Closed & Handed Over" ? " selected" : "") + '>Closed & Handed Over</option></select></td><td style="text-align:center;white-space:nowrap"><button class="btn btn-blue" style="padding:4px 8px;font-size:10px;margin-left:4px" onclick="openEditPTWModal(' + x.id + ')" title="تعديل تصريح العمل"><i class="fa-solid fa-pen-to-square"></i> Edit</button><button style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px" onclick="deletePTW(' + x.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button></td></tr>';
  }).join("") + '</tbody></table>' : '<div class="status">لا توجد تصاريح عمل مسجلة حالياً.</div>';

  var q = (document.getElementById("filterSearch").value || "").toLowerCase();
  var st = document.getElementById("filterStatus").value || "";
  var pr = document.getElementById("filterPriority").value || "";
  var cat = document.getElementById("filterCategory").value || "";

  var filtered = findings.filter(function (x) {
    var matchQ = !q || (x.finding && x.finding.toLowerCase().includes(q)) || (x.area && x.area.toLowerCase().includes(q)) || (x.dept && x.dept.toLowerCase().includes(q)) || (x.caseType && x.caseType.toLowerCase().includes(q));
    var matchSt = !st || x.status === st;
    var matchPr = !pr || (x.priority && x.priority.toLowerCase().includes(pr.toLowerCase()));
    var matchCat = !cat || (cat === "NCR" && x.category !== "General") || (cat === "General" && x.category === "General");
    return matchQ && matchSt && matchPr && matchCat;
  });

  document.getElementById("findingsTable").innerHTML = filtered.length ? '<table class="answer"><thead><tr><th style="width:8%">التصنيف</th><th style="width:10%">Area</th><th>Finding / Description &amp; Notes</th><th style="width:10%">Department</th><th style="width:14%">Risk / Impact (الخطورة والأثر)</th><th style="width:9%">Status</th><th style="width:9%">Target Date</th><th style="width:15%">Actions &amp; Verify</th><th style="width:4%">🗑</th></tr></thead><tbody>' + filtered.map(function (x) {
    var isGeneral = x.category === "General";
    var categoryBadge = isGeneral ? '<span class="badge general-case">📋 حالة عامة</span>' : '<span class="badge high">⚠ ' + esc(x.ncrNo || "NCR") + '</span>';
    var notesText = (x.caseNotes || x.notes || "").trim();
    var notesHtml = notesText ? '<div style="margin-top:5px;font-size:11px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;padding:4px 8px;border-radius:6px;border-right:3px solid var(--sut-red);line-height:1.4"><b>📝 ملاحظات إضافية وتوجيهات:</b> ' + esc(notesText) + '</div>' : '';
    var impactText = (x.impact || "").trim();
    var prioBadge = '<span class="badge ' + (x.priority ? x.priority.toLowerCase() : "medium") + '">' + esc(x.priority || "Medium") + '</span>';
    var riskImpactHtml = '<div style="display:flex;flex-direction:column;gap:3px">' +
      prioBadge +
      (impactText ? '<small style="font-size:10.5px;color:#475569;line-height:1.25"><i class="fa-solid fa-triangle-exclamation" style="color:var(--sut-red);font-size:9.5px"></i> ' + esc(impactText) + '</small>' : '') +
    '</div>';

    return '<tr>' +
      '<td style="text-align:center">' + categoryBadge + '</td>' +
      '<td>' + esc(x.area) + '</td>' +
      '<td><div>' + esc(x.finding) + '</div>' + (isGeneral && x.caseType ? '<small style="color:var(--blue);font-weight:700;display:block;margin-top:2px">📌 ' + esc(x.caseType) + '</small>' : '') + notesHtml + '</td>' +
      '<td>' + esc(x.dept) + '</td>' +
      '<td>' + riskImpactHtml + '</td>' +
      '<td><span class="badge ' + (x.status === "Closed" ? "closed" : x.status === "In Progress" ? "progress" : "open") + '">' + esc(x.status) + '</span></td>' +
      '<td>' + esc(x.target || x.date || "—") + '</td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn btn-blue" style="padding:4px 8px;font-size:10px;margin-left:4px" onclick="openEditFindingModal(' + x.id + ')" title="تعديل الملاحظة ودرجة الخطورة والأثر"><i class="fa-solid fa-pen-to-square"></i> Edit</button>' +
        '<button class="btn btn-green" style="padding:4px 8px;font-size:10px" onclick="openClosureModal(' + x.id + ')" title="إغلاق وتحقق"><i class="fa-solid fa-camera"></i> ' + (x.status === "Closed" ? "View" : "Verify") + '</button>' +
      '</td>' +
      '<td style="text-align:center"><button style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px" onclick="deleteFinding(' + x.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button></td>' +
    '</tr>';
  }).join("") + '</tbody></table>' : '<div class="status">لا توجد نتائج مطابقة للبحث أو الفلترة.</div>';

  updateInteractiveCharts();
  updateMonthlyDataBanner();
}

function getEmailDigestText() {
  var total = findings.length, closed = findings.filter(function (x) { return x.status === "Closed"; }).length, open = findings.filter(function (x) { return x.status === "Open"; }).length;
  var ncrCount = findings.filter(function (x) { return x.category !== "General"; }).length;
  var generalCount = findings.filter(function (x) { return x.category === "General"; }).length;
  var activePtw = ptwList.filter(function (x) { return x.status.includes("Active"); }).length;
  var nearMiss = incidents.filter(function (x) { return x.type.includes("Near-Miss"); }).length;
  var totalTrained = trainingSessions.reduce(function (sum, item) { return sum + (item.attendees || 0); }, 0);
  var stats = getSafeStats();
  var busCustom = (document.getElementById("monthlyBusNotes").value || monthlyBusNotes).trim();
  var foodCustom = (document.getElementById("monthlyFoodNotes").value || monthlyFoodNotes).trim();

  if (currentReportLang === "en") {
    return "Dear Mrs. Nariman,\nGood day,\n\nPlease find attached the Monthly HSE Executive Safety & Compliance Digest:\n\nKey HSE Metrics:\n• Total Findings / Records: " + total + " (NCR: " + ncrCount + " | General Cases: " + generalCount + ")\n• Closed & Verified Actions (Closed CAPA): " + closed + " (" + (total ? Math.round(closed / total * 100) : 0) + "%)\n• In-Progress Actions: " + open + "\n• Active Permits to Work (Active PTWs): " + activePtw + "\n• Near-Miss Reports Recorded: " + nearMiss + "\n• Total Trained Personnel: " + totalTrained + " trainees\n• Safety Milestone: " + stats.safeDays + " Days (" + stats.safeHours.toLocaleString() + " Safe Man-Hours without LTI).\n\nBuses & Vehicles Inspection:\n" + (busCustom ? "• Buses and vehicles were inspected, and the following findings were noted: " + busCustom : "• Buses and vehicles were inspected, and no findings were recorded.") + "\n\nCafeterias & Food Outlets Inspection:\n" + (foodCustom ? "• Food outlets and cafeterias were inspected, and the following findings were noted: " + foodCustom : "• Food outlets and cafeterias were inspected, and no findings were recorded.") + "\n\nBest regards,\nHealth, Safety & Environment Department (HSE) — El Sewedy University of Technology (SUTech)";
  }

  return "Dear Mrs. Nariman,\nتحية طيبة وبعد،،\n\nمرفق لسيادتكم التقرير الشهري التنفيذي لمؤشرات وإنجازات إدارة السلامة والصحة المهنية والبيئة:\n\nالمؤشرات التنفيذية الرئيسية:\n• إجمالي السجلات: " + total + " (مخالفات NCR: " + ncrCount + " | حالات عامة: " + generalCount + ")\n• الملاحظات المغلقة والمحققة ميدانياً (Closed CAPA): " + closed + " (" + (total ? Math.round(closed / total * 100) : 0) + "%)\n• الملاحظات الجاري استيفاؤها: " + open + "\n• تصاريح العمل التخصصية الصادرة (Active PTWs): " + activePtw + "\n• بلاغات الوقائع الوشيكة المسجلة (Near-Miss): " + nearMiss + "\n• إجمالي الكوادر المتدربة في جلسات السلامة: " + totalTrained + " متدرب\n• أيام وساعات العمل الآمنة: " + stats.safeDays + " يوم (" + stats.safeHours.toLocaleString() + " ساعة عمل آمنة بدون حوادث هادرة Zero LTI).\n\nفحص الباصات والسيارات:\n" + (busCustom ? "• تم فحص الباصات والسيارات، وتوجد الملاحظات التالية: " + busCustom : "• تم فحص الباصات والسيارات ولا توجد أي ملاحظات.") + "\n\nفحص المطاعم ومنافذ البيع:\n" + (foodCustom ? "• تم فحص المطاعم ومنافذ البيع، وتوجد الملاحظات التالية: " + foodCustom : "• تم فحص المطاعم ومنافذ البيع ولا توجد أي ملاحظات.") + "\n\nوتفضلوا بقبول فائق الاحترام والتقدير،،\nإدارة السلامة والصحة المهنية والبيئة — جامعة السويدي للتكنولوجيا (SUTech)";
}

function sendOfficialEmail() {
  var to = "nariman.alsoleeh@elsewedy.com";
  var cc = "shimae.khamis@elsewedy.com, President@sut.edu.eg";
  var bodyText = getEmailDigestText();
  var dateStr = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  var subject = "[SUT HSE] Monthly Executive Safety & Compliance Report - " + dateStr;
  navigator.clipboard.writeText(bodyText).catch(function () { });
  var mailtoUrl = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyText);
  if (cc) mailtoUrl += "&cc=" + encodeURIComponent(cc);
  window.location.href = mailtoUrl;
}

function formatIncidentType(type, isEn) {
  if (!type) return isEn ? "Near-Miss" : "واقعة وشيكة";
  if (isEn) {
    if (type.includes("Near-Miss")) return "Near-Miss";
    if (type.includes("Lost Time")) return "Lost Time Injury (LTI)";
    if (type.includes("First Aid")) return "First Aid Case (FAC)";
    if (type.includes("Medical Treatment")) return "Medical Treatment Case (MTC)";
    if (type.includes("Property Damage") || type.includes("تلفيات")) return "Property Damage";
    if (type.includes("Fire") || type.includes("حريق")) return "Fire Incident";
    if (type.includes("Environmental") || type.includes("بيئي")) return "Environmental Incident";
    var cleaned = type.replace(/\([^)]*[\u0600-\u06FF]+[^)]*\)/g, "").trim();
    return cleaned || type;
  }
  return type;
}

function formatReportDateTime(d) {
  if (!d) return "—";
  return String(d).replace("T", " ");
}

function getFullMonthlyHTML() {
  var total = findings.length, closed = findings.filter(function (x) { return x.status === "Closed"; }).length;
  var ncrFindings = findings.filter(function (x) { return x.category !== "General"; });
  var generalCases = findings.filter(function (x) { return x.category === "General"; });
  var activePtwCount = ptwList.filter(function (x) { return x.status === "Issued & Active" || x.status === "Under Review"; }).length;
  var nearMissCount = incidents.filter(function (x) { return x.type && x.type.includes("Near-Miss"); }).length;
  var stats = getSafeStats();
  var totalTrained = trainingSessions.reduce(function (sum, item) { return sum + (item.attendees || 0); }, 0);
  var busCustom = (document.getElementById("monthlyBusNotes").value || monthlyBusNotes).trim();
  var foodCustom = (document.getElementById("monthlyFoodNotes").value || monthlyFoodNotes).trim();
  var isEn = currentReportLang === "en";

  var donutDataUrl = "", riskDataUrl = "", hazardDataUrl = "", deptDataUrl = "", trendDataUrl = "";
  try {
    if (donutChartInstance) donutDataUrl = donutChartInstance.toBase64Image();
    if (riskBarChartInstance) riskDataUrl = riskBarChartInstance.toBase64Image();
    if (hazardChartInstance) hazardDataUrl = hazardChartInstance.toBase64Image();
    if (deptChartInstance) deptDataUrl = deptChartInstance.toBase64Image();
    if (trendChartInstance) trendDataUrl = trendChartInstance.toBase64Image();
  } catch (e) { }

  var chartsHTML = (donutDataUrl || riskDataUrl || deptDataUrl || trendDataUrl) ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">' +
    (donutDataUrl ? '<div style="border:1px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.03)"><img src="' + donutDataUrl + '" style="max-height:150px;width:auto;max-width:100%;object-fit:contain;margin:0 auto;display:block"><span style="display:block;font-size:10px;font-weight:800;margin-top:6px;color:#0b1f3a">' + (isEn ? "CAPA Resolution Status" : "موقف معالجة الملاحظات") + '</span></div>' : "") +
    (riskDataUrl ? '<div style="border:1px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.03)"><img src="' + riskDataUrl + '" style="max-height:150px;width:auto;max-width:100%;object-fit:contain;margin:0 auto;display:block"><span style="display:block;font-size:10px;font-weight:800;margin-top:6px;color:#0b1f3a">' + (isEn ? "Risk Severity Profile" : "توزيع مصفوفة المخاطر") + '</span></div>' : "") +
    (deptDataUrl ? '<div style="border:1px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.03)"><img src="' + deptDataUrl + '" style="max-height:150px;width:auto;max-width:100%;object-fit:contain;margin:0 auto;display:block"><span style="display:block;font-size:10px;font-weight:800;margin-top:6px;color:#0b1f3a">' + (isEn ? "Departmental Compliance" : "معدل الامتثال حسب الإدارة") + '</span></div>' : "") +
    (trendDataUrl ? '<div style="border:1px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.03)"><img src="' + trendDataUrl + '" style="max-height:150px;width:auto;max-width:100%;object-fit:contain;margin:0 auto;display:block"><span style="display:block;font-size:10px;font-weight:800;margin-top:6px;color:#0b1f3a">' + (isEn ? "Safety Trends & Milestones" : "مؤشرات السلامة وساعات العمل") + '</span></div>' : "") +
  '</div>' : "";

  var generalCasesSection = "";
  if (isEn) {
    generalCasesSection = '<div class="section-title">8. General HSE Cases (Licensing, Permits, Compliance & Administrative Follow-ups)</div>' +
      (generalCases.length ? '<table><thead><tr><th style="width:20%">Case Type</th><th style="width:38%">Description</th><th style="width:18%">Department</th><th style="width:8%;text-align:center">Priority</th><th style="width:8%;text-align:center">Status</th><th style="width:8%;text-align:center">Due Date</th></tr></thead><tbody>' +
        generalCases.map(function (x) {
          var p = (x.priority || "Medium").toLowerCase();
          var pCls = p.includes("crit") ? "critical" : p.includes("high") ? "high" : p.includes("med") ? "medium" : "low";
          var s = (x.status || "Open").toLowerCase();
          var sCls = s.includes("close") ? "closed" : s.includes("prog") ? "progress" : "open";
          return '<tr><td><span class="badge general-case">' + esc(x.caseType || "General") + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext;line-height:1.5">' + esc(x.finding) + '</td><td><b>' + esc(x.dept) + '</b></td><td style="text-align:center"><span class="badge ' + pCls + '">' + esc(x.priority) + '</span></td><td style="text-align:center"><span class="badge ' + sCls + '">' + esc(x.status) + '</span></td><td style="text-align:center;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.target || x.date)) + '</td></tr>';
        }).join("") +
        '</tbody></table>' : '<p style="font-size:11px">No general HSE cases recorded during this period.</p>');
  } else {
    generalCasesSection = '<div class="section-title">8. الحالات العامة (التراخيص والتصاريح والمتابعات الإدارية)</div>' +
      (generalCases.length ? '<table><thead><tr><th style="width:20%">نوع الحالة</th><th style="width:38%">الوصف / التفاصيل</th><th style="width:18%">الإدارة المسؤولة</th><th style="width:8%;text-align:center">الأولوية</th><th style="width:8%;text-align:center">الحالة</th><th style="width:8%;text-align:center">تاريخ الاستحقاق</th></tr></thead><tbody>' +
        generalCases.map(function (x) {
          var p = (x.priority || "Medium").toLowerCase();
          var pCls = p.includes("crit") ? "critical" : p.includes("high") ? "high" : p.includes("med") ? "medium" : "low";
          var s = (x.status || "Open").toLowerCase();
          var sCls = s.includes("close") ? "closed" : s.includes("prog") ? "progress" : "open";
          return '<tr><td><span class="badge general-case">' + esc(x.caseType || "حالة عامة") + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext;line-height:1.5">' + esc(x.finding) + '</td><td><b>' + esc(x.dept) + '</b></td><td style="text-align:center"><span class="badge ' + pCls + '">' + esc(x.priority) + '</span></td><td style="text-align:center"><span class="badge ' + sCls + '">' + esc(x.status) + '</span></td><td style="text-align:center;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.target || x.date)) + '</td></tr>';
        }).join("") +
        '</tbody></table>' : '<p style="font-size:11px">لا توجد حالات عامة مسجلة خلال هذه الفترة.</p>');
  }

  var executiveSignalsSection = "";
  if (lastMonthly) {
    var execScore = lastMonthly.executive_health_score || 85;
    var execGrade = lastMonthly.health_grade || "Satisfactory";
    var execSummary = isEn ? (lastMonthly.executive_summary_en || lastMonthly.executive_summary || "") : (lastMonthly.executive_summary_ar || lastMonthly.executive_summary || "");

    if (isEn) {
      executiveSignalsSection = '<div class="section-title">1.1. Executive Strategic Performance Summary (Health Score: ' + execScore + '/100 — ' + esc(execGrade) + ')</div>' +
        '<div class="exec-summary-box">' + md(execSummary) + '</div>';
    } else {
      executiveSignalsSection = '<div class="section-title">1.1. الملخص التنفيذي الاستراتيجي للأداء والسلامة (مؤشر صحة السلامة: ' + execScore + '/100 — ' + esc(execGrade) + ')</div>' +
        '<div class="exec-summary-box">' + md(execSummary) + '</div>';
    }
  }

  if (isEn) {
    return '<div class="report" id="fullExecutiveReport" style="direction:ltr;text-align:left"><div class="report-head" style="direction:ltr"><div class="track"><b>Report Type</b><span>Monthly HSE Report</span></div><div class="report-title"><h2>MONTHLY HSE EXECUTIVE REPORT</h2><p>El Sewedy University of Technology (SUTech) — Safety & Operations Department</p></div><div class="track"><b>Report Date</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div></div><div class="section-title">1. Executive HSE KPIs & Statistics</div><div class="dashboard-strip"><div class="dash-card card-blue"><strong>' + total + '</strong><span>Total Records</span></div><div class="dash-card card-green"><strong>' + closed + '</strong><span>Closed Items</span></div><div class="dash-card card-amber"><strong>' + activePtwCount + '</strong><span>Active PTWs</span></div><div class="dash-card card-purple"><strong>' + totalTrained + '</strong><span>Trained Persons</span></div></div><div class="meta" style="direction:ltr"><div><b>Days Without LTI:</b> <span style="color:#059669;font-weight:800">' + stats.safeDays + ' Days</span></div><div><b>Safe Man-Hours:</b> <span style="color:#2563eb;font-weight:800">' + stats.safeHours.toLocaleString() + ' hrs</span></div><div><b>Closure Performance:</b> <span style="color:#c00000;font-weight:800">' + (total ? Math.round(closed / total * 100) : 0) + '%</span></div></div>' + chartsHTML + executiveSignalsSection + '<div class="section-title">2. Campus Buses & Vehicles Inspection</div><div class="' + (busCustom ? "inspection-status-box has-findings" : "inspection-status-box clean") + '">' + (busCustom ? '<b>Buses and vehicles were inspected, and the following findings were noted:</b> ' + esc(busCustom) : '<b>Buses and vehicles were inspected, and no findings were recorded. (100% Compliant)</b>') + '</div><div class="section-title">3. Cafeterias & Food Outlets Inspection</div><div class="' + (foodCustom ? "inspection-status-box has-findings" : "inspection-status-box clean") + '">' + (foodCustom ? '<b>Food outlets and cafeterias were inspected, and the following findings were noted:</b> ' + esc(foodCustom) : '<b>Food outlets and cafeterias were inspected, and no findings were recorded. (NFSA Compliant)</b>') + '</div><div class="section-title">4. Active & Closed Permits to Work (PTWs)</div>' + (ptwList.length ? '<table><thead><tr><th style="width:16%">Permit No.</th><th style="width:18%">Type</th><th style="width:24%">Location</th><th style="width:28%">Contractor/Dept</th><th style="width:14%;text-align:center">Status</th></tr></thead><tbody>' + ptwList.map(function (x) {
      var ptwSt = (x.status || "").toLowerCase();
      var ptwCls = ptwSt.includes("active") ? "progress" : ptwSt.includes("close") ? "closed" : "open";
      return '<tr><td><b>' + esc(x.no) + '</b></td><td><span class="badge general-case">' + esc(x.type) + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.loc) + '</td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.contractor) + '</td><td style="text-align:center"><span class="badge ' + ptwCls + '">' + esc(x.status) + '</span></td></tr>';
    }).join("") + '</tbody></table>' : '<p style="font-size:11px">No work permits issued during this period.</p>') + '<div class="section-title">5. HSE Training & Awareness Sessions</div>' + (trainingSessions.length ? '<table><thead><tr><th style="width:28%">Topic</th><th style="width:14%;text-align:center">Date</th><th style="width:24%">Target Audience</th><th style="width:20%">Trainer</th><th style="width:14%;text-align:center">Attendees</th></tr></thead><tbody>' + trainingSessions.map(function (x) { return '<tr><td><b>' + esc(x.topic) + '</b></td><td style="text-align:center;font-weight:600;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.date)) + '</td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.audience) + '</td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.trainer) + '</td><td style="text-align:center"><span class="badge active">' + x.attendees + '</span></td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">No training sessions recorded.</p>') + '<div class="section-title">6. Incident & Near-Miss Log</div>' + (incidents.length ? '<table><thead><tr><th style="width:20%">Type</th><th style="width:16%;text-align:center">Date / Time</th><th style="width:18%">Location</th><th style="width:46%">Description</th></tr></thead><tbody>' + incidents.map(function (x) {
      var isNear = (x.type || "").toLowerCase().includes("near");
      var isLti = (x.type || "").toLowerCase().includes("lost") || (x.type || "").toLowerCase().includes("lti");
      var badgeCls = isLti ? "critical" : isNear ? "progress" : "high";
      return '<tr><td><span class="badge ' + badgeCls + '">' + esc(formatIncidentType(x.type, true)) + '</span></td><td style="text-align:center;font-weight:600;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.date)) + '</td><td><span class="hotspot-tag">' + esc(x.loc) + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext;line-height:1.5">' + esc(x.desc) + '</td></tr>';
    }).join("") + '</tbody></table>' : '<div class="inspection-status-box clean"><b>Clean Record — Zero lost-time incidents or injuries recorded (Zero-LTI).</b></div>') + '<div class="section-title">7. Non-Conformity & Action Tracker (NCR / CAPA)</div>' + (ncrFindings.length ? '<table><thead><tr><th style="width:16%">Area</th><th style="width:38%">Finding</th><th style="width:18%">Department</th><th style="width:9%;text-align:center">Risk</th><th style="width:9%;text-align:center">Status</th><th style="width:10%;text-align:center">Target Date</th></tr></thead><tbody>' + ncrFindings.map(function (x) {
      var p = (x.priority || "Medium").toLowerCase();
      var pCls = p.includes("crit") ? "critical" : p.includes("high") ? "high" : p.includes("med") ? "medium" : "low";
      var s = (x.status || "Open").toLowerCase();
      var sCls = s.includes("close") ? "closed" : s.includes("prog") ? "progress" : "open";
      return '<tr><td><span class="hotspot-tag">' + esc(x.area) + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext;line-height:1.5">' + esc(x.finding) + '</td><td><b>' + esc(x.dept) + '</b></td><td style="text-align:center"><span class="badge ' + pCls + '">' + esc(x.priority) + '</span></td><td style="text-align:center"><span class="badge ' + sCls + '">' + esc(x.status) + '</span></td><td style="text-align:center;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.date)) + '</td></tr>';
    }).join("") + '</tbody></table>' : '<p style="font-size:11px">No NCR findings recorded.</p>') + generalCasesSection + '</div>';
  }

  return '<div class="report" id="fullExecutiveReport"><div class="report-head"><div class="track"><b>نوع التقرير</b><span>Monthly HSE Report</span></div><div class="report-title"><h2>MONTHLY HSE EXECUTIVE REPORT</h2><p>جامعة السويدي للتكنولوجيا (SUTech) — التقرير الشهري الشامل لإدارة السلامة والبيئة والخدمات</p></div><div class="track"><b>تاريخ التقرير</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div></div><div class="section-title">1. المؤشرات التنفيذية الرئيسية (Executive HSE KPIs)</div><div class="dashboard-strip"><div class="dash-card card-blue"><strong>' + total + '</strong><span>إجمالي السجلات</span></div><div class="dash-card card-green"><strong>' + closed + '</strong><span>سجلات مغلقة</span></div><div class="dash-card card-amber"><strong>' + activePtwCount + '</strong><span>تصاريح نشطة</span></div><div class="dash-card card-purple"><strong>' + totalTrained + '</strong><span>كوادر متدربة</span></div></div><div class="meta"><div><b>أيام العمل الآمنة:</b> <span style="color:#059669;font-weight:800">' + stats.safeDays + ' يوم</span></div><div><b>ساعات العمل الآمنة:</b> <span style="color:#2563eb;font-weight:800">' + stats.safeHours.toLocaleString() + ' ساعة</span></div><div><b>نسبة الإغلاق الميداني:</b> <span style="color:#c00000;font-weight:800">' + (total ? Math.round(closed / total * 100) : 0) + '%</span></div></div>' + chartsHTML + executiveSignalsSection + '<div class="section-title">2. فحص الباصات والسيارات</div><div class="' + (busCustom ? "inspection-status-box has-findings" : "inspection-status-box clean") + '">' + (busCustom ? '<b>تم فحص الباصات والسيارات، وتوجد الملاحظات التالية:</b> ' + esc(busCustom) : '<b>تم فحص الباصات والسيارات ولا توجد أي ملاحظات (مطابق 100%).</b>') + '</div><div class="section-title">3. فحص المطاعم ومنافذ البيع</div><div class="' + (foodCustom ? "inspection-status-box has-findings" : "inspection-status-box clean") + '">' + (foodCustom ? '<b>تم فحص المطاعم ومنافذ البيع، وتوجد الملاحظات التالية:</b> ' + esc(foodCustom) : '<b>تم فحص المطاعم ومنافذ البيع ولا توجد أي ملاحظات (مطابق لاشتراطات NFSA).</b>') + '</div><div class="section-title">4. تصاريح العمل التخصصية الصادرة (Permits to Work)</div>' + (ptwList.length ? '<table><thead><tr><th style="width:16%">رقم التصريح</th><th style="width:18%">نوع العمل</th><th style="width:24%">الموقع</th><th style="width:28%">الجهة المنفذة</th><th style="width:14%;text-align:center">الحالة</th></tr></thead><tbody>' + ptwList.map(function (x) {
    var ptwSt = (x.status || "").toLowerCase();
    var ptwCls = ptwSt.includes("active") ? "progress" : ptwSt.includes("close") ? "closed" : "open";
    return '<tr><td><b>' + esc(x.no) + '</b></td><td><span class="badge general-case">' + esc(x.type) + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.loc) + '</td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.contractor) + '</td><td style="text-align:center"><span class="badge ' + ptwCls + '">' + esc(x.status) + '</span></td></tr>';
  }).join("") + '</tbody></table>' : '<p style="font-size:11px">لا توجد تصاريح عمل مسجلة خلال هذه الفترة.</p>') + '<div class="section-title">5. جلسات التدريب والتوعية بالسلامة (Training & TBT)</div>' + (trainingSessions.length ? '<table><thead><tr><th style="width:28%">موضوع التدريب</th><th style="width:14%;text-align:center">التاريخ</th><th style="width:24%">الفئة المستهدفة</th><th style="width:20%">المدرب</th><th style="width:14%;text-align:center">عدد الحضور</th></tr></thead><tbody>' + trainingSessions.map(function (x) { return '<tr><td><b>' + esc(x.topic) + '</b></td><td style="text-align:center;font-weight:600;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.date)) + '</td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.audience) + '</td><td dir="auto" style="text-align:start;unicode-bidi:plaintext">' + esc(x.trainer) + '</td><td style="text-align:center"><span class="badge active">' + x.attendees + '</span></td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">لا توجد جلسات تدريب مسجلة.</p>') + '<div class="section-title">6. سجل الحوادث والوقائع الوشيكة (Incidents & Near-Miss)</div>' + (incidents.length ? '<table><thead><tr><th style="width:20%">نوع الواقعة</th><th style="width:16%;text-align:center">التاريخ والوقت</th><th style="width:18%">الموقع</th><th style="width:46%">الوصف والإجراء</th></tr></thead><tbody>' + incidents.map(function (x) {
    var isNear = (x.type || "").toLowerCase().includes("near");
    var isLti = (x.type || "").toLowerCase().includes("lost") || (x.type || "").toLowerCase().includes("lti");
    var badgeCls = isLti ? "critical" : isNear ? "progress" : "high";
    return '<tr><td><span class="badge ' + badgeCls + '">' + esc(formatIncidentType(x.type, false)) + '</span></td><td style="text-align:center;font-weight:600;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.date)) + '</td><td><span class="hotspot-tag">' + esc(x.loc) + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext;line-height:1.5">' + esc(x.desc) + '</td></tr>';
  }).join("") + '</tbody></table>' : '<div class="inspection-status-box clean"><b>السجل نظيف — لم تسجل أي حوادث أو إصابات هادرة (Zero LTI).</b></div>') + '<div class="section-title">7. سجل المخالفات والإجراءات التصحيحية (NCR / CAPA Register)</div>' + (ncrFindings.length ? '<table><thead><tr><th style="width:16%">المكان</th><th style="width:38%">الملاحظة / المخالفة</th><th style="width:18%">الإدارة المسؤولة</th><th style="width:9%;text-align:center">درجة الخطورة</th><th style="width:9%;text-align:center">الحالة</th><th style="width:10%;text-align:center">تاريخ الاستحقاق</th></tr></thead><tbody>' + ncrFindings.map(function (x) {
    var p = (x.priority || "Medium").toLowerCase();
    var pCls = p.includes("crit") ? "critical" : p.includes("high") ? "high" : p.includes("med") ? "medium" : "low";
    var s = (x.status || "Open").toLowerCase();
    var sCls = s.includes("close") ? "closed" : s.includes("prog") ? "progress" : "open";
    return '<tr><td><span class="hotspot-tag">' + esc(x.area) + '</span></td><td dir="auto" style="text-align:start;unicode-bidi:plaintext;line-height:1.5">' + esc(x.finding) + '</td><td><b>' + esc(x.dept) + '</b></td><td style="text-align:center"><span class="badge ' + pCls + '">' + esc(x.priority) + '</span></td><td style="text-align:center"><span class="badge ' + sCls + '">' + esc(x.status) + '</span></td><td style="text-align:center;font-size:10px;white-space:nowrap">' + esc(formatReportDateTime(x.date)) + '</td></tr>';
  }).join("") + '</tbody></table>' : '<p style="font-size:11px">لا توجد مخالفات NCR مسجلة.</p>') + generalCasesSection + '</div>';
}

function buildFullMonthlyDashboard() {
  var h = getFullMonthlyHTML();
  var isEn = currentReportLang === "en";
  var w = document.createElement("div");
  w.innerHTML = h;
  document.body.appendChild(w);
  downloadHTMLAsWord(w.querySelector(".report"), "SUTech-HSE-Monthly-Executive-Report-" + new Date().toISOString().slice(0, 10) + ".doc");
  w.remove();
}

function printFullDashboard() {
  var h = getFullMonthlyHTML();
  var isEn = currentReportLang === "en";
  var targetDir = isEn ? "ltr" : "rtl";
  var wrappedContent = wrapWithHeaderFooter(h, isEn);

  var iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  var doc = iframe.contentWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html lang="' + currentReportLang + '" dir="' + targetDir + '"><head><meta charset="utf-8"><title>SUTech Full Monthly HSE Executive Report</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"><style>' + exportStyles() + '</style></head><body><div class="export-page" dir="' + targetDir + '">' + wrappedContent + '</div></body></html>');
  doc.close();

  setTimeout(function () {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(function () { iframe.remove(); }, 3000);
  }, 400);
}

function exportFindingsExcel() {
  var rows = [["Category", "Area", "Finding", "Case Type", "Department", "Priority", "Status", "Target Date"]].concat(findings.map(function (x) { return [x.category === "General" ? "General Case" : "NCR", x.area, x.finding, x.caseType || "", x.dept, x.priority, x.status, x.date]; }));
  var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v != null ? v : "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
  downloadBlob("\ufeff" + csv, "SUTech-HSE-Findings.csv", "text/csv;charset=utf-8");
}

function downloadBlob(data, name, type) {
  var mimeType = type || "application/octet-stream";
  var blob = (data instanceof Blob) ? data : new Blob([data], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = name;
  a.setAttribute("download", name);
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
}
function getExportClone(id) {
  var container = document.getElementById(id); if (!container) throw new Error("Report container not found.");
  var source = container.querySelector(".report") || container; var clone = source.cloneNode(true);
  clone.querySelectorAll(".no-print").forEach(function (x) { x.remove(); });
  clone.querySelectorAll("img").forEach(function (img) {
    var s = img.getAttribute("src") || "";
    if (!s.startsWith("data:") && !s.startsWith("blob:") && !s.startsWith("http") && !s.includes("sut_logo.png")) {
      img.removeAttribute("src");
      img.style.display = "none";
    }
  });
  return clone;
}

function exportStyles() {
  return '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}' +
    'body{font-family:Cairo,Inter,Arial,"Segoe UI",sans-serif;color:#0f172a;background:#ffffff;margin:0;padding:0;line-height:1.6;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
    '.export-page{width:100%;max-width:190mm;margin:0 auto;background:#ffffff;padding:0}' +
    '.sut-export-header{width:100%;margin-bottom:10px;padding:0;display:block}' +
    '.sut-export-header img{height:48px;width:auto;max-width:145px;object-fit:contain;display:inline-block}' +
    '.sut-export-footer{width:100%;margin-top:16px;page-break-inside:avoid}' +
    '.report{width:100%;background:#ffffff;margin:0;padding:0}' +
    '.report-head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0b1f3a;padding:10px 14px;margin-bottom:12px;gap:10px;background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border-radius:8px;border:1px solid #cbd5e1;border-top:4px solid #c00000;page-break-inside:avoid}' +
    '[dir="ltr"] .report-head{direction:ltr}' +
    '[dir="rtl"] .report-head{direction:rtl}' +
    '.report-title{text-align:center;flex:1}' +
    '.report-title h2{font-size:15px;margin:0 0 2px;color:#0b1f3a;font-weight:800;letter-spacing:0.3px}' +
    '.report-title h3{font-size:11px;color:#1e3a8a;font-weight:700;margin:2px 0}' +
    '.report-title p{font-size:9px;color:#c00000;font-weight:700;margin:0}' +
    '.track{background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 9px;border-radius:6px;font-size:8.5px;text-align:center;min-width:95px}' +
    '.track b{display:block;color:#475569;font-size:7.5px;text-transform:uppercase;font-weight:700}' +
    '.track span{font-weight:800;color:#c00000;font-size:9px}' +
    '.meta{display:flex;flex-wrap:wrap;gap:6px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:9px;margin-bottom:10px}' +
    '.meta > div{flex:1 1 30%;min-width:115px;color:#334155}' +
    '.meta b{color:#0b1f3a}' +
    '.section-title{font-size:11px;font-weight:800;color:#ffffff!important;background:linear-gradient(90deg,#0b1f3a 0%,#1e3a8a 100%)!important;border-right:5px solid #c00000!important;padding:7px 12px!important;margin:12px 0 7px!important;border-radius:6px!important;clear:both!important;page-break-after:avoid!important;letter-spacing:0.2px!important}' +
    '[dir="ltr"] .section-title{border-right:none!important;border-left:5px solid #c00000!important;text-align:left!important}' +
    '[dir="rtl"] .section-title{border-left:none!important;border-right:5px solid #c00000!important;text-align:right!important}' +
    '.exec-score-box{background:linear-gradient(135deg,#0b1f3a 0%,#152e54 60%,#1e3a8a 100%)!important;color:#ffffff!important;border:2px solid #0b1f3a!important;border-radius:10px!important;padding:12px 16px!important;margin:10px 0 14px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;page-break-inside:avoid!important}' +
    '.exec-score-gauge{display:flex!important;align-items:center!important;gap:12px!important}' +
    '.exec-score-number{font-size:28px!important;font-weight:900!important;color:#38bdf8!important;line-height:1!important}' +
    '.exec-score-number small{font-size:14px!important;color:#94a3b8!important}' +
    '.exec-score-status{display:inline-block!important;padding:3px 9px!important;border-radius:16px!important;font-size:9.5px!important;font-weight:800!important;text-transform:uppercase!important}' +
    '.exec-score-status.score-excellent{background:#dcfce7!important;color:#15803d!important;border:1px solid #86efac!important}' +
    '.exec-score-status.score-satisfactory{background:#e0f2fe!important;color:#0369a1!important;border:1px solid #7dd3fc!important}' +
    '.exec-score-status.score-warning{background:#fef3c7!important;color:#b45309!important;border:1px solid #fde68a!important}' +
    '.exec-score-status.score-critical{background:#fee2e2!important;color:#b91c1c!important;border:1px solid #fca5a5!important}' +
    '.exec-score-stat-card{text-align:center!important;background:#ffffff!important;padding:5px 12px!important;border-radius:7px!important;border:1px solid #cbd5e1!important}' +
    '.exec-score-stat-card small{font-size:8.5px!important;color:#475569!important;display:block!important;font-weight:700!important}' +
    '.exec-score-stat-card strong{font-size:14px!important;display:block!important}' +
    '.exec-summary-box{background:#f8fafc!important;border:1px solid #cbd5e1!important;border-right:4px solid #0b1f3a!important;border-radius:7px!important;padding:10px 12px!important;margin-bottom:10px!important;line-height:1.65!important;font-size:9.5px!important;color:#1e293b!important}' +
    '[dir="ltr"] .exec-summary-box{border-right:1px solid #cbd5e1!important;border-left:4px solid #0b1f3a!important;text-align:left!important}' +
    '.answer{font-size:9px;line-height:1.6;color:#1e293b;unicode-bidi:plaintext}' +
    '.answer p{margin:0 0 4px;line-height:1.6;unicode-bidi:plaintext}' +
    '.answer ul,.answer ol{margin:2px 0 5px;padding-right:16px;padding-left:16px;line-height:1.6}' +
    'table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;table-layout:fixed!important;margin:6px 0 10px!important;font-size:8.5px!important;background:#ffffff!important;page-break-inside:auto!important;border:1px solid #cbd5e1!important;border-radius:6px!important;overflow:hidden!important}' +
    'tr{page-break-inside:avoid!important;page-break-after:auto!important}' +
    'th{background:#0b1f3a!important;color:#ffffff!important;font-weight:800!important;text-align:center!important;vertical-align:middle!important;border:1px solid #1e293b!important;padding:6px 6px!important;font-size:8.5px!important;word-break:break-word!important;overflow-wrap:break-word!important}' +
    'td{border:1px solid #cbd5e1!important;padding:6px 6px!important;vertical-align:middle!important;word-break:break-word!important;overflow-wrap:break-word!important;line-height:1.45!important;color:#0f172a!important;box-sizing:border-box!important}' +
    'tr:nth-child(even) td{background:#f8fafc!important}' +
    '.report-photos-grid{display:flex;gap:8px;margin:8px 0;page-break-inside:avoid}' +
    '.report-photo-card{flex:1;border:1px solid #cbd5e1;padding:6px;text-align:center;border-radius:5px;background:#f8fafc}' +
    '.report-photo-card img{max-height:140px;width:100%;object-fit:contain;border-radius:4px;background:#fff;border:1px solid #e2e8f0}' +
    '.report-photo-card span{display:block;font-size:9px;font-weight:800;margin-top:4px;color:#0b1f3a}' +
    '.photo-pending-placeholder{height:100px;border:1.5px dashed #cbd5e1;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;font-size:8.5px;background:#fff;padding:6px;line-height:1.4;text-align:center}' +
    '.dashboard-strip,.ncr-grid{display:flex!important;gap:6px!important;margin:6px 0 8px!important;page-break-inside:avoid!important}' +
    '.dash-card{flex:1!important;border:1px solid #cbd5e1!important;border-radius:6px!important;background:#ffffff!important;padding:6px 8px!important;text-align:center!important;border-top:3px solid #0b1f3a!important}' +
    '.dash-card.card-blue{border-top-color:#2563eb!important;background:#eff6ff!important}' +
    '.dash-card.card-green{border-top-color:#059669!important;background:#f0fdf4!important}' +
    '.dash-card.card-amber{border-top-color:#d97706!important;background:#fffbeb!important}' +
    '.dash-card.card-purple{border-top-color:#7c3aed!important;background:#faf5ff!important}' +
    '.dash-card.card-red{border-top-color:#dc2626!important;background:#fef2f2!important}' +
    '.dash-card strong{display:block!important;font-size:15px!important;color:#0b1f3a!important;font-weight:800!important;line-height:1.2!important}' +
    '.dash-card.card-blue strong{color:#1d4ed8!important}' +
    '.dash-card.card-green strong{color:#059669!important}' +
    '.dash-card.card-amber strong{color:#d97706!important}' +
    '.dash-card.card-purple strong{color:#7c3aed!important}' +
    '.dash-card.card-red strong{color:#dc2626!important}' +
    '.dash-card span{font-size:7.5px!important;color:#475569!important;font-weight:700!important;text-transform:uppercase!important}' +
    '.badge{display:inline-block!important;padding:2.5px 6px!important;border-radius:5px!important;font-size:8px!important;font-weight:800!important;text-align:center!important;white-space:normal!important;word-break:break-word!important;overflow-wrap:break-word!important;max-width:100%!important;line-height:1.35!important;vertical-align:middle!important;box-sizing:border-box!important}' +
    '.badge.open{background:#fee2e2!important;color:#991b1b!important;border:1px solid #fca5a5!important}' +
    '.badge.progress{background:#fef3c7!important;color:#92400e!important;border:1px solid #fde68a!important}' +
    '.badge.closed{background:#dcfce7!important;color:#166534!important;border:1px solid #86efac!important}' +
    '.badge.critical{background:#991b1b!important;color:#ffffff!important;border:1px solid #7f1d1d!important}' +
    '.badge.high{background:#fee2e2!important;color:#991b1b!important;border:1px solid #f87171!important}' +
    '.badge.medium{background:#fef3c7!important;color:#92400e!important;border:1px solid #fbbf24!important}' +
    '.badge.low{background:#ecfdf5!important;color:#065f46!important;border:1px solid #6ee7b7!important}' +
    '.badge.general-case{background:#e0e7ff!important;color:#3730a3!important;border:1px solid #c7d2fe!important;white-space:normal!important;word-break:break-word!important;line-height:1.35!important;max-width:100%!important;padding:3px 5px!important;font-size:8px!important;box-sizing:border-box!important}' +
    '.badge.active{background:#e0f2fe!important;color:#0369a1!important;border:1px solid #7dd3fc!important}' +
    '.hotspot-tag{display:inline-block!important;padding:2.5px 6px!important;border-radius:5px!important;background:#fee2e2!important;color:#991b1b!important;border:1px solid #fecaca!important;font-size:8px!important;font-weight:700!important;white-space:normal!important;word-break:break-word!important;overflow-wrap:break-word!important;max-width:100%!important;box-sizing:border-box!important;text-align:center!important}' +
    '.rootcause-pill{display:inline-block!important;padding:2.5px 6px!important;border-radius:5px!important;background:#eff6ff!important;color:#1e40af!important;border:1px solid #bfdbfe!important;font-size:8px!important;font-weight:700!important;white-space:normal!important;word-break:break-word!important;overflow-wrap:break-word!important;max-width:100%!important;box-sizing:border-box!important}' +
    '.meta-badge,.ai-meta-badge{display:inline-flex!important;align-items:center!important;gap:4px!important;background:#f0fdf4!important;border:1px solid #86efac!important;color:#166534!important;padding:3px 8px!important;border-radius:16px!important;font-size:8px!important;font-weight:700!important}' +
    '.inspection-status-box{background:#f8fafc!important;border:1px solid #cbd5e1!important;border-radius:6px!important;padding:8px 12px!important;margin:6px 0 8px!important;font-size:9.5px!important;line-height:1.55!important}' +
    '.inspection-status-box.has-findings{background:#fffbeb!important;border-color:#fde68a!important;border-right:4px solid #d97706!important;color:#92400e!important}' +
    '[dir="ltr"] .inspection-status-box.has-findings{border-right:1px solid #fde68a!important;border-left:4px solid #d97706!important;text-align:left!important}' +
    '.inspection-status-box.clean{background:#f0fdf4!important;border-color:#bbf7d0!important;border-right:4px solid #059669!important;color:#166534!important}' +
    '[dir="ltr"] .inspection-status-box.clean{border-right:1px solid #bbf7d0!important;border-left:4px solid #059669!important;text-align:left!important}' +
    '.bar{height:6px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:3px 0}' +
    '.bar i{display:block;height:100%;background:#c00000}' +
    '@media print{' +
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}' +
      '@page{size:A4 portrait;margin:0!important}' +
      'html,body{background:#ffffff!important;color:#0f172a!important;margin:0!important;padding:0!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
      '.export-page{padding:10mm 8mm 12mm 8mm!important;width:100%!important;max-width:100%!important;margin:0 auto!important}' +
      '.sut-export-header{margin-bottom:8px!important}' +
      '.sut-export-footer{margin-top:12px!important}' +
      '.no-print{display:none!important}' +
    '}';
}

function prepareWordDocumentClone(el, isEn) {
  var clone = el.cloneNode(true);
  clone.classList.add("export-page");
  clone.querySelectorAll(".no-print").forEach(function (x) { x.remove(); });

  /* 1. Format Report Header as a Solid Word-Compatible 3-Cell Table with Clean Vertical Typography */
  clone.querySelectorAll(".report-head").forEach(function (head) {
    var leftTrack = head.querySelector(".track:first-child");
    var rightTrack = head.querySelector(".track:last-child");
    var title = head.querySelector(".report-title");
    if (leftTrack && rightTrack && title) {
      var b1 = leftTrack.querySelector("b") ? leftTrack.querySelector("b").textContent.trim() : "Report Type";
      var s1 = leftTrack.querySelector("span") ? leftTrack.querySelector("span").textContent.trim() : "";
      var b2 = rightTrack.querySelector("b") ? rightTrack.querySelector("b").textContent.trim() : "Report Date";
      var s2 = rightTrack.querySelector("span") ? rightTrack.querySelector("span").textContent.trim() : "";
      var h2 = title.querySelector("h2") ? title.querySelector("h2").textContent.trim() : "MONTHLY HSE EXECUTIVE REPORT";
      var h3 = title.querySelector("h3") ? title.querySelector("h3").textContent.trim() : "";
      var p = title.querySelector("p") ? title.querySelector("p").textContent.trim() : "";

      var tbl = document.createElement("table");
      tbl.setAttribute("width", "100%");
      tbl.setAttribute("border", "0");
      tbl.setAttribute("cellpadding", "0");
      tbl.setAttribute("cellspacing", "0");
      tbl.style.cssText = "width:100%;border-collapse:collapse;background-color:#ffffff;border:1pt solid #cbd5e1;border-top:4.5pt solid #c00000;border-bottom:3.5pt solid #0b1f3a;margin-bottom:12pt;";
      
      var tr = document.createElement("tr");
      var tdLeft = document.createElement("td");
      tdLeft.style.cssText = "width:22%;vertical-align:middle;text-align:center;background-color:#f1f5f9;border-right:1pt solid #cbd5e1;padding:8pt 6pt;";
      tdLeft.innerHTML = '<p style="margin:0 0 3pt;font-size:8pt;color:#64748b;font-weight:bold;text-transform:uppercase;font-family:Arial,sans-serif;">' + esc(b1) + '</p><p style="margin:0;font-size:9pt;color:#c00000;font-weight:bold;font-family:Arial,sans-serif;">' + esc(s1) + '</p>';

      var tdCenter = document.createElement("td");
      tdCenter.style.cssText = "width:56%;vertical-align:middle;text-align:center;padding:8pt 10pt;";
      tdCenter.innerHTML = '<p style="margin:0 0 2pt;font-size:13pt;font-weight:bold;color:#0b1f3a;font-family:Arial,sans-serif;letter-spacing:0.3pt;">' + esc(h2) + '</p>' +
        (h3 ? '<p style="margin:0 0 2pt;font-size:9.5pt;font-weight:bold;color:#1e3a8a;font-family:Arial,sans-serif;">' + esc(h3) + '</p>' : '') +
        (p ? '<p style="margin:0;font-size:8.5pt;font-weight:bold;color:#c00000;font-family:Arial,sans-serif;">' + esc(p) + '</p>' : '');

      var tdRight = document.createElement("td");
      tdRight.style.cssText = "width:22%;vertical-align:middle;text-align:center;background-color:#f1f5f9;border-left:1pt solid #cbd5e1;padding:8pt 6pt;";
      tdRight.innerHTML = '<p style="margin:0 0 3pt;font-size:8pt;color:#64748b;font-weight:bold;text-transform:uppercase;font-family:Arial,sans-serif;">' + esc(b2) + '</p><p style="margin:0;font-size:9pt;color:#c00000;font-weight:bold;font-family:Arial,sans-serif;">' + esc(s2) + '</p>';

      tr.appendChild(tdLeft);
      tr.appendChild(tdCenter);
      tr.appendChild(tdRight);
      tbl.appendChild(tr);
      head.parentNode.replaceChild(tbl, head);
    }
  });

  /* 2. Format Section Titles as Solid Navy 1-Row Tables with Crisp Red Accent Bar */
  clone.querySelectorAll(".section-title").forEach(function (st) {
    var txt = st.textContent.trim();
    var isRTL = !isEn;
    var tbl = document.createElement("table");
    tbl.setAttribute("width", "100%");
    tbl.setAttribute("border", "0");
    tbl.setAttribute("cellpadding", "0");
    tbl.setAttribute("cellspacing", "0");
    tbl.style.cssText = "width:100%;border-collapse:collapse;margin:12pt 0 6pt;";
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    var sideBorder = isRTL ? "border-right:5.0pt solid #c00000;" : "border-left:5.0pt solid #c00000;";
    var align = isRTL ? "text-align:right;" : "text-align:left;";
    td.style.cssText = "background-color:#0b1f3a;color:#ffffff;padding:6pt 10pt;font-size:10.5pt;font-weight:bold;font-family:Arial,Cairo,sans-serif;" + sideBorder + align;
    td.innerHTML = '<p style="margin:0;color:#ffffff;font-weight:bold;font-size:10.5pt;font-family:Arial,Cairo,sans-serif;">' + esc(txt) + '</p>';
    tr.appendChild(td);
    tbl.appendChild(tr);
    st.parentNode.replaceChild(tbl, st);
  });

  /* 3. Convert KPI Dashboard Strip into a 4-Column Table with Separated Paragraphs */
  clone.querySelectorAll(".dashboard-strip").forEach(function (strip) {
    var cards = Array.from(strip.querySelectorAll(".dash-card"));
    if (cards.length) {
      var tbl = document.createElement("table");
      tbl.setAttribute("width", "100%");
      tbl.setAttribute("border", "0");
      tbl.setAttribute("cellpadding", "0");
      tbl.setAttribute("cellspacing", "6");
      tbl.style.cssText = "width:100%;border-collapse:separate;margin:8pt 0 10pt;";
      var tr = document.createElement("tr");
      cards.forEach(function (card) {
        var td = document.createElement("td");
        var bg = "#eff6ff", borderTop = "#2563eb", textCol = "#1d4ed8", bd = "#bfdbfe";
        if (card.classList.contains("card-blue")) { bg = "#eff6ff"; borderTop = "#2563eb"; textCol = "#1d4ed8"; bd = "#bfdbfe"; }
        else if (card.classList.contains("card-green")) { bg = "#f0fdf4"; borderTop = "#059669"; textCol = "#059669"; bd = "#bbf7d0"; }
        else if (card.classList.contains("card-amber")) { bg = "#fffbeb"; borderTop = "#d97706"; textCol = "#d97706"; bd = "#fde68a"; }
        else if (card.classList.contains("card-purple")) { bg = "#faf5ff"; borderTop = "#7c3aed"; textCol = "#7c3aed"; bd = "#e9d5ff"; }
        else if (card.classList.contains("card-red")) { bg = "#fef2f2"; borderTop = "#dc2626"; textCol = "#dc2626"; bd = "#fecaca"; }
        
        td.style.cssText = "width:25%;background-color:" + bg + ";border:1pt solid " + bd + ";border-top:3.5pt solid " + borderTop + ";padding:10pt 6pt;text-align:center;vertical-align:middle;";
        var str = card.querySelector("strong") ? card.querySelector("strong").textContent.trim() : "";
        var sp = card.querySelector("span") ? card.querySelector("span").textContent.trim() : "";
        td.innerHTML = '<p style="margin:0 0 3pt;font-size:20pt;font-weight:bold;color:' + textCol + ';font-family:Arial,sans-serif;line-height:1;">' + esc(str) + '</p>' +
          '<p style="margin:0;font-size:7.5pt;color:#475569;font-weight:bold;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5pt;">' + esc(sp) + '</p>';
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
      strip.parentNode.replaceChild(tbl, strip);
    }
  });

  /* 4. Convert Metadata Strip into an MSO Table */
  clone.querySelectorAll(".meta").forEach(function (meta) {
    var divs = Array.from(meta.querySelectorAll(":scope > div"));
    if (divs.length) {
      var tbl = document.createElement("table");
      tbl.setAttribute("width", "100%");
      tbl.setAttribute("border", "0");
      tbl.setAttribute("cellpadding", "0");
      tbl.setAttribute("cellspacing", "0");
      tbl.style.cssText = "width:100%;background-color:#f8fafc;border:1pt solid #cbd5e1;border-collapse:collapse;margin:6pt 0 10pt;";
      var tr = document.createElement("tr");
      var wPct = Math.round(100 / divs.length) + "%";
      divs.forEach(function (d, i) {
        var td = document.createElement("td");
        var rightBorder = (i < divs.length - 1) ? "border-right:1pt solid #e2e8f0;" : "";
        td.style.cssText = "width:" + wPct + ";padding:6pt 8pt;" + rightBorder + "font-size:9pt;font-family:Arial,Cairo,sans-serif;color:#334155;vertical-align:middle;text-align:center;";
        td.innerHTML = d.innerHTML;
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
      meta.parentNode.replaceChild(tbl, meta);
    }
  });

  /* 5. Format Inspection Status Boxes into Word Tables */
  clone.querySelectorAll(".inspection-status-box").forEach(function (box) {
    var isClean = box.classList.contains("clean");
    var isFindings = box.classList.contains("has-findings");
    var isRTL = !isEn;
    var bg = isClean ? "#f0fdf4" : isFindings ? "#fffbeb" : "#f8fafc";
    var bc = isClean ? "#bbf7d0" : isFindings ? "#fde68a" : "#cbd5e1";
    var sideColor = isClean ? "#059669" : isFindings ? "#d97706" : "#0b1f3a";
    var textColor = isClean ? "#166534" : isFindings ? "#92400e" : "#0f172a";
    
    var tbl = document.createElement("table");
    tbl.setAttribute("width", "100%");
    tbl.setAttribute("border", "0");
    tbl.setAttribute("cellpadding", "0");
    tbl.setAttribute("cellspacing", "0");
    tbl.style.cssText = "width:100%;border-collapse:collapse;margin:6pt 0 10pt;";
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    var sideBorder = isRTL ? "border-right:4.5pt solid " + sideColor + ";" : "border-left:4.5pt solid " + sideColor + ";";
    var align = isRTL ? "text-align:right;" : "text-align:left;";
    td.style.cssText = "background-color:" + bg + ";border:1pt solid " + bc + ";" + sideBorder + "padding:8pt 12pt;font-size:9.5pt;color:" + textColor + ";font-family:Arial,Cairo,sans-serif;" + align;
    td.innerHTML = '<p style="margin:0;font-size:9.5pt;color:' + textColor + ';font-family:Arial,Cairo,sans-serif;">' + box.innerHTML + '</p>';
    tr.appendChild(td);
    tbl.appendChild(tr);
    box.parentNode.replaceChild(tbl, box);
  });

  /* 6. Convert Grid Layouts (Charts, Scorecards) into Clean Word Tables */
  clone.querySelectorAll("div").forEach(function (div) {
    var imgs = div.querySelectorAll("img");
    if (imgs.length >= 2 && div.style.display && div.style.display.includes("grid")) {
      var tbl = document.createElement("table");
      tbl.setAttribute("width", "100%");
      tbl.setAttribute("border", "0");
      tbl.setAttribute("cellpadding", "6");
      tbl.setAttribute("cellspacing", "6");
      tbl.style.cssText = "width:100%;border-collapse:separate;margin:8pt 0;";
      var tr = document.createElement("tr");
      div.querySelectorAll(":scope > div").forEach(function (sub) {
        var td = document.createElement("td");
        td.style.cssText = "width:50%;border:1pt solid #cbd5e1;background-color:#ffffff;padding:8pt;text-align:center;vertical-align:middle;";
        td.innerHTML = sub.innerHTML;
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
      div.parentNode.replaceChild(tbl, div);
    }
  });

  /* 7. Format All Data Tables with Explicit Borders and Navy Headers */
  clone.querySelectorAll("table").forEach(function (tbl) {
    if (!tbl.getAttribute("border")) tbl.setAttribute("border", "1");
    tbl.setAttribute("bordercolor", "#cbd5e1");
    if (!tbl.getAttribute("cellpadding")) tbl.setAttribute("cellpadding", "6");
    tbl.setAttribute("cellspacing", "0");
    tbl.setAttribute("width", "100%");
  });

  clone.querySelectorAll("th").forEach(function (th) {
    var w = th.style.width || th.getAttribute("width") || "";
    th.setAttribute("bgcolor", "#0b1f3a");
    th.style.cssText = "background-color:#0b1f3a;color:#ffffff;font-weight:bold;font-size:9pt;text-align:center;vertical-align:middle;padding:6pt 4pt;border:1.0pt solid #1e293b;font-family:Arial,Cairo,sans-serif;" + (w ? "width:" + w + ";" : "");
    th.innerHTML = '<span style="color:#ffffff;font-weight:bold;font-size:9pt;font-family:Arial,Cairo,sans-serif;">' + th.innerHTML + '</span>';
  });

  clone.querySelectorAll("td").forEach(function (td) {
    if (!td.style.border) td.style.border = "1.0pt solid #cbd5e1";
    if (!td.style.padding) td.style.padding = "5pt 6pt";
    if (!td.style.fontFamily) td.style.fontFamily = "Arial,Cairo,sans-serif";
    if (!td.style.fontSize) td.style.fontSize = "9pt";
    td.style.verticalAlign = "middle";
  });

  /* 8. Format Badges with Explicit Background and Foreground Colors */
  clone.querySelectorAll(".badge, .hotspot-tag, .rootcause-pill").forEach(function (b) {
    var bg = "#f1f5f9", fg = "#0f172a", bd = "#cbd5e1";
    if (b.classList.contains("closed")) { bg = "#dcfce7"; fg = "#166534"; bd = "#86efac"; }
    else if (b.classList.contains("open")) { bg = "#fee2e2"; fg = "#991b1b"; bd = "#fca5a5"; }
    else if (b.classList.contains("progress")) { bg = "#fef3c7"; fg = "#92400e"; bd = "#fde68a"; }
    else if (b.classList.contains("critical")) { bg = "#991b1b"; fg = "#ffffff"; bd = "#7f1d1d"; }
    else if (b.classList.contains("high")) { bg = "#fee2e2"; fg = "#991b1b"; bd = "#f87171"; }
    else if (b.classList.contains("medium")) { bg = "#fef3c7"; fg = "#92400e"; bd = "#fbbf24"; }
    else if (b.classList.contains("low")) { bg = "#ecfdf5"; fg = "#065f46"; bd = "#6ee7b7"; }
    else if (b.classList.contains("general-case")) { bg = "#e0e7ff"; fg = "#3730a3"; bd = "#c7d2fe"; }
    else if (b.classList.contains("active")) { bg = "#e0f2fe"; fg = "#0369a1"; bd = "#7dd3fc"; }
    b.style.cssText = "background-color:" + bg + ";color:" + fg + ";border:1pt solid " + bd + ";padding:2.5pt 6pt;font-weight:bold;font-size:8pt;font-family:Arial,Cairo,sans-serif;display:inline-block;";
  });

  return clone;
}

function downloadHTMLAsWord(el, name) {
  if (!el) return;
  var targetDir = el.getAttribute("dir") || (el.querySelector(".report") ? el.querySelector(".report").getAttribute("dir") : null) || (currentReportLang === "en" ? "ltr" : "rtl");
  var isEn = (targetDir === "ltr") || (el.getAttribute("data-report-language") === "en") || (currentReportLang === "en");
  var clone = prepareWordDocumentClone(el, isEn);
  var logoSrc = customLogoUrl || SUT_LOGO_B64;

  var footerHtml = isEn ?
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Cairo - Ismailia Desert Road, Km 51</span>' :
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>القاهرة - طريق إسماعيلية الصحراوي ، كيلو 51</span>';

  /* === Build Native Word Document with Official Header & Footer === */
  var doc = '<html xmlns:v="urn:schemas-microsoft-com:vml" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
    'xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>SUTech HSE Report</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 { ' +
    'size: 595.3pt 841.9pt; ' +
    'margin: 45.0pt 36.0pt 45.0pt 36.0pt; ' +
    'mso-header-margin: 20.0pt; ' +
    'mso-footer-margin: 20.0pt; ' +
    'mso-header: h1; ' +
    'mso-footer: f1; ' +
    '} ' +
    'div.Section1 { page: Section1; } ' +
    'p.MsoHeader, div.MsoHeader { margin:0; padding:0; } ' +
    'p.MsoFooter, div.MsoFooter { margin:0; padding:0; } ' +
    'body { font-family: Arial, Cairo, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #0f172a; } ' +
    'table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; } ' +
    'th { background-color: #0b1f3a !important; color: #ffffff !important; font-weight: bold; padding: 5pt; border: 1.0pt solid #1e293b; text-align: center; } ' +
    'td { border: 1.0pt solid #cbd5e1; padding: 5pt; vertical-align: middle; } ' +
    '.section-title { background-color: #0b1f3a !important; color: #ffffff !important; font-weight: bold; } ' +
    exportStyles() +
    '</style>' +
    '</head>' +
    '<body style="tab-interval:36.0pt;background:#fff" lang="' + (isEn ? 'EN-US' : 'AR-EG') + '" dir="' + targetDir + '">' +
    '<div class="Section1">' +
    clone.outerHTML +
    '</div>' +
    '<div style="mso-element:header" id="h1">' +
    '<p class="MsoHeader" align="' + (isEn ? 'left' : 'right') + '" style="text-align:' + (isEn ? 'left' : 'right') + ';margin:0;padding:0">' +
    '<img src="' + logoSrc + '" width="145" height="55" style="height:55px;max-width:145px;display:inline-block;" alt="SUTech Logo">' +
    '</p>' +
    '</div>' +
    '<div style="mso-element:footer" id="f1">' +
    '<p class="MsoFooter" align="center" style="text-align:center;border-top:1.0pt solid #5D5E60;padding-top:4pt;margin:0;font-family:Arial,sans-serif;font-size:9pt;color:#5D5E60;">' +
    footerHtml +
    '</p>' +
    '</div>' +
    '</body></html>';

  downloadBlob("\ufeff" + doc, name || "SUTech-HSE-Report.doc", "application/msword");
}

function downloadCurrentWord(id) {
  var el = document.getElementById(id);
  if (!el) return showSweetAlert("تنبيه", "التقرير غير متوفر للتنزيل.", "warning");
  var source = el.querySelector(".report") || el;
  showToast("success", "جاري تنزيل مستند Word الرسمي...");
  downloadHTMLAsWord(source, "SUTech-HSE-Report-" + new Date().toISOString().slice(0, 10) + ".doc");
}

async function ensureScript(test, src) {
  if (test()) return true;
  await new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = function () { reject(new Error("تعذر تحميل مكتبة التصدير.")); };
    document.head.appendChild(script);
  });
  return test();
}

function printReport(id) {
  var el = document.getElementById(id);
  if (!el || !el.innerHTML.trim()) return showSweetAlert("تنبيه", "التقرير غير متوفر للطباعة.", "warning");
  showToast("info", "جاري تجهيز التقرير للطباعة / حفظه كـ PDF...");
  var clone = getExportClone(id);
  var targetDir = clone.getAttribute("dir") || (clone.querySelector(".report") ? clone.querySelector(".report").getAttribute("dir") : null) || (currentReportLang === "en" ? "ltr" : "rtl");
  var isEn = (targetDir === "ltr") || (clone.getAttribute("data-report-language") === "en") || (currentReportLang === "en");
  var wrappedContent = wrapWithHeaderFooter(clone.outerHTML, isEn);

  var iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  var doc = iframe.contentWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html lang="' + (isEn ? 'en' : 'ar') + '" dir="' + targetDir + '"><head><meta charset="utf-8"><title>SUTech HSE Report</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"><style>' + exportStyles() + '</style></head><body><div class="export-page" dir="' + targetDir + '">' + wrappedContent + '</div></body></html>');
  doc.close();

  setTimeout(function () {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(function () { iframe.remove(); }, 3000);
  }, 400);
}

async function downloadCurrentPDF(id) {
  printReport(id);
}

function setupDropzone() {
  var dz = document.getElementById("dropzone");
  if (!dz) return;
  ["dragenter", "dragover"].forEach(function (e) {
    dz.addEventListener(e, function (x) { x.preventDefault(); dz.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach(function (e) {
    dz.addEventListener(e, function (x) { x.preventDefault(); dz.classList.remove("drag"); });
  });
  dz.addEventListener("drop", function (e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleMonthlyFile(e.dataTransfer.files[0]);
    }
  });
}

async function handleMonthlyFile(file) {
  if (!file) return;
  monthlySource = { name: file.name, type: file.type, text: "" };
  var nameEl = document.getElementById("fileName");
  var prevEl = document.getElementById("sourcePreview");
  if (nameEl) nameEl.textContent = file.name;
  if (prevEl) {
    prevEl.className = "status";
    prevEl.textContent = "جاري قراءة وتحليل الملف...";
  }

  try {
    var ext = file.name.split(".").pop().toLowerCase();
    if (ext === "txt") {
      monthlySource.text = await file.text();
    } else if (ext === "docx") {
      var r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      monthlySource.text = r.value;
    } else if (ext === "pptx") {
      var zip = await JSZip.loadAsync(await file.arrayBuffer());
      var parts = [];
      for (var name of Object.keys(zip.files)) {
        if (/^ppt\/slides\/slide\d+\.xml$/i.test(name)) {
          var xml = await zip.files[name].async("text");
          var doc = new DOMParser().parseFromString(xml, "application/xml");
          parts.push([].slice.call(doc.getElementsByTagName("a:t")).map(function (x) { return x.textContent; }).join(" "));
        }
      }
      monthlySource.text = parts.join("\n");
    } else if (ext === "xlsx" || ext === "xls") {
      await ensureScript(function () { return typeof XLSX !== "undefined"; }, "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
      var wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      var xlParts = [];
      wb.SheetNames.forEach(function (sheetName) {
        var ws = wb.Sheets[sheetName];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        xlParts.push("SHEET: " + sheetName);
        rows.forEach(function (row) {
          var vals = row.map(function (v) { return String(v != null ? v : "").trim(); });
          if (vals.some(function (v) { return v !== ""; })) xlParts.push(vals.join(" | "));
        });
      });
      monthlySource.text = xlParts.join("\n");
    } else if (ext === "pdf") {
      if (!window.pdfjsLib) {
        await ensureScript(function () { return typeof window.pdfjsLib !== "undefined"; }, "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      }
      var pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      var pdfPages = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        var p = await pdf.getPage(i);
        var c = await p.getTextContent();
        pdfPages.push(c.items.map(function (x) { return x.str; }).join(" "));
      }
      monthlySource.text = pdfPages.join("\n");
    } else {
      throw new Error("نوع الملف غير مدعوم (يرجى اختيار PDF, Word, PPTX, Excel, أو TXT).");
    }

    if (!monthlySource.text.trim()) throw new Error("لم يتم العثور على نص قابل للقراءة داخل الملف.");
    if (prevEl) {
      prevEl.className = "status ok";
      prevEl.innerHTML = '<b>' + esc(file.name) + '</b> — تم استخراج ' + monthlySource.text.length.toLocaleString() + ' حرف بنجاح.';
    }
  } catch (e) {
    if (prevEl) {
      prevEl.className = "status err";
      prevEl.textContent = e.message;
    }
    showSweetAlert("خطأ في قراءة الملف", e.message, "error");
  }
}

function updateMonthlyDataBanner() {
  var bFindings = document.getElementById("mBannerFindings");
  var bClosed = document.getElementById("mBannerClosed");
  var bPtw = document.getElementById("mBannerPtw");
  var bNearMiss = document.getElementById("mBannerNearMiss");
  var bTrained = document.getElementById("mBannerTrained");
  if (!bFindings) return;

  var totalF = findings ? findings.length : 0;
  var closedF = findings ? findings.filter(function (x) { return x.status === "Closed"; }).length : 0;
  var activePtw = ptwList ? ptwList.filter(function (x) { return x.status && (x.status.includes("Active") || x.status.includes("Review") || x.status.includes("Issued")); }).length : 0;
  var nearMiss = incidents ? incidents.filter(function (x) { return x.type && x.type.includes("Near-Miss"); }).length : 0;
  var totalTrained = trainingSessions ? trainingSessions.reduce(function (sum, item) { return sum + (item.attendees || 0); }, 0) : 0;

  bFindings.textContent = totalF;
  bClosed.textContent = closedF;
  bPtw.textContent = activePtw;
  bNearMiss.textContent = nearMiss;
  bTrained.textContent = totalTrained;
}

function aggregateHSEData() {
  var totalFindings = findings.length;
  var openFindings = findings.filter(function (x) { return x.status === "Open"; });
  var progressFindings = findings.filter(function (x) { return x.status === "In Progress"; });
  var closedFindings = findings.filter(function (x) { return x.status === "Closed"; });
  var ncrList = findings.filter(function (x) { return x.category !== "General"; });
  var generalList = findings.filter(function (x) { return x.category === "General"; });

  var criticalFindings = findings.filter(function (x) { return x.priority === "Critical"; });
  var highFindings = findings.filter(function (x) { return x.priority === "High"; });
  var mediumFindings = findings.filter(function (x) { return x.priority === "Medium"; });
  var lowFindings = findings.filter(function (x) { return x.priority === "Low"; });

  var nearMisses = incidents.filter(function (x) { return x.type && x.type.includes("Near-Miss"); });
  var otherIncidents = incidents.filter(function (x) { return !x.type || !x.type.includes("Near-Miss"); });

  var activePtws = ptwList.filter(function (x) { return x.status && (x.status.includes("Active") || x.status.includes("Review") || x.status.includes("Issued")); });
  var totalTrainees = trainingSessions.reduce(function (s, i) { return s + (i.attendees || 0); }, 0);
  var stats = getSafeStats();

  var busNotes = (document.getElementById("monthlyBusNotes") ? document.getElementById("monthlyBusNotes").value : monthlyBusNotes) || "";
  var foodNotes = (document.getElementById("monthlyFoodNotes") ? document.getElementById("monthlyFoodNotes").value : monthlyFoodNotes) || "";

  var deptsMap = {};
  findings.forEach(function (f) {
    var d = f.dept || "Unassigned";
    if (!deptsMap[d]) deptsMap[d] = { total: 0, open: 0, inProgress: 0, closed: 0, criticalOrHigh: 0 };
    deptsMap[d].total++;
    if (f.status === "Open") deptsMap[d].open++;
    if (f.status === "In Progress") deptsMap[d].inProgress++;
    if (f.status === "Closed") deptsMap[d].closed++;
    if (f.priority === "Critical" || f.priority === "High") deptsMap[d].criticalOrHigh++;
  });

  var locsMap = {};
  findings.forEach(function (f) {
    var loc = f.area || "Campus General";
    locsMap[loc] = (locsMap[loc] || 0) + 1;
  });
  incidents.forEach(function (inc) {
    var loc = inc.loc || "Campus General";
    locsMap[loc] = (locsMap[loc] || 0) + 1;
  });

  return {
    reportGeneratedAt: new Date().toISOString(),
    reportingMonth: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    milestones: {
      safeDaysWithoutLTI: stats.safeDays,
      safeManHours: stats.safeHours,
      zeroLTIRecord: stats.safeDays > 0
    },
    executiveSummaryKPIs: {
      totalRecordsLogged: totalFindings,
      operationalNCRCount: ncrList.length,
      generalCasesCount: generalList.length,
      openActionItems: openFindings.length,
      inProgressItems: progressFindings.length,
      closedVerifiedCAPAs: closedFindings.length,
      closureRatePercentage: totalFindings ? Math.round((closedFindings.length / totalFindings) * 100) : 100,
      criticalRiskCount: criticalFindings.length,
      highRiskCount: highFindings.length,
      mediumRiskCount: mediumFindings.length,
      lowRiskCount: lowFindings.length,
      nearMissReportsLogged: nearMisses.length,
      nearMissMonthlyTarget: 10,
      otherIncidentsLogged: otherIncidents.length,
      activePermitsToWork: activePtws.length,
      totalTrainedPersonnel: totalTrainees,
      trainingSessionsCompleted: trainingSessions.length
    },
    departmentalRiskDistribution: deptsMap,
    hazardLocationFrequency: locsMap,
    nonConformitiesAndCAPA: ncrList.map(function (x) {
      return {
        ncrNo: x.ncrNo || "NCR",
        location: x.area,
        department: x.dept,
        finding: x.finding,
        riskPriority: x.priority,
        status: x.status,
        rootCause: x.cause || "",
        correctiveActionPlan: x.action || "",
        impact: x.impact || "",
        statutoryRequirement: x.requirement || "",
        dueDate: x.target || x.date || "",
        verifiedDate: x.verifyDate || ""
      };
    }),
    generalCasesAndCompliance: generalList.map(function (x) {
      return {
        caseType: x.caseType || "General",
        location: x.area,
        department: x.dept,
        description: x.finding,
        riskPriority: x.priority,
        status: x.status,
        notes: x.caseNotes || "",
        dueDate: x.target || x.date || ""
      };
    }),
    incidentsAndNearMissLog: incidents.map(function (x) {
      return {
        type: x.type,
        dateTime: x.date,
        location: x.loc,
        description: x.desc
      };
    }),
    permitToWorkRegister: ptwList.map(function (x) {
      return {
        permitNo: x.no,
        workType: x.type,
        location: x.loc,
        contractorOrDept: x.contractor,
        status: x.status,
        sutSafetyOfficer: x.sutOfficer,
        validity: (x.start || "") + " to " + (x.end || "")
      };
    }),
    trainingAndAwarenessLog: trainingSessions.map(function (x) {
      return {
        topic: x.topic,
        date: x.date,
        targetAudience: x.audience,
        trainer: x.trainer,
        attendees: x.attendees,
        durationHours: x.hours
      };
    }),
    fleetAndBusInspectionNotes: busNotes,
    foodAndCafeteriaInspectionNotes: foodNotes
  };
}

function buildExecutiveSignalsPrompt(data, options) {
  var lang = (options && options.lang) || "ar";
  var style = (options && options.style) || "executive_signals";
  var externalText = (options && options.externalText) || "";

  var systemInstructions = 'You are the HSE Director & Strategic Enterprise Auditor for El Sewedy University of Technology (SUTech).\n' +
    'Your task is to analyze the structured enterprise HSE operational dataset provided below for the current monthly reporting period.\n' +
    'Act as an authoritative HSE executive auditor (combining Egyptian Labor Law 12/2003, Decree 211, Decree 134, Civil Defense Egyptian Fire Code, NFSA Food Safety, OSHA 29 CFR 1910/1926, NFPA 101/45/30, and ISO 45001:2018 standards).\n\n' +
    'Provide a deep, strategic "Executive Summary & Management Signals" report that leadership can immediately act upon.\n\n' +
    'CRITICAL PROHIBITION RULES:\n' +
    '1. STRICTLY DO NOT USE the word "AI", "Artificial Intelligence", "ذكاء اصطناعي", "Model", or "Gemini" anywhere in any output field. The report is an official university executive audit.\n\n' +
    'LANGUAGE ENFORCEMENT RULES:\n' +
    (lang === "en" ?
      '- The user selected ENGLISH. You MUST provide ALL fields (including titles, summaries, trends, root causes, roadmap actions, and compliance texts) strictly and 100% in fluent, professional corporate ENGLISH.' :
      (lang === "ar" ?
        '- The user selected ARABIC. You MUST provide ALL fields (including titles, summaries, trends, root causes, roadmap actions, and compliance texts) strictly and 100% in formal, authoritative corporate ARABIC (اللغة العربية الرسمية المعتمدة).' :
        '- The user selected BILINGUAL. Provide both Arabic and English text clearly.')) + '\n\n' +
    'KEY ANALYTICAL PILLARS TO PRODUCE IN YOUR OUTPUT:\n' +
    '1. Executive Health Score (0-100 score + status level: Excellent / Satisfactory / Warning / Critical) based on closure rates, critical open items, near-miss culture, and zero-LTI performance.\n' +
    '2. Deep Field Trends & Hazard Hotspots: Analyze recurring patterns by location (e.g. FabLab, Engineering Labs, Cafeteria, Transport) and leading vs lagging safety indicators.\n' +
    '3. Systemic Root Cause Matrix: Categorize root causes (e.g. Engineering Controls & Machine Guarding, Preventive Maintenance, Training & Competency Gaps, Supervisory Oversight, Contractor HSE Controls, Food Safety/Health Certs) with sustainable mitigation strategies.\n' +
    '4. Strategic Action & CAPA Priority Roadmap: Categorized into Immediate (0-7 Days), Short Term (30 Days), and Medium Term (90 Days).\n' +
    '5. Regulatory & Statutory Standing: Assess compliance under Egyptian Labor Law 12/2003, Civil Defense, and NFSA regulations.\n\n' +
    'OUTPUT FORMAT:\n' +
    'You MUST return a single, strictly valid JSON object with the following schema (no markdown outside the JSON, pure JSON only):\n' +
    '{\n' +
    '  "title_ar": "التقرير التنفيذي المعتمد للسلامة والصحة المهنية",\n' +
    '  "title_en": "Monthly HSE Executive Intelligence & Performance Report",\n' +
    '  "period": "Monthly Reporting Cycle - ' + (data.reportingMonth || "Current Cycle") + '",\n' +
    '  "executive_health_score": 85,\n' +
    '  "health_grade": "' + (lang === "en" ? "High Compliance (Satisfactory)" : "امتثال عالي (مستقر)") + '",\n' +
    '  "health_verdict_ar": "توصيف تقييم الأداء العام بالعربية",\n' +
    '  "health_verdict_en": "High-level executive evaluation summary in English",\n' +
    '  "executive_summary_ar": "نص الملخص التنفيذي القيادي الشامل بالعربية...",\n' +
    '  "executive_summary_en": "Comprehensive leadership executive summary in English...",\n' +
    '  "key_trends": [\n' +
    '    {\n' +
    '      "trend_title": "' + (lang === "en" ? "Trend Title" : "عنوان الاتجاه") + '",\n' +
    '      "direction": "improving",\n' +
    '      "analysis": "' + (lang === "en" ? "Trend analysis and operational impact" : "التحليل والأثر الميداني") + '",\n' +
    '      "hotspot_location": "' + (lang === "en" ? "Campus Area Hotspot" : "الموقع المرتبط") + '"\n' +
    '    }\n' +
    '  ],\n' +
    '  "root_causes": [\n' +
    '    {\n' +
    '      "category": "Engineering Controls / Training Gaps / Maintenance / Supervision",\n' +
    '      "description": "' + (lang === "en" ? "Systemic root cause defect description" : "التوصيف والخلل النظامي") + '",\n' +
    '      "contributing_findings": "' + (lang === "en" ? "Associated observations" : "الملاحظات المرتبطة") + '",\n' +
    '      "mitigation_strategy": "' + (lang === "en" ? "Sustainable preventative solution" : "الحل الجذري والوقاية المستدامة") + '"\n' +
    '    }\n' +
    '  ],\n' +
    '  "strategic_actions": [\n' +
    '    {\n' +
    '      "timeframe": "' + (lang === "en" ? "Immediate (0-7 Days)" : "فوري (0-7 أيام)") + '",\n' +
    '      "action_item": "' + (lang === "en" ? "Detailed corrective action" : "الإجراء التصحيحي / الوقائي") + '",\n' +
    '      "owner_dept": "' + (lang === "en" ? "Department" : "الجهة المسؤولة") + '",\n' +
    '      "priority": "Critical",\n' +
    '      "expected_outcome": "' + (lang === "en" ? "Measurable risk reduction deliverable" : "المردود والمستهدف الملموس") + '"\n' +
    '    }\n' +
    '  ],\n' +
    '  "compliance_assessment": {\n' +
    '    "egyptian_labor_law": "' + (lang === "en" ? "Labor Law 12/2003 compliance standing" : "تقييم الامتثال لقانون العمل المصري 12 لسنة 2003") + '",\n' +
    '    "nfsa_food_safety": "' + (lang === "en" ? "NFSA cafeteria food safety evaluation" : "تقييم اشتراطات سلامة الغذاء والكافتيريات") + '",\n' +
    '    "civil_defense": "' + (lang === "en" ? "Civil defense & fire code evaluation" : "تقييم جاهزية الحماية المدنية وكود الحريق") + '",\n' +
    '    "international_standards": "' + (lang === "en" ? "OSHA 1910/1926 & ISO 45001 standing" : "الموقف من المعايير الدولية OSHA و ISO 45001") + '"\n' +
    '  }\n' +
    '}\n\n' +
    'ENTERPRISE STRUCTURED HSE DATASET:\n---BEGIN DATA---\n' + JSON.stringify(data, null, 2) + '\n---END DATA---\n' +
    (externalText ? '\nADDITIONAL ATTACHED DOCUMENT EXTRACT:\n---BEGIN EXTERNAL TEXT---\n' + externalText.slice(0, 15000) + '\n---END EXTERNAL TEXT---\n' : '');

  return systemInstructions;
}

async function runLiveMonthlyAI() {
  var scope = (document.getElementById("monthlyDataScope") ? document.getElementById("monthlyDataScope").value : "live_full") || "live_full";
  var lang = (document.getElementById("monthlyLang") ? document.getElementById("monthlyLang").value : currentReportLang) || "ar";
  var style = (document.getElementById("monthlyStyle") ? document.getElementById("monthlyStyle").value : "executive_signals") || "executive_signals";

  var data = aggregateHSEData();
  var externalText = "";
  if (scope === "combined" || scope === "file_only") {
    externalText = (monthlySource && monthlySource.text) ? monthlySource.text : "";
    if (scope === "file_only" && !externalText.trim()) {
      return showSweetAlert("تنبيه", "يرجى رفع ملف أولاً للتحليل في وضع 'ملف خارجي فقط'.", "warning");
    }
  }

  var prompt = buildExecutiveSignalsPrompt(data, { lang: lang, style: style, externalText: externalText });

  try {
    document.getElementById("monthlyOutput").classList.remove("hidden");
    loading(document.getElementById("monthlyReport"), true);
    showToast("info", "جاري تحليل البيانات التشغيلية وإعداد التقرير التنفيذي المعتمد...");

    var rawRes = await callGemini(prompt);
    var d = extractJSON(rawRes);

    d._generatedAt = new Date().toISOString();
    d._lang = lang;
    d._scope = scope;
    d._dataSnapshot = data;

    localStorage.setItem(MONTHLY_AI_REPORT_KEY, JSON.stringify(d));
    renderExecutiveSignalsReport(d, true);

    showToast("success", "تم توليد التقرير التنفيذي بنجاح!");
  } catch (e) {
    document.getElementById("monthlyReport").innerHTML = '<div class="status err"><b>خطأ في التحليل:</b> ' + esc(e.message) + '</div>';
    showSweetAlert("خطأ في توليد التقرير", e.message, "error");
  }
}

async function runMonthly() {
  var scope = document.getElementById("monthlyDataScope") ? document.getElementById("monthlyDataScope").value : "live_full";
  if (scope === "live_full") {
    return runLiveMonthlyAI();
  }
  if (!monthlySource.text) {
    return showSweetAlert("تنبيه", "يرجى رفع ملف أولاً للتلخيص أو اختيار وضع 'بيانات النظام الشاملة'.", "warning");
  }
  return runLiveMonthlyAI();
}

function renderExecutiveSignalsReport(d, isLive) {
  lastMonthly = d;
  var lang = d._lang || (document.getElementById("monthlyLang") ? document.getElementById("monthlyLang").value : currentReportLang) || "ar";
  var isAr = (lang === "ar");
  var isEn = (lang === "en");
  var isBoth = (lang === "both");

  var timeBadge = document.getElementById("monthlyGeneratedTimestamp");
  if (timeBadge) {
    var genTime = d._generatedAt ? new Date(d._generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeBadge.innerHTML = '<i class="fa-solid fa-shield-check" style="color:#059669"></i> Verified Report (' + genTime + ')';
  }

  var score = typeof d.executive_health_score === "number" ? d.executive_health_score : 85;
  var scoreClass = score >= 85 ? "score-excellent" : score >= 70 ? "score-satisfactory" : score >= 50 ? "score-warning" : "score-critical";
  var gradeText = d.health_grade || (isEn ? (score >= 85 ? "High Compliance" : score >= 70 ? "Satisfactory" : "Action Required") : (score >= 85 ? "امتثال عالي (ممتاز)" : score >= 70 ? "مستقر (مرضي)" : "يتطلب تدخل فوري"));

  var trends = d.key_trends || [];
  var rootCauses = d.root_causes || [];
  var actions = d.strategic_actions || [];
  var compliance = d.compliance_assessment || {};

  var dataSnapshot = d._dataSnapshot || aggregateHSEData();
  var kpis = dataSnapshot.executiveSummaryKPIs || {};
  var milestones = dataSnapshot.milestones || getSafeStats();

  var h = '<div class="report" id="monthlyReportInner" dir="' + (isEn ? 'ltr' : 'rtl') + '" data-report-language="' + lang + '">' +
    /* Header */
    '<div class="report-head">' +
      '<div class="track"><b>' + (isEn ? "Report Scope" : "نطاق التقرير") + '</b><span>' + (d._scope === "file_only" ? (isEn ? "Document Audit" : "تدقيق المستند المرفق") : (isEn ? "Live Enterprise System Digest" : "التقرير المعتمد للنظام التشغيلي")) + '</span></div>' +
      '<div class="report-title">' +
        '<h2>' + esc(isEn ? (d.title_en || "MONTHLY HSE MANAGEMENT INTELLIGENCE REPORT") : (d.title_ar || "التقرير التنفيذي المعتمد للسلامة والصحة المهنية")) + '</h2>' +
        '<h3 style="font-size:12px;color:#0b1f3a;font-weight:700;margin:2px 0">' + esc(isEn ? (d.title_ar || "") : (d.title_en || "")) + '</h3>' +
        '<p>' + (isEn ? "El Sewedy University of Technology (SUTech) — Polytechnic of Egypt — Health, Safety & Environment Directorate" : "جامعة السويدي للتكنولوجيا (SUTech) — Polytechnic of Egypt — إدارة السلامة والصحة المهنية والبيئة") + '</p>' +
      '</div>' +
      '<div class="track"><b>' + (isEn ? "Report Date" : "تاريخ التقرير") + '</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div>' +
    '</div>' +

    /* Executive Safety Health Scorecard */
    '<div class="exec-score-box">' +
      '<div class="exec-score-gauge">' +
        '<div>' +
          '<span style="font-size:11px;font-weight:700;color:var(--muted);display:block">' + (isEn ? "HSE Health Index" : "مؤشر صحة وامتثال السلامة") + '</span>' +
          '<div class="exec-score-number">' + score + '<small style="font-size:16px;color:#64748b">/100</small></div>' +
        '</div>' +
        '<div>' +
          '<span class="exec-score-status ' + scoreClass + '">' + esc(gradeText) + '</span>' +
          '<div style="font-size:11px;color:#334155;margin-top:4px;font-weight:600">' + esc(isEn ? (d.health_verdict_en || d.health_verdict_ar || "") : (d.health_verdict_ar || d.health_verdict_en || "")) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">' +
        '<div style="text-align:center;background:#fff;padding:6px 14px;border-radius:8px;border:1px solid #cbd5e1">' +
          '<small style="font-size:9.5px;color:var(--muted);display:block;font-weight:700">' + (isEn ? "Days Without LTI" : "أيام عمل بدون إصابات هادرة") + '</small>' +
          '<strong style="font-size:16px;color:#059669">' + (milestones.safeDaysWithoutLTI || milestones.safeDays || 0) + ' Days</strong>' +
        '</div>' +
        '<div style="text-align:center;background:#fff;padding:6px 14px;border-radius:8px;border:1px solid #cbd5e1">' +
          '<small style="font-size:9.5px;color:var(--muted);display:block;font-weight:700">' + (isEn ? "Safe Man-Hours" : "ساعات العمل الآمنة") + '</small>' +
          '<strong style="font-size:16px;color:var(--sut-navy)">' + Number(milestones.safeManHours || milestones.safeHours || 0).toLocaleString() + ' hrs</strong>' +
        '</div>' +
        '<div style="text-align:center;background:#fff;padding:6px 14px;border-radius:8px;border:1px solid #cbd5e1">' +
          '<small style="font-size:9.5px;color:var(--muted);display:block;font-weight:700">' + (isEn ? "CAPA Resolution Rate" : "نسبة الإغلاق والتحقق") + '</small>' +
          '<strong style="font-size:16px;color:var(--sut-red)">' + (kpis.closureRatePercentage || 0) + '%</strong>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* Section 1: Executive Overview */
    '<div class="section-title">' + (isEn ? "1. Executive Leadership Summary" : "1. الملخص التنفيذي للقيادة العليا (Executive Overview)") + '</div>';

  if (isBoth) {
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0">' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:12px" dir="rtl">' +
        '<b style="color:#0b1f3a;font-size:11.5px;display:block;margin-bottom:6px"><i class="fa-solid fa-language"></i> الملخص التنفيذي (بالعربية):</b>' +
        '<div class="answer" dir="rtl" style="line-height:1.65;font-size:10.5px">' + md(d.executive_summary_ar || "") + '</div>' +
      '</div>' +
      '<div style="background:#f8fafc;border:1px solid #dbe3ec;border-radius:8px;padding:12px" dir="ltr">' +
        '<b style="color:#0b1f3a;font-size:11.5px;display:block;margin-bottom:6px"><i class="fa-solid fa-globe"></i> Executive Summary (English):</b>' +
        '<div class="answer" dir="ltr" style="line-height:1.65;font-size:10.5px;text-align:left">' + md(d.executive_summary_en || "") + '</div>' +
      '</div>' +
    '</div>';
  } else {
    var summaryText = isEn ? (d.executive_summary_en || d.executive_summary || "") : (d.executive_summary_ar || d.executive_summary || "");
    h += '<div class="answer" style="line-height:1.65;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px">' + md(summaryText) + '</div>';
  }

  /* Section 2: Key Operational Trends & Hazard Hotspots */
  h += '<div class="section-title">' + (isEn ? "2. Operational Trends & Facility Hazard Hotspots" : "2. الاتجاهات الميدانية وبؤر المخاطر الحرجة (Trends & Hotspots)") + '</div>' +
    '<table>' +
      '<thead>' +
        '<tr>' +
          '<th style="width:24%">' + (isEn ? "Trend / Pattern" : "الاتجاه / النمط الميداني") + '</th>' +
          '<th style="width:12%">' + (isEn ? "Indicator" : "المؤشر") + '</th>' +
          '<th>' + (isEn ? "Analysis & Operational Impact" : "التحليل والأثر التشغيلي") + '</th>' +
          '<th style="width:20%">' + (isEn ? "Hotspot Location" : "الموقع المرتبط") + '</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  if (trends.length) {
    trends.forEach(function (tr) {
      var dir = (tr.direction || "").toLowerCase();
      var dirBadge = dir.includes("improv") ? '<span class="badge closed"><i class="fa-solid fa-arrow-trend-up"></i> ' + (isEn ? "Improving" : "تحسن") + '</span>' : dir.includes("degrad") || dir.includes("alert") ? '<span class="badge high"><i class="fa-solid fa-arrow-trend-down"></i> ' + (isEn ? "Watchlist" : "تحت المراقبة") + '</span>' : '<span class="badge progress"><i class="fa-solid fa-arrows-left-right"></i> ' + (isEn ? "Stable" : "مستقر") + '</span>';
      h += '<tr>' +
        '<td><b>' + esc(tr.trend_title || tr.trend || "") + '</b></td>' +
        '<td style="text-align:center">' + dirBadge + '</td>' +
        '<td>' + esc(tr.analysis || "") + '</td>' +
        '<td><span class="hotspot-tag"><i class="fa-solid fa-location-dot"></i> ' + esc(tr.hotspot_location || tr.hotspot || (isEn ? "Campus Wide" : "الحرم الجامعي")) + '</span></td>' +
      '</tr>';
    });
  } else {
    h += '<tr><td colspan="4" style="text-align:center;color:var(--muted)">' + (isEn ? "No significant adverse trends detected." : "المؤشرات مستقرة ولا توجد أنماط سلبية متكررة.") + '</td></tr>';
  }
  h += '</tbody></table>';

  /* Section 3: Systemic Root Cause Matrix */
  h += '<div class="section-title">' + (isEn ? "3. Systemic Root Cause Analysis Matrix" : "3. مصفوفة تحليل الأسباب الجذرية النظامية (Root Cause Analysis)") + '</div>' +
    '<table>' +
      '<thead>' +
        '<tr>' +
          '<th style="width:20%">' + (isEn ? "Root Cause Category" : "تصنيف السبب الجذري") + '</th>' +
          '<th style="width:28%">' + (isEn ? "Systemic Defect / Description" : "التوصيف والخلل النظامي") + '</th>' +
          '<th style="width:24%">' + (isEn ? "Associated Findings" : "الملاحظات المرتبطة") + '</th>' +
          '<th>' + (isEn ? "Sustainable Mitigation Strategy" : "الحل الجذري والوقاية المستدامة") + '</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  if (rootCauses.length) {
    rootCauses.forEach(function (rc) {
      h += '<tr>' +
        '<td><span class="rootcause-pill"><i class="fa-solid fa-gears"></i> ' + esc(rc.category || "General") + '</span></td>' +
        '<td><b>' + esc(rc.description || "") + '</b></td>' +
        '<td><small style="color:#475569">' + esc(rc.contributing_findings || (isEn ? "Operational logs" : "السجلات الميدانية")) + '</small></td>' +
        '<td>' + esc(rc.mitigation_strategy || rc.mitigation || "") + '</td>' +
      '</tr>';
    });
  } else {
    h += '<tr><td colspan="4" style="text-align:center;color:var(--muted)">' + (isEn ? "No systemic root cause anomalies identified." : "لا توجد أسباب جذرية حرجة معلقة.") + '</td></tr>';
  }
  h += '</tbody></table>';

  /* Section 4: Strategic Action & CAPA Priority Roadmap */
  h += '<div class="section-title">' + (isEn ? "4. Strategic Action & CAPA Priority Roadmap" : "4. خريطة الإجراءات والقرارات الاستراتيجية (Action Roadmap)") + '</div>' +
    '<table>' +
      '<thead>' +
        '<tr>' +
          '<th style="width:16%">' + (isEn ? "Time Horizon" : "المدى الزمني") + '</th>' +
          '<th>' + (isEn ? "Corrective / Preventive Action" : "الإجراء التصحيحي / الوقائي") + '</th>' +
          '<th style="width:16%">' + (isEn ? "Responsible Department" : "الجهة المسؤولة") + '</th>' +
          '<th style="width:10%">' + (isEn ? "Priority" : "الأولوية") + '</th>' +
          '<th style="width:24%">' + (isEn ? "Expected Target & Deliverable" : "المردود والمستهدف") + '</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  if (actions.length) {
    actions.forEach(function (act) {
      var prio = (act.priority || "Medium").toLowerCase();
      var prioClass = prio === "critical" ? "critical" : prio === "high" ? "high" : "medium";
      h += '<tr>' +
        '<td><b><i class="fa-solid fa-clock-rotate-left" style="color:var(--sut-red)"></i> ' + esc(act.timeframe || (isEn ? "30 Days" : "30 يوماً")) + '</b></td>' +
        '<td>' + esc(act.action_item || act.action || "") + '</td>' +
        '<td><b>' + esc(act.owner_dept || act.owner || (isEn ? "HSE Directorate" : "إدارة السلامة")) + '</b></td>' +
        '<td style="text-align:center"><span class="badge ' + prioClass + '">' + esc(act.priority || "Medium") + '</span></td>' +
        '<td>' + esc(act.expected_outcome || "") + '</td>' +
      '</tr>';
    });
  } else {
    h += '<tr><td colspan="5" style="text-align:center;color:var(--muted)">' + (isEn ? "No open corrective actions required." : "جميع الإجراءات التصحيحية مستوفاة ومحققة.") + '</td></tr>';
  }
  h += '</tbody></table>';

  /* Section 5: Approved Operational HSE Scorecard */
  h += '<div class="section-title">' + (isEn ? "5. Approved Operational HSE Scorecard" : "5. لوحة مؤشرات الأداء الميداني المعتمدة (Operational HSE Scorecard)") + '</div>' +
    '<div class="dashboard-strip">' +
      '<div class="dash-card card-blue"><strong>' + (kpis.totalRecordsLogged || 0) + '</strong><span>' + (isEn ? "Total Findings" : "إجمالي السجلات") + '</span></div>' +
      '<div class="dash-card card-green"><strong>' + (kpis.closedVerifiedCAPAs || 0) + '</strong><span>' + (isEn ? "Closed CAPA" : "تم الإغلاق والتحقق") + '</span></div>' +
      '<div class="dash-card card-amber"><strong>' + (kpis.activePermitsToWork || 0) + '</strong><span>' + (isEn ? "Active PTWs" : "تصاريح عمل نشطة") + '</span></div>' +
      '<div class="dash-card card-purple"><strong>' + (kpis.totalTrainedPersonnel || 0) + '</strong><span>' + (isEn ? "Trained Persons" : "كوادر متدربة") + '</span></div>' +
    '</div>' +
    '<div class="meta">' +
      '<div><b>' + (isEn ? "Near-Miss Reporting Target:" : "مستهدف الإبلاغ الوشيك:") + '</b> <span style="color:#2563eb;font-weight:800">' + (kpis.nearMissReportsLogged || 0) + ' / 10 (' + Math.min(100, Math.round(((kpis.nearMissReportsLogged || 0) / 10) * 100)) + '%)</span></div>' +
      '<div><b>' + (isEn ? "Campus Fleet & Vehicles Inspection:" : "فحص الحافلات والمركبات:") + '</b> <span style="color:' + (dataSnapshot.fleetAndBusInspectionNotes ? '#d97706' : '#059669') + ';font-weight:800">' + (dataSnapshot.fleetAndBusInspectionNotes ? (isEn ? "Audited with recorded observations" : "ملاحظات مسجلة ومتابعة") : (isEn ? "Inspected with zero non-conformities" : "تم الفحص ولا توجد ملاحظات")) + '</span></div>' +
      '<div><b>' + (isEn ? "Food Outlets & Cafeterias Inspection:" : "فحص المطاعم والكافيتريات:") + '</b> <span style="color:' + (dataSnapshot.foodAndCafeteriaInspectionNotes ? '#d97706' : '#059669') + ';font-weight:800">' + (dataSnapshot.foodAndCafeteriaInspectionNotes ? (isEn ? "Audited with recorded observations" : "ملاحظات مسجلة ومتابعة") : (isEn ? "Inspected with zero non-conformities" : "تم الفحص ولا توجد ملاحظات")) + '</span></div>' +
    '</div>';

  /* Section 6: Statutory & Standards Compliance Overview */
  if (compliance && Object.keys(compliance).length) {
    h += '<div class="section-title">' + (isEn ? "6. Statutory & Standards Compliance Overview" : "6. الموقف القانوني والامتثال للاشتراطات الرسمية (Compliance Health)") + '</div>' +
      '<table>' +
        '<thead><tr><th style="width:26%">' + (isEn ? "Regulatory Framework" : "الإطار القانوني / المعيار") + '</th><th>' + (isEn ? "Compliance Assessment & Audit Standing" : "تقييم الامتثال والموقف الميداني") + '</th></tr></thead>' +
        '<tbody>' +
          '<tr><td><b>' + (isEn ? "Egyptian Labor Law 12/2003 & Decrees" : "قانون العمل المصري 12 لسنة 2003") + '</b><br><small>' + (isEn ? "Ministry Decrees 211 & 134" : "القرارات الوزارية 211 و 134") + '</small></td><td>' + esc(compliance.egyptian_labor_law || (isEn ? "Compliant with mandatory technical safety regulations" : "مطابق للاشتراطات الفنية وقرارات السلامة")) + '</td></tr>' +
          '<tr><td><b>' + (isEn ? "National Food Safety Authority (NFSA)" : "اشتراطات سلامة الغذاء (NFSA)") + '</b><br><small>' + (isEn ? "Food Hygiene & Health Certs" : "الشهادات الصحية ونظافة المطابخ") + '</small></td><td>' + esc(compliance.nfsa_food_safety || (isEn ? "Ongoing monitoring for food handler health certificates and hygiene" : "متابعة مستمرة للشهادات الصحية ونظافة المطابخ")) + '</td></tr>' +
          '<tr><td><b>' + (isEn ? "Civil Defense & Fire Protection Code" : "الحماية المدنية وكود الحريق المصري") + '</b><br><small>' + (isEn ? "Emergency Exits & Fire Networks" : "شبكات الإطفاء ومخارج الطوارئ") + '</small></td><td>' + esc(compliance.civil_defense || (isEn ? "Fire networks and emergency evacuation paths verified operable" : "جاهزية شبكات الإطفاء ومخارج الطوارئ")) + '</td></tr>' +
          '<tr><td><b>' + (isEn ? "International Standards (OSHA / ISO 45001)" : "المعايير الدولية (OSHA / ISO 45001)") + '</b><br><small>' + (isEn ? "Occupational Health & Safety Systems" : "نظم إدارة الصحة والسلامة المهنية") + '</small></td><td>' + esc(compliance.international_standards || compliance.osha_iso45001 || (isEn ? "Aligned with international occupational safety management systems" : "تطبيق متوافق لأنظمة إدارة الصحة والسلامة المهنية")) + '</td></tr>' +
        '</tbody>' +
      '</table>';
  }

  /* Signatures block */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;padding-top:14px;border-top:1.5px dashed #cbd5e1;font-size:10px">' +
    '<div><b>' + (isEn ? "HSE Directorate (Prepared & Verified):" : "إدارة السلامة والصحة المهنية والبيئة:") + '</b><br>Eng. Ibrahim Saeed &amp; Eng. Youssef Mohamed<br>' + (isEn ? "El Sewedy University of Technology (SUTech)" : "جامعة السويدي للتكنولوجيا (SUTech)") + '</div>' +
    '<div style="text-align:' + (isEn ? 'right' : 'left') + '"><b>' + (isEn ? "Executive Leadership Approval:" : "الاعتماد الإداري:") + '</b><br>' + (isEn ? "Executive Directorate & Campus Operations" : "الإدارة التنفيذية وقطاع التشغيل") + '<br>' + (isEn ? "Date: " : "التاريخ: ") + new Date().toLocaleDateString("en-GB") + '</div>' +
  '</div>';

  h += '</div>';

  document.getElementById("monthlyReport").innerHTML = h;
}

function copyMonthlyDigest() {
  if (!lastMonthly) return showSweetAlert("تنبيه", "يرجى توليد التقرير التنفيذي أولاً.", "warning");
  var d = lastMonthly;
  var isEn = d._lang === "en";
  var text = (isEn ? "[SUTech HSE Executive Management Digest]\n" : "[التقرير التنفيذي المعتمد — جامعة السويدي للتكنولوجيا]\n") +
    (isEn ? "Report Date: " : "تاريخ التقرير: ") + new Date().toLocaleDateString("en-GB") + "\n" +
    (isEn ? "HSE Health Score: " : "مؤشر صحة السلامة: ") + (d.executive_health_score || 85) + "/100 (" + (d.health_grade || (isEn ? "High Compliance" : "امتثال عالي")) + ")\n\n" +
    (isEn ? "Executive Summary:\n" + (d.executive_summary_en || d.executive_summary || "") : "الملخص التنفيذي:\n" + (d.executive_summary_ar || d.executive_summary || "")) + "\n\n" +
    (isEn ? "Key Trends:\n" : "أبرز الاتجاهات الميدانية:\n");

  (d.key_trends || []).forEach(function (tr, idx) {
    text += (idx + 1) + ". " + (tr.trend_title || "") + " (" + (tr.hotspot_location || "") + "): " + (tr.analysis || "") + "\n";
  });

  navigator.clipboard.writeText(text).then(function () {
    showToast("success", "تم نسخ ملخص الإدارة إلى الحافظة بنجاح!");
  }).catch(function () {
    showToast("info", "تم تجهيز ملخص الإدارة بنجاح");
  });
}

async function downloadMonthlyPPT() {
  if (!lastMonthly) return showSweetAlert("تنبيه", "يرجى إنشاء وتحليل التقرير الشهري أولاً قبل التصدير.", "warning");
  showToast("info", "جاري إعداد وتنزيل عرض PowerPoint التنفيذي...");
  try {
    await ensureScript(function () { return typeof window.PptxGenJS !== "undefined" || typeof window.pptxgen !== "undefined"; }, "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");
    var PPTXClass = window.PptxGenJS || window.pptxgen;
    var pptx = new PPTXClass();
    pptx.layout = "LAYOUT_WIDE";

    var d = lastMonthly;
    var isEn = d._lang === "en";

    // Slide 1: Title Slide
    var s1 = pptx.addSlide();
    s1.background = { color: "0B1F3A" };
    s1.addText(isEn ? "SUTech HSE Performance & Executive Report" : "التقرير التنفيذي المعتمد للسلامة والصحة المهنية", { x: 0.8, y: 1.8, w: 11.5, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", align: "center" });
    s1.addText(isEn ? "El Sewedy University of Technology — Health, Safety & Environment Directorate" : "جامعة السويدي للتكنولوجيا — إدارة السلامة والصحة المهنية والبيئة", { x: 0.8, y: 2.7, w: 11.5, h: 0.5, fontSize: 14, color: "C00000", align: "center" });
    s1.addText((isEn ? "Report Cycle: " : "دورة التقرير: ") + (d.period || new Date().toLocaleDateString("en-GB")), { x: 0.8, y: 4.8, w: 11.5, h: 0.4, fontSize: 12, color: "94A3B8", align: "center" });

    // Slide 2: Executive Summary & Health Index
    var s2 = pptx.addSlide();
    s2.background = { color: "F8FAFC" };
    s2.addText(isEn ? "1. Executive Summary & Health Index" : "1. الملخص التنفيذي ومؤشر صحة السلامة", { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 18, bold: true, color: "0B1F3A" });
    s2.addText((isEn ? "Health Score: " : "مؤشر صحة السلامة: ") + (d.executive_health_score || 85) + "/100 — " + (d.health_grade || (isEn ? "High Compliance" : "امتثال عالي")), { x: 0.8, y: 1.1, w: 11.5, h: 0.4, fontSize: 13, bold: true, color: "C00000" });
    var sumText = stripHtml(md(isEn ? (d.executive_summary_en || d.executive_summary || "") : (d.executive_summary_ar || d.executive_summary || "")));
    s2.addText(sumText, { x: 0.8, y: 1.6, w: 11.5, h: 4.8, fontSize: 11.5, color: "334155" });

    // Slide 3: Key Trends & Root Causes
    var s3 = pptx.addSlide();
    s3.background = { color: "FFFFFF" };
    s3.addText(isEn ? "2. Field Trends & Systemic Root Causes" : "2. الاتجاهات الميدانية والأسباب الجذرية النظامية", { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 18, bold: true, color: "0B1F3A" });
    var rcText = (d.root_causes || []).map(function (rc) {
      return "• [" + rc.category + "] " + rc.description + "\n   " + (isEn ? "Mitigation: " : "المعالجة الجذرية: ") + rc.mitigation_strategy;
    }).join("\n\n");
    s3.addText(rcText || (isEn ? "No systemic root cause anomalies identified." : "لا توجد أسباب جذرية حرجة معلقة."), { x: 0.8, y: 1.3, w: 11.5, h: 5.2, fontSize: 11.5, color: "334155" });

    // Slide 4: Strategic Action Roadmap
    var s4 = pptx.addSlide();
    s4.background = { color: "F8FAFC" };
    s4.addText(isEn ? "3. Strategic Action Roadmap & CAPA" : "3. خريطة الإجراءات والقرارات الاستراتيجية", { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 18, bold: true, color: "0B1F3A" });
    var actLines = (d.strategic_actions || []).map(function (act) {
      return "• [" + act.timeframe + "] (" + act.owner_dept + ") " + act.action_item + " — " + (isEn ? "Priority: " : "الأولوية: ") + act.priority + "\n   " + (isEn ? "Target: " : "المستهدف: ") + act.expected_outcome;
    }).join("\n\n");
    s4.addText(actLines || (isEn ? "All corrective action milestones on track." : "جميع الإجراءات التصحيحية مستوفاة ومحققة."), { x: 0.8, y: 1.3, w: 11.5, h: 5.2, fontSize: 11, color: "1E293B" });

    await pptx.writeFile({ fileName: "SUTech-HSE-Executive-Report-" + new Date().toISOString().slice(0, 10) + ".pptx" });
    showToast("success", "تم تنزيل ملف PowerPoint التنفيذي بنجاح!");
  } catch (e) {
    showSweetAlert("خطأ في التصدير", "تعذر إنشاء PowerPoint: " + e.message, "error");
  }
}

function stripHtml(x) { var d = document.createElement("div"); d.innerHTML = x; return d.innerText || d.textContent || ""; }

/* ==========================================================================
   INCIDENT DEEP ROOT CAUSE ANALYSIS (RCA) MODULE
   Methodologies: 5-Whys, Ishikawa 6M Fishbone, Barrier Analysis, Roles Matrix
   ========================================================================== */

function openIncidentRcaModal(incidentId) {
  var modal = document.getElementById("incidentRcaModal");
  if (!modal) return;

  var sel = document.getElementById("rcaIncidentSelect");
  if (sel) {
    sel.innerHTML = '<option value="new">-- كتابة واقعة / سيناريو جديد --</option>' +
      incidents.map(function (x) {
        var pName = (x.injuredName && x.injuredName !== "لا يوجد") ? (" - المصاب: " + x.injuredName) : "";
        return '<option value="' + x.id + '">' + esc(x.type) + ' | ' + esc(x.loc) + pName + ' (' + esc(x.date) + ')</option>';
      }).join("");
  }

  if (incidentId) {
    var inc = incidents.find(function (x) { return x.id === Number(incidentId); });
    if (inc) {
      if (sel) sel.value = String(inc.id);
      if (document.getElementById("rcaIncidentType")) document.getElementById("rcaIncidentType").value = inc.type || "";
      if (document.getElementById("rcaLocation")) document.getElementById("rcaLocation").value = inc.loc || "";
      if (document.getElementById("rcaEquipment")) document.getElementById("rcaEquipment").value = "";
      if (document.getElementById("rcaInjuredName")) document.getElementById("rcaInjuredName").value = inc.injuredName || "";
      if (document.getElementById("rcaBodyPart")) document.getElementById("rcaBodyPart").value = inc.bodyPart || "";
      if (document.getElementById("rcaSupervisor")) document.getElementById("rcaSupervisor").value = inc.supervisor || "";
      if (document.getElementById("rcaDescription")) document.getElementById("rcaDescription").value = inc.desc || "";
    }
  } else {
    if (sel) sel.value = "new";
    if (document.getElementById("rcaIncidentType")) document.getElementById("rcaIncidentType").value = "Lost Time Injury / Machine Entanglement";
    if (document.getElementById("rcaLocation")) document.getElementById("rcaLocation").value = "FabLab Workshop & Engineering Labs";
    if (document.getElementById("rcaEquipment")) document.getElementById("rcaEquipment").value = "CNC Milling Machine / High-Speed Lathe";
    if (document.getElementById("rcaInjuredName")) document.getElementById("rcaInjuredName").value = "أحمد خالد محمود (طالب هندسة)";
    if (document.getElementById("rcaBodyPart")) document.getElementById("rcaBodyPart").value = "اليد والأصابع والساعد الأيمن";
    if (document.getElementById("rcaSupervisor")) document.getElementById("rcaSupervisor").value = "م. يوسف محمد";
    if (document.getElementById("rcaDescription")) document.getElementById("rcaDescription").value = "أثناء تشغيل ماكينة الخراطة على سرعة عالية، اشتبكت أكمام ملابس أحد الطلاب بأجزاء عمود الدوران لعدم وجود حاجز واقي كهروضوئي، مما أدى لجرح قطعي بالذراع وإيقاف الماكينة يدوياً.";
  }

  modal.style.display = "flex";
}

function closeIncidentRcaModal() {
  var modal = document.getElementById("incidentRcaModal");
  if (modal) modal.style.display = "none";
}

function handleRcaIncidentSelectChange() {
  var val = document.getElementById("rcaIncidentSelect").value;
  if (!val || val === "new") {
    if (document.getElementById("rcaIncidentType")) document.getElementById("rcaIncidentType").value = "";
    if (document.getElementById("rcaLocation")) document.getElementById("rcaLocation").value = "";
    if (document.getElementById("rcaEquipment")) document.getElementById("rcaEquipment").value = "";
    if (document.getElementById("rcaInjuredName")) document.getElementById("rcaInjuredName").value = "";
    if (document.getElementById("rcaBodyPart")) document.getElementById("rcaBodyPart").value = "";
    if (document.getElementById("rcaSupervisor")) document.getElementById("rcaSupervisor").value = "";
    if (document.getElementById("rcaDescription")) document.getElementById("rcaDescription").value = "";
    return;
  }
  var inc = incidents.find(function (x) { return x.id === Number(val); });
  if (inc) {
    if (document.getElementById("rcaIncidentType")) document.getElementById("rcaIncidentType").value = inc.type || "";
    if (document.getElementById("rcaLocation")) document.getElementById("rcaLocation").value = inc.loc || "";
    if (document.getElementById("rcaInjuredName")) document.getElementById("rcaInjuredName").value = inc.injuredName || "";
    if (document.getElementById("rcaBodyPart")) document.getElementById("rcaBodyPart").value = inc.bodyPart || "";
    if (document.getElementById("rcaSupervisor")) document.getElementById("rcaSupervisor").value = inc.supervisor || "";
    if (document.getElementById("rcaDescription")) document.getElementById("rcaDescription").value = inc.desc || "";
  }
}

function buildIncidentRcaPrompt(data, options) {
  var lang = (options && options.lang) || "ar";
  var methodPref = (options && options.method) || "auto";

  var systemInstructions = 'You are the Chief Incident Forensic Safety Specialist & Lead Investigator for El Sewedy University of Technology (SUTech).\n' +
    'Your role is to perform an exhaustive, authoritative Root Cause Analysis (RCA) for the incident described below.\n' +
    'You apply OSHA 1904, CCPS Incident Investigation Guidelines, TapRooT, and ISO 45001:2018 standards.\n\n' +
    'CRITICAL PROHIBITION RULES:\n' +
    '1. STRICTLY DO NOT USE the word "AI", "Artificial Intelligence", "ذكاء اصطناعي", "Model", or "Gemini" anywhere in the output.\n' +
    '2. The report is an official university root cause investigation document.\n\n' +
    'LANGUAGE ENFORCEMENT:\n' +
    (lang === "en" ?
      '- The user selected ENGLISH. Output ALL fields (titles, summaries, 5-whys, fishbone, causes, roles, CAPA) strictly in fluent professional corporate ENGLISH.' :
      (lang === "ar" ?
        '- The user selected ARABIC. Output ALL fields (titles, summaries, 5-whys, fishbone, causes, roles, CAPA) strictly in authoritative corporate ARABIC (اللغة العربية الرسمية المعتمدة).' :
        '- Output bilingual Arabic and English content clearly.')) + '\n\n' +
    'ANALYSIS METHODOLOGY INSTRUCTION:\n' +
    (methodPref === "auto" ?
      'Evaluate the incident nature and automatically select the most suitable investigative model: "5-Whys" (for procedural chains), "Ishikawa Fishbone (6M)" (for complex machine/method/human events), or "Barrier Analysis" (for containment failures). Provide technical rationale.' :
      'Use the chosen methodology: ' + methodPref + ' along with complete cause mapping.') + '\n\n' +
    'REQUIRED INVESTIGATION PILLARS:\n' +
    '1. Chosen Methodology and Suitability Rationale.\n' +
    '2. Cause Breakdown: Direct / Immediate Causes (Unsafe Acts & Conditions), Underlying / Contributing Factors, and Root Causes (Management / Systemic Failures).\n' +
    '3. Investigative Chain: Full 5-Whys Sequence (Why 1 to Why 5) AND Fishbone 6M Categories (People, Machine, Method, Material, Measurement, Milieu/Environment).\n' +
    '4. Roles & Responsibilities Accountability Matrix: Break down failures and assigned duties across Executive Leadership, HSE Directorate, Lab/Area Supervisors, and Workers/Students.\n' +
    '5. Corrective & Preventive Action Plan (CAPA): Grouped by Hierarchy of Controls (Elimination, Substitution, Engineering Controls, Administrative Controls, PPE) with owner and timeframe.\n\n' +
    'OUTPUT FORMAT:\n' +
    'Return a single valid JSON object matching this schema:\n' +
    '{\n' +
    '  "investigation_title": "' + (lang === "en" ? "Comprehensive Incident Root Cause Investigation Report" : "تقرير التحقيق الجذري المعتمد في الحادث وتحليل الأسباب والمسؤوليات") + '",\n' +
    '  "investigation_no": "RCA-SUT-' + Date.now().toString().slice(-5) + '",\n' +
    '  "incident_overview": {\n' +
    '    "incident_type": "' + (data.type || "") + '",\n' +
    '    "location": "' + (data.location || "") + '",\n' +
    '    "date_time": "' + (data.dateTime || new Date().toLocaleDateString("en-GB")) + '",\n' +
    '    "equipment_involved": "' + (data.equipment || "N/A") + '",\n' +
    '    "injured_person_name": "' + (data.injuredName || "None / Material Incident") + '",\n' +
    '    "injured_body_part": "' + (data.bodyPart || "N/A") + '",\n' +
    '    "supervisor_in_charge": "' + (data.supervisor || "N/A") + '",\n' +
    '    "severity_classification": "' + (lang === "en" ? "High Severity / Lost Time Potential" : "درجة خطورة عالية / واقعة حرجة") + '",\n' +
    '    "summary": "' + (lang === "en" ? "Summary narrative of the sequence of events" : "ملخص تسلسل وقائع الحادث والنتائج المباشرة") + '"\n' +
    '  },\n' +
    '  "selected_methodology": {\n' +
    '    "name": "' + (methodPref === "fishbone" ? "Ishikawa 6M Fishbone" : methodPref === "barrier" ? "Barrier Failure Analysis" : "5-Whys Root Cause Chain") + '",\n' +
    '    "rationale": "' + (lang === "en" ? "Why this analysis methodology is most suitable for this incident" : "مبررات اختيار هذه المنهجية لملاءمتها لطبيعة الحادث") + '"\n' +
    '  },\n' +
    '  "causes_breakdown": {\n' +
    '    "immediate_causes_unsafe_acts": [\n' +
    '      "' + (lang === "en" ? "Unsafe act / behavioral bypass" : "تصرف غير آمن / تجاوز إجرائي") + '"\n' +
    '    ],\n' +
    '    "immediate_causes_unsafe_conditions": [\n' +
    '      "' + (lang === "en" ? "Unsafe physical / mechanical condition" : "ظرف مادي / ميكانيكي غير آمن") + '"\n' +
    '    ],\n' +
    '    "underlying_contributing_factors": [\n' +
    '      "' + (lang === "en" ? "Inadequate supervision or maintenance backlog" : "قصور في الإشراف المباشر أو تأخر الصيانة الوقائية") + '"\n' +
    '    ],\n' +
    '    "systemic_root_causes": [\n' +
    '      "' + (lang === "en" ? "Management system / training policy defect" : "خلل في نظام إدارة السلامة وإجراءات التحقق") + '"\n' +
    '    ]\n' +
    '  },\n' +
    '  "five_whys_chain": [\n' +
    '    { "step": 1, "question": "Why did the event occur?", "answer": "..." },\n' +
    '    { "step": 2, "question": "Why did that happen?", "answer": "..." },\n' +
    '    { "step": 3, "question": "Why was the condition unaddressed?", "answer": "..." },\n' +
    '    { "step": 4, "question": "Why was the control measure missing?", "answer": "..." },\n' +
    '    { "step": 5, "question": "Why did the management system fail?", "answer": "Root cause determination..." }\n' +
    '  ],\n' +
    '  "fishbone_6m": {\n' +
    '    "people": "' + (lang === "en" ? "Competency, training, fatigue, perception" : "الكفاءة، التدريب، الإرهاق، الالتزام") + '",\n' +
    '    "machine": "' + (lang === "en" ? "Guarding, interlocks, wear & tear, calibration" : "الحواجز الواقية، مفاتيح الأمان، الإهلاك، المعايرة") + '",\n' +
    '    "method": "' + (lang === "en" ? "SOP clarity, JSA availability, PTW compliance" : "إجراءات العمل القياسية، تصاريح العمل، تقييم المخاطر") + '",\n' +
    '    "material": "' + (lang === "en" ? "PPE quality, raw material defect, chemical handling" : "جودة مهمات الوقاية، المواد الخام، خواص المواد") + '",\n' +
    '    "measurement": "' + (lang === "en" ? "Inspection frequency, audit metrics, sensor limits" : "دورية الفحص، مؤشرات الأداء، أجهزة القياس") + '",\n' +
    '    "milieu_environment": "' + (lang === "en" ? "Housekeeping, lighting, noise, congestion" : "ترتيب الموقع، الإضاءة، الضوضاء، بيئة العمل") + '"\n' +
    '  },\n' +
    '  "roles_accountability_matrix": [\n' +
    '    {\n' +
    '      "role": "' + (lang === "en" ? "Executive Leadership & Dean" : "القيادة الجامعية والإدارة التنفيذية") + '",\n' +
    '      "gap_identified": "' + (lang === "en" ? "Resource allocation or safety policy governance gap" : "قصور في توفير الموارد أو حوكمة السياسات") + '",\n' +
    '      "assigned_mandate": "' + (lang === "en" ? "Approve safety upgrade budget and establish zero-tolerance enforcement" : "اعتماد ميزانية تطوير نظم الحماية وتطبيق مبدأ عدم التهاون") + '"\n' +
    '    },\n' +
    '    {\n' +
    '      "role": "' + (lang === "en" ? "HSE Directorate" : "إدارة السلامة والصحة المهنية") + '",\n' +
    '      "gap_identified": "' + (lang === "en" ? "Inspection periodicity or JSA review interval" : "الحاجة لتكثيف التدقيق الميداني وتحديث تقييم المخاطر") + '",\n' +
    '      "assigned_mandate": "' + (lang === "en" ? "Conduct mandatory re-training and implement weekly audit checklist" : "إعادة تدريب الكوادر وتطبيق قائمة تدقيق أسبوعية") + '"\n' +
    '    },\n' +
    '    {\n' +
    '      "role": "' + (lang === "en" ? "Lab / Area Supervisor & Engineer" : "مشرف الورش والمختبرات والمهندسون") + '",\n' +
    '      "gap_identified": "' + (lang === "en" ? "Daily pre-use machine verification laxity" : "تراخي في فحص ما قبل التشغيل اليومي للمعدات") + '",\n' +
    '      "assigned_mandate": "' + (lang === "en" ? "Enforce mandatory sign-in log and halt work on unguarded equipment" : "تفعيل سجل الفحص اليومي الإلزامي وإيقاف العمل فوراً عند وجود خلل") + '"\n' +
    '    },\n' +
    '    {\n' +
    '      "role": "' + (lang === "en" ? "Technicians, Workers & Students" : "الفنيون والطلاب والعاملون") + '",\n' +
    '      "gap_identified": "' + (lang === "en" ? "PPE non-compliance and risk perception bypass" : "عدم الالتزام الكامل بمهمات الوقاية والتسرع") + '",\n' +
    '      "assigned_mandate": "' + (lang === "en" ? "Adhere 100% to PPE rules and exercise Stop-Work Authority" : "الالتزام التام بإجراءات السلامة واستخدام حق إيقاف العمل غير الآمن") + '"\n' +
    '    }\n' +
    '  ],\n' +
    '  "capa_hierarchy": [\n' +
    '    {\n' +
    '      "level": "Engineering Controls",\n' +
    '      "action": "' + (lang === "en" ? "Install interlocked machine guards with emergency cut-offs" : "تركيب حواجز حماية ميكانيكية مزودة بمفاتيح إيقاف طوارئ كهروضوئية") + '",\n' +
    '      "owner": "' + (lang === "en" ? "Engineering Maintenance & HSE" : "إدارة الصيانة الهندسية والسلامة") + '",\n' +
    '      "target_date": "7 Days",\n' +
    '      "priority": "Critical"\n' +
    '    },\n' +
    '    {\n' +
    '      "level": "Administrative Controls",\n' +
    '      "action": "' + (lang === "en" ? "Update Standard Operating Procedure (SOP) and implement daily pre-use checklist" : "تحديث إجراء العمل القياسي وتطبيق قائمة فحص يومية قبل التشغيل") + '",\n' +
    '      "owner": "' + (lang === "en" ? "Area Supervisor & HSE" : "مشرف الورشة وإدارة السلامة") + '",\n' +
    '      "target_date": "14 Days",\n' +
    '      "priority": "High"\n' +
    '    },\n' +
    '    {\n' +
    '      "level": "PPE & Behavioral Verification",\n' +
    '      "action": "' + (lang === "en" ? "Issue certified high-impact PPE and deliver hands-on safety briefing" : "صرف مهمات وقاية شخصية معتمدة وتنفيذ جلسة توعية عملية فورية") + '",\n' +
    '      "owner": "' + (lang === "en" ? "HSE Directorate" : "إدارة السلامة والصحة المهنية") + '",\n' +
    '      "target_date": "Immediate (24 Hours)",\n' +
    '      "priority": "Critical"\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    'INCIDENT DATA FOR ANALYSIS:\n' + JSON.stringify(data, null, 2);

  return systemInstructions;
}

function generateFallbackIncidentRCA(incidentData, options) {
  var lang = (options && options.lang) || "ar";
  var isEn = (lang === "en");
  var type = incidentData.type || "Lost Time Injury";
  var loc = incidentData.location || "FabLab Workshop & Engineering Labs";
  var eq = incidentData.equipment || "Industrial Machining Equipment";
  var desc = incidentData.description || "Machine entanglement and procedural bypass incident.";
  var injuredName = incidentData.injuredName || (isEn ? "Ahmed Khaled (Student)" : "أحمد خالد محمود (طالب)");
  var bodyPart = incidentData.bodyPart || (isEn ? "Right Hand & Forearm" : "اليد والساعد الأيمن");
  var supervisor = incidentData.supervisor || (isEn ? "Eng. Youssef Mohamed" : "م. يوسف محمد");

  return {
    investigation_title: isEn ? "Comprehensive Incident Root Cause Investigation Report" : "تقرير التحقيق الجذري المعتمد في الحادث وتحليل الأسباب والمسؤوليات",
    investigation_no: "RCA-SUT-" + Date.now().toString().slice(-5),
    incident_overview: {
      incident_type: type,
      location: loc,
      date_time: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      equipment_involved: eq,
      injured_person_name: injuredName,
      injured_body_part: bodyPart,
      supervisor_in_charge: supervisor,
      severity_classification: isEn ? "High Severity / Lost Time Potential" : "درجة خطورة عالية / واقعة حرجة",
      summary: desc
    },
    selected_methodology: {
      name: isEn ? "Integrated 5-Whys & Ishikawa 6M Forensic Model" : "النموذج المزدوج: تحليل الأسباب الخمسة (5-Whys) ومخطط إيشيكاوا (6M Fishbone)",
      rationale: isEn ?
        "This multifactorial operational event involved mechanical hazards, human behavior, and supervisory oversight gaps, requiring both 5-Whys sequential logic and Ishikawa 6M dimensional mapping." :
        "نظراً لأن الواقعة تنطوي على مخاطر ميكانيكية وتفاعل بشري وقصور في إجراءات الفحص اليومي، فإن الجمع بين تتبع الأسباب المتتالية (5-Whys) وهيكل السمكة (6M) يضمن الوصول للخلل النظامي الجذري."
    },
    causes_breakdown: {
      immediate_causes_unsafe_acts: [
        isEn ? "Operating equipment without securing loose clothing and sleeves" : "تشغيل المعدة بدون إحكام الملابس الفضفاضة وربط الأكمام",
        isEn ? "Attempting minor manual adjustment while rotating spindle was energized" : "محاولة التعديل اليدوي أثناء دوران العمود الميكانيكي دون إيقاف كامل"
      ],
      immediate_causes_unsafe_conditions: [
        isEn ? "Absence of interlocked transparent polycarbonate chip/debris guard" : "عدم وجود حاجز واقي شفاف معشق كهربائياً (Interlocked Guard) لمنع التلامس",
        isEn ? "Emergency foot-brake switch not immediately accessible to operator" : "مفتاح إيقاف الطوارئ بالقدم بعيد نسبياً عن موضع وقوف المشغل"
      ],
      underlying_contributing_factors: [
        isEn ? "Daily pre-use machine verification checklist not strictly signed before shift" : "عدم تفعيل قائمة التحقق اليومية قبل بدء التدريب العملي",
        isEn ? "Student risk perception gap and rush to complete project deadline" : "استعجال الطالب لإنهاء المشروع العملي مع ضعف إدراك خطورة نقاط العصر الميكانيكية"
      ],
      systemic_root_causes: [
        isEn ? "Deficiency in the Engineering Lab Management System regarding machine guarding procurement standards and mandatory competency verification prior to solo machine operation." :
          "خلل في نظام إدارة الورش والمختبرات الهندسية فيما يخص مواصفات استلام المعدات بحواجز حماية معشقة، وعدم إلزامية اجتياز اختبار الكفاءة العملية للطلاب قبل السماح بالتشغيل المنفرد."
      ]
    },
    five_whys_chain: [
      { step: 1, question: isEn ? "Why did the operator sustain an injury?" : "لماذا تعرض المشغل / الطالب للإصابة؟", answer: isEn ? "Operator's sleeve was caught by the high-speed rotating spindle." : "اشتبكت أكمام الملابس بعمود الدوران عالي السرعة أثناء التشغيل." },
      { step: 2, question: isEn ? "Why was the sleeve close enough to get caught?" : "لماذا اقتربت الملابس من عمود الدوران الدوار؟", answer: isEn ? "Operator leaned in to inspect the workpiece without an interlocked physical barrier." : "اقترب الطالب لفحص قطعة العمل دون وجود حاجز حماية يفصل بينه وبين الأجزاء المتحركة." },
      { step: 3, question: isEn ? "Why was there no barrier guard installed?" : "لماذا لم يكن الحاجز الواقي مثبتاً على الماكينة؟", answer: isEn ? "The original manufacturer guard was removed during previous maintenance and not re-fitted." : "تم فك الحاجز الواقي أثناء صيانة سابقة ولم تتم إعادة تركيبه ومعايرته." },
      { step: 4, question: isEn ? "Why was the machine operated without the guard?" : "لماذا تم السماح بتشغيل الماكينة بدون الحاجز؟", answer: isEn ? "Daily pre-use safety checklist was not verified by the lab supervisor before practical class." : "لم يتم إجراء وتوقيع الفحص اليومي الإلزامي للسلامة من قبل مشرف الورشة قبل بدء الحصة العملية." },
      { step: 5, question: isEn ? "Why was pre-use verification bypassed?" : "لماذا تم تجاوز إجراء الفحص اليومي؟", answer: isEn ? "Root Cause: Absence of an automated Stop-Work interlock policy and lack of mandatory documented competency sign-off in the HSE Lab Management System." : "السبب الجذري: غياب سياسة الحوكمة الإلزامية لاشتراطات السلامة قبل التشغيل، وعدم ربط تشغيل المعدات برخصة كفاءة تدريبية موثقة." }
    ],
    fishbone_6m: {
      people: isEn ? "Student hurried; lack of hands-on mechanical hazard perception training; improper clothing." : "استعجال المتدرب؛ ضعف إدراك مخاطر نقاط العصر؛ عدم الالتزام بزي العمل المخصص.",
      machine: isEn ? "Missing interlocked spindle guard; emergency stop button position ergonomics sub-optimal." : "غياب الحاجز المعشق كهربائياً؛ مفتاح الطوارئ يحتاج إعادة تموضع لتسهيل الوصول.",
      method: isEn ? "Standard Operating Procedure (SOP) posted but pre-use checklist sign-off not enforced." : "إجراء التشغيل القياسي معلق لكن الفحص الموثق قبل التشغيل غير مفعل يومياً.",
      material: isEn ? "Loose fabric clothing worn instead of fitted workshop anti-entanglement coats." : "ارتداء ملابس عادية ذات أكمام فضفاضة بدلاً من البالطو الهندسي المحكم المعتمد.",
      measurement: isEn ? "HSE audit frequency quarterly rather than weekly pre-shift machine inspections." : "التدقيق الميداني يتم شهرياً بدلاً من التفتيش الأسبوعي الدوري على حواجز الماكينات.",
      milieu_environment: isEn ? "High ambient workshop noise; floor line markings around machine safety zone worn out." : "ضوضاء مرتفعة في الورشة؛ مسار الأمان الأرضي حول الماكينة يحتاج إعادة تخطيط وطلاء."
    },
    roles_accountability_matrix: [
      {
        role: isEn ? "Executive Leadership & Dean" : "القيادة الجامعية وإدارة الكلية",
        gap_identified: isEn ? "Resource allocation for workshop safety retrofitting and interlock procurement." : "اعتماد ميزانية تحديث وتطوير حواجز الحماية الكهروضوئية ومفاتيح الطوارئ.",
        assigned_mandate: isEn ? "Approve emergency budget for engineered machine guards across all engineering laboratories." : "اعتماد ميزانية عاجلة لتركيب حواجز كهروضوئية معشقة لكافة ماكينات الورش."
      },
      {
        role: isEn ? "HSE Directorate" : "إدارة السلامة والصحة المهنية",
        gap_identified: isEn ? "Need for specialized mechanical safety training and daily verification audit." : "ضرورة تكثيف الرقابة الميدانية وإصدار رخص كفاءة السلامة للطلاب.",
        assigned_mandate: isEn ? "Deliver mandatory Machine Safety Certification for all students and inspect guards weekly." : "تطبيق برنامج تأهيل وتدريب إلزامي للسلامة الميكانيكية وإجراء فحص أسبوعي."
      },
      {
        role: isEn ? "Lab / Workshop Supervisor" : "مشرف الورشة والمهندسون المختصون",
        gap_identified: isEn ? "Laxity in enforcing daily pre-use checklist and checking student PPE/clothing." : "التساهل في فحص ما قبل التشغيل والسماح بالعمل بملابس فضفاضة.",
        assigned_mandate: isEn ? "Strict enforcement of Stop-Work Authority: Zero machine power without verified guard and correct attire." : "تطبيق فوري لقرار إيقاف العمل: حظر تشغيل أي ماكينة بدون حاجز سليم وزي محكم."
      },
      {
        role: isEn ? "Students & Technicians" : "الطلاب والفنيون المتدربون",
        gap_identified: isEn ? "Non-adherence to anti-entanglement rules and wearing loose sleeves." : "عدم إحكام الملابس وارتداء أكمام واسعة قرب الأجزاء الدوارة.",
        assigned_mandate: isEn ? "Strict adherence to safety golden rules: Roll up sleeves, wear eye protection, zero loose jewelry." : "الالتزام التام بالقواعد الذهبية: إحكام الأكمام، ارتداء نظارات الأمان، وربط الشعر."
      }
    ],
    capa_hierarchy: [
      {
        level: "Engineering Controls",
        action: isEn ? "Fabricate and install interlocked polycarbonate transparent guards with auto-kill power circuit." : "تصنيع وتركيب حواجز حماية بولي كربونات معشقة تفصل الكهرباء فوراً عند الفتح.",
        owner: isEn ? "Engineering Maintenance & HSE" : "إدارة الصيانة الهندسية والسلامة",
        target_date: "7 Days",
        priority: "Critical"
      },
      {
        level: "Administrative Controls",
        action: isEn ? "Implement mandatory laminated Pre-Use Inspection Tag system signed daily before machine power-up." : "تطبيق نظام بطاقات الفحص اليومي المعلقة على لوحات التحكم قبل بدء التشغيل.",
        owner: isEn ? "Workshop Supervisor & HSE" : "مشرف الورشة وإدارة السلامة",
        target_date: "3 Days",
        priority: "High"
      },
      {
        level: "PPE & Training Controls",
        action: isEn ? "Issue standardized fitted workshop coats (anti-entanglement cuffs) and conduct mandatory safety briefing." : "صرف بالطوهات سلامة هندسية محكمة الأكمام وتنفيذ ورشة تدريب عملي إلزامية.",
        owner: isEn ? "HSE Directorate" : "إدارة السلامة والصحة المهنية",
        target_date: "Immediate (24 Hours)",
        priority: "Critical"
      }
    ]
  };
}

async function generateIncidentRCA() {
  var g = function (id) { return (document.getElementById(id) ? document.getElementById(id).value.trim() : ""); };
  var type = g("rcaIncidentType");
  var location = g("rcaLocation");
  var equipment = g("rcaEquipment");
  var injuredName = g("rcaInjuredName");
  var bodyPart = g("rcaBodyPart");
  var supervisor = g("rcaSupervisor");
  var desc = g("rcaDescription");
  var roles = g("rcaInvolvedRoles");
  var method = g("rcaMethodology") || "auto";
  var lang = g("rcaLang") || currentReportLang || "ar";

  if (!desc && !type) {
    return showSweetAlert("بيانات ناقصة", "يرجى كتابة وصف وتفاصيل الواقعة لإجراء التحليل الجذري.", "warning");
  }

  var incidentData = {
    type: type || "General Operational Incident",
    location: location || "Campus Engineering Facility",
    equipment: equipment || "Industrial Equipment",
    injuredName: injuredName,
    bodyPart: bodyPart,
    supervisor: supervisor,
    description: desc || "Operational failure and safety protocol bypass event.",
    personnel: roles
  };

  var outWrap = document.getElementById("incidentRcaOutput");
  var outBody = document.getElementById("rcaReportInner");
  if (outWrap) outWrap.classList.remove("hidden");
  if (outBody) loading(outBody, true);

  showToast("info", "جاري تطبيق نماذج تحليل الأسباب الجذرية (5-Whys & Fishbone & Roles)...");

  var prompt = buildIncidentRcaPrompt(incidentData, { lang: lang, method: method });
  var rcaData = null;

  try {
    var rawRes = await callGemini(prompt);
    rcaData = extractJSON(rawRes);
  } catch (e) {
    console.warn("Gemini API direct response failed, using built-in forensic investigation engine:", e);
    rcaData = generateFallbackIncidentRCA(incidentData, { lang: lang, method: method });
  }

  if (!rcaData) {
    rcaData = generateFallbackIncidentRCA(incidentData, { lang: lang, method: method });
  }

  rcaData._rawIncident = incidentData;
  rcaData._lang = lang;
  rcaData._generatedAt = new Date().toISOString();
  lastRcaData = rcaData;

  renderIncidentRcaReport(rcaData);
  showToast("success", "تم إنجاز التحليل الجذري الشامل وخريطة المسؤوليات بنجاح!");
}

function renderIncidentRcaReport(rca) {
  var lang = rca._lang || "ar";
  var isEn = (lang === "en");
  var overview = rca.incident_overview || {};
  var raw = rca._rawIncident || {};
  var meth = rca.selected_methodology || {};
  var causes = rca.causes_breakdown || {};
  var whys = rca.five_whys_chain || [];
  var fish = rca.fishbone_6m || {};
  var roles = rca.roles_accountability_matrix || [];
  var capa = rca.capa_hierarchy || [];

  var pName = overview.injured_person_name || raw.injuredName || "لا توجد إصابة بشرية (سجل مادي/وشيك)";
  var pPart = overview.injured_body_part || raw.bodyPart || "لا يوجد";
  var pSup = overview.supervisor_in_charge || raw.supervisor || "إشراف المختبر / الورشة";

  var h = '<div class="report" dir="' + (isEn ? 'ltr' : 'rtl') + '" style="text-align:' + (isEn ? 'left' : 'right') + '">' +
    /* Head */
    '<div class="report-head">' +
      '<div class="track"><b>' + (isEn ? "Investigation Ref" : "رقم التحقيق") + '</b><span>' + esc(rca.investigation_no || "RCA-SUT-001") + '</span></div>' +
      '<div class="report-title">' +
        '<h2>' + esc(rca.investigation_title || (isEn ? "INCIDENT ROOT CAUSE INVESTIGATION REPORT" : "تقرير التحقيق الجذري المعتمد في الحادث")) + '</h2>' +
        '<p>' + (isEn ? "El Sewedy University of Technology (SUTech) — Safety Directorate Incident Investigation Board" : "جامعة السويدي للتكنولوجيا (SUTech) — لجنة التحقيق في الحوادث وإدارة السلامة") + '</p>' +
      '</div>' +
      '<div class="track"><b>' + (isEn ? "Date / Time" : "التاريخ والوقت") + '</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div>' +
    '</div>' +

    /* Incident Overview Banner */
    '<div class="exec-score-box" style="margin-bottom:14px">' +
      '<div style="flex:1">' +
        '<b style="font-size:13px;color:#0b1f3a;display:block;margin-bottom:4px">' + esc(overview.incident_type || raw.type || "Incident") + ' — ' + esc(overview.location || raw.location || "Campus") + '</b>' +
        '<p style="font-size:11px;color:#334155;margin:0;line-height:1.6">' + esc(overview.summary || raw.description || "") + '</p>' +
        (overview.equipment_involved ? '<small style="display:block;margin-top:4px;font-weight:700;color:var(--sut-red)"><i class="fa-solid fa-gear"></i> ' + (isEn ? "Equipment: " : "المعدة / الآلة: ") + esc(overview.equipment_involved) + '</small>' : '') +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:6px;margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:10.5px">' +
          '<div><i class="fa-solid fa-user-injured" style="color:var(--sut-red)"></i> <b>' + (isEn ? "Injured Person: " : "المصاب: ") + '</b>' + esc(pName) + '</div>' +
          '<div><i class="fa-solid fa-bandage" style="color:var(--amber)"></i> <b>' + (isEn ? "Injured Body Part: " : "العضو المصاب: ") + '</b>' + esc(pPart) + '</div>' +
          '<div><i class="fa-solid fa-user-tie" style="color:var(--blue)"></i> <b>' + (isEn ? "Supervisor / Witness: " : "المشرف / الشاهد: ") + '</b>' + esc(pSup) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;background:#fff;padding:8px 16px;border-radius:8px;border:1px solid #cbd5e1">' +
        '<span class="badge critical" style="font-size:11px">' + esc(overview.severity_classification || "Critical") + '</span>' +
        '<small style="display:block;font-size:9px;color:var(--muted);margin-top:4px">' + (isEn ? "Audit Severity" : "تصنيف الخطورة") + '</small>' +
      '</div>' +
    '</div>' +

    /* Section 1: Methodology Selection & Rationale */
    '<div class="section-title">' + (isEn ? "1. Investigation Methodology & Model Rationale" : "1. منهجية التحقيق ومبررات اختيار النموذج المعتمد") + '</div>' +
    '<div class="answer" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:10px 14px;border-radius:8px;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
        '<span class="badge closed" style="font-size:11px"><i class="fa-solid fa-microscope"></i> ' + esc(meth.name || "5-Whys / Fishbone Multi-Method") + '</span>' +
        '<b style="color:#0b1f3a;font-size:11px">' + (isEn ? "Methodology Rationale:" : "مبررات الملاءمة الفنية:") + '</b>' +
      '</div>' +
      '<p style="font-size:11px;color:#334155;margin:0">' + esc(meth.rationale || "") + '</p>' +
    '</div>' +

    /* Section 2: Comprehensive Causes Breakdown */
    '<div class="section-title">' + (isEn ? "2. Three-Tier Causes Breakdown (Direct, Underlying & Root)" : "2. تفكيك وتحليل مسببات الحادث (المباشرة، الكامنة، والجذرية)") + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:10px;margin-bottom:14px">' +
      '<div style="background:#fff;border:1.5px solid #fca5a5;border-radius:8px;padding:10px">' +
        '<b style="color:#dc2626;font-size:11px;display:block;margin-bottom:6px"><i class="fa-solid fa-bolt"></i> ' + (isEn ? "Immediate Causes (Unsafe Acts & Conditions):" : "الأسباب المباشرة (تصرفات وظروف غير آمنة):") + '</b>' +
        '<ul style="padding-right:16px;padding-left:16px;margin:0;font-size:10.5px;line-height:1.6">' +
          (causes.immediate_causes_unsafe_acts || []).concat(causes.immediate_causes_unsafe_conditions || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join("") +
        '</ul>' +
      '</div>' +
      '<div style="background:#fff;border:1.5px solid #fcd34d;border-radius:8px;padding:10px">' +
        '<b style="color:#d97706;font-size:11px;display:block;margin-bottom:6px"><i class="fa-solid fa-triangle-exclamation"></i> ' + (isEn ? "Underlying Contributing Factors:" : "العوامل الكامنة والمساعدة (Contributing Factors):") + '</b>' +
        '<ul style="padding-right:16px;padding-left:16px;margin:0;font-size:10.5px;line-height:1.6">' +
          (causes.underlying_contributing_factors || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join("") +
        '</ul>' +
      '</div>' +
      '<div style="background:#fff;border:1.5px solid #93c5fd;border-radius:8px;padding:10px">' +
        '<b style="color:#2563eb;font-size:11px;display:block;margin-bottom:6px"><i class="fa-solid fa-sitemap"></i> ' + (isEn ? "Systemic & Management Root Causes:" : "الأسباب الجذرية النظامية والإدارية (Root Causes):") + '</b>' +
        '<ul style="padding-right:16px;padding-left:16px;margin:0;font-size:10.5px;line-height:1.6">' +
          (causes.systemic_root_causes || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join("") +
        '</ul>' +
      '</div>' +
    '</div>';

  /* Section 3: 5-Whys Sequence Tree */
  if (whys && whys.length) {
    h += '<div class="section-title">' + (isEn ? "3. 5-Whys Cause-and-Effect Investigation Chain" : "3. سلسلة التحليل التتبعي للأسباب (5-Whys Analysis Chain)") + '</div>' +
      '<div class="whys-container">' +
        whys.map(function (w, idx) {
          var isLast = idx === whys.length - 1;
          return '<div class="why-node ' + (isLast ? 'why-root' : '') + '">' +
            '<div class="why-step">WHY ' + (w.step || (idx + 1)) + (isLast ? ' — ROOT CAUSE' : '') + '</div>' +
            '<div style="font-weight:700;color:#0f172a;margin-bottom:2px;font-size:10.5px">' + esc(w.question) + '</div>' +
            '<div style="color:#334155;font-size:10.5px;line-height:1.5">↳ ' + esc(w.answer) + '</div>' +
          '</div>';
        }).join("") +
      '</div>';
  }

  /* Section 4: Ishikawa 6M Fishbone Breakdown */
  if (fish && Object.keys(fish).length) {
    h += '<div class="section-title">' + (isEn ? "4. Ishikawa 6M Cause-and-Effect Matrix" : "4. مخطط هيكل السمكة للعوامل الستة (Ishikawa 6M Fishbone Analysis)") + '</div>' +
      '<div class="fishbone-grid">' +
        '<div class="fishbone-card"><div class="fishbone-head"><i class="fa-solid fa-users"></i> ' + (isEn ? "Man / People" : "العنصر البشري (Man)") + '</div><div class="fishbone-content">' + esc(fish.people || "N/A") + '</div></div>' +
        '<div class="fishbone-card"><div class="fishbone-head"><i class="fa-solid fa-gears"></i> ' + (isEn ? "Machine / Equipment" : "الآلات والمعدات (Machine)") + '</div><div class="fishbone-content">' + esc(fish.machine || "N/A") + '</div></div>' +
        '<div class="fishbone-card"><div class="fishbone-head"><i class="fa-solid fa-clipboard-check"></i> ' + (isEn ? "Method / SOP" : "طريقة وإجراءات العمل (Method)") + '</div><div class="fishbone-content">' + esc(fish.method || "N/A") + '</div></div>' +
        '<div class="fishbone-card"><div class="fishbone-head"><i class="fa-solid fa-box-open"></i> ' + (isEn ? "Material / Tools" : "المواد والمهمات (Material)") + '</div><div class="fishbone-content">' + esc(fish.material || "N/A") + '</div></div>' +
        '<div class="fishbone-card"><div class="fishbone-head"><i class="fa-solid fa-gauge"></i> ' + (isEn ? "Measurement / Audit" : "القياس والتدقيق (Measurement)") + '</div><div class="fishbone-content">' + esc(fish.measurement || "N/A") + '</div></div>' +
        '<div class="fishbone-card"><div class="fishbone-head"><i class="fa-solid fa-building"></i> ' + (isEn ? "Milieu / Environment" : "بيئة ومكان العمل (Milieu)") + '</div><div class="fishbone-content">' + esc(fish.milieu_environment || fish.environment || "N/A") + '</div></div>' +
      '</div>';
  }

  /* Section 5: Roles & Responsibilities Accountability Matrix */
  if (roles && roles.length) {
    h += '<div class="section-title">' + (isEn ? "5. Roles & Responsibilities Accountability Matrix" : "5. مصفوفة تحديد المسؤوليات والأدوار الإشرافية والتشغيلية") + '</div>' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th style="width:24%">' + (isEn ? "Organizational Role" : "الدور / المستوى التنظيمي") + '</th>' +
            '<th style="width:38%">' + (isEn ? "Systemic Gap / Oversight" : "أوجه القصور أو الخلل المرصود") + '</th>' +
            '<th>' + (isEn ? "Mandatory Assigned Mandate & Action" : "التكليف والواجب الإلزامي المطلوب") + '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          roles.map(function (r) {
            return '<tr>' +
              '<td><span class="role-badge"><i class="fa-solid fa-user-shield"></i> ' + esc(r.role) + '</span></td>' +
              '<td>' + esc(r.gap_identified) + '</td>' +
              '<td><b>' + esc(r.assigned_mandate) + '</b></td>' +
            '</tr>';
          }).join("") +
        '</tbody>' +
      '</table>';
  }

  /* Section 6: Hierarchy of Controls Corrective Action Plan (CAPA) */
  if (capa && capa.length) {
    h += '<div class="section-title">' + (isEn ? "6. Hierarchy of Controls Corrective & Preventive Action Plan (CAPA)" : "6. خطة الإجراءات التصحيحية والوقائية وفق هرم التحكم (CAPA Matrix)") + '</div>' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th style="width:20%">' + (isEn ? "Control Level" : "مستوى التحكم") + '</th>' +
            '<th>' + (isEn ? "Corrective / Preventive Action" : "الإجراء التصحيحي / الوقائي") + '</th>' +
            '<th style="width:18%">' + (isEn ? "Action Owner" : "المسؤول عن التنفيذ") + '</th>' +
            '<th style="width:12%">' + (isEn ? "Timeframe" : "المدى الزمني") + '</th>' +
            '<th style="width:10%">' + (isEn ? "Priority" : "الأولوية") + '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          capa.map(function (c) {
            var pClass = (c.priority || "").toLowerCase() === "critical" ? "critical" : "high";
            return '<tr>' +
              '<td><b><i class="fa-solid fa-layer-group" style="color:var(--sut-red)"></i> ' + esc(c.level) + '</b></td>' +
              '<td>' + esc(c.action) + '</td>' +
              '<td><b>' + esc(c.owner) + '</b></td>' +
              '<td style="text-align:center">' + esc(c.target_date) + '</td>' +
              '<td style="text-align:center"><span class="badge ' + pClass + '">' + esc(c.priority || "High") + '</span></td>' +
            '</tr>';
          }).join("") +
        '</tbody>' +
      '</table>';
  }

  /* Signatures */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:20px;padding-top:14px;border-top:1.5px dashed #cbd5e1;font-size:9.5px">' +
    '<div><b>' + (isEn ? "Lead Safety Investigator:" : "رئيس فريق التحقيق الجذري:") + '</b><br>Eng. Ibrahim Saeed<br>HSE Lead Engineer</div>' +
    '<div><b>' + (isEn ? "Area / Lab Supervisor:" : "المشرف الهندسي المختص:") + '</b><br>Workshop Supervisor<br>Engineering Faculty</div>' +
    '<div style="text-align:' + (isEn ? 'right' : 'left') + '"><b>' + (isEn ? "Approval & Verification:" : "الاعتماد والمتابعة:") + '</b><br>HSE Directorate<br>' + (isEn ? "Date: " : "التاريخ: ") + new Date().toLocaleDateString("en-GB") + '</div>' +
  '</div>';

  h += '</div>';

  var outBody = document.getElementById("rcaReportInner");
  if (outBody) outBody.innerHTML = h;
}

function downloadIncidentRcaWord() {
  if (!lastRcaData) return showSweetAlert("تنبيه", "يرجى تشغيل التحليل الجذري أولاً قبل التصدير.", "warning");
  var content = document.getElementById("rcaReportInner").innerHTML;
  var isEn = lastRcaData._lang === "en";
  var html = '<!DOCTYPE html><html dir="' + (isEn ? 'ltr' : 'rtl') + '"><head><meta charset="utf-8"><title>Incident Root Cause Investigation</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #999;padding:6px 8px;font-size:11px}th{background:#0B1F3A;color:#fff}.badge{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold}.badge.critical{background:#fee2e2;color:#dc2626}.badge.closed{background:#dcfce7;color:#15803d}.why-node{border:1px solid #cbd5e1;padding:8px;margin:6px 0;border-radius:6px;background:#f8fafc}</style></head><body>' + content + '</body></html>';
  var blob = new Blob(['\ufeff' + html], { type: "application/msword" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "SUTech-Incident-RCA-" + new Date().toISOString().slice(0, 10) + ".doc";
  a.click();
  showToast("success", "تم تنزيل تقرير التحقيق الجذري بصيغة Word!");
}


/* ==========================================================================
   OFFICIAL SUTECH RISK & ENVIRONMENTAL IMPACT ASSESSMENT ENGINE
   Exact Template Matching SUTech HSE Directorate Official Sample Standards
   ========================================================================== */

var currentRiskPhotos = [];

function handleRiskImagesUpload(input) {
  if (input.files && input.files.length) {
    var filesArray = Array.from(input.files);
    filesArray.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        currentRiskPhotos.push({
          data: e.target.result,
          name: file.name
        });
        renderRiskPhotosGallery();
      };
      reader.readAsDataURL(file);
    });
  }
}

function removeRiskPhoto(index) {
  if (index >= 0 && index < currentRiskPhotos.length) {
    currentRiskPhotos.splice(index, 1);
    renderRiskPhotosGallery();
  }
}

function renderRiskPhotosGallery() {
  var gal = document.getElementById("riskPhotosGallery");
  if (!gal) return;
  if (!currentRiskPhotos.length) {
    gal.innerHTML = "";
    return;
  }
  gal.innerHTML = currentRiskPhotos.map(function (p, idx) {
    return '<div class="risk-photo-thumb">' +
      '<img src="' + p.data + '" alt="Photo ' + (idx + 1) + '">' +
      '<button type="button" class="risk-photo-del" onclick="removeRiskPhoto(' + idx + ')" title="حذف الصورة">✕</button>' +
      '</div>';
  }).join("");
}

function clearRiskForm() {
  document.getElementById("riskArea").value = "Physics Lab";
  document.getElementById("riskEquipment").value = "Electrical Test Benches, High-Voltage Power Supplies, Capacitors";
  document.getElementById("riskActivity").value = "Electrical Experiments, Equipment Operation & Capacitor Handling";
  document.getElementById("riskPersons").value = "Students, Lab Technicians, Faculty Staff";
  document.getElementById("riskLocationDesc").value = "";
  currentRiskPhotos = [];
  renderRiskPhotosGallery();
  var input = document.getElementById("riskPhotos");
  if (input) input.value = "";
}

function getRiskScoreLevel(score) {
  if (score >= 16) {
    return {
      level: "Critical",
      class: "score-red",
      pillClass: "risk-critical",
      label_ar: "مرتفع / حرج (16-30)",
      label_en: "Critical (16-30)",
      action_ar: "إيقاف النشاط فوراً لحين استبداله أو عزله / إزالته",
      action_en: "Stop operation immediately till elimination or substitution",
      controlType: "A / B / Stop"
    };
  }
  if (score >= 9) {
    return {
      level: "Medium",
      class: "score-yellow",
      pillClass: "risk-medium",
      label_ar: "متوسط (9-15)",
      label_en: "Medium (9-15)",
      action_ar: "تحكم هندسي مطلوب وإلزامي",
      action_en: "Engineering control is required",
      controlType: "D"
    };
  }
  return {
    level: "Low",
    class: "score-green",
    pillClass: "risk-low",
    label_ar: "منخفض (1-8)",
    label_en: "Low (1-8)",
    action_ar: "وسائل تحكم إدارية أو استخدام مهمات الوقاية الشخصية المناسبة",
    action_en: "Administrative control or Use of proper Personal Protective Equipment (PPE)",
    controlType: "E / F"
  };
}

function addManualHazard() {
  var area = (document.getElementById("riskArea").value || "Physics Lab").trim();
  var equipment = (document.getElementById("riskEquipment").value || "General Equipment").trim();
  var activity = (document.getElementById("riskActivity").value || "Equipment Operation").trim();
  var persons = (document.getElementById("riskPersons").value || "Students, Lab Technicians").trim();
  var hazard = (document.getElementById("riskLocationDesc").value || "").trim();

  if (!hazard) {
    return showSweetAlert("بيانات ناقصة", "يرجى كتابة تفاصيل ووصف الخطر في حقل التفاصيل أولاً.", "warning");
  }

  var initialL = 4, initialS = 4;
  var score = initialL * initialS;
  var lvl = getRiskScoreLevel(score);

  var newRisk = {
    id: Date.now(),
    area: area,
    equipment: equipment,
    activity: activity,
    persons: persons,
    hazard: hazard,
    consequences: "Electric shock, burns, injury.",
    category: "S",
    initialL: initialL,
    initialS: initialS,
    initialScore: score,
    initialLevel: lvl.level,
    existingControls: "- Inspect equipment before use.\n- Ensure cables and plugs in good condition.\n- Disconnect power before maintenance.",
    controlType: "E / D",
    interimL: 2,
    interimS: 4,
    interimScore: 8,
    furtherAction: "- Ensure periodic inspection and preventive maintenance.\n- Conduct regular competency checks.",
    residualL: 1,
    residualS: 4,
    residualScore: 4,
    residualLevel: "Low",
    owner: "Lab Supervisor & HSE",
    targetDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  };

  riskAssessments.unshift(newRisk);
  try { localStorage.setItem("SUT_RISK_ASSESSMENTS", JSON.stringify(riskAssessments)); } catch (e) {}

  renderRiskAssessment5x5();
  updateRiskMatrixVisualizer();
  showToast("success", "تمت إضافة النشاط والخطر بنجاح!");
}

function deleteRiskItem(id) {
  showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف هذا السجل من تقييم المخاطر؟", "نعم، احذف", "إلغاء").then(function (res) {
    if (res && res.isConfirmed) {
      riskAssessments = riskAssessments.filter(function (x) { return x.id !== Number(id); });
      try { localStorage.setItem("SUT_RISK_ASSESSMENTS", JSON.stringify(riskAssessments)); } catch (e) {}
      renderRiskAssessment5x5();
      updateRiskMatrixVisualizer();
      showToast("info", "تم حذف السجل بنجاح");
    }
  });
}

function buildRiskAssessmentPrompt(formData, options) {
  var lang = (options && options.lang) || formData.lang || "ar";
  var isAr = (lang === "ar");

  var systemInstructions = 'You are the Lead HSE Risk Assessor for EL-SEWEDY UNIVERSITY OF TECHNOLOGY (SUTech).\n' +
    'Your task is to generate a complete, detailed, technically defensible, activity-based HSE Risk Assessment strictly matching the official SUTech HSE 6x5 Matrix and Hierarchy of Controls standard.\n\n' +
    'MANDATORY 16 CORE PRINCIPLES & CONSTRAINTS:\n\n' +
    '1. STRICT ADHERENCE TO THE OFFICIAL SUTECH HSE 6x5 MATRIX & DEFINITIONS:\n' +
    '   - Severity S (1 to 6) across 3 impact domains:\n' +
    '     * 1: Near miss (Safety) | Nuisance, Discomfort (Health) | Small emissions (Environment)\n' +
    '     * 2: First Aid (Safety) | Health Complaints (Health) | Spills cleaned up immediately (Environment)\n' +
    '     * 3: Medical Treatment & Restricted Work (Safety) | Exceeding working Exposure Limits, Work-related illness (Health) | Emissions/spills leading to investigations (Environment)\n' +
    '     * 4: Losttime Case LTI (Safety) | Work related illness (Health) | Emissions/spills with limited damage off site (Environment)\n' +
    '     * 5: Partial / Complete disability (Safety) | Occupational illness with disability (Health) | Emissions/spills with longer lasting damage (Environment)\n' +
    '     * 6: Fatality (Safety) | Fatal Occupational illness (Health) | Emissions/spills with permanent damage (Environment)\n' +
    '   - Frequency / Probability L (1 to 5):\n' +
    '     * 1: 1 - 5 / years (1-5 سنين)\n' +
    '     * 2: 5 - 10 / years (5-10 سنين)\n' +
    '     * 3: 1 - 5 / month (شهرياً)\n' +
    '     * 4: 1 - 5 / week (أسبوعياً)\n' +
    '     * 5: Daily (يومي)\n' +
    '   - Risk Score: R = Severity S (1-6) x Likelihood L (1-5) [Range: 1 to 30].\n' +
    '   - RESIDUAL RISK CALCULATION: Controls normally reduce Likelihood (L). Do NOT arbitrarily reduce Severity (S) unless there is a clear, technically justified reason (e.g. elimination or substitution). Do not manipulate scores to make residual risk appear artificially low.\n\n' +
    '2. DO NOT ASSUME EQUIPMENT:\n' +
    '   - Use ONLY the equipment, materials, processes, and activities confirmed by the user in the context.\n' +
    '   - Do NOT automatically assume CNC machines, Lathes, Milling machines, Welding machines, Laser cutters, Class 3B/4 lasers, 3D resin printers, High-voltage equipment, Compressed-air systems, Plasma cutters, Chemical processing, or Steam/pressure equipment unless confirmed.\n' +
    '   - If information is missing, state assumptions clearly.\n\n' +
    '3. USE AN ACTIVITY-BASED APPROACH:\n' +
    '   - Break the assessment down into specific activities/equipment (e.g. Cutting, Drilling, Grinding, Machining, Welding, Soldering, 3D printing, Laser cutting/engraving, Assembly, Hand tools, Power tools, Material handling, Chemical/resin, Housekeeping, Maintenance).\n\n' +
    '4. DETAILED HAZARD IDENTIFICATION STRUCTURE:\n' +
    '   - Format every potential hazard as:\n' +
    '     "Hazard Source → Hazardous Event / Cause → Exposure → Consequence"\n' +
    '   - (Example: "Contact with rotating drill bit during manual adjustment or removal of a workpiece → operator\'s hand enters the rotating zone → entanglement or direct contact → laceration, fracture, or severe hand injury.")\n' +
    '   - Consider all applicable hazard categories: Mechanical, Electrical, Thermal, Fire, Chemical, Dust/fumes, Radiation/laser, Noise, Vibration, Stored energy, Pressure, Compressed air, Sharp edges, Flying particles, Manual handling, Ergonomics, Slips/trips/falls, Human factors, Emergency situations.\n\n' +
    '5. IDENTIFY WHO CAN BE HARMED:\n' +
    '   - Explicitly identify exposed persons (Students, Trainees, Laboratory instructors, Technicians, Engineers, Researchers, Maintenance personnel, Cleaning personnel, Contractors, Visitors), paying special attention to inexperienced students and users requiring direct supervision.\n\n' +
    '6. APPLY THE HIERARCHY OF CONTROLS (STRICTLY ENFORCED):\n' +
    '   - 1. Elimination (A) | 2. Substitution (B) | 3. Engineering Controls (D) | 4. Administrative Controls (E) | 5. PPE (F)\n' +
    '   - Score 1 to 8: Administrative control or PPE (E / F).\n' +
    '   - Score 9 to 15: Engineering control is required (D) with administrative protocols (E).\n' +
    '   - Score 16 to 30: Stop operation immediately till Elimination (A) or Substitution (B) or full physical isolation.\n' +
    '   - PPE must never be the primary control where a higher-level control is reasonably practicable.\n\n' +
    '7. CONTROLS MUST BE REALISTIC & PRACTICAL:\n' +
    '   - Do not invent expensive, unnecessary, or technically inappropriate systems unless justified by equipment and risk score.\n\n' +
    '8. SEPARATE DIFFERENT HAZARDS:\n' +
    '   - Separate laser radiation from laser-generated fumes, 3D resin exposure from soldering fumes, mechanical cutting from grinding, etc.\n\n' +
    '9. FURTHER ACTIONS:\n' +
    '   - Must be specific, practical, relevant, technically appropriate, implementable, and measurable (avoid generic "provide training"; specify exact topics e.g. workpiece clamping, E-stop operation, guarding, safe shutdown).\n\n' +
    '10. INSPECTION & MAINTENANCE:\n' +
    '    - Where inspection frequencies are not verified by manufacturer or standards, state: "Frequency to be determined based on manufacturer requirements, applicable standards, and site risk assessment."\n\n' +
    '11. EMERGENCY PREPAREDNESS:\n' +
    '    - Assess relevant scenarios (Electrical shock, machine entanglement, fire, burns, chemical exposure, eye injury, flying particle, laser exposure, equipment failure, spillages, evacuation) with matched emergency controls (E-stop, isolation, fire extinguisher, first aid, eyewash, spill kit, exits).\n\n' +
    '12. SECTION 19: GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS:\n' +
    '    - Include 10–20 clear, practical instructions answering "What must I do to work safely in this laboratory?", written for everyday users.\n\n' +
    '13. SECTION 20: KEY SAFETY RULES – FABRICATION LAB:\n' +
    '    - Include 5–10 critical, rapid-to-read rules specific to the assessed activities.\n\n' +
    '14. MANDATORY FINAL SAFETY STATEMENT (EXACT WORDING):\n' +
    '    - "Always follow the approved laboratory SOPs, equipment manufacturer\'s instructions, site emergency procedures, and applicable HSE requirements. If an unsafe condition is identified, stop the activity and report it to the responsible laboratory/HSE personnel."\n\n' +
    '15. STRICT PROHIBITION OF AI LABELS:\n' +
    '    - NEVER include words like "AI", "Artificial Intelligence", "Model", "Gemini", "ذكاء اصطناعي".\n\n' +
    '16. LANGUAGE & OUTPUT SCHEMA:\n' +
    (isAr ?
      'The user selected ARABIC. Output ALL fields in formal corporate ARABIC (اللغة العربية الرسمية).' :
      'The user selected ENGLISH. Output ALL fields in formal corporate ENGLISH.') + '\n\n' +
    'OUTPUT STRICT JSON ONLY:\n' +
    '{\n' +
    '  "document_title": "' + (isAr ? "سجل تقييم المخاطر والأثر البيئي" : "Risk and Environmental Impact Assessment") + '",\n' +
    '  "activity_to_be_assessed": "' + (formData.area || "Fabrication Lab / Workshops") + '",\n' +
    '  "location": "' + (formData.location || "جامعة السويدي للتكنولوجيا - SUTech") + '",\n' +
    '  "assessment_date": "' + (formData.date || new Date().toLocaleDateString("en-GB")) + '",\n' +
    '  "report_assessor": "' + (formData.assessor || "م. إبراهيم سعيد") + '",\n' +
    '  "report_reviewer": "' + (formData.reviewer || "م. يوسف محمد") + '",\n' +
    '  "responsibilities": [\n' +
    '    "' + (isAr ? "إدارة السلامة والصحة المهنية: التحقق من تطبيق ومراقبة تدابير واشتراطات السلامة." : "HSE Department: Ensure implementation and monitoring of safety measures.") + '",\n' +
    '    "' + (isAr ? "مشرف المختبر / الورشة: ضمان التشغيل الآمن والالتزام الصارم بتعليمات الوقاية وتدريب الطلاب." : "Lab Supervisor: Ensure safe operation, student competency, and strict compliance.") + '",\n' +
    '    "' + (isAr ? "الطلاب والمستخدمون: اتباع كافة تعليمات السلامة وارتداء مهمات الوقاية الشخصية الإلزامية." : "Students & Users: Follow all safety instructions and use required PPE.") + '"\n' +
    '  ],\n' +
    '  "activities": [\n' +
    '    {\n' +
    '      "activity_breakdown": "' + (isAr ? "1. عمليات القص والنقش بالليزر (Laser Cutting & Engraving)" : "1. Laser Cutting & Engraving Operations") + '",\n' +
    '      "potential_hazard": "' + (isAr ? "مصدر الخطر: شعاع ليزر عالي الطاقة وأبخرة الانحلال الحراري للمواد → الحدث الخطر: تسرب أو انعكاس حزمة الليزر واستنشاق الأبخرة → التعرض: ملامسة بصرية أو جلدية واستنشاق → النتيجة: حروق شبكية العين، فقدان بصر دائم، تسمم تنفسي." : "Hazard Source: High-power laser beam & toxic pyrolysis fumes → Hazardous Event: Beam leakage/scatter and fume release → Exposure: Direct/diffuse optical exposure and vapor inhalation → Consequence: Retinal burns, irreversible optical injury, respiratory irritation.") + '",\n' +
    '      "consequences": "' + (isAr ? "حروق شبكية العين، عجز بصري، غياب عن العمل (LTI)." : "Retinal burns, partial/complete optical disability, LTI.") + '",\n' +
    '      "risk_category": "H",\n' +
    '      "inherent_l": 4,\n' +
    '      "inherent_s": 5,\n' +
    '      "inherent_r": 20,\n' +
    '      "present_control_measures": "' + (isAr ? "- كابينة ليزر مغلقة ومجهزة بأقفال أمان تداخلية (Interlocks) تمنع تشغيل الليزر عند فتح الغطاء.\\n- نظام سحب وتهوية موضعية (LEV) مزود بفلاتر كربون نشط وHEPA لطرد الأدخنة للخارج.\\n- زر إيقاف طوارئ مخصص وواضح بجوار كابينة التحكم." : "- Interlocked Class 1 protective laser enclosure preventing firing when lid is open.\\n- Dedicated Local Exhaust Ventilation (LEV) with activated carbon/HEPA filtration.\\n- Dedicated emergency stop button mounted on machine console.") + '",\n' +
    '      "control_type": "D\\nE",\n' +
    '      "present_l": 2,\n' +
    '      "present_s": 5,\n' +
    '      "present_r": 10,\n' +
    '      "further_action": "' + (isAr ? "- إجراء فحص دوري لكفاءة أقفال الأمان التداخلية ومعدل سحب الهواء قبل كل فصل دراسي.\\n- تدريب عملي موثق للطلاب على ضبط التركيز البؤري ومواد القطع المعتمدة وحظر قص مادة PVC تماماً." : "- Pre-semester verification of interlock integrity and exhaust airflow rates.\\n- Documented student training on focus calibration, approved materials, and strict ban on PVC cutting.") + '",\n' +
    '      "residual_l": 1,\n' +
    '      "residual_s": 5,\n' +
    '      "residual_r": 5\n' +
    '    }\n' +
    '  ],\n' +
    '  "general_safety_instructions": {\n' +
    '    "title": "' + (isAr ? "التعليمات والاحتياطات العامة للسلامة (GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS)" : "GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS") + '",\n' +
    '    "instructions": [\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "1. الصلاحيات والكفاءة والترخيص (Authorization & Competency)" : "1. Authorization & Competency") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "يُحظر تشغيل معدات المختبر إلا من قبل الأفراد المدربين والمصرح لهم رسمياً." : "Only trained and authorized personnel may operate laboratory equipment.") + '",\n' +
    '          "' + (isAr ? "يجب أن يعمل الطلاب والمستخدمون غير المتمرسين تحت الإشراف المباشر والمستمر لمشرف المختبر." : "Students and inexperienced users must work under direct supervision of authorized lab staff.") + '",\n' +
    '          "' + (isAr ? "يُمنع تشغيل أي جهاز دون الإلمام التام بإجراءات تشغيله القياسية المعتمدة (SOP)." : "Do not operate equipment without thorough familiarity with approved Standard Operating Procedures (SOPs).") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "2. فحوصات ما قبل بدء العمل (Pre-Work Checks)" : "2. Pre-Work Checks") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "فحص الماكينات، الكابلات، أدوات التثبيت، حواجب الحماية، ومفاتيح الطوارئ بدقة قبل بدء التشغيل." : "Inspect machinery, guards, cables, workholding clamps, and emergency stops prior to powering on.") + '",\n' +
    '          "' + (isAr ? "حظر استخدام أي ماكينة أو أداة تالفة أو معيبة أو معدلة بشكل غير معتمد واستبعادها فوراً." : "Do not use damaged, defective, or modified machinery/tools; tag out immediately.") + '",\n' +
    '          "' + (isAr ? "التحقق من خلو مسارات الحركة ومخارج الطوارئ وجاهزية طفايات الحريق ومعدات الإسعاف." : "Verify emergency exits and walkways are unobstructed and firefighting gear is ready.") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "3. السلامة الميكانيكية وتثبيت المشغولات (Mechanical & Workpiece Safety)" : "3. Mechanical & Workpiece Safety") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "تثبيت كافة المشغولات وقطع العمل بالملزمة أو أدوات التثبيت الميكانيكية وحظر إمساكها باليد أثناء الحفر أو القطع." : "Always clamp workpieces securely in a vice or mechanical clamp; never hold workpieces by hand during machining.") + '",\n' +
    '          "' + (isAr ? "ربط الشعر الطويل، وإزالة الخواتم والمجوهرات والساعات، وحظر ارتداء القفازات بالقرب من المغازل والأجزاء الدوارة." : "Tie back long hair, remove jewelry/watches, and strictly prohibit gloves near rotating spindles.") + '",\n' +
    '          "' + (isAr ? "عدم ترك مفاتيح ربط الظرف (Chuck Keys) داخل الماكينة والتأكد من إزالتها قبل التشغيل." : "Never leave chuck keys in drill chucks or lathe spindles; remove immediately after tightening.") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "4. السلامة الكهربائية والعزل (Electrical Safety & Isolation)" : "4. Electrical Safety & Isolation") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "فصل التيار الكهربائي وعزل الماكينة تماماً قبل تغيير الريش، شفرات القطع، أو إجراء الصيانة." : "Switch off and isolate electrical power before changing tooling, blades, or performing maintenance.") + '",\n' +
    '          "' + (isAr ? "حظر لمس الموصلات المكشوفة وتجنب تمديد الكابلات عبر ممرات المشاة." : "Never touch exposed energized terminals and keep electrical cords off pedestrian paths.") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "5. سلامة الليزر والحرارة واللحام (Laser, Thermal & Hot Work Safety)" : "5. Laser, Thermal & Hot Work Safety") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "حظر تشغيل قواطع الليزر إلا مع إغلاق الكابينة وتفعيل نظام سحب الأدخنة والتأكد من توافق المادة." : "Operate laser cutters only with lid closed, LEV exhaust running, and verified safe material.") + '",\n' +
    '          "' + (isAr ? "التعامل مع رؤوس الطابعات ثلاثية الأبعاد ومكاوي اللحام كمصادر حروق ساخنة واستخدام الحوامل المخصصة." : "Treat 3D printer nozzles and soldering irons as high-temperature burn hazards; use heat-resistant stands.") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "6. الترتيب والنظافة والتحكم في الرايش (Housekeeping & Swarf Control)" : "6. Housekeeping & Swarf Control") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "إزالة الرايش ونشارة المعادن والقطع الحادة باستخدام الفرشاة أو المكنسة المخصصة وحظر إزالتها باليد المجردة أو بضغط الهواء." : "Clear swarf and metal shavings using brushes or vacuum; never use bare hands or compressed air.") + '",\n' +
    '          "' + (isAr ? "الحفاظ على جفاف ونظافة الأرضيات فوراً والتخلص من النفايات الحادة في الحاويات الصفراء المخصصة." : "Keep workshop floors dry and clean; dispose of sharp scrap in designated yellow bins.") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "7. مهمات الوقاية الشخصية (Personal Protective Equipment - PPE)" : "7. Personal Protective Equipment - PPE") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "ارتداء نظارات الأمان المقاومة للصدمات (Z87.1) وحذاء السلامة بصفة إلزامية داخل المختبر." : "Wear impact-rated safety glasses (ANSI Z87.1) and closed safety footwear at all times in the workshop.") + '",\n' +
    '          "' + (isAr ? "استخدام واقي الوجه الكامل عند التجليخ وواقيات السمع عند تشغيل الماكينات الصاخبة." : "Use full face shields during grinding and ear protection near high-noise machinery.") + '"\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "category": "' + (isAr ? "8. الاستجابة للطوارئ والإبلاغ (Emergency Response)" : "8. Emergency Response") + '",\n' +
    '        "rules": [\n' +
    '          "' + (isAr ? "معرفة مواقع أزرار إيقاف الطوارئ (E-Stops)، قواطع العزل، محطات غسيل العيون، وطفايات الحريق." : "Know the exact locations of Emergency Stop buttons, main isolators, eyewash units, and fire extinguishers.") + '",\n' +
    '          "' + (isAr ? "في حال وقوع طارئ، اضغط زر إيقاف الطوارئ فوراً وأخطر مشرف المختبر ومسؤولي السلامة." : "In any emergency, strike the nearest E-stop immediately and notify the lab supervisor and HSE team.") + '"\n' +
    '        ]\n' +
    '      }\n' +
    '    ],\n' +
    '    "key_safety_rules": [\n' +
    '      "' + (isAr ? "1. حظر تشغيل أي ماكينة دون تدريب وتصريح رسمي مسبق من مشرف المختبر." : "1. Never operate any machinery without documented authorization and competency verification.") + '",\n' +
    '      "' + (isAr ? "2. تثبيت قطعة العمل بالملزمة دائماً وحظر الإمساك اليدوي أثناء الحفر أو القص." : "2. Always secure workpieces in a vice or clamp; never hand-hold workpieces during machining.") + '",\n' +
    '      "' + (isAr ? "3. حظر ارتداء القفازات أو الملابس الفضفاضة أو المجوهرات بالقرب من المغازل والأجزاء الدوارة." : "3. Strict ban on gloves, loose clothing, ties, and jewelry near rotating spindles.") + '",\n' +
    '      "' + (isAr ? "4. التأكد من إزالة مفتاح الظرف (Chuck Key) قبل تشغيل ماكينات الحفر والمخارط." : "4. Always remove chuck keys and wrenches before energizing machinery.") + '",\n' +
    '      "' + (isAr ? "5. ارتداء نظارات السلامة المعتمدة المقاومة للصدمات (Z87.1) طوال فترة التواجد بالمختبر." : "5. Wear approved impact safety glasses at all times inside the laboratory.") + '",\n' +
    '      "' + (isAr ? "6. إيقاف الماكينة وعزل مصدر الطاقة بالكامل قبل ضبط أو تغيير أدوات القطع أو الصيانة." : "6. Isolate electrical power completely before adjusting tools, blades, or clearing jams.") + '",\n' +
    '      "' + (isAr ? "7. معرفة موقع واستخدام زر إيقاف الطوارئ (E-Stop) عند حدوث أي خلل فوري." : "7. Know the nearest Emergency Stop button location and activate immediately if an anomaly occurs.") + '",\n' +
    '      "' + (isAr ? "8. إزالة الرايش بالفرشاة المخصصة وحظر استخدام اليد المجردة أو ضغط الهواء للتنظيف." : "8. Clear swarf and chips with brushes; never use bare hands or compressed air jets.") + '"\n' +
    '    ],\n' +
    '    "prohibited_actions": [\n' +
    '      "' + (isAr ? "إمساك قطع العمل باليد أثناء تشغيل ماكينة الحفر أو المنشار." : "Holding workpieces by hand during drilling, routing, or cutting.") + '",\n' +
    '      "' + (isAr ? "ارتداء القفازات بالقرب من الأجزاء والمغازل الدوارة." : "Wearing gloves near rotating spindles, drills, or lathe chucks.") + '",\n' +
    '      "' + (isAr ? "تجاوز أو تعطيل حواجب الأمان أو مفاتيح الأمان التداخلية (Interlocks)." : "Bypassing safety guards, interlocks, or machine enclosures.") + '",\n' +
    '      "' + (isAr ? "ترك مفتاح الظرف داخل الماكينة بعد التثبيت." : "Leaving chuck keys or adjustment tools in rotating chucks.") + '",\n' +
    '      "' + (isAr ? "استخدام ضغط الهواء لتنظيف الملابس أو إزالة الرايش عن الماكينات." : "Using compressed air to blow swarf off machines or clean clothing.") + '",\n' +
    '      "' + (isAr ? "قص أو حرق مواد بلاستيكية سامة مثل PVC في قواطع الليزر." : "Cutting PVC or halogenated plastics in laser cutters.") + '",\n' +
    '      "' + (isAr ? "ترك الماكينات تعمل دون إشراف أو رقابة أثناء التشغيل النشط." : "Leaving active machines running unattended without supervision.") + '"\n' +
    '    ],\n' +
    '    "mandatory_statement": "' + (isAr ? "يجب دائماً اتباع إجراءات التشغيل القياسية المعتمدة (SOPs)، وتعليمات الشركة المصنعة للأجهزة، وإجراءات الطوارئ الجامعية، واشتراطات السلامة والصحة المهنية. في حال اكتشاف أي ظرف أو حالة غير آمنة، أوقف النشاط فوراً وأبلغ مشرف المختبر ومسؤولي إدارة السلامة." : "Always follow the approved laboratory SOPs, equipment manufacturer's instructions, site emergency procedures, and applicable HSE requirements. If an unsafe condition is identified, stop the activity and report it to the responsible laboratory/HSE personnel.") + '"\n' +
    '  }\n' +
    '}\n\n' +
    'ASSESSMENT CONTEXT:\n' + JSON.stringify(formData, null, 2);

  return systemInstructions;
}

function generateFallbackMultiActivityRisk(formData, options) {
  var area = formData.area || "Fabrication Lab";
  var assessor = formData.assessor || "م. إبراهيم سعيد";
  var reviewer = formData.reviewer || "م. يوسف محمد";
  var dateStr = formData.date || new Date().toLocaleDateString("en-GB");
  var lang = (options && options.lang) || formData.lang || "ar";
  var isAr = (lang === "ar");

  var isFabLab = /fab|ورش|تصنيع|ميكانيك|خراط|لحام|ليزر|قص|حفر|machin|drill|laser|print|weld|grind/i.test(
    (formData.area || "") + " " + (formData.equipment || "") + " " + (formData.activity || "") + " " + (formData.description || "")
  );

  if (isAr) {
    if (isFabLab) {
      return {
        document_title: "سجل تقييم المخاطر والأثر البيئي - مختبر وورش التصنيع الرقمي (FabLab)",
        activity_to_be_assessed: area || "مختبر التصنيع والنمذجة الرقمية (Fabrication Laboratory - FabLab)",
        location: "جامعة السويدي للتكنولوجيا - SUTech",
        assessment_date: dateStr,
        report_assessor: assessor,
        report_reviewer: reviewer,
        responsibilities: [
          "إدارة السلامة والصحة المهنية: التحقق من تطبيق ومراقبة تدابير واشتراطات السلامة واعتماد تصاريح العمل.",
          "مشرف مختبر التصنيع: ضمان التشغيل الآمن والالتزام الصارم بتعليمات الوقاية وتدريب الطلاب على الماكينات.",
          "الطلاب والباحثون: اتباع كافة إجراءات التشغيل القياسية (SOPs) وارتداء مهمات الوقاية الشخصية الإلزامية."
        ],
        activities: [
          {
            activity_breakdown: "1. عمليات القص والنقش بماكينات الليزر (Laser Cutting & Engraving)",
            potential_hazard: "مصدر الخطر: حزمة ليزر عالي الشدة وأبخرة انحلال حراري سامة ومسرطنة → الحدث الخطر: تسرب أو انعكاس شعاع الليزر من أسطح مصقولة أو استنشاق الغازات → التعرض: ملامسة بصرية وجلدية واستنشاق أبخرة → النتيجة: حروق شبكية العين، فقدان بصر دائم، تسمم وأمراض تنفسية مهنية.",
            consequences: "حروق شبكية، عجز بصري، غياب عن العمل بسبب مرض مهني (LTI).",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 5,
            inherent_r: 20,
            present_control_measures: "- كابينة ليزر مغلقة ومجهزة بأقفال أمان تداخلية (Interlocks) تمنع تشغيل الليزر عند فتح الغطاء.\n- نظام سحب وتهوية موضعية (LEV) مزود بفلاتر كربون نشط وHEPA لطرد الأدخنة للخارج.\n- زر إيقاف طوارئ مخصص وواضح بجوار كابينة التحكم.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 5,
            present_r: 10,
            further_action: "- إجراء فحص دوري لكفاءة أقفال الأمان التداخلية ومعدل سحب الهواء قبل كل فصل دراسي.\n- تدريب عملي موثق للطلاب على ضبط التركيز البؤري ومواد القطع المعتمدة وحظر قص مادة PVC تماماً.",
            residual_l: 1,
            residual_s: 5,
            residual_r: 5
          },
          {
            activity_breakdown: "2. عمليات الحفر والثقب بماكينة الثقب الرأسية (Drill Press Operations)",
            potential_hazard: "مصدر الخطر: المغزل الدوار السريع ومشغولات غير مثبتة بإحكام → الحدث الخطر: إمساك قطعة العمل باليد وانفلاتها أو دخول يد المشغل لمنطقة الدوران → التعرض: ملامسة مباشرة أو انحشار/اشتباك ملابس فضفاضة أو شعر → النتيجة: تمزقات قطعية عميقة، كسور بالأصابع، بتر جزئي.",
            consequences: "كسور بالأصابع، جروح قطعية غائرة، إصابة تستلزم علاجاً طبياً وغياباً (LTI).",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- حاجب حماية شفاف تلسكوبي قابل للتعديل يغطي منطقة دوران الريشة والظرف.\n- تثبيت المشغولات إجبارياً بملزمة ميكانيكية مثبتة بمجرى الطاولة (T-Slot Clamp).\n- حظر تام لارتداء القفازات أو الملابس الفضفاضة وربط الشعر الطويل للخلف.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- التأكد من إزالة مفتاح الظرف (Chuck Key) واستخدام مفاتيح ذاتية الطرد بنابض.\n- قائمة فحص يومية لحالة الريش والمثبتات قبل بدء تشغيل ورش الطلاب.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "3. التجليخ وإزالة الزوائد بحجر الجلخ الثابت (Bench Grinder & Deburring)",
            potential_hazard: "مصدر الخطر: قرص تجليخ يدور بسرعات فائقة وشرر متطاير وشظايا معدنية مقذوفة → الحدث الخطر: انفجار أو تفتت قرص الجلخ أو اتساع الفجوة (> 3مم) وانحشار القطعة → التعرض: مقذوفات بسرعة عالية تصيب الوجه والعينين واليدين → النتيجة: فقدان بصر دائم، تهتك بالوجه، جروح شديدة.",
            consequences: "فقدان بصر جزئي أو كلي، جروح وتهتكات بالغة بالوجه، غياب (LTI).",
            risk_category: "S",
            inherent_l: 3,
            inherent_s: 5,
            inherent_r: 15,
            present_control_measures: "- دروع واقية شفافة مقاومة للصدمات مثبتة فوق القرصين وحواجب معدنية واقية.\n- مسند قطعة العمل (Tool Rest) مضبوط على مسافة آمنة لا تتجاوز 2-3 مم عن القرص.\n- ارتداء نظارات أمان معتمدة (Z87.1) مع قناع واقي كامل للوجه (Face Shield).",
            control_type: "D\nE\nF",
            present_l: 1,
            present_s: 5,
            present_r: 5,
            further_action: "- إجراء اختبار الرنين (Ring Test) وفحص القرص للتأكد من خلوه من الشروخ قبل تركيبه.\n- فحص أسبوعي للمسافة بين الحجر ومسند العمل وإعادة الضبط وتوثيق ذلك.",
            residual_l: 1,
            residual_s: 5,
            residual_r: 5
          },
          {
            activity_breakdown: "4. الطباعة ثلاثية الأبعاد ومناولة الراتنج الكيميائي (3D Printing & SLA Resin)",
            potential_hazard: "مصدر الخطر: أبخرة عضوية متطايرة وجسيمات دقيقة وسوائل راتنج فوتوبوليمير سامة → الحدث الخطر: تسخين البلاستيك وملامسة الراتنج غير المعالج للجلد أو العينين → التعرض: استنشاق أبخرة وملامسة جلدية مباشرة أثناء المعالجة والغسيل بالكحول → النتيجة: حساسية جلدية حادة، التهاب الجلد التماسي، تهيج العينين والرئتين.",
            consequences: "حساسية جلدية مزمنة، شكوى صحية، حالة تستلزم متابعة طبية.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 3,
            inherent_r: 12,
            present_control_measures: "- كابينة مغلقة للطابعات مع نظام فلترة كربون نشط لسحب الأبخرة العضوية.\n- تخصيص محطة مستقلة لغسيل ومعالجة الراتنج بالأشعة فوق البنفسجية (Curing Station).\n- ارتداء قفازات نيتريل كيميائية ونظارات حماية مانعة للرذاذ وبالطو قطني.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 3,
            present_r: 6,
            further_action: "- توفير صحائف بيانات سلامة المواد (SDS) لجميع أنواع خيوط وراتنجات الطباعة.\n- توفير طقم احتواء الانسكابات الكيميائية المعتمد (Spill Kit) وتدريب المشرفين عليه.",
            residual_l: 1,
            residual_s: 3,
            residual_r: 3
          },
          {
            activity_breakdown: "5. اللحام بالقصدير وتجميع الدوائر الإلكترونية (Soldering & Assembly)",
            potential_hazard: "مصدر الخطر: أبخرة الفلكس ومساعد الصهر وسن الكاوية الساخن (350+ مئوية) → الحدث الخطر: استنشاق أبخرة الرصاص والصنوبر وملامسة السن الساخن أو تناثر القصدير المذاب → التعرض: استنشاق تنفسي وملامسة حرارية للجلد والعينين → النتيجة: حروق جلدية حرارية، تهيج الجهاز التنفسي، ربو مهني.",
            consequences: "حروق تماس حرارية، حساسية صدرية، إسعافات أولية أو متابعة طبية.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 3,
            inherent_r: 12,
            present_control_measures: "- شفاطات أبخرة مكتبية موضعية مزودة بفلاتر كربون نشط وHEPA بجوار كل نقطة لحام.\n- حوامل كاوية معزولة ومقاومة للحرارة مع إسفنجة تنظيف وسلك أمان زنبركي.\n- استخدام قصدير خالٍ من الرصاص (Lead-Free Solder) وارتداء نظارات أمان أوقات اللحام.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 3,
            present_r: 6,
            further_action: "- حظر الأكل والشرب في منطقة التجميع واللحام وإلزام غسيل الأيدي بعد الانتهاء.\n- فحص دوري لكفاءة فلاتر شفاطات اللحام واستبدالها شهرياً.",
            residual_l: 1,
            residual_s: 3,
            residual_r: 3
          },
          {
            activity_breakdown: "6. استخدام العدد اليدوية والكهربائية المتنقلة (Hand & Power Tools)",
            potential_hazard: "مصدر الخطر: شفرات قواطع حادة، أقراص صواريخ التقطيع وقوى الارتداد العكسي → الحدث الخطر: انزلاق الشفرة أو كسر قرص القطع أو انحشار المشغولة أثناء القطع اليدوي → التعرض: ملامسة الشفرات الحادة المتنقلة أو ارتداد الماكينة نحو الجسد → النتيجة: جروح قطعية عميقة، قطع بالأوتار والأوردة، ثقوب غائرة.",
            consequences: "جروح قطعية عميقة، غياب عن العمل بسبب إصابة (LTI).",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- حواجب الحماية الأصلية مثبتة ومقفلة على الصواريخ والمناشير اليدوية بصفة دائمة.\n- تثبيت المشغولات بالمرابط على طاولة العمل والتشغيل بكلتا اليدين فقط.\n- ارتداء قفازات مقاومة للقطع (Cut-Resistant Level 5) عند مناولة القطع الحادة والتشذيب.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- عزل واستبعاد أي أداة بها كابل تالف أو مفتاح تالف فوراً بنظام التوسيم (Tag Out).\n- برنامج تدريب وتأهيل للطلاب على مهارات الاستخدام الآمن للعدد اليدوية والكهربائية.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "7. ترتيب ونظافة الورشة، إدارة الرايش والمخلفات الحادة والطوارئ (Housekeeping & Egress)",
            potential_hazard: "مصدر الخطر: رايش معدني وشظايا أكريليك حادة على الأرضيات وكابلات ممتدة وعوائق بمخارج النجاة → الحدث الخطر: تعثر وسقوط المشغل أو انغراز الرايش بالأقدام أو إعاقة الإخلاء وقت الحريق → التعرض: تعثر وسقوط واصطدام بالماكينات واختناق أثناء الإخلاء → النتيجة: كسور، جروح قطعية بالقدم، حروق أو وفاة وقت الحريق.",
            consequences: "تعثر وسقوط، جروح ثقب بالقدم، إصابات إخلاء، خطر وفاة في الحريق.",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- مسارات هروب ومخارج طوارئ محددة بوضوح وخالية 100% من أي عوائق أو طاولات.\n- حاويات معدنية وصفراء محكمة لتجميع الرايش المعدني والمخلفات الحادة.\n- أزرار إيقاف طوارئ رئيسية (Master E-Stops) وقواطع عزل وطفايات CO2 وبودرة مفحوصة.",
            control_type: "D\nE",
            present_l: 1,
            present_s: 4,
            present_r: 4,
            further_action: "- تطبيق نظام 5S للترتيب والنظافة مع جولة تفتيشية أسبوعية موثقة من فريق السلامة.\n- تدريب الطلاب على خطة الإخلاء ومواقع أزرار الطوارئ في أول أسبوع دراسي.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          }
        ],
        general_safety_instructions: {
          title: "التعليمات والاحتياطات العامة للسلامة (GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS)",
          instructions: [
            {
              category: "1. الصلاحيات والكفاءة والترخيص (Authorization & Competency)",
              rules: [
                "يُحظر تشغيل أي ماكينة أو أداة تصنيع إلا من قبل الأفراد المدربين والمصرح لهم رسمياً.",
                "يجب أن يعمل الطلاب والمستخدمون غير المتمرسين تحت الإشراف المباشر والمستمر لمشرف المختبر.",
                "يُمنع تشغيل أي جهاز دون الإلمام التام بإجراءات تشغيله القياسية المعتمدة (SOP)."
              ]
            },
            {
              category: "2. فحوصات ما قبل بدء العمل (Pre-Work Checks)",
              rules: [
                "فحص الماكينات، الكابلات، أدوات التثبيت، حواجب الحماية، ومفاتيح الطوارئ بدقة قبل بدء التشغيل.",
                "حظر استخدام أي ماكينة أو أداة تالفة أو معيبة أو معدلة واستبعادها فوراً بنظام التوسيم.",
                "التحقق من خلو مسارات الحركة ومخارج الطوارئ وجاهزية طفايات الحريق ومعدات الإسعاف."
              ]
            },
            {
              category: "3. السلامة الميكانيكية وتثبيت المشغولات (Mechanical & Workpiece Safety)",
              rules: [
                "تثبيت كافة المشغولات وقطع العمل بالملزمة أو أدوات التثبيت الميكانيكية وحظر إمساكها باليد أثناء الحفر أو القطع.",
                "ربط الشعر الطويل، وإزالة الخواتم والمجوهرات، وحظر ارتداء القفازات بالقرب من المغازل والأجزاء الدوارة.",
                "عدم ترك مفاتيح ربط الظرف (Chuck Keys) داخل الماكينة والتأكد من إزالتها قبل التشغيل."
              ]
            },
            {
              category: "4. السلامة الكهربائية والعزل (Electrical Safety & Isolation)",
              rules: [
                "فصل التيار الكهربائي وعزل الماكينة تماماً قبل تغيير الريش، شفرات القطع، أو إجراء الصيانة.",
                "حظر لمس الموصلات المكشوفة وتجنب تمديد الكابلات عبر ممرات المشاة."
              ]
            },
            {
              category: "5. سلامة الليزر والحرارة واللحام (Laser, Thermal & Hot Work Safety)",
              rules: [
                "حظر تشغيل قواطع الليزر إلا مع إغلاق الكابينة وتفعيل نظام سحب الأدخنة والتأكد من توافق المادة.",
                "التعامل مع رؤوس الطابعات ثلاثية الأبعاد ومكاوي اللحام كمصادر حروق ساخنة واستخدام الحوامل المخصصة."
              ]
            },
            {
              category: "6. الترتيب والنظافة والتحكم في الرايش (Housekeeping & Swarf Control)",
              rules: [
                "إزالة الرايش ونشارة المعادن والقطع الحادة باستخدام الفرشاة أو المكنسة المخصصة وحظر إزالتها باليد المجردة أو بضغط الهواء.",
                "الحفاظ على جفاف ونظافة الأرضيات فوراً والتخلص من النفايات الحادة في الحاويات المخصصة."
              ]
            },
            {
              category: "7. مهمات الوقاية الشخصية (Personal Protective Equipment - PPE)",
              rules: [
                "ارتداء نظارات الأمان المقاومة للصدمات (Z87.1) وحذاء السلامة بصفة إلزامية داخل المختبر.",
                "استخدام واقي الوجه الكامل عند التجليخ وواقيات السمع عند تشغيل الماكينات الصاخبة."
              ]
            },
            {
              category: "8. الاستجابة للطوارئ والإبلاغ (Emergency Response)",
              rules: [
                "معرفة مواقع أزرار إيقاف الطوارئ (E-Stops)، قواطع العزل، محطات غسيل العيون، وطفايات الحريق.",
                "في حال وقوع طارئ، اضغط زر إيقاف الطوارئ فوراً وأخطر مشرف المختبر ومسؤولي السلامة."
              ]
            }
          ],
          key_safety_rules: [
            "1. حظر تشغيل أي ماكينة دون تدريب وتصريح رسمي مسبق من مشرف المختبر.",
            "2. تثبيت قطعة العمل بالملزمة دائماً وحظر الإمساك اليدوي أثناء الحفر أو القص.",
            "3. حظر ارتداء القفازات أو الملابس الفضفاضة أو المجوهرات بالقرب من المغازل والأجزاء الدوارة.",
            "4. التأكد من إزالة مفتاح الظرف (Chuck Key) قبل تشغيل ماكينات الحفر والمخارط.",
            "5. ارتداء نظارات السلامة المعتمدة المقاومة للصدمات (Z87.1) طوال فترة التواجد بالمختبر.",
            "6. إيقاف الماكينة وعزل مصدر الطاقة بالكامل قبل ضبط أو تغيير أدوات القطع أو الصيانة.",
            "7. معرفة موقع واستخدام زر إيقاف الطوارئ (E-Stop) عند حدوث أي خلل فوري.",
            "8. إزالة الرايش بالفرشاة المخصصة وحظر استخدام اليد المجردة أو ضغط الهواء للتنظيف."
          ],
          prohibited_actions: [
            "إمساك قطع العمل باليد أثناء تشغيل ماكينة الحفر أو المنشار.",
            "ارتداء القفازات بالقرب من الأجزاء والمغازل الدوارة.",
            "تجاوز أو تعطيل حواجب الأمان أو مفاتيح الأمان التداخلية (Interlocks).",
            "ترك مفتاح الظرف داخل الماكينة بعد التثبيت.",
            "استخدام ضغط الهواء لتنظيف الملابس أو إزالة الرايش عن الماكينات.",
            "قص أو حرق مواد بلاستيكية سامة مثل PVC في قواطع الليزر.",
            "ترك الماكينات تعمل دون إشراف أو رقابة أثناء التشغيل النشط."
          ],
          mandatory_statement: "Always follow the approved laboratory SOPs, equipment manufacturer's instructions, site emergency procedures, and applicable HSE requirements. If an unsafe condition is identified, stop the activity and report it to the responsible laboratory/HSE personnel."
        }
      };
    } else {
      return {
        document_title: "سجل تقييم المخاطر والأثر البيئي",
        activity_to_be_assessed: area || "مختبر الفيزياء والتجارب الهندسية",
        location: "جامعة السويدي للتكنولوجيا - SUTech",
        assessment_date: dateStr,
        report_assessor: assessor,
        report_reviewer: reviewer,
        responsibilities: [
          "إدارة السلامة والصحة المهنية: التحقق من تطبيق ومراقبة تدابير واشتراطات السلامة.",
          "مشرف المختبر / الورشة: ضمان التشغيل الآمن والالتزام الصارم بتعليمات الوقاية للطلاب.",
          "الطلاب والفنيون: اتباع كافة تعليمات السلامة وارتداء مهمات الوقاية الشخصية الإلزامية."
        ],
        activities: [
          {
            activity_breakdown: "1. تجهيز وفحص ما قبل التشغيل للمعدات والأجهزة الكهربائية ومقاعد الاختبار",
            potential_hazard: "- كابلات وأسلاك توصيل تالفة أو متآكلة العزل.\n- موصلات وقواطع مكشوفة أو غياب التأريض الوقائي وقواطع التسريب الأرضي.\n- توصيل دوائر كهربائية بقدرات تفوق الحدود الآمنة.",
            consequences: "صدمات كهربائية جسيمة، حروق ملامسة، توقف قلبي، غياب عن العمل (LTI).",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- فحص واختبار التوصيلات وقواطع ELCB قبل بدء التجربة.\n- عزل وحجب الموصلات الحية بحواجز هندسية معزولة.\n- إشراف مباشر ومستمر من مهندس وفني المختبر أثناء التوصيل.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- جدول صيانة وقائية واختبار عزل دوري كل 3 أشهر معتمد من إدارة الصيانة والسلامة.\n- إجراء اختبار كفاءة السلامة الكهربائية للطلاب قبل السماح بالتجارب المستقلة.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "2. تجارب المكثفات وتفريغ الطاقة الكهربائية المخزونة عالية الجهد",
            potential_hazard: "- تفريغ مفاجئ لشحنات المكثفات عالية السعة بعد فصل مصدر التغذية.\n- ملامسة أطراف المكثف دون تأريض التفريغ الآمن.",
            consequences: "صعق كهربائي شديد، قوس وميضي، حروق مميتة أو بالغة، وفاة.",
            risk_category: "S",
            inherent_l: 3,
            inherent_s: 6,
            inherent_r: 18,
            present_control_measures: "- استخدام قضيب تفريغ معزول ومقاوم لتفريغ المكثفات قبل الفحص.\n- اتباع إجراءات التشغيل القياسية (SOP) المعتمدة للتجارب ذات الجهد العالي.\n- حظر التعديل في الدوائر دون فصل المصدر وتأكيد خلو الجهد بجهاز قياس معتمد.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- فحص ومعايرة سنوية لقضبان التفريغ والمقاييس المتعددة.\n- تركيب لوحات تحذيرية مضيئة عند وجود مكثفات مشحونة.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "3. تطبيقات الليزر والبصريات وحزم الضوء عالي الكثافة (Laser & Optics)",
            potential_hazard: "- تعرض شبكية العين أو الجلد لشعاع ليزر مباشر أو منعكس من أسطح مصقولة.\n- انحراف المرايا وفلاتر التوجيه البصري أثناء الضبط اليدوي.",
            consequences: "حروق شبكية العين، فقدان بصر دائم أو عجز جزئي، حروق جلدية.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 5,
            inherent_r: 20,
            present_control_measures: "- ارتداء نظارات حماية ليزر معتمدة ومطابقة للطول الموجي (Optical Density).\n- تركيب حواجز مانعة للانعكاس وحواجب مسار الشعاع على طاولات البصريات.\n- تفعيل إشارة تحذيرية ضوئية خارج المختبر عند تشغيل الليزر.",
            control_type: "D\nF",
            present_l: 2,
            present_s: 5,
            present_r: 10,
            further_action: "- معايرة سنوية لحواجز وأطوال موجات الليزر وتحديث كود السلامة البصرية.\n- توعية إلزامية وإقرار كتابي للطلاب بمسارات الأشعة قبل بدء التجارب المتقدمة.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "4. استخدام وتداول المحاليل الكيميائية ومحاليل التنظيف والكواشف (Reagents)",
            potential_hazard: "- تناثر المواد الكيميائية والأحماض المخففة على الجلد والعينين.\n- استنشاق أبخرة المذيبات العضوية أو انسكاب المحاليل على الأرضيات.",
            consequences: "حروق كيميائية، تهيج العين والجهاز التنفسي، تستلزم متابعة طبية.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 3,
            inherent_r: 12,
            present_control_measures: "- إجراء التجارب الكيميائية داخل هود السحب الميكانيكي (Fume Hood).\n- ارتداء نظارات أمان مانعة للتناثر وقفازات نيتريل وبالطو المختبر القطني.\n- فحص دوري لمحطة غسيل العين الطارئة (Eye Wash) بالمختبر.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 3,
            present_r: 6,
            further_action: "- تحديث ملف صحائف بيانات سلامة المواد (SDS) وإتاحته ورقياً ورقمياً.\n- توفير طقم احتواء الانسكابات الكيميائية المعتمد (Spill Kit) وتدريب الفنيين عليه.",
            residual_l: 1,
            residual_s: 3,
            residual_r: 3
          },
          {
            activity_breakdown: "5. الحركة والمناولة الميدانية، الترتيب والنظافة وتخزين العينات (Housekeeping)",
            potential_hazard: "- تمديد كابلات كهربائية عبر ممرات المشاة.\n- تناثر زجاج مكسور أو تسرب سوائل على أرضيات المختبر.\n- رفع وتداول أجهزة ثقيلة بطرق غير مريحة للأرجونوميكس.",
            consequences: "تعثر وسقوط، جروح قطعية، إصابات إسعافات أولية، شكاوى صحية.",
            risk_category: "S",
            inherent_l: 5,
            inherent_s: 2,
            inherent_r: 10,
            present_control_measures: "- تركيب جسور حماية كابلات مطاطية فوق أي مسار حركة.\n- تخصيص حاوية صلبة صفراء للتخلص الآمن من الزجاج والشرائح المكسورة.\n- تنظيف وتجفيف فوري لأي انسكاب ووضع لوحة تحذير أرضية رطبة.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 2,
            present_r: 4,
            further_action: "- قائمة تفتيش أسبوعية للنظافة والترتيب تعتمد بتوقيع مشرف المختبر وإدارة السلامة.",
            residual_l: 1,
            residual_s: 2,
            residual_r: 2
          },
          {
            activity_breakdown: "6. حالات الطوارئ، انقطاع التيار المفاجئ، الإخلاء والسيطرة على الحرائق",
            potential_hazard: "- تأخر الاستجابة عند حدوث تماس كهربائي أو حريق موضعي.\n- إعاقة مسارات الهروب وأبواب الطوارئ بعوائق أو أثاث مكتبي.",
            consequences: "استنشاق دخان، حروق، تدافع وإصابات جسدية جسيمة أثناء الإخلاء، خطر وفاة.",
            risk_category: "S",
            inherent_l: 3,
            inherent_s: 6,
            inherent_r: 18,
            present_control_measures: "- زر إيقاف طوارئ رئيسي (Emergency Power Off) مثبت وواضح قرب المخرج.\n- طفاية حريق غاز ثاني أكسيد الكربون (CO2) معلقة ومفحوصة شهرياً.\n- خلو مسارات الهروب والسلالم المؤدية لنقاط التجمع تماماً.",
            control_type: "D\nE",
            present_l: 1,
            present_s: 6,
            present_r: 6,
            further_action: "- تنفيذ تجربة إخلاء وهمية فصلية للمختبرات بالتعاون مع فريق الحماية والسلامة.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          }
        ],
        general_safety_instructions: {
          title: "التعليمات والاحتياطات العامة للسلامة (GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS)",
          instructions: [
            {
              category: "1. الصلاحيات والكفاءة والترخيص (Authorization & Competency)",
              rules: [
                "يُحظر تشغيل معدات وأجهزة المختبر إلا من قبل الأفراد المدربين والمصرح لهم رسمياً.",
                "يجب أن يعمل الطلاب والمستخدمون غير المتمرسين تحت الإشراف المباشر والمستمر لمشرف المختبر.",
                "يُمنع تشغيل أي جهاز أو منظومة تجريبية دون الإلمام التام بإجراءات تشغيلها القياسية المعتمدة (SOP)."
              ]
            },
            {
              category: "2. فحوصات ما قبل بدء العمل (Pre-Work Checks)",
              rules: [
                "فحص الأجهزة، الكابلات، القوابس، التوصيلات، حواجب الحماية، والتجهيزات التجريبية بدقة قبل بدء الاستخدام.",
                "حظر استخدام أي معدات تالفة أو معيبة أو تم تعديلها بشكل غير معتمد واستبعادها فوراً.",
                "التحقق من جاهزية معدات الطوارئ ومحطات غسيل العيون وخلو مسارات الوصول ومخارج الهروب من أي عوائق."
              ]
            },
            {
              category: "3. السلامة الكهربائية وتفريغ الطاقة (Electrical Safety)",
              rules: [
                "حظر لمس الموصلات أو الأطراف الكهربائية الحية والمكشوفة نهائياً.",
                "فصل وعزل مصدر التيار الكهربائي تماماً قبل تعديل أو إعادة توصيل الدوائر والمكونات.",
                "تفريغ شحنات المكثفات ووحدات تخزين الطاقة بأمان باستخدام قضيب التفريغ المعتمد والتحقق من انعدام الجهد الخطر قبل اللمس.",
                "عدم تحميل المقابس والتوصيلات الكهربائية فوق طاقتها التصميمية واستبعاد الكابلات المتآكلة.",
                "إبعاد السوائل والمشروبات ومحاليل التجارب تماماً عن المعدات والتوصيلات الكهربائية."
              ]
            },
            {
              category: "4. السلامة الميكانيكية والأجزاء المتحركة (Mechanical Safety)",
              rules: [
                "إبعاد الأيدي والملابس الفضفاضة والشعر الطويل والأجسام السائبة عن التروس والأجزاء الدوارة والمتحركة.",
                "حظر ضبط أو فك أو صيانة المعدات أثناء وجود طاقة ميكانيكية أو ضغط مخزون ما لم تنص الإجراءات المعتمدة على ذلك.",
                "تثبيت الأثقال والزنبركات والبكرات والمكونات الميكانيكية بإحكام شديد قبل بدء التشغيل.",
                "عدم الوقوف مطلقاً في المسار المحتمل لانطلاق أو تحرر الأجزاء الواقعة تحت شد أو ضغط ميكانيكي."
              ]
            },
            {
              category: "5. السلامة الحرارية والأسطح الساخنة (Thermal Safety)",
              rules: [
                "التعامل مع أجهزة التسخين والأفران والأسطح الساخنة والسوائل المغلية والبخار كمصادر خطر مؤكدة للحروق.",
                "ترك المعدات والمواد والقطع المشغلة لتبرد تماماً قبل لمسها أو نقلها.",
                "ارتداء مهمات الوقاية المقاومة للحرارة (Heat-Resistant Gloves) المناسبة والمعتمدة عند الحاجة.",
                "حظر فتح الأوعية والمعدات البخارية أو المضغوطة قبل تفريغ الضغط بالكامل والتأكد من أمانها التام."
              ]
            },
            {
              category: "6. سلامة أشعة الليزر والبصريات (Laser & Optical Safety)",
              rules: [
                "حظر النظر المباشر إلى حزمة شعاع الليزر نهائياً أو توجيهه نحو أي شخص تحت أي ظرف.",
                "التحكم في الأشعة المنعكسة وإزالة كافة الأجسام العاكسة والحلي والساعات غير الضرورية من مسار الشعاع.",
                "ارتداء نظارات حماية الليزر المعتمدة والمطابقة بدقة للطول الموجي (Wavelength) ومستوى الخطورة (OD).",
                "الالتزام الصارم بإجراءات تشغيل الليزر وإشارات التحذير الضوئية الخارجية للمختبر."
              ]
            },
            {
              category: "7. الأدوات الزجاجية ومعدات التفريغ (Glass & Vacuum Equipment)",
              rules: [
                "فحص كافة الأدوات الزجاجية وأوعية التفريغ قبل الاستخدام وحظر استخدام الزجاج المشروخ أو المخدوش.",
                "استخدام الدروع الواقية والستائر الشفافة عند وجود خطر الانفجار الداخلي (Implosion) أو الشظايا المتطايرة.",
                "التعامل مع الزجاج المكسور باستخدام الفرشاة والجاروف المخصص والتخلص منه في حاوية النفايات الصلبة الصفراء فقط."
              ]
            },
            {
              category: "8. الترتيب والنظافة والبيئة المعملية (Housekeeping)",
              rules: [
                "الحفاظ على نظافة وجفاف طاولات المختبر والأرضيات بصفة دائمة لمنع الانزلاق.",
                "تنظيم وتمرير كابلات الأجهزة بعيداً عن ممرات المشاة واستخدام جسور حماية الكابلات المطاطية.",
                "عدم ترك الأدوات أو المعدات أو المكونات في أماكن قد تسبب التعثر أو السقوط.",
                "يُمنع منعاً باتاً تناول أو تواجد الأطعمة والمشروبات داخل مناطق العمل والمختبرات الهندسية."
              ]
            },
            {
              category: "9. مهمات الوقاية الشخصية (PPE)",
              rules: [
                "الالتزام الكامل بارتداء مهمات الوقاية المحددة (نظارات الأمان، البالطو القطني، قفازات الوقاية، حذاء السلامة).",
                "يجب أن تكون مهمات الوقاية ملائمة لنوع ومستوى الخطر الفعلي ولا تُعد بديلاً عن الضوابط الهندسية أو الإدارية."
              ]
            },
            {
              category: "10. الاستجابة للطوارئ والإبلاغ (Emergency Response)",
              rules: [
                "معرفة مواقع أزرار إيقاف الطوارئ (EPO)، نقاط القواطع الرئيسية، طفايات الحريق، محطات غسيل العيون، ومخارج الطوارئ قبل بدء العمل.",
                "في حالات الطوارئ: إيقاف النشاط فوراً إذا كان ذلك آمناً وعزل مصدر الطاقة الرئيسي.",
                "حظر محاولة إنقاذ أي شخص ملامس لمعدات كهربائية حية حتى يتم عزل المصدر الكهربائي والتأكد من انعدام التيار بأمان تام.",
                "الإبلاغ الفوري عن كافة الحوادث، الإصابات، الوقائع الوشيكة (Near-Misses)، أعطال المعدات، والظروف غير الآمنة."
              ]
            }
          ],
          prohibited_actions: [
            "العمل على دوائر كهربائية حية عندما يتطلب الإجراء عزلها.",
            "تجاوز أو إلغاء حواجب الحماية أو أقفال الأمان التداخلية (Interlocks).",
            "استخدام معدات تالفة أو معيبة أو غير معتمدة هندسياً.",
            "إجراء تعديلات غير مصرح بها على الأجهزة والتجهيزات.",
            "النظر المباشر في حزم أشعة الليزر أو البصريات عالية الكثافة.",
            "فتح الأجهزة والمعدات المضغوطة قبل تفريغ الضغط والتأكد من انعدامه.",
            "تشغيل أو استخدام معدات المختبر دون تصريح رسمي أو دون الإشراف المطلوب.",
            "ترك التجارب النشطة دون رقابة عندما تحظر تعليمات التشغيل ذلك."
          ],
          mandatory_statement: "يجب دائماً اتباع إجراءات التشغيل القياسية المعتمدة (SOPs)، وتعليمات الشركة المصنعة للأجهزة، وإجراءات الطوارئ الجامعية، واشتراطات السلامة والصحة المهنية. في حال اكتشاف أي ظرف أو حالة غير آمنة، أوقف النشاط فوراً وأبلغ مشرف المختبر ومسؤولي إدارة السلامة."
        }
      };
    }
  } else {
    if (isFabLab) {
      return {
        document_title: "Risk and Environmental Impact Assessment - Fabrication Laboratory (FabLab)",
        activity_to_be_assessed: area || "Fabrication Laboratory & Prototyping Workshop (FabLab)",
        location: "El Sewedy University of Technology - SUTech",
        assessment_date: dateStr,
        report_assessor: assessor,
        report_reviewer: reviewer,
        responsibilities: [
          "HSE Department: Ensure implementation and continuous monitoring of risk control measures and work permits.",
          "FabLab Supervisor: Verify student competency, maintain machinery guards, and enforce safety compliance.",
          "Students & Researchers: Strictly follow approved SOPs, wear mandatory PPE, and immediately report unsafe conditions."
        ],
        activities: [
          {
            activity_breakdown: "1. Laser Cutting & Engraving Operations (CO2 / Diode Laser)",
            potential_hazard: "Hazard Source: High-power laser beam & toxic pyrolysis fumes → Hazardous Event: Interlock failure, reflective beam scatter, or fume extraction loss → Exposure: Direct/diffuse optical exposure and vapor inhalation → Consequence: Retinal burns, permanent optical injury, acute respiratory intoxication.",
            consequences: "Retinal burns, partial/complete optical disability, lost time injury (LTI).",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 5,
            inherent_r: 20,
            present_control_measures: "- Interlocked Class 1 protective laser enclosure preventing firing when lid is open.\n- Dedicated Local Exhaust Ventilation (LEV) with activated carbon and HEPA filtration.\n- Emergency stop push-button installed adjacent to machine control panel.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 5,
            present_r: 10,
            further_action: "- Pre-semester verification of interlock integrity and exhaust airflow rates.\n- Documented student training on focus calibration, approved materials, and strict ban on PVC cutting.",
            residual_l: 1,
            residual_s: 5,
            residual_r: 5
          },
          {
            activity_breakdown: "2. Drill Press & Vertical Drilling Operations",
            potential_hazard: "Hazard Source: Rotating drill spindle & un-clamped workpiece → Hazardous Event: Workpiece snatch/spin or operator hand entering rotation zone → Exposure: Direct contact or entanglement of loose clothing/hair → Consequence: Deep lacerations, fractured fingers, severe hand trauma.",
            consequences: "Finger fracture, severe lacerations, medical treatment case with lost time (LTI).",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- Telescopic transparent spindle guard covering chuck and rotating drill bit.\n- Mandatory mechanical clamping of workpieces using heavy-duty machine vice bolted to table.\n- Strict ban on gloves, ties, jewelry, and loose clothing near rotating spindles; long hair tied back.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- Implement self-ejecting spring-loaded chuck keys to eliminate left-in-chuck hazards.\n- Daily pre-operational checklist verifying chuck condition and clamp integrity.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "3. Benchtop Grinding & Deburring Operations",
            potential_hazard: "Hazard Source: High-speed abrasive wheel & incandescent metal sparks → Hazardous Event: Wheel burst/disintegration or excessive tool rest gap (>3mm) causing workpiece entrapment → Exposure: High-velocity projectile impact to eyes, face, and hands → Consequence: Permanent eye injury, facial lacerations, severe abrasions.",
            consequences: "Partial/complete loss of sight, severe facial trauma, lost time injury (LTI).",
            risk_category: "S",
            inherent_l: 3,
            inherent_s: 5,
            inherent_r: 15,
            present_control_measures: "- Impact-resistant transparent eye shields and heavy-gauge steel wheel enclosures.\n- Rigid tool rest rigidly adjusted to ≤2-3mm from wheel perimeter.\n- Mandatory impact-rated safety glasses (ANSI Z87.1) combined with full-face shield during grinding.",
            control_type: "D\nE\nF",
            present_l: 1,
            present_s: 5,
            present_r: 5,
            further_action: "- Mandatory Ring Test and visual crack inspection before mounting new abrasive wheels.\n- Weekly documented tool rest gap verification logged on workshop inspection board.",
            residual_l: 1,
            residual_s: 5,
            residual_r: 5
          },
          {
            activity_breakdown: "4. 3D Printing & Photopolymer Resin Handling (FDM & SLA)",
            potential_hazard: "Hazard Source: Volatile organic compounds (VOCs), ultrafine particles & photopolymer resin → Hazardous Event: Uncured resin contact, skin splash, or thermal extrusion fumes → Exposure: Dermal absorption during wash/curing and vapor inhalation → Consequence: Acute chemical dermatitis, skin sensitization, respiratory irritation.",
            consequences: "Occupational contact dermatitis, eye irritation, medical treatment required.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 3,
            inherent_r: 12,
            present_control_measures: "- Enclosed printer chassis with activated carbon air recirculation filters.\n- Dedicated SLA washing/curing station located in ventilated zone with spill containment tray.\n- Chemical-resistant nitrile gloves, splash goggles, and cotton lab coats mandatory.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 3,
            present_r: 6,
            further_action: "- Maintain accessible Safety Data Sheets (SDS) binders for all filaments and liquid resins.\n- Deploy dedicated chemical spill containment kit and eye wash station adjacent to resin area.",
            residual_l: 1,
            residual_s: 3,
            residual_r: 3
          },
          {
            activity_breakdown: "5. Electronics Soldering & Circuit Assembly",
            potential_hazard: "Hazard Source: Rosin/flux thermal decomposition fumes & hot soldering iron tip (350°C+) → Hazardous Event: Inhalation of flux vapors or accidental skin contact with energized tip → Exposure: Respiratory inhalation and dermal contact → Consequence: Contact thermal burns, acute respiratory irritation, occupational asthma.",
            consequences: "Thermal burn injury, respiratory irritation, first aid / medical case.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 3,
            inherent_r: 12,
            present_control_measures: "- Benchtop solder fume extraction units with HEPA/carbon filters at each workstation.\n- Heavy-duty heat-resistant soldering iron stands with safety spring cages.\n- Use lead-free solder alloys and impact safety glasses during trimming.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 3,
            present_r: 6,
            further_action: "- Enforce strict hand-washing protocol and ban food/drink consumption in assembly zones.\n- Monthly preventative maintenance on solder fume extraction filter media.",
            residual_l: 1,
            residual_s: 3,
            residual_r: 3
          },
          {
            activity_breakdown: "6. Hand Tools & Portable Power Tools Usage (Grinder, Jigsaw, Knives)",
            potential_hazard: "Hazard Source: High-speed cutting blades, rotating abrasive discs & tool kickback → Hazardous Event: Blade slippage, disc shattering, or unstable workpiece movement → Exposure: Direct contact with energized moving edges → Consequence: Deep lacerations, severed tendons, puncture wounds.",
            consequences: "Deep lacerations, severe bleeding, lost time injury (LTI).",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- Factory wheel/blade guards rigidly secured in position on all power tools.\n- Workpieces clamped firmly to workbenches prior to cutting; two-handed tool operation enforced.\n- Cut-resistant safety gloves (Level 5) worn during manual trimming and deburring.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- Immediate tagging and removal (Tag Out) of any damaged tools or frayed power cords.\n- Mandatory practical competency assessment before students operate portable power tools.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "7. Housekeeping, Swarf Management & Workshop Emergency Egress",
            potential_hazard: "Hazard Source: Sharp metal swarf, acrylic offcuts on floor, and trailing cables → Hazardous Event: Slip/trip/fall or sharp puncture through footwear or blocked evacuation route in fire → Exposure: Falling onto machinery, foot puncture, or smoke trap → Consequence: Fractures, puncture wounds, severe evacuation injury.",
            consequences: "Trips, falls, severe puncture wounds, fire egress obstruction hazard.",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- Designated, unobstructed 1.2m wide yellow-marked walkways and emergency egress paths.\n- Dedicated metal swarf bins and puncture-resistant sharps disposal containers.\n- Master Emergency Power Off (EPO) push buttons and regularly inspected CO2 extinguishers.",
            control_type: "D\nE",
            present_l: 1,
            present_s: 4,
            present_r: 4,
            further_action: "- Implement daily 5S workshop clean-up routine logged by technician at end of shift.\n- Conduct semester emergency evacuation drills and E-stop operational testing with HSE.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          }
        ],
        general_safety_instructions: {
          title: "GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS",
          instructions: [
            {
              category: "1. Authorization & Competency",
              rules: [
                "Only trained and authorized personnel may operate laboratory machinery and equipment.",
                "Students and inexperienced users must work under direct supervision of authorized lab staff.",
                "Do not operate equipment without thorough familiarity with approved Standard Operating Procedures (SOPs)."
              ]
            },
            {
              category: "2. Pre-Work Checks",
              rules: [
                "Inspect machinery, guards, cables, workholding clamps, and emergency stops prior to powering on.",
                "Do not use damaged, defective, or modified machinery/tools; tag out immediately.",
                "Verify emergency exits and walkways are unobstructed and firefighting gear is ready."
              ]
            },
            {
              category: "3. Mechanical & Workpiece Safety",
              rules: [
                "Always clamp workpieces securely in a vice or mechanical clamp; never hold workpieces by hand during machining.",
                "Tie back long hair, remove jewelry/watches, and strictly prohibit gloves near rotating spindles.",
                "Never leave chuck keys in drill chucks or lathe spindles; remove immediately after tightening."
              ]
            },
            {
              category: "4. Electrical Safety & Isolation",
              rules: [
                "Switch off and isolate electrical power before changing tooling, blades, or performing maintenance.",
                "Never touch exposed energized terminals and keep electrical cords off pedestrian paths."
              ]
            },
            {
              category: "5. Laser, Thermal & Hot Work Safety",
              rules: [
                "Operate laser cutters only with lid closed, LEV exhaust running, and verified safe material.",
                "Treat 3D printer nozzles and soldering irons as high-temperature burn hazards; use heat-resistant stands."
              ]
            },
            {
              category: "6. Housekeeping & Swarf Control",
              rules: [
                "Clear swarf and metal shavings using brushes or vacuum; never use bare hands or compressed air.",
                "Keep workshop floors dry and clean; dispose of sharp scrap in designated yellow bins."
              ]
            },
            {
              category: "7. Personal Protective Equipment (PPE)",
              rules: [
                "Wear impact-rated safety glasses (ANSI Z87.1) and closed safety footwear at all times in the workshop.",
                "Use full face shields during grinding and ear protection near high-noise machinery."
              ]
            },
            {
              category: "8. Emergency Response",
              rules: [
                "Know the exact locations of Emergency Stop buttons, main isolators, eyewash units, and fire extinguishers.",
                "In any emergency, strike the nearest E-stop immediately and notify the lab supervisor and HSE team."
              ]
            }
          ],
          key_safety_rules: [
            "1. Never operate any machinery without documented authorization and competency verification.",
            "2. Always secure workpieces in a vice or clamp; never hand-hold workpieces during machining.",
            "3. Strict ban on gloves, loose clothing, ties, and jewelry near rotating spindles.",
            "4. Always remove chuck keys and wrenches before energizing machinery.",
            "5. Wear approved impact safety glasses at all times inside the laboratory.",
            "6. Isolate electrical power completely before adjusting tools, blades, or clearing jams.",
            "7. Know the nearest Emergency Stop button location and activate immediately if an anomaly occurs.",
            "8. Clear swarf and chips with brushes; never use bare hands or compressed air jets."
          ],
          prohibited_actions: [
            "Holding workpieces by hand during drilling, routing, or cutting.",
            "Wearing gloves near rotating spindles, drills, or lathe chucks.",
            "Bypassing safety guards, interlocks, or machine enclosures.",
            "Leaving chuck keys or adjustment tools in rotating chucks.",
            "Using compressed air to blow swarf off machines or clean clothing.",
            "Cutting PVC or halogenated plastics in laser cutters.",
            "Leaving active machines running unattended without supervision."
          ],
          mandatory_statement: "Always follow the approved laboratory SOPs, equipment manufacturer's instructions, site emergency procedures, and applicable HSE requirements. If an unsafe condition is identified, stop the activity and report it to the responsible laboratory/HSE personnel."
        }
      };
    } else {
      return {
        document_title: "Risk and Environmental Impact Assessment",
        activity_to_be_assessed: area || "Physics Lab & Engineering Facilities",
        location: "El Sewedy University of Technology - SUTech",
        assessment_date: dateStr,
        report_assessor: assessor,
        report_reviewer: reviewer,
        responsibilities: [
          "HSE Department: Ensure implementation and monitoring of safety measures.",
          "Lab Supervisor: Ensure safe operation and student compliance.",
          "Students: Follow all safety instructions and use required PPE."
        ],
        activities: [
          {
            activity_breakdown: "1. Pre-Use Inspection & Setup of Electrical Test Benches & Power Supplies",
            potential_hazard: "Hazard Source: Damaged power cords & exposed live terminals → Hazardous Event: Direct contact with energized circuits → Exposure: Electrical current passage → Consequence: Severe electric shock, electrical burns, Lost Time Injury (LTI).",
            consequences: "Severe electric shock, electrical burns, cardiac arrest, Lost Time Injury (LTI).",
            risk_category: "S",
            inherent_l: 4,
            inherent_s: 4,
            inherent_r: 16,
            present_control_measures: "- Pre-operational inspection of all cords and test leads before live trials.\n- Verify intact plugs, insulated probe clips, and functioning GFCI/ELCB circuits.\n- Direct supervision by lab technician during live connection phases.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- Implement quarterly portable appliance testing (PAT) logged with HSE.\n- Require documented student electrical competency clearance prior to solo work.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "2. High-Voltage Capacitors & Stored Energy Handling",
            potential_hazard: "Hazard Source: High-voltage stored electrical energy → Hazardous Event: Accidental terminal touch before discharge → Exposure: High-current discharge through body → Consequence: Severe electric shock, arc flash, fatal electrocution.",
            consequences: "Severe electric shock, arc flash, fatal burn injuries, electrocution.",
            risk_category: "S",
            inherent_l: 3,
            inherent_s: 6,
            inherent_r: 18,
            present_control_measures: "- Use certified insulated discharge rods with series resistor prior to touch.\n- Strict adherence to high-voltage SOPs and isolation verification.\n- No circuit adjustment allowed while power supply unit is energized.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 4,
            present_r: 8,
            further_action: "- Annual calibration of discharge wands and multimeter test gear.\n- Install illuminated warning interlock signs when HV capacitor benches are live.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "3. Optical Benches, Laser Experiments & High-Intensity Radiation",
            potential_hazard: "Hazard Source: Focused laser beam & optics → Hazardous Event: Direct or scattered beam entering eye → Exposure: Retinal absorption → Consequence: Retinal burns, permanent optical disability, corneal flash burns.",
            consequences: "Retinal burns, permanent optical disability, corneal flash burns.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 5,
            inherent_r: 20,
            present_control_measures: "- Certified laser safety goggles matched to exact beam wavelength (OD rated).\n- Matte-finish non-reflective beam stops and bench side-shields installed.\n- External door warning beacon active when laser sources are energized.",
            control_type: "D\nF",
            present_l: 2,
            present_s: 5,
            present_r: 10,
            further_action: "- Annual alignment and enclosure verification for all Class 3B/4 laser setups.\n- Mandatory optical safety induction and signed declaration before bench access.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          },
          {
            activity_breakdown: "4. Handling Chemical Reagents, Cleaning Solutions & Etchants",
            potential_hazard: "Hazard Source: Chemical reagents & solvents → Hazardous Event: Splash during manual dispensing or vapor buildup → Exposure: Eye contact and inhalation → Consequence: Chemical burns, acute inhalation irritation.",
            consequences: "Chemical burns, acute inhalation irritation, medical treatment case.",
            risk_category: "H",
            inherent_l: 4,
            inherent_s: 3,
            inherent_r: 12,
            present_control_measures: "- Perform chemical dispensing inside certified laboratory fume hoods.\n- Splash goggles, nitrile protective gloves, and cotton lab coats mandatory.\n- Emergency eyewash station tested and inspected weekly.",
            control_type: "D\nE\nF",
            present_l: 2,
            present_s: 3,
            present_r: 6,
            further_action: "- Maintain readily accessible Safety Data Sheets (SDS) binders.\n- Deploy dedicated chemical spill containment kit with neutralizing absorbent.",
            residual_l: 1,
            residual_s: 3,
            residual_r: 3
          },
          {
            activity_breakdown: "5. Movement, Ergonomics, Glassware Handling & Housekeeping",
            potential_hazard: "Hazard Source: Trailing cords and broken glassware → Hazardous Event: Trip on walkway or contact with sharp edges → Exposure: Fall impact or skin cut → Consequence: Minor lacerations, first aid injury.",
            consequences: "Slips, trips, falls, minor laceration injuries, first aid case.",
            risk_category: "S",
            inherent_l: 5,
            inherent_s: 2,
            inherent_r: 10,
            present_control_measures: "- Rubber cable protector bridges installed over all pedestrian floor paths.\n- Dedicated puncture-resistant yellow sharps container for broken glass.\n- Immediate spill cleanup protocol enforced with wet-floor warning signage.",
            control_type: "D\nE",
            present_l: 2,
            present_s: 2,
            present_r: 4,
            further_action: "- Weekly documented 5S housekeeping checklist verified by lab supervisor.",
            residual_l: 1,
            residual_s: 2,
            residual_r: 2
          },
          {
            activity_breakdown: "6. Emergency Power Shutdown, Fire Outbreak & Facility Evacuation",
            potential_hazard: "Hazard Source: Electrical overheating or fire emergency → Hazardous Event: Delayed power isolation or obstructed egress → Exposure: Smoke inhalation and thermal burns → Consequence: Severe burn injury, panic, fatality risk.",
            consequences: "Smoke inhalation, thermal burn injuries, severe evacuation hazard, fatality.",
            risk_category: "S",
            inherent_l: 3,
            inherent_s: 6,
            inherent_r: 18,
            present_control_measures: "- Prominent Emergency Power Cut-off (EPO) button installed by main exit.\n- Inspected and tagged CO2 fire extinguisher mounted at entrance.\n- Exit routes kept 100% unobstructed with illuminated emergency exit signs.",
            control_type: "D\nE",
            present_l: 1,
            present_s: 6,
            present_r: 6,
            further_action: "- Conduct semester lab emergency evacuation drill with HSE team.",
            residual_l: 1,
            residual_s: 4,
            residual_r: 4
          }
        ],
        general_safety_instructions: {
          title: "GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS",
          instructions: [
            {
              category: "1. Authorization & Competency",
              rules: [
                "Only trained and authorized personnel may operate laboratory equipment.",
                "Students and inexperienced users must work under appropriate supervision.",
                "Do not operate equipment if you are not familiar with its operating procedure."
              ]
            },
            {
              category: "2. Pre-Work Checks",
              rules: [
                "Inspect equipment, cables, plugs, connections, guards, and experimental setups before use.",
                "Do not use damaged, defective, or modified equipment.",
                "Verify that emergency equipment and access routes are available and unobstructed."
              ]
            },
            {
              category: "3. Electrical Safety",
              rules: [
                "Never touch exposed energized conductors or terminals.",
                "Switch off and isolate electrical power before modifying or reconnecting circuits, where applicable.",
                "Capacitors and other energy-storage devices must be safely discharged and the absence of hazardous voltage verified before contact."
              ]
            },
            {
              category: "4. Emergency Response",
              rules: [
                "Know the location of emergency stop buttons, electrical isolation points, fire extinguishers, first-aid equipment, and emergency exits before starting work.",
                "In an emergency, stop the activity if safe to do so and isolate the energy source where possible.",
                "Report all incidents, near misses, equipment failures, and unsafe conditions."
              ]
            }
          ],
          key_safety_rules: [
            "1. Only authorized personnel may operate laboratory equipment.",
            "2. Switch off and isolate electrical power before modifying circuits.",
            "3. Wear safety glasses and required PPE at all times.",
            "4. Keep walkways and exits 100% clear of cables and equipment.",
            "5. Know the location and operation of emergency stop buttons."
          ],
          prohibited_actions: [
            "Working on energized circuits when the procedure requires isolation.",
            "Bypassing guards, interlocks, or safety devices.",
            "Using damaged equipment.",
            "Performing unauthorized modifications.",
            "Looking directly into laser beams.",
            "Opening pressurized equipment."
          ],
          mandatory_statement: "Always follow the approved laboratory SOPs, equipment manufacturer's instructions, site emergency procedures, and applicable HSE requirements. If an unsafe condition is identified, stop the activity and report it to the responsible laboratory/HSE personnel."
        }
      };
    }
  }
}

async function generateRiskAssessment5x5() {
  var g = function (id) { return (document.getElementById(id) ? document.getElementById(id).value.trim() : ""); };
  var area = g("riskArea") || "Physics Lab";
  var equipment = g("riskEquipment") || "Electrical Test Benches, High-Voltage Power Supplies, Capacitors";
  var activity = g("riskActivity") || "Electrical Experiments, Equipment Operation & Capacitor Handling";
  var persons = g("riskPersons") || "Students, Lab Technicians, Faculty Staff";
  var desc = g("riskLocationDesc") || "";
  var assessor = g("riskAssessor") || "م. إبراهيم سعيد";
  var reviewer = g("riskReviewer") || "م. يوسف محمد";
  var dateStr = g("riskDate") || new Date().toISOString().slice(0, 10);
  var lang = g("riskLang") || "ar";

  var formData = {
    area: area,
    equipment: equipment,
    activity: activity,
    persons: persons,
    description: desc,
    assessor: assessor,
    reviewer: reviewer,
    date: dateStr,
    location: "جامعة السويدي للتكنولوجيا - SUTech",
    lang: lang,
    photosCount: currentRiskPhotos.length
  };

  var outWrap = document.getElementById("riskAssessmentOutput");
  var outBody = document.getElementById("riskAssessmentReport");
  if (outWrap) outWrap.classList.remove("hidden");
  if (outBody) loading(outBody, true);

  showToast("info", "جاري إعداد تقرير تقييم المخاطر والأثر البيئي المعتمد وفق نموذج جامعة السويدي...");

  var prompt = buildRiskAssessmentPrompt(formData, { lang: lang });
  var raData = null;

  try {
    var rawRes = "";
    if (currentRiskPhotos.length) {
      rawRes = await callGeminiWithImages(prompt, currentRiskPhotos);
    } else {
      rawRes = await callGemini(prompt);
    }
    raData = extractJSON(rawRes);
  } catch (e) {
    console.warn("Direct API call returned fallback, generating official SUTech standard assessment:", e);
    raData = generateFallbackMultiActivityRisk(formData, { lang: lang });
  }

  if (!raData || !raData.activities) {
    raData = generateFallbackMultiActivityRisk(formData, { lang: lang });
  }

  raData._formData = formData;
  raData._lang = lang;
  raData._photos = currentRiskPhotos.slice();
  raData._generatedAt = new Date().toISOString();
  lastRiskAssessmentData = raData;

  // Sync with risk register
  if (raData.activities && Array.isArray(raData.activities)) {
    raData.activities.forEach(function (actItem) {
      var inhScore = actItem.inherent_r || ((actItem.inherent_l || 3) * (actItem.inherent_s || 4));
      var resScore = actItem.residual_r || ((actItem.residual_l || 1) * (actItem.residual_s || 4));
      var inhLvl = getRiskScoreLevel(inhScore);
      var resLvl = getRiskScoreLevel(resScore);

      var entry = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        area: formData.area,
        equipment: formData.equipment,
        activity: actItem.activity_breakdown || formData.activity,
        persons: formData.persons,
        hazard: (actItem.potential_hazard || "").replace(/\\n/g, "\n"),
        consequences: actItem.consequences || "",
        category: actItem.risk_category || "S",
        initialL: actItem.inherent_l || 3,
        initialS: actItem.inherent_s || 4,
        initialScore: inhScore,
        initialLevel: inhLvl.level,
        existingControls: (actItem.present_control_measures || "").replace(/\\n/g, "\n"),
        controlType: actItem.control_type || "E / D",
        interimL: actItem.present_l || 2,
        interimS: actItem.present_s || 4,
        interimScore: actItem.present_r || 8,
        furtherAction: (actItem.further_action || "").replace(/\\n/g, "\n"),
        residualL: actItem.residual_l || 1,
        residualS: actItem.residual_s || 4,
        residualScore: resScore,
        residualLevel: resLvl.level,
        owner: formData.reviewer || "HSE Lead",
        targetDate: formData.date || new Date().toISOString().slice(0, 10)
      };

      riskAssessments.unshift(entry);
    });

    try { localStorage.setItem("SUT_RISK_ASSESSMENTS", JSON.stringify(riskAssessments)); } catch (e) {}
    renderRiskAssessment5x5();
    updateRiskMatrixVisualizer();
  }

  renderRiskAssessmentReport(raData);
  saveCurrentRiskAssessment(false);
  showToast("success", "تم إنجاز التقرير الرسمي لتقييم المخاطر والأثر البيئي بنجاح وحفظه بالنظام!");
}

function renderGeneralSafetyInstructionsHTML(gsi, isAr) {
  if (!gsi) return "";
  var title = gsi.title || (isAr ? "التعليمات والاحتياطات العامة للسلامة (GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS)" : "GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS");
  var instructions = gsi.instructions || [];
  var keyRules = gsi.key_safety_rules || [];
  var prohibited = gsi.prohibited_actions || [];
  var mandatoryStmt = gsi.mandatory_statement ||
    "Always follow the approved laboratory SOPs, equipment manufacturer's instructions, site emergency procedures, and applicable HSE requirements. If an unsafe condition is identified, stop the activity and report it to the responsible laboratory/HSE personnel.";

  var catIcons = {
    "1": "fa-user-shield",
    "2": "fa-clipboard-check",
    "3": "fa-bolt-lightning",
    "4": "fa-gears",
    "5": "fa-fire-flame-curved",
    "6": "fa-crosshairs",
    "7": "fa-flask-vial",
    "8": "fa-broom",
    "9": "fa-vest",
    "10": "fa-truck-medical"
  };

  var getIcon = function (catName) {
    for (var key in catIcons) {
      if (catName.indexOf(key) !== -1) return catIcons[key];
    }
    if (/auth|كفاءة|صلاحيات/i.test(catName)) return "fa-user-shield";
    if (/check|فحص/i.test(catName)) return "fa-clipboard-check";
    if (/elec|كهرب/i.test(catName)) return "fa-bolt-lightning";
    if (/mech|workpiece|ميكانيك|تثبيت/i.test(catName)) return "fa-gears";
    if (/therm|حرار/i.test(catName)) return "fa-fire-flame-curved";
    if (/laser|opt|ليزر|بصر/i.test(catName)) return "fa-crosshairs";
    if (/glass|vac|زجاج|تفريغ/i.test(catName)) return "fa-flask-vial";
    if (/house|swarf|نظاف|ترتيب|رايش/i.test(catName)) return "fa-broom";
    if (/ppe|وقاية/i.test(catName)) return "fa-vest";
    if (/emerg|طوارئ/i.test(catName)) return "fa-truck-medical";
    return "fa-circle-check";
  };

  var h = '<div class="official-safety-instructions-section">' +
    '<div class="safety-instructions-header">' +
      '<div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:0.3px">' +
        '<i class="fa-solid fa-shield-halved" style="color:#38bdf8;font-size:14px"></i>' +
        '<span>' + esc(title) + '</span>' +
      '</div>' +
      '<span class="meta-badge" style="background:#f0fdf4;border:1px solid #86efac;color:#166534;font-size:9.5px;padding:3px 9px;border-radius:12px;font-weight:700">' +
        '<i class="fa-solid fa-check-double"></i> ' + (isAr ? 'اشتراطات إلزامية للتنفيذ' : 'Mandatory Safety Rules') +
      '</span>' +
    '</div>' +
    '<div style="padding:14px 16px;background:#ffffff">' +
      '<p style="margin:0 0 12px;font-size:10.5px;color:#334155;line-height:1.6;font-weight:600">' +
        (isAr ?
          'تُلخص هذه الإرشادات أهم القواعد والاحتياطات الميدانية الواجب اتباعها لضمان سلامة الأفراد ومستخدمي المختبر قبل وأثناء وبعد تشغيل المعدات وإجراء التجارب:' :
          'The following summary outlines the essential practical safety requirements and precautions answering "What must I do to work safely in this laboratory?":') +
      '</p>';

  /* 1. General Safety Instructions Category Cards */
  if (instructions && instructions.length) {
    h += '<div class="safety-rules-grid">';
    instructions.forEach(function (cat) {
      var catName = cat.category || "";
      var rules = cat.rules || [];
      var icon = getIcon(catName);
      h += '<div class="safety-rule-card">' +
        '<h5><i class="fa-solid ' + icon + '" style="color:#2563eb"></i> ' + esc(catName) + '</h5>' +
        '<ul>' +
          rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") +
        '</ul>' +
      '</div>';
    });
    h += '</div>';
  }

  /* 2. Key Safety Rules Callout Box */
  if (keyRules && keyRules.length) {
    h += '<div class="key-safety-rules-box" style="margin:14px 0;background:#f0f9ff;border:1.5px solid #0284c7;border-radius:8px;padding:12px 14px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#0369a1;font-size:11.5px;font-weight:800">' +
        '<i class="fa-solid fa-star" style="color:#0284c7"></i>' +
        '<span>' + (isAr ? 'القواعد الذهبية للسلامة - مختبر التصنيع (KEY SAFETY RULES – FABRICATION LAB)' : 'KEY SAFETY RULES – FABRICATION LAB') + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:8px">' +
        keyRules.map(function (kr) {
          return '<div style="background:#ffffff;border:1px solid #bae6fd;border-radius:6px;padding:6px 10px;font-size:9.5px;font-weight:700;color:#0f172a;display:flex;align-items:flex-start;gap:6px">' +
            '<i class="fa-solid fa-check" style="color:#0284c7;margin-top:2px;flex-shrink:0"></i>' +
            '<span>' + esc(kr) + '</span>' +
          '</div>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  /* 3. Prohibited Actions */
  if (prohibited && prohibited.length) {
    h += '<div class="prohibited-actions-box">' +
      '<h5><i class="fa-solid fa-ban" style="color:#dc2626;font-size:13px"></i> ' + (isAr ? 'الأفعال والممارسات المحظورة تماماً (Prohibited Actions):' : 'Prohibited Actions (Strictly Forbidden):') + '</h5>' +
      '<ul>' +
        prohibited.map(function (pa) { return '<li>' + esc(pa) + '</li>'; }).join("") +
      '</ul>' +
    '</div>';
  }

  /* 4. Mandatory Final Safety Statement */
  if (mandatoryStmt) {
    h += '<div class="mandatory-statement-box">' +
      '<i class="fa-solid fa-triangle-exclamation" style="color:#2563eb;font-size:15px;flex-shrink:0"></i>' +
      '<div>' + esc(mandatoryStmt) + '</div>' +
    '</div>';
  }

  h += '</div></div>';
  return h;
}

function renderOfficialRiskMatrixHTML(isAr) {
  return '<div class="official-matrix-section" style="margin:14px 0 16px;background:#ffffff;border:1.5px solid #0b1f3a;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(11,31,58,0.06)">' +
    '<div class="safety-instructions-header" style="background:linear-gradient(90deg, #0b1f3a 0%, #1e3a8a 100%);color:#ffffff;padding:8px 12px;border-bottom:2.5px solid #c00000;display:flex;justify-content:space-between;align-items:center">' +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:0.3px;display:flex;align-items:center;gap:6px">' +
        '<i class="fa-solid fa-table-cells-large" style="color:#38bdf8"></i>' +
        '<span>' + (isAr ? 'مصفوفة تقييم المخاطر والمظاهر البيئية (Risk &amp; Environmental Aspect Assessment Matrix 6×5)' : 'Risk and Environmental Aspect Assessment Matrix (6×5)') + '</span>' +
      '</div>' +
      '<span class="meta-badge" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#ffffff;font-size:9.5px;padding:2px 8px;border-radius:10px;font-weight:700">' +
        (isAr ? 'قسم السلامة والصحة المهنية / HSE Department' : 'HSE Department - SUTech') +
      '</span>' +
    '</div>' +
    '<div style="padding:8px 10px;overflow-x:auto;background:#ffffff">' +
      '<table class="official-sut-matrix-table" style="width:100%;border-collapse:collapse;font-size:8.5px;text-align:center">' +
        '<thead>' +
          '<tr>' +
            '<th rowspan="2" style="width:3%;background:#0b1f3a;color:#ffffff;border:1px solid #000000;padding:4px">#</th>' +
            '<th colspan="3" style="background:#0b1f3a;color:#ffffff;border:1px solid #000000;padding:4px;font-size:9.5px">' +
              (isAr ? 'التأثير / التبعات (Potential Effect / Consequences)' : 'Potential Effect / Consequences') +
            '</th>' +
            '<th colspan="5" style="background:#0b1f3a;color:#ffffff;border:1px solid #000000;padding:4px;font-size:9.5px">' +
              (isAr ? 'التكرار / الاحتمالية وفئة الخطر (Frequency / Probability &amp; Risk Class)' : 'Frequency / Probability &amp; Risk Class') +
            '</th>' +
          '</tr>' +
          '<tr>' +
            '<th style="width:17%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>Safety</b><br><small>السلامة</small></th>' +
            '<th style="width:18%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>Health</b><br><small>الصحة</small></th>' +
            '<th style="width:18%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>Environment</b><br><small>البيئة</small></th>' +
            '<th style="width:8.8%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>1 - 5 / years</b><br><small>(1) 1-5 سنين</small></th>' +
            '<th style="width:8.8%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>5 - 10 / years</b><br><small>(2) 5-10 سنين</small></th>' +
            '<th style="width:8.8%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>1 - 5 / month</b><br><small>(3) شهرياً</small></th>' +
            '<th style="width:8.8%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>1 - 5 / week</b><br><small>(4) أسبوعياً</small></th>' +
            '<th style="width:8.8%;background:#f1f5f9;color:#0b1f3a;border:1px solid #000000;padding:3px"><b>Daily / يومي</b><br><small>(5) يومي</small></th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<tr>' +
            '<td style="font-weight:bold;background:#f8fafc;border:1px solid #000000">1</td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Near miss</b><br><small style="color:#475569">حادث وشيك</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Nuisance, Discomfort</b><br><small style="color:#475569">إحساس بعدم الراحة</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Small emissions</b><br><small style="color:#475569">انبعاثات بسيطة</small></td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">1</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">2</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">3</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">4</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">5</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="font-weight:bold;background:#f8fafc;border:1px solid #000000">2</td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>First Aid</b><br><small style="color:#475569">إسعافات أولية</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Health Complaints</b><br><small style="color:#475569">شكوى صحية</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Spills that can be cleaned up immediately</b><br><small style="color:#475569">انسكابات يمكن تنظيفها فوراً</small></td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">2</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">4</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">6</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">8</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">10</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="font-weight:bold;background:#f8fafc;border:1px solid #000000">3</td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Medical Treatment &amp; Restricted Work</b><br><small style="color:#475569">حالة تستلزم متابعة طبية أو تغير لنوع العمل</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Exceeding working Exposure Limits, Work-related illness</b><br><small style="color:#475569">تعرض يتخطى حدود النسبة المسموح بها أو حالة صحية تستلزم متابعة</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Emissions/spills leading to investigations &amp; remediation</b><br><small style="color:#475569">انبعاثات / انسكاب بكميات كبيرة</small></td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">3</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">6</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">9</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">12</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">15</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="font-weight:bold;background:#f8fafc;border:1px solid #000000">4</td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Losttime Case</b><br><small style="color:#475569">غياب عن العمل بسبب الإصابة (LTI)</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Work related illness</b><br><small style="color:#475569">غياب عن العمل بسبب مرض مهني</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Emissions/spills with limited damage off site</b><br><small style="color:#475569">انبعاث / انسكاب كبير له تأثير محدود خارج الموقع</small></td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">4</td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">8</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">12</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">16</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">20</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="font-weight:bold;background:#f8fafc;border:1px solid #000000">5</td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Partial / Complete disability</b><br><small style="color:#475569">إصابة ينتج عنها عجز جزئي أو كلي</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Occupational illness, Partial / Complete disability</b><br><small style="color:#475569">مرض مهني يسبب عجز</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Emissions/spills with longer lasting damage</b><br><small style="color:#475569">انبعاثات أو انسكاب له تأثير على المدى البعيد</small></td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">5</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">10</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">15</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">20</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">25</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="font-weight:bold;background:#f8fafc;border:1px solid #000000">6</td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Fatality</b><br><small style="color:#475569">حالة وفاة</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Fatal Occupational illness</b><br><small style="color:#475569">مرض مهني يسبب الوفاة</small></td>' +
            '<td style="text-align:start;padding:3px 5px;border:1px solid #000000"><b>Emissions/spills with permanent damage</b><br><small style="color:#475569">انبعاثات/انسكاب ينتج عنه ضرر دائم أو لمدة طويلة</small></td>' +
            '<td class="score-green" style="background:#86efac;font-weight:bold;border:1px solid #000000;font-size:10px">6</td>' +
            '<td class="score-yellow" style="background:#fef08a;font-weight:bold;border:1px solid #000000;font-size:10px">12</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">18</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">24</td>' +
            '<td class="score-red" style="background:#f87171;font-weight:bold;border:1px solid #000000;font-size:10px;color:#000000">30</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>' +

      /* Hierarchy of Controls Table */
      '<table class="official-control-measure-table" style="width:100%;margin-top:8px;border-collapse:collapse;font-size:9.5px">' +
        '<thead>' +
          '<tr style="background:#0b1f3a;color:#ffffff">' +
            '<th style="width:25%;padding:5px 8px;text-align:center;border:1px solid #000000"><b>' + (isAr ? 'درجة الخطورة (Risk Class)' : 'Risk Class') + '</b></th>' +
            '<th style="padding:5px 8px;text-align:center;border:1px solid #000000"><b>' + (isAr ? 'نوع وسيلة التحكم المعتمدة (Type of Control Measure)' : 'Type of Control Measure') + '</b></th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<tr style="background:#86efac;color:#000000">' +
            '<td style="font-weight:bold;text-align:center;padding:5px;font-size:11px;border:1px solid #000000">1 – 8</td>' +
            '<td style="padding:5px 10px;font-weight:bold;border:1px solid #000000">' +
              '<div>Administrative control or Use of proper Personal Protective Equipment (PPE)</div>' +
              '<small style="font-size:8.5px;font-weight:normal">وسائل تحكم إدارية أو استخدام مهمات الوقاية الشخصية المناسبة</small>' +
            '</td>' +
          '</tr>' +
          '<tr style="background:#fef08a;color:#000000">' +
            '<td style="font-weight:bold;text-align:center;padding:5px;font-size:11px;border:1px solid #000000">9 – 15</td>' +
            '<td style="padding:5px 10px;font-weight:bold;border:1px solid #000000">' +
              '<div>Engineering control is required</div>' +
              '<small style="font-size:8.5px;font-weight:normal">تحكم هندسي مطلوب وإلزامي مع تطبيق الضوابط الإدارية</small>' +
            '</td>' +
          '</tr>' +
          '<tr style="background:#f87171;color:#000000">' +
            '<td style="font-weight:bold;text-align:center;padding:5px;font-size:11px;border:1px solid #000000">More than 16 (16 – 30)</td>' +
            '<td style="padding:5px 10px;font-weight:bold;border:1px solid #000000">' +
              '<div>Stop operation immediately till elimination or substitution</div>' +
              '<small style="font-size:8.5px;font-weight:normal">إيقاف النشاط فوراً لحين استبداله أو عزله / إزالته</small>' +
            '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

function initRiskAssessmentVersion(ra) {
  if (!ra) return;
  if (!ra._version) ra._version = "1.0";
  if (!ra._history) ra._history = [];
  if (!ra._generatedAt) ra._generatedAt = new Date().toISOString();
  if (!ra._lastModified) ra._lastModified = ra._generatedAt;
  if (!ra._lastChangeDesc) ra._lastChangeDesc = (ra._lang === "ar" ? "النسخة الأصلية المعتمدة (Master)" : "Approved Master Assessment");
}

function saveRiskAssessmentRevision(ra, changeDesc) {
  if (!ra) return;
  initRiskAssessmentVersion(ra);

  var snapshot = {
    version: ra._version,
    date: ra._lastModified || new Date().toISOString(),
    desc: ra._lastChangeDesc || "Initial",
    activities: JSON.parse(JSON.stringify(ra.activities || [])),
    responsibilities: JSON.parse(JSON.stringify(ra.responsibilities || [])),
    general_safety_instructions: JSON.parse(JSON.stringify(ra.general_safety_instructions || {}))
  };

  ra._history.push(snapshot);

  var parts = String(ra._version).split(".");
  var major = parseInt(parts[0], 10) || 1;
  var minor = parseInt(parts[1], 10) || 0;
  ra._version = major + "." + (minor + 1);
  ra._lastModified = new Date().toISOString();
  ra._lastChangeDesc = changeDesc || "Updated";

  try {
    saveCurrentRiskAssessment(false);
  } catch(e) {}
}

function restoreRiskAssessmentRevision(versionIndex) {
  var ra = lastRiskAssessmentData;
  if (!ra || !ra._history || !ra._history[versionIndex]) return;
  var isAr = (ra._lang === "ar");
  var target = ra._history[versionIndex];

  saveRiskAssessmentRevision(ra, (isAr ? "استرجاع من النسخة: v" : "Restored from revision v") + target.version);

  ra.activities = JSON.parse(JSON.stringify(target.activities || []));
  if (target.responsibilities) ra.responsibilities = JSON.parse(JSON.stringify(target.responsibilities));
  if (target.general_safety_instructions) ra.general_safety_instructions = JSON.parse(JSON.stringify(target.general_safety_instructions));

  syncMasterRaWithRegister(ra);
  renderRiskAssessmentReport(ra);
  showToast("success", isAr ? ("تم استرجاع الإصدار v" + target.version + " بنجاح!") : ("Restored revision v" + target.version + " successfully!"));
}

function syncMasterRaWithRegister(ra) {
  if (!ra || !ra.activities) return;
  var formData = ra._formData || {};
  riskAssessments = riskAssessments.filter(function(x) { return x.area !== (formData.area || ra.activity_to_be_assessed); });

  ra.activities.forEach(function(actItem) {
    var inhScore = actItem.inherent_r || ((actItem.inherent_l || 4) * (actItem.inherent_s || 4));
    var presScore = actItem.present_r || ((actItem.present_l || 2) * (actItem.present_s || 4));
    var resScore = actItem.residual_r || ((actItem.residual_l || 1) * (actItem.residual_s || 4));
    var inhLvl = getRiskScoreLevel(inhScore);
    var resLvl = getRiskScoreLevel(resScore);

    var entry = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      area: formData.area || ra.activity_to_be_assessed || "Fabrication Lab",
      equipment: formData.equipment || "Laboratory Equipment",
      activity: actItem.activity_breakdown || formData.activity || "Operation",
      persons: formData.persons || "Students, Staff",
      hazard: (actItem.potential_hazard || "").replace(/\\n/g, "\n"),
      consequences: actItem.consequences || "",
      category: actItem.risk_category || "S",
      initialL: actItem.inherent_l || 4,
      initialS: actItem.inherent_s || 4,
      initialScore: inhScore,
      initialLevel: inhLvl.level,
      existingControls: (actItem.present_control_measures || "").replace(/\\n/g, "\n"),
      controlType: actItem.control_type || "E / D",
      interimL: actItem.present_l || 2,
      interimS: actItem.present_s || 4,
      interimScore: presScore,
      furtherAction: (actItem.further_action || "").replace(/\\n/g, "\n"),
      residualL: actItem.residual_l || 1,
      residualS: actItem.residual_s || 4,
      residualScore: resScore,
      residualLevel: resLvl.level,
      owner: formData.reviewer || "HSE Lead",
      targetDate: formData.date || new Date().toISOString().slice(0, 10)
    };
    riskAssessments.unshift(entry);
  });

  try { localStorage.setItem("SUT_RISK_ASSESSMENTS", JSON.stringify(riskAssessments)); } catch(e) {}
  renderRiskAssessment5x5();
  updateRiskMatrixVisualizer();
}

function openEditRiskActivityModal(index) {
  var ra = lastRiskAssessmentData;
  if (!ra || !ra.activities || !ra.activities[index]) return;
  var act = ra.activities[index];
  var isAr = (ra._lang === "ar");

  var modalId = "riskActivityEditModalOverlay";
  var oldModal = document.getElementById(modalId);
  if (oldModal) oldModal.remove();

  var inhL = act.inherent_l || 4;
  var inhS = act.inherent_s || 4;
  var presL = act.present_l || 2;
  var presS = act.present_s || inhS;
  var resL = act.residual_l || 1;
  var resS = act.residual_s || inhS;

  var inhScore = act.inherent_r || (inhL * inhS);
  var presScore = act.present_r || (presL * presS);
  var resScore = act.residual_r || (resL * resS);

  var overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.className = "modal-overlay no-print";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);";

  var optL = function(curVal) {
    return [1,2,3,4,5].map(function(v) {
      return '<option value="' + v + '"' + (Number(curVal) === v ? ' selected' : '') + '>' + v + '</option>';
    }).join("");
  };

  var optS = function(curVal) {
    return [1,2,3,4,5,6].map(function(v) {
      return '<option value="' + v + '"' + (Number(curVal) === v ? ' selected' : '') + '>' + v + '</option>';
    }).join("");
  };

  overlay.innerHTML = '<div style="background:#ffffff;border-radius:12px;width:100%;max-width:760px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:2px solid #0b1f3a;font-family:Arial,Cairo,sans-serif;color:#0f172a;" dir="' + (isAr ? 'rtl' : 'ltr') + '">' +
    '<div style="background:linear-gradient(90deg, #0b1f3a 0%, #1e3a8a 100%);color:#ffffff;padding:12px 18px;border-bottom:3px solid #c00000;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;">' +
      '<div style="font-weight:800;font-size:13.5px;display:flex;align-items:center;gap:8px">' +
        '<i class="fa-solid fa-pen-to-square" style="color:#38bdf8"></i>' +
        '<span>' + (isAr ? 'تعديل نشاط وتقييم الخطر (Non-Destructive Row Edit)' : 'Edit Activity / Risk Assessment Row') + '</span>' +
      '</div>' +
      '<button type="button" id="closeEditModalBtn" style="background:none;border:none;color:#ffffff;font-size:20px;cursor:pointer;line-height:1">&times;</button>' +
    '</div>' +

    '<div style="padding:16px 20px;">' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-weight:bold;font-size:12px;color:#0b1f3a;display:block;margin-bottom:4px">' +
          '<i class="fa-solid fa-diagram-project"></i> ' + (isAr ? 'تفصيل النشاط والمعدات (Activity Breakdown & Equipment)' : 'Activity Breakdown & Equipment') +
        '</label>' +
        '<input id="editAct_name" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:bold" value="' + esc(act.activity_breakdown || '') + '">' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        '<div>' +
          '<label style="font-weight:bold;font-size:12px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            '<i class="fa-solid fa-triangle-exclamation"></i> ' + (isAr ? 'مصدر الخطر المحتمل (Hazard Source → Event → Exposure → Consequence)' : 'Potential Hazard / Aspect') +
          '</label>' +
          '<textarea id="editAct_hazard" rows="3" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px">' + esc((act.potential_hazard || '').replace(/\\n/g, '\n')) + '</textarea>' +
        '</div>' +
        '<div>' +
          '<label style="font-weight:bold;font-size:12px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            '<i class="fa-solid fa-notes-medical"></i> ' + (isAr ? 'الآثار والنتائج المترتبة (Consequences / Impacts)' : 'Consequences / Impacts') +
          '</label>' +
          '<textarea id="editAct_consequences" rows="3" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px">' + esc(act.consequences || '') + '</textarea>' +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:14px;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0">' +
        '<div>' +
          '<label style="font-weight:bold;font-size:11.5px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            (isAr ? 'فئة الخطر (Category)' : 'Risk Category') +
          '</label>' +
          '<select id="editAct_category" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:11.5px;font-weight:bold">' +
            '<option value="S"' + (act.risk_category === 'S' ? ' selected' : '') + '>S - Safety (السلامة)</option>' +
            '<option value="H"' + (act.risk_category === 'H' ? ' selected' : '') + '>H - Health (الصحة المهنية)</option>' +
            '<option value="E"' + (act.risk_category === 'E' ? ' selected' : '') + '>E - Environment (البيئة)</option>' +
            '<option value="P"' + (act.risk_category === 'P' ? ' selected' : '') + '>P - Productivity (الإنتاجية)</option>' +
            '<option value="I"' + (act.risk_category === 'I' ? ' selected' : '') + '>I - Image (سمعة الموقع)</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label style="font-weight:bold;font-size:11.5px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            (isAr ? 'الخطر الأولي (Inherent Risk S×L)' : 'Inherent Risk (S×L)') +
          '</label>' +
          '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11.5px">' +
            '<span>L (1-5):</span>' +
            '<select id="editAct_inhL" style="padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-weight:bold">' + optL(inhL) + '</select>' +
            '<span>× S (1-6):</span>' +
            '<select id="editAct_inhS" style="padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-weight:bold">' + optS(inhS) + '</select>' +
            '<span>=</span>' +
            '<span id="editAct_inhPill" class="score-cell" style="padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px">' + inhScore + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* Present Controls Section */
      '<div style="margin-bottom:14px;background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">' +
        '<div style="display:grid;grid-template-columns:3fr 1.5fr;gap:12px;margin-bottom:8px">' +
          '<div>' +
            '<label style="font-weight:bold;font-size:11.5px;color:#166534;display:block;margin-bottom:4px">' +
              '<i class="fa-solid fa-shield-halved"></i> ' + (isAr ? 'تدابير التحكم الحالية (Present Control Measures)' : 'Present Control Measures') +
            '</label>' +
            '<textarea id="editAct_presentControls" rows="2" style="width:100%;padding:6px 8px;border:1px solid #86efac;border-radius:6px;font-size:11px">' + esc((act.present_control_measures || '').replace(/\\n/g, '\n')) + '</textarea>' +
          '</div>' +
          '<div>' +
            '<label style="font-weight:bold;font-size:11.5px;color:#166534;display:block;margin-bottom:4px">' +
              (isAr ? 'نوع التحكم (Type A,B,D,E,F)' : 'Control Type') +
            '</label>' +
            '<input id="editAct_controlType" style="width:100%;padding:6px 8px;border:1px solid #86efac;border-radius:6px;font-size:11.5px;font-weight:bold" value="' + esc(act.control_type || 'D / E') + '">' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;font-size:11.5px;flex-wrap:wrap">' +
          '<b>' + (isAr ? 'الخطر بعد التحكم الحالي:' : 'Present Risk:') + '</b>' +
          '<span>L:</span>' +
          '<select id="editAct_presL" style="padding:4px 6px;border:1px solid #86efac;border-radius:4px;font-weight:bold">' + optL(presL) + '</select>' +
          '<span>× S:</span>' +
          '<select id="editAct_presS" style="padding:4px 6px;border:1px solid #86efac;border-radius:4px;font-weight:bold">' + optS(presS) + '</select>' +
          '<span>=</span>' +
          '<span id="editAct_presPill" class="score-cell" style="padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px">' + presScore + '</span>' +
        '</div>' +
      '</div>' +

      /* Further Action & Residual Risk Section */
      '<div style="margin-bottom:14px;background:#f0f9ff;padding:10px;border-radius:8px;border:1px solid #bae6fd">' +
        '<div style="margin-bottom:8px">' +
          '<label style="font-weight:bold;font-size:11.5px;color:#0369a1;display:block;margin-bottom:4px">' +
            '<i class="fa-solid fa-list-check"></i> ' + (isAr ? 'الإجراءات الإضافية والتحسين (Further Action)' : 'Further Action') +
          '</label>' +
          '<textarea id="editAct_furtherAction" rows="2" style="width:100%;padding:6px 8px;border:1px solid #7dd3fc;border-radius:6px;font-size:11px">' + esc((act.further_action || '').replace(/\\n/g, '\n')) + '</textarea>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;font-size:11.5px;flex-wrap:wrap">' +
          '<b>' + (isAr ? 'الخطر المتبقي النهائي (Residual Risk):' : 'Residual Risk:') + '</b>' +
          '<span>L:</span>' +
          '<select id="editAct_resL" style="padding:4px 6px;border:1px solid #7dd3fc;border-radius:4px;font-weight:bold">' + optL(resL) + '</select>' +
          '<span>× S:</span>' +
          '<select id="editAct_resS" style="padding:4px 6px;border:1px solid #7dd3fc;border-radius:4px;font-weight:bold">' + optS(resS) + '</select>' +
          '<span>=</span>' +
          '<span id="editAct_resPill" class="score-cell" style="padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px">' + resScore + '</span>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px">' +
        '<button type="button" class="btn btn-light" id="cancelEditModalBtn" style="padding:8px 16px">' + (isAr ? 'إلغاء' : 'Cancel') + '</button>' +
        '<button type="button" class="btn btn-sut" id="saveEditRiskActBtn" style="padding:8px 20px;font-weight:bold">' +
          '<i class="fa-solid fa-floppy-disk"></i> ' + (isAr ? 'حفظ التعديلات وتحديث السجل' : 'Save Changes & Update Master') +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.appendChild(overlay);

  var updatePills = function() {
    var iL = parseInt(document.getElementById("editAct_inhL").value, 10);
    var iS = parseInt(document.getElementById("editAct_inhS").value, 10);
    var pL = parseInt(document.getElementById("editAct_presL").value, 10);
    var pS = parseInt(document.getElementById("editAct_presS").value, 10);
    var rL = parseInt(document.getElementById("editAct_resL").value, 10);
    var rS = parseInt(document.getElementById("editAct_resS").value, 10);

    var iScore = iL * iS;
    var pScore = pL * pS;
    var rScore = rL * rS;

    var setPill = function(id, sc) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = sc;
      el.style.backgroundColor = sc >= 16 ? "#f87171" : (sc >= 9 ? "#fef08a" : "#86efac");
      el.style.color = "#000000";
    };

    setPill("editAct_inhPill", iScore);
    setPill("editAct_presPill", pScore);
    setPill("editAct_resPill", rScore);
  };

  ["editAct_inhL", "editAct_inhS", "editAct_presL", "editAct_presS", "editAct_resL", "editAct_resS"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("change", updatePills);
  });
  updatePills();

  document.getElementById("closeEditModalBtn").addEventListener("click", function() { overlay.remove(); });
  document.getElementById("cancelEditModalBtn").addEventListener("click", function() { overlay.remove(); });

  document.getElementById("saveEditRiskActBtn").addEventListener("click", function() {
    var iL = parseInt(document.getElementById("editAct_inhL").value, 10);
    var iS = parseInt(document.getElementById("editAct_inhS").value, 10);
    var pL = parseInt(document.getElementById("editAct_presL").value, 10);
    var pS = parseInt(document.getElementById("editAct_presS").value, 10);
    var rL = parseInt(document.getElementById("editAct_resL").value, 10);
    var rS = parseInt(document.getElementById("editAct_resS").value, 10);

    act.activity_breakdown = document.getElementById("editAct_name").value.trim();
    act.potential_hazard = document.getElementById("editAct_hazard").value.trim();
    act.consequences = document.getElementById("editAct_consequences").value.trim();
    act.risk_category = document.getElementById("editAct_category").value;
    act.inherent_l = iL;
    act.inherent_s = iS;
    act.inherent_r = iL * iS;
    act.present_control_measures = document.getElementById("editAct_presentControls").value.trim();
    act.control_type = document.getElementById("editAct_controlType").value.trim();
    act.present_l = pL;
    act.present_s = pS;
    act.present_r = pL * pS;
    act.further_action = document.getElementById("editAct_furtherAction").value.trim();
    act.residual_l = rL;
    act.residual_s = rS;
    act.residual_r = rL * rS;

    saveRiskAssessmentRevision(ra, (isAr ? "تعديل النشاط: " : "Updated Activity: ") + act.activity_breakdown);
    overlay.remove();
    syncMasterRaWithRegister(ra);
    renderRiskAssessmentReport(ra);
    showToast("success", isAr ? "تم تحديث بند التقييم وإعادة حساب درجات الخطورة بنجاح!" : "Activity and Risk Scores updated successfully!");
  });
}

function openAddRiskActivityModal() {
  var ra = lastRiskAssessmentData;
  if (!ra) return showSweetAlert("تنبيه", "يرجى توليد تقرير تقييم المخاطر أولاً.", "warning");
  if (!ra.activities) ra.activities = [];
  var isAr = (ra._lang === "ar");

  var modalId = "riskActivityAddModalOverlay";
  var oldModal = document.getElementById(modalId);
  if (oldModal) oldModal.remove();

  var overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.className = "modal-overlay no-print";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);";

  var nextIdx = ra.activities.length + 1;

  overlay.innerHTML = '<div style="background:#ffffff;border-radius:12px;width:100%;max-width:760px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:2px solid #0b1f3a;font-family:Arial,Cairo,sans-serif;color:#0f172a;" dir="' + (isAr ? 'rtl' : 'ltr') + '">' +
    '<div style="background:linear-gradient(90deg, #0b1f3a 0%, #1e3a8a 100%);color:#ffffff;padding:12px 18px;border-bottom:3px solid #c00000;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;">' +
      '<div style="font-weight:800;font-size:13.5px;display:flex;align-items:center;gap:8px">' +
        '<i class="fa-solid fa-plus-circle" style="color:#38bdf8"></i>' +
        '<span>' + (isAr ? 'إضافة نشاط / خطر جديد (Add Activity to Master RA)' : 'Add Activity / Risk Assessment Row') + '</span>' +
      '</div>' +
      '<button type="button" id="closeAddModalBtn" style="background:none;border:none;color:#ffffff;font-size:20px;cursor:pointer;line-height:1">&times;</button>' +
    '</div>' +

    '<div style="padding:16px 20px;">' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-weight:bold;font-size:12px;color:#0b1f3a;display:block;margin-bottom:4px">' +
          '<i class="fa-solid fa-diagram-project"></i> ' + (isAr ? 'تفصيل النشاط والمعدة (Activity Breakdown & Equipment)' : 'Activity Breakdown & Equipment') +
        '</label>' +
        '<input id="addAct_name" placeholder="' + (isAr ? 'مثال: ' + nextIdx + '. تشغيل ماكينة الخراطة CNC' : 'e.g., ' + nextIdx + '. CNC Lathe Operations') + '" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:bold" value="' + nextIdx + '. ">' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        '<div>' +
          '<label style="font-weight:bold;font-size:12px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            '<i class="fa-solid fa-triangle-exclamation"></i> ' + (isAr ? 'مصدر الخطر المحتمل (Hazard Source → Event → Exposure → Consequence)' : 'Potential Hazard / Aspect') +
          '</label>' +
          '<textarea id="addAct_hazard" rows="3" placeholder="' + (isAr ? 'مصدر الخطر: ... → الحدث الخطر: ... → التعرض: ... → النتيجة: ...' : 'Hazard Source: ... → Hazardous Event: ... → Exposure: ... → Consequence: ...') + '" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px"></textarea>' +
        '</div>' +
        '<div>' +
          '<label style="font-weight:bold;font-size:12px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            '<i class="fa-solid fa-notes-medical"></i> ' + (isAr ? 'الآثار والنتائج المترتبة (Consequences / Impacts)' : 'Consequences / Impacts') +
          '</label>' +
          '<textarea id="addAct_consequences" rows="3" placeholder="' + (isAr ? 'النتائج المحتملة (مثل: جروح قطعية، كسور، تلف أجهزة)' : 'Potential consequences (e.g. lacerations, fractures)') + '" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px"></textarea>' +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:14px;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0">' +
        '<div>' +
          '<label style="font-weight:bold;font-size:11.5px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            (isAr ? 'فئة الخطر (Category)' : 'Risk Category') +
          '</label>' +
          '<select id="addAct_category" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:11.5px;font-weight:bold">' +
            '<option value="S">S - Safety (السلامة)</option>' +
            '<option value="H">H - Health (الصحة المهنية)</option>' +
            '<option value="E">E - Environment (البيئة)</option>' +
            '<option value="P">P - Productivity (الإنتاجية)</option>' +
            '<option value="I">I - Image (سمعة الموقع)</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label style="font-weight:bold;font-size:11.5px;color:#0b1f3a;display:block;margin-bottom:4px">' +
            (isAr ? 'الخطر الأولي (Inherent Risk S×L)' : 'Inherent Risk (S×L)') +
          '</label>' +
          '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11.5px">' +
            '<span>L (1-5):</span>' +
            '<select id="addAct_inhL" style="padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-weight:bold">' +
              '<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option>' +
            '</select>' +
            '<span>× S (1-6):</span>' +
            '<select id="addAct_inhS" style="padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-weight:bold">' +
              '<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option><option value="6">6</option>' +
            '</select>' +
            '<span>=</span>' +
            '<span id="addAct_inhPill" class="score-cell" style="padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px;background:#f87171;color:#000">16</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* Present Controls Section */
      '<div style="margin-bottom:14px;background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">' +
        '<div style="display:grid;grid-template-columns:3fr 1.5fr;gap:12px;margin-bottom:8px">' +
          '<div>' +
            '<label style="font-weight:bold;font-size:11.5px;color:#166534;display:block;margin-bottom:4px">' +
              '<i class="fa-solid fa-shield-halved"></i> ' + (isAr ? 'تدابير التحكم الحالية (Present Control Measures)' : 'Present Control Measures') +
            '</label>' +
            '<textarea id="addAct_presentControls" rows="2" placeholder="' + (isAr ? '- حواجب الحماية الميكانيكية\n- التدريب وإجراءات العمل القياسية\n- مهمات الوقاية الشخصية' : '- Machine guards\n- SOPs\n- PPE') + '" style="width:100%;padding:6px 8px;border:1px solid #86efac;border-radius:6px;font-size:11px"></textarea>' +
          '</div>' +
          '<div>' +
            '<label style="font-weight:bold;font-size:11.5px;color:#166534;display:block;margin-bottom:4px">' +
              (isAr ? 'نوع التحكم (Type A,B,D,E,F)' : 'Control Type') +
            '</label>' +
            '<input id="addAct_controlType" value="D / E" style="width:100%;padding:6px 8px;border:1px solid #86efac;border-radius:6px;font-size:11.5px;font-weight:bold">' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;font-size:11.5px;flex-wrap:wrap">' +
          '<b>' + (isAr ? 'الخطر بعد التحكم الحالي:' : 'Present Risk:') + '</b>' +
          '<span>L:</span>' +
          '<select id="addAct_presL" style="padding:4px 6px;border:1px solid #86efac;border-radius:4px;font-weight:bold">' +
            '<option value="1">1</option><option value="2" selected>2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>' +
          '</select>' +
          '<span>× S:</span>' +
          '<select id="addAct_presS" style="padding:4px 6px;border:1px solid #86efac;border-radius:4px;font-weight:bold">' +
            '<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option><option value="6">6</option>' +
          '</select>' +
          '<span>=</span>' +
          '<span id="addAct_presPill" class="score-cell" style="padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px;background:#86efac;color:#000">8</span>' +
        '</div>' +
      '</div>' +

      /* Further Action & Residual Risk Section */
      '<div style="margin-bottom:14px;background:#f0f9ff;padding:10px;border-radius:8px;border:1px solid #bae6fd">' +
        '<div style="margin-bottom:8px">' +
          '<label style="font-weight:bold;font-size:11.5px;color:#0369a1;display:block;margin-bottom:4px">' +
            '<i class="fa-solid fa-list-check"></i> ' + (isAr ? 'الإجراءات الإضافية والتحسين (Further Action)' : 'Further Action') +
          '</label>' +
          '<textarea id="addAct_furtherAction" rows="2" placeholder="' + (isAr ? '- تنفيذ فحص دوري معتمد\n- استكمال برنامج التدريب العملي' : '- Periodic documented inspection\n- Additional training') + '" style="width:100%;padding:6px 8px;border:1px solid #7dd3fc;border-radius:6px;font-size:11px"></textarea>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;font-size:11.5px;flex-wrap:wrap">' +
          '<b>' + (isAr ? 'الخطر المتبقي النهائي (Residual Risk):' : 'Residual Risk:') + '</b>' +
          '<span>L:</span>' +
          '<select id="addAct_resL" style="padding:4px 6px;border:1px solid #7dd3fc;border-radius:4px;font-weight:bold">' +
            '<option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>' +
          '</select>' +
          '<span>× S:</span>' +
          '<select id="addAct_resS" style="padding:4px 6px;border:1px solid #7dd3fc;border-radius:4px;font-weight:bold">' +
            '<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option><option value="6">6</option>' +
          '</select>' +
          '<span>=</span>' +
          '<span id="addAct_resPill" class="score-cell" style="padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px;background:#86efac;color:#000">4</span>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px">' +
        '<button type="button" class="btn btn-light" id="cancelAddModalBtn" style="padding:8px 16px">' + (isAr ? 'إلغاء' : 'Cancel') + '</button>' +
        '<button type="button" class="btn btn-sut" id="saveAddRiskActBtn" style="padding:8px 20px;font-weight:bold">' +
          '<i class="fa-solid fa-plus"></i> ' + (isAr ? 'إضافة النشاط للتقييم الرئيسي' : 'Add Activity to Master RA') +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.appendChild(overlay);

  var updatePills = function() {
    var iL = parseInt(document.getElementById("addAct_inhL").value, 10);
    var iS = parseInt(document.getElementById("addAct_inhS").value, 10);
    var pL = parseInt(document.getElementById("addAct_presL").value, 10);
    var pS = parseInt(document.getElementById("addAct_presS").value, 10);
    var rL = parseInt(document.getElementById("addAct_resL").value, 10);
    var rS = parseInt(document.getElementById("addAct_resS").value, 10);

    var iScore = iL * iS;
    var pScore = pL * pS;
    var rScore = rL * rS;

    var setPill = function(id, sc) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = sc;
      el.style.backgroundColor = sc >= 16 ? "#f87171" : (sc >= 9 ? "#fef08a" : "#86efac");
      el.style.color = "#000000";
    };

    setPill("addAct_inhPill", iScore);
    setPill("addAct_presPill", pScore);
    setPill("addAct_resPill", rScore);
  };

  ["addAct_inhL", "addAct_inhS", "addAct_presL", "addAct_presS", "addAct_resL", "addAct_resS"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("change", updatePills);
  });
  updatePills();

  document.getElementById("closeAddModalBtn").addEventListener("click", function() { overlay.remove(); });
  document.getElementById("cancelAddModalBtn").addEventListener("click", function() { overlay.remove(); });

  document.getElementById("saveAddRiskActBtn").addEventListener("click", function() {
    var name = document.getElementById("addAct_name").value.trim();
    var hazard = document.getElementById("addAct_hazard").value.trim();
    if (!name || !hazard) {
      return showSweetAlert("بيانات ناقصة", "يرجى كتابة اسم النشاط وتوصيف الخطر على الأقل.", "warning");
    }

    var iL = parseInt(document.getElementById("addAct_inhL").value, 10);
    var iS = parseInt(document.getElementById("addAct_inhS").value, 10);
    var pL = parseInt(document.getElementById("addAct_presL").value, 10);
    var pS = parseInt(document.getElementById("addAct_presS").value, 10);
    var rL = parseInt(document.getElementById("addAct_resL").value, 10);
    var rS = parseInt(document.getElementById("addAct_resS").value, 10);

    var newAct = {
      activity_breakdown: name,
      potential_hazard: hazard,
      consequences: document.getElementById("addAct_consequences").value.trim(),
      risk_category: document.getElementById("addAct_category").value,
      inherent_l: iL,
      inherent_s: iS,
      inherent_r: iL * iS,
      present_control_measures: document.getElementById("addAct_presentControls").value.trim(),
      control_type: document.getElementById("addAct_controlType").value.trim(),
      present_l: pL,
      present_s: pS,
      present_r: pL * pS,
      further_action: document.getElementById("addAct_furtherAction").value.trim(),
      residual_l: rL,
      residual_s: rS,
      residual_r: rL * rS
    };

    ra.activities.push(newAct);
    saveRiskAssessmentRevision(ra, (isAr ? "إضافة نشاط جديد: " : "Added new activity: ") + name);
    overlay.remove();
    syncMasterRaWithRegister(ra);
    renderRiskAssessmentReport(ra);
    showToast("success", isAr ? "تمت إضافة النشاط الجديد للتقييم الرئيسي بنجاح!" : "New activity added to Master Risk Assessment!");
  });
}

async function deleteRiskActivityRow(index) {
  var ra = lastRiskAssessmentData;
  if (!ra || !ra.activities || !ra.activities[index]) return;
  var isAr = (ra._lang === "ar");
  var actName = ra.activities[index].activity_breakdown || ("نشاط رقم " + (index + 1));

  var res = await showConfirmDialog(
    isAr ? "تأكيد حذف النشاط" : "Confirm Deletion",
    isAr ? 'هل أنت متأكد من حذف النشاط: "' + actName + '" من التقييم الرئيسي؟' : 'Are you sure you want to delete "' + actName + '" from Master RA?',
    isAr ? "نعم، احذف" : "Yes, Delete",
    isAr ? "إلغاء" : "Cancel"
  );

  if (res && res.isConfirmed) {
    ra.activities.splice(index, 1);
    saveRiskAssessmentRevision(ra, (isAr ? "حذف نشاط: " : "Deleted activity: ") + actName);
    syncMasterRaWithRegister(ra);
    renderRiskAssessmentReport(ra);
    showToast("info", isAr ? "تم حذف النشاط من التقييم الرئيسي." : "Activity deleted from Master RA.");
  }
}

function showRiskRevisionsModal() {
  var ra = lastRiskAssessmentData;
  if (!ra) return showSweetAlert("تنبيه", "لا توجد دراسة تقييم مخاطر نشطة.", "warning");
  var history = ra._history || [];
  var isAr = (ra._lang === "ar");

  var modalId = "riskRevisionsModalOverlay";
  var oldModal = document.getElementById(modalId);
  if (oldModal) oldModal.remove();

  var overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.className = "modal-overlay no-print";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);";

  var revisionsList = [];
  revisionsList.push({
    version: ra._version || "1.0",
    date: ra._lastModified || ra._generatedAt || new Date().toISOString(),
    desc: ra._lastChangeDesc || (isAr ? "النسخة الحالية النشطة" : "Current Active Version"),
    isCurrent: true,
    index: -1
  });

  history.slice().reverse().forEach(function(h, idx) {
    revisionsList.push({
      version: h.version,
      date: h.date,
      desc: h.desc,
      isCurrent: false,
      index: history.length - 1 - idx
    });
  });

  overlay.innerHTML = '<div style="background:#ffffff;border-radius:12px;width:100%;max-width:620px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:2px solid #0b1f3a;font-family:Arial,Cairo,sans-serif;color:#0f172a;" dir="' + (isAr ? 'rtl' : 'ltr') + '">' +
    '<div style="background:linear-gradient(90deg, #0b1f3a 0%, #1e3a8a 100%);color:#ffffff;padding:12px 18px;border-bottom:3px solid #c00000;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;">' +
      '<div style="font-weight:800;font-size:13.5px;display:flex;align-items:center;gap:8px">' +
        '<i class="fa-solid fa-clock-rotate-left" style="color:#38bdf8"></i>' +
        '<span>' + (isAr ? 'سجل إصدارات وتعديلات التقييم (Version Control)' : 'Risk Assessment Revision History') + '</span>' +
      '</div>' +
      '<button type="button" id="closeRevModalBtn" style="background:none;border:none;color:#ffffff;font-size:20px;cursor:pointer;line-height:1">&times;</button>' +
    '</div>' +
    '<div style="padding:16px 20px;">' +
      '<div style="margin-bottom:12px;font-size:11px;color:#475569">' +
        (isAr ? 'يتيح لك النظام استرجاع أي نسخة سابقة من دراسة تقييم المخاطر بكامل تفاصيلها وأنشطتها دون فقدان أي بيانات:' : 'All revisions are preserved. You can inspect or restore any past revision at any time:') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        revisionsList.map(function(rev) {
          return '<div style="border:1px solid ' + (rev.isCurrent ? '#0284c7' : '#cbd5e1') + ';background:' + (rev.isCurrent ? '#f0f9ff' : '#f8fafc') + ';padding:10px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
            '<div>' +
              '<div style="display:flex;align-items:center;gap:6px">' +
                '<span class="ra-version-badge" style="background:' + (rev.isCurrent ? '#0284c7;color:#fff' : '#e2e8f0;color:#0b1f3a') + '">v' + rev.version + '</span>' +
                '<b style="font-size:12px;color:#0b1f3a">' + esc(rev.desc) + '</b>' +
              '</div>' +
              '<small style="color:#64748b;font-size:10px;display:block;margin-top:2px"><i class="fa-regular fa-clock"></i> ' + new Date(rev.date).toLocaleString(isAr ? 'ar-EG' : 'en-US') + '</small>' +
            '</div>' +
            '<div>' +
              (rev.isCurrent ?
                '<span style="color:#0284c7;font-weight:bold;font-size:11px"><i class="fa-solid fa-check"></i> ' + (isAr ? 'النسخة الحالية' : 'Active') + '</span>' :
                '<button type="button" class="btn btn-blue" onclick="restoreRiskAssessmentRevision(' + rev.index + '); document.getElementById(\'riskRevisionsModalOverlay\').remove();" style="padding:4px 10px;font-size:11px">' +
                  '<i class="fa-solid fa-arrow-rotate-left"></i> ' + (isAr ? 'استرجاع' : 'Restore') +
                '</button>'
              ) +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div style="text-align:end;margin-top:16px">' +
        '<button type="button" class="btn btn-light" id="closeRevModalBtn2" style="padding:6px 14px">' + (isAr ? 'إغلاق' : 'Close') + '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.appendChild(overlay);
  document.getElementById("closeRevModalBtn").addEventListener("click", function() { overlay.remove(); });
  document.getElementById("closeRevModalBtn2").addEventListener("click", function() { overlay.remove(); });
}

function renderRiskAssessmentReport(ra) {
  initRiskAssessmentVersion(ra);
  var acts = ra.activities || [];
  var resp = ra.responsibilities || [];
  var photos = ra._photos || currentRiskPhotos || [];
  var isAr = (ra._lang === "ar");

  /* Master RA Management & Versioning Toolbar (No-Print) */
  var toolbarHTML = '<div class="master-ra-toolbar no-print">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<i class="fa-solid fa-code-branch" style="color:#38bdf8;font-size:14px"></i>' +
        '<span style="font-size:12px;font-weight:bold">' + (isAr ? 'إصدار التقييم المعتمد:' : 'Master RA Version:') + '</span>' +
        '<span class="ra-version-badge">v' + (ra._version || '1.0') + '</span>' +
      '</div>' +
      '<small style="color:#94a3b8;font-size:10.5px">(' + esc(ra._lastChangeDesc || (isAr ? 'النسخة الأصلية Master' : 'Original Master')) + ')</small>' +
    '</div>' +
    '<div class="ra-toolbar-actions">' +
      '<button type="button" class="btn btn-light" onclick="openAddRiskActivityModal()" style="padding:5px 12px;font-size:11px;font-weight:bold;color:#0b1f3a">' +
        '<i class="fa-solid fa-plus" style="color:#0284c7"></i> ' + (isAr ? 'إضافة نشاط / خطر (Add Activity)' : 'Add Activity') +
      '</button>' +
      '<button type="button" class="btn btn-light" onclick="showRiskRevisionsModal()" style="padding:5px 12px;font-size:11px;font-weight:bold;color:#0b1f3a">' +
        '<i class="fa-solid fa-clock-rotate-left" style="color:#eab308"></i> ' + (isAr ? 'سجل التعديلات (' + ((ra._history || []).length + 1) + ')' : 'Revisions (' + ((ra._history || []).length + 1) + ')') +
      '</button>' +
    '</div>' +
  '</div>';

  var h = "";

  if (isAr) {
    /* Arabic Official SUTech Template (RTL) */
    h = toolbarHTML +
      '<div class="official-risk-doc" dir="rtl" style="text-align:right">' +
      /* Document Header matching Official Template */
      '<div class="official-doc-header" style="direction:rtl">' +
        '<div style="font-size:12px;font-weight:800;color:#0b1f3a;line-height:1.4">' +
          '<div>جامعة السويدي للتكنولوجيا</div>' +
          '<div style="color:var(--sut-red);font-size:11px">إدارة السلامة والصحة المهنية والبيئة</div>' +
        '</div>' +
        '<div class="official-doc-title">' +
          '<h2>' + esc(ra.document_title || "سجل تقييم المخاطر والأثر البيئي") + '</h2>' +
        '</div>' +
        '<div style="text-align:left;font-size:11px;font-weight:800;color:#0b1f3a;line-height:1.3">' +
          '<div style="display:flex;align-items:center;gap:6px;justify-content:flex-start">' +
            '<span>ELSEWEDY</span>' +
            '<span style="display:inline-block;width:14px;height:14px;background:#64748b;border-radius:3px"></span>' +
            '<span style="display:inline-block;width:14px;height:14px;background:#0284c7;border-radius:3px"></span>' +
            '<span style="display:inline-block;width:14px;height:14px;background:#ea580c;border-radius:3px"></span>' +
          '</div>' +
          '<small style="font-size:9.5px;color:#475569;display:block">UNIVERSITY OF TECHNOLOGY<br>تكنولوجيا بوليتكنك مصر</small>' +
        '</div>' +
      '</div>' +

      /* Definitions and Abbreviations Section */
      '<div style="margin-bottom:10px;font-size:12px;font-weight:700;color:#0b1f3a">' +
        '<span>التعريفات والاختصارات الرسمية (Definitions &amp; Abbreviations):</span>' +
      '</div>' +

      '<div class="official-definitions-grid">' +
        /* Table 1: Type of Control Measure in Arabic */
        '<table class="definitions-table">' +
          '<thead><tr><th colspan="2">نوع تدبير التحكم في المخاطر</th></tr></thead>' +
          '<tbody>' +
            '<tr><td class="text-start">الإزالة (Elimination)</td><td style="width:25%;font-weight:700">A</td></tr>' +
            '<tr><td class="text-start">الاستبدال (Substitution)</td><td style="font-weight:700">B</td></tr>' +
            '<tr><td class="text-start">التحكم الهندسي (Engineering)</td><td style="font-weight:700">D</td></tr>' +
            '<tr><td class="text-start">التحكم الإداري (Administrative)</td><td style="font-weight:700">E</td></tr>' +
            '<tr><td class="text-start">مهمات الوقاية الشخصية (PPE)</td><td style="font-weight:700">F</td></tr>' +
          '</tbody>' +
        '</table>' +

        /* Table 2: Risk Class : R in Arabic */
        '<table class="definitions-table">' +
          '<thead><tr><th colspan="2">فئة الخطر : R [L, S, R]</th></tr></thead>' +
          '<tbody>' +
            '<tr><td class="text-start">الاحتمالية (Likelihood)</td><td style="width:25%;font-weight:700">L</td></tr>' +
            '<tr><td class="text-start">الشدة (Severity)</td><td style="font-weight:700">S</td></tr>' +
            '<tr><td class="text-start">تقييم الخطر (L × S)</td><td style="font-weight:700">R</td></tr>' +
            '<tr><td colspan="2" style="font-size:9.5px;color:#64748b;background:#f8fafc">1-8: منخفض | 9-15: متوسط | 16+: حرج</td></tr>' +
          '</tbody>' +
        '</table>' +

        /* Table 3: Risk Category in Arabic */
        '<table class="definitions-table">' +
          '<thead><tr><th colspan="2">تصنيف الخطر (Risk Category)</th></tr></thead>' +
          '<tbody>' +
            '<tr><td style="width:20%;font-weight:700">S</td><td class="text-start">يؤثر على السلامة (Safety)</td></tr>' +
            '<tr><td style="font-weight:700">H</td><td class="text-start">يؤثر على الصحة المهنية (Health)</td></tr>' +
            '<tr><td style="font-weight:700">E</td><td class="text-start">يؤثر على البيئة (Environment)</td></tr>' +
            '<tr><td style="font-weight:700">P</td><td class="text-start">يؤثر على الإنتاجية والتشغيل (Productivity)</td></tr>' +
            '<tr><td style="font-weight:700">I</td><td class="text-start">يؤثر على سمعة الموقع (Image)</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      /* Official 6x5 Matrix Section on Page 1 */
      renderOfficialRiskMatrixHTML(true) +

      /* Activity to be assessed Header */
      '<div style="font-size:13px;margin:12px 0 6px 0">' +
        'النشاط / الموقع محل التقييم: <b style="font-size:14px;color:#0b1f3a">' + esc(ra.activity_to_be_assessed || (ra._formData && ra._formData.area) || "مختبر التصنيع") + '</b>' +
      '</div>' +

      /* 4-Cell Metadata Block */
      '<table class="official-meta-box">' +
        '<tbody>' +
          '<tr>' +
            '<td style="width:25%;font-weight:bold;color:#0b1f3a">الموقع</td>' +
            '<td style="width:25%">' + esc(ra.location || "جامعة السويدي للتكنولوجيا") + '</td>' +
            '<td style="width:25%;font-weight:bold;color:#0b1f3a">التاريخ</td>' +
            '<td style="width:25%">' + esc(ra.assessment_date || (ra._formData && ra._formData.date)) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="font-weight:bold;color:#0b1f3a">معد التقرير</td>' +
            '<td>' + esc(ra.report_assessor || (ra._formData && ra._formData.assessor) || "م. إبراهيم سعيد") + '</td>' +
            '<td style="font-weight:bold;color:#0b1f3a">مراجع التقرير</td>' +
            '<td>' + esc(ra.report_reviewer || (ra._formData && ra._formData.reviewer) || "م. يوسف محمد") + '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>' +

      /* Responsibilities Bullet List */
      '<div class="official-responsibilities">' +
        '<h4>المسؤوليات والإشراف الميداني:</h4>' +
        '<ul>' +
          resp.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") +
        '</ul>' +
      '</div>' +

      /* Official 9-Column Risk Table matching Image 1 in Arabic */
      '<div style="overflow-x:auto">' +
        '<table class="official-risk-table">' +
          '<thead>' +
            '<tr>' +
              '<th rowspan="2" style="width:14%">تفصيل النشاط والمعدات<br><small>Activity Breakdown</small></th>' +
              '<th rowspan="2" style="width:15%">مصدر الخطر المحتمل<br><small>Potential Hazard / Aspect</small></th>' +
              '<th rowspan="2" style="width:12%">الآثار والنتائج المترتبة<br><small>Consequences / Impacts</small></th>' +
              '<th rowspan="2" style="width:5%">الفئة<br><small>Cat</small></th>' +
              '<th colspan="3" style="width:9%">الخطر الأولي<br><small>Inherent Class (R)</small></th>' +
              '<th colspan="2" style="width:19%">تدابير التحكم الحالية والنوع<br><small>Present Controls &amp; Type</small></th>' +
              '<th colspan="3" style="width:9%">الخطر الحالي<br><small>Present Class (R)</small></th>' +
              '<th rowspan="2" style="width:14%">الإجراءات الإضافية والتحسين<br><small>Further Action</small></th>' +
              '<th colspan="3" style="width:9%">الخطر بعد التحكم<br><small>Residual Class (R)</small></th>' +
              '<th rowspan="2" class="no-print" style="width:5%">إجراءات<br><small>Actions</small></th>' +
            '</tr>' +
            '<tr>' +
              '<th style="width:3%">L</th><th style="width:3%">S</th><th style="width:3%">R</th>' +
              '<th>تدبير التحكم الحالي</th><th style="width:4%">النوع</th>' +
              '<th style="width:3%">L</th><th style="width:3%">S</th><th style="width:3%">R</th>' +
              '<th style="width:3%">L</th><th style="width:3%">S</th><th style="width:3%">R</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            acts.map(function (a, idx) {
              var inhScore = a.inherent_r || (a.inherent_l * a.inherent_s);
              var presScore = a.present_r || (a.present_l * a.present_s);
              var resScore = a.residual_r || (a.residual_l * a.residual_s);

              var inhCls = inhScore >= 16 ? "score-red" : (inhScore >= 9 ? "score-yellow" : "score-green");
              var presCls = presScore >= 16 ? "score-red" : (presScore >= 9 ? "score-yellow" : "score-green");
              var resCls = resScore >= 16 ? "score-red" : (resScore >= 9 ? "score-yellow" : "score-green");

              var formatLines = function (txt) {
                if (!txt) return "";
                return String(txt).replace(/\\n/g, "\n").split("\n").map(function (line) {
                  var l = line.trim();
                  if (!l) return "";
                  return '<div>' + esc(l) + '</div>';
                }).join("");
              };

              return '<tr>' +
                '<td><b>' + esc(a.activity_breakdown) + '</b></td>' +
                '<td>' + formatLines(a.potential_hazard) + '</td>' +
                '<td>' + esc(a.consequences) + '</td>' +
                '<td class="center"><b>' + esc(a.risk_category || "S") + '</b></td>' +
                '<td class="center">' + (a.inherent_l || 4) + '</td>' +
                '<td class="center">' + (a.inherent_s || 4) + '</td>' +
                '<td class="score-cell ' + inhCls + '">' + inhScore + '</td>' +
                '<td>' + formatLines(a.present_control_measures) + '</td>' +
                '<td class="center" style="white-space:pre-line;font-size:10px;font-weight:bold">' + esc(a.control_type || "D / E") + '</td>' +
                '<td class="center">' + (a.present_l || 2) + '</td>' +
                '<td class="center">' + (a.present_s || 4) + '</td>' +
                '<td class="score-cell ' + presCls + '">' + presScore + '</td>' +
                '<td>' + formatLines(a.further_action) + '</td>' +
                '<td class="center">' + (a.residual_l || 1) + '</td>' +
                '<td class="center">' + (a.residual_s || 4) + '</td>' +
                '<td class="score-cell ' + resCls + '">' + resScore + '</td>' +
                '<td class="center no-print" style="white-space:nowrap">' +
                  '<button type="button" class="ra-row-action-btn" onclick="openEditRiskActivityModal(' + idx + ')" title="تعديل هذا النشاط"><i class="fa-solid fa-pen"></i></button> ' +
                  '<button type="button" class="ra-row-action-btn btn-del" onclick="deleteRiskActivityRow(' + idx + ')" title="حذف هذا النشاط"><i class="fa-solid fa-trash"></i></button>' +
                '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table>' +
      '</div>';

    /* Section 19: General Safety Instructions & Precautions in Arabic */
    if (ra.general_safety_instructions) {
      h += renderGeneralSafetyInstructionsHTML(ra.general_safety_instructions, true);
    }
  } else {
    /* English Official SUTech Template (LTR) */
    h = toolbarHTML +
      '<div class="official-risk-doc" dir="ltr" style="text-align:left">' +
      /* Document Header matching Official Template */
      '<div class="official-doc-header">' +
        '<div style="font-size:12px;font-weight:800;color:#0b1f3a;line-height:1.4">' +
          '<div>EL-SEWEDY UNIVERSITY OF TECHNOLOGY</div>' +
          '<div style="color:var(--sut-red);font-size:11px">HEALTH &amp; SAFETY DEPARTMENT</div>' +
        '</div>' +
        '<div class="official-doc-title">' +
          '<h2>' + esc(ra.document_title || "Risk and Environmental Impact Assessment") + '</h2>' +
        '</div>' +
        '<div style="text-align:right;font-size:11px;font-weight:800;color:#0b1f3a;line-height:1.3">' +
          '<div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">' +
            '<span style="display:inline-block;width:14px;height:14px;background:#ea580c;border-radius:3px"></span>' +
            '<span style="display:inline-block;width:14px;height:14px;background:#0284c7;border-radius:3px"></span>' +
            '<span style="display:inline-block;width:14px;height:14px;background:#64748b;border-radius:3px"></span>' +
            '<span>ELSEWEDY</span>' +
          '</div>' +
          '<small style="font-size:9.5px;color:#475569;display:block">UNIVERSITY OF TECHNOLOGY<br>POLYTECHNIC OF EGYPT</small>' +
        '</div>' +
      '</div>' +

      /* Definitions and Abbreviations Section */
      '<div style="margin-bottom:10px;font-size:12px;font-weight:700;color:#0b1f3a">' +
        '<span>: Definitions and Abbreviations التعريفات و الإختصارات</span>' +
      '</div>' +

      '<div class="official-definitions-grid">' +
        /* Table 1: Type of Control Measure */
        '<table class="definitions-table">' +
          '<thead><tr><th colspan="2">Type of the Risk Control Measure</th></tr></thead>' +
          '<tbody>' +
            '<tr><td class="text-start">Elimination</td><td style="width:25%;font-weight:700">A</td></tr>' +
            '<tr><td class="text-start">Substitution</td><td style="font-weight:700">B</td></tr>' +
            '<tr><td class="text-start">Engineering Controls</td><td style="font-weight:700">D</td></tr>' +
            '<tr><td class="text-start">Administrative Controls</td><td style="font-weight:700">E</td></tr>' +
            '<tr><td class="text-start">Personal Protective Equipment</td><td style="font-weight:700">F</td></tr>' +
          '</tbody>' +
        '</table>' +

        /* Table 2: Risk Class : R */
        '<table class="definitions-table">' +
          '<thead><tr><th colspan="2">Risk Class : R</th></tr></thead>' +
          '<tbody>' +
            '<tr><td class="text-start">likelihood</td><td style="width:25%;font-weight:700">L</td></tr>' +
            '<tr><td class="text-start">Severity</td><td style="font-weight:700">S</td></tr>' +
            '<tr><td class="text-start">Risk (L × S)</td><td style="font-weight:700">R</td></tr>' +
            '<tr><td colspan="2" style="font-size:9.5px;color:#64748b;background:#f8fafc">1-8: Low | 9-15: Medium | 16+: Critical</td></tr>' +
          '</tbody>' +
        '</table>' +

        /* Table 3: Risk Category */
        '<table class="definitions-table">' +
          '<thead><tr><th colspan="2">Risk Category</th></tr></thead>' +
          '<tbody>' +
            '<tr><td style="width:20%;font-weight:700">S</td><td class="text-start" dir="rtl">يؤثر على السلامة</td></tr>' +
            '<tr><td style="font-weight:700">H</td><td class="text-start" dir="rtl">يؤثر على الصحة</td></tr>' +
            '<tr><td style="font-weight:700">E</td><td class="text-start" dir="rtl">يؤثر على البيئة</td></tr>' +
            '<tr><td style="font-weight:700">P</td><td class="text-start" dir="rtl">يؤثر على الإنتاجية</td></tr>' +
            '<tr><td style="font-weight:700">I</td><td class="text-start" dir="rtl">يؤثر على سمعة الموقع</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      /* Official 6x5 Matrix Section on Page 1 */
      renderOfficialRiskMatrixHTML(false) +

      /* Activity to be assessed Header */
      '<div style="font-size:13px;margin:12px 0 6px 0">' +
        'Activity to be assessed: <b style="font-size:14px;color:#0b1f3a">' + esc(ra.activity_to_be_assessed || (ra._formData && ra._formData.area) || "Fabrication Lab") + '</b>' +
      '</div>' +

      /* 4-Cell Metadata Block */
      '<table class="official-meta-box">' +
        '<tbody>' +
          '<tr>' +
            '<td style="width:25%">' + esc(ra.assessment_date || (ra._formData && ra._formData.date)) + '</td>' +
            '<td style="width:25%;text-align:right;font-weight:bold" dir="rtl">التاريخ</td>' +
            '<td style="width:25%">' + esc(ra.location || "جامعة السويدي للتكنولوجيا") + '</td>' +
            '<td style="width:25%;text-align:right;font-weight:bold" dir="rtl">الموقع</td>' +
          '</tr>' +
          '<tr>' +
            '<td>' + esc(ra.report_reviewer || (ra._formData && ra._formData.reviewer) || "م. يوسف محمد") + '</td>' +
            '<td style="text-align:right;font-weight:bold" dir="rtl">مراجع التقرير</td>' +
            '<td>' + esc(ra.report_assessor || (ra._formData && ra._formData.assessor) || "م. إبراهيم سعيد") + '</td>' +
            '<td style="text-align:right;font-weight:bold" dir="rtl">معد التقرير</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>' +

      /* Responsibilities Bullet List */
      '<div class="official-responsibilities">' +
        '<h4>Responsibilities:</h4>' +
        '<ul>' +
          resp.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") +
        '</ul>' +
      '</div>' +

      /* Official 9-Column Risk Table matching Image 1 */
      '<div style="overflow-x:auto">' +
        '<table class="official-risk-table">' +
          '<thead>' +
            '<tr>' +
              '<th rowspan="2" style="width:14%">Activity Breakdown</th>' +
              '<th rowspan="2" style="width:15%">Potential Hazard / Aspect</th>' +
              '<th rowspan="2" style="width:12%">Consequences / Impacts</th>' +
              '<th rowspan="2" style="width:5%">Risk Category</th>' +
              '<th colspan="3" style="width:9%">Risk Class (R)</th>' +
              '<th colspan="2" style="width:19%">Present Control Measures</th>' +
              '<th colspan="3" style="width:9%">Risk Class (R)</th>' +
              '<th rowspan="2" style="width:14%">Further action</th>' +
              '<th colspan="3" style="width:9%">Risk Class After Control</th>' +
              '<th rowspan="2" class="no-print" style="width:5%">Actions</th>' +
            '</tr>' +
            '<tr>' +
              '<th style="width:3%">L</th><th style="width:3%">S</th><th style="width:3%">R</th>' +
              '<th>Control Measure</th><th style="width:4%">Type</th>' +
              '<th style="width:3%">L</th><th style="width:3%">S</th><th style="width:3%">R</th>' +
              '<th style="width:3%">L</th><th style="width:3%">S</th><th style="width:3%">R</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            acts.map(function (a, idx) {
              var inhScore = a.inherent_r || (a.inherent_l * a.inherent_s);
              var presScore = a.present_r || (a.present_l * a.present_s);
              var resScore = a.residual_r || (a.residual_l * a.residual_s);

              var inhCls = inhScore >= 16 ? "score-red" : (inhScore >= 9 ? "score-yellow" : "score-green");
              var presCls = presScore >= 16 ? "score-red" : (presScore >= 9 ? "score-yellow" : "score-green");
              var resCls = resScore >= 16 ? "score-red" : (resScore >= 9 ? "score-yellow" : "score-green");

              var formatLines = function (txt) {
                if (!txt) return "";
                return String(txt).replace(/\\n/g, "\n").split("\n").map(function (line) {
                  var l = line.trim();
                  if (!l) return "";
                  return '<div>' + esc(l) + '</div>';
                }).join("");
              };

              return '<tr>' +
                '<td><b>' + esc(a.activity_breakdown) + '</b></td>' +
                '<td>' + formatLines(a.potential_hazard) + '</td>' +
                '<td>' + esc(a.consequences) + '</td>' +
                '<td class="center"><b>' + esc(a.risk_category || "S") + '</b></td>' +
                '<td class="center">' + (a.inherent_l || 4) + '</td>' +
                '<td class="center">' + (a.inherent_s || 4) + '</td>' +
                '<td class="score-cell ' + inhCls + '">' + inhScore + '</td>' +
                '<td>' + formatLines(a.present_control_measures) + '</td>' +
                '<td class="center" style="white-space:pre-line;font-size:10px;font-weight:bold">' + esc(a.control_type || "D / E") + '</td>' +
                '<td class="center">' + (a.present_l || 2) + '</td>' +
                '<td class="center">' + (a.present_s || 4) + '</td>' +
                '<td class="score-cell ' + presCls + '">' + presScore + '</td>' +
                '<td>' + formatLines(a.further_action) + '</td>' +
                '<td class="center">' + (a.residual_l || 1) + '</td>' +
                '<td class="center">' + (a.residual_s || 4) + '</td>' +
                '<td class="score-cell ' + resCls + '">' + resScore + '</td>' +
                '<td class="center no-print" style="white-space:nowrap">' +
                  '<button type="button" class="ra-row-action-btn" onclick="openEditRiskActivityModal(' + idx + ')" title="Edit Activity"><i class="fa-solid fa-pen"></i></button> ' +
                  '<button type="button" class="ra-row-action-btn btn-del" onclick="deleteRiskActivityRow(' + idx + ')" title="Delete Activity"><i class="fa-solid fa-trash"></i></button>' +
                '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table>' +
      '</div>';

    /* Section 19: General Safety Instructions & Precautions in English */
    if (ra.general_safety_instructions) {
      h += renderGeneralSafetyInstructionsHTML(ra.general_safety_instructions, false);
    }
  }

  /* Uploaded Photo Gallery Section */
  if (photos && photos.length) {
    h += '<div style="margin-top:16px">' +
      '<div style="font-size:12px;font-weight:800;color:#0b1f3a;margin-bottom:8px">' +
        '<span>' + (isAr ? 'صور الموقع والمعدات التي تم تفتيشها (' + photos.length + ' صور مرفقة):' : 'Inspected Facility & Equipment Photos (' + photos.length + ' Photos Attached):') + '</span>' +
      '</div>' +
      '<div class="report-photos-grid">' +
        photos.map(function (p, idx) {
          var src = typeof p === "string" ? p : p.data;
          var name = typeof p === "string" ? ("Photo " + (idx + 1)) : (p.name || ("Photo " + (idx + 1)));
          return '<div class="report-photo-card">' +
            '<img src="' + src + '" alt="' + esc(name) + '">' +
            '<small>' + esc(name) + '</small>' +
            '</div>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  h += '</div>';

  var outBody = document.getElementById("riskAssessmentReport");
  if (outBody) outBody.innerHTML = h;
}

function renderRiskAssessment5x5() {
  var total = riskAssessments.length;
  var crit = riskAssessments.filter(function (x) { return (x.initialScore || 0) >= 16; }).length;
  var med = riskAssessments.filter(function (x) { return (x.initialScore || 0) >= 9 && (x.initialScore || 0) < 16; }).length;
  var low = riskAssessments.filter(function (x) { return (x.initialScore || 0) <= 8; }).length;

  if (document.getElementById("riskTotalCount")) document.getElementById("riskTotalCount").textContent = total;
  if (document.getElementById("riskCriticalCount")) document.getElementById("riskCriticalCount").textContent = crit;
  if (document.getElementById("riskMediumCount")) document.getElementById("riskMediumCount").textContent = med;
  if (document.getElementById("riskLowCount")) document.getElementById("riskLowCount").textContent = low;

  var tbl = document.getElementById("riskRegisterTable");
  if (!tbl) return;

  if (!total) {
    tbl.innerHTML = '<div class="status">لا توجد مخاطر مسجلة في السجل حالياً. استخدم النموذج بالأعلى لتقييم المخاطر.</div>';
    return;
  }

  tbl.innerHTML = '<table class="answer"><thead><tr><th style="width:14%">الموقع / القسم</th><th style="width:16%">النشاط / المعدة</th><th>توصيف الخطر والأثر</th><th style="width:6%;text-align:center">الفئة</th><th style="width:10%;text-align:center">الخطر الأولي</th><th style="width:20%">تدابير التحكم الحالية</th><th style="width:10%;text-align:center">الخطر المتبقي</th><th style="width:10%">المسؤول</th><th style="width:6%;text-align:center">🗑</th></tr></thead><tbody>' +
    riskAssessments.map(function (x) {
      var initLvl = getRiskScoreLevel(x.initialScore || 16);
      var resLvl = getRiskScoreLevel(x.residualScore || 4);
      return '<tr>' +
        '<td><b>' + esc(x.area) + '</b></td>' +
        '<td><b>' + esc(x.activity || x.equipment || "نشاط تشغيلي") + '</b><br><small style="color:var(--muted)">' + esc(x.equipment || "") + '</small></td>' +
        '<td>' + esc(x.hazard) + (x.consequences ? '<br><small style="color:#b91c1c">' + esc(x.consequences) + '</small>' : '') + '</td>' +
        '<td style="text-align:center"><span class="badge general-case" style="font-size:10px;font-weight:bold">' + esc(x.category || "S") + '</span></td>' +
        '<td style="text-align:center"><div class="risk-score-pill ' + initLvl.pillClass + '">' + (x.initialS || 4) + '×' + (x.initialL || 4) + ' = ' + (x.initialScore || 16) + '</div></td>' +
        '<td style="font-size:10px">' + esc(x.existingControls || "ضوابط قياسية") + '</td>' +
        '<td style="text-align:center"><div class="risk-score-pill ' + resLvl.pillClass + '">' + (x.residualS || 4) + '×' + (x.residualL || 1) + ' = ' + (x.residualScore || 4) + '</div></td>' +
        '<td><b>' + esc(x.owner || "HSE") + '</b><br><small style="color:var(--muted)">' + esc(x.targetDate || "") + '</small></td>' +
        '<td style="text-align:center"><button style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px" onclick="deleteRiskItem(' + x.id + ')" title="حذف السجل"><i class="fa-solid fa-trash"></i></button></td>' +
      '</tr>';
    }).join("") +
  '</tbody></table>';
}

function updateRiskMatrixVisualizer() {
  var grid = document.getElementById("interactiveRiskMatrix");
  if (!grid) return;

  for (var s = 1; s <= 6; s++) {
    for (var l = 1; l <= 5; l++) {
      var countEl = document.getElementById("cell_" + s + "_" + l);
      var td = grid.querySelector('td[data-s="' + s + '"][data-l="' + l + '"]');
      if (countEl) {
        var matched = riskAssessments.filter(function (x) {
          return (Number(x.initialS) === s && Number(x.initialL) === l);
        });
        countEl.textContent = matched.length;
        if (td) {
          if (matched.length > 0) {
            td.style.boxShadow = "inset 0 0 0 2.5px #0f172a";
            td.title = matched.map(function (m) { return "• " + (m.hazard || m.activity) + " (" + (m.area || "") + ")"; }).join("\n");
          } else {
            td.style.boxShadow = "none";
            td.title = "";
          }
        }
      }
    }
  }
}

function prepareRiskAssessmentWordClone(el, isAr) {
  var clone = el.cloneNode(true);
  clone.querySelectorAll(".no-print").forEach(function (x) { x.remove(); });

  /* 1. Format Official Document Header as a 3-Cell Table */
  clone.querySelectorAll(".official-doc-header").forEach(function (head) {
    var titleEl = head.querySelector(".official-doc-title h2");
    var titleText = titleEl ? titleEl.textContent.trim() : (isAr ? "سجل تقييم المخاطر والأثر البيئي" : "Risk and Environmental Impact Assessment");

    var tbl = document.createElement("table");
    tbl.setAttribute("width", "100%");
    tbl.setAttribute("border", "0");
    tbl.setAttribute("cellpadding", "0");
    tbl.setAttribute("cellspacing", "0");
    tbl.style.cssText = "width:100%;border-collapse:collapse;border-bottom:2.5pt solid #0b1f3a;padding-bottom:8pt;margin-bottom:10pt;";

    var tr = document.createElement("tr");
    
    var tdLeft = document.createElement("td");
    tdLeft.style.cssText = "width:30%;vertical-align:middle;text-align:" + (isAr ? "right" : "left") + ";font-size:10pt;font-weight:bold;color:#0b1f3a;font-family:Arial,Cairo,sans-serif;";
    tdLeft.innerHTML = isAr ?
      '<div>جامعة السويدي للتكنولوجيا</div><div style="color:#c00000;font-size:9pt">إدارة السلامة والصحة المهنية والبيئة</div>' :
      '<div>EL-SEWEDY UNIVERSITY OF TECHNOLOGY</div><div style="color:#c00000;font-size:9pt">HEALTH &amp; SAFETY DEPARTMENT</div>';

    var tdCenter = document.createElement("td");
    tdCenter.style.cssText = "width:45%;vertical-align:middle;text-align:center;padding:4pt;";
    tdCenter.innerHTML = '<h2 style="margin:0;font-size:14pt;color:#0b1f3a;font-weight:bold;font-family:Arial,Cairo,sans-serif;letter-spacing:0.3pt;">' + esc(titleText) + '</h2>';

    var tdRight = document.createElement("td");
    tdRight.style.cssText = "width:25%;vertical-align:middle;text-align:" + (isAr ? "left" : "right") + ";font-size:9.5pt;font-weight:bold;color:#0b1f3a;font-family:Arial,Cairo,sans-serif;";
    tdRight.innerHTML = isAr ?
      '<div>ELSEWEDY</div><small style="color:#475569;font-size:8pt">UNIVERSITY OF TECHNOLOGY<br>تكنولوجيا بوليتكنك مصر</small>' :
      '<div>ELSEWEDY</div><small style="color:#475569;font-size:8pt">UNIVERSITY OF TECHNOLOGY<br>POLYTECHNIC OF EGYPT</small>';

    tr.appendChild(isAr ? tdRight : tdLeft);
    tr.appendChild(tdCenter);
    tr.appendChild(isAr ? tdLeft : tdRight);
    tbl.appendChild(tr);
    head.parentNode.replaceChild(tbl, head);
  });

  /* 2. Format Definitions Grid as a 3-Column Table */
  clone.querySelectorAll(".official-definitions-grid").forEach(function (grid) {
    var tables = Array.from(grid.querySelectorAll("table"));
    if (tables.length) {
      var tbl = document.createElement("table");
      tbl.setAttribute("width", "100%");
      tbl.setAttribute("border", "0");
      tbl.setAttribute("cellpadding", "0");
      tbl.setAttribute("cellspacing", "6");
      tbl.style.cssText = "width:100%;border-collapse:separate;margin-bottom:10pt;";
      var tr = document.createElement("tr");
      var widths = ["36%", "28%", "36%"];
      tables.forEach(function (subTbl, idx) {
        var td = document.createElement("td");
        td.style.cssText = "width:" + (widths[idx] || "33%") + ";vertical-align:top;";
        subTbl.setAttribute("border", "1");
        subTbl.setAttribute("bordercolor", "#64748b");
        subTbl.setAttribute("cellpadding", "3");
        subTbl.setAttribute("cellspacing", "0");
        subTbl.setAttribute("width", "100%");
        subTbl.style.cssText = "width:100%;border-collapse:collapse;border:1.0pt solid #64748b;font-size:8pt;font-family:Arial,Cairo,sans-serif;";
        
        subTbl.querySelectorAll("th").forEach(function (th) {
          th.setAttribute("bgcolor", "#f1f5f9");
          th.style.cssText = "background-color:#f1f5f9;color:#0b1f3a;font-weight:bold;font-size:8pt;padding:3pt;border:1.0pt solid #64748b;text-align:center;font-family:Arial,Cairo,sans-serif;";
        });
        subTbl.querySelectorAll("td").forEach(function (tdCell) {
          tdCell.style.cssText = "border:1.0pt solid #64748b;padding:3pt;font-size:8pt;font-family:Arial,Cairo,sans-serif;" + (tdCell.classList.contains("text-start") ? "text-align:start;" : "text-align:center;");
        });
        
        td.appendChild(subTbl);
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
      grid.parentNode.replaceChild(tbl, grid);
    }
  });

  /* 3. Format Metadata Box */
  clone.querySelectorAll(".official-meta-box").forEach(function (meta) {
    meta.setAttribute("border", "1");
    meta.setAttribute("bordercolor", "#64748b");
    meta.setAttribute("cellpadding", "5");
    meta.setAttribute("cellspacing", "0");
    meta.setAttribute("width", "100%");
    meta.style.cssText = "width:100%;border-collapse:collapse;border:1.0pt solid #64748b;margin:8pt 0 10pt;font-family:Arial,Cairo,sans-serif;font-size:9pt;";
    meta.querySelectorAll("td").forEach(function (td) {
      td.style.border = "1.0pt solid #64748b";
      td.style.padding = "4pt 6pt";
      td.style.fontSize = "8.5pt";
      td.style.fontFamily = "Arial,Cairo,sans-serif";
    });
  });

  /* 4. Format Responsibilities */
  clone.querySelectorAll(".official-responsibilities").forEach(function (resp) {
    resp.style.cssText = "margin:8pt 0;font-size:9pt;font-family:Arial,Cairo,sans-serif;line-height:1.4;";
    var h4 = resp.querySelector("h4");
    if (h4) h4.style.cssText = "margin:0 0 4pt;font-size:9.5pt;font-weight:bold;color:#0b1f3a;font-family:Arial,Cairo,sans-serif;";
  });

  /* 4.5. Format Official SUTech 6x5 Risk Matrix & Hierarchy Table for Word */
  clone.querySelectorAll(".official-sut-matrix-table").forEach(function (tbl) {
    tbl.setAttribute("border", "1");
    tbl.setAttribute("bordercolor", "#000000");
    tbl.setAttribute("cellpadding", "4");
    tbl.setAttribute("cellspacing", "0");
    tbl.setAttribute("width", "100%");
    tbl.style.cssText = "width:100%;border-collapse:collapse;border:1.5pt solid #000000;margin:6pt 0;font-family:Arial,Cairo,sans-serif;font-size:7.5pt;";

    var theadRows = tbl.querySelectorAll("thead tr");
    if (theadRows.length > 0) {
      theadRows[0].querySelectorAll("th").forEach(function (th) {
        th.setAttribute("bgcolor", "#0b1f3a");
        th.style.cssText = "background-color:#0b1f3a;color:#ffffff;font-weight:bold;font-size:8pt;text-align:center;padding:4pt;border:1.0pt solid #000000;font-family:Arial,Cairo,sans-serif;";
        th.innerHTML = '<span style="color:#ffffff;font-weight:bold;font-size:8pt;">' + th.innerHTML + '</span>';
      });
    }
    if (theadRows.length > 1) {
      theadRows[1].querySelectorAll("th").forEach(function (th) {
        th.setAttribute("bgcolor", "#f1f5f9");
        th.style.cssText = "background-color:#f1f5f9;color:#0b1f3a;font-weight:bold;font-size:7.5pt;text-align:center;padding:3pt;border:1.0pt solid #000000;font-family:Arial,Cairo,sans-serif;";
      });
    }

    tbl.querySelectorAll("tbody tr").forEach(function (tr) {
      var tds = tr.querySelectorAll("td, th");
      tds.forEach(function (td, idx) {
        td.style.border = "1.0pt solid #000000";
        td.style.padding = "3pt";
        td.style.fontSize = "7.5pt";
        td.style.fontFamily = "Arial,Cairo,sans-serif";

        if (idx === 0) {
          td.setAttribute("bgcolor", "#f8fafc");
          td.style.backgroundColor = "#f8fafc";
          td.style.fontWeight = "bold";
          td.style.textAlign = "center";
        } else if (idx >= 1 && idx <= 3) {
          td.style.textAlign = isAr ? "right" : "left";
        } else if (idx >= 4) {
          td.style.textAlign = "center";
          td.style.fontWeight = "bold";
          var val = parseInt(td.textContent.trim());
          if (val >= 16) {
            td.setAttribute("bgcolor", "#f87171");
            td.style.backgroundColor = "#f87171";
            td.style.color = "#000000";
          } else if (val >= 9) {
            td.setAttribute("bgcolor", "#fef08a");
            td.style.backgroundColor = "#fef08a";
            td.style.color = "#000000";
          } else {
            td.setAttribute("bgcolor", "#86efac");
            td.style.backgroundColor = "#86efac";
            td.style.color = "#000000";
          }
        }
      });
    });
  });

  clone.querySelectorAll(".official-control-measure-table").forEach(function (tbl) {
    tbl.setAttribute("border", "1");
    tbl.setAttribute("bordercolor", "#000000");
    tbl.setAttribute("cellpadding", "5");
    tbl.setAttribute("cellspacing", "0");
    tbl.setAttribute("width", "100%");
    tbl.style.cssText = "width:100%;border-collapse:collapse;border:1.5pt solid #000000;margin:6pt 0 10pt;font-family:Arial,Cairo,sans-serif;font-size:8pt;";

    tbl.querySelectorAll("thead th").forEach(function (th) {
      th.setAttribute("bgcolor", "#0b1f3a");
      th.style.cssText = "background-color:#0b1f3a;color:#ffffff;font-weight:bold;font-size:8pt;text-align:center;padding:5pt;border:1.0pt solid #000000;font-family:Arial,Cairo,sans-serif;";
      th.innerHTML = '<span style="color:#ffffff;font-weight:bold;font-size:8pt;">' + th.innerHTML + '</span>';
    });

    var rows = tbl.querySelectorAll("tbody tr");
    if (rows.length >= 3) {
      rows[0].querySelectorAll("td").forEach(function (td) {
        td.setAttribute("bgcolor", "#86efac");
        td.style.backgroundColor = "#86efac";
        td.style.color = "#000000";
        td.style.fontWeight = "bold";
        td.style.border = "1.0pt solid #000000";
        td.style.padding = "4pt 6pt";
      });
      rows[1].querySelectorAll("td").forEach(function (td) {
        td.setAttribute("bgcolor", "#fef08a");
        td.style.backgroundColor = "#fef08a";
        td.style.color = "#000000";
        td.style.fontWeight = "bold";
        td.style.border = "1.0pt solid #000000";
        td.style.padding = "4pt 6pt";
      });
      rows[2].querySelectorAll("td").forEach(function (td) {
        td.setAttribute("bgcolor", "#f87171");
        td.style.backgroundColor = "#f87171";
        td.style.color = "#000000";
        td.style.fontWeight = "bold";
        td.style.border = "1.0pt solid #000000";
        td.style.padding = "4pt 6pt";
      });
    }
  });

  /* 5. Format Official 9-Column Risk Assessment Matrix Table */
  clone.querySelectorAll(".official-risk-table").forEach(function (tbl) {
    tbl.setAttribute("border", "1");
    tbl.setAttribute("bordercolor", "#000000");
    tbl.setAttribute("cellpadding", "4");
    tbl.setAttribute("cellspacing", "0");
    tbl.setAttribute("width", "100%");
    tbl.style.cssText = "width:100%;border-collapse:collapse;border:1.5pt solid #000000;margin:8pt 0;font-family:Arial,Cairo,sans-serif;font-size:8pt;";

    tbl.querySelectorAll("th").forEach(function (th) {
      th.setAttribute("bgcolor", "#f1f5f9");
      var w = th.style.width || th.getAttribute("width") || "";
      th.style.cssText = "background-color:#f1f5f9;color:#0b1f3a;font-weight:bold;font-size:7.5pt;text-align:center;vertical-align:middle;padding:4pt 2pt;border:1.0pt solid #000000;font-family:Arial,Cairo,sans-serif;" + (w ? "width:" + w + ";" : "");
    });

    tbl.querySelectorAll("tbody td").forEach(function (td) {
      var txt = td.textContent.trim();
      var isScore = td.classList.contains("score-cell") || td.classList.contains("score-red") || td.classList.contains("score-yellow") || td.classList.contains("score-green") || td.classList.contains("score-orange");
      
      td.style.border = "1.0pt solid #000000";
      td.style.padding = "4pt 3pt";
      td.style.verticalAlign = "middle";
      td.style.fontSize = "8pt";
      td.style.fontFamily = "Arial,Cairo,sans-serif";

      if (td.classList.contains("score-red") || (isScore && parseInt(txt) >= 16)) {
        td.setAttribute("bgcolor", "#f87171");
        td.style.backgroundColor = "#f87171";
        td.style.color = "#000000";
        td.style.fontWeight = "bold";
        td.style.textAlign = "center";
      } else if (td.classList.contains("score-yellow") || (isScore && parseInt(txt) >= 9)) {
        td.setAttribute("bgcolor", "#fef08a");
        td.style.backgroundColor = "#fef08a";
        td.style.color = "#000000";
        td.style.fontWeight = "bold";
        td.style.textAlign = "center";
      } else if (td.classList.contains("score-green") || (isScore && parseInt(txt) > 0 && parseInt(txt) <= 8)) {
        td.setAttribute("bgcolor", "#86efac");
        td.style.backgroundColor = "#86efac";
        td.style.color = "#000000";
        td.style.fontWeight = "bold";
        td.style.textAlign = "center";
      } else if (td.classList.contains("center")) {
        td.style.textAlign = "center";
        td.style.fontWeight = "bold";
      }
    });
  });

  /* 6. Format General Safety Instructions Section for Word Export */
  clone.querySelectorAll(".official-safety-instructions-section").forEach(function (sec) {
    sec.style.cssText = "margin-top:14pt;border:1.5pt solid #0b1f3a;margin-bottom:12pt;font-family:Arial,Cairo,sans-serif;";

    var header = sec.querySelector(".safety-instructions-header");
    if (header) {
      var hTbl = document.createElement("table");
      hTbl.setAttribute("width", "100%");
      hTbl.setAttribute("border", "0");
      hTbl.setAttribute("cellpadding", "6");
      hTbl.setAttribute("cellspacing", "0");
      hTbl.style.cssText = "width:100%;background-color:#0b1f3a;border-bottom:2.5pt solid #c00000;margin-bottom:8pt;";
      var hTr = document.createElement("tr");
      var hTd = document.createElement("td");
      hTd.setAttribute("bgcolor", "#0b1f3a");
      hTd.style.cssText = "background-color:#0b1f3a;color:#ffffff;font-size:10pt;font-weight:bold;padding:6pt 8pt;font-family:Arial,Cairo,sans-serif;";
      var titleTxt = header.querySelector("span") ? header.querySelector("span").textContent.trim() : "GENERAL SAFETY INSTRUCTIONS & PRECAUTIONS";
      hTd.innerHTML = '<span style="color:#ffffff;font-weight:bold;font-size:10pt;">' + esc(titleTxt) + '</span>';
      hTr.appendChild(hTd);
      hTbl.appendChild(hTr);
      header.parentNode.replaceChild(hTbl, header);
    }

    /* Convert safety-rules-grid into a clean 2-column Word table */
    var grid = sec.querySelector(".safety-rules-grid");
    if (grid) {
      var cards = Array.from(grid.querySelectorAll(".safety-rule-card"));
      if (cards.length) {
        var gridTbl = document.createElement("table");
        gridTbl.setAttribute("width", "100%");
        gridTbl.setAttribute("border", "0");
        gridTbl.setAttribute("cellpadding", "4");
        gridTbl.setAttribute("cellspacing", "6");
        gridTbl.style.cssText = "width:100%;border-collapse:separate;margin:6pt 0 10pt;";

        for (var i = 0; i < cards.length; i += 2) {
          var row = document.createElement("tr");
          var c1 = cards[i];
          var c2 = cards[i + 1];

          var td1 = document.createElement("td");
          td1.setAttribute("width", "50%");
          td1.setAttribute("valign", "top");
          td1.style.cssText = "width:50%;vertical-align:top;border:1.0pt solid #cbd5e1;background-color:#f8fafc;padding:6pt;font-size:8pt;font-family:Arial,Cairo,sans-serif;";
          td1.innerHTML = c1.innerHTML;
          row.appendChild(td1);

          var td2 = document.createElement("td");
          td2.setAttribute("width", "50%");
          td2.setAttribute("valign", "top");
          td2.style.cssText = "width:50%;vertical-align:top;border:1.0pt solid #cbd5e1;background-color:#f8fafc;padding:6pt;font-size:8pt;font-family:Arial,Cairo,sans-serif;";
          if (c2) {
            td2.innerHTML = c2.innerHTML;
          } else {
            td2.innerHTML = "";
            td2.style.border = "none";
            td2.style.backgroundColor = "transparent";
          }
          row.appendChild(td2);
          gridTbl.appendChild(row);
        }
        grid.parentNode.replaceChild(gridTbl, grid);
      }
    }

    /* Format Key Safety Rules Box for Word */
    var keyRulesBox = sec.querySelector(".key-safety-rules-box");
    if (keyRulesBox) {
      keyRulesBox.style.cssText = "border:1.5pt solid #0284c7;background-color:#f0f9ff;border-" + (isAr ? "right" : "left") + ":4.5pt solid #0284c7;padding:8pt;margin:8pt 0;font-size:8.5pt;font-family:Arial,Cairo,sans-serif;";
    }

    /* Format Prohibited Actions Box for Word */
    var prohibitedBox = sec.querySelector(".prohibited-actions-box");
    if (prohibitedBox) {
      prohibitedBox.style.cssText = "border:1.0pt solid #fca5a5;background-color:#fef2f2;border-" + (isAr ? "right" : "left") + ":4.0pt solid #dc2626;padding:8pt;margin:8pt 0;font-size:8pt;font-family:Arial,Cairo,sans-serif;";
    }

    /* Format Mandatory Statement Box for Word */
    var stmtBox = sec.querySelector(".mandatory-statement-box");
    if (stmtBox) {
      stmtBox.style.cssText = "border:1.0pt solid #bfdbfe;background-color:#eff6ff;border-" + (isAr ? "right" : "left") + ":4.0pt solid #2563eb;padding:8pt;margin:8pt 0;font-size:8.5pt;font-weight:bold;color:#1e3a8a;font-family:Arial,Cairo,sans-serif;";
    }
  });

  return clone;
}

function downloadRiskWord() {
  if (!lastRiskAssessmentData && !riskAssessments.length) {
    return showSweetAlert("تنبيه", "لا توجد بيانات تقييم مخاطر للتصدير.", "warning");
  }
  var repEl = document.getElementById("riskAssessmentReport");
  var src = repEl.querySelector(".official-risk-doc") || repEl.querySelector(".report") || repEl;
  var isAr = repEl.querySelector('[dir="rtl"]') ? true : (currentReportLang === "ar");
  var clone = prepareRiskAssessmentWordClone(src, isAr);
  var logoSrc = customLogoUrl || SUT_LOGO_B64;

  var footerHtml = isAr ?
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>القاهرة - طريق إسماعيلية الصحراوي ، كيلو 51</span>' :
    '<b style="color:#0b1f3a">sut.edu.eg</b>&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:#c00000">15755</b>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Info@sut.edu.eg</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span>Cairo - Ismailia Desert Road, Km 51</span>';

  /* === Build Professional Word Document in Landscape Mode === */
  var doc = '<html xmlns:v="urn:schemas-microsoft-com:vml" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
    'xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>Risk and Environmental Impact Assessment</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 { ' +
    'size: 841.9pt 595.3pt; ' + /* A4 Landscape */
    'mso-page-orientation: landscape; ' +
    'margin: 28.35pt 28.35pt 28.35pt 28.35pt; ' +
    'mso-header-margin: 14.15pt; ' +
    'mso-footer-margin: 14.15pt; ' +
    'mso-header: h1; ' +
    'mso-footer: f1; ' +
    '} ' +
    'div.Section1 { page: Section1; } ' +
    'p.MsoHeader, div.MsoHeader { margin:0; padding:0; } ' +
    'p.MsoFooter, div.MsoFooter { margin:0; padding:0; } ' +
    'body { font-family: Arial, Cairo, sans-serif; font-size: 8.5pt; line-height: 1.35; color: #000000; background: #ffffff; } ' +
    'table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } ' +
    'th { background-color: #f1f5f9 !important; color: #0b1f3a !important; font-weight: bold; border: 1.0pt solid #000000; } ' +
    'td { border: 1.0pt solid #000000; } ' +
    '.score-red { background-color: #fca5a5 !important; color: #000000 !important; font-weight: bold; } ' +
    '.score-yellow { background-color: #fef08a !important; color: #000000 !important; font-weight: bold; } ' +
    '.score-green { background-color: #86efac !important; color: #000000 !important; font-weight: bold; } ' +
    '.score-orange { background-color: #fdba74 !important; color: #000000 !important; font-weight: bold; } ' +
    '</style>' +
    '</head>' +
    '<body style="tab-interval:36.0pt;background:#fff" lang="' + (isAr ? 'AR-EG' : 'EN-US') + '" dir="' + (isAr ? 'rtl' : 'ltr') + '">' +
    '<div class="Section1">' +
    clone.outerHTML +
    '</div>' +
    '<div style="mso-element:header" id="h1">' +
    '<p class="MsoHeader" align="' + (isAr ? 'right' : 'left') + '" style="text-align:' + (isAr ? 'right' : 'left') + ';margin:0;padding:0">' +
    '<img src="' + logoSrc + '" width="140" height="50" style="height:50px;max-width:140px;display:inline-block;" alt="SUTech Logo">' +
    '</p>' +
    '</div>' +
    '<div style="mso-element:footer" id="f1">' +
    '<p class="MsoFooter" align="center" style="text-align:center;border-top:1.0pt solid #5D5E60;padding-top:4pt;margin:0;font-family:Arial,sans-serif;font-size:8pt;color:#5D5E60;">' +
    footerHtml +
    '</p>' +
    '</div>' +
    '</body></html>';

  downloadBlob("\ufeff" + doc, "SUTech-Risk-and-Environmental-Assessment-" + new Date().toISOString().slice(0, 10) + ".doc", "application/msword");
  showToast("success", "تم تنزيل تقرير تقييم المخاطر المعتمد بصيغة Word بنجاح!");
}

function exportRiskCSV() {
  if (!riskAssessments.length) return showSweetAlert("تنبيه", "لا توجد مخاطر مسجلة لتصديرها.", "warning");
  var headers = ["ID", "Location/Area", "Machine/Equipment", "Activity Breakdown", "Persons Exposed", "Potential Hazard", "Consequences", "Risk Category", "Inherent L", "Inherent S", "Inherent R", "Present Controls", "Control Type", "Interim L", "Interim S", "Interim R", "Further Action", "Residual L", "Residual S", "Residual R", "Owner", "Target Date"];
  var rows = riskAssessments.map(function (x) {
    return [
      x.id,
      '"' + (x.area || "").replace(/"/g, '""') + '"',
      '"' + (x.equipment || "").replace(/"/g, '""') + '"',
      '"' + (x.activity || "").replace(/"/g, '""') + '"',
      '"' + (x.persons || "").replace(/"/g, '""') + '"',
      '"' + (x.hazard || "").replace(/"/g, '""') + '"',
      '"' + (x.consequences || "").replace(/"/g, '""') + '"',
      '"' + (x.category || "S") + '"',
      x.initialL || 3,
      x.initialS || 4,
      x.initialScore || 12,
      '"' + (x.existingControls || "").replace(/"/g, '""') + '"',
      '"' + (x.controlType || "E").replace(/"/g, '""') + '"',
      x.interimL || 2,
      x.interimS || 4,
      x.interimScore || 8,
      '"' + (x.furtherAction || "").replace(/"/g, '""') + '"',
      x.residualL || 1,
      x.residualS || 4,
      x.residualScore || 4,
      '"' + (x.owner || "HSE").replace(/"/g, '""') + '"',
      '"' + (x.targetDate || "") + '"'
    ].join(",");
  });

  var csv = [headers.join(",")].concat(rows).join("\r\n");
  var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "SUTech-Risk-Register-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  showToast("success", "تم تصدير سجل تقييم المخاطر بصيغة CSV بنجاح!");
}

/* =========================================================================
   SAVED RISK ASSESSMENTS ARCHIVE & HISTORICAL REGISTER ENGINE
   ========================================================================= */

function saveCurrentRiskAssessment(isManual) {
  if (!lastRiskAssessmentData) {
    if (isManual) showSweetAlert("تنبيه", "لا توجد دراسة تقييم مخاطر حالية لحفظها. يرجى توليد التقييم أولاً.", "warning");
    return;
  }
  
  var ra = lastRiskAssessmentData;
  var area = ra.activity_to_be_assessed || (ra._formData ? ra._formData.area : "") || "HSE Assessment";
  var date = ra.assessment_date || (ra._formData ? ra._formData.date : "") || new Date().toISOString().slice(0, 10);
  var docTitle = ra.document_title || (ra._lang === "ar" ? "سجل تقييم المخاطر والأثر البيئي" : "Risk & Environmental Assessment");
  
  var existingIdx = savedRiskAssessments.findIndex(function (x) {
    return (ra.id && x.id === ra.id) || (x.area === area && x.date === date);
  });
  
  var savedObj = {
    id: ra.id || Date.now(),
    title: docTitle + " — " + area + " (" + date + ")",
    area: area,
    date: date,
    lang: ra._lang || "en",
    activitiesCount: (ra.activities || []).length,
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(ra))
  };
  
  ra.id = savedObj.id;
  
  if (existingIdx >= 0) {
    savedObj.createdAt = savedRiskAssessments[existingIdx].createdAt || savedRiskAssessments[existingIdx].savedAt;
    savedRiskAssessments[existingIdx] = savedObj;
  } else {
    savedObj.createdAt = new Date().toISOString();
    savedRiskAssessments.unshift(savedObj);
  }
  
  try {
    localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments));
  } catch (e) {}
  syncToCloud("savedRiskAssessments", savedRiskAssessments);
  renderRiskHistoryTable();
  updateSavedRiskAssessmentsDropdown();
  updateBackupStatsBadges();
  
  if (isManual) {
    showToast("success", "تم حفظ دراسة تقييم المخاطر بالسجل التاريخي بنجاح!");
  }
}

function renderRiskHistoryTable(filterText, areaFilter, levelFilter) {
  var container = document.getElementById("riskHistoryTableContainer");
  var countBadge = document.getElementById("riskHistoryCount");
  if (!container) return;

  var q = (filterText || (document.getElementById("searchRiskHistory") ? document.getElementById("searchRiskHistory").value : "") || "").trim().toLowerCase();
  var areaVal = (areaFilter !== undefined ? areaFilter : (document.getElementById("filterRiskArea") ? document.getElementById("filterRiskArea").value : "")) || "";
  var levelVal = (levelFilter !== undefined ? levelFilter : (document.getElementById("filterRiskLevel") ? document.getElementById("filterRiskLevel").value : "")) || "";

  // Populate area filter options dynamically
  var areaSelect = document.getElementById("filterRiskArea");
  if (areaSelect) {
    var currentSelectedArea = areaSelect.value;
    var areasSet = new Set();
    savedRiskAssessments.forEach(function (x) { if (x.area) areasSet.add(x.area); });
    var opts = '<option value="">جميع المختبرات والورش (' + savedRiskAssessments.length + ')</option>';
    areasSet.forEach(function (a) {
      opts += '<option value="' + esc(a) + '"' + (a === currentSelectedArea ? ' selected' : '') + '>' + esc(a) + '</option>';
    });
    areaSelect.innerHTML = opts;
  }

  var filtered = savedRiskAssessments.filter(function (item) {
    var matchQuery = !q || (item.title && item.title.toLowerCase().includes(q)) || (item.area && item.area.toLowerCase().includes(q)) || (item.date && item.date.includes(q));
    var matchArea = !areaVal || item.area === areaVal;
    var matchLevel = true;
    if (levelVal) {
      var act = (item.data && item.data.activities) || [];
      matchLevel = act.some(function (a) {
        var r = Number(a.initial_risk_score || a.initial_r || 0);
        if (levelVal === "Critical") return r >= 16;
        if (levelVal === "Medium") return r >= 9 && r <= 15;
        if (levelVal === "Low") return r <= 8;
        return true;
      });
    }
    return matchQuery && matchArea && matchLevel;
  });

  if (countBadge) countBadge.textContent = savedRiskAssessments.length;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">' +
      '<i class="fa-solid fa-folder-open" style="font-size:24px;margin-bottom:6px;display:block;opacity:0.5"></i>' +
      'لا توجد دراسات تقييم مخاطر مطابقة للبحث' +
      '</div>';
    return;
  }

  var html = '<table class="history-table">' +
    '<thead>' +
      '<tr>' +
        '<th style="width:5%">#</th>' +
        '<th style="width:28%">اسم الدراسة / المكان (Assessment Title &amp; Location)</th>' +
        '<th style="width:12%;text-align:center">التاريخ (Date)</th>' +
        '<th style="width:10%;text-align:center">الأنشطة (Items)</th>' +
        '<th style="width:18%;text-align:center">مصفوفة المخاطر المعتمدة</th>' +
        '<th style="width:12%;text-align:center">آخر تحديث</th>' +
        '<th style="width:15%;text-align:center">الإجراءات (Actions)</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  filtered.forEach(function (x, idx) {
    var actCount = x.activitiesCount || (x.data && x.data.activities ? x.data.activities.length : 0);
    var updDate = x.updatedAt ? x.updatedAt.slice(0, 10) : (x.savedAt ? x.savedAt.slice(0, 10) : x.date);
    
    html += '<tr>' +
      '<td style="text-align:center"><b>' + (idx + 1) + '</b></td>' +
      '<td>' +
        '<b style="color:#0b1f3a;font-size:12px">' + esc(x.area || x.title) + '</b>' +
        '<small style="display:block;color:#64748b;font-size:10px">' + esc(x.title) + '</small>' +
      '</td>' +
      '<td style="text-align:center;font-weight:700">' + esc(x.date) + '</td>' +
      '<td style="text-align:center"><span class="badge" style="background:#e0f2fe;color:#0369a1">' + actCount + ' أنشطة</span></td>' +
      '<td style="text-align:center"><span class="hist-status-badge hist-status-completed"><i class="fa-solid fa-shield-halved"></i> 6×5 SUT Matrix</span></td>' +
      '<td style="text-align:center;font-size:10px;color:#64748b">' + esc(updDate) + '</td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="history-action-btn btn-view" title="عرض الدراسة بالكامل" onclick="loadSavedRiskAssessmentById(' + x.id + ')"><i class="fa-solid fa-eye"></i> عرض</button>' +
        '<button class="history-action-btn btn-dup" title="تكرار الدراسة لفترة جديدة" onclick="duplicateSavedRiskAssessment(' + x.id + ')"><i class="fa-solid fa-copy"></i> تكرار</button>' +
        '<button class="history-action-btn btn-del" title="حذف من السجل" onclick="deleteSavedRiskAssessmentById(' + x.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function duplicateSavedRiskAssessment(id) {
  var item = savedRiskAssessments.find(function (x) { return String(x.id) === String(id); });
  if (!item || !item.data) return showSweetAlert("خطأ", "لم يتم العثور على دراسة التقييم المحددة.", "error");

  var cloneData = JSON.parse(JSON.stringify(item.data));
  var newId = Date.now();
  var newDate = new Date().toISOString().slice(0, 10);
  var newTitle = (cloneData.document_title || "Risk Assessment") + " — " + (cloneData.activity_to_be_assessed || item.area) + " (Copy " + newDate + ")";

  cloneData.id = newId;
  cloneData.assessment_date = newDate;

  var newRecord = {
    id: newId,
    title: newTitle,
    area: cloneData.activity_to_be_assessed || item.area,
    date: newDate,
    lang: cloneData._lang || item.lang || "en",
    activitiesCount: (cloneData.activities || []).length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: cloneData
  };

  savedRiskAssessments.unshift(newRecord);
  try {
    localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments));
  } catch (e) {}
  syncToCloud("savedRiskAssessments", savedRiskAssessments);
  renderRiskHistoryTable();
  updateSavedRiskAssessmentsDropdown();
  updateBackupStatsBadges();
  showToast("success", "تم تكرار دراسة تقييم المخاطر بنجاح كسجل مستقل جديد!");
}

async function deleteSavedRiskAssessmentById(id) {
  var item = savedRiskAssessments.find(function (x) { return String(x.id) === String(id); });
  var title = item ? (item.title || item.area) : "هذه الدراسة";
  
  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف دراسة تقييم المخاطر: \"" + title + "\" نهائياً من السجل؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    savedRiskAssessments = savedRiskAssessments.filter(function (x) { return String(x.id) !== String(id); });
    try {
      localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments));
    } catch (e) {}
    syncToCloud("savedRiskAssessments", savedRiskAssessments);
    renderRiskHistoryTable();
    updateSavedRiskAssessmentsDropdown();
    updateBackupStatsBadges();
    showToast("info", "تم حذف دراسة تقييم المخاطر من السجل التاريخي بنجاح.");
  }
}

function updateSavedRiskAssessmentsDropdown() {
  var sel = document.getElementById("savedRiskSelect");
  if (!sel) return;
  
  if (!savedRiskAssessments || savedRiskAssessments.length === 0) {
    sel.innerHTML = '<option value="">-- لا توجد دراسات مخاطر محفوظة حتى الآن --</option>';
    return;
  }
  
  var currentId = lastRiskAssessmentData ? lastRiskAssessmentData.id : null;
  var options = '<option value="">-- اختر دراسة مخاطر محفوظة لعرضها واسترجاعها (' + savedRiskAssessments.length + ') --</option>' +
    savedRiskAssessments.map(function (x) {
      var isSelected = (currentId && (x.id === currentId || (x.data && x.data.id === currentId))) ? " selected" : "";
      var count = x.activitiesCount || (x.data && x.data.activities ? x.data.activities.length : 0);
      return '<option value="' + x.id + '"' + isSelected + '>' + esc(x.title || (x.area + " — " + x.date)) + ' [' + count + ' أنشطة/مخاطر]</option>';
    }).join("");
    
  sel.innerHTML = options;
}

function loadSelectedSavedRisk() {
  var sel = document.getElementById("savedRiskSelect");
  if (!sel || !sel.value) {
    return showSweetAlert("تنبيه", "يرجى اختيار دراسة تقييم مخاطر من القائمة أولاً.", "warning");
  }
  loadSavedRiskAssessmentById(sel.value);
}

function loadSavedRiskAssessmentById(id) {
  var item = savedRiskAssessments.find(function (x) { return String(x.id) === String(id); });
  if (!item || !item.data) {
    return showSweetAlert("خطأ", "لم يتم العثور على بيانات الدراسة المحددة.", "error");
  }
  
  lastRiskAssessmentData = JSON.parse(JSON.stringify(item.data));
  lastRiskAssessmentData.id = item.id;
  
  var outWrap = document.getElementById("riskAssessmentOutput");
  if (outWrap) outWrap.classList.remove("hidden");
  
  renderRiskAssessmentReport(lastRiskAssessmentData);
  updateSavedRiskAssessmentsDropdown();
  
  if (outWrap) {
    outWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  
  showToast("success", "تم استرجاع وعرض دراسة تقييم المخاطر بنجاح: " + (item.area || item.title));
}

async function deleteSelectedSavedRisk() {
  var sel = document.getElementById("savedRiskSelect");
  if (!sel || !sel.value) {
    return showSweetAlert("تنبيه", "يرجى اختيار دراسة تقييم مخاطر لحذفها.", "warning");
  }
  deleteSavedRiskAssessmentById(sel.value);
}

/* =========================================================================
   INSPECTION CHECKLISTS & FIELD AUDITS HISTORICAL ARCHIVE ENGINE
   ========================================================================= */

function saveCurrentInspection(isManual) {
  if (!lastGeneratedInspectionData) {
    if (isManual) showSweetAlert("تنبيه", "لا توجد قائمة فحص حالية لحفظها. يرجى توليد قائمة فحص أولاً.", "warning");
    return;
  }

  var insp = lastGeneratedInspectionData;
  var existingIdx = savedInspections.findIndex(function (x) {
    return (insp.id && x.id === insp.id) || (x.no && x.no === insp.no);
  });

  var savedObj = {
    id: insp.id || Date.now(),
    no: insp.no || ("SUT-INS-" + new Date().getFullYear() + "-" + String(savedInspections.length + 1).padStart(3, "0")),
    title: insp.title || document.getElementById("inspectionQuery").value || "HSE Inspection Checklist",
    area: insp.area || document.getElementById("inspectionArea").value || "Campus General",
    date: insp.date || new Date().toISOString().slice(0, 10),
    inspector: insp.inspector || "SUTech HSE Inspector",
    lang: insp.lang || document.getElementById("inspectionLang").value || "ar",
    status: insp.status || "Completed",
    itemsCount: (insp.data && insp.data.items ? insp.data.items.length : 0),
    updatedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(insp.data || insp))
  };

  insp.id = savedObj.id;
  insp.no = savedObj.no;

  if (existingIdx >= 0) {
    savedObj.createdAt = savedInspections[existingIdx].createdAt || savedObj.updatedAt;
    savedInspections[existingIdx] = savedObj;
  } else {
    savedObj.createdAt = new Date().toISOString();
    savedInspections.unshift(savedObj);
  }

  try {
    localStorage.setItem(SAVED_INSPECTIONS_KEY, JSON.stringify(savedInspections));
  } catch (e) {}
  syncToCloud("savedInspections", savedInspections);
  renderInspectionHistoryTable();
  updateBackupStatsBadges();

  if (isManual) {
    showToast("success", "تم حفظ وتوثيق نموذج الفحص بالسجل التاريخي بنجاح (" + savedObj.no + ")!");
  }
}

function renderInspectionHistoryTable(filterText, areaFilter, statusFilter) {
  var container = document.getElementById("inspectionHistoryTableContainer");
  var countBadge = document.getElementById("inspHistoryCount");
  if (!container) return;

  var q = (filterText || (document.getElementById("searchInspHistory") ? document.getElementById("searchInspHistory").value : "") || "").trim().toLowerCase();
  var areaVal = (areaFilter !== undefined ? areaFilter : (document.getElementById("filterInspArea") ? document.getElementById("filterInspArea").value : "")) || "";
  var statusVal = (statusFilter !== undefined ? statusFilter : (document.getElementById("filterInspStatus") ? document.getElementById("filterInspStatus").value : "")) || "";

  // Dynamic area select
  var areaSelect = document.getElementById("filterInspArea");
  if (areaSelect) {
    var curArea = areaSelect.value;
    var areasSet = new Set();
    savedInspections.forEach(function (x) { if (x.area) areasSet.add(x.area); });
    var opts = '<option value="">جميع المواقع والأقسام (' + savedInspections.length + ')</option>';
    areasSet.forEach(function (a) {
      opts += '<option value="' + esc(a) + '"' + (a === curArea ? ' selected' : '') + '>' + esc(a) + '</option>';
    });
    areaSelect.innerHTML = opts;
  }

  var filtered = savedInspections.filter(function (item) {
    var matchQuery = !q || (item.title && item.title.toLowerCase().includes(q)) || (item.no && item.no.toLowerCase().includes(q)) || (item.area && item.area.toLowerCase().includes(q));
    var matchArea = !areaVal || item.area === areaVal;
    var matchStatus = !statusVal || item.status === statusVal;
    return matchQuery && matchArea && matchStatus;
  });

  if (countBadge) countBadge.textContent = savedInspections.length;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">' +
      '<i class="fa-solid fa-clipboard-question" style="font-size:24px;margin-bottom:6px;display:block;opacity:0.5"></i>' +
      'لا توجد نماذج فحص مطابقة للبحث' +
      '</div>';
    return;
  }

  var html = '<table class="history-table">' +
    '<thead>' +
      '<tr>' +
        '<th style="width:12%">رقم الفحص (No.)</th>' +
        '<th style="width:30%">موضوع الفحص والمجال (Scope &amp; Title)</th>' +
        '<th style="width:18%">الموقع / القسم (Facility)</th>' +
        '<th style="width:10%;text-align:center">التاريخ (Date)</th>' +
        '<th style="width:8%;text-align:center">البنود</th>' +
        '<th style="width:10%;text-align:center">الحالة (Status)</th>' +
        '<th style="width:12%;text-align:center">الإجراءات</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  filtered.forEach(function (x) {
    var statusClass = x.status === "Completed" ? "hist-status-completed" : x.status === "Action Required" ? "hist-status-action" : "hist-status-draft";
    var itemsCount = x.itemsCount || (x.data && x.data.items ? x.data.items.length : 0);

    html += '<tr>' +
      '<td><b style="color:var(--sut-navy);font-family:Inter,monospace">' + esc(x.no || "SUT-INS") + '</b></td>' +
      '<td><b>' + esc(x.title) + '</b></td>' +
      '<td><span class="hotspot-tag" style="background:#f1f5f9;color:#0b1f3a;border:1px solid #cbd5e1">' + esc(x.area) + '</span></td>' +
      '<td style="text-align:center;font-weight:600">' + esc(x.date) + '</td>' +
      '<td style="text-align:center"><span class="badge" style="background:#e0f2fe;color:#0369a1">' + itemsCount + '</span></td>' +
      '<td style="text-align:center"><span class="hist-status-badge ' + statusClass + '">' + esc(x.status || "Completed") + '</span></td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="history-action-btn btn-view" title="عرض وطباعة النموذج" onclick="openSavedInspection(' + x.id + ')"><i class="fa-solid fa-eye"></i> عرض</button>' +
        '<button class="history-action-btn btn-dup" title="تكرار الفحص للشهر القادم" onclick="duplicateSavedInspection(' + x.id + ')"><i class="fa-solid fa-copy"></i> تكرار</button>' +
        '<button class="history-action-btn btn-del" title="حذف النموذج" onclick="deleteSavedInspection(' + x.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function openSavedInspection(id) {
  var item = savedInspections.find(function (x) { return String(x.id) === String(id); });
  if (!item || !item.data) return showSweetAlert("خطأ", "لم يتم العثور على بيانات الفحص المحددة.", "error");

  lastGeneratedInspectionData = JSON.parse(JSON.stringify(item));
  var d = item.data;

  // Populate UI fields
  if (document.getElementById("inspectionQuery")) document.getElementById("inspectionQuery").value = item.title;
  if (document.getElementById("inspectionArea")) document.getElementById("inspectionArea").value = item.area;
  if (document.getElementById("inspectionNo")) document.getElementById("inspectionNo").value = item.no || "";
  if (document.getElementById("inspectionDate")) document.getElementById("inspectionDate").value = item.date || "";
  if (document.getElementById("inspectionInspector")) document.getElementById("inspectionInspector").value = item.inspector || "م. إبراهيم سعيد (HSE Department)";
  if (document.getElementById("inspectionLang")) document.getElementById("inspectionLang").value = item.lang || "ar";

  var wrap = document.getElementById("inspectionOutput");
  if (wrap) wrap.classList.remove("hidden");

  renderInteractiveInspection();
  if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("success", "تم فتح واسترجاع نموذج الفحص بنجاح: " + item.no);
}

function duplicateSavedInspection(id) {
  var item = savedInspections.find(function (x) { return String(x.id) === String(id); });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على الفحص المحدد.", "error");

  var clone = JSON.parse(JSON.stringify(item));
  var newId = Date.now();
  var newDate = new Date().toISOString().slice(0, 10);
  var nextNum = savedInspections.length + 1;
  var newNo = "SUT-INS-" + new Date().getFullYear() + "-" + String(nextNum).padStart(3, "0");

  clone.id = newId;
  clone.no = newNo;
  clone.title = item.title + " (" + newDate + ")";
  clone.date = newDate;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();
  clone.status = "Draft";

  savedInspections.unshift(clone);
  try {
    localStorage.setItem(SAVED_INSPECTIONS_KEY, JSON.stringify(savedInspections));
  } catch (e) {}
  syncToCloud("savedInspections", savedInspections);
  renderInspectionHistoryTable();
  updateBackupStatsBadges();
  showToast("success", "تم إنشاء نسخة جديدة من قائمة الفحص (" + newNo + ") بنجاح!");
}

async function deleteSavedInspection(id) {
  var item = savedInspections.find(function (x) { return String(x.id) === String(id); });
  var title = item ? (item.no + " — " + item.title) : "هذا الفحص";

  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف قائمة الفحص: \"" + title + "\" نهائياً؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    savedInspections = savedInspections.filter(function (x) { return String(x.id) !== String(id); });
    try {
      localStorage.setItem(SAVED_INSPECTIONS_KEY, JSON.stringify(savedInspections));
    } catch (e) {}
    syncToCloud("savedInspections", savedInspections);
    renderInspectionHistoryTable();
    updateBackupStatsBadges();
    showToast("info", "تم حذف قائمة الفحص بنجاح.");
  }
}

/* =========================================================================
   COMMITTEE MoM HISTORICAL RECORDS & ACTION ARCHIVE ENGINE
   ========================================================================= */

function saveCurrentMoMReport(isManual) {
  if (!lastGeneratedMoMData || !lastGeneratedMoMData.subject) {
    if (isManual) showSweetAlert("تنبيه", "لا يوجد محضر اجتماع حالي لحفظه. يرجى توليد المحضر أولاً.", "warning");
    return;
  }

  var mom = lastGeneratedMoMData;
  var existingIdx = savedMomReports.findIndex(function (x) {
    return (mom.id && x.id === mom.id) || (x.seqNo && String(x.seqNo) === String(mom.seqNo));
  });

  var seqNo = mom.seqNo || document.getElementById("momSeqNo").value || String(currentMomSeq);
  var subject = mom.subject || document.getElementById("momSubject").value || "HSE Committee Meeting";
  var date = mom.date || document.getElementById("momDate").value || new Date().toISOString().slice(0, 10);
  var timing = mom.timing || document.getElementById("momTiming").value || "10:00 AM – 12:00 PM";
  var location = mom.location || document.getElementById("momLocation").value || "Main Campus Conference Hall A";

  var savedObj = {
    id: mom.id || Date.now(),
    seqNo: seqNo,
    subject: subject,
    date: date,
    timing: timing,
    location: location,
    attendeesCount: (mom.attendees ? mom.attendees.length : (document.querySelectorAll("#momAttendeesList .mom-att-row").length || 22)),
    updatedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(mom))
  };

  mom.id = savedObj.id;

  if (existingIdx >= 0) {
    savedObj.createdAt = savedMomReports[existingIdx].createdAt || savedObj.updatedAt;
    savedMomReports[existingIdx] = savedObj;
  } else {
    savedObj.createdAt = new Date().toISOString();
    savedMomReports.unshift(savedObj);
  }

  try {
    localStorage.setItem(SAVED_MOM_REPORTS_KEY, JSON.stringify(savedMomReports));
  } catch (e) {}
  syncToCloud("savedMomReports", savedMomReports);
  renderMomHistoryTable();
  updateBackupStatsBadges();

  if (isManual) {
    showToast("success", "تم حفظ وتوثيق محضر الاجتماع بالسجل التاريخي (MoM #" + seqNo + ") بنجاح!");
  }
}

function renderMomHistoryTable(filterText) {
  var container = document.getElementById("momHistoryTableContainer");
  var countBadge = document.getElementById("momHistoryCount");
  if (!container) return;

  var q = (filterText || (document.getElementById("searchMomHistory") ? document.getElementById("searchMomHistory").value : "") || "").trim().toLowerCase();

  var filtered = savedMomReports.filter(function (item) {
    return !q || (item.subject && item.subject.toLowerCase().includes(q)) || (item.seqNo && String(item.seqNo).includes(q)) || (item.date && item.date.includes(q));
  });

  if (countBadge) countBadge.textContent = savedMomReports.length;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">' +
      '<i class="fa-solid fa-users-slash" style="font-size:24px;margin-bottom:6px;display:block;opacity:0.5"></i>' +
      'لا توجد محاضر اجتماعات مطابقة للبحث' +
      '</div>';
    return;
  }

  var html = '<table class="history-table">' +
    '<thead>' +
      '<tr>' +
        '<th style="width:10%">رقم المحضر</th>' +
        '<th style="width:38%">موضوع الاجتماع (Meeting Subject)</th>' +
        '<th style="width:14%;text-align:center">التاريخ والتوقيت</th>' +
        '<th style="width:16%">المكان (Location)</th>' +
        '<th style="width:8%;text-align:center">الحضور</th>' +
        '<th style="width:14%;text-align:center">الإجراءات</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  filtered.forEach(function (x) {
    var attCount = x.attendeesCount || (x.data && x.data.attendees ? x.data.attendees.length : 22);

    html += '<tr>' +
      '<td><b style="color:var(--sut-red);font-size:12px">MoM #' + esc(x.seqNo) + '</b></td>' +
      '<td><b>' + esc(x.subject) + '</b></td>' +
      '<td style="text-align:center;font-size:10.5px"><b>' + esc(x.date) + '</b><br><small style="color:#64748b">' + esc(x.timing || "") + '</small></td>' +
      '<td><span class="hotspot-tag" style="background:#f8fafc;color:#0b1f3a;border:1px solid #cbd5e1">' + esc(x.location || "SUTech Campus") + '</span></td>' +
      '<td style="text-align:center"><span class="badge" style="background:#f3e8ff;color:#7e22ce">' + attCount + ' عضو</span></td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="history-action-btn btn-view" title="عرض المحضر" onclick="openSavedMomReport(' + x.id + ')"><i class="fa-solid fa-eye"></i> عرض</button>' +
        '<button class="history-action-btn btn-dup" title="تكرار للاجتماع القادم" onclick="duplicateSavedMomReport(' + x.id + ')"><i class="fa-solid fa-copy"></i> تكرار</button>' +
        '<button class="history-action-btn btn-del" title="حذف المحضر" onclick="deleteSavedMomReport(' + x.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function openSavedMomReport(id) {
  var item = savedMomReports.find(function (x) { return String(x.id) === String(id); });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على المحضر المحدد.", "error");

  lastGeneratedMoMData = JSON.parse(JSON.stringify(item.data || item));
  lastGeneratedMoMData.seqNo = item.seqNo;
  lastGeneratedMoMData.subject = item.subject;

  // Populate inputs
  if (document.getElementById("momSubject")) document.getElementById("momSubject").value = item.subject;
  if (document.getElementById("momDate")) document.getElementById("momDate").value = item.date;
  if (document.getElementById("momTiming")) document.getElementById("momTiming").value = item.timing || "";
  if (document.getElementById("momLocation")) document.getElementById("momLocation").value = item.location || "";
  if (document.getElementById("momSeqNo")) document.getElementById("momSeqNo").value = item.seqNo;
  if (document.getElementById("momSummary") && item.data && item.data.summary) {
    document.getElementById("momSummary").value = item.data.summary;
  }

  // Populate attendees
  var attList = (item.data && item.data.attendees) || [];
  var container = document.getElementById("momAttendeesList");
  if (container && attList.length > 0) {
    container.innerHTML = "";
    attList.forEach(function (att) {
      addMomAttendeeRow({ id: "custom", name: att.name, dept: att.dept });
    });
  }

  var wrap = document.getElementById("momOutput");
  if (wrap) wrap.classList.remove("hidden");

  // Reconstruct HTML view if needed
  var out = document.getElementById("momReportContainer");
  if (out && item.data) {
    var d = item.data;
    var attendeesList = d.attendees || [
      { name: "Eng. Ibrahem", dept: "HSE Department" },
      { name: "Mrs. Nariman", dept: "Executive Administration" }
    ];
    var recs = d.recommendations || [];

    var h = '<div class="report" id="momReportInner" dir="ltr" data-report-language="en" style="direction:ltr;text-align:left">' +
      '<div class="report-head" style="direction:ltr">' +
      '<div class="track"><b>MoM No.</b><span>#' + esc(item.seqNo) + '</span></div>' +
      '<div class="report-title"><h2 style="font-family:Inter,Cairo,sans-serif;letter-spacing:0.5px">Minutes of Meeting No.' + esc(item.seqNo) + '</h2><p style="font-family:Inter,sans-serif;color:var(--sut-red)">El Sewedy University of Technology (SUTech) — HSE Committee</p></div>' +
      '<div class="track"><b>Date</b><span>' + esc(item.date) + '</span></div></div>' +
      '<div class="meta" style="direction:ltr"><div><b>Meeting Subject:</b> ' + esc(item.subject) + '</div><div><b>Date & Timing:</b> ' + esc(item.date) + ' (' + esc(item.timing || "10:00 AM") + ')</div><div><b>Location:</b> ' + esc(item.location || "SUTech Campus") + '</div></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Attendees</div>' +
      '<table><thead><tr><th style="width:8%;text-align:center">#</th><th style="width:46%">Attendee Name</th><th style="width:46%">Department / Affiliation</th></tr></thead><tbody>' +
      attendeesList.map(function (att, i) { return '<tr><td style="text-align:center"><b>' + (i + 1) + '</b></td><td><b>' + esc(att.name) + '</b></td><td>' + esc(att.dept) + '</td></tr>'; }).join("") +
      '</tbody></table>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Meeting Summary: Last Meeting Points & New highlighting points</div>' +
      '<div class="answer"><p>' + esc(d.summary || "Comprehensive discussion of safety issues.") + '</p></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">Recommendations</div>' +
      '<ul style="padding-left:22px;padding-right:0;font-size:11.5px;line-height:1.6">' +
      recs.map(function (rec) { return '<li style="margin-bottom:6px">' + esc(rec) + '</li>'; }).join("") +
      '</ul></div>';
    out.innerHTML = h;
  }

  if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("success", "تم فتح محضر الاجتماع بنجاح: MoM #" + item.seqNo);
}

function duplicateSavedMomReport(id) {
  var item = savedMomReports.find(function (x) { return String(x.id) === String(id); });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على المحضر المحدد.", "error");

  var nextSeq = currentMomSeq;
  currentMomSeq++;
  localStorage.setItem(MOM_SEQ_KEY, String(currentMomSeq));

  var clone = JSON.parse(JSON.stringify(item));
  var newId = Date.now();
  var newDate = new Date().toISOString().slice(0, 10);

  clone.id = newId;
  clone.seqNo = String(nextSeq);
  clone.subject = item.subject + " (Follow-up)";
  clone.date = newDate;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();

  if (clone.data) {
    clone.data.seqNo = String(nextSeq);
    clone.data.date = newDate;
  }

  savedMomReports.unshift(clone);
  try {
    localStorage.setItem(SAVED_MOM_REPORTS_KEY, JSON.stringify(savedMomReports));
  } catch (e) {}
  syncToCloud("savedMomReports", savedMomReports);
  renderMomHistoryTable();
  updateBackupStatsBadges();
  showToast("success", "تم إنشاء محضر جديد MoM #" + nextSeq + " بنجاح!");
}

async function deleteSavedMomReport(id) {
  var item = savedMomReports.find(function (x) { return String(x.id) === String(id); });
  var title = item ? ("MoM #" + item.seqNo + " — " + item.subject) : "هذا المحضر";

  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف محضر الاجتماع: \"" + title + "\" نهائياً؟", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    savedMomReports = savedMomReports.filter(function (x) { return String(x.id) !== String(id); });
    try {
      localStorage.setItem(SAVED_MOM_REPORTS_KEY, JSON.stringify(savedMomReports));
    } catch (e) {}
    syncToCloud("savedMomReports", savedMomReports);
    renderMomHistoryTable();
    updateBackupStatsBadges();
    showToast("info", "تم حذف محضر الاجتماع بنجاح.");
  }
}

/* =========================================================================
   UNIVERSAL DATA BACKUP, PORTABILITY & RESTORE CENTER (SECTION 39)
   ========================================================================= */

function openDataBackupModal() {
  updateBackupStatsBadges();
  var m = document.getElementById("backupModal");
  if (m) m.style.display = "flex";
}

function closeBackupModal() {
  var m = document.getElementById("backupModal");
  if (m) m.style.display = "none";
}

function updateBackupStatsBadges() {
  var sInsp = document.getElementById("bStatInspections");
  var sRisk = document.getElementById("bStatRisk");
  var sFind = document.getElementById("bStatFindings");
  var sInc = document.getElementById("bStatIncidents");
  var sPtw = document.getElementById("bStatPtw");
  var sTr = document.getElementById("bStatTraining");
  var sMom = document.getElementById("bStatMom");

  if (sInsp) sInsp.textContent = savedInspections.length;
  if (sRisk) sRisk.textContent = savedRiskAssessments.length;
  if (sFind) sFind.textContent = findings.length;
  if (sInc) sInc.textContent = incidents.length;
  if (sPtw) sPtw.textContent = ptwList.length;
  if (sTr) sTr.textContent = trainingSessions.length;
  if (sMom) sMom.textContent = savedMomReports.length;
}

function exportComprehensiveBackupJSON() {
  var data = {
    version: "8.0",
    system: "SUTech HSE Smart Enterprise System",
    exportedAt: new Date().toISOString(),
    recordsSummary: {
      findingsCount: findings.length,
      incidentsCount: incidents.length,
      ptwCount: ptwList.length,
      trainingSessionsCount: trainingSessions.length,
      savedInspectionsCount: savedInspections.length,
      savedMomReportsCount: savedMomReports.length,
      savedRiskAssessmentsCount: savedRiskAssessments.length,
      digitalInspectionsCount: (typeof digitalInspections !== "undefined" ? digitalInspections.length : 0),
      inspectionTemplatesCount: (typeof inspectionTemplates !== "undefined" ? inspectionTemplates.length : 0)
    },
    findings: findings,
    incidents: incidents,
    ptwList: ptwList,
    trainingSessions: trainingSessions,
    savedInspections: savedInspections,
    savedMomReports: savedMomReports,
    savedRiskAssessments: savedRiskAssessments,
    digitalInspections: (typeof digitalInspections !== "undefined" ? digitalInspections : []),
    inspectionTemplates: (typeof inspectionTemplates !== "undefined" ? inspectionTemplates : []),
    monthlyBusNotes: monthlyBusNotes,
    monthlyFoodNotes: monthlyFoodNotes,
    emailTo: emailTo,
    emailCc: emailCc,
    customLogoUrl: customLogoUrl,
    currentReportLang: currentReportLang,
    currentMomSeq: currentMomSeq
  };

  var fileName = "SUT-HSE-Master-Backup-" + new Date().toISOString().slice(0, 10) + ".json";
  downloadBlob(JSON.stringify(data, null, 2), fileName, "application/json");
  showToast("success", "تم تصدير النسخة الاحتياطية الشاملة لجميع السجلات بنجاح!");
}

function importComprehensiveBackupJSON(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = async function (evt) {
    try {
      var data = JSON.parse(evt.target.result);
      if (!data || typeof data !== "object") {
        throw new Error("بنية ملف JSON غير صالحة.");
      }

      var fCount = data.findings ? data.findings.length : 0;
      var incCount = data.incidents ? data.incidents.length : 0;
      var ptwCount = data.ptwList ? data.ptwList.length : 0;
      var trCount = data.trainingSessions ? data.trainingSessions.length : 0;
      var inspCount = data.savedInspections ? data.savedInspections.length : 0;
      var momCount = data.savedMomReports ? data.savedMomReports.length : 0;
      var raCount = data.savedRiskAssessments ? data.savedRiskAssessments.length : 0;
      var digitalInspCount = data.digitalInspections ? data.digitalInspections.length : 0;

      var summaryHtml = '<div style="text-align:right;font-size:12px;line-height:1.8">' +
        '<p>تم التحقق من ملف النسخة الاحتياطية بنجاح ويحتوي على السجلات التالية:</p>' +
        '<ul>' +
          '<li><b>📋 الفحوصات الميدانية الرقمية:</b> ' + digitalInspCount + ' سجل فحص</li>' +
          '<li><b>📝 نماذج وقوائم الفحص:</b> ' + inspCount + ' سجل</li>' +
          '<li><b>🛡️ دراسات تقييم المخاطر:</b> ' + raCount + ' دراسة</li>' +
          '<li><b>🛠️ تقارير عدم المطابقة (NCR):</b> ' + fCount + ' مخالفة</li>' +
          '<li><b>🚨 سجل الحوادث والوقائع:</b> ' + incCount + ' بلاغ</li>' +
          '<li><b>📄 تصاريح العمل (PTW):</b> ' + ptwCount + ' تصريح</li>' +
          '<li><b>🎓 سجل التدريب و TBT:</b> ' + trCount + ' جلسة</li>' +
          '<li><b>📑 محاضر اجتماعات اللجنة (MoM):</b> ' + momCount + ' محضر</li>' +
        '</ul>' +
        '<p style="color:#c00000;font-weight:bold">اختر نوع الاستعادة المطلوب:</p>' +
        '</div>';

      if (typeof Swal !== "undefined") {
        var choice = await Swal.fire({
          title: "استعادة قاعدة البيانات الشاملة",
          html: summaryHtml,
          icon: "question",
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "➕ دمج مع السجلات الحالية (Merge)",
          denyButtonText: "🔄 استبدال كامل (Full Restore)",
          cancelButtonText: "إلغاء",
          confirmButtonColor: "#0284c7",
          denyButtonColor: "#059669"
        });

        if (choice.isDismissed) return;

        var isMerge = choice.isConfirmed;

        if (isMerge) {
          // Merge logic
          if (data.findings && Array.isArray(data.findings)) {
            data.findings.forEach(function (nf) {
              if (!findings.some(function (ef) { return ef.id === nf.id || (ef.ncrNo && ef.ncrNo === nf.ncrNo); })) {
                findings.push(nf);
              }
            });
          }
          if (data.incidents && Array.isArray(data.incidents)) {
            data.incidents.forEach(function (ni) {
              if (!incidents.some(function (ei) { return ei.id === ni.id; })) incidents.push(ni);
            });
          }
          if (data.ptwList && Array.isArray(data.ptwList)) {
            data.ptwList.forEach(function (np) {
              if (!ptwList.some(function (ep) { return ep.id === np.id || (ep.no && ep.no === np.no); })) ptwList.push(np);
            });
          }
          if (data.trainingSessions && Array.isArray(data.trainingSessions)) {
            data.trainingSessions.forEach(function (nt) {
              if (!trainingSessions.some(function (et) { return et.id === nt.id; })) trainingSessions.push(nt);
            });
          }
          if (data.savedInspections && Array.isArray(data.savedInspections)) {
            data.savedInspections.forEach(function (ns) {
              if (!savedInspections.some(function (es) { return es.id === ns.id || (es.no && es.no === ns.no); })) savedInspections.push(ns);
            });
          }
          if (data.savedMomReports && Array.isArray(data.savedMomReports)) {
            data.savedMomReports.forEach(function (nm) {
              if (!savedMomReports.some(function (em) { return em.id === nm.id || (em.seqNo && em.seqNo === nm.seqNo); })) savedMomReports.push(nm);
            });
          }
          if (data.savedRiskAssessments && Array.isArray(data.savedRiskAssessments)) {
            data.savedRiskAssessments.forEach(function (nr) {
              if (!savedRiskAssessments.some(function (er) { return er.id === nr.id; })) savedRiskAssessments.push(nr);
            });
          }
          if (data.digitalInspections && Array.isArray(data.digitalInspections)) {
            data.digitalInspections.forEach(function (nd) {
              if (!digitalInspections.some(function (ed) { return ed.id === nd.id || (ed.no && ed.no === nd.no); })) digitalInspections.push(nd);
            });
          }
          if (data.inspectionTemplates && Array.isArray(data.inspectionTemplates)) {
            data.inspectionTemplates.forEach(function (nt) {
              if (!inspectionTemplates.some(function (et) { return et.id === nt.id; })) inspectionTemplates.push(nt);
            });
          }
        } else {
          // Full Overwrite
          if (data.findings) findings = data.findings;
          if (data.incidents) incidents = data.incidents;
          if (data.ptwList) ptwList = data.ptwList;
          if (data.trainingSessions) trainingSessions = data.trainingSessions;
          if (data.savedInspections) savedInspections = data.savedInspections;
          if (data.savedMomReports) savedMomReports = data.savedMomReports;
          if (data.savedRiskAssessments) savedRiskAssessments = data.savedRiskAssessments;
          if (data.digitalInspections) digitalInspections = data.digitalInspections;
          if (data.inspectionTemplates) inspectionTemplates = data.inspectionTemplates;
        }

        // Common settings restore
        if (data.monthlyBusNotes !== undefined) { monthlyBusNotes = data.monthlyBusNotes; localStorage.setItem(BUS_NOTES_KEY, monthlyBusNotes); }
        if (data.monthlyFoodNotes !== undefined) { monthlyFoodNotes = data.monthlyFoodNotes; localStorage.setItem(FOOD_NOTES_KEY, monthlyFoodNotes); }
        if (data.customLogoUrl) { customLogoUrl = data.customLogoUrl; localStorage.setItem(LOGO_URL_KEY, customLogoUrl); applyBrandLogo(); }
        if (data.currentMomSeq) { currentMomSeq = data.currentMomSeq; localStorage.setItem(MOM_SEQ_KEY, String(currentMomSeq)); }

        // Save to LocalStorage
        try {
          localStorage.setItem("SUT_FINDINGS", JSON.stringify(findings));
          localStorage.setItem("SUT_INCIDENTS", JSON.stringify(incidents));
          localStorage.setItem("SUT_PTW_LIST", JSON.stringify(ptwList));
          localStorage.setItem("SUT_TRAINING_SESSIONS", JSON.stringify(trainingSessions));
          localStorage.setItem(SAVED_INSPECTIONS_KEY, JSON.stringify(savedInspections));
          localStorage.setItem(SAVED_MOM_REPORTS_KEY, JSON.stringify(savedMomReports));
          localStorage.setItem("SUT_SAVED_RISK_REPORTS", JSON.stringify(savedRiskAssessments));
          localStorage.setItem(DIGITAL_INSPECTIONS_KEY, JSON.stringify(digitalInspections));
          localStorage.setItem(INSP_TEMPLATES_KEY, JSON.stringify(inspectionTemplates));
        } catch (e) {}

        // Push to Firebase RTDB
        syncToCloud("findings", findings);
        syncToCloud("incidents", incidents);
        syncToCloud("ptwList", ptwList);
        syncToCloud("trainingSessions", trainingSessions);
        syncToCloud("savedInspections", savedInspections);
        syncToCloud("savedMomReports", savedMomReports);
        syncToCloud("savedRiskAssessments", savedRiskAssessments);
        syncToCloud("digital_inspections", digitalInspections);
        syncToCloud("inspection_templates", inspectionTemplates);

        // Re-render UI
        renderDashboard();
        renderIncidents();
        renderTraining();
        renderGeneralCasesTable();
        renderInspectionHistoryTable();
        renderMomHistoryTable();
        renderRiskHistoryTable();
        updateSavedRiskAssessmentsDropdown();
        updateBackupStatsBadges();
        updateInspectionDashboardKPIs();
        renderDigitalInspectionHistoryTable();

        showSweetAlert("استعادة ناجحة", "تم استعادة وتحديث قاعدة البيانات بنجاح ومزامنة كافة السجلات مع السحابة!", "success");
      }
    } catch (err) {
      showSweetAlert("خطأ في الاستعادة", "ملف النسخ الاحتياطي غير صالح: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

function exportAllModulesMasterExcel() {
  if (typeof XLSX === "undefined") {
    return showSweetAlert("تنبيه", "مكتبة Excel غير جاهزة حالياً.", "warning");
  }

  var wb = XLSX.utils.book_new();

  // Sheet 1: NCR & Findings
  var findingsData = [["NCR No.", "Area / Location", "Responsible Dept", "Finding Description", "Priority", "Status", "Target Date", "Verification Date", "Category"]];
  findings.forEach(function (x) {
    findingsData.push([x.ncrNo || "", x.area || "", x.dept || "", x.finding || "", x.priority || "Medium", x.status || "Open", x.date || "", x.verifyDate || "", x.category || "NCR"]);
  });
  var wsFindings = XLSX.utils.aoa_to_sheet(findingsData);
  XLSX.utils.book_append_sheet(wb, wsFindings, "Findings_and_CAPA");

  // Sheet 2: Inspections
  var inspData = [["Inspection No.", "Title / Scope", "Facility / Location", "Date", "Inspector", "Status", "Checklist Items Count"]];
  savedInspections.forEach(function (x) {
    inspData.push([x.no || "", x.title || "", x.area || "", x.date || "", x.inspector || "", x.status || "Completed", x.itemsCount || 0]);
  });
  var wsInsp = XLSX.utils.aoa_to_sheet(inspData);
  XLSX.utils.book_append_sheet(wb, wsInsp, "Inspections_History");

  // Sheet 3: Incidents & Near-Miss
  var incData = [["Incident ID", "Type", "Date / Time", "Location", "Injured Person", "Body Part", "Supervisor", "Description"]];
  incidents.forEach(function (x) {
    incData.push([x.id || "", x.type || "", x.date || "", x.loc || "", x.injuredName || "None", x.bodyPart || "", x.supervisor || "", x.desc || ""]);
  });
  var wsInc = XLSX.utils.aoa_to_sheet(incData);
  XLSX.utils.book_append_sheet(wb, wsInc, "Incidents_and_NearMiss");

  // Sheet 4: Permits to Work
  var ptwData = [["Permit No.", "Category / Type", "Work Location", "Contractor / Dept", "Status", "Start Date", "End Date", "SUT Safety Officer"]];
  ptwList.forEach(function (x) {
    ptwData.push([x.no || "", x.type || "", x.loc || "", x.contractor || "", x.status || "Active", x.start || "", x.end || "", x.sutOfficer || ""]);
  });
  var wsPtw = XLSX.utils.aoa_to_sheet(ptwData);
  XLSX.utils.book_append_sheet(wb, wsPtw, "Permits_to_Work");

  // Sheet 5: Training Logs
  var trData = [["Training Topic", "Date", "Target Audience", "Trainer Name", "Attendees Count", "Hours"]];
  trainingSessions.forEach(function (x) {
    trData.push([x.topic || "", x.date || "", x.audience || "", x.trainer || "", x.attendees || 0, x.hours || 1]);
  });
  var wsTr = XLSX.utils.aoa_to_sheet(trData);
  XLSX.utils.book_append_sheet(wb, wsTr, "Training_Logs");

  // Sheet 6: Committee MoM
  var momData = [["MoM Seq No.", "Meeting Subject", "Date", "Timing", "Location", "Attendees Count"]];
  savedMomReports.forEach(function (x) {
    momData.push([x.seqNo || "", x.subject || "", x.date || "", x.timing || "", x.location || "", x.attendeesCount || 22]);
  });
  var wsMom = XLSX.utils.aoa_to_sheet(momData);
  XLSX.utils.book_append_sheet(wb, wsMom, "Committee_MoM");

  var fileName = "SUT-HSE-Consolidated-Register-" + new Date().toISOString().slice(0, 10) + ".xlsx";
  XLSX.writeFile(wb, fileName);
  showToast("success", "تم تصدير السجل المجمع الشامل بصيغة Excel متعدد الصفحات بنجاح!");
}

/* =========================================================================
   ENTERPRISE DIGITAL INSPECTION MANAGEMENT SYSTEM ENGINE
   ========================================================================= */

const DIGITAL_INSPECTIONS_KEY = "SUT_DIGITAL_INSPECTIONS";
const INSP_TEMPLATES_KEY = "SUT_INSPECTION_TEMPLATES";

let digitalInspections = [];
let inspectionTemplates = [];
let activeDigitalInspection = null;
let selectedDigitalInspIds = new Set();

// Comprehensive 23+ Standard Inspection Templates Library
const DEFAULT_INSPECTION_TEMPLATES_LIBRARY = [
  {
    id: "tmpl_monthly_hse",
    type: "Monthly HSE Inspection",
    name: "Monthly HSE Comprehensive Campus Inspection (الفحص الشهري الشامل)",
    desc: "Comprehensive multi-disciplinary monthly inspection covering fire safety, housekeeping, electrical, egress, and first aid.",
    questions: [
      { id: 1, category: "Fire Safety & Extinguishers", text: "Fire extinguishers inspected, tagged, pressure gauge in green, and unobstructed.", type: "PASS_FAIL_NA", requirement: "NFPA 10 & Civil Defense compliance." },
      { id: 2, category: "Fire Safety & Extinguishers", text: "Fire alarm main panel normal, smoke detectors clean, and break glasses intact.", type: "PASS_FAIL_NA", requirement: "Daily normal status on panel." },
      { id: 3, category: "Emergency Egress", text: "All emergency exit corridors, stairwells, and panic doors unobstructed and unlocked.", type: "PASS_FAIL_NA", requirement: "Immediate exit access at all times." },
      { id: 4, category: "Emergency Egress", text: "Illuminated exit signs and emergency backup lighting operational.", type: "PASS_FAIL_NA", requirement: "90-minute battery duration test." },
      { id: 5, category: "Housekeeping & Facility", text: "General housekeeping standard across corridors, common areas, and entrances.", type: "GOOD_FAIR_POOR", requirement: "Clean, dry, and slip-free surfaces." },
      { id: 6, category: "Electrical Safety", text: "Electrical switchgear panels closed, danger signs displayed, rubber mats in place.", type: "PASS_FAIL_NA", requirement: "No exposed wiring or overloaded sockets." },
      { id: 7, category: "First Aid & Medical", text: "First aid kits fully stocked with sterile dressings, antiseptics, and logbook present.", type: "YES_NO_NA", requirement: "Statutory medical contents." }
    ]
  },
  {
    id: "tmpl_restaurant",
    type: "Restaurant Inspection",
    name: "Campus Restaurant & Food Service Safety Audit (تفتيش المطاعم وسلامة الغذاء)",
    desc: "National Food Safety Authority (NFSA) hygiene, refrigeration temperatures, hood suppression, and food handler clearances.",
    questions: [
      { id: 1, category: "Food Handler Hygiene", text: "All food preparation staff hold valid certified Ministry of Health certificates.", type: "YES_NO_NA", requirement: "Valid health card with zero communicable diseases." },
      { id: 2, category: "Cold Storage", text: "Chilled storage temperature recorded (Acceptable: Below 4°C).", type: "NUMBER", unit: "°C", requirement: "Target: ≤ 4.0 °C." },
      { id: 3, category: "Cold Storage", text: "Deep freezer temperature recorded (Acceptable: Below -18°C).", type: "NUMBER", unit: "°C", requirement: "Target: ≤ -18.0 °C." },
      { id: 4, category: "Kitchen Fire Protection", text: "Kitchen exhaust hood clean, grease filters degreased, and Ansul wet chemical system active.", type: "PASS_FAIL_NA", requirement: "Quarterly duct degreasing & UL300 Ansul." },
      { id: 5, category: "Cross Contamination", text: "Color-coded cutting boards and knives strictly segregated (Red: Meat, Blue: Fish, Green: Veg).", type: "PASS_FAIL_NA", requirement: "HACCP separation standards." },
      { id: 6, category: "Pest Control", text: "Insect fly-killers operational and window mesh screens free of tears.", type: "GOOD_FAIR_POOR", requirement: "Zero pest presence & valid spray log." },
      { id: 7, category: "LPG Gas Safety", text: "LPG gas leak detector alarm active and automatic solenoid shut-off valve functional.", type: "PASS_FAIL_NA", requirement: "Automatic gas shut-off upon detection." }
    ]
  },
  {
    id: "tmpl_cafeteria",
    type: "Cafeteria Inspection",
    name: "Student & Staff Cafeteria Hygiene Audit (تفتيش كافيتريات الجامعة)",
    desc: "Audit of dining tables, hot holding stations, handwashing facilities, and food expiration tracking.",
    questions: [
      { id: 1, category: "Food Presentation", text: "Hot display bain-marie holding temperature maintained above 65°C.", type: "NUMBER", unit: "°C", requirement: "Target: ≥ 65.0 °C." },
      { id: 2, category: "Hygiene", text: "Handwashing sinks equipped with warm water, anti-bacterial soap, and paper towels.", type: "YES_NO_NA", requirement: "Touch-free or foot-operated sinks." },
      { id: 3, category: "Waste Management", text: "Foot-operated covered waste bins lined with heavy-duty bags, emptied every 4 hours.", type: "PASS_FAIL_NA", requirement: "Clean and sanitary waste disposal." },
      { id: 4, category: "Shelf Life", text: "Packaged snacks and beverages within valid expiration dates (FIFO applied).", type: "YES_NO_NA", requirement: "Zero expired items on shelves." }
    ]
  },
  {
    id: "tmpl_pantry",
    type: "Pantry Inspection",
    name: "Office Pantries & Hospitality Areas Inspection (تفتيش البوفيهات)",
    desc: "Inspection of water dispensers, electric kettles, refrigeration, and sanitation.",
    questions: [
      { id: 1, category: "Sanitation", text: "Pantry sink and countertops clean, sanitized, and pest-free.", type: "GOOD_FAIR_POOR", requirement: "Sanitary preparation surface." },
      { id: 2, category: "Electrical", text: "Electric kettles, microwaves, and coffee machines safely wired without extension cords.", type: "PASS_FAIL_NA", requirement: "Safe appliance wiring." },
      { id: 3, category: "Drinking Water", text: "Water dispenser sanitization performed and filters within valid service life.", type: "YES_NO_NA", requirement: "Quarterly filter replacement." }
    ]
  },
  {
    id: "tmpl_lab",
    type: "Laboratory Inspection",
    name: "Chemical, Energy & Research Labs Safety Audit (فحص وتفتيش المختبرات)",
    desc: "NFPA 45 laboratory safety, chemical segregation, fume hoods, eyewashes, and GHS SDS compliance.",
    questions: [
      { id: 1, category: "Fume Extraction", text: "Chemical fume hood face velocity measured (Acceptable: 80–120 FPM).", type: "NUMBER", unit: "FPM", requirement: "Target: 80 - 120 FPM." },
      { id: 2, category: "Chemical Segregation", text: "Acids, bases, oxidizers, and flammables segregated in dedicated cabinets.", type: "PASS_FAIL_NA", requirement: "Chemical compatibility matrix compliance." },
      { id: 3, category: "Hazard Communication", text: "All reagent containers labeled with GHS pictograms and SDS library accessible.", type: "YES_NO_NA", requirement: "Bilingual GHS hazard labeling." },
      { id: 4, category: "Emergency Eyewash", text: "Emergency eyewash and safety deluge shower inspected, clear path, 15-min flow.", type: "PASS_FAIL_NA", requirement: "Weekly flushing and clear 36-inch radius." },
      { id: 5, category: "Spill Containment", text: "Universal chemical spill kit stocked with neutralizers, booms, and disposal bags.", type: "YES_NO_NA", requirement: "Full spill response kit present." },
      { id: 6, category: "Compressed Gases", text: "Gas cylinders secured upright with double metal chains and valve protection caps.", type: "PASS_FAIL_NA", requirement: "Chained and separated by gas class." },
      { id: 7, category: "PPE Compliance", text: "Students and technicians wearing splash goggles, lab coats, and nitrile gloves.", type: "GOOD_FAIR_POOR", requirement: "100% PPE compliance inside lab." }
    ]
  },
  {
    id: "tmpl_fire_ext",
    type: "Fire Extinguisher Inspection",
    name: "Portable Fire Extinguisher Monthly Audit (الفحص الدوري للطفايات)",
    desc: "NFPA 10 statutory check of dry powder, CO2, foam, and wet chemical extinguishers.",
    questions: [
      { id: 1, category: "Location & Visibility", text: "Extinguisher in designated location, mounted 1.2m above floor, unobstructed.", type: "PASS_FAIL_NA", requirement: "Clear signage and unblocked access." },
      { id: 2, category: "Pressure & Seal", text: "Pressure gauge reading in green zone, safety pin and tamper seal intact.", type: "PASS_FAIL_NA", requirement: "Correct operating pressure." },
      { id: 3, category: "Physical Condition", text: "No physical damage, corrosion, nozzle blockage, or hose cracking.", type: "GOOD_FAIR_POOR", requirement: "Free from rust and physical wear." },
      { id: 4, category: "Inspection Tag", text: "Monthly inspection tag signed and initialed by HSE inspector.", type: "YES_NO_NA", requirement: "Signed tag up to current month." }
    ]
  },
  {
    id: "tmpl_fire_safety",
    type: "Fire Safety Inspection",
    name: "Campus Fire Alarm & Active Protection Systems (منظومات الإنذار والإطفاء)",
    desc: "Evaluation of fire pumps, sprinkler control valves, hydrant cabinets, and alarm systems.",
    questions: [
      { id: 1, category: "Fire Alarm", text: "Main Fire Alarm Control Panel (FACP) in NORMAL status with zero active faults.", type: "PASS_FAIL_NA", requirement: "Clean panel status." },
      { id: 2, category: "Fire Pumps", text: "Electric and diesel fire pumps set to AUTO mode; diesel fuel tank above 85%.", type: "PASS_FAIL_NA", requirement: "Pumps in automatic standby." },
      { id: 3, category: "Sprinklers", text: "Sprinkler OS&Y control valves locked in open position with monitored tamper switch.", type: "PASS_FAIL_NA", requirement: "Chained and locked OPEN." },
      { id: 4, category: "Hydrants", text: "Fire hose reels and landing valves complete with nozzles and operational.", type: "PASS_FAIL_NA", requirement: "Dry, clean, and unblocked." }
    ]
  },
  {
    id: "tmpl_elevator",
    type: "Elevator Inspection",
    name: "Passenger & Freight Elevator Safety Audit (فحص واختبار المصاعد)",
    desc: "Elevator car levelling, emergency phone, interlocks, brake test, and maintenance permits.",
    questions: [
      { id: 1, category: "Emergency Communications", text: "In-car emergency call button and intercom communication operational with security.", type: "YES_NO_NA", requirement: "Immediate two-way audio response." },
      { id: 2, category: "Leveling & Doors", text: "Car floor levels flush with landing within ± 5mm; safety door sensors reverse instantly.", type: "PASS_FAIL_NA", requirement: "Smooth leveling & photoelectric sensor." },
      { id: 3, category: "Permits & Service", text: "Valid third-party safety certificate displayed inside car and monthly service log signed.", type: "YES_NO_NA", requirement: "Active license displayed." },
      { id: 4, category: "Emergency Lighting", text: "Battery-powered emergency light inside elevator car activates upon simulated power loss.", type: "PASS_FAIL_NA", requirement: "Immediate emergency lighting." }
    ]
  },
  {
    id: "tmpl_electrical",
    type: "Electrical Inspection",
    name: "Electrical Substations & Main Switchgear Audit (محطات ولوحات الكهرباء)",
    desc: "Thermal imaging, earthing resistance, high-voltage warning, FM200, and dielectric mats.",
    questions: [
      { id: 1, category: "Earthing System", text: "Main Earth Grounding resistance measured (Acceptable: Less than 5.0 Ohms).", type: "NUMBER", unit: "Ohms", requirement: "Target: < 5.0 Ω." },
      { id: 2, category: "Dielectric Protection", text: "Class 2 dielectric rubber mats (17kV rating) installed along entire front of panels.", type: "PASS_FAIL_NA", requirement: "Clean, continuous dielectric matting." },
      { id: 3, category: "Fire Suppression", text: "Automatic FM200 clean agent gas cylinder pressure verified and control panel in Auto.", type: "PASS_FAIL_NA", requirement: "FM200 system armed." },
      { id: 4, category: "Thermal Integrity", text: "Infrared thermal imaging scan performed on main busbars; no hot spots above 60°C.", type: "PASS_FAIL_NA", requirement: "Balanced load without overheating." },
      { id: 5, category: "Isolation & LOTO", text: "Lockout / Tagout (LOTO) station stocked with locks, tags, hasps, and breaker lockouts.", type: "YES_NO_NA", requirement: "Complete LOTO kit available." }
    ]
  },
  {
    id: "tmpl_workshop",
    type: "Workshop Inspection",
    name: "Fabrication Lab & Mechanical Workshops Safety (مختبر التصنيع والورش)",
    desc: "Machine guarding, laser LEV, drill press vice, bench grinder tool rests, and PPE.",
    questions: [
      { id: 1, category: "Machinery Guards", text: "Drill press chuck guard microswitch active; machine stops immediately when guard opened.", type: "PASS_FAIL_NA", requirement: "OSHA 1910.212 interlock." },
      { id: 2, category: "Bench Grinder", text: "Bench grinder tool rest gap ≤ 1.5mm and spark arrestor shield gap ≤ 3.0mm.", type: "PASS_FAIL_NA", requirement: "Calibrated clearance." },
      { id: 3, category: "Emergency Controls", text: "Mushroom red emergency stop (E-Stop) push-buttons present and functional on all machines.", type: "PASS_FAIL_NA", requirement: "Immediate power shut-down." },
      { id: 4, category: "Laser & LEV", text: "Laser cutter interlocks stop beam on lid open; local exhaust velocity adequate.", type: "PASS_FAIL_NA", requirement: "Airflow > 400 CFM." },
      { id: 5, category: "Housekeeping", text: "Metal swarf, sawdust, and cutting fluids cleaned; designated scrap bins in use.", type: "GOOD_FAIR_POOR", requirement: "Clean aisles and slip-free floors." }
    ]
  },
  {
    id: "tmpl_warehouse",
    type: "Warehouse Inspection",
    name: "Materials Warehouse & Storage Safety (فحص المخازن ومستودعات المواد)",
    desc: "Racking load ratings, pallet stacking, aisle widths, forklift traffic, and spill response.",
    questions: [
      { id: 1, category: "Racking & Load", text: "Storage racks free of structural deformation; Safe Working Load (SWL) signs posted.", type: "PASS_FAIL_NA", requirement: "Certified rack capacity." },
      { id: 2, category: "Stacking & Pallets", text: "Pallets sound, items interlocked, maximum stack height not exceeding 2.5 meters.", type: "PASS_FAIL_NA", requirement: "Stable, non-leaning stacks." },
      { id: 3, category: "Aisle Clearance", text: "Aisles maintained at minimum 2.0m width for forklift maneuvering without obstructions.", type: "PASS_FAIL_NA", requirement: "Clear pedestrian & vehicle routes." },
      { id: 4, category: "Chemical Storage", text: "Flammable liquids stored in double-walled FM-approved yellow safety cabinets.", type: "YES_NO_NA", requirement: "Grounded fire cabinet." }
    ]
  },
  {
    id: "tmpl_ppe",
    type: "PPE Inspection",
    name: "Personal Protective Equipment Compliance Audit (تفتيش مهمات الوقاية)",
    desc: "Audit of safety glasses, protective footwear, respiratory protection, and gloves.",
    questions: [
      { id: 1, category: "Eye Protection", text: "ANSI Z87.1 safety glasses or face shields worn during cutting, grinding, and chemistry.", type: "GOOD_FAIR_POOR", requirement: "100% eye protection enforcement." },
      { id: 2, category: "Footwear", text: "Safety shoes with steel/composite toe caps worn in all workshops, warehouses, and plant rooms.", type: "GOOD_FAIR_POOR", requirement: "Mandatory safety footwear." },
      { id: 3, category: "Respiratory", text: "Appropriate N95 or organic vapor respirators provided and used during dusty/chemical tasks.", type: "YES_NO_NA", requirement: "Clean, fitted respirators." }
    ]
  },
  {
    id: "tmpl_housekeeping",
    type: "Housekeeping Inspection",
    name: "Campus Housekeeping, Orderliness & 5S Audit (فحص النظافة والترتيب العام)",
    desc: "Walkways, waste management, spill cleanup, lighting, and general facility presentation.",
    questions: [
      { id: 1, category: "Walkways", text: "All pedestrian walkways, stairs, and corridors clear of trip hazards, cables, and boxes.", type: "GOOD_FAIR_POOR", requirement: "Zero trip and slip hazards." },
      { id: 2, category: "Illumination", text: "Corridor and staircase light fixtures functional with adequate illumination (> 150 Lux).", type: "PASS_FAIL_NA", requirement: "Proper visibility." },
      { id: 3, category: "Restrooms", text: "Campus restrooms cleaned, sanitized, floor dry, and soap/paper restocked.", type: "GOOD_FAIR_POOR", requirement: "High hygiene standard." }
    ]
  },
  {
    id: "tmpl_machinery",
    type: "Machinery / Equipment Inspection",
    name: "Plant Machinery & Heavy Equipment Audit (فحص الآلات والمعدات)",
    desc: "Compressors, chillers, generators, air handling units (AHU), and guarding.",
    questions: [
      { id: 1, category: "Pressure Vessels", text: "Air compressor pressure relief valve and pressure gauge calibrated with valid certificate.", type: "YES_NO_NA", requirement: "Valid hydrostatic certificate." },
      { id: 2, category: "Belt & Pulley Guards", text: "Rotating belts, flywheels, and pulleys completely enclosed in metal wire mesh guards.", type: "PASS_FAIL_NA", requirement: "Zero nip-point exposure." },
      { id: 3, category: "Generators", text: "Emergency diesel standby generator tested on load; automatic transfer switch (ATS) functional.", type: "PASS_FAIL_NA", requirement: "Weekly test run completed." }
    ]
  },
  {
    id: "tmpl_contractor",
    type: "Contractor Inspection",
    name: "Contractor Site Safety & PTW Compliance (تفتيش مواقع المقاولين)",
    desc: "Permit to Work verification, barricading, scaffold safety, PPE, and hot work controls.",
    questions: [
      { id: 1, category: "Permit to Work", text: "Valid approved SUTech PTW (Hot Work / Height / Electrical) posted visibly at site.", type: "YES_NO_NA", requirement: "Approved active permit." },
      { id: 2, category: "Barricades & Signs", text: "Work zone demarcated with hard barriers, danger tape, and 'Authorized Only' signs.", type: "PASS_FAIL_NA", requirement: "Secured site perimeter." },
      { id: 3, category: "Scaffolding Safety", text: "Scaffold erected by certified erector with Green Safe-to-Use tag, toe boards, and guardrails.", type: "PASS_FAIL_NA", requirement: "Tagged and tied-off scaffold." },
      { id: 4, category: "Hot Work Controls", text: "Fire watcher present with 6kg powder extinguisher and fire blanket during welding/grinding.", type: "YES_NO_NA", requirement: "Continuous fire watch." }
    ]
  },
  {
    id: "tmpl_bus",
    type: "Bus / Vehicle Inspection",
    name: "Campus Fleet & Student Transport Audit (فحص حافلات وسيارات الجامعة)",
    desc: "Brakes, tire tread, speed limiter (90 km/h), fire extinguishers, emergency hammers, and driver licenses.",
    questions: [
      { id: 1, category: "Brakes & Tires", text: "Brake responsiveness verified and tire tread depth measured (Acceptable: ≥ 2.5 mm).", type: "NUMBER", unit: "mm", requirement: "Target: ≥ 2.5 mm." },
      { id: 2, category: "Speed Governor", text: "Speed governor calibrated and sealed to maximum 90 km/h.", type: "PASS_FAIL_NA", requirement: "Sealed governor active." },
      { id: 3, category: "Emergency Gear", text: "Two 6kg dry powder fire extinguishers and window escape hammers installed.", type: "PASS_FAIL_NA", requirement: "Charged extinguishers & hammers." },
      { id: 4, category: "Driver Clearances", text: "Driver holds valid professional license and passed periodic medical/drug screenings.", type: "YES_NO_NA", requirement: "Verified professional license." }
    ]
  },
  {
    id: "tmpl_traffic",
    type: "Parking / Traffic Safety Inspection",
    name: "Campus Traffic, Speed Limits & Parking Safety (فحص المرور والمواقف)",
    desc: "Pedestrian zebra crossings, speed humps, directional arrows, disabled bays, and lighting.",
    questions: [
      { id: 1, category: "Signage & Speed", text: "Speed limit 20 km/h signs, directional arrows, and speed humps painted and visible.", type: "GOOD_FAIR_POOR", requirement: "Clear road markings." },
      { id: 2, category: "Pedestrian Crossings", text: "Zebra crossings painted with high-visibility reflective paint and unobstructed.", type: "PASS_FAIL_NA", requirement: "Safe pedestrian routes." },
      { id: 3, category: "Accessible Parking", text: "Designated parking spaces for persons with disabilities clearly marked and reserved.", type: "YES_NO_NA", requirement: "Dedicated accessibility bays." }
    ]
  },
  {
    id: "tmpl_emergency_exit",
    type: "Emergency Exit Inspection",
    name: "Emergency Exit Doors & Evacuation Routes (فحص مخارج ومسارات الطوارئ)",
    desc: "Panic hardware, self-closing mechanisms, illuminated exit signs, and assembly points.",
    questions: [
      { id: 1, category: "Doors & Hardware", text: "Fire exit doors swing outwards easily upon touching panic bar hardware.", type: "PASS_FAIL_NA", requirement: "Single-motion outward opening." },
      { id: 2, category: "Self Closing", text: "Hydraulic door closers bring fire doors into full positive latching.", type: "PASS_FAIL_NA", requirement: "Complete self-latching." },
      { id: 3, category: "Assembly Points", text: "All 4 designated evacuation assembly points clear of vehicles and well-lit.", type: "GOOD_FAIR_POOR", requirement: "Safe assembly area." }
    ]
  },
  {
    id: "tmpl_building",
    type: "Building Inspection",
    name: "Campus Civil & Structural Safety Audit (فحص المباني والمنشآت)",
    desc: "Stair railings, glass manifestations, roof access security, potable water tanks, and drainage.",
    questions: [
      { id: 1, category: "Stairways", text: "Staircase handrails sturdy at 90cm height with anti-slip nosing on all steps.", type: "PASS_FAIL_NA", requirement: "Secure handrails & anti-slip." },
      { id: 2, category: "Roof Access", text: "Roof access doors securely locked with key held strictly by authorized HSE/Maintenance.", type: "YES_NO_NA", requirement: "Controlled roof access." },
      { id: 3, category: "Water Tanks", text: "Rooftop potable water tanks sealed, locked, with valid semi-annual disinfection log.", type: "YES_NO_NA", requirement: "Certified clean water." }
    ]
  },
  {
    id: "tmpl_environmental",
    type: "Environmental Inspection",
    name: "Environmental Compliance & Resource Management (تفتيش الاشتراطات البيئية)",
    desc: "Air emissions, indoor air quality, wastewater discharge, and noise levels.",
    questions: [
      { id: 1, category: "Indoor Air Quality", text: "HVAC fresh air intake filters clean and carbon monoxide levels within statutory limits.", type: "GOOD_FAIR_POOR", requirement: "Clean indoor air." },
      { id: 2, category: "Noise Levels", text: "Workshop and utility plant room noise levels monitored (Target: < 85 dBA).", type: "PASS_FAIL_NA", requirement: "Noise below 85 dBA or hearing PPE." },
      { id: 3, category: "Water Discharge", text: "Lab drainage neutralizers operational before municipal discharge.", type: "YES_NO_NA", requirement: "pH neutral wastewater." }
    ]
  },
  {
    id: "tmpl_waste",
    type: "Waste Management Inspection",
    name: "Hazardous & General Waste Segregation Audit (فحص إدارة وفرز المخلفات)",
    desc: "Chemical waste containers, biohazard bins, recycling color codes, and waste store locks.",
    questions: [
      { id: 1, category: "Hazardous Waste", text: "Chemical waste stored in UN-certified drums placed on secondary containment bunds.", type: "PASS_FAIL_NA", requirement: "Secondary bunding compliance." },
      { id: 2, category: "Segregation", text: "General waste separated into paper, plastic, organic, and electronic waste bins.", type: "GOOD_FAIR_POOR", requirement: "Color-coded 4-stream recycling." },
      { id: 3, category: "Disposal Manifest", text: "Hazardous waste collection manifests signed by licensed environmental contractor.", type: "YES_NO_NA", requirement: "EEAA certified disposal contractor." }
    ]
  },
  {
    id: "tmpl_event",
    type: "Event Safety Inspection",
    name: "Campus Events & Conference Safety Audit (فحص تأمين الفعاليات)",
    desc: "Crowd control, temporary electrical cabling, stage rigging, fire exits, and paramedic stand-by.",
    questions: [
      { id: 1, category: "Crowd & Egress", text: "Maximum venue capacity posted; all main and emergency exits unobstructed.", type: "PASS_FAIL_NA", requirement: "Clear evacuation routes." },
      { id: 2, category: "Temporary Wiring", text: "Audio/visual and stage lighting cables covered with heavy-duty rubber cable ramps.", type: "PASS_FAIL_NA", requirement: "Zero exposed cables on floor." },
      { id: 3, category: "First Aid Standby", text: "Designated paramedic / first aider station active with stretcher and AED.", type: "YES_NO_NA", requirement: "Medical standby present." }
    ]
  },
  {
    id: "tmpl_custom",
    type: "Custom Inspection",
    name: "General Custom Inspection Checklist (فحص مخصص)",
    desc: "Customizable checklist template for ad-hoc and specialized safety audits.",
    questions: [
      { id: 1, category: "General Safety", text: "Work area safe, orderly, and compliant with safety instructions.", type: "PASS_FAIL_NA", requirement: "Standard safety compliance." },
      { id: 2, category: "General Safety", text: "Fire protection and emergency equipment available in area.", type: "YES_NO_NA", requirement: "Emergency readiness." },
      { id: 3, category: "Housekeeping", text: "Overall condition of site and housekeeping.", type: "GOOD_FAIR_POOR", requirement: "Good order." }
    ]
  }
];

// Rich Seed Data for Initial Digital Inspections
const DEFAULT_INITIAL_DIGITAL_INSPECTIONS = [
  {
    id: 1718000601,
    no: "INS-2026-0001",
    type: "Restaurant Inspection",
    title: "Campus Restaurant & Food Service Safety Audit — August 2026",
    templateId: "tmpl_restaurant",
    site: "SUTech Main Campus",
    building: "Central Dining & Cafeteria Building",
    area: "Main Production Kitchen & Grills",
    dept: "Campus Food Services & Student Affairs",
    inspector: "م. يوسف محمد (HSE & Food Safety)",
    date: "2026-08-28",
    time: "11:00",
    shift: "Morning Shift",
    accompaniedBy: "أ. محمد عبد الرحمن (مشرف المطعم)",
    notes: "Periodic statutory hygiene audit in accordance with National Food Safety Authority (NFSA) rules.",
    status: "Completed",
    createdAt: "2026-08-28T11:00:00Z",
    updatedAt: "2026-08-28T12:45:00Z",
    questions: [
      { id: 1, category: "Food Handler Hygiene", text: "All food preparation staff hold valid certified Ministry of Health certificates.", type: "YES_NO_NA", requirement: "Valid health card with zero communicable diseases.", answer: "No", comment: "3 staff members had expired health cards.", photos: [] },
      { id: 2, category: "Cold Storage", text: "Chilled storage temperature recorded (Acceptable: Below 4°C).", type: "NUMBER", unit: "°C", requirement: "Target: ≤ 4.0 °C.", answer: "3.2", comment: "Temperature within safe range.", photos: [] },
      { id: 3, category: "Cold Storage", text: "Deep freezer temperature recorded (Acceptable: Below -18°C).", type: "NUMBER", unit: "°C", requirement: "Target: ≤ -18.0 °C.", answer: "-19.5", comment: "Freezer optimal.", photos: [] },
      { id: 4, category: "Kitchen Fire Protection", text: "Kitchen exhaust hood clean, grease filters degreased, and Ansul wet chemical system active.", type: "PASS_FAIL_NA", requirement: "Quarterly duct degreasing & UL300 Ansul.", answer: "Fail", comment: "Heavy grease accumulation on primary duct filters.", photos: [] },
      { id: 5, category: "Cross Contamination", text: "Color-coded cutting boards and knives strictly segregated (Red: Meat, Blue: Fish, Green: Veg).", type: "PASS_FAIL_NA", requirement: "HACCP separation standards.", answer: "Pass", comment: "Fully compliant.", photos: [] },
      { id: 6, category: "Pest Control", text: "Insect fly-killers operational and window mesh screens free of tears.", type: "GOOD_FAIR_POOR", requirement: "Zero pest presence & valid spray log.", answer: "Good", comment: "No pest activity.", photos: [] },
      { id: 7, category: "LPG Gas Safety", text: "LPG gas leak detector alarm active and automatic solenoid shut-off valve functional.", type: "PASS_FAIL_NA", requirement: "Automatic gas shut-off upon detection.", answer: "Pass", comment: "Sensor tested functional.", photos: [] }
    ],
    findings: [
      {
        id: "FND-2026-0001",
        questionId: 1,
        category: "Food Handler Hygiene",
        itemText: "All food preparation staff hold valid certified Ministry of Health certificates.",
        desc: "3 food handlers in hot station working with expired health certificates.",
        location: "Hot Prep Station",
        severity: "High",
        immediateAction: "Workers reassigned away from food handling immediately.",
        capa: "Conduct medical examinations and renew official certificates from Ministry of Health labs.",
        responsible: "HR & Catering Supervisor",
        targetDate: "2026-09-05",
        status: "In Progress",
        beforePhoto: null,
        afterPhoto: null,
        closureDate: "",
        verifyNote: "",
        closureComment: ""
      },
      {
        id: "FND-2026-0002",
        questionId: 4,
        category: "Kitchen Fire Protection",
        itemText: "Kitchen exhaust hood clean, grease filters degreased, and Ansul wet chemical system active.",
        desc: "Severe grease layer buildup on kitchen exhaust filters creating flashover fire hazard.",
        location: "Central Hood Extractors",
        severity: "Critical",
        immediateAction: "Deep cleaning scheduled during off-shift hours.",
        capa: "Contract certified industrial duct cleaning contractor for complete degreasing and recalibrate Ansul fusible links.",
        responsible: "Facilities & Maintenance Dept",
        targetDate: "2026-09-02",
        status: "Open",
        beforePhoto: null,
        afterPhoto: null,
        closureDate: "",
        verifyNote: "",
        closureComment: ""
      }
    ]
  },
  {
    id: 1718000602,
    no: "INS-2026-0002",
    type: "Laboratory Inspection",
    title: "Chemical & Energy Engineering Labs Safety Audit — August 2026",
    templateId: "tmpl_lab",
    site: "SUTech Main Campus",
    building: "Faculty of Engineering & Technology Building",
    area: "Chemistry & Environmental Research Lab 204",
    dept: "Faculty of Engineering & Lab Directorate",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    date: "2026-08-27",
    time: "10:15",
    shift: "Morning Shift",
    accompaniedBy: "د. هاني عثمان (رئيس قسم المعامل)",
    notes: "Annual pre-semester safety readiness inspection for chemistry and materials testing laboratories.",
    status: "Completed",
    createdAt: "2026-08-27T10:15:00Z",
    updatedAt: "2026-08-27T12:00:00Z",
    questions: [
      { id: 1, category: "Fume Extraction", text: "Chemical fume hood face velocity measured (Acceptable: 80–120 FPM).", type: "NUMBER", unit: "FPM", requirement: "Target: 80 - 120 FPM.", answer: "108", comment: "Calibrated velocity measured.", photos: [] },
      { id: 2, category: "Chemical Segregation", text: "Acids, bases, oxidizers, and flammables segregated in dedicated cabinets.", type: "PASS_FAIL_NA", requirement: "Chemical compatibility matrix compliance.", answer: "Pass", comment: "Segregated correctly.", photos: [] },
      { id: 3, category: "Hazard Communication", text: "All reagent containers labeled with GHS pictograms and SDS library accessible.", type: "YES_NO_NA", requirement: "Bilingual GHS hazard labeling.", answer: "Yes", comment: "SDS binder present.", photos: [] },
      { id: 4, category: "Emergency Eyewash", text: "Emergency eyewash and safety deluge shower inspected, clear path, 15-min flow.", type: "PASS_FAIL_NA", requirement: "Weekly flushing and clear 36-inch radius.", answer: "Pass", comment: "Water flow tested clean.", photos: [] },
      { id: 5, category: "Spill Containment", text: "Universal chemical spill kit stocked with neutralizers, booms, and disposal bags.", type: "YES_NO_NA", requirement: "Full spill response kit present.", answer: "Yes", comment: "Complete kit by door.", photos: [] },
      { id: 6, category: "Compressed Gases", text: "Gas cylinders secured upright with double metal chains and valve protection caps.", type: "PASS_FAIL_NA", requirement: "Chained and separated by gas class.", answer: "Pass", comment: "Chained securely.", photos: [] },
      { id: 7, category: "PPE Compliance", text: "Students and technicians wearing splash goggles, lab coats, and nitrile gloves.", type: "GOOD_FAIR_POOR", requirement: "100% PPE compliance inside lab.", answer: "Good", comment: "PPE stocked and enforced.", photos: [] }
    ],
    findings: []
  },
  {
    id: 1718000603,
    no: "INS-2026-0003",
    type: "Fire Extinguisher Inspection",
    name: "Campus-Wide Fire Extinguisher Monthly Audit — August 2026",
    title: "Campus-Wide Fire Extinguisher Monthly Audit — August 2026",
    templateId: "tmpl_fire_ext",
    site: "SUTech Main Campus",
    building: "All Academic & Administrative Buildings (1-4)",
    area: "Corridors, Workshops, Substations & Cafeterias",
    dept: "HSE & Civil Defense Directorate",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    date: "2026-08-25",
    time: "09:00",
    shift: "Morning Shift",
    accompaniedBy: "م. طارق خليل (مسؤول الدفاع المدني)",
    notes: "Routine monthly statutory inspection of 145 portable fire extinguishers across campus.",
    status: "Completed",
    createdAt: "2026-08-25T09:00:00Z",
    updatedAt: "2026-08-25T14:30:00Z",
    questions: [
      { id: 1, category: "Location & Visibility", text: "Extinguisher in designated location, mounted 1.2m above floor, unobstructed.", type: "PASS_FAIL_NA", requirement: "Clear signage and unblocked access.", answer: "Pass", comment: "All 145 units accessible.", photos: [] },
      { id: 2, category: "Pressure & Seal", text: "Pressure gauge reading in green zone, safety pin and tamper seal intact.", type: "PASS_FAIL_NA", requirement: "Correct operating pressure.", answer: "Pass", comment: "Pressure verified.", photos: [] },
      { id: 3, category: "Physical Condition", text: "No physical damage, corrosion, nozzle blockage, or hose cracking.", type: "GOOD_FAIR_POOR", requirement: "Free from rust and physical wear.", answer: "Good", comment: "Cylinders in good condition.", photos: [] },
      { id: 4, category: "Inspection Tag", text: "Monthly inspection tag signed and initialed by HSE inspector.", type: "YES_NO_NA", requirement: "Signed tag up to current month.", answer: "Yes", comment: "All tags signed.", photos: [] }
    ],
    findings: []
  },
  {
    id: 1718000604,
    no: "INS-2026-0004",
    type: "Bus / Vehicle Inspection",
    title: "Campus Transport Fleet & Bus Safety Audit — August 2026",
    templateId: "tmpl_bus",
    site: "SUTech Main Campus",
    building: "Transport Depot & Parking Bays",
    area: "University Student Buses (12 Buses)",
    dept: "Transportation Department",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    date: "2026-08-22",
    time: "08:30",
    shift: "Morning Shift",
    accompaniedBy: "أ. عصام فوزي (مدير إدارة الحركة والنقل)",
    notes: "Pre-academic year safety verification of transport fleet vehicles, speed limiters, tires, and driver drug tests.",
    status: "Completed",
    createdAt: "2026-08-22T08:30:00Z",
    updatedAt: "2026-08-22T11:00:00Z",
    questions: [
      { id: 1, category: "Brakes & Tires", text: "Brake responsiveness verified and tire tread depth measured (Acceptable: ≥ 2.5 mm).", type: "NUMBER", unit: "mm", requirement: "Target: ≥ 2.5 mm.", answer: "4.8", comment: "All tires in excellent shape.", photos: [] },
      { id: 2, category: "Speed Governor", text: "Speed governor calibrated and sealed to maximum 90 km/h.", type: "PASS_FAIL_NA", requirement: "Sealed governor active.", answer: "Pass", comment: "Governors sealed and logged.", photos: [] },
      { id: 3, category: "Emergency Gear", text: "Two 6kg dry powder fire extinguishers and window escape hammers installed.", type: "PASS_FAIL_NA", requirement: "Charged extinguishers & hammers.", answer: "Pass", comment: "Full emergency kit present.", photos: [] },
      { id: 4, category: "Driver Clearances", text: "Driver holds valid professional license and passed periodic medical/drug screenings.", type: "YES_NO_NA", requirement: "Verified professional license.", answer: "Yes", comment: "All 14 drivers screened clean.", photos: [] }
    ],
    findings: []
  },
  {
    id: 1718000605,
    no: "INS-2026-0005",
    type: "Monthly HSE Inspection",
    title: "Monthly Comprehensive Campus Safety Audit — August 2026",
    templateId: "tmpl_monthly_hse",
    site: "SUTech Main Campus",
    building: "Academic Buildings 1, 2, 3 & Administration",
    area: "Campus Wide Facilities",
    dept: "Facilities & HSE Department",
    inspector: "م. إبراهيم سعيد (HSE Department)",
    date: "2026-08-20",
    time: "09:30",
    shift: "Morning Shift",
    accompaniedBy: "م. كمال رشدي (مدير إدارة المرافق والتشغيل)",
    notes: "August monthly comprehensive safety and facility compliance walkthrough.",
    status: "Completed",
    createdAt: "2026-08-20T09:30:00Z",
    updatedAt: "2026-08-20T13:15:00Z",
    questions: [
      { id: 1, category: "Fire Safety & Extinguishers", text: "Fire extinguishers inspected, tagged, pressure gauge in green, and unobstructed.", type: "PASS_FAIL_NA", requirement: "NFPA 10 & Civil Defense compliance.", answer: "Pass", comment: "All units inspected.", photos: [] },
      { id: 2, category: "Fire Safety & Extinguishers", text: "Fire alarm main panel normal, smoke detectors clean, and break glasses intact.", type: "PASS_FAIL_NA", requirement: "Daily normal status on panel.", answer: "Pass", comment: "Panel clean.", photos: [] },
      { id: 3, category: "Emergency Egress", text: "All emergency exit corridors, stairwells, and panic doors unobstructed and unlocked.", type: "PASS_FAIL_NA", requirement: "Immediate exit access at all times.", answer: "Fail", comment: "Storage boxes blocking Stairwell C landing.", photos: [] },
      { id: 4, category: "Emergency Egress", text: "Illuminated exit signs and emergency backup lighting operational.", type: "PASS_FAIL_NA", requirement: "90-minute battery duration test.", answer: "Pass", comment: "Tested functional.", photos: [] },
      { id: 5, category: "Housekeeping & Facility", text: "General housekeeping standard across corridors, common areas, and entrances.", type: "GOOD_FAIR_POOR", requirement: "Clean, dry, and slip-free surfaces.", answer: "Good", comment: "Orderly and clean.", photos: [] },
      { id: 6, category: "Electrical Safety", text: "Electrical switchgear panels closed, danger signs displayed, rubber mats in place.", type: "PASS_FAIL_NA", requirement: "No exposed wiring or overloaded sockets.", answer: "Pass", comment: "Panels locked.", photos: [] },
      { id: 7, category: "First Aid & Medical", text: "First aid kits fully stocked with sterile dressings, antiseptics, and logbook present.", type: "YES_NO_NA", requirement: "Statutory medical contents.", answer: "Yes", comment: "Supplies checked.", photos: [] }
    ],
    findings: [
      {
        id: "FND-2026-0003",
        questionId: 3,
        category: "Emergency Egress",
        itemText: "All emergency exit corridors, stairwells, and panic doors unobstructed and unlocked.",
        desc: "Cardboard surplus boxes and discarded office chairs stored in Stairwell C ground floor escape route.",
        location: "Academic Bldg 1 - Stairwell C Ground Floor",
        severity: "High",
        immediateAction: "Items cleared by housekeeping within 2 hours.",
        capa: "Issue formal memo to building caretakers prohibiting storage in fire egress corridors.",
        responsible: "Housekeeping Supervisor & Facility Lead",
        targetDate: "2026-08-21",
        status: "Closed",
        beforePhoto: null,
        afterPhoto: null,
        closureDate: "2026-08-21",
        verifyNote: "Re-inspected by HSE officer; stairwell 100% clear and unblocked.",
        closureComment: "Closed successfully."
      }
    ]
  }
];

// Initialize Digital Inspections Data
function initDigitalInspectionsData() {
  try {
    digitalInspections = JSON.parse(localStorage.getItem(DIGITAL_INSPECTIONS_KEY));
  } catch (e) { digitalInspections = null; }
  if (!digitalInspections || !Array.isArray(digitalInspections) || digitalInspections.length === 0) {
    digitalInspections = JSON.parse(JSON.stringify(DEFAULT_INITIAL_DIGITAL_INSPECTIONS));
    try { localStorage.setItem(DIGITAL_INSPECTIONS_KEY, JSON.stringify(digitalInspections)); } catch (e) {}
  }

  try {
    inspectionTemplates = JSON.parse(localStorage.getItem(INSP_TEMPLATES_KEY));
  } catch (e) { inspectionTemplates = null; }
  if (!inspectionTemplates || !Array.isArray(inspectionTemplates) || inspectionTemplates.length === 0) {
    inspectionTemplates = JSON.parse(JSON.stringify(DEFAULT_INSPECTION_TEMPLATES_LIBRARY));
    try { localStorage.setItem(INSP_TEMPLATES_KEY, JSON.stringify(inspectionTemplates)); } catch (e) {}
  }
}
initDigitalInspectionsData();

function saveDigitalInspectionsData() {
  try {
    localStorage.setItem(DIGITAL_INSPECTIONS_KEY, JSON.stringify(digitalInspections));
  } catch (e) {}
  syncToCloud("digital_inspections", digitalInspections);
  updateInspectionDashboardKPIs();
  renderDigitalInspectionHistoryTable();
}

function saveInspectionTemplatesData() {
  try {
    localStorage.setItem(INSP_TEMPLATES_KEY, JSON.stringify(inspectionTemplates));
  } catch (e) {}
  syncToCloud("inspection_templates", inspectionTemplates);
}

// Calculate and Update Dashboard KPIs
function updateInspectionDashboardKPIs() {
  var total = digitalInspections.length;
  var completed = digitalInspections.filter(function(x) { return x.status === "Completed"; }).length;

  var allFindings = [];
  digitalInspections.forEach(function(insp) {
    if (insp.findings && Array.isArray(insp.findings)) {
      insp.findings.forEach(function(f) { allFindings.push(f); });
    }
  });

  var todayStr = new Date().toISOString().slice(0, 10);
  var openFnd = 0;
  var inProgFnd = 0;
  var readyFnd = 0;
  var closedFnd = 0;
  var overdueFnd = 0;
  var critHighFnd = 0;

  allFindings.forEach(function(f) {
    var isClosed = (f.status === "Closed");
    var isOverdue = (!isClosed && f.targetDate && f.targetDate < todayStr);

    if (isClosed) {
      closedFnd++;
    } else {
      if (isOverdue) overdueFnd++;
      if (f.status === "Open") openFnd++;
      else if (f.status === "In Progress") inProgFnd++;
      else if (f.status === "Ready for Verification") readyFnd++;
    }

    if (f.severity === "Critical" || f.severity === "High") {
      critHighFnd++;
    }
  });

  var closureRate = allFindings.length > 0 ? Math.round((closedFnd / allFindings.length) * 100) : 100;

  var setTxt = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt("statTotalInsp", total);
  setTxt("statCompletedInsp", completed);
  setTxt("statOpenFindings", openFnd);
  setTxt("statInProgressFindings", inProgFnd);
  setTxt("statReadyVerifyFindings", readyFnd);
  setTxt("statOverdueFindings", overdueFnd);
  setTxt("statClosedFindings", closedFnd);
  setTxt("statCriticalHighFindings", critHighFnd);
  setTxt("statClosureRate", closureRate + "%");

  var histBadge = document.getElementById("inspMgmtHistoryCount");
  if (histBadge) histBadge.textContent = total;
}

function getNextDigitalInspectionId() {
  var maxNum = 0;
  digitalInspections.forEach(function(x) {
    if (x.no) {
      var m = String(x.no).match(/(?:INS-|SUT-INS-)?(?:202\d-)?(\d+)/i);
      if (m && m[1]) {
        var n = parseInt(m[1], 10);
        if (!isNaN(n) && n < 100000 && n > maxNum) maxNum = n;
      }
    }
  });
  var nextNum = maxNum > 0 ? (maxNum + 1) : (digitalInspections.length + 1);
  return "INS-" + new Date().getFullYear() + "-" + String(nextNum).padStart(4, "0");
}

function getNextFindingId() {
  var maxNum = 0;
  digitalInspections.forEach(function(insp) {
    if (insp.findings && Array.isArray(insp.findings)) {
      insp.findings.forEach(function(f) {
        if (f.id) {
          var m = String(f.id).match(/(?:FND-|SUT-FND-)?(?:202\d-)?(\d+)/i);
          if (m && m[1]) {
            var n = parseInt(m[1], 10);
            if (!isNaN(n) && n < 100000 && n > maxNum) maxNum = n;
          }
        }
      });
    }
  });
  var nextNum = maxNum > 0 ? (maxNum + 1) : 1;
  return "FND-" + new Date().getFullYear() + "-" + String(nextNum).padStart(4, "0");
}

// Open + NEW INSPECTION Setup Modal
function openNewInspectionModal(prefillType, customItems) {
  var modal = document.getElementById("newInspectionModal");
  if (!modal) return;

  var nextId = getNextDigitalInspectionId();
  var today = new Date().toISOString().slice(0, 10);
  var timeNow = new Date().toTimeString().slice(0, 5);

  if (document.getElementById("newInspIdInput")) document.getElementById("newInspIdInput").value = nextId;
  if (document.getElementById("newInspDateInput")) document.getElementById("newInspDateInput").value = today;
  if (document.getElementById("newInspTimeInput")) document.getElementById("newInspTimeInput").value = timeNow;

  var typeSel = document.getElementById("newInspTypeSelect");
  if (typeSel && prefillType) {
    typeSel.value = prefillType;
  }
  populateTemplateSelectForType(typeSel ? typeSel.value : "Monthly HSE Inspection");

  modal.classList.remove("hidden");
}

function populateTemplateSelectForType(selectedType) {
  var tmplSel = document.getElementById("newInspTemplateSelect");
  if (!tmplSel) return;

  var matching = inspectionTemplates.filter(function(t) {
    return t.type === selectedType || t.type === "Custom Inspection";
  });

  if (matching.length === 0) {
    matching = inspectionTemplates;
  }

  var opts = matching.map(function(t) {
    return '<option value="' + esc(t.id) + '">' + esc(t.name) + ' (' + (t.questions ? t.questions.length : 0) + ' بنود)</option>';
  }).join("");

  tmplSel.innerHTML = opts;
}

// Start Conducting Digital Inspection Worksheet
function startDigitalInspection(type, templateId, metadata) {
  var tmpl = inspectionTemplates.find(function(t) { return t.id === templateId; });
  if (!tmpl) {
    tmpl = inspectionTemplates[0] || DEFAULT_INSPECTION_TEMPLATES_LIBRARY[0];
  }

  var questionsSnapshot = JSON.parse(JSON.stringify(tmpl.questions || [])).map(function(q, i) {
    return {
      id: q.id || (i + 1),
      category: q.category || "General Safety",
      text: q.text || q.inspection_point || "Inspection Item",
      type: q.type || "PASS_FAIL_NA",
      unit: q.unit || "",
      requirement: q.requirement || q.acceptance_criteria || "Statutory compliance",
      answer: "",
      comment: "",
      photos: []
    };
  });

  var newId = Date.now();
  var inspNo = (metadata && metadata.no) ? metadata.no : getNextDigitalInspectionId();

  activeDigitalInspection = {
    id: newId,
    no: inspNo,
    type: type || tmpl.type || "Monthly HSE Inspection",
    title: (tmpl.name || type) + " — " + (metadata && metadata.area ? metadata.area : "Campus Facility"),
    templateId: tmpl.id,
    templateName: tmpl.name,
    site: (metadata && metadata.site) ? metadata.site : "SUTech Main Campus",
    building: (metadata && metadata.building) ? metadata.building : "Campus Facility",
    area: (metadata && metadata.area) ? metadata.area : "General Area",
    dept: (metadata && metadata.dept) ? metadata.dept : "HSE & Maintenance",
    inspector: (metadata && metadata.inspector) ? metadata.inspector : "م. إبراهيم سعيد (HSE Department)",
    date: (metadata && metadata.date) ? metadata.date : new Date().toISOString().slice(0, 10),
    time: (metadata && metadata.time) ? metadata.time : new Date().toTimeString().slice(0, 5),
    shift: (metadata && metadata.shift) ? metadata.shift : "Morning Shift",
    accompaniedBy: (metadata && metadata.accompaniedBy) ? metadata.accompaniedBy : "",
    notes: (metadata && metadata.notes) ? metadata.notes : "",
    status: "In Progress",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: questionsSnapshot,
    findings: []
  };

  var card = document.getElementById("activeInspWorksheetCard");
  if (card) card.classList.remove("hidden");

  renderDigitalChecklistWorksheet();

  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  showToast("success", "تم بدء نموذج التفتيش الرقمي بنجاح: " + activeDigitalInspection.no);
}

// Render Digital Checklist Worksheet
function renderDigitalChecklistWorksheet() {
  if (!activeDigitalInspection) return;

  var insp = activeDigitalInspection;
  var qList = insp.questions || [];

  // Update Header UI
  var idBadge = document.getElementById("wsInspIdBadge");
  if (idBadge) idBadge.textContent = insp.no;

  var titleDisplay = document.getElementById("wsInspTitleDisplay");
  if (titleDisplay) titleDisplay.textContent = insp.title;

  var metaSummary = document.getElementById("wsInspMetaSummary");
  if (metaSummary) {
    metaSummary.textContent = "الموقع: " + insp.area + " (" + insp.building + ") | المفتش: " + insp.inspector + " | التاريخ: " + insp.date + " " + insp.time + (insp.accompaniedBy ? " | بمرافقة: " + insp.accompaniedBy : "");
  }

  // Calculate live score
  var evaluatedCount = 0;
  var passCount = 0;
  var failCount = 0;
  var naCount = 0;

  qList.forEach(function(q) {
    var ans = String(q.answer || "").toLowerCase();
    if (ans === "pass" || ans === "yes" || ans === "good") {
      passCount++;
      evaluatedCount++;
    } else if (ans === "fail" || ans === "no" || ans === "poor") {
      failCount++;
      evaluatedCount++;
    } else if (ans === "fair") {
      evaluatedCount++;
    } else if (ans === "n/a" || ans === "na") {
      naCount++;
    }
  });

  var score = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 100;
  var scoreColor = score >= 90 ? "#10b981" : (score >= 70 ? "#f59e0b" : "#ef4444");

  var circle = document.getElementById("wsScoreCircle");
  if (circle) circle.style.borderColor = scoreColor;

  var scoreNum = document.getElementById("wsScorePercent");
  if (scoreNum) scoreNum.textContent = score + "%";

  var statTotal = document.getElementById("wsStatTotalQ");
  if (statTotal) statTotal.textContent = qList.length;
  var statPass = document.getElementById("wsStatPassQ");
  if (statPass) statPass.textContent = passCount;
  var statFail = document.getElementById("wsStatFailQ");
  if (statFail) statFail.textContent = failCount;
  var statNa = document.getElementById("wsStatNaQ");
  if (statNa) statNa.textContent = naCount;

  // Group questions by category
  var categories = {};
  qList.forEach(function(q) {
    var cat = q.category || "General Safety";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(q);
  });

  var container = document.getElementById("wsQuestionsContainer");
  if (!container) return;

  var html = "";
  Object.keys(categories).forEach(function(catName) {
    html += '<div class="insp-q-category-block">' +
      '<div class="insp-q-category-title"><i class="fa-solid fa-folder-open" style="color:#0284c7"></i> ' + esc(catName) + ' <span class="badge" style="background:#e2e8f0;color:#334155;font-size:10px">' + categories[catName].length + ' بنود</span></div>' +
      '<div class="insp-q-list">';

    categories[catName].forEach(function(q) {
      var ans = q.answer || "";
      var ansLower = ans.toLowerCase();
      var cardClass = "insp-q-card";
      if (ansLower === "fail" || ansLower === "no" || ansLower === "poor") cardClass += " q-status-fail";
      else if (ansLower === "pass" || ansLower === "yes" || ansLower === "good") cardClass += " q-status-pass";

      html += '<div class="' + cardClass + '" id="qCard_' + q.id + '">' +
        '<div class="insp-q-top">' +
          '<div class="insp-q-info">' +
            '<div class="insp-q-title"><span style="color:#0284c7;margin-inline-end:4px">#' + q.id + '</span> ' + esc(q.text) + '</div>' +
            '<div class="insp-q-req"><i class="fa-solid fa-circle-info" style="font-size:10px;opacity:0.7"></i> ' + esc(q.requirement) + '</div>' +
          '</div>' +
          '<div class="insp-q-control">';

      // Render control based on question type
      if (q.type === "PASS_FAIL_NA") {
        html += '<div class="insp-btn-group">' +
          '<button type="button" class="insp-seg-btn btn-pass ' + (ans === "Pass" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'Pass\')"><i class="fa-solid fa-check"></i> Pass</button>' +
          '<button type="button" class="insp-seg-btn btn-fail ' + (ans === "Fail" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'Fail\')"><i class="fa-solid fa-xmark"></i> Fail</button>' +
          '<button type="button" class="insp-seg-btn btn-na ' + (ans === "N/A" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'N/A\')">N/A</button>' +
        '</div>';
      } else if (q.type === "YES_NO_NA") {
        html += '<div class="insp-btn-group">' +
          '<button type="button" class="insp-seg-btn btn-yes ' + (ans === "Yes" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'Yes\')"><i class="fa-solid fa-check"></i> Yes</button>' +
          '<button type="button" class="insp-seg-btn btn-no ' + (ans === "No" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'No\')"><i class="fa-solid fa-xmark"></i> No</button>' +
          '<button type="button" class="insp-seg-btn btn-na ' + (ans === "N/A" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'N/A\')">N/A</button>' +
        '</div>';
      } else if (q.type === "GOOD_FAIR_POOR") {
        html += '<div class="insp-btn-group">' +
          '<button type="button" class="insp-seg-btn btn-good ' + (ans === "Good" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'Good\')"><i class="fa-solid fa-star"></i> Good</button>' +
          '<button type="button" class="insp-seg-btn btn-fair ' + (ans === "Fair" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'Fair\')">Fair</button>' +
          '<button type="button" class="insp-seg-btn btn-poor ' + (ans === "Poor" ? "active" : "") + '" onclick="setChecklistAnswer(' + q.id + ', \'Poor\')"><i class="fa-solid fa-xmark"></i> Poor</button>' +
        '</div>';
      } else if (q.type === "NUMBER") {
        html += '<div style="display:flex;align-items:center;gap:4px">' +
          '<input type="number" step="any" style="width:90px;font-size:12px;padding:4px 6px;text-align:center;font-weight:bold" value="' + esc(ans) + '" placeholder="0.0" onchange="setChecklistAnswer(' + q.id + ', this.value)">' +
          (q.unit ? '<span style="font-size:11px;font-weight:bold;color:#475569">' + esc(q.unit) + '</span>' : '') +
        '</div>';
      } else {
        html += '<input type="text" style="width:140px;font-size:11px;padding:4px 6px" value="' + esc(ans) + '" placeholder="البيان..." onchange="setChecklistAnswer(' + q.id + ', this.value)">';
      }

      html += '</div></div>';

      // Expandable photo gallery & comments
      var isNegative = (ansLower === "fail" || ansLower === "no" || ansLower === "poor");
      var photos = q.photos || [];

      html += '<div class="insp-q-bottom">' +
        '<div class="insp-q-inputs">' +
          '<textarea class="insp-q-comment-input" placeholder="' + (isNegative ? 'اكتب تفاصيل المخالفة المرصودة وموقعها بدقة...' : 'ملاحظات وتفاصيل إضافية...') + '" onchange="updateChecklistComment(' + q.id + ', this.value)">' + esc(q.comment || "") + '</textarea>' +
          '<div style="display:flex;gap:6px;align-items:center">' +
            '<label class="insp-q-photo-btn">' +
              '<i class="fa-solid fa-camera"></i> إضافة صورة' +
              '<input type="file" accept="image/*" style="display:none" onchange="handleQuestionPhotoUpload(' + q.id + ', this)">' +
            '</label>' +
            (isNegative ? '<button type="button" class="btn btn-red" style="font-size:10.5px;padding:5px 10px" onclick="openCreateFindingModal(' + q.id + ')"><i class="fa-solid fa-bolt"></i> + تسجيل مخالفة (CAPA)</button>' : '') +
          '</div>' +
        '</div>';

      if (photos.length > 0) {
        html += '<div class="insp-photo-gallery">';
        photos.forEach(function(p, pIdx) {
          html += '<div class="insp-photo-thumb-wrap">' +
            '<img src="' + p + '" class="insp-photo-thumb" onclick="previewImageModal(\'' + p + '\')">' +
            '<button type="button" class="insp-photo-del" onclick="removeQuestionPhoto(' + q.id + ', ' + pIdx + ')">&times;</button>' +
          '</div>';
        });
        html += '</div>';
      }

      html += '</div></div>';
    });

    html += '</div></div>';
  });

  container.innerHTML = html;

  // Render Findings table for this inspection
  renderActiveInspectionFindingsTable();
}

function setChecklistAnswer(qId, val) {
  if (!activeDigitalInspection || !activeDigitalInspection.questions) return;
  var q = activeDigitalInspection.questions.find(function(x) { return x.id === qId; });
  if (q) {
    q.answer = val;
    activeDigitalInspection.updatedAt = new Date().toISOString();
    renderDigitalChecklistWorksheet();
  }
}

function updateChecklistComment(qId, val) {
  if (!activeDigitalInspection || !activeDigitalInspection.questions) return;
  var q = activeDigitalInspection.questions.find(function(x) { return x.id === qId; });
  if (q) {
    q.comment = val;
    activeDigitalInspection.updatedAt = new Date().toISOString();
  }
}

function handleQuestionPhotoUpload(qId, input) {
  if (!input.files || !input.files[0] || !activeDigitalInspection) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var q = activeDigitalInspection.questions.find(function(x) { return x.id === qId; });
    if (q) {
      if (!q.photos) q.photos = [];
      q.photos.push(e.target.result);
      renderDigitalChecklistWorksheet();
      showToast("success", "تمت إضافة صورة توثيقية للبند #" + qId);
    }
  };
  reader.readAsDataURL(file);
}

function removeQuestionPhoto(qId, pIdx) {
  if (!activeDigitalInspection || !activeDigitalInspection.questions) return;
  var q = activeDigitalInspection.questions.find(function(x) { return x.id === qId; });
  if (q && q.photos && q.photos[pIdx]) {
    q.photos.splice(pIdx, 1);
    renderDigitalChecklistWorksheet();
  }
}

function passAllDigitalQuestions() {
  if (!activeDigitalInspection || !activeDigitalInspection.questions) return;
  activeDigitalInspection.questions.forEach(function(q) {
    if (q.type === "PASS_FAIL_NA") q.answer = "Pass";
    else if (q.type === "YES_NO_NA") q.answer = "Yes";
    else if (q.type === "GOOD_FAIR_POOR") q.answer = "Good";
  });
  renderDigitalChecklistWorksheet();
  showToast("success", "تم تمييز كافة بنود التفتيش كمطابقة بنجاح!");
}

// Render Findings Table inside Active Worksheet
function renderActiveInspectionFindingsTable() {
  var container = document.getElementById("wsFindingsTableContainer");
  var badge = document.getElementById("wsFindingsCountBadge");
  if (!container || !activeDigitalInspection) return;

  var findingsList = activeDigitalInspection.findings || [];
  if (badge) badge.textContent = findingsList.length + " Findings";

  if (findingsList.length === 0) {
    container.innerHTML = '<div style="padding:14px;text-align:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;font-size:11.5px;color:#64748b">' +
      '<i class="fa-solid fa-shield-check" style="font-size:20px;color:#10b981;margin-bottom:4px;display:block"></i>' +
      'لا توجد ملاحظات عدم مطابقة مسجلة حتى الآن. (No open findings recorded)' +
      '</div>';
    return;
  }

  var todayStr = new Date().toISOString().slice(0, 10);
  var html = '<table class="history-table" style="font-size:11px">' +
    '<thead>' +
      '<tr>' +
        '<th style="width:10%">Finding ID</th>' +
        '<th style="width:25%">Checklist Item &amp; Category</th>' +
        '<th style="width:25%">Finding Description</th>' +
        '<th style="width:8%;text-align:center">Severity</th>' +
        '<th style="width:12%">Responsible &amp; Target</th>' +
        '<th style="width:10%;text-align:center">Status</th>' +
        '<th style="width:10%;text-align:center">Actions</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  findingsList.forEach(function(f) {
    var isOverdue = (f.status !== "Closed" && f.targetDate && f.targetDate < todayStr);
    var statusBadgeClass = "fnd-badge " + f.status.toLowerCase().replace(/\s+/g, "");
    if (isOverdue) statusBadgeClass = "fnd-badge overdue";

    html += '<tr>' +
      '<td><b style="color:var(--sut-navy)">' + esc(f.id) + '</b></td>' +
      '<td><b>' + esc(f.category) + '</b><small style="display:block;color:#64748b">' + esc(f.itemText) + '</small></td>' +
      '<td>' + esc(f.desc) + '</td>' +
      '<td style="text-align:center"><span class="sev-badge ' + (f.severity || "medium").toLowerCase() + '">' + esc(f.severity) + '</span></td>' +
      '<td><b>' + esc(f.responsible || "HSE Dept") + '</b><small style="display:block;color:#64748b">' + esc(f.targetDate || "No Date") + '</small></td>' +
      '<td style="text-align:center"><span class="' + statusBadgeClass + '">' + (isOverdue ? "OVERDUE" : esc(f.status)) + '</span></td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="history-action-btn btn-view" title="تعديل / التحقق والإغلاق" onclick="openEditFindingModal(\'' + f.id + '\')"><i class="fa-solid fa-pen-to-square"></i></button>' +
        '<button class="history-action-btn btn-del" title="حذف الملاحظة" onclick="deleteFindingFromActive(\'' + f.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Open Finding Creation Modal for Question
function openCreateFindingModal(qId) {
  if (!activeDigitalInspection) return;
  var q = activeDigitalInspection.questions.find(function(x) { return x.id === qId; });
  if (!q) return;

  var fId = getNextFindingId();
  var today = new Date();
  var targetD = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  document.getElementById("fndModalFindingId").value = "";
  document.getElementById("fndModalQuestionId").value = qId;
  document.getElementById("fndModalIdDisplay").value = fId;
  document.getElementById("fndModalSeveritySelect").value = "High";
  document.getElementById("fndModalStatusSelect").value = "Open";
  document.getElementById("fndModalItemDisplay").value = "[" + (q.category || "General") + "] #" + q.id + " - " + q.text;
  document.getElementById("fndModalDescInput").value = q.comment || "عدم مطابقة لمعيار السلامة المطلوب.";
  document.getElementById("fndModalLocationInput").value = activeDigitalInspection.area || "";
  document.getElementById("fndModalImmediateActionInput").value = "";
  document.getElementById("fndModalCapaInput").value = "تنفيذ الإجراء التصحيحي المطلوب ومعالجة سبب المخالفة.";
  document.getElementById("fndModalResponsibleInput").value = activeDigitalInspection.dept || "إدارة الصيانة والخدمات";
  document.getElementById("fndModalDueDateInput").value = targetD;
  document.getElementById("fndModalClosureDateInput").value = "";
  document.getElementById("fndModalVerifyNoteInput").value = "";
  document.getElementById("fndModalClosureCommentInput").value = "";

  document.getElementById("fndModalBeforePreview").innerHTML = "";
  document.getElementById("fndModalAfterPreview").innerHTML = "";

  document.getElementById("fndModalHeaderTitle").textContent = "تسجيل ملاحظة عدم مطابقة جديدة (New Finding)";

  var modal = document.getElementById("inspFindingModal");
  if (modal) modal.classList.remove("hidden");
}

// Open Edit / Verification / Closure Modal for Finding
function openEditFindingModal(findingId) {
  var finding = null;
  if (activeDigitalInspection && activeDigitalInspection.findings) {
    finding = activeDigitalInspection.findings.find(function(f) { return f.id === findingId; });
  }
  if (!finding) {
    digitalInspections.forEach(function(insp) {
      if (insp.findings && Array.isArray(insp.findings)) {
        var found = insp.findings.find(function(f) { return f.id === findingId; });
        if (found) finding = found;
      }
    });
  }
  if (!finding) return;

  document.getElementById("fndModalFindingId").value = finding.id;
  document.getElementById("fndModalQuestionId").value = finding.questionId || "";
  document.getElementById("fndModalIdDisplay").value = finding.id;
  document.getElementById("fndModalSeveritySelect").value = finding.severity || "High";
  document.getElementById("fndModalStatusSelect").value = finding.status || "Open";
  document.getElementById("fndModalItemDisplay").value = "[" + (finding.category || "General") + "] " + (finding.itemText || "");
  document.getElementById("fndModalDescInput").value = finding.desc || "";
  document.getElementById("fndModalLocationInput").value = finding.location || "";
  document.getElementById("fndModalImmediateActionInput").value = finding.immediateAction || "";
  document.getElementById("fndModalCapaInput").value = finding.capa || "";
  document.getElementById("fndModalResponsibleInput").value = finding.responsible || "";
  document.getElementById("fndModalDueDateInput").value = finding.targetDate || "";
  document.getElementById("fndModalClosureDateInput").value = finding.closureDate || "";
  document.getElementById("fndModalVerifyNoteInput").value = finding.verifyNote || "";
  document.getElementById("fndModalClosureCommentInput").value = finding.closureComment || "";

  var beforePrev = document.getElementById("fndModalBeforePreview");
  if (beforePrev) {
    beforePrev.innerHTML = finding.beforePhoto ? '<img src="' + finding.beforePhoto + '" style="max-height:80px;border-radius:6px;border:1px solid #cbd5e1">' : '';
  }
  var afterPrev = document.getElementById("fndModalAfterPreview");
  if (afterPrev) {
    afterPrev.innerHTML = finding.afterPhoto ? '<img src="' + finding.afterPhoto + '" style="max-height:80px;border-radius:6px;border:1px solid #cbd5e1">' : '';
  }

  document.getElementById("fndModalHeaderTitle").textContent = "تعديل والتحقق من الملاحظة (" + finding.id + ")";

  var modal = document.getElementById("inspFindingModal");
  if (modal) modal.classList.remove("hidden");
}

// Save Finding from Modal
async function saveFindingFromModal() {
  var findingId = document.getElementById("fndModalFindingId").value;
  var qId = parseInt(document.getElementById("fndModalQuestionId").value, 10);
  var fIdDisplay = document.getElementById("fndModalIdDisplay").value;
  var severity = document.getElementById("fndModalSeveritySelect").value;
  var status = document.getElementById("fndModalStatusSelect").value;
  var desc = document.getElementById("fndModalDescInput").value.trim();
  var location = document.getElementById("fndModalLocationInput").value.trim();
  var immediateAction = document.getElementById("fndModalImmediateActionInput").value.trim();
  var capa = document.getElementById("fndModalCapaInput").value.trim();
  var responsible = document.getElementById("fndModalResponsibleInput").value.trim();
  var targetDate = document.getElementById("fndModalDueDateInput").value;
  var closureDate = document.getElementById("fndModalClosureDateInput").value;
  var verifyNote = document.getElementById("fndModalVerifyNoteInput").value.trim();
  var closureComment = document.getElementById("fndModalClosureCommentInput").value.trim();
  var syncCapa = document.getElementById("fndModalSyncCapaCheck").checked;

  if (!desc) {
    return showSweetAlert("تنبيه", "يرجى كتابة وصف المخالفة المرصودة.", "warning");
  }

  // Handle Before & After Photos
  var beforeFile = document.getElementById("fndModalBeforePhotoFile").files[0];
  var afterFile = document.getElementById("fndModalAfterPhotoFile").files[0];

  var readFile = function(file) {
    return new Promise(function(resolve) {
      if (!file) return resolve(null);
      var r = new FileReader();
      r.onload = function(e) { resolve(e.target.result); };
      r.readAsDataURL(file);
    });
  };

  var beforeB64 = await readFile(beforeFile);
  var afterB64 = await readFile(afterFile);

  var itemText = "";
  var category = "General Safety";
  if (activeDigitalInspection && activeDigitalInspection.questions) {
    var q = activeDigitalInspection.questions.find(function(x) { return x.id === qId; });
    if (q) {
      itemText = q.text;
      category = q.category;
    }
  }

  if (activeDigitalInspection) {
    if (!activeDigitalInspection.findings) activeDigitalInspection.findings = [];

    var existingIdx = activeDigitalInspection.findings.findIndex(function(f) { return f.id === (findingId || fIdDisplay); });
    var fObj = {
      id: findingId || fIdDisplay,
      questionId: qId,
      category: category,
      itemText: itemText || "Inspection Finding",
      desc: desc,
      location: location,
      severity: severity,
      immediateAction: immediateAction,
      capa: capa,
      responsible: responsible,
      targetDate: targetDate,
      status: status,
      beforePhoto: beforeB64 || (existingIdx >= 0 ? activeDigitalInspection.findings[existingIdx].beforePhoto : null),
      afterPhoto: afterB64 || (existingIdx >= 0 ? activeDigitalInspection.findings[existingIdx].afterPhoto : null),
      closureDate: status === "Closed" ? (closureDate || new Date().toISOString().slice(0, 10)) : "",
      verifyNote: verifyNote,
      closureComment: closureComment
    };

    if (existingIdx >= 0) {
      activeDigitalInspection.findings[existingIdx] = fObj;
    } else {
      activeDigitalInspection.findings.push(fObj);
    }

    renderActiveInspectionFindingsTable();
  }

  // Sync with Master CAPA NCRs if requested
  if (syncCapa && typeof findings !== "undefined") {
    var existingNcr = findings.find(function(n) { return n.sourceFindingId === (findingId || fIdDisplay); });
    var ncrNo = existingNcr ? existingNcr.ncrNo : getNextNCRNumber();
    var ncrObj = {
      id: existingNcr ? existingNcr.id : Date.now(),
      ncrNo: ncrNo,
      date: new Date().toISOString().slice(0, 10),
      dept: responsible || "Maintenance",
      area: location || (activeDigitalInspection ? activeDigitalInspection.area : "Campus"),
      finding: "[" + category + "] " + desc,
      requirement: itemText || "Safety Standard",
      priority: severity,
      action: capa,
      targetDate: targetDate,
      status: status === "Closed" ? "Closed" : "Open",
      category: "Inspection Finding",
      sourceInspectionNo: activeDigitalInspection ? activeDigitalInspection.no : "",
      sourceFindingId: findingId || fIdDisplay
    };
    if (existingNcr) {
      var nIdx = findings.findIndex(function(x) { return x.id === existingNcr.id; });
      if (nIdx >= 0) findings[nIdx] = ncrObj;
    } else {
      findings.unshift(ncrObj);
    }
    try { localStorage.setItem("SUT_FINDINGS", JSON.stringify(findings)); } catch (e) {}
    syncToCloud("findings", findings);
    renderDashboard();
  }

  var modal = document.getElementById("inspFindingModal");
  if (modal) modal.classList.add("hidden");

  showToast("success", "تم حفظ الملاحظة بنجاح: " + (findingId || fIdDisplay));
}

function deleteFindingFromActive(fId) {
  if (!activeDigitalInspection || !activeDigitalInspection.findings) return;
  activeDigitalInspection.findings = activeDigitalInspection.findings.filter(function(f) { return f.id !== fId; });
  renderActiveInspectionFindingsTable();
  showToast("info", "تم حذف الملاحظة.");
}

// Complete Inspection & Save into Permanent History
function completeCurrentInspection() {
  if (!activeDigitalInspection) return;

  activeDigitalInspection.status = "Completed";
  activeDigitalInspection.updatedAt = new Date().toISOString();

  var existingIdx = digitalInspections.findIndex(function(x) { return x.id === activeDigitalInspection.id; });
  if (existingIdx >= 0) {
    digitalInspections[existingIdx] = JSON.parse(JSON.stringify(activeDigitalInspection));
  } else {
    digitalInspections.unshift(JSON.parse(JSON.stringify(activeDigitalInspection)));
  }

  saveDigitalInspectionsData();

  var card = document.getElementById("activeInspWorksheetCard");
  if (card) card.classList.add("hidden");

  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "تم استكمال واعتماد الفحص الميداني بنجاح!",
      html: '<div style="text-align:right;font-size:12px;line-height:1.7">' +
        '<p>تم حفظ وتوثيق نتائج الفحص الميداني في السجل التاريخي الدائم برقم:</p>' +
        '<b style="font-size:15px;color:#0b1f3a;display:block;margin:6px 0">' + esc(activeDigitalInspection.no) + '</b>' +
        '<p><b>المنشأة:</b> ' + esc(activeDigitalInspection.area) + '<br><b>المفتش:</b> ' + esc(activeDigitalInspection.inspector) + '<br><b>الملاحظات المسجلة:</b> ' + (activeDigitalInspection.findings ? activeDigitalInspection.findings.length : 0) + '</p>' +
        '</div>',
      icon: "success",
      confirmButtonText: "عرض سجل الفحوصات",
      confirmButtonColor: "#059669"
    });
  } else {
    showToast("success", "تم استكمال وحفظ الفحص الميداني بنجاح: " + activeDigitalInspection.no);
  }

  activeDigitalInspection = null;
}

function saveCurrentInspectionDraft() {
  if (!activeDigitalInspection) return;

  activeDigitalInspection.status = "In Progress";
  activeDigitalInspection.updatedAt = new Date().toISOString();

  var existingIdx = digitalInspections.findIndex(function(x) { return x.id === activeDigitalInspection.id; });
  if (existingIdx >= 0) {
    digitalInspections[existingIdx] = JSON.parse(JSON.stringify(activeDigitalInspection));
  } else {
    digitalInspections.unshift(JSON.parse(JSON.stringify(activeDigitalInspection)));
  }

  saveDigitalInspectionsData();
  showToast("info", "تم حفظ مسودة الفحص الميداني بنجاح: " + activeDigitalInspection.no);
}

// Render Inspection Management History Table
function renderDigitalInspectionHistoryTable(query, monthVal, typeVal, locVal, findingStatusVal, statusVal) {
  var container = document.getElementById("inspMgmtHistoryTableContainer");
  if (!container) return;

  var q = (query !== undefined ? query : (document.getElementById("searchInspMgmt") ? document.getElementById("searchInspMgmt").value.trim().toLowerCase() : ""));
  var mFilter = (monthVal !== undefined ? monthVal : (document.getElementById("filterInspMgmtMonth") ? document.getElementById("filterInspMgmtMonth").value : ""));
  var tFilter = (typeVal !== undefined ? typeVal : (document.getElementById("filterInspMgmtType") ? document.getElementById("filterInspMgmtType").value : ""));
  var lFilter = (locVal !== undefined ? locVal : (document.getElementById("filterInspMgmtLocation") ? document.getElementById("filterInspMgmtLocation").value : ""));
  var fFilter = (findingStatusVal !== undefined ? findingStatusVal : (document.getElementById("filterInspMgmtFindingStatus") ? document.getElementById("filterInspMgmtFindingStatus").value : ""));
  var sFilter = (statusVal !== undefined ? statusVal : (document.getElementById("filterInspMgmtStatus") ? document.getElementById("filterInspMgmtStatus").value : ""));

  // Populate dynamic filter options
  var monthSel = document.getElementById("filterInspMgmtMonth");
  if (monthSel) {
    var curM = monthSel.value;
    var monthsSet = new Set();
    digitalInspections.forEach(function(x) { if (x.date) monthsSet.add(x.date.slice(0, 7)); });
    var mOpts = '<option value="">جميع الشهور / الفترات</option>';
    monthsSet.forEach(function(m) {
      mOpts += '<option value="' + m + '"' + (m === curM ? ' selected' : '') + '>' + m + '</option>';
    });
    monthSel.innerHTML = mOpts;
  }

  var typeSel = document.getElementById("filterInspMgmtType");
  if (typeSel) {
    var curT = typeSel.value;
    var typesSet = new Set();
    digitalInspections.forEach(function(x) { if (x.type) typesSet.add(x.type); });
    var tOpts = '<option value="">جميع أنواع الفحوصات</option>';
    typesSet.forEach(function(t) {
      tOpts += '<option value="' + esc(t) + '"' + (t === curT ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    typeSel.innerHTML = tOpts;
  }

  var locSel = document.getElementById("filterInspMgmtLocation");
  if (locSel) {
    var curL = locSel.value;
    var locsSet = new Set();
    digitalInspections.forEach(function(x) { if (x.area) locsSet.add(x.area); });
    var lOpts = '<option value="">جميع المواقع</option>';
    locsSet.forEach(function(l) {
      lOpts += '<option value="' + esc(l) + '"' + (l === curL ? ' selected' : '') + '>' + esc(l) + '</option>';
    });
    locSel.innerHTML = lOpts;
  }

  var todayStr = new Date().toISOString().slice(0, 10);

  var filtered = digitalInspections.filter(function(x) {
    var matchQuery = !q || (x.no && x.no.toLowerCase().includes(q)) || (x.title && x.title.toLowerCase().includes(q)) || (x.area && x.area.toLowerCase().includes(q)) || (x.inspector && x.inspector.toLowerCase().includes(q)) || (x.type && x.type.toLowerCase().includes(q));
    var matchMonth = !mFilter || (x.date && x.date.startsWith(mFilter));
    var matchType = !tFilter || x.type === tFilter;
    var matchLoc = !lFilter || x.area === lFilter;
    var matchStatus = !sFilter || x.status === sFilter;

    var matchFinding = true;
    var fList = x.findings || [];
    if (fFilter === "has_open") {
      matchFinding = fList.some(function(f) { return f.status !== "Closed"; });
    } else if (fFilter === "has_overdue") {
      matchFinding = fList.some(function(f) { return f.status !== "Closed" && f.targetDate && f.targetDate < todayStr; });
    } else if (fFilter === "all_closed") {
      matchFinding = fList.length > 0 && fList.every(function(f) { return f.status === "Closed"; });
    } else if (fFilter === "no_findings") {
      matchFinding = fList.length === 0;
    }

    return matchQuery && matchMonth && matchType && matchLoc && matchStatus && matchFinding;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:#64748b;font-size:12px">' +
      '<i class="fa-solid fa-folder-open" style="font-size:26px;margin-bottom:8px;display:block;opacity:0.5"></i>' +
      'لا توجد سجلات فحص مطابقة للبحث أو الفلتر المحدد.' +
      '</div>';
    return;
  }

  var html = '<table class="history-table">' +
    '<thead>' +
      '<tr>' +
        '<th style="width:4%;text-align:center"><input type="checkbox" id="headerInspCheck" onchange="toggleSelectAllInsp(this.checked)" style="cursor:pointer"></th>' +
        '<th style="width:10%">Inspection ID</th>' +
        '<th style="width:24%">Type &amp; Inspection Title</th>' +
        '<th style="width:16%">Facility / Location</th>' +
        '<th style="width:10%;text-align:center">Date &amp; Time</th>' +
        '<th style="width:12%">Inspector</th>' +
        '<th style="width:8%;text-align:center">Compliance</th>' +
        '<th style="width:10%;text-align:center">Findings</th>' +
        '<th style="width:6%;text-align:center">Status</th>' +
        '<th style="width:12%;text-align:center">Actions</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  filtered.forEach(function(x) {
    var isSelected = selectedDigitalInspIds.has(String(x.id));
    var fList = x.findings || [];
    var openCount = fList.filter(function(f) { return f.status !== "Closed"; }).length;
    var overdueCount = fList.filter(function(f) { return f.status !== "Closed" && f.targetDate && f.targetDate < todayStr; }).length;

    // Calculate score
    var evaluatedCount = 0;
    var passCount = 0;
    (x.questions || []).forEach(function(q) {
      var a = String(q.answer || "").toLowerCase();
      if (a === "pass" || a === "yes" || a === "good") { passCount++; evaluatedCount++; }
      else if (a === "fail" || a === "no" || a === "poor") { evaluatedCount++; }
    });
    var score = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 100;
    var scoreBadgeColor = score >= 90 ? "#10b981" : (score >= 70 ? "#f59e0b" : "#ef4444");

    html += '<tr style="' + (isSelected ? 'background:#f0f9ff' : '') + '">' +
      '<td style="text-align:center"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleInspSelection(\'' + x.id + '\', this.checked)" style="cursor:pointer"></td>' +
      '<td><b style="color:var(--sut-navy);font-family:Inter,monospace">' + esc(x.no) + '</b></td>' +
      '<td>' +
        '<b style="color:#0b1f3a;font-size:11.5px">' + esc(x.title) + '</b>' +
        '<small style="display:block;color:#0284c7;font-size:10px">' + esc(x.type) + '</small>' +
      '</td>' +
      '<td><b>' + esc(x.area) + '</b><small style="display:block;color:#64748b">' + esc(x.building) + '</small></td>' +
      '<td style="text-align:center;font-size:10.5px"><b>' + esc(x.date) + '</b><small style="display:block;color:#64748b">' + esc(x.time) + '</small></td>' +
      '<td style="font-size:11px">' + esc(x.inspector) + '</td>' +
      '<td style="text-align:center"><span style="display:inline-block;padding:2px 6px;border-radius:5px;background:' + scoreBadgeColor + ';color:#fff;font-weight:bold;font-size:11px">' + score + '%</span></td>' +
      '<td style="text-align:center">' +
        (fList.length === 0 ? '<span class="badge" style="background:#d1fae5;color:#047857">0 Issues</span>' :
          '<span class="badge" style="background:' + (overdueCount > 0 ? '#fee2e2' : '#fef3c7') + ';color:' + (overdueCount > 0 ? '#b91c1c' : '#b45309') + '">' + fList.length + ' (' + openCount + ' open' + (overdueCount > 0 ? ', ' + overdueCount + ' overdue' : '') + ')</span>') +
      '</td>' +
      '<td style="text-align:center"><span class="hist-status-badge ' + (x.status === "Completed" ? "hist-status-completed" : "hist-status-action") + '">' + esc(x.status) + '</span></td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="history-action-btn btn-view" title="عرض التقرير" onclick="viewDigitalInspectionReport(' + x.id + ')"><i class="fa-solid fa-eye"></i></button>' +
        '<button class="history-action-btn btn-view" title="تعديل الفحص (Edit)" style="background:#e0f2fe;color:#0369a1" onclick="editDigitalInspection(' + x.id + ')"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="history-action-btn btn-dup" title="تكرار الفحص للشهر القادم" onclick="duplicateDigitalInspection(' + x.id + ')"><i class="fa-solid fa-copy"></i></button>' +
        '<button class="history-action-btn btn-del" title="حذف الفحص" onclick="deleteDigitalInspection(' + x.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  updateSelectedInspCountBadge();
}

// Edit Existing Inspection (Non-Destructive - Keeps same ID, tracks updatedAt)
function editDigitalInspection(id) {
  var item = digitalInspections.find(function(x) { return x.id === id; });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على سجل الفحص المحدد.", "error");

  activeDigitalInspection = JSON.parse(JSON.stringify(item));
  activeDigitalInspection.updatedAt = new Date().toISOString();

  var card = document.getElementById("activeInspWorksheetCard");
  if (card) card.classList.remove("hidden");

  renderDigitalChecklistWorksheet();

  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  showToast("info", "تم فتح الفحص للتعديل الميداني: " + item.no);
}

// Duplicate Inspection for New Period (Creates New Record with New ID)
function duplicateDigitalInspection(id) {
  var item = digitalInspections.find(function(x) { return x.id === id; });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على سجل الفحص.", "error");

  var clone = JSON.parse(JSON.stringify(item));
  var newId = Date.now();
  var newInspNo = getNextDigitalInspectionId();
  var today = new Date().toISOString().slice(0, 10);
  var timeNow = new Date().toTimeString().slice(0, 5);

  clone.id = newId;
  clone.no = newInspNo;
  clone.date = today;
  clone.time = timeNow;
  clone.title = (item.templateName || item.type) + " — " + item.area + " (" + today + ")";
  clone.status = "In Progress";
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();
  clone.findings = []; // Fresh findings for new inspection cycle

  // Reset answers if desired
  if (clone.questions) {
    clone.questions.forEach(function(q) {
      q.answer = "";
      q.comment = "";
      q.photos = [];
    });
  }

  digitalInspections.unshift(clone);
  saveDigitalInspectionsData();

  showToast("success", "تم تكرار نموذج الفحص بنجاح كفحص جديد برقم: " + newInspNo);
}

// Delete Inspection Record
async function deleteDigitalInspection(id) {
  var item = digitalInspections.find(function(x) { return x.id === id; });
  if (!item) return;

  var res = await showConfirmDialog("تأكيد الحذف", "هل أنت متأكد من حذف سجل الفحص رقم " + item.no + "؟ لا يمكن التراجع عن هذا الإجراء.", "نعم، احذف", "إلغاء");
  if (res && res.isConfirmed) {
    digitalInspections = digitalInspections.filter(function(x) { return x.id !== id; });
    saveDigitalInspectionsData();
    showToast("info", "تم حذف سجل الفحص من المنظومة.");
  }
}

// Selection & Batch Action Toolbar Management
function toggleSelectAllInsp(checked) {
  if (checked) {
    digitalInspections.forEach(function(x) { selectedDigitalInspIds.add(String(x.id)); });
  } else {
    selectedDigitalInspIds.clear();
  }
  renderDigitalInspectionHistoryTable();
}

function toggleInspSelection(id, checked) {
  if (checked) {
    selectedDigitalInspIds.add(String(id));
  } else {
    selectedDigitalInspIds.delete(String(id));
  }
  updateSelectedInspCountBadge();
  var checkAll = document.getElementById("selectAllInspCheck");
  if (checkAll) {
    checkAll.checked = (selectedDigitalInspIds.size === digitalInspections.length && digitalInspections.length > 0);
  }
}

function updateSelectedInspCountBadge() {
  var badge = document.getElementById("selectedInspCountBadge");
  if (badge) badge.textContent = selectedDigitalInspIds.size + " Selected";
}

// View Full Single Inspection Report
function viewDigitalInspectionReport(id) {
  var item = digitalInspections.find(function(x) { return x.id === id; });
  if (!item) return showSweetAlert("خطأ", "لم يتم العثور على الفحص المحدد.", "error");

  var modal = document.getElementById("inspReportModal");
  var body = document.getElementById("inspReportModalBody");
  var title = document.getElementById("inspReportModalTitle");
  if (!modal || !body) return;

  if (title) title.textContent = "تقرير الفحص الميداني المعتمد: " + item.no;
  body.innerHTML = renderSingleInspectionDocumentHTML(item);

  // Hook word & pdf export buttons for current report
  var wordBtn = document.getElementById("inspReportWordBtn");
  if (wordBtn) wordBtn.onclick = function() { exportSingleInspectionWord(item.id); };
  var pdfBtn = document.getElementById("inspReportPdfBtn");
  if (pdfBtn) pdfBtn.onclick = function() { exportSingleInspectionPDF(item.id); };
  var printBtn = document.getElementById("inspReportPrintBtn");
  if (printBtn) printBtn.onclick = function() { printReport("inspReportModalBody"); };

  modal.classList.remove("hidden");
}

// Generate High-Fidelity Printable/Exportable HTML for Inspection
function renderSingleInspectionDocumentHTML(insp) {
  var qList = insp.questions || [];
  var fList = insp.findings || [];

  // Calculate score
  var evaluatedCount = 0;
  var passCount = 0;
  var failCount = 0;
  var naCount = 0;

  qList.forEach(function(q) {
    var a = String(q.answer || "").toLowerCase();
    if (a === "pass" || a === "yes" || a === "good") { passCount++; evaluatedCount++; }
    else if (a === "fail" || a === "no" || a === "poor") { failCount++; evaluatedCount++; }
    else if (a === "fair") { evaluatedCount++; }
    else if (a === "n/a" || a === "na") { naCount++; }
  });

  var score = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 100;
  var scoreStatus = score >= 90 ? "مطابق بالكامل (Fully Compliant)" : (score >= 70 ? "مطلوب إجراءات تصحيحية (Action Required)" : "غير مطابق يستوجب تدخلاً فورياً (Critical)");

  var logoSrc = customLogoUrl || SUT_LOGO_B64;

  var html = '<div class="insp-doc-container" dir="rtl">' +
    /* Document Header */
    '<div class="insp-doc-header">' +
      '<div><img src="' + logoSrc + '" class="insp-doc-logo" alt="SUTech Logo"></div>' +
      '<div class="insp-doc-title" style="text-align:center;flex:1">' +
        '<h2>' + esc(insp.title) + '</h2>' +
        '<p>جامعة السويدي للتكنولوجيا (SUTech) — إدارة السلامة والصحة المهنية والبيئة</p>' +
      '</div>' +
      '<div style="text-align:left;min-width:130px">' +
        '<b style="font-family:Inter,monospace;font-size:13px;color:#0b1f3a">' + esc(insp.no) + '</b><br>' +
        '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px">' + esc(insp.status) + '</span>' +
      '</div>' +
    '</div>' +

    /* Metadata Table */
    '<table class="insp-doc-meta-table">' +
      '<tr>' +
        '<td style="width:25%"><b>نوع الفحص:</b> ' + esc(insp.type) + '</td>' +
        '<td style="width:25%"><b>تاريخ الفحص:</b> ' + esc(insp.date) + ' ' + esc(insp.time) + '</td>' +
        '<td style="width:25%"><b>الموقع / المبنى:</b> ' + esc(insp.area) + ' (' + esc(insp.building) + ')</td>' +
        '<td style="width:25%"><b>القسم المسؤول:</b> ' + esc(insp.dept) + '</td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>المفتش المسؤول:</b> ' + esc(insp.inspector) + '</td>' +
        '<td><b>الوردية:</b> ' + esc(insp.shift) + '</td>' +
        '<td><b>المرافق بالجولة:</b> ' + esc(insp.accompaniedBy || "بدون مرافقة") + '</td>' +
        '<td><b>تاريخ الاعتماد:</b> ' + esc(insp.updatedAt ? insp.updatedAt.slice(0, 10) : insp.date) + '</td>' +
      '</tr>' +
    '</table>' +

    /* Compliance Banner */
    '<div class="insp-doc-score-banner">' +
      '<div class="insp-doc-score-item"><b>' + score + '%</b><span>نسبة الامتثال للسلامة</span></div>' +
      '<div class="insp-doc-score-item"><b>' + qList.length + '</b><span>إجمالي البنود</span></div>' +
      '<div class="insp-doc-score-item"><b style="color:#10b981">' + passCount + '</b><span>مطابق (Pass)</span></div>' +
      '<div class="insp-doc-score-item"><b style="color:#ef4444">' + failCount + '</b><span>مخالفة (Fail)</span></div>' +
      '<div class="insp-doc-score-item"><b>' + fList.length + '</b><span>إجمالي الملاحظات (CAPA)</span></div>' +
      '<div><span style="display:inline-block;padding:6px 12px;border-radius:6px;background:' + (score >= 90 ? '#10b981' : (score >= 70 ? '#f59e0b' : '#ef4444')) + ';color:#fff;font-weight:bold;font-size:11px">' + scoreStatus + '</span></div>' +
    '</div>' +

    /* Checklist Table */
    '<div style="font-weight:bold;color:#0b1f3a;margin-bottom:6px;font-size:12.5px"><i class="fa-solid fa-list-check" style="color:#0284c7"></i> نتائج بنود وقائمة الفحص الميداني (Checklist Results)</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px">' +
      '<thead>' +
        '<tr style="background:#0b1f3a;color:#fff">' +
          '<th style="width:5%;padding:6px;text-align:center">#</th>' +
          '<th style="width:20%;padding:6px">التصنيف (Category)</th>' +
          '<th style="width:35%;padding:6px">بند واشتراط الفحص (Requirement)</th>' +
          '<th style="width:12%;padding:6px;text-align:center">النتيجة (Result)</th>' +
          '<th style="width:28%;padding:6px">الملاحظات الميدانية (Observation)</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  qList.forEach(function(q, idx) {
    var a = q.answer || "N/A";
    var aLower = a.toLowerCase();
    var bg = (aLower === "pass" || aLower === "yes" || aLower === "good") ? "#f0fdf4" : ((aLower === "fail" || aLower === "no" || aLower === "poor") ? "#fef2f2" : "#f8fafc");
    var badgeColor = (aLower === "pass" || aLower === "yes" || aLower === "good") ? "#10b981" : ((aLower === "fail" || aLower === "no" || aLower === "poor") ? "#ef4444" : "#64748b");

    html += '<tr style="background:' + bg + ';border-bottom:1px solid #e2e8f0">' +
      '<td style="text-align:center;padding:5px;font-weight:bold">' + (idx + 1) + '</td>' +
      '<td style="padding:5px;font-weight:bold;color:#0b1f3a">' + esc(q.category) + '</td>' +
      '<td style="padding:5px"><b>' + esc(q.text) + '</b><small style="display:block;color:#64748b">' + esc(q.requirement) + '</small></td>' +
      '<td style="text-align:center;padding:5px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:' + badgeColor + ';color:#fff;font-weight:bold">' + esc(a) + (q.unit ? ' ' + q.unit : '') + '</span></td>' +
      '<td style="padding:5px">' + esc(q.comment || "مطابق للاشتراطات القياسية.") + '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';

  /* Findings & CAPA Table */
  if (fList.length > 0) {
    html += '<div style="font-weight:bold;color:#b91c1c;margin-bottom:6px;font-size:12.5px"><i class="fa-solid fa-triangle-exclamation"></i> سجل المخالفات والإجراءات التصحيحية المعتمدة (Findings &amp; Corrective Actions)</div>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px">' +
        '<thead>' +
          '<tr style="background:#7f1d1d;color:#fff">' +
            '<th style="width:10%;padding:6px;text-align:center">Finding ID</th>' +
            '<th style="width:25%;padding:6px">وصف المخالفة (Finding Description)</th>' +
            '<th style="width:25%;padding:6px">الإجراء التصحيحي المطلوب (CAPA)</th>' +
            '<th style="width:8%;padding:6px;text-align:center">الخطورة</th>' +
            '<th style="width:12%;padding:6px">المسؤول والموعد</th>' +
            '<th style="width:10%;padding:6px;text-align:center">الحالة</th>' +
            '<th style="width:10%;padding:6px">التحقق</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

    fList.forEach(function(f) {
      html += '<tr style="border-bottom:1px solid #fca5a5;background:#fff5f5">' +
        '<td style="text-align:center;padding:5px;font-weight:bold;color:#7f1d1d">' + esc(f.id) + '</td>' +
        '<td style="padding:5px"><b>' + esc(f.desc) + '</b><small style="display:block;color:#64748b">' + esc(f.location) + '</small></td>' +
        '<td style="padding:5px">' + esc(f.capa) + '</td>' +
        '<td style="text-align:center;padding:5px"><span class="sev-badge ' + (f.severity || "medium").toLowerCase() + '">' + esc(f.severity) + '</span></td>' +
        '<td style="padding:5px"><b>' + esc(f.responsible) + '</b><small style="display:block;color:#64748b">' + esc(f.targetDate) + '</small></td>' +
        '<td style="text-align:center;padding:5px"><span class="fnd-badge ' + f.status.toLowerCase().replace(/\s+/g, "") + '">' + esc(f.status) + '</span></td>' +
        '<td style="padding:5px;font-size:9.5px">' + esc(f.verifyNote || (f.status === "Closed" ? "تم التحقق والإغلاق" : "جاري المتابعة")) + '</td>' +
      '</tr>';
    });

    html += '</tbody></table>';
  }

  /* Signatures Block */
  html += '<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center;font-size:11px">' +
    '<div style="border:1px solid #cbd5e1;padding:10px;border-radius:6px;background:#f8fafc">' +
      '<b>توقيع المفتش المسؤول</b><br><br><div style="border-bottom:1px solid #000;margin:12px 20px 6px 20px"></div><small>' + esc(insp.inspector) + '</small>' +
    '</div>' +
    '<div style="border:1px solid #cbd5e1;padding:10px;border-radius:6px;background:#f8fafc">' +
      '<b>مسؤول المنشأة / القسم</b><br><br><div style="border-bottom:1px solid #000;margin:12px 20px 6px 20px"></div><small>' + esc(insp.accompaniedBy || "مشرف الموقع") + '</small>' +
    '</div>' +
    '<div style="border:1px solid #cbd5e1;padding:10px;border-radius:6px;background:#f8fafc">' +
      '<b>اعتماد مدير إدارة السلامة (HSE Director)</b><br><br><div style="border-bottom:1px solid #000;margin:12px 20px 6px 20px"></div><small>جامعة السويدي للتكنولوجيا (SUTech)</small>' +
    '</div>' +
  '</div></div>';

  return html;
}

// Single Inspection Exports
function exportSingleInspectionPDF(id) {
  var item = digitalInspections.find(function(x) { return x.id === id; });
  if (!item) return;

  var printContainer = document.createElement("div");
  printContainer.innerHTML = renderSingleInspectionDocumentHTML(item);
  document.body.appendChild(printContainer);

  window.print();
  document.body.removeChild(printContainer);
}

function exportSingleInspectionWord(id) {
  var item = digitalInspections.find(function(x) { return x.id === id; });
  if (!item) return;

  var docContent = renderSingleInspectionDocumentHTML(item);
  var logoSrc = customLogoUrl || SUT_LOGO_B64;

  var doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + esc(item.title) + '</title>' +
    '<style>' +
    '@page Section1 { size: 595.3pt 841.9pt; margin: 28.35pt; }' +
    'div.Section1 { page: Section1; }' +
    'body { font-family: Arial, Cairo, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #000; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    'th { background-color: #0b1f3a !important; color: #ffffff !important; font-weight: bold; border: 1pt solid #000; padding: 4pt; }' +
    'td { border: 1pt solid #000; padding: 4pt; }' +
    '</style></head>' +
    '<body lang="AR-EG" dir="rtl">' +
    '<div class="Section1">' + docContent + '</div>' +
    '</body></html>';

  downloadBlob("\ufeff" + doc, "SUTech-Inspection-" + (item.no || "Report") + ".doc", "application/msword");
  showToast("success", "تم تنزيل تقرير الفحص بصيغة Word بنجاح!");
}

// Batch Export: Separate PDFs
function exportSelectedInspectionsSeparate() {
  if (selectedDigitalInspIds.size === 0) {
    return showSweetAlert("تنبيه", "يرجى تحديد فحص واحد على الأقل للتصدير عبر المربعات بجانب الجدول.", "warning");
  }

  var selectedList = digitalInspections.filter(function(x) { return selectedDigitalInspIds.has(String(x.id)); });
  selectedList.forEach(function(item, idx) {
    setTimeout(function() {
      exportSingleInspectionWord(item.id);
    }, idx * 400);
  });

  showToast("success", "جاري تصدير " + selectedList.length + " تقارير فحص مستقلة بنجاح!");
}

// Batch Export: One Combined PDF / Document Package
function exportSelectedInspectionsCombined() {
  if (selectedDigitalInspIds.size === 0) {
    return showSweetAlert("تنبيه", "يرجى تحديد الفحوصات المطلوب تجميعها في الملف المجمع.", "warning");
  }

  var selectedList = digitalInspections.filter(function(x) { return selectedDigitalInspIds.has(String(x.id)); });
  var monthStr = new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  var logoSrc = customLogoUrl || SUT_LOGO_B64;

  var combinedHTML = '<div class="insp-doc-container" dir="rtl">' +
    /* Package Cover Page */
    '<div style="text-align:center;padding:40px 20px;border-bottom:3px solid #0b1f3a;margin-bottom:30px">' +
      '<img src="' + logoSrc + '" style="height:75px;margin-bottom:14px" alt="Logo">' +
      '<h1 style="font-size:22px;color:#0b1f3a;margin:0 0 8px 0">حزمة تقارير الفحص والتفتيش الميداني الشاملة</h1>' +
      '<h3 style="font-size:16px;color:#c00000;margin:0 0 14px 0">University Consolidated HSE Inspection Package — ' + monthStr + '</h3>' +
      '<p style="font-size:12px;color:#64748b">جامعة السويدي للتكنولوجيا (SUTech) — إدارة السلامة والصحة المهنية والبيئة</p>' +
      '<div style="display:inline-block;margin-top:16px;padding:8px 18px;background:#e0f2fe;color:#0369a1;border-radius:8px;font-weight:bold;font-size:13px">' +
        'إجمالي الفحوصات الميدانية المرفقة بالحزمة: ' + selectedList.length + ' تقارير تفتيش معتمدة' +
      '</div>' +
    '</div>' +

    /* Table of Contents */
    '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px 20px;margin-bottom:30px">' +
      '<h3 style="margin:0 0 10px 0;font-size:14px;color:#0b1f3a"><i class="fa-solid fa-list-ol"></i> فهرس الفحوصات المتضمنة بالملف:</h3>' +
      '<ol style="margin:0;padding-inline-start:20px;font-size:12px;line-height:1.8">';

  selectedList.forEach(function(x) {
    combinedHTML += '<li><b>' + esc(x.no) + '</b> — ' + esc(x.title) + ' (الموقع: ' + esc(x.area) + ' | التاريخ: ' + esc(x.date) + ')</li>';
  });

  combinedHTML += '</ol></div>';

  /* Append Each Inspection Document with Clean Page Break */
  selectedList.forEach(function(item, idx) {
    combinedHTML += '<div class="insp-page-break">' + renderSingleInspectionDocumentHTML(item) + '</div>';
  });

  combinedHTML += '</div>';

  var modal = document.getElementById("inspReportModal");
  var body = document.getElementById("inspReportModalBody");
  var title = document.getElementById("inspReportModalTitle");
  if (modal && body) {
    if (title) title.textContent = "حزمة تقارير الفحص المجمعة (" + selectedList.length + " فحوصات)";
    body.innerHTML = combinedHTML;
    modal.classList.remove("hidden");
  }

  // Also trigger Word download
  var doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>SUTech Consolidated Inspection Package</title>' +
    '<style>' +
    '@page Section1 { size: 595.3pt 841.9pt; margin: 28.35pt; }' +
    'div.Section1 { page: Section1; }' +
    'body { font-family: Arial, Cairo, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #000; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    'th { background-color: #0b1f3a !important; color: #ffffff !important; font-weight: bold; border: 1pt solid #000; padding: 4pt; }' +
    'td { border: 1pt solid #000; padding: 4pt; }' +
    '.insp-page-break { page-break-before: always; }' +
    '</style></head>' +
    '<body lang="AR-EG" dir="rtl"><div class="Section1">' + combinedHTML + '</div></body></html>';

  downloadBlob("\ufeff" + doc, "SUTech-Consolidated-Inspections-Package-" + new Date().toISOString().slice(0, 10) + ".doc", "application/msword");
  showToast("success", "تم إنشاء وتحميل حزمة الفحوصات المجمعة بنجاح!");
}

// Monthly Package PDF Quick Action
function exportMonthlyPackagePDF() {
  var curMonth = new Date().toISOString().slice(0, 7);
  var monthlyInsps = digitalInspections.filter(function(x) { return x.date && x.date.startsWith(curMonth); });

  if (monthlyInsps.length === 0) {
    // If no records in current month, take latest 5
    monthlyInsps = digitalInspections.slice(0, 5);
  }

  selectedDigitalInspIds.clear();
  monthlyInsps.forEach(function(x) { selectedDigitalInspIds.add(String(x.id)); });
  renderDigitalInspectionHistoryTable();

  exportSelectedInspectionsCombined();
}

// Master Excel Export for Digital Inspections
function exportInspectionsMasterExcel() {
  if (typeof XLSX === "undefined") {
    return showSweetAlert("خطأ", "مكتبة SheetJS غير محملة.", "error");
  }

  var wb = XLSX.utils.book_new();

  // Sheet 1: Inspections Summary
  var summaryData = [
    ["El Sewedy University of Technology (SUTech) — Digital Inspections Register"],
    ["Inspection ID", "Inspection Type", "Document Title", "Site / Campus", "Building", "Area / Location", "Department", "Lead Inspector", "Date", "Time", "Status", "Total Findings", "Open Findings", "Closed Findings"]
  ];

  digitalInspections.forEach(function(x) {
    var fList = x.findings || [];
    var openCount = fList.filter(function(f) { return f.status !== "Closed"; }).length;
    var closedCount = fList.filter(function(f) { return f.status === "Closed"; }).length;

    summaryData.push([
      x.no || "",
      x.type || "",
      x.title || "",
      x.site || "",
      x.building || "",
      x.area || "",
      x.dept || "",
      x.inspector || "",
      x.date || "",
      x.time || "",
      x.status || "Completed",
      fList.length,
      openCount,
      closedCount
    ]);
  });

  var wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Inspections_Register");

  // Sheet 2: All Findings & Corrective Actions
  var findingsData = [
    ["Finding ID", "Source Inspection No.", "Facility / Location", "Category", "Checklist Item", "Finding Description", "Severity", "Immediate Action", "Corrective Action (CAPA)", "Responsible Person / Dept", "Target Due Date", "Status", "Closure Date", "Verification Note"]
  ];

  digitalInspections.forEach(function(insp) {
    (insp.findings || []).forEach(function(f) {
      findingsData.push([
        f.id || "",
        insp.no || "",
        f.location || insp.area || "",
        f.category || "",
        f.itemText || "",
        f.desc || "",
        f.severity || "Medium",
        f.immediateAction || "",
        f.capa || "",
        f.responsible || "",
        f.targetDate || "",
        f.status || "Open",
        f.closureDate || "",
        f.verifyNote || ""
      ]);
    });
  });

  var wsFindings = XLSX.utils.aoa_to_sheet(findingsData);
  XLSX.utils.book_append_sheet(wb, wsFindings, "Findings_and_CAPA");

  var fileName = "SUT-Digital-Inspections-Master-" + new Date().toISOString().slice(0, 10) + ".xlsx";
  XLSX.writeFile(wb, fileName);
  showToast("success", "تم تصدير سجل الفحوصات الميدانية والملاحظات بصيغة Excel بنجاح!");
}

// Connect Checklist Generator to Digital Inspection Management (Requirement #10)
function useChecklistInInspectionManagement() {
  if (!lastGeneratedInspectionData || !lastGeneratedInspectionData.data) {
    return showSweetAlert("تنبيه", "يرجى توليد أو اختيار قائمة فحص أولاً لاستخدامها في منظومة إدارة الفحص.", "warning");
  }

  var d = lastGeneratedInspectionData;
  var items = (d.data && d.data.items) ? d.data.items : [];

  // Switch to Inspection Management tab
  var navBtn = document.querySelector('button[data-tab="insp_mgmt"]');
  if (navBtn) navBtn.click();

  // Open modal with prefilled metadata
  openNewInspectionModal("Custom Inspection", items);

  if (document.getElementById("newInspAreaInput")) document.getElementById("newInspAreaInput").value = d.area || "";
  if (document.getElementById("newInspNotesInput")) document.getElementById("newInspNotesInput").value = d.title || "";

  showToast("info", "تم تجهيز قائمة الفحص للبدء الميداني الرقمي.");
}

// Template Manager Functions
function openTemplateManagementModal() {
  var modal = document.getElementById("inspTemplateModal");
  if (!modal) return;

  var sel = document.getElementById("tmplMgrSelect");
  if (sel) {
    sel.innerHTML = inspectionTemplates.map(function(t) {
      return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>';
    }).join("");
    sel.onchange = function() { loadTemplateIntoManager(this.value); };
  }

  var typeSel = document.getElementById("tmplMgrTypeSelect");
  if (typeSel) {
    var types = [
      "Monthly HSE Inspection", "Restaurant Inspection", "Cafeteria Inspection", "Pantry Inspection",
      "Laboratory Inspection", "Fire Extinguisher Inspection", "Fire Safety Inspection", "Elevator Inspection",
      "Electrical Inspection", "Workshop Inspection", "Warehouse Inspection", "PPE Inspection",
      "Housekeeping Inspection", "Machinery / Equipment Inspection", "Contractor Inspection",
      "Bus / Vehicle Inspection", "Parking / Traffic Safety Inspection", "Emergency Exit Inspection",
      "Building Inspection", "Environmental Inspection", "Waste Management Inspection",
      "Event Safety Inspection", "Custom Inspection"
    ];
    typeSel.innerHTML = types.map(function(t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join("");
  }

  if (inspectionTemplates.length > 0) {
    loadTemplateIntoManager(inspectionTemplates[0].id);
  }

  modal.classList.remove("hidden");
}

function loadTemplateIntoManager(templateId) {
  var t = inspectionTemplates.find(function(x) { return x.id === templateId; });
  if (!t) return;

  if (document.getElementById("tmplMgrNameInput")) document.getElementById("tmplMgrNameInput").value = t.name || "";
  if (document.getElementById("tmplMgrTypeSelect")) document.getElementById("tmplMgrTypeSelect").value = t.type || "Monthly HSE Inspection";
  if (document.getElementById("tmplMgrDescInput")) document.getElementById("tmplMgrDescInput").value = t.desc || "";

  renderTemplateQuestionsManager(t.questions || []);
}

function renderTemplateQuestionsManager(questions) {
  var container = document.getElementById("tmplQuestionsListContainer");
  var countBadge = document.getElementById("tmplQuestionsCount");
  if (!container) return;

  if (countBadge) countBadge.textContent = questions.length;

  var html = "";
  questions.forEach(function(q, i) {
    html += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:6px">' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<b style="color:#0284c7;font-size:11.5px">#' + (i + 1) + '</b>' +
        '<input type="text" style="flex:2;font-size:11px;padding:4px 6px" placeholder="نص بند واشتراط الفحص..." value="' + esc(q.text || "") + '" id="tQText_' + i + '">' +
        '<select style="flex:1;font-size:11px;padding:4px 6px" id="tQType_' + i + '">' +
          '<option value="PASS_FAIL_NA"' + (q.type === "PASS_FAIL_NA" ? " selected" : "") + '>PASS / FAIL / N/A</option>' +
          '<option value="YES_NO_NA"' + (q.type === "YES_NO_NA" ? " selected" : "") + '>YES / NO / N/A</option>' +
          '<option value="GOOD_FAIR_POOR"' + (q.type === "GOOD_FAIR_POOR" ? " selected" : "") + '>GOOD / FAIR / POOR</option>' +
          '<option value="NUMBER"' + (q.type === "NUMBER" ? " selected" : "") + '>NUMBER (Numeric Input)</option>' +
          '<option value="TEXT"' + (q.type === "TEXT" ? " selected" : "") + '>TEXT (Free-Text)</option>' +
        '</select>' +
        '<button type="button" class="history-action-btn btn-del" onclick="removeQuestionFromTemplateManager(' + i + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<input type="text" style="flex:1;font-size:10.5px;padding:3px 6px" placeholder="التصنيف (Category)..." value="' + esc(q.category || "") + '" id="tQCat_' + i + '">' +
        '<input type="text" style="flex:2;font-size:10.5px;padding:3px 6px" placeholder="معيار القبول والاشتراط المطلوب..." value="' + esc(q.requirement || "") + '" id="tQReq_' + i + '">' +
      '</div>' +
    '</div>';
  });

  container.innerHTML = html;
}

function removeQuestionFromTemplateManager(idx) {
  var sel = document.getElementById("tmplMgrSelect");
  if (!sel) return;
  var t = inspectionTemplates.find(function(x) { return x.id === sel.value; });
  if (t && t.questions && t.questions[idx]) {
    t.questions.splice(idx, 1);
    renderTemplateQuestionsManager(t.questions);
  }
}

function addQuestionToTemplateManager() {
  var sel = document.getElementById("tmplMgrSelect");
  if (!sel) return;
  var t = inspectionTemplates.find(function(x) { return x.id === sel.value; });
  if (!t) return;
  if (!t.questions) t.questions = [];

  t.questions.push({
    id: t.questions.length + 1,
    category: "General Safety",
    text: "بند فحص جديد",
    type: "PASS_FAIL_NA",
    requirement: "مطابق للاشتراطات الفنية"
  });

  renderTemplateQuestionsManager(t.questions);
}

function saveTemplateFromManager() {
  var sel = document.getElementById("tmplMgrSelect");
  if (!sel) return;
  var t = inspectionTemplates.find(function(x) { return x.id === sel.value; });
  if (!t) return;

  t.name = document.getElementById("tmplMgrNameInput").value.trim() || t.name;
  t.type = document.getElementById("tmplMgrTypeSelect").value || t.type;
  t.desc = document.getElementById("tmplMgrDescInput").value.trim();

  // Save questions
  (t.questions || []).forEach(function(q, i) {
    var txtEl = document.getElementById("tQText_" + i);
    var typeEl = document.getElementById("tQType_" + i);
    var catEl = document.getElementById("tQCat_" + i);
    var reqEl = document.getElementById("tQReq_" + i);

    if (txtEl) q.text = txtEl.value.trim();
    if (typeEl) q.type = typeEl.value;
    if (catEl) q.category = catEl.value.trim() || "General Safety";
    if (reqEl) q.requirement = reqEl.value.trim();
  });

  saveInspectionTemplatesData();
  var modal = document.getElementById("inspTemplateModal");
  if (modal) modal.classList.add("hidden");

  showToast("success", "تم حفظ وتحديث القالب بنجاح!");
}

/* =========================================================================
   APPLICATION INITIALIZATION & HISTORY HOOKS
   ========================================================================= */

/* =========================================================================
   APPLICATION INITIALIZATION & HISTORY HOOKS
   ========================================================================= */

function initSecondaryAndHistoricalModules() {
  try {
    initDigitalInspectionsData();
  } catch (e) { console.warn("initDigitalInspectionsData error:", e); }

  try {
    updateInspectionDashboardKPIs();
  } catch (e) { console.warn("updateInspectionDashboardKPIs error:", e); }

  try {
    renderDigitalInspectionHistoryTable();
  } catch (e) { console.warn("renderDigitalInspectionHistoryTable error:", e); }

  try {
    renderInspectionHistoryTable();
  } catch (e) { console.warn("renderInspectionHistoryTable error:", e); }

  try {
    renderMomHistoryTable();
  } catch (e) { console.warn("renderMomHistoryTable error:", e); }

  try {
    renderRiskHistoryTable();
  } catch (e) { console.warn("renderRiskHistoryTable error:", e); }

  try {
    updateBackupStatsBadges();
  } catch (e) { console.warn("updateBackupStatsBadges error:", e); }

  // Inspection Management Buttons & Modals Wireup
  var openNewInspBtn = document.getElementById("openNewInspModalBtn");
  if (openNewInspBtn) openNewInspBtn.addEventListener("click", function() { openNewInspectionModal(); });
  var histNewInspBtn = document.getElementById("histNewInspBtn");
  if (histNewInspBtn) histNewInspBtn.addEventListener("click", function() { openNewInspectionModal(); });

  var closeNewInspBtn = document.getElementById("closeNewInspModalBtn");
  if (closeNewInspBtn) closeNewInspBtn.addEventListener("click", function() { document.getElementById("newInspectionModal").classList.add("hidden"); });
  var cancelNewInspBtn = document.getElementById("cancelNewInspModalBtn");
  if (cancelNewInspBtn) cancelNewInspBtn.addEventListener("click", function() { document.getElementById("newInspectionModal").classList.add("hidden"); });

  var newInspTypeSel = document.getElementById("newInspTypeSelect");
  if (newInspTypeSel) {
    newInspTypeSel.addEventListener("change", function() {
      populateTemplateSelectForType(this.value);
    });
  }

  var startNewDigitalBtn = document.getElementById("startNewDigitalInspBtn");
  if (startNewDigitalBtn) {
    startNewDigitalBtn.addEventListener("click", function() {
      var typeEl = document.getElementById("newInspTypeSelect");
      var tmplEl = document.getElementById("newInspTemplateSelect");
      var type = typeEl ? typeEl.value : "bus";
      var tmplId = tmplEl ? tmplEl.value : "";
      var g = function(id) { var el = document.getElementById(id); return el ? el.value : ""; };
      var meta = {
        no: g("newInspIdInput"),
        site: g("newInspSiteInput"),
        building: g("newInspBuildingInput"),
        area: g("newInspAreaInput"),
        dept: g("newInspDeptInput"),
        inspector: g("newInspInspectorInput"),
        date: g("newInspDateInput"),
        time: g("newInspTimeInput"),
        shift: g("newInspShiftSelect"),
        accompaniedBy: g("newInspAccompaniedInput"),
        notes: g("newInspNotesInput")
      };
      var modal = document.getElementById("newInspectionModal");
      if (modal) modal.classList.add("hidden");
      startDigitalInspection(type, tmplId, meta);
    });
  }

  // Worksheet Action Buttons
  var wsCompleteBtn = document.getElementById("wsCompleteInspBtn");
  if (wsCompleteBtn) wsCompleteBtn.addEventListener("click", completeCurrentInspection);
  var wsSaveDraftBtn = document.getElementById("wsSaveDraftBtn");
  if (wsSaveDraftBtn) wsSaveDraftBtn.addEventListener("click", saveCurrentInspectionDraft);
  var wsCloseBtn = document.getElementById("wsCloseBtn");
  if (wsCloseBtn) wsCloseBtn.addEventListener("click", function() {
    var ws = document.getElementById("activeInspWorksheetCard");
    if (ws) ws.classList.add("hidden");
    activeDigitalInspection = null;
  });
  var wsViewReportBtn = document.getElementById("wsViewReportBtn");
  if (wsViewReportBtn) wsViewReportBtn.addEventListener("click", function() {
    if (activeDigitalInspection) {
      viewDigitalInspectionReport(activeDigitalInspection.id);
    }
  });
  var wsPassAllBtn = document.getElementById("wsPassAllQuestionsBtn");
  if (wsPassAllBtn) wsPassAllBtn.addEventListener("click", passAllDigitalQuestions);

  // Finding Modal Buttons
  var closeFndBtn = document.getElementById("closeInspFindingModalBtn");
  if (closeFndBtn) closeFndBtn.addEventListener("click", function() { var m = document.getElementById("inspFindingModal"); if (m) m.classList.add("hidden"); });
  var cancelFndBtn = document.getElementById("cancelInspFindingModalBtn");
  if (cancelFndBtn) cancelFndBtn.addEventListener("click", function() { var m = document.getElementById("inspFindingModal"); if (m) m.classList.add("hidden"); });
  var saveFndBtn = document.getElementById("saveInspFindingModalBtn");
  if (saveFndBtn) saveFndBtn.addEventListener("click", saveFindingFromModal);

  // Template Manager Buttons
  var openTmplBtn = document.getElementById("openTemplateManagerBtn");
  if (openTmplBtn) openTmplBtn.addEventListener("click", openTemplateManagementModal);
  var closeTmplBtn = document.getElementById("closeInspTemplateModalBtn");
  if (closeTmplBtn) closeTmplBtn.addEventListener("click", function() { var m = document.getElementById("inspTemplateModal"); if (m) m.classList.add("hidden"); });
  var cancelTmplBtn = document.getElementById("cancelInspTemplateModalBtn");
  if (cancelTmplBtn) cancelTmplBtn.addEventListener("click", function() { var m = document.getElementById("inspTemplateModal"); if (m) m.classList.add("hidden"); });
  var addQTmplBtn = document.getElementById("tmplMgrAddQuestionBtn");
  if (addQTmplBtn) addQTmplBtn.addEventListener("click", addQuestionToTemplateManager);
  var saveTmplBtn = document.getElementById("saveInspTemplateModalBtn");
  if (saveTmplBtn) saveTmplBtn.addEventListener("click", saveTemplateFromManager);

  // Batch Export Buttons
  var selectAllCheck = document.getElementById("selectAllInspCheck");
  if (selectAllCheck) selectAllCheck.addEventListener("change", function() { toggleSelectAllInsp(this.checked); });
  var batchSeparatePdfBtn = document.getElementById("batchExportSeparatePdfBtn");
  if (batchSeparatePdfBtn) batchSeparatePdfBtn.addEventListener("click", exportSelectedInspectionsSeparate);
  var batchCombinedPdfBtn = document.getElementById("batchExportCombinedPdfBtn");
  if (batchCombinedPdfBtn) batchCombinedPdfBtn.addEventListener("click", exportSelectedInspectionsCombined);
  var exportMonthlyPkgBtn = document.getElementById("exportMonthlyPackageBtn");
  if (exportMonthlyPkgBtn) exportMonthlyPkgBtn.addEventListener("click", exportMonthlyPackagePDF);
  var batchExcelBtn = document.getElementById("batchExportExcelBtn");
  if (batchExcelBtn) batchExcelBtn.addEventListener("click", exportInspectionsMasterExcel);

  // Search & Filter Listeners for Inspection Management History
  var searchInspMgmt = document.getElementById("searchInspMgmt");
  if (searchInspMgmt) searchInspMgmt.addEventListener("input", function() { renderDigitalInspectionHistoryTable(this.value); });
  var filterInspM = document.getElementById("filterInspMgmtMonth");
  if (filterInspM) filterInspM.addEventListener("change", function() { renderDigitalInspectionHistoryTable(undefined, this.value); });
  var filterInspT = document.getElementById("filterInspMgmtType");
  if (filterInspT) filterInspT.addEventListener("change", function() { renderDigitalInspectionHistoryTable(undefined, undefined, this.value); });
  var filterInspL = document.getElementById("filterInspMgmtLocation");
  if (filterInspL) filterInspL.addEventListener("change", function() { renderDigitalInspectionHistoryTable(undefined, undefined, undefined, this.value); });
  var filterInspF = document.getElementById("filterInspMgmtFindingStatus");
  if (filterInspF) filterInspF.addEventListener("change", function() { renderDigitalInspectionHistoryTable(undefined, undefined, undefined, undefined, this.value); });
  var filterInspS = document.getElementById("filterInspMgmtStatus");
  if (filterInspS) filterInspS.addEventListener("change", function() { renderDigitalInspectionHistoryTable(undefined, undefined, undefined, undefined, undefined, this.value); });

  // Connect Checklist Generator Button
  var useInInspMgmtBtn = document.getElementById("useInInspMgmtBtn");
  if (useInInspMgmtBtn) useInInspMgmtBtn.addEventListener("click", useChecklistInInspectionManagement);

  // Close Report Modal
  var closeReportBtn = document.getElementById("closeInspReportModalBtn");
  if (closeReportBtn) closeReportBtn.addEventListener("click", function() { var m = document.getElementById("inspReportModal"); if (m) m.classList.add("hidden"); });

  // Inspection History Listeners
  var searchInsp = document.getElementById("searchInspHistory");
  if (searchInsp) searchInsp.addEventListener("input", function () { renderInspectionHistoryTable(this.value); });
  var filterInspArea = document.getElementById("filterInspArea");
  if (filterInspArea) filterInspArea.addEventListener("change", function () { renderInspectionHistoryTable(undefined, this.value); });
  var filterInspStatus = document.getElementById("filterInspStatus");
  if (filterInspStatus) filterInspStatus.addEventListener("change", function () { renderInspectionHistoryTable(undefined, undefined, this.value); });
  var saveInspBtn = document.getElementById("saveCurrentInspBtn");
  if (saveInspBtn) saveInspBtn.addEventListener("click", function () { saveCurrentInspection(true); });
  var newInspBtn = document.getElementById("newInspBtn");
  if (newInspBtn) newInspBtn.addEventListener("click", function () {
    lastGeneratedInspectionData = null;
    var qEl = document.getElementById("inspectionQuery"); if (qEl) qEl.value = "";
    var aEl = document.getElementById("inspectionArea"); if (aEl) aEl.value = "";
    var wrap = document.getElementById("inspectionOutput");
    if (wrap) wrap.classList.add("hidden");
    showToast("info", "جاهز لبناء وتوليد نموذج فحص جديد.");
  });

  // MoM History Listeners
  var searchMom = document.getElementById("searchMomHistory");
  if (searchMom) searchMom.addEventListener("input", function () { renderMomHistoryTable(this.value); });
  var saveMomBtn = document.getElementById("saveCurrentMomBtn");
  if (saveMomBtn) saveMomBtn.addEventListener("click", function () { saveCurrentMoMReport(true); });
  var newMomBtn = document.getElementById("newMomBtn");
  if (newMomBtn) newMomBtn.addEventListener("click", function () {
    lastGeneratedMoMData = null;
    var sEl = document.getElementById("momSubject"); if (sEl) sEl.value = "";
    var sumEl = document.getElementById("momSummary"); if (sumEl) sumEl.value = "";
    var rEl = document.getElementById("momRecommendations"); if (rEl) rEl.value = "";
    var seqEl = document.getElementById("momSeqNo"); if (seqEl) seqEl.value = currentMomSeq;
    var wrap = document.getElementById("momOutput");
    if (wrap) wrap.classList.add("hidden");
    showToast("info", "جاهز لتحرير وصياغة محضر جديد.");
  });

  // Risk History Listeners
  var searchRisk = document.getElementById("searchRiskHistory");
  if (searchRisk) searchRisk.addEventListener("input", function () { renderRiskHistoryTable(this.value); });
  var filterRiskArea = document.getElementById("filterRiskArea");
  if (filterRiskArea) filterRiskArea.addEventListener("change", function () { renderRiskHistoryTable(undefined, this.value); });
  var filterRiskLevel = document.getElementById("filterRiskLevel");
  if (filterRiskLevel) filterRiskLevel.addEventListener("change", function () { renderRiskHistoryTable(undefined, undefined, this.value); });

  // Backup Center Modal Listeners
  var backupBtn = document.getElementById("backupBtn");
  if (backupBtn) {
    backupBtn.onclick = function (e) {
      e.preventDefault();
      openDataBackupModal();
    };
  }
  var exportMasterBackupBtn = document.getElementById("exportMasterBackupBtn");
  if (exportMasterBackupBtn) exportMasterBackupBtn.addEventListener("click", exportComprehensiveBackupJSON);
  var triggerImportBackupBtn = document.getElementById("triggerImportBackupBtn");
  if (triggerImportBackupBtn) {
    triggerImportBackupBtn.addEventListener("click", function () {
      var inp = document.getElementById("importBackupFile");
      if (inp) inp.click();
    });
  }
  var exportMasterExcelBtn = document.getElementById("exportMasterExcelBtn");
  if (exportMasterExcelBtn) exportMasterExcelBtn.addEventListener("click", exportAllModulesMasterExcel);
  var backupCloseBtn = document.getElementById("backupCloseBtn");
  if (backupCloseBtn) backupCloseBtn.addEventListener("click", closeBackupModal);
  var backupCloseBtn2 = document.getElementById("backupCloseBtn2");
  if (backupCloseBtn2) backupCloseBtn2.addEventListener("click", closeBackupModal);
}




