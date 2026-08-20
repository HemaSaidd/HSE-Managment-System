const KEY_NAME = "SUT_GEMINI_KEY";
const MODEL_NAME = "SUT_GEMINI_MODEL";
const EMAIL_TO_KEY = "SUT_EMAIL_TO";
const EMAIL_CC_KEY = "SUT_EMAIL_CC";
const BUS_NOTES_KEY = "SUT_MONTHLY_BUS_NOTES";
const FOOD_NOTES_KEY = "SUT_MONTHLY_FOOD_NOTES";
const LOGO_URL_KEY = "SUT_CUSTOM_LOGO_URL";
const REPORT_LANG_KEY = "SUT_REPORT_LANG";
const MOM_SEQ_KEY = "SUT_MOM_SEQ_NO";

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

/* ===== SUT Official Logo (extracted & cropped from جواب ترشيح.docx) ===== */
const SUT_LOGO_B64 = "data:image/png;base64,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";

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

let findings = [];
let incidents = [];
let ptwList = [];
let trainingSessions = [];

try { findings = JSON.parse(localStorage.getItem("SUT_FINDINGS")) || []; } catch (e) { findings = []; }
try { incidents = JSON.parse(localStorage.getItem("SUT_INCIDENTS")) || []; } catch (e) { incidents = []; }
try { ptwList = JSON.parse(localStorage.getItem("SUT_PTW_LIST")) || []; } catch (e) { ptwList = []; }
try { trainingSessions = JSON.parse(localStorage.getItem("SUT_TRAINING_SESSIONS")) || []; } catch (e) { trainingSessions = []; }

let currentBeforePhoto = "";
let currentAfterPhoto = "";
let donutChartInstance = null;
let barChartInstance = null;
let lastGeneratedMoMData = null;
let lastNCRData = null;
let lastMonthly = null;

function initApp() {
  try {
    document.getElementById("apiKey").value = apiKey;

    var modelSelect = document.getElementById("modelName");
    var cleanMod = modelName.replace(/^models\//, "");
    if (modelSelect) {
      modelSelect.value = cleanMod;
      if (!modelSelect.value) {
        modelSelect.value = "gemini-3.6-flash";
        modelName = "gemini-3.6-flash";
        localStorage.setItem(MODEL_NAME, modelName);
      }
    }

    document.getElementById("emailTo").value = emailTo;
    document.getElementById("emailCc").value = emailCc;
    document.getElementById("customLogoUrl").value = customLogoUrl;
    document.getElementById("monthlyBusNotes").value = monthlyBusNotes;
    document.getElementById("monthlyFoodNotes").value = monthlyFoodNotes;
    if (document.getElementById("reportLangSelect")) document.getElementById("reportLangSelect").value = currentReportLang;
    if (document.getElementById("settingReportLang")) document.getElementById("settingReportLang").value = currentReportLang;
    if (document.getElementById("momDate")) document.getElementById("momDate").value = new Date().toISOString().slice(0, 10);
    if (document.getElementById("momSeqNo")) document.getElementById("momSeqNo").value = currentMomSeq;
    applyBrandLogo();

    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toISOString().slice(0, 16);
    document.getElementById("ncrDate").value = today;
    if (document.getElementById("gcDate")) document.getElementById("gcDate").value = today;
    if (document.getElementById("incDate")) document.getElementById("incDate").value = nowTime;
    if (document.getElementById("trDate")) document.getElementById("trDate").value = today;
    if (document.getElementById("ptwStart")) document.getElementById("ptwStart").value = nowTime;
    if (document.getElementById("ptwEnd")) {
      const endDate = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16);
      document.getElementById("ptwEnd").value = endDate;
    }
    document.getElementById("ncrNo").value = "SUT-HSE-NCR-" + String(Date.now()).slice(-5);
    if (document.getElementById("ptwNo")) document.getElementById("ptwNo").value = "SUT-PTW-" + String(Date.now()).slice(-5);

    document.querySelectorAll(".nav button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tabId = this.getAttribute("data-tab");
        showTab(tabId, this);
      });
    });

    var gearBtn = document.getElementById("gearBtn");
    var settingsMenu = document.getElementById("settingsMenu");
    gearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      settingsMenu.style.display = (settingsMenu.style.display === "block") ? "none" : "block";
    });
    window.addEventListener("click", function () {
      if (settingsMenu) settingsMenu.style.display = "none";
      closeAllMemberDropdowns();
    });

    document.getElementById("backupBtn").addEventListener("click", exportFullBackup);
    document.getElementById("restoreBtn").addEventListener("click", function () { document.getElementById("importBackupFile").click(); });
    document.getElementById("importBackupFile").addEventListener("change", importFullBackup);
    document.getElementById("systemSettingsBtn").addEventListener("click", openSettings);
    document.getElementById("helpBtn").addEventListener("click", openHelp);

    document.getElementById("goToPtwBtn").addEventListener("click", function () { showTab("ptw", document.querySelector("[data-tab=ptw]")); });
    document.getElementById("goToNcrBtn").addEventListener("click", function () { showTab("ncr", document.querySelector("[data-tab=ncr]")); });
    document.getElementById("goToHseCasesBtn").addEventListener("click", function () { showTab("hse_cases", document.querySelector("[data-tab=hse_cases]")); });
    document.getElementById("sendEmailBtn").addEventListener("click", sendOfficialEmail);
    document.getElementById("exportExcelBtn").addEventListener("click", exportFindingsExcel);
    document.getElementById("fullReportWordBtn").addEventListener("click", buildFullMonthlyDashboard);
    document.getElementById("fullReportPrintBtn").addEventListener("click", printFullDashboard);

    document.getElementById("reportLangSelect").addEventListener("change", function () {
      currentReportLang = this.value;
      localStorage.setItem(REPORT_LANG_KEY, currentReportLang);
      if (document.getElementById("settingReportLang")) document.getElementById("settingReportLang").value = currentReportLang;
    });

    document.getElementById("saveAuditBtn").addEventListener("click", saveAuditNotes);
    document.getElementById("addAttendeeBtn").addEventListener("click", function () { addMomAttendeeRow(); });
    if (document.getElementById("addAllAttendeesBtn")) {
      document.getElementById("addAllAttendeesBtn").addEventListener("click", addAllCommitteeMembers);
    }
    if (document.getElementById("clearAttendeesBtn")) {
      document.getElementById("clearAttendeesBtn").addEventListener("click", clearAllCommitteeAttendees);
    }
    document.getElementById("generateMomBtn").addEventListener("click", generateMoMReport);
    document.getElementById("sendMomEmailBtn").addEventListener("click", sendMoMEmail);
    document.getElementById("momWordBtn").addEventListener("click", function () { downloadCurrentWord("momReportContainer"); });
    document.getElementById("momPdfBtn").addEventListener("click", function () { downloadCurrentPDF("momReportContainer"); });
    document.getElementById("momPrintBtn").addEventListener("click", function () { printReport("momReportContainer"); });

    /* Prefill Committee Members */
    addAllCommitteeMembers();

    document.getElementById("runCodesBtn").addEventListener("click", function () { runAI("codes"); });
    document.getElementById("codesWordBtn").addEventListener("click", function () { downloadCurrentWord("codesReport"); });
    document.getElementById("codesPdfBtn").addEventListener("click", function () { downloadCurrentPDF("codesReport"); });
    document.getElementById("codesPrintBtn").addEventListener("click", function () { printReport("codesReport"); });

    document.getElementById("runInspectionBtn").addEventListener("click", function () { runAI("inspection"); });
    document.getElementById("inspWordBtn").addEventListener("click", function () { downloadCurrentWord("inspectionReport"); });
    document.getElementById("inspPdfBtn").addEventListener("click", function () { downloadCurrentPDF("inspectionReport"); });
    document.getElementById("inspPrintBtn").addEventListener("click", function () { printReport("inspectionReport"); });

    document.getElementById("ncrPhotoBefore").addEventListener("change", function () { handleImageUpload(this, "previewBefore"); });
    document.getElementById("generateNcrBtn").addEventListener("click", generateNCR);
    document.getElementById("ncrWordBtn").addEventListener("click", function () { downloadCurrentWord("ncrReport"); });
    document.getElementById("ncrPdfBtn").addEventListener("click", function () { downloadCurrentPDF("ncrReport"); });
    document.getElementById("ncrPrintBtn").addEventListener("click", function () { printReport("ncrReport"); });

    document.getElementById("addGeneralCaseBtn").addEventListener("click", addGeneralCase);

    document.getElementById("generatePtwBtn").addEventListener("click", generatePTW);
    document.getElementById("ptwWordBtn").addEventListener("click", function () { downloadCurrentWord("ptwReport"); });
    document.getElementById("ptwPdfBtn").addEventListener("click", function () { downloadCurrentPDF("ptwReport"); });
    document.getElementById("ptwPrintBtn").addEventListener("click", function () { printReport("ptwReport"); });

    document.getElementById("addTrainingBtn").addEventListener("click", addTrainingSession);
    document.getElementById("addIncidentBtn").addEventListener("click", addIncident);

    document.getElementById("dropzone").addEventListener("click", function () { document.getElementById("monthlyFile").click(); });
    document.getElementById("monthlyFile").addEventListener("change", function () { handleMonthlyFile(this.files[0]); });
    document.getElementById("monthlyBtn").addEventListener("click", runMonthly);
    document.getElementById("monthlyWordBtn").addEventListener("click", function () { downloadCurrentWord("monthlyReport"); });
    document.getElementById("monthlyPdfBtn").addEventListener("click", function () { downloadCurrentPDF("monthlyReport"); });
    document.getElementById("monthlyPptBtn").addEventListener("click", downloadMonthlyPPT);
    document.getElementById("monthlyPrintBtn").addEventListener("click", function () { printReport("monthlyReport"); });

    document.getElementById("closeModalCancelBtn").addEventListener("click", closeClosureModal);
    document.getElementById("saveClosureBtn").addEventListener("click", saveFindingClosure);
    document.getElementById("closePhotoAfter").addEventListener("change", function () { handleImageUpload(this, "previewCloseAfter"); });

    if (document.getElementById("editModalCancelBtn")) document.getElementById("editModalCancelBtn").addEventListener("click", closeEditFindingModal);
    if (document.getElementById("saveEditFindingBtn")) document.getElementById("saveEditFindingBtn").addEventListener("click", saveFindingEdit);

    document.getElementById("settingsCancelBtn").addEventListener("click", closeSettings);
    document.getElementById("settingsSaveBtn").addEventListener("click", saveSettings);
    document.getElementById("helpCloseBtn").addEventListener("click", closeHelp);

    document.getElementById("filterSearch").addEventListener("input", renderDashboard);
    document.getElementById("filterStatus").addEventListener("change", renderDashboard);
    document.getElementById("filterPriority").addEventListener("change", renderDashboard);
    document.getElementById("filterCategory").addEventListener("change", renderDashboard);

    renderDashboard();
    renderIncidents();
    renderTraining();
    renderGeneralCasesTable();
    setupDropzone();
    initAllCustomDropdowns();

  } catch (err) {
    console.error("❌ SUTech HSE initialization error:", err);
    showSweetAlert("خطأ في تهيئة النظام", err.message, "error");
  }
}

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
    "training_sessions": "SUT_TRAINING_SESSIONS"
  };
  var key = keyMap[node] || ("SUT_" + node.toUpperCase());
  localStorage.setItem(key, JSON.stringify(data));
}

function saveAuditNotes() {
  monthlyBusNotes = document.getElementById("monthlyBusNotes").value.trim();
  monthlyFoodNotes = document.getElementById("monthlyFoodNotes").value.trim();
  localStorage.setItem(BUS_NOTES_KEY, monthlyBusNotes);
  localStorage.setItem(FOOD_NOTES_KEY, monthlyFoodNotes);
  showToast("success", "تم حفظ ملاحظات الفحص وتحديث التقرير الشهري بنجاح!");
}

function updateInteractiveCharts() {
  if (typeof Chart === "undefined") return;
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
    if (donutChartInstance) donutChartInstance.destroy();
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
  }

  var ctxBar = document.getElementById("riskBarChart");
  if (ctxBar) {
    if (barChartInstance) barChartInstance.destroy();
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
    var isOpen = !dropdown.classList.contains("hidden");
    closeAllMemberDropdowns();
    if (!isOpen) {
      dropdown.classList.remove("hidden");
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

function addAllCommitteeMembers() {
  var container = document.getElementById("momAttendeesList");
  if (!container) return;
  container.innerHTML = "";
  SUTECH_COMMITTEE_MEMBERS.forEach(function (m) {
    addMomAttendeeRow(m);
  });
  showToast("success", "تمت إضافة جميع أعضاء اللجنة الـ 22 بنجاح");
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

    lastGeneratedMoMData = { seqNo: seqNo, subject: res.formatted_subject || subject };

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

function setInspectionTemplate(type) {
  if (type === "bus") {
    document.getElementById("inspectionQuery").value = "فحص وتفتيش السلامة الشامل لحافلات وسيارات الجامعة (Campus Fleet & Bus Inspection)";
    document.getElementById("inspectionArea").value = "University Parking & Transport Fleet";
  } else if (type === "food") {
    document.getElementById("inspectionQuery").value = "تفتيش السلامة والصحة المهنية وسلامة الغذاء لمطاعم وكافيتريات الجامعة (Food Hygiene & Kitchen Fire Safety)";
    document.getElementById("inspectionArea").value = "Central Cafeteria & Food Outlets";
  } else if (type === "lab") {
    document.getElementById("inspectionQuery").value = "فحص السلامة الكيميائية والفيزيائية بالمختبرات ومعامل الطاقة";
    document.getElementById("inspectionArea").value = "Chemistry & Energy Labs";
  } else if (type === "crane") {
    document.getElementById("inspectionQuery").value = "فحص وصيانة الأوناش العلوية ومعدات القطع بالورش (FabLab Cranes & Machinery)";
    document.getElementById("inspectionArea").value = "Fabrication Lab & Mechanical Workshops";
  }
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
  if (!apiKey) { openSettings(); throw new Error("أدخل Gemini API Key أولاً."); }

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

function renderInspection(d) {
  var lang = document.getElementById("inspectionLang").value;
  var ar = lang === "ar";
  var t = ar ? {
    title: d.title || "نموذج فحص وتفتيش", inspectionNo: "رقم الفحص", area: "المكان", date: "التاريخ", inspector: "المفتش", checklist: "قائمة الفحص",
    no: "م", point: "بند الفحص والتفتيش", criteria: "معيار القبول المطلوب", status: "الحالة", observation: "الملاحظات الميدانية", notes: "ملاحظات المفتش"
  } : {
    title: d.title || "Inspection Checklist", inspectionNo: "Inspection No.", area: "Area", date: "Date", inspector: "Inspector", checklist: "Checklist",
    no: "No.", point: "Inspection Point", criteria: "Acceptance Criteria", status: "Status", observation: "Observation", notes: "Inspector Notes"
  };
  var h = '<div class="report" id="inspectionReportInner" data-report-language="' + lang + '"><div class="report-head"><div class="track"><b>' + esc(t.inspectionNo) + '</b><span>' + track() + '</span></div><div class="report-title"><h2>' + esc(t.title) + '</h2><p>' + esc(ar ? "إدارة السلامة والصحة المهنية والبيئة — جامعة السويدي للتكنولوجيا (SUTech)" : "SUTech HSE Department — El Sewedy University of Technology") + '</p></div><div class="track"><b>Status</b><span>Draft / Blank</span></div></div><div class="meta"><div><b>' + esc(t.area) + ':</b> ' + esc(document.getElementById("inspectionArea").value) + '</div><div><b>' + esc(t.date) + ':</b> __________________</div><div><b>' + esc(t.inspector) + ':</b> __________________</div></div><div class="section-title">' + esc(t.checklist) + '</div><table><thead><tr><th style="width:6%">' + esc(t.no) + '</th><th style="width:34%">' + esc(t.point) + '</th><th style="width:34%">' + esc(t.criteria) + '</th><th style="width:8%">' + esc(t.status) + '</th><th>' + esc(t.observation) + '</th></tr></thead><tbody>';
  (d.items || []).forEach(function (x, i) { h += '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.inspection_point) + '</td><td>' + esc(x.acceptance_criteria) + '</td><td></td><td></td></tr>'; });
  h += '</tbody></table><div class="section-title">' + esc(t.notes) + '</div><div style="height:70px;border:1px solid #cbd5e1;border-radius:7px"></div></div>';
  document.getElementById("inspectionReport").innerHTML = h;
}

async function generateNCR() {
  var g = function (id) { return document.getElementById(id).value.trim(); };
  var rawFinding = g("ncrFinding");
  if (!rawFinding) return showSweetAlert("تنبيه", "يرجى كتابة تفاصيل الملاحظة / المخالفة (Finding) أولاً.", "warning");
  var no = g("ncrNo") || ("SUT-HSE-NCR-" + String(Date.now()).slice(-5));
  var date = g("ncrDate") || new Date().toISOString().slice(0, 10);
  var owner = g("ncrOwner") || "Responsible Department";
  var status = "Open";
  var target = g("ncrTarget");
  var verify = "Pending Remediation";
  var rawReq = g("ncrRequirement");
  var rawImpact = g("ncrImpact");
  var rawCause = g("ncrCause");
  var rawAction = g("ncrAction");

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
    var d = { no: no, date: date, owner: owner, finding: rawFinding, requirement: rawReq, impact: rawImpact, cause: rawCause, action: rawAction, status: status, target: target, verify: verify, photoBefore: currentBeforePhoto, photoAfter: "" };
    lastNCRData = d;

    var existingIndex = findings.findIndex(function (x) { return x.ncrNo === d.no || x.finding === d.finding; });
    if (existingIndex >= 0) {
      findings[existingIndex] = Object.assign({}, findings[existingIndex], { ncrNo: d.no, status: d.status, dept: d.owner, date: d.target || d.date, photoBefore: d.photoBefore, photoAfter: "" });
    } else {
      findings.unshift({
        id: Date.now(), ncrNo: d.no, area: d.owner || "Campus", dept: d.owner, finding: d.finding, status: d.status,
        priority: (d.impact && (d.impact.includes("حريق") || d.impact.includes("Critical") || d.impact.includes("جسيم"))) ? "High" : "Medium",
        date: d.target || d.date, photoBefore: d.photoBefore, photoAfter: "", target: d.target, verifyDate: "",
        requirement: d.requirement, impact: d.impact, cause: d.cause, action: d.action,
        category: "NCR"
      });
    }
    syncToCloud("findings", findings);
    renderNCRView(d);
    renderDashboard();
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
    '<th style="width:22%">نوع الحالة (Case Type)</th>' +
    '<th>الوصف / التفاصيل</th>' +
    '<th style="width:12%">الإدارة</th>' +
    '<th style="width:10%">الأولوية</th>' +
    '<th style="width:10%">الحالة</th>' +
    '<th style="width:10%">الاستحقاق</th>' +
    '<th style="width:10%">إجراءات</th>' +
    '</tr></thead><tbody>' +
    generalCases.map(function (x) {
      var statusClass = x.status === "Closed" ? "closed" : x.status === "In Progress" ? "progress" : "open";
      var prioClass = x.priority ? x.priority.toLowerCase() : "medium";
      return '<tr>' +
        '<td><b>' + esc(x.caseType || "حالة عامة") + '</b></td>' +
        '<td>' + esc(x.finding) + (x.caseNotes ? '<br><small style="color:#64748b">📝 ' + esc(x.caseNotes) + '</small>' : '') + '</td>' +
        '<td>' + esc(x.dept) + '</td>' +
        '<td><span class="badge ' + prioClass + '">' + esc(x.priority) + '</span></td>' +
        '<td><span class="badge ' + statusClass + '">' + esc(x.status) + '</span></td>' +
        '<td>' + esc(x.target || x.date || "—") + '</td>' +
        '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn btn-blue" style="padding:3px 7px;font-size:10px;margin-left:4px" onclick="openEditFindingModal(' + x.id + ')" title="تعديل"><i class="fa-solid fa-pen-to-square"></i></button>' +
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
  if (document.getElementById("editFindingNotes")) document.getElementById("editFindingNotes").value = item.caseNotes || "";

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
    if (document.getElementById("editFindingNotes")) item.caseNotes = document.getElementById("editFindingNotes").value.trim();

    syncToCloud("findings", findings);
    renderDashboard();
    renderGeneralCasesTable();
    closeEditFindingModal();
    showToast("success", "تم حفظ وتحديث كافة بيانات وسجلات الملاحظة بنجاح!");
  }
}

async function generatePTW() {
  var g = function (id) { return document.getElementById(id).value.trim(); };
  var no = g("ptwNo"), type = g("ptwType"), loc = g("ptwLoc"), contractor = g("ptwContractor"), desc = g("ptwDesc"), start = g("ptwStart"), end = g("ptwEnd"), status = g("ptwStatus");
  var sutOfficer = g("ptwSutOfficer") || "SUT HSE Engineer";
  var contractorOfficer = g("ptwContractorOfficer") || "Contractor Safety Officer";
  if (!desc) return showSweetAlert("Incomplete Data", "Please enter the activity description.", "warning");

  var out = document.getElementById("ptwReport");
  var wrap = document.getElementById("ptwOutput");
  wrap.classList.remove("hidden");
  loading(out, true);

  try {
    var prompt = 'You are a Principal HSE Permit to Work Officer. Generate strict safety controls in professional ENGLISH for:\nPermit Type: ' + type + '\nLocation: ' + loc + '\nActivity: ' + desc + '\nReturn JSON only:\n{"hazards":["Detailed Hazard 1","Detailed Hazard 2","Detailed Hazard 3"],"precautions":["Mandatory Precaution 1","Mandatory Precaution 2","Mandatory Precaution 3"],"ppe_required":["PPE 1","PPE 2","PPE 3"],"emergency_arrangements":["Emergency Measure 1","Emergency Measure 2"],"tbt_key_topics":["TBT Topic 1","TBT Topic 2","TBT Topic 3"]}';
    var aiRes = extractJSON(await callGemini(prompt));
    var h = '<div class="report" id="ptwReportInner" style="direction:ltr;text-align:left">' +
      '<div class="report-head" style="direction:ltr"><div class="track"><b>Permit Reference</b><span>' + esc(no) + '</span></div><div class="report-title"><h2 style="font-family:Inter,Cairo,sans-serif;letter-spacing:0.5px">PERMIT TO WORK & TOOL BOX TALK (PTW + TBT)</h2><p style="font-family:Inter,sans-serif;color:var(--sut-red)">El Sewedy University of Technology (SUTech) — HSE Department</p></div><div class="track"><b>Permit Status</b><span>' + esc(status) + '</span></div></div>' +
      '<div class="meta" style="direction:ltr"><div><b>Permit Category:</b> ' + esc(type) + '</div><div><b>Work Location / Unit:</b> ' + esc(loc || "SUT Campus") + '</div><div><b>Authorized Status:</b> ' + esc(status) + '</div></div>' +
      '<div class="meta" style="direction:ltr"><div><b>Executing Contractor / Dept:</b> ' + esc(contractor || "Maintenance Dept") + '</div><div><b>Valid From:</b> ' + esc(start ? start.replace("T", " ") : "_________________") + '</div><div><b>Valid Until:</b> ' + esc(end ? end.replace("T", " ") : "_________________") + '</div></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">1. Scope of Work & Activity Description</div><div class="answer"><p>' + esc(desc) + '</p></div>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">2. Identified Critical Hazards</div><ul style="padding-left:22px;padding-right:0">' + aiRes.hazards.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">3. Mandatory Precautions & Isolation Controls</div><ul style="padding-left:22px;padding-right:0">' + aiRes.precautions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">4. Required Personal Protective Equipment (PPE)</div><ul style="padding-left:22px;padding-right:0">' + aiRes.ppe_required.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">5. Emergency Response Arrangements</div><ul style="padding-left:22px;padding-right:0">' + aiRes.emergency_arrangements.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">6. Tool Box Talk (TBT) Briefing & Worker Sign-off</div><p style="font-size:11px;margin-bottom:8px"><b>Core Safety Topics Delivered:</b> ' + aiRes.tbt_key_topics.join(" • ") + '</p>' +
      '<table><thead><tr><th style="width:6%">#</th><th>Worker Full Name</th><th style="width:25%">Designation / Trade</th><th style="width:25%">Worker Signature</th></tr></thead><tbody><tr><td style="text-align:center">1</td><td></td><td></td><td></td></tr><tr><td style="text-align:center">2</td><td></td><td></td><td></td></tr><tr><td style="text-align:center">3</td><td></td><td></td><td></td></tr><tr><td style="text-align:center">4</td><td></td><td></td><td></td></tr></tbody></table>' +
      '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">7. Dual Safety Authorization & Sign-off</div>' +
      '<table><thead><tr><th style="width:50%">SUTech HSE Department (University Safety Officer)</th><th style="width:50%">Contractor / Executing HSE (Their Safety Representative)</th></tr></thead><tbody><tr><td><b>Name:</b> ' + esc(sutOfficer) + '<br><b>Designation:</b> SUTech Safety Engineer<br><b>Signature:</b> ___________________________<br><b>Date / Time:</b> ' + new Date().toLocaleDateString("en-GB") + '</td><td><b>Name:</b> ' + esc(contractorOfficer) + '<br><b>Designation:</b> Contractor Safety Representative<br><b>Signature:</b> ___________________________<br><b>Date / Time:</b> ' + new Date().toLocaleDateString("en-GB") + '</td></tr></tbody></table></div>';
    out.innerHTML = h;

    var existingPtwIndex = ptwList.findIndex(function (x) { return x.no === no; });
    if (existingPtwIndex >= 0) {
      ptwList[existingPtwIndex] = { id: ptwList[existingPtwIndex].id, no: no, type: type, loc: loc, contractor: contractor, status: status, start: start, end: end, sutOfficer: sutOfficer, contractorOfficer: contractorOfficer };
    } else {
      ptwList.unshift({ id: Date.now(), no: no, type: type, loc: loc, contractor: contractor, status: status, start: start, end: end, sutOfficer: sutOfficer, contractorOfficer: contractorOfficer });
    }
    syncToCloud("ptwList", ptwList);
    renderDashboard();
    showToast("success", "تم إنشاء تصريح العمل (PTW) بنجاح!");
  } catch (e) {
    out.innerHTML = '<div class="status err"><b>Error:</b> ' + esc(e.message) + '</div>';
  }
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

function addTrainingSession() {
  var g = function (id) { return document.getElementById(id).value.trim(); };
  var topic = g("trTopic"), date = g("trDate"), audience = g("trAudience"), trainer = g("trTrainer"), attendees = parseInt(g("trAttendees")) || 0, hours = parseFloat(g("trHours")) || 1;
  if (!topic) return showSweetAlert("بيانات ناقصة", "يرجى كتابة موضوع التدريب أولاً.", "warning");
  trainingSessions.unshift({ id: Date.now(), topic: topic, date: date, audience: audience, trainer: trainer, attendees: attendees, hours: hours });
  syncToCloud("trainingSessions", trainingSessions);
  document.getElementById("trTopic").value = "";
  document.getElementById("trAttendees").value = "";
  renderTraining();
  renderDashboard();
  showToast("success", "تم تسجيل جلسة التدريب بنجاح!");
}
function renderTraining() {
  var tbl = document.getElementById("trainingTable");
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
  var g = function (id) { return document.getElementById(id).value.trim(); };
  var type = g("incType"), date = g("incDate"), loc = g("incLoc"), desc = g("incDesc");
  if (!desc) return showSweetAlert("بيانات ناقصة", "يرجى كتابة تفاصيل الواقعة أو الحادث أولاً.", "warning");
  incidents.unshift({ id: Date.now(), type: type, date: date, loc: loc, desc: desc });
  syncToCloud("incidents", incidents);
  document.getElementById("incDesc").value = "";
  renderIncidents();
  renderDashboard();
  showToast("success", "تم تسجيل الواقعة بنجاح!");
}
function renderIncidents() {
  var total = incidents.length;
  var near = incidents.filter(function (x) { return x.type.includes("Near-Miss"); }).length;
  var fa = incidents.filter(function (x) { return x.type.includes("First Aid"); }).length;
  var lti = incidents.filter(function (x) { return x.type.includes("Lost Time"); }).length;
  var stats = getSafeStats();

  document.getElementById("incTotal").textContent = total;
  document.getElementById("incNearMiss").textContent = near;
  document.getElementById("incFA").textContent = fa;
  document.getElementById("incHours").textContent = stats.safeHours.toLocaleString();
  var ltifr = total ? ((lti * 1000000) / stats.safeHours).toFixed(2) : "0.00";
  document.getElementById("incLTIFR").textContent = ltifr;

  var tbl = document.getElementById("incidentsTable");
  tbl.innerHTML = total ? '<table class="answer"><thead><tr><th style="width:20%">Type</th><th style="width:18%">Date/Time</th><th style="width:18%">Location</th><th>Description</th><th style="width:8%">Action</th></tr></thead><tbody>' + incidents.map(function (x) { return '<tr><td><b>' + esc(x.type) + '</b></td><td>' + esc(x.date) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.desc) + '</td><td style="text-align:center"><button style="background:none;border:none;color:#dc2626;cursor:pointer" onclick="deleteIncident(' + x.id + ')"><i class="fa-solid fa-trash"></i></button></td></tr>'; }).join("") + '</tbody></table>' : '<div class="status">لا توجد حوادث أو وقائع مسجلة. السجل نظيف.</div>';
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

function renderDashboard() {
  var total = findings.length, closed = findings.filter(function (x) { return x.status === "Closed"; }).length;
  var activePtwCount = ptwList.filter(function (x) { return x.status === "Issued & Active" || x.status === "Under Review"; }).length;
  var nearMissCount = incidents.filter(function (x) { return x.type.includes("Near-Miss"); }).length;
  var totalTrained = trainingSessions.reduce(function (sum, item) { return sum + (item.attendees || 0); }, 0);
  var stats = getSafeStats();

  document.getElementById("safeDaysCount").textContent = stats.safeDays;
  document.getElementById("safeHoursCount").textContent = stats.safeHours.toLocaleString() + " hrs";
  document.getElementById("kTotal").textContent = total;
  document.getElementById("kClosed").textContent = closed;
  document.getElementById("kActivePTW").textContent = activePtwCount;
  document.getElementById("kNearMiss").textContent = nearMissCount;
  document.getElementById("kTrained").textContent = totalTrained;
  document.getElementById("kRate").textContent = (total ? Math.round(closed / total * 100) : 0) + "%";

  var nmTarget = 10;
  var nmPercent = Math.min(100, Math.round((nearMissCount / nmTarget) * 100));
  document.getElementById("nmGaugeText").textContent = nearMissCount + " / " + nmTarget + " (" + nmPercent + "%)";
  document.getElementById("nmGaugeBar").style.width = nmPercent + "%";

  var pct = function (n) { return total ? Math.round(n / total * 100) : 0; };
  document.getElementById("statusBars").innerHTML = ["Closed", "In Progress", "Open"].map(function (s) {
    var n = findings.filter(function (x) { return x.status === s; }).length;
    return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px"><b>' + s + '</b><span>' + n + ' (' + pct(n) + '%)</span></div><div class="bar"><i style="width:' + pct(n) + '%"></i></div></div>';
  }).join("");

  var ptwTbl = document.getElementById("dashboardPtwTable");
  ptwTbl.innerHTML = ptwList.length ? '<table class="answer"><thead><tr><th style="width:16%">Permit No.</th><th style="width:24%">Type</th><th>Location</th><th style="width:16%">Contractor/Dept</th><th style="width:18%">Status</th><th style="width:8%">Action</th></tr></thead><tbody>' + ptwList.map(function (x) { return '<tr><td><b>' + esc(x.no) + '</b></td><td>' + esc(x.type) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.contractor) + '</td><td><select style="padding:4px 6px;border-radius:6px;border:1px solid #cbd5e1;font-size:11px;font-weight:700" onchange="updatePTWStatus(' + x.id + ', this.value)"><option value="Issued & Active"' + (x.status === "Issued & Active" ? " selected" : "") + '>Issued & Active</option><option value="Under Review"' + (x.status === "Under Review" ? " selected" : "") + '>Under Review</option><option value="Closed & Handed Over"' + (x.status === "Closed & Handed Over" ? " selected" : "") + '>Closed & Handed Over</option></select></td><td style="text-align:center"><button style="background:none;border:none;color:#dc2626;cursor:pointer" onclick="deletePTW(' + x.id + ')"><i class="fa-solid fa-trash"></i></button></td></tr>'; }).join("") + '</tbody></table>' : '<div class="status">لا توجد تصاريح عمل مسجلة حالياً.</div>';

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

  document.getElementById("findingsTable").innerHTML = filtered.length ? '<table class="answer"><thead><tr><th style="width:8%">التصنيف</th><th style="width:10%">Area</th><th>Finding / Description</th><th style="width:10%">Department</th><th style="width:8%">Risk</th><th style="width:10%">Status</th><th style="width:10%">Target Date</th><th style="width:16%">Actions & Verify</th><th style="width:5%">🗑</th></tr></thead><tbody>' + filtered.map(function (x) {
    var isGeneral = x.category === "General";
    var categoryBadge = isGeneral ? '<span class="badge general-case">📋 حالة عامة</span>' : '<span class="badge high">⚠ NCR</span>';
    return '<tr><td style="text-align:center">' + categoryBadge + '</td><td>' + esc(x.area) + '</td><td>' + esc(x.finding) + (isGeneral && x.caseType ? '<br><small style="color:var(--blue);font-weight:700">📌 ' + esc(x.caseType) + '</small>' : '') + '</td><td>' + esc(x.dept) + '</td><td><span class="badge ' + (x.priority ? x.priority.toLowerCase() : "medium") + '">' + esc(x.priority || "Medium") + '</span></td><td><span class="badge ' + (x.status === "Closed" ? "closed" : x.status === "In Progress" ? "progress" : "open") + '">' + esc(x.status) + '</span></td><td>' + esc(x.date) + '</td><td style="text-align:center;white-space:nowrap"><button class="btn btn-blue" style="padding:4px 8px;font-size:10px;margin-left:4px" onclick="openEditFindingModal(' + x.id + ')" title="تعديل"><i class="fa-solid fa-pen-to-square"></i> Edit</button><button class="btn btn-green" style="padding:4px 8px;font-size:10px" onclick="openClosureModal(' + x.id + ')" title="إغلاق وتحقق"><i class="fa-solid fa-camera"></i> ' + (x.status === "Closed" ? "View" : "Verify") + '</button></td><td style="text-align:center"><button style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px" onclick="deleteFinding(' + x.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button></td></tr>';
  }).join("") + '</tbody></table>' : '<div class="status">لا توجد نتائج مطابقة للبحث أو الفلترة.</div>';

  updateInteractiveCharts();
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

function getFullMonthlyHTML() {
  var total = findings.length, closed = findings.filter(function (x) { return x.status === "Closed"; }).length;
  var ncrFindings = findings.filter(function (x) { return x.category !== "General"; });
  var generalCases = findings.filter(function (x) { return x.category === "General"; });
  var activePtwCount = ptwList.filter(function (x) { return x.status === "Issued & Active" || x.status === "Under Review"; }).length;
  var nearMissCount = incidents.filter(function (x) { return x.type.includes("Near-Miss"); }).length;
  var stats = getSafeStats();
  var totalTrained = trainingSessions.reduce(function (sum, item) { return sum + (item.attendees || 0); }, 0);
  var busCustom = (document.getElementById("monthlyBusNotes").value || monthlyBusNotes).trim();
  var foodCustom = (document.getElementById("monthlyFoodNotes").value || monthlyFoodNotes).trim();
  var isEn = currentReportLang === "en";

  var donutDataUrl = "", barDataUrl = "";
  try { if (donutChartInstance) donutDataUrl = donutChartInstance.toBase64Image(); if (barChartInstance) barDataUrl = barChartInstance.toBase64Image(); } catch (e) { }

  var chartsHTML = (donutDataUrl || barDataUrl) ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">' + (donutDataUrl ? '<div style="border:1px solid #cbd5e1;border-radius:8px;padding:8px;text-align:center"><img src="' + donutDataUrl + '" style="max-height:160px;width:auto"><span style="display:block;font-size:10px;font-weight:bold;margin-top:4px">' + (isEn ? "CAPA Status" : "موقف الإجراءات التصحيحية") + '</span></div>' : "") + (barDataUrl ? '<div style="border:1px solid #cbd5e1;border-radius:8px;padding:8px;text-align:center"><img src="' + barDataUrl + '" style="max-height:160px;width:auto"><span style="display:block;font-size:10px;font-weight:bold;margin-top:4px">' + (isEn ? "Risk Profile" : "توزيع المخاطر") + '</span></div>' : "") + '</div>' : "";

  var generalCasesSection = "";
  if (isEn) {
    generalCasesSection = '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">8. General HSE Cases (Licensing, Permits, Compliance & Administrative Follow-ups)</div>' +
      (generalCases.length ? '<table><thead><tr><th>Case Type</th><th>Description</th><th>Department</th><th>Priority</th><th>Status</th><th>Due Date</th></tr></thead><tbody>' +
        generalCases.map(function (x) { return '<tr><td>' + esc(x.caseType || "General") + '</td><td>' + esc(x.finding) + '</td><td>' + esc(x.dept) + '</td><td>' + esc(x.priority) + '</td><td>' + esc(x.status) + '</td><td>' + esc(x.target || x.date) + '</td></tr>'; }).join("") +
        '</tbody></table>' : '<p style="font-size:11px">No general HSE cases recorded during this period.</p>');
  } else {
    generalCasesSection = '<div class="section-title">8. الحالات العامة (التراخيص والتصاريح والمتابعات الإدارية)</div>' +
      (generalCases.length ? '<table><thead><tr><th>نوع الحالة</th><th>الوصف / التفاصيل</th><th>الإدارة المسؤولة</th><th>الأولوية</th><th>الحالة</th><th>تاريخ الاستحقاق</th></tr></thead><tbody>' +
        generalCases.map(function (x) { return '<tr><td>' + esc(x.caseType || "حالة عامة") + '</td><td>' + esc(x.finding) + '</td><td>' + esc(x.dept) + '</td><td>' + esc(x.priority) + '</td><td>' + esc(x.status) + '</td><td>' + esc(x.target || x.date) + '</td></tr>'; }).join("") +
        '</tbody></table>' : '<p style="font-size:11px">لا توجد حالات عامة مسجلة خلال هذه الفترة.</p>');
  }

  if (isEn) {
    return '<div class="report" id="fullExecutiveReport" style="direction:ltr;text-align:left"><div class="report-head" style="direction:ltr"><div class="track"><b>Report Type</b><span>Monthly HSE Report</span></div><div class="report-title"><h2>MONTHLY HSE EXECUTIVE REPORT</h2><p>El Sewedy University of Technology (SUTech) — Safety & Operations Department</p></div><div class="track"><b>Report Date</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div></div><div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">1. Executive HSE KPIs & Statistics</div><div class="dashboard-strip"><div class="dash-card"><strong>' + total + '</strong><span>Total Records</span></div><div class="dash-card"><strong>' + closed + '</strong><span>Closed Items</span></div><div class="dash-card"><strong>' + activePtwCount + '</strong><span>Active PTWs</span></div><div class="dash-card"><strong>' + totalTrained + '</strong><span>Trained Persons</span></div></div><div class="meta" style="direction:ltr"><div><b>Days Without LTI:</b> ' + stats.safeDays + ' Days</div><div><b>Safe Man-Hours:</b> ' + stats.safeHours.toLocaleString() + ' hrs</div><div><b>Closure Performance:</b> ' + (total ? Math.round(closed / total * 100) : 0) + '%</div></div>' + chartsHTML + '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">2. Campus Buses & Vehicles Inspection</div><p style="font-size:12px;margin:6px 0">' + (busCustom ? '<b>Buses and vehicles were inspected, and the following findings were noted:</b> ' + esc(busCustom) : '<b>Buses and vehicles were inspected, and no findings were recorded.</b>') + '</p><div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">3. Cafeterias & Food Outlets Inspection</div><p style="font-size:12px;margin:6px 0">' + (foodCustom ? '<b>Food outlets and cafeterias were inspected, and the following findings were noted:</b> ' + esc(foodCustom) : '<b>Food outlets and cafeterias were inspected, and no findings were recorded.</b>') + '</p><div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">4. Active & Closed Permits to Work (PTWs)</div>' + (ptwList.length ? '<table><thead><tr><th>Permit No.</th><th>Type</th><th>Location</th><th>Contractor/Dept</th><th>Status</th></tr></thead><tbody>' + ptwList.map(function (x) { return '<tr><td>' + esc(x.no) + '</td><td>' + esc(x.type) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.contractor) + '</td><td>' + esc(x.status) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">No work permits issued during this period.</p>') + '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">5. HSE Training & Awareness Sessions</div>' + (trainingSessions.length ? '<table><thead><tr><th>Topic</th><th>Date</th><th>Target Audience</th><th>Trainer</th><th>Attendees</th></tr></thead><tbody>' + trainingSessions.map(function (x) { return '<tr><td>' + esc(x.topic) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.audience) + '</td><td>' + esc(x.trainer) + '</td><td>' + x.attendees + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">No training sessions recorded.</p>') + '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">6. Incident & Near-Miss Log</div>' + (incidents.length ? '<table><thead><tr><th>Type</th><th>Date/Time</th><th>Location</th><th>Description</th></tr></thead><tbody>' + incidents.map(function (x) { return '<tr><td>' + esc(x.type) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.desc) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">Clean Record — Zero lost-time incidents or injuries recorded.</p>') + '<div class="section-title" style="border-left:5px solid var(--sut-red);border-right:none">7. Non-Conformity & Action Tracker (NCR / CAPA)</div>' + (ncrFindings.length ? '<table><thead><tr><th>Area</th><th>Finding</th><th>Department</th><th>Risk</th><th>Status</th><th>Target Date</th></tr></thead><tbody>' + ncrFindings.map(function (x) { return '<tr><td>' + esc(x.area) + '</td><td>' + esc(x.finding) + '</td><td>' + esc(x.dept) + '</td><td>' + esc(x.priority) + '</td><td>' + esc(x.status) + '</td><td>' + esc(x.date) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">No NCR findings recorded.</p>') + generalCasesSection + '</div>';
  }

  return '<div class="report" id="fullExecutiveReport"><div class="report-head"><div class="track"><b>نوع التقرير</b><span>Monthly HSE Report</span></div><div class="report-title"><h2>MONTHLY HSE EXECUTIVE REPORT</h2><p>جامعة السويدي للتكنولوجيا (SUTech) — التقرير الشهري الشامل لإدارة السلامة والبيئة والخدمات</p></div><div class="track"><b>تاريخ التقرير</b><span>' + new Date().toLocaleDateString("en-GB") + '</span></div></div><div class="section-title">1. المؤشرات التنفيذية الرئيسية (Executive HSE KPIs)</div><div class="dashboard-strip"><div class="dash-card"><strong>' + total + '</strong><span>إجمالي السجلات</span></div><div class="dash-card"><strong>' + closed + '</strong><span>سجلات مغلقة</span></div><div class="dash-card"><strong>' + activePtwCount + '</strong><span>تصاريح نشطة</span></div><div class="dash-card"><strong>' + totalTrained + '</strong><span>كوادر متدربة</span></div></div><div class="meta"><div><b>أيام العمل الآمنة:</b> ' + stats.safeDays + ' يوم</div><div><b>ساعات العمل الآمنة:</b> ' + stats.safeHours.toLocaleString() + ' ساعة</div><div><b>نسبة الإغلاق الميداني:</b> ' + (total ? Math.round(closed / total * 100) : 0) + '%</div></div>' + chartsHTML + '<div class="section-title">2. فحص الباصات والسيارات</div><p style="font-size:12px;margin:6px 0">' + (busCustom ? '<b>تم فحص الباصات والسيارات، وتوجد الملاحظات التالية:</b> ' + esc(busCustom) : '<b>تم فحص الباصات والسيارات ولا توجد أي ملاحظات.</b>') + '</p><div class="section-title">3. فحص المطاعم ومنافذ البيع</div><p style="font-size:12px;margin:6px 0">' + (foodCustom ? '<b>تم فحص المطاعم ومنافذ البيع، وتوجد الملاحظات التالية:</b> ' + esc(foodCustom) : '<b>تم فحص المطاعم ومنافذ البيع ولا توجد أي ملاحظات.</b>') + '</p><div class="section-title">4. تصاريح العمل التخصصية الصادرة (Permits to Work)</div>' + (ptwList.length ? '<table><thead><tr><th>رقم التصريح</th><th>نوع العمل</th><th>الموقع</th><th>الجهة المنفذة</th><th>الحالة</th></tr></thead><tbody>' + ptwList.map(function (x) { return '<tr><td>' + esc(x.no) + '</td><td>' + esc(x.type) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.contractor) + '</td><td>' + esc(x.status) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">لا توجد تصاريح عمل مسجلة خلال هذه الفترة.</p>') + '<div class="section-title">5. جلسات التدريب والتوعية بالسلامة (Training & TBT)</div>' + (trainingSessions.length ? '<table><thead><tr><th>موضوع التدريب</th><th>التاريخ</th><th>الفئة المستهدفة</th><th>المدرب</th><th>عدد الحضور</th></tr></thead><tbody>' + trainingSessions.map(function (x) { return '<tr><td>' + esc(x.topic) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.audience) + '</td><td>' + esc(x.trainer) + '</td><td>' + x.attendees + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">لا توجد جلسات تدريب مسجلة.</p>') + '<div class="section-title">6. سجل الحوادث والوقائع الوشيكة (Incidents & Near-Miss)</div>' + (incidents.length ? '<table><thead><tr><th>نوع الواقعة</th><th>التاريخ والوقت</th><th>الموقع</th><th>الوصف والإجراء</th></tr></thead><tbody>' + incidents.map(function (x) { return '<tr><td>' + esc(x.type) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.loc) + '</td><td>' + esc(x.desc) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">السجل نظيف — لم تسجل أي حوادث أو إصابات هادرة (Zero LTI).</p>') + '<div class="section-title">7. سجل المخالفات والإجراءات التصحيحية (NCR / CAPA Register)</div>' + (ncrFindings.length ? '<table><thead><tr><th>المكان</th><th>الملاحظة / المخالفة</th><th>الإدارة المسؤولة</th><th>درجة الخطورة</th><th>الحالة</th><th>تاريخ الاستحقاق</th></tr></thead><tbody>' + ncrFindings.map(function (x) { return '<tr><td>' + esc(x.area) + '</td><td>' + esc(x.finding) + '</td><td>' + esc(x.dept) + '</td><td>' + esc(x.priority) + '</td><td>' + esc(x.status) + '</td><td>' + esc(x.date) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p style="font-size:11px">لا توجد مخالفات NCR مسجلة.</p>') + generalCasesSection + '</div>';
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
  doc.write('<!DOCTYPE html><html lang="' + currentReportLang + '" dir="' + targetDir + '"><head><meta charset="utf-8"><title>SUTech Full Monthly HSE Executive Report</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>' + exportStyles() + '@page { size: A4 portrait; margin: 10mm 8mm 12mm 8mm; } @media print { html, body { background: #fff!important; color: #0f172a!important; } .export-page { width: 100%!important; max-width: 100%!important; padding: 0!important; margin: 0 auto!important; } .sut-export-header { margin-bottom: 8px!important; } .sut-export-footer { margin-top: 14px!important; } }</style></head><body><div class="export-page" dir="' + targetDir + '">' + wrappedContent + '</div></body></html>');
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
  clone.querySelectorAll("img").forEach(function (img) { if (!img.src.startsWith("data:")) { img.removeAttribute("src"); img.style.display = "none"; } });
  return clone;
}

function exportStyles() {
  return '*{box-sizing:border-box}' +
    'body{font-family:Cairo,Inter,Arial,"Segoe UI",sans-serif;color:#0f172a;background:#fff;margin:0;padding:0;line-height:1.6}' +
    '.export-page{width:100%;max-width:190mm;margin:0 auto;background:#fff;padding:0}' +
    '.sut-export-header{width:100%;margin-bottom:12px;padding:0;display:block}' +
    '.sut-export-header img{height:48px;width:auto;max-width:145px;object-fit:contain;display:inline-block}' +
    '.sut-export-footer{width:100%;margin-top:18px;page-break-inside:avoid}' +
    '.report{width:100%;background:#fff;margin:0;padding:0}' +
    '.report-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0b1f3a;padding-bottom:6px;margin-bottom:10px;gap:8px}' +
    '[dir="ltr"] .report-head{direction:ltr}' +
    '[dir="rtl"] .report-head{direction:rtl}' +
    '.report-title{text-align:center;flex:1}' +
    '.report-title h2{font-size:15px;margin:0 0 2px;color:#0b1f3a;font-weight:800;letter-spacing:0.3px}' +
    '.report-title p{font-size:9.5px;color:#c00000;font-weight:700;margin:0}' +
    '.track{background:#f8fafc;border:1px solid #dbe3ec;padding:4px 8px;border-radius:5px;font-size:9px;text-align:center;min-width:90px}' +
    '.track b{display:block;color:#64748b;font-size:7.5px;text-transform:uppercase}' +
    '.track span{font-weight:800;color:#c00000;font-size:9px}' +
    '.meta{display:flex;flex-wrap:wrap;gap:6px;background:#f8fafc;border:1px solid #dbe3ec;border-radius:6px;padding:6px 8px;font-size:9px;margin-bottom:8px}' +
    '.meta > div{flex:1 1 30%;min-width:110px}' +
    '.meta b{color:#0b1f3a}' +
    '.section-title{font-size:11.5px;font-weight:800;color:#0b1f3a;border-right:4px solid #c00000;background:#f8fafc;padding:4px 8px;margin:10px 0 6px;border-radius:3px;clear:both}' +
    '[dir="ltr"] .section-title{border-right:none;border-left:4px solid #c00000;text-align:left}' +
    '[dir="rtl"] .section-title{border-left:none;border-right:4px solid #c00000;text-align:right}' +
    '.answer{font-size:9.5px;line-height:1.6;color:#1e293b;unicode-bidi:plaintext}' +
    '.answer p{margin:0 0 4px;line-height:1.6;unicode-bidi:plaintext}' +
    '.answer ul,.answer ol{margin:2px 0 5px;padding-right:16px;padding-left:16px;line-height:1.6}' +
    'table{width:100%;border-collapse:collapse;border-spacing:0;table-layout:fixed;margin:6px 0 10px;font-size:8.5px;background:#fff;page-break-inside:auto}' +
    'tr{page-break-inside:avoid;page-break-after:auto}' +
    'th,td{border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;line-height:1.4}' +
    'th{background:#e8eef6;color:#0b1f3a;font-weight:800;text-align:center;vertical-align:middle}' +
    'tr:nth-child(even) td{background:#f8fafc}' +
    '.report-photos-grid{display:flex;gap:8px;margin:8px 0;page-break-inside:avoid}' +
    '.report-photo-card{flex:1;border:1px solid #cbd5e1;padding:6px;text-align:center;border-radius:5px;background:#f8fafc}' +
    '.report-photo-card img{max-height:140px;width:100%;object-fit:contain;border-radius:4px;background:#fff;border:1px solid #e2e8f0}' +
    '.report-photo-card span{display:block;font-size:9px;font-weight:800;margin-top:4px;color:#0b1f3a}' +
    '.photo-pending-placeholder{height:100px;border:1.5px dashed #cbd5e1;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;font-size:8.5px;background:#fff;padding:6px;line-height:1.4;text-align:center}' +
    '.dashboard-strip,.ncr-grid{display:flex;gap:6px;margin:6px 0;page-break-inside:avoid}' +
    '.dash-card{flex:1;border:1px solid #dbe3ec;border-radius:5px;background:#f8fafc;padding:6px 8px;text-align:center}' +
    '.dash-card strong{display:block;font-size:15px;color:#0b1f3a;font-weight:800;line-height:1.2}' +
    '.dash-card span{font-size:7.5px;color:#64748b;font-weight:700;text-transform:uppercase}' +
    '.badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:7.5px;font-weight:800}' +
    '.badge.open{background:#fee2e2;color:#991b1b}' +
    '.badge.progress{background:#fef3c7;color:#92400e}' +
    '.badge.closed{background:#dcfce7;color:#166534}' +
    '.badge.critical{background:#7f1d1d;color:#fff}' +
    '.badge.high{background:#fee2e2;color:#991b1b}' +
    '.badge.medium{background:#fef3c7;color:#92400e}' +
    '.badge.low{background:#ecfdf5;color:#065f46}' +
    '.badge.general-case{background:#e0e7ff;color:#3730a3}' +
    '.bar{height:6px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:3px 0}' +
    '.bar i{display:block;height:100%;background:#c00000}' +
    '@media print{@page{size:A4 portrait;margin:8mm 6mm 10mm 6mm}.export-page{padding:0!important;max-width:100%!important}}';
}

function downloadHTMLAsWord(el, name) {
  if (!el) return;
  var clone = el.cloneNode(true);
  clone.classList.add("export-page");
  clone.querySelectorAll(".no-print").forEach(function (x) { x.remove(); });

  var targetDir = clone.getAttribute("dir") || (clone.querySelector(".report") ? clone.querySelector(".report").getAttribute("dir") : null) || (currentReportLang === "en" ? "ltr" : "rtl");
  var isEn = (targetDir === "ltr") || (clone.getAttribute("data-report-language") === "en") || (currentReportLang === "en");
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
    'margin: 56.7pt 45.35pt 56.7pt 45.35pt; ' +
    'mso-header-margin: 28.35pt; ' +
    'mso-footer-margin: 28.35pt; ' +
    'mso-header: h1; ' +
    'mso-footer: f1; ' +
    '} ' +
    'div.Section1 { page: Section1; } ' +
    'p.MsoHeader, div.MsoHeader { margin:0; padding:0; } ' +
    'p.MsoFooter, div.MsoFooter { margin:0; padding:0; } ' +
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
  doc.write('<!DOCTYPE html><html lang="' + (isEn ? 'en' : 'ar') + '" dir="' + targetDir + '"><head><meta charset="utf-8"><title>SUTech HSE Report</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>' + exportStyles() + '@page { size: A4 portrait; margin: 10mm 8mm 12mm 8mm; } @media print { html, body { background: #fff!important; color: #0f172a!important; } .export-page { width: 100%!important; max-width: 100%!important; padding: 0!important; margin: 0 auto!important; } .sut-export-header { margin-bottom: 8px!important; } .sut-export-footer { margin-top: 14px!important; } }</style></head><body><div class="export-page" dir="' + targetDir + '">' + wrappedContent + '</div></body></html>');
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
  ["dragenter", "dragover"].forEach(function (e) { dz.addEventListener(e, function (x) { x.preventDefault(); dz.classList.add("drag"); }); });
  ["dragleave", "drop"].forEach(function (e) { dz.addEventListener(e, function (x) { x.preventDefault(); dz.classList.remove("drag"); }); });
  dz.addEventListener("drop", function (e) { handleMonthlyFile(e.dataTransfer.files[0]); });
}

async function handleMonthlyFile(file) {
  if (!file) return;
  monthlySource = { name: file.name, type: file.type, text: "" };
  document.getElementById("fileName").textContent = file.name;
  document.getElementById("sourcePreview").textContent = "جاري قراءة الملف...";
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
        rows.forEach(function (row) { var vals = row.map(function (v) { return String(v != null ? v : "").trim(); }); if (vals.some(function (v) { return v !== ""; })) xlParts.push(vals.join(" | ")); });
      });
      monthlySource.text = xlParts.join("\n");
    } else if (ext === "pdf") {
      if (!window.pdfjsLib) {
        await ensureScript(function () { return typeof window.pdfjsLib !== "undefined"; }, "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      }
      var pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      var pdfPages = [];
      for (var i = 1; i <= pdf.numPages; i++) { var p = await pdf.getPage(i); var c = await p.getTextContent(); pdfPages.push(c.items.map(function (x) { return x.str; }).join(" ")); }
      monthlySource.text = pdfPages.join("\n");
    } else { throw new Error("نوع الملف غير مدعوم."); }

    if (!monthlySource.text.trim()) throw new Error("لم يتم العثور على نص قابل للقراءة.");
    document.getElementById("sourcePreview").className = "status ok";
    document.getElementById("sourcePreview").innerHTML = '<b>' + esc(file.name) + '</b> — تم استخراج ' + monthlySource.text.length.toLocaleString() + ' حرف بنجاح.';
    document.getElementById("monthlyBtn").disabled = false;
  } catch (e) {
    document.getElementById("sourcePreview").className = "status err";
    document.getElementById("sourcePreview").textContent = e.message;
    document.getElementById("monthlyBtn").disabled = true;
  }
}

async function runMonthly() {
  if (!monthlySource.text) return;
  var lang = document.getElementById("monthlyLang").value, style = document.getElementById("monthlyStyle").value;
  var prompt = 'You are an HSE management reporting analyst. Summarize ONLY the source document below. Do not invent metrics.\nLanguage: ' + lang + '. Style: ' + style + '.\nReturn JSON only:\n{"title":"","period":"","executive_summary":"","kpis":[{"label":"","value":"","unit":"","source_note":""}],"activities":[{"category":"","description":"","date":"","location":"","status":""}],"findings":[{"finding":"","area":"","department":"","status":"","priority":"","action":"","source_note":""}],"actions":[{"action":"","owner":"","target_date":"","status":""}],"management_notes":[],"data_limitations":[]}\n\nSOURCE DOCUMENT:\n---BEGIN SOURCE---\n' + monthlySource.text + '\n---END SOURCE---';
  try {
    document.getElementById("monthlyOutput").classList.remove("hidden");
    loading(document.getElementById("monthlyReport"), true);
    var d = extractJSON(await callGemini(prompt));
    renderMonthly(d);
  } catch (e) { document.getElementById("monthlyReport").innerHTML = '<div class="status err"><b>Error:</b> ' + esc(e.message) + '</div>'; }
}

function renderMonthly(d) {
  lastMonthly = d;
  var kpis = d.kpis || [];
  var lang = (document.getElementById("monthlyLang") ? document.getElementById("monthlyLang").value : currentReportLang) || "ar";
  var isAr = (lang === "ar");
  var h = '<div class="report" id="monthlyReportInner" dir="' + (isAr ? 'rtl' : 'ltr') + '" data-report-language="' + lang + '">' +
    '<div class="report-head">' +
      '<div class="track"><b>' + (isAr ? "الملف المصدر" : "Source File") + '</b><span>' + esc(monthlySource.name) + '</span></div>' +
      '<div class="report-title"><h2>' + esc(d.title || "Monthly HSE Report") + '</h2><p>' + esc(d.period || "SUTech HSE Department") + '</p></div>' +
      '<div class="track"><b>' + (isAr ? "نوع التقرير" : "Type") + '</b><span>AI Digest</span></div>' +
    '</div>' +
    '<div class="dashboard-strip">' +
      kpis.slice(0, 4).map(function (x) { return '<div class="dash-card"><strong>' + esc(x.value != null ? x.value : "—") + '</strong><span>' + esc(x.label) + ' ' + esc(x.unit || "") + '</span></div>'; }).join("") +
    '</div>' +
    '<div class="section-title">' + (isAr ? "الملخص التنفيذي" : "Executive Overview") + '</div>' +
    '<div class="answer" dir="auto" style="line-height:1.6">' + md(d.executive_summary) + '</div>' +
    '<div class="section-title">' + (isAr ? "مؤشرات الأداء المستخرجة" : "Source KPIs") + '</div>' +
    '<table><thead><tr><th>' + (isAr ? "المؤشر" : "KPI") + '</th><th>' + (isAr ? "القيمة" : "Value") + '</th><th>' + (isAr ? "الوحدة" : "Unit") + '</th><th>' + (isAr ? "ملاحظة المصدر" : "Source Note") + '</th></tr></thead><tbody>' +
      kpis.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td><b>' + esc(x.value != null ? x.value : "—") + '</b></td><td>' + esc(x.unit) + '</td><td>' + esc(x.source_note) + '</td></tr>'; }).join("") +
    '</tbody></table>' +
    '<div class="section-title">' + (isAr ? "الأنشطة والملاحظات" : "Activities & Findings") + '</div>' +
    '<table><thead><tr><th>' + (isAr ? "التصنيف / المنطقة" : "Category / Area") + '</th><th>' + (isAr ? "التفاصيل" : "Details") + '</th><th>' + (isAr ? "الحالة" : "Status") + '</th><th>' + (isAr ? "الإجراء" : "Action") + '</th></tr></thead><tbody>' +
      (d.findings || []).map(function (x) { return '<tr><td>' + esc(x.area) + '</td><td>' + esc(x.finding) + '</td><td>' + esc(x.status) + '</td><td>' + esc(x.action) + '</td></tr>'; }).join("") +
    '</tbody></table>' +
  '</div>';
  document.getElementById("monthlyReport").innerHTML = h;
}

async function downloadMonthlyPPT() {
  if (!lastMonthly) return showSweetAlert("تنبيه", "يرجى إنشاء وتحليل التقرير الشهري أولاً قبل التصدير.", "warning");
  showToast("info", "جاري إعداد وتنزيل عرض PowerPoint...");
  try {
    await ensureScript(function () { return typeof window.PptxGenJS !== "undefined" || typeof window.pptxgen !== "undefined"; }, "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");
    var PPTXClass = window.PptxGenJS || window.pptxgen;
    var pptx = new PPTXClass();
    pptx.layout = "LAYOUT_WIDE";
    var s = pptx.addSlide();
    s.background = { color: "F4F7FB" };
    s.addText(lastMonthly.title || "Monthly HSE Report", { x: 0.5, y: 0.5, w: 12.2, h: 0.6, fontSize: 24, bold: true, color: "0B1F3A", align: "center" });
    s.addText(stripHtml(md(lastMonthly.executive_summary || "")), { x: 0.8, y: 1.5, w: 11.5, h: 4.5, fontSize: 13, color: "334155" });
    await pptx.writeFile({ fileName: "SUTech-HSE-Monthly-Report.pptx" });
    showToast("success", "تم تنزيل ملف PowerPoint بنجاح!");
  } catch (e) { showSweetAlert("خطأ في التصدير", "تعذر إنشاء PowerPoint: " + e.message, "error"); }
}

function stripHtml(x) { var d = document.createElement("div"); d.innerHTML = x; return d.innerText || d.textContent || ""; }
