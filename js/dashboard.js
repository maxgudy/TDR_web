// dashboard.js - Mòdul de visualització per al perfil directiu
(function () {
const DashboardState = {
    initialized: false,
    rawRows: [],
    filters: {
        curs: 'all',
        nivell: 'all',
        grup: 'all'
    },
    charts: {}
};

const DASHBOARD_SUBJECTS = [
    { key: 'nota_catala', label: 'Català' },
    { key: 'nota_castella', label: 'Castellà' },
    { key: 'nota_matematiques', label: 'Matemàtiques' },
    { key: 'nota_angles', label: 'Anglès' },
    { key: 'nota_socials', label: 'Socials' },
    { key: 'nota_naturals', label: 'Naturals' }
];

function initDashboard() {
    const statusEl = document.getElementById('directiusStatus');
    if (!statusEl) return;

    if (!DashboardState.initialized) {
        DashboardState.initialized = true;
        attachDashboardFilters();
    }
    loadDashboardData();
}

function attachDashboardFilters() {
    const cursSelect = document.getElementById('directiusFilterCurs');
    const nivellSelect = document.getElementById('directiusFilterNivell');
    const grupSelect = document.getElementById('directiusFilterGrup');

    if (cursSelect) {
        cursSelect.addEventListener('change', () => {
            DashboardState.filters.curs = cursSelect.value;
            renderDashboard();
        });
    }
    if (nivellSelect) {
        nivellSelect.addEventListener('change', () => {
            DashboardState.filters.nivell = nivellSelect.value;
            renderDashboard();
        });
    }
    if (grupSelect) {
        grupSelect.addEventListener('change', () => {
            DashboardState.filters.grup = grupSelect.value;
            renderDashboard();
        });
    }
}

async function loadDashboardData() {
    const statusEl = document.getElementById('directiusStatus');
    if (!statusEl) return;

    if (!window.supabaseClient) {
        statusEl.textContent = 'Supabase no està disponible. Torna-ho a provar en uns segons.';
        return;
    }

    statusEl.textContent = 'Carregant dades...';

    const { data, error } = await window.supabaseClient
        .from('DadesCentre')
        .select('id,curs_academic,nivell,grup,alumne_id,alumne_nom,trimestre,nota_catala,nota_castella,nota_matematiques,nota_angles,nota_socials,nota_naturals,created_at');

    if (error) {
        console.error('[Dashboard] Error carregant dades:', error);
        statusEl.textContent = `No s’han pogut carregar les dades (${error.message || 'error'}).`;
        return;
    }

    DashboardState.rawRows = Array.isArray(data) ? data : [];
    updateFilterOptions();
    renderDashboard();
}

function updateFilterOptions() {
    const cursSelect = document.getElementById('directiusFilterCurs');
    const nivellSelect = document.getElementById('directiusFilterNivell');
    const grupSelect = document.getElementById('directiusFilterGrup');

    if (!cursSelect || !nivellSelect || !grupSelect) return;

    updateSelectOptions(cursSelect, DashboardState.rawRows, 'curs_academic');
    updateSelectOptions(nivellSelect, DashboardState.rawRows, 'nivell');
    updateSelectOptions(grupSelect, DashboardState.rawRows, 'grup');
}

function updateSelectOptions(selectEl, rows, key) {
    const previousValue = selectEl.value;
    const options = Array.from(new Set(rows.map(row => row[key]).filter(Boolean))).sort();

    selectEl.innerHTML = '<option value="all">Tots</option>';
    options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        selectEl.appendChild(option);
    });

    if (options.includes(previousValue)) {
        selectEl.value = previousValue;
    }
}

function renderDashboard() {
    const filteredRows = filterRows(DashboardState.rawRows, DashboardState.filters);
    const metrics = buildDashboardMetrics(filteredRows);

    updateStats(metrics);
    renderSubjectAverages(metrics.subjectAverages);
    renderTrend(metrics.trimesterAverages);
    renderLevelComparison(metrics.levelAverages);
    renderInsights(metrics);
    updateStatus(metrics, filteredRows.length);
}

function filterRows(rows, filters) {
    return rows.filter(row => {
        if (filters.curs !== 'all' && row.curs_academic !== filters.curs) return false;
        if (filters.nivell !== 'all' && row.nivell !== filters.nivell) return false;
        if (filters.grup !== 'all' && row.grup !== filters.grup) return false;
        return true;
    });
}

function buildDashboardMetrics(rows) {
    const subjectTotals = {};
    DASHBOARD_SUBJECTS.forEach(subject => {
        subjectTotals[subject.key] = { sum: 0, count: 0 };
    });

    const studentTotals = new Map();
    const trimesterTotals = new Map();
    const levelTotals = new Map();
    const groupTotals = new Map();
    let lastUpdated = null;

    rows.forEach(row => {
        const rowAverage = getRowAverage(row);
        if (rowAverage !== null) {
            const studentKey = row.alumne_id || row.alumne_nom || row.id || `row-${row.trimestre}`;
            const studentEntry = studentTotals.get(studentKey) || { sum: 0, count: 0 };
            studentEntry.sum += rowAverage;
            studentEntry.count += 1;
            studentTotals.set(studentKey, studentEntry);

            if (row.trimestre !== null && row.trimestre !== undefined) {
                const trimesterKey = Number(row.trimestre);
                const trimesterEntry = trimesterTotals.get(trimesterKey) || { sum: 0, count: 0 };
                trimesterEntry.sum += rowAverage;
                trimesterEntry.count += 1;
                trimesterTotals.set(trimesterKey, trimesterEntry);
            }

            if (row.nivell) {
                const levelEntry = levelTotals.get(row.nivell) || { sum: 0, count: 0 };
                levelEntry.sum += rowAverage;
                levelEntry.count += 1;
                levelTotals.set(row.nivell, levelEntry);
            }

            if (row.grup) {
                const groupEntry = groupTotals.get(row.grup) || { sum: 0, count: 0 };
                groupEntry.sum += rowAverage;
                groupEntry.count += 1;
                groupTotals.set(row.grup, groupEntry);
            }
        }

        DASHBOARD_SUBJECTS.forEach(subject => {
            const value = parseNumeric(row[subject.key]);
            if (value !== null) {
                subjectTotals[subject.key].sum += value;
                subjectTotals[subject.key].count += 1;
            }
        });

        if (row.created_at) {
            const createdAt = new Date(row.created_at);
            if (!lastUpdated || createdAt > lastUpdated) {
                lastUpdated = createdAt;
            }
        }
    });

    const subjectAverages = DASHBOARD_SUBJECTS.map(subject => {
        const totals = subjectTotals[subject.key];
        return {
            label: subject.label,
            value: totals.count ? totals.sum / totals.count : null
        };
    });

    const trimesterAverages = Array.from(trimesterTotals.entries())
        .map(([trimester, totals]) => ({
            trimester,
            value: totals.count ? totals.sum / totals.count : null
        }))
        .sort((a, b) => a.trimester - b.trimester);

    const levelAverages = Array.from(levelTotals.entries())
        .map(([level, totals]) => ({
            label: level,
            value: totals.count ? totals.sum / totals.count : null
        }))
        .sort((a, b) => (b.value || 0) - (a.value || 0));

    const groupAverages = Array.from(groupTotals.entries())
        .map(([group, totals]) => ({
            label: group,
            value: totals.count ? totals.sum / totals.count : null
        }))
        .sort((a, b) => (b.value || 0) - (a.value || 0));

    const studentAverages = Array.from(studentTotals.values()).map(entry => entry.sum / entry.count);
    const totalStudents = studentAverages.length;
    const averageGlobal = totalStudents ? averageValues(studentAverages) : null;
    const passRate = totalStudents ? studentAverages.filter(avg => avg >= 5).length / totalStudents : null;

    const bestSubject = subjectAverages.reduce((best, current) => {
        if (current.value === null) return best;
        if (!best || current.value > best.value) return current;
        return best;
    }, null);

    const worstSubject = subjectAverages.reduce((worst, current) => {
        if (current.value === null) return worst;
        if (!worst || current.value < worst.value) return current;
        return worst;
    }, null);

    const trendValue = trimesterAverages.length >= 2
        ? (trimesterAverages[trimesterAverages.length - 1].value - trimesterAverages[trimesterAverages.length - 2].value)
        : null;

    return {
        totalStudents,
        averageGlobal,
        passRate,
        trendValue,
        subjectAverages,
        trimesterAverages,
        levelAverages,
        groupAverages,
        bestSubject,
        worstSubject,
        lastUpdated
    };
}

function updateStats(metrics) {
    setText('statTotalAlumnes', metrics.totalStudents ? metrics.totalStudents : '0');
    setText('statAverageGlobal', formatNumber(metrics.averageGlobal));
    setText('statPassRate', formatPercent(metrics.passRate));

    const trendEl = document.getElementById('statTrend');
    if (trendEl) {
        trendEl.classList.remove('trend-up', 'trend-down');
        if (metrics.trendValue === null || Number.isNaN(metrics.trendValue)) {
            trendEl.textContent = 'N/D';
        } else {
            const trendText = formatSigned(metrics.trendValue);
            trendEl.textContent = trendText;
            trendEl.classList.add(metrics.trendValue >= 0 ? 'trend-up' : 'trend-down');
        }
    }
}

function renderSubjectAverages(subjectAverages) {
    const canvas = document.getElementById('subjectAveragesCanvas');
    if (!canvas) return;

    if (!subjectAverages.length || subjectAverages.every(item => item.value === null)) {
        destroyChart('subject');
        showChartEmpty(canvas, "Sense dades d'assignatures.");
        return;
    }

    clearChartEmpty(canvas);
    const labels = subjectAverages.map(item => item.label);
    const values = subjectAverages.map(item => item.value || 0);
    const colors = getChartColors();

    renderChart('subject', canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Mitjana',
                data: values,
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentStrong,
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 36
            }]
        },
        options: buildChartOptions({ showLegend: false })
    });
}

function renderLevelComparison(levelAverages) {
    const canvas = document.getElementById('levelComparisonCanvas');
    if (!canvas) return;

    if (!levelAverages.length || levelAverages.every(item => item.value === null)) {
        destroyChart('level');
        showChartEmpty(canvas, 'Sense dades per nivell.');
        return;
    }

    clearChartEmpty(canvas);
    const trimmed = levelAverages.slice(0, 6);
    const labels = trimmed.map(item => item.label);
    const values = trimmed.map(item => item.value || 0);
    const colors = getChartColors();

    renderChart('level', canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Mitjana',
                data: values,
                backgroundColor: colors.secondarySoft,
                borderColor: colors.secondaryStrong,
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 32
            }]
        },
        options: buildChartOptions({ indexAxis: 'y', showLegend: false })
    });
}

function renderTrend(trimesterAverages) {
    const canvas = document.getElementById('trimesterTrendCanvas');
    if (!canvas) return;

    if (!trimesterAverages.length || trimesterAverages.every(item => item.value === null)) {
        destroyChart('trend');
        showChartEmpty(canvas, 'Sense dades de tendència.');
        return;
    }

    clearChartEmpty(canvas);
    const labels = trimesterAverages.map(item => `Trim. ${item.trimester}`);
    const values = trimesterAverages.map(item => item.value || 0);
    const colors = getChartColors();

    renderChart('trend', canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Mitjana',
                data: values,
                borderColor: colors.accentStrong,
                backgroundColor: colors.accentSoft,
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: colors.accentStrong,
                pointBorderColor: colors.background
            }]
        },
        options: buildChartOptions({ showLegend: false })
    });
}

function renderInsights(metrics) {
    const container = document.getElementById('dashboardSummary');
    if (!container) return;

    container.innerHTML = '';
    const insights = [];

    if (metrics.bestSubject) {
        insights.push(`Millor assignatura: ${metrics.bestSubject.label} (${formatNumber(metrics.bestSubject.value)})`);
    }

    if (metrics.worstSubject) {
        insights.push(`Assignatura a reforçar: ${metrics.worstSubject.label} (${formatNumber(metrics.worstSubject.value)})`);
    }

    if (metrics.levelAverages.length) {
        const bestLevel = metrics.levelAverages[0];
        insights.push(`Nivell amb millor mitjana: ${bestLevel.label} (${formatNumber(bestLevel.value)})`);
    }

    if (metrics.groupAverages.length) {
        const lowestGroup = metrics.groupAverages[metrics.groupAverages.length - 1];
        insights.push(`Grup amb mitjana més baixa: ${lowestGroup.label} (${formatNumber(lowestGroup.value)})`);
    }

    if (!insights.length) {
        insights.push('Encara no hi ha prou dades per generar resums.');
    }

    insights.forEach(text => {
        const item = document.createElement('div');
        item.className = 'summary-chip';
        item.textContent = text;
        container.appendChild(item);
    });
}

function updateStatus(metrics, rowCount) {
    const statusEl = document.getElementById('directiusStatus');
    if (!statusEl) return;

    if (!rowCount) {
        statusEl.textContent = 'Sense dades per als filtres seleccionats.';
        return;
    }

    const updatedText = metrics.lastUpdated ? `Dades actualitzades: ${formatDashboardDate(metrics.lastUpdated)}` : 'Dades carregades.';
    statusEl.textContent = `${updatedText} (${rowCount} registres)`;
}

function getRowAverage(row) {
    const values = DASHBOARD_SUBJECTS
        .map(subject => parseNumeric(row[subject.key]))
        .filter(value => value !== null);
    if (!values.length) return null;
    return averageValues(values);
}

function averageValues(values) {
    if (!values.length) return null;
    const sum = values.reduce((total, value) => total + value, 0);
    return sum / values.length;
}

function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/D';
    return value.toFixed(1).replace('.', ',');
}

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/D';
    return `${Math.round(value * 100)}%`;
}

function formatSigned(value) {
    const signed = value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
    return signed.replace('.', ',');
}

function formatDashboardDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseNumeric(value) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value.replace(',', '.'));
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderChart(key, canvas, config) {
    if (typeof Chart === 'undefined') {
        showChartEmpty(canvas, 'Chart.js no està disponible.');
        return;
    }

    destroyChart(key);
    DashboardState.charts[key] = new Chart(canvas, config);
}

function destroyChart(key) {
    if (DashboardState.charts[key]) {
        DashboardState.charts[key].destroy();
        DashboardState.charts[key] = null;
    }
}

function showChartEmpty(canvas, message) {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    clearChartEmpty(canvas);
    const note = document.createElement('div');
    note.className = 'chart-empty';
    note.textContent = message;
    wrapper.appendChild(note);
    canvas.style.display = 'none';
}

function clearChartEmpty(canvas) {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.querySelectorAll('.chart-empty').forEach(node => node.remove());
    canvas.style.display = 'block';
}

function getChartColors() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        accentStrong: isDark ? 'rgba(122, 180, 255, 0.9)' : 'rgba(0, 122, 204, 0.9)',
        accentSoft: isDark ? 'rgba(122, 180, 255, 0.25)' : 'rgba(0, 122, 204, 0.18)',
        secondaryStrong: isDark ? 'rgba(82, 210, 150, 0.9)' : 'rgba(60, 180, 120, 0.85)',
        secondarySoft: isDark ? 'rgba(82, 210, 150, 0.25)' : 'rgba(60, 180, 120, 0.18)',
        text: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 60, 0.8)',
        grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        background: isDark ? '#1a1a1a' : '#ffffff'
    };
}

function buildChartOptions({ indexAxis = 'x', showLegend = true } = {}) {
    const colors = getChartColors();
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis,
        plugins: {
            legend: {
                display: showLegend,
                labels: {
                    color: colors.text,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: colors.background,
                borderColor: colors.grid,
                borderWidth: 1,
                titleColor: colors.text,
                bodyColor: colors.text
            }
        },
        scales: {
            x: {
                ticks: {
                    color: colors.text,
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: colors.grid
                }
            },
            y: {
                beginAtZero: true,
                max: 10,
                ticks: {
                    color: colors.text,
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: colors.grid
                }
            }
        }
    };
}

// Exportar funcions per a tests locals si cal
window.initDashboard = initDashboard;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initDashboard };
}
})();
