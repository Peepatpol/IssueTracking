/**
 * app.js - Executive Dashboard Controller
 * Central Group - Online Booking UAT Analytics
 */

// Global App State
const state = {
  data: null,
  activeTab: 'overview',
  theme: localStorage.getItem('uat_dashboard_theme') || 'dark',
  timelineView: 'cumulative', // 'cumulative' | 'daily'
  
  // Issue filters
  issueFilters: {
    result: 'all',
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    urgency: 'all',
    type: 'all',
    search: '',
    page: 1,
    pageSize: 20
  },

  // Booking filters
  bookingFilters: {
    module: 'all',
    result: 'all',
    search: '',
    page: 1,
    pageSize: 20
  },

  charts: {}
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  
  // Load data from data.js or fallback fetch
  if (window.DASHBOARD_DATA) {
    state.data = window.DASHBOARD_DATA;
    initDashboard();
  } else {
    fetch('dashboard_data.json')
      .then(res => res.json())
      .then(data => {
        state.data = data;
        initDashboard();
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        showToast('ไม่สามารถโหลดข้อมูลเบื้องต้นได้ กรุณาตรวจสอบไฟล์ data.js', 'danger');
      });
  }

  setupEventListeners();
});

// Setup App Event Listeners
function setupEventListeners() {
  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('uat_dashboard_theme', state.theme);
      applyTheme(state.theme);
      updateChartColors();
    });
  }

  // Fullscreen toggle
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullScreen);
  }

  // Print summary
  const printBtn = document.getElementById('print-summary-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Timeline view toggle (cumulative vs daily)
  document.querySelectorAll('.timeline-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.timeline-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timelineView = btn.getAttribute('data-view');
      renderTimelineChart();
    });
  });

  // Issue filter controls
  const issueResultFilter = document.getElementById('issue-filter-result');
  if (issueResultFilter) {
    issueResultFilter.addEventListener('change', (e) => {
      state.issueFilters.result = e.target.value;
      state.issueFilters.page = 1;
      renderIssuesTab();
    });
  }

  const issueUrgencyFilter = document.getElementById('issue-filter-urgency');
  if (issueUrgencyFilter) {
    issueUrgencyFilter.addEventListener('change', (e) => {
      state.issueFilters.urgency = e.target.value;
      state.issueFilters.page = 1;
      renderIssuesTab();
    });
  }

  const issueTypeFilter = document.getElementById('issue-filter-type');
  if (issueTypeFilter) {
    issueTypeFilter.addEventListener('change', (e) => {
      state.issueFilters.type = e.target.value;
      state.issueFilters.page = 1;
      renderIssuesTab();
    });
  }

  const issueDatePreset = document.getElementById('issue-filter-date-preset');
  if (issueDatePreset) {
    issueDatePreset.addEventListener('change', (e) => {
      state.issueFilters.datePreset = e.target.value;
      const customDates = document.getElementById('custom-date-inputs');
      if (e.target.value === 'custom') {
        customDates.style.display = 'flex';
      } else {
        customDates.style.display = 'none';
        state.issueFilters.dateFrom = '';
        state.issueFilters.dateTo = '';
      }
      state.issueFilters.page = 1;
      renderIssuesTab();
    });
  }

  const issueDateFrom = document.getElementById('issue-filter-date-from');
  if (issueDateFrom) {
    issueDateFrom.addEventListener('change', (e) => {
      state.issueFilters.dateFrom = e.target.value;
      state.issueFilters.page = 1;
      renderIssuesTab();
    });
  }

  const issueDateTo = document.getElementById('issue-filter-date-to');
  if (issueDateTo) {
    issueDateTo.addEventListener('change', (e) => {
      state.issueFilters.dateTo = e.target.value;
      state.issueFilters.page = 1;
      renderIssuesTab();
    });
  }

  const issueSearch = document.getElementById('issue-search-input');
  if (issueSearch) {
    issueSearch.addEventListener('input', debounce((e) => {
      state.issueFilters.search = e.target.value.toLowerCase().trim();
      state.issueFilters.page = 1;
      renderIssuesTab();
    }, 250));
  }

  const resetIssueFiltersBtn = document.getElementById('reset-issue-filters-btn');
  if (resetIssueFiltersBtn) {
    resetIssueFiltersBtn.addEventListener('click', resetIssueFilters);
  }

  // Booking filter controls
  const bookingModuleFilter = document.getElementById('booking-filter-module');
  if (bookingModuleFilter) {
    bookingModuleFilter.addEventListener('change', (e) => {
      state.bookingFilters.module = e.target.value;
      state.bookingFilters.page = 1;
      renderBookingTab();
    });
  }

  const bookingResultFilter = document.getElementById('booking-filter-result');
  if (bookingResultFilter) {
    bookingResultFilter.addEventListener('change', (e) => {
      state.bookingFilters.result = e.target.value;
      state.bookingFilters.page = 1;
      renderBookingTab();
    });
  }

  const bookingSearch = document.getElementById('booking-search-input');
  if (bookingSearch) {
    bookingSearch.addEventListener('input', debounce((e) => {
      state.bookingFilters.search = e.target.value.toLowerCase().trim();
      state.bookingFilters.page = 1;
      renderBookingTab();
    }, 250));
  }

  const resetBookingFiltersBtn = document.getElementById('reset-booking-filters-btn');
  if (resetBookingFiltersBtn) {
    resetBookingFiltersBtn.addEventListener('click', resetBookingFilters);
  }

  // File Upload / Dropzone
  setupFileDropzone();

  // Modal Close
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalOverlay = document.getElementById('detail-modal');
  if (modalCloseBtn && modalOverlay) {
    modalCloseBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });
  }
}

// Switch Active Tab
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-content-panel').forEach(panel => {
    panel.style.display = panel.id === `tab-panel-${tabId}` ? 'block' : 'none';
  });

  // Re-render active view
  if (tabId === 'overview') {
    renderOverviewTab();
  } else if (tabId === 'booking') {
    renderBookingTab();
  } else if (tabId === 'issues') {
    renderIssuesTab();
  }

  if (window.lucide) lucide.createIcons();
}

// Master Dashboard Init
function initDashboard() {
  if (!state.data) return;

  // Set timestamp
  const tsEl = document.getElementById('last-sync-time');
  if (tsEl && state.data.GeneratedAt) {
    tsEl.textContent = `อัปเดตล่าสุด: ${state.data.GeneratedAt}`;
  }

  // Populate dynamic select options
  populateFilterOptions();

  // Render initial overview tab
  renderOverviewTab();
  renderBookingTab();
  renderIssuesTab();

  // Create Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  showToast('โหลดข้อมูลระบบ Slot Booking UAT เรียบร้อยแล้ว', 'success');
}

// Populate select options dynamically
function populateFilterOptions() {
  if (!state.data) return;

  // Issue Results
  const issueResultSelect = document.getElementById('issue-filter-result');
  if (issueResultSelect && state.data.Issues) {
    const results = [...new Set(state.data.Issues.map(i => i.Result).filter(Boolean))].sort();
    issueResultSelect.innerHTML = '<option value="all">ผลลัพธ์ทั้งหมด (All Results)</option>';
    results.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = `${r}`;
      issueResultSelect.appendChild(opt);
    });
  }

  // Booking Modules
  const bookingModuleSelect = document.getElementById('booking-filter-module');
  if (bookingModuleSelect && state.data.BookingTests) {
    const modules = [...new Set(state.data.BookingTests.map(t => t.Type).filter(Boolean))].sort();
    bookingModuleSelect.innerHTML = '<option value="all">โมดูลทั้งหมด (All Modules)</option>';
    modules.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `${m}`;
      bookingModuleSelect.appendChild(opt);
    });
  }
}

// Theme Application
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
}

function updateChartColors() {
  renderTimelineChart();
  renderOverviewDonut();
  renderIssueCharts(getFilteredIssues());
}

// ==========================================
// 1. OVERVIEW TAB RENDERING
// ==========================================
function renderOverviewTab() {
  const data = state.data;
  if (!data) return;

  // Calculate high-level KPIs
  const totalPlanned = data.OverallStats?.TotalPlan || 145;
  const totalPassed = data.OverallStats?.Pass || 144;
  const passRate = ((totalPassed / totalPlanned) * 100).toFixed(1);
  const notPass = data.OverallStats?.NotPass || 1;

  const totalIssues = data.Issues?.length || 0;
  const issuesPassed = data.Issues?.filter(i => i.Result === 'Pass').length || 0;
  const issuePassRate = totalIssues > 0 ? ((issuesPassed / totalIssues) * 100).toFixed(1) : 0;
  const issuesWorkaround = data.Issues?.filter(i => i.Result && (i.Result.includes('Workaround') || i.Result.includes('Meeting'))).length || 0;
  const issuesPending = data.Issues?.filter(i => i.Result && (i.Result.includes('Ready') || i.Result.includes('Re-test'))).length || 0;

  // Update KPI Cards DOM
  document.getElementById('kpi-test-passed').textContent = `${totalPassed}`;
  document.getElementById('kpi-test-total').textContent = `/ ${totalPlanned} เคส`;
  document.getElementById('kpi-test-rate').textContent = `${passRate}% Pass Rate`;

  document.getElementById('kpi-issue-total').textContent = `${totalIssues}`;
  document.getElementById('kpi-issue-resolved').textContent = `${issuesPassed} แก้ไขแล้ว (${issuePassRate}%)`;

  document.getElementById('kpi-workaround-count').textContent = `${issuesWorkaround}`;
  document.getElementById('kpi-pending-count').textContent = `${issuesPending}`;

  // Render Charts
  renderTimelineChart();
  renderOverviewDonut();
  renderModuleList();
}

// Render Timeline Chart (Matching summary#4 exact graph)
function renderTimelineChart() {
  const canvas = document.getElementById('timeline-chart');
  if (!canvas || !state.data?.Timeline) return;

  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  const timeline = state.data.Timeline.filter(t => t.PlanCumulative > 0 || t.TestCumulative > 0 || t.PassCumulative > 0);
  const labels = timeline.map(t => {
    const parts = t.Date.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : t.Date;
  });

  if (state.charts.timeline) {
    state.charts.timeline.destroy();
  }

  let datasets = [];

  if (state.timelineView === 'cumulative') {
    // Exact S-curve matching summary#4 Chart 1
    datasets = [
      {
        label: 'เป้าหมายสะสม (Plan)',
        data: timeline.map(t => t.PlanCumulative),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: 2.5,
        borderDash: [5, 5],
        tension: 0.3,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 6
      },
      {
        label: 'ทดสอบแล้วสะสม (Tested)',
        data: timeline.map(t => t.TestCumulative),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2.5,
        tension: 0.3,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 6
      },
      {
        label: 'ผ่านแล้วสะสม (Pass)',
        data: timeline.map(t => t.PassCumulative),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 3,
        tension: 0.3,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 7
      }
    ];
  } else {
    // Daily Volume
    datasets = [
      {
        label: 'แผนทดสอบต่อวัน',
        data: timeline.map(t => t.PlanDaily),
        backgroundColor: 'rgba(99, 102, 241, 0.65)',
        borderRadius: 4
      },
      {
        label: 'ทดสอบจริงต่อวัน',
        data: timeline.map(t => t.TestDaily),
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderRadius: 4
      },
      {
        label: 'ผ่านต่อวัน',
        data: timeline.map(t => t.PassDaily),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4
      }
    ];
  }

  const ctx = canvas.getContext('2d');
  state.charts.timeline = new Chart(ctx, {
    type: state.timelineView === 'cumulative' ? 'line' : 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: textColor,
            font: { family: "'Plus Jakarta Sans', 'Prompt'", size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          titleColor: isDark ? '#F8FAFC' : '#0F172A',
          bodyColor: isDark ? '#CBD5E1' : '#334155',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 } },
          min: 0
        }
      }
    }
  });
}

// Render Overview Donut (Pass vs Open)
function renderOverviewDonut() {
  const canvas = document.getElementById('overview-donut-chart');
  if (!canvas || !state.data?.OverallStats) return;

  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';

  const passed = state.data.OverallStats.Pass || 144;
  const notPass = state.data.OverallStats.NotPass || 1;

  if (state.charts.overviewDonut) {
    state.charts.overviewDonut.destroy();
  }

  const ctx = canvas.getContext('2d');
  state.charts.overviewDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pass (ผ่าน)', 'Not Pass (ยังไม่ผ่าน)'],
      datasets: [{
        data: [passed, notPass],
        backgroundColor: ['#10B981', '#EF4444'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: { family: "'Plus Jakarta Sans', 'Prompt'", size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 8
          }
        }
      }
    }
  });

  const pctEl = document.getElementById('overview-donut-pct');
  if (pctEl) {
    const rate = ((passed / (passed + notPass)) * 100).toFixed(1);
    pctEl.textContent = `${rate}%`;
  }
}

// Render Module Readiness List
function renderModuleList() {
  const container = document.getElementById('module-list-container');
  if (!container || !state.data?.Modules) return;

  container.innerHTML = '';
  state.data.Modules.forEach(m => {
    if (m.Total === 0) return;
    const pct = m.Total > 0 ? ((m.Pass / m.Total) * 100).toFixed(0) : 0;
    
    const card = document.createElement('div');
    card.className = 'module-row-card';
    card.style.cursor = 'pointer';
    card.title = `คลิกเพื่อดูรายการสคริปต์ของ ${m.Module}`;
    card.onclick = () => {
      state.bookingFilters.module = m.Module;
      const sel = document.getElementById('booking-filter-module');
      if (sel) sel.value = m.Module;
      switchTab('booking');
    };

    card.innerHTML = `
      <div class="module-header-row">
        <span class="module-name">
          <i data-lucide="layers" style="width:14px;height:14px;color:var(--accent-blue)"></i>
          ${m.Module}
        </span>
        <span class="module-stat-pill">
          ${m.Pass} / ${m.Total} (${pct}%)
        </span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${pct}%; background: ${pct == 100 ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #F59E0B, #D97706)'}"></div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// 2. BOOKING TEST SCRIPT TAB (#4)
// ==========================================
function renderBookingTab() {
  const data = state.data;
  if (!data?.BookingTests) return;

  // Filter
  const filtered = data.BookingTests.filter(item => {
    // Module
    if (state.bookingFilters.module !== 'all' && item.Type !== state.bookingFilters.module) {
      return false;
    }
    // Result
    if (state.bookingFilters.result !== 'all' && item.Result !== state.bookingFilters.result) {
      return false;
    }
    // Search
    if (state.bookingFilters.search) {
      const q = state.bookingFilters.search;
      const haystack = `${item.No} ${item.TestCase} ${item.Function} ${item.FunctionCode} ${item.Team} ${item.OPSRemark} ${item.RISRemark}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Counters
  document.getElementById('booking-count-total').textContent = filtered.length;
  document.getElementById('booking-count-pass').textContent = filtered.filter(i => i.Result === 'Pass').length;
  document.getElementById('booking-count-notpass').textContent = filtered.filter(i => i.Result === 'Not Pass').length;
  document.getElementById('booking-count-na').textContent = filtered.filter(i => i.Result === 'Not Applicable').length;

  // Pagination
  const pageSize = state.bookingFilters.pageSize;
  const page = state.bookingFilters.page;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const pageData = filtered.slice(startIndex, startIndex + pageSize);

  // Table Body
  const tbody = document.getElementById('booking-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">ไม่พบข้อมูลการทดสอบที่ตรงกับเงื่อนไขการกรอง</td></tr>`;
    } else {
      pageData.forEach(item => {
        const tr = document.createElement('tr');
        
        let resultBadge = `<span class="badge badge-muted">${item.Result || '-'}</span>`;
        if (item.Result === 'Pass') {
          resultBadge = `<span class="badge badge-pass"><i data-lucide="check" style="width:12px;height:12px"></i> Pass</span>`;
        } else if (item.Result === 'Not Pass') {
          resultBadge = `<span class="badge badge-fail"><i data-lucide="alert-circle" style="width:12px;height:12px"></i> Not Pass</span>`;
        }

        tr.innerHTML = `
          <td style="font-weight:600;color:var(--text-secondary)">#${item.No}</td>
          <td><span class="badge badge-info">${item.Type}</span></td>
          <td style="font-weight:500">${item.Function || item.FunctionCode || '-'}</td>
          <td style="max-width:320px;word-break:break-word">${escapeHtml(item.TestCase)}</td>
          <td><span style="font-size:12px;color:var(--text-secondary)">${item.Team || '-'}</span></td>
          <td><span style="font-size:12px">${item.TestDate || '-'}</span></td>
          <td><span style="font-size:12px">${item.PassDate || '-'}</span></td>
          <td>${resultBadge}</td>
          <td style="font-size:12px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(item.OPSRemark || item.RISRemark || '')}">
            ${escapeHtml(item.OPSRemark || item.RISRemark || '-')}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Update Pagination Controls
  document.getElementById('booking-page-info').textContent = `หน้า ${page} จาก ${totalPages} (${filtered.length} รายการ)`;
  document.getElementById('booking-prev-btn').disabled = page <= 1;
  document.getElementById('booking-next-btn').disabled = page >= totalPages;

  document.getElementById('booking-prev-btn').onclick = () => {
    if (state.bookingFilters.page > 1) {
      state.bookingFilters.page--;
      renderBookingTab();
    }
  };
  document.getElementById('booking-next-btn').onclick = () => {
    if (state.bookingFilters.page < totalPages) {
      state.bookingFilters.page++;
      renderBookingTab();
    }
  };

  // Export CSV Handler
  document.getElementById('export-booking-csv').onclick = () => exportToCSV(filtered, 'Booking_Script_Test_4.csv');

  if (window.lucide) lucide.createIcons();
}

function resetBookingFilters() {
  state.bookingFilters.module = 'all';
  state.bookingFilters.result = 'all';
  state.bookingFilters.search = '';
  state.bookingFilters.page = 1;

  document.getElementById('booking-filter-module').value = 'all';
  document.getElementById('booking-filter-result').value = 'all';
  document.getElementById('booking-search-input').value = '';

  renderBookingTab();
}

// ==========================================
// 3. ISSUES TAB RENDERING & FILTERS
// ==========================================
function getFilteredIssues() {
  if (!state.data?.Issues) return [];

  return state.data.Issues.filter(item => {
    // 1. Result filter
    if (state.issueFilters.result !== 'all' && item.Result !== state.issueFilters.result) {
      return false;
    }

    // 2. Urgency filter
    if (state.issueFilters.urgency !== 'all') {
      const u1 = (item.Urgency || '').toLowerCase();
      const u2 = state.issueFilters.urgency.toLowerCase();
      if (u1 !== u2) return false;
    }

    // 3. Type filter
    if (state.issueFilters.type !== 'all' && item.Type !== state.issueFilters.type) {
      return false;
    }

    // 4. Date filter
    if (state.issueFilters.datePreset !== 'all') {
      const itemDateStr = item.Date || '';
      if (!matchesDateFilter(itemDateStr, state.issueFilters)) {
        return false;
      }
    }

    // 5. Search
    if (state.issueFilters.search) {
      const q = state.issueFilters.search;
      const haystack = `${item.No} ${item.Problem} ${item.Menu} ${item.MainMenu} ${item.Name} ${item.Datatest} ${item.Remark} ${item.RISRemark} ${item.UserLogin}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

function matchesDateFilter(dateStr, filters) {
  if (!dateStr) return false;

  // Normalize dateStr to ISO YYYY-MM-DD
  let isoDate = '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      isoDate = `${year}-${month}-${day}`;
    }
  } else if (dateStr.includes('-')) {
    isoDate = dateStr;
  }

  if (!isoDate) return false;

  if (filters.datePreset === 'sep2024') {
    return isoDate.startsWith('2024-09');
  } else if (filters.datePreset === 'oct2024') {
    return isoDate.startsWith('2024-10');
  } else if (filters.datePreset === 'nov2024') {
    return isoDate.startsWith('2024-11');
  } else if (filters.datePreset === 'dec2024') {
    return isoDate.startsWith('2024-12');
  } else if (filters.datePreset === 'custom') {
    if (filters.dateFrom && isoDate < filters.dateFrom) return false;
    if (filters.dateTo && isoDate > filters.dateTo) return false;
    return true;
  }
  return true;
}

function renderIssuesTab() {
  const filtered = getFilteredIssues();

  // Counters
  document.getElementById('issue-count-total').textContent = filtered.length;
  document.getElementById('issue-count-pass').textContent = filtered.filter(i => i.Result === 'Pass').length;
  document.getElementById('issue-count-high').textContent = filtered.filter(i => (i.Urgency || '').toLowerCase() === 'high').length;
  document.getElementById('issue-count-pending').textContent = filtered.filter(i => i.Result && (i.Result.includes('Ready') || i.Result.includes('Re-test'))).length;

  // Render Charts based on filtered data
  renderIssueCharts(filtered);

  // Pagination
  const pageSize = state.issueFilters.pageSize;
  const page = state.issueFilters.page;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const pageData = filtered.slice(startIndex, startIndex + pageSize);

  // Render Table
  const tbody = document.getElementById('issues-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">ไม่พบรายการ Issue ที่ตรงกับตัวกรองที่เลือก</td></tr>`;
    } else {
      pageData.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => openIssueDetailModal(item);

        // Result badge
        let resultBadge = `<span class="badge badge-muted">${item.Result || '-'}</span>`;
        if (item.Result === 'Pass') {
          resultBadge = `<span class="badge badge-pass"><i data-lucide="check" style="width:12px;height:12px"></i> Pass</span>`;
        } else if (item.Result && item.Result.includes('Workaround')) {
          resultBadge = `<span class="badge badge-warning"><i data-lucide="alert-triangle" style="width:12px;height:12px"></i> Workaround</span>`;
        } else if (item.Result && item.Result.includes('Meeting')) {
          resultBadge = `<span class="badge badge-info"><i data-lucide="clock" style="width:12px;height:12px"></i> หลัง Go-Live</span>`;
        } else if (item.Result && (item.Result.includes('Re-test') || item.Result.includes('Ready'))) {
          resultBadge = `<span class="badge badge-fail"><i data-lucide="refresh-cw" style="width:12px;height:12px"></i> ${item.Result}</span>`;
        }

        // Urgency badge
        let urgencyBadge = `<span class="badge badge-muted">${item.Urgency || '-'}</span>`;
        const uLower = (item.Urgency || '').toLowerCase();
        if (uLower === 'high') {
          urgencyBadge = `<span class="badge badge-fail">High</span>`;
        } else if (uLower === 'medium') {
          urgencyBadge = `<span class="badge badge-warning">Medium</span>`;
        } else if (uLower === 'low') {
          urgencyBadge = `<span class="badge badge-info">Low</span>`;
        }

        // Type badge
        let typeBadge = `<span class="badge badge-muted">${item.Type || '-'}</span>`;
        if (item.Type === 'Issue') {
          typeBadge = `<span class="badge badge-fail" style="border:none;background:rgba(239, 68, 68, 0.15)">Issue</span>`;
        } else if (item.Type === 'Request') {
          typeBadge = `<span class="badge badge-info" style="border:none;background:rgba(6, 182, 212, 0.15)">Request</span>`;
        }

        tr.innerHTML = `
          <td style="font-weight:600;color:var(--text-secondary)">#${item.No}</td>
          <td><span style="font-size:12px;white-space:nowrap">${item.Date || '-'}</span></td>
          <td>${urgencyBadge}</td>
          <td>${typeBadge}</td>
          <td>${resultBadge}</td>
          <td style="max-width:320px;word-break:break-word">
            <div style="font-weight:500;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
              ${escapeHtml(item.Problem || 'ไม่มีรายละเอียด')}
            </div>
          </td>
          <td><span style="font-size:12px;color:var(--text-secondary)">${item.Menu || item.MainMenu || '-'}</span></td>
          <td>
            <button class="action-btn" style="padding:4px 8px;font-size:11px" onclick="event.stopPropagation(); openIssueDetailModal(window.currentModalItem = ${escapeHtml(JSON.stringify(item).replace(/"/g, '&quot;'))})">
              <i data-lucide="eye" style="width:12px;height:12px"></i> ดู
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Update Pagination Controls
  document.getElementById('issue-page-info').textContent = `หน้า ${page} จาก ${totalPages} (${filtered.length} รายการ)`;
  document.getElementById('issue-prev-btn').disabled = page <= 1;
  document.getElementById('issue-next-btn').disabled = page >= totalPages;

  document.getElementById('issue-prev-btn').onclick = () => {
    if (state.issueFilters.page > 1) {
      state.issueFilters.page--;
      renderIssuesTab();
    }
  };
  document.getElementById('issue-next-btn').onclick = () => {
    if (state.issueFilters.page < totalPages) {
      state.issueFilters.page++;
      renderIssuesTab();
    }
  };

  // Export CSV
  document.getElementById('export-issues-csv').onclick = () => exportToCSV(filtered, 'Issues_UAT_Slot_Booking.csv');

  if (window.lucide) lucide.createIcons();
}

function resetIssueFilters() {
  state.issueFilters.result = 'all';
  state.issueFilters.urgency = 'all';
  state.issueFilters.type = 'all';
  state.issueFilters.datePreset = 'all';
  state.issueFilters.dateFrom = '';
  state.issueFilters.dateTo = '';
  state.issueFilters.search = '';
  state.issueFilters.page = 1;

  document.getElementById('issue-filter-result').value = 'all';
  document.getElementById('issue-filter-urgency').value = 'all';
  document.getElementById('issue-filter-type').value = 'all';
  document.getElementById('issue-filter-date-preset').value = 'all';
  document.getElementById('custom-date-inputs').style.display = 'none';
  document.getElementById('issue-search-input').value = '';

  renderIssuesTab();
}

// Issue Visuals (Urgency, Result, Type charts)
function renderIssueCharts(filteredIssues) {
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';

  // 1. Urgency Donut
  const urgencyCanvas = document.getElementById('issue-urgency-chart');
  if (urgencyCanvas) {
    const high = filteredIssues.filter(i => (i.Urgency || '').toLowerCase() === 'high').length;
    const med = filteredIssues.filter(i => (i.Urgency || '').toLowerCase() === 'medium').length;
    const low = filteredIssues.filter(i => (i.Urgency || '').toLowerCase() === 'low').length;

    if (state.charts.issueUrgency) state.charts.issueUrgency.destroy();

    const ctx = urgencyCanvas.getContext('2d');
    state.charts.issueUrgency = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [`High (${high})`, `Medium (${med})`, `Low (${low})`],
        datasets: [{
          data: [high, med, low],
          backgroundColor: ['#EF4444', '#F59E0B', '#06B6D4'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: "'Plus Jakarta Sans', 'Prompt'", size: 11 }, boxWidth: 8 }
          }
        }
      }
    });
  }

  // 2. Result Breakdown Chart
  const resultCanvas = document.getElementById('issue-result-chart');
  if (resultCanvas) {
    const resultMap = {};
    filteredIssues.forEach(i => {
      const r = i.Result || 'Unspecified';
      resultMap[r] = (resultMap[r] || 0) + 1;
    });

    const labels = Object.keys(resultMap);
    const data = labels.map(l => resultMap[l]);

    if (state.charts.issueResult) state.charts.issueResult.destroy();

    const ctx = resultCanvas.getContext('2d');
    state.charts.issueResult = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l),
        datasets: [{
          label: 'จำนวน Issue',
          data: data,
          backgroundColor: '#3B82F6',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => labels[items[0].dataIndex]
            }
          }
        },
        scales: {
          x: {
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ticks: { color: textColor, font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 11 } }
          }
        }
      }
    });
  }
}

// Issue Detail Modal
function openIssueDetailModal(item) {
  const modal = document.getElementById('detail-modal');
  if (!modal || !item) return;

  document.getElementById('modal-title').textContent = `รายละเอียด Issue #${item.No} - ${item.Type || 'Issue'}`;
  
  const grid = document.getElementById('modal-grid');
  grid.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">วันที่แจ้ง (Date)</span>
      <div class="detail-value">${item.Date || '-'}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">ความเร่งด่วน (Urgency)</span>
      <div class="detail-value">${item.Urgency || '-'}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">สถานะ / ผลลัพธ์ (Result)</span>
      <div class="detail-value" style="font-weight:600;color:var(--status-pass)">${item.Result || '-'}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">ผู้แจ้ง (Reporter)</span>
      <div class="detail-value">${item.Name || '-'} (${item.UserLogin || 'No Login'})</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">เมนูหลัก (Main Menu)</span>
      <div class="detail-value">${item.MainMenu || '-'}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">เมนูย่อย (Menu)</span>
      <div class="detail-value">${item.Menu || '-'}</div>
    </div>
    <div class="detail-item full-width">
      <span class="detail-label">รายละเอียดปัญหาที่พบ (Problem Description)</span>
      <div class="detail-value" style="white-space:pre-wrap;line-height:1.6">${escapeHtml(item.Problem || '-')}</div>
    </div>
    <div class="detail-item full-width">
      <span class="detail-label">ข้อมูลที่ใช้ทดสอบ (Datatest)</span>
      <div class="detail-value" style="font-family:monospace;font-size:12px">${escapeHtml(item.Datatest || '-')}</div>
    </div>
    <div class="detail-item full-width">
      <span class="detail-label">OPS Comment / ข้อคิดเห็นทีมปฏิบัติการ</span>
      <div class="detail-value">${escapeHtml(item.OPSComment || '-')}</div>
    </div>
    <div class="detail-item full-width">
      <span class="detail-label">RIS Status & RIS Remark</span>
      <div class="detail-value">${escapeHtml(item.RISStatus || '-')} ${item.RISRemark ? '— ' + escapeHtml(item.RISRemark) : ''}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">Target Fix Date</span>
      <div class="detail-value">${item.TargetFixDate || '-'}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">Complete Status</span>
      <div class="detail-value">${item.CompleteStatus || '-'}</div>
    </div>
  `;

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 4. LIVE EXCEL FILE DRAG & DROP REFRESH
// ==========================================
function setupFileDropzone() {
  const dropzone = document.getElementById('sync-file-dropzone');
  const fileInput = document.getElementById('sync-file-input');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleUploadedExcelFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedExcelFile(e.target.files[0]);
    }
  });
}

function handleUploadedExcelFile(file) {
  if (!window.XLSX) {
    showToast('ระบบไม่พบไลบรารี SheetJS กรุณาตรวจสอบไฟล์ vendor/xlsx.full.min.js', 'danger');
    return;
  }

  showToast(`กำลังประมวลผลไฟล์: ${file.name}...`, 'info');

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      let parsedSomething = false;

      // Check if it's Update_Progess_Booking_UAT.xlsx
      if (workbook.Sheets['Booking Script Test #4'] || workbook.Sheets['summary#4']) {
        if (workbook.Sheets['Booking Script Test #4']) {
          const rawSheet = workbook.Sheets['Booking Script Test #4'];
          const jsonRows = XLSX.utils.sheet_to_json(rawSheet, { header: 1 });
          
          const scriptTests = [];
          for (let r = 1; r < jsonRows.length; r++) {
            const row = jsonRows[r];
            if (!row || (!row[0] && !row[4])) continue;
            scriptTests.push({
              No: `${row[0] || ''}`,
              Type: `${row[1] || ''}`,
              Function: `${row[2] || ''}`,
              FunctionCode: `${row[3] || ''}`,
              TestCase: `${row[4] || ''}`,
              Team: `${row[5] || ''}`,
              UATDate: `${row[6] || ''}`,
              TestDate: `${row[7] || ''}`,
              PassDate: `${row[8] || ''}`,
              Result: `${row[9] || ''}`,
              OPSRemark: `${row[10] || ''}`,
              RISRemark: `${row[11] || ''}`,
              Urgency: `${row[12] || ''}`,
              TargetFixDate: `${row[13] || ''}`
            });
          }
          if (scriptTests.length > 0) {
            state.data.BookingTests = scriptTests;
            parsedSomething = true;
          }
        }
      }

      // Check if it's Issue file
      if (workbook.Sheets['Data']) {
        const rawDataSheet = workbook.Sheets['Data'];
        const jsonRows = XLSX.utils.sheet_to_json(rawDataSheet, { header: 1 });
        
        const issues = [];
        for (let r = 1; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row || (!row[0] && !row[8])) continue;
          issues.push({
            No: `${row[0] || ''}`,
            Name: `${row[1] || ''}`,
            Date: `${row[3] || row[2] || ''}`,
            MainMenu: `${row[5] || ''}`,
            Menu: `${row[6] || ''}`,
            Problem: `${row[8] || ''}`,
            UserLogin: `${row[9] || ''}`,
            Datatest: `${row[10] || ''}`,
            Urgency: `${row[11] || ''}`.trim(),
            Type: `${row[12] || ''}`.trim(),
            Result: `${row[13] || ''}`.trim(),
            RefIssueNo: `${row[14] || ''}`,
            IssueGroup: `${row[16] || ''}`,
            CompleteStatus: `${row[17] || ''}`,
            OPSComment: `${row[18] || ''}`,
            Remark: `${row[20] || ''}`,
            RISStatus: `${row[21] || ''}`,
            RISRemark: `${row[27] || ''}`,
            TargetFixDate: `${row[28] || ''}`
          });
        }

        if (issues.length > 0) {
          state.data.Issues = issues;
          parsedSomething = true;
        }
      }

      if (parsedSomething) {
        state.data.GeneratedAt = new Date().toLocaleString('th-TH');
        initDashboard();
        showToast(`อัปเดตข้อมูลจาก ${file.name} สำเร็จเรียบร้อย!`, 'success');
      } else {
        showToast('ไม่พบชีตข้อมูลที่เข้ากันได้ (Booking Script Test #4, summary#4 หรือ Data)', 'warning');
      }

    } catch (err) {
      console.error(err);
      showToast(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`, 'danger');
    }
  };
  reader.readAsArrayBuffer(file);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconName = 'info';
  let iconColor = 'var(--accent-blue)';
  if (type === 'success') {
    iconName = 'check-circle';
    iconColor = 'var(--status-pass)';
  } else if (type === 'danger') {
    iconName = 'alert-triangle';
    iconColor = 'var(--status-danger)';
  } else if (type === 'warning') {
    iconName = 'alert-circle';
    iconColor = 'var(--status-warning)';
  }

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="color:${iconColor};width:18px;height:18px"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function exportToCSV(rows, filename) {
  if (!rows || rows.length === 0) {
    showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
    return;
  }

  const keys = Object.keys(rows[0]);
  const csvContent = [
    '\uFEFF' + keys.join(','), // UTF-8 BOM
    ...rows.map(row => keys.map(k => {
      let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
      cell = cell.replace(/"/g, '""');
      if (cell.search(/("|,|\n)/g) >= 0) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`ส่งออกไฟล์ ${filename} เรียบร้อยแล้ว`, 'success');
}
