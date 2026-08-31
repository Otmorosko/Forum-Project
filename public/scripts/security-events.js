import { monitorAuthState, getAuthToken } from './auth.js';

const tableBody = document.getElementById('eventsTableBody');
const statusMessage = document.getElementById('statusMessage');
const filtersForm = document.getElementById('filtersForm');
const limitInput = document.getElementById('limitInput');
const severityInput = document.getElementById('severityInput');
const eventTypeInput = document.getElementById('eventTypeInput');
const refreshBtn = document.getElementById('refreshBtn');

let isUserReady = false;

function safeText(value) {
    return value === null || value === undefined ? '' : String(value);
}

function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pl-PL');
}

function severityClassName(severity) {
    const s = safeText(severity).toLowerCase();
    if (s === 'warn') return 'severity-warn';
    if (s === 'error') return 'severity-error';
    return 'severity-info';
}

function createCell(text, className = '') {
    const td = document.createElement('td');
    td.textContent = safeText(text);
    if (className) td.className = className;
    return td;
}

function renderRows(events) {
    tableBody.innerHTML = '';

    if (!Array.isArray(events) || events.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 9;
        td.textContent = 'Brak zdarzeń dla wybranych filtrów.';
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    events.forEach((event) => {
        const tr = document.createElement('tr');

        tr.appendChild(createCell(formatDate(event.createdAt)));
        tr.appendChild(createCell(event.eventType));
        tr.appendChild(createCell(event.severity, severityClassName(event.severity)));
        tr.appendChild(createCell(event.method));
        tr.appendChild(createCell(event.route));
        tr.appendChild(createCell(event.uid || '-'));
        tr.appendChild(createCell(event.ip || '-'));
        tr.appendChild(createCell(event.message || '-'));

        const metaCell = createCell(JSON.stringify(event.meta || {}, null, 2), 'meta-cell');
        tr.appendChild(metaCell);

        tableBody.appendChild(tr);
    });
}

function buildQuery() {
    const limitValue = Number.parseInt(safeText(limitInput.value), 10);
    const limit = Number.isNaN(limitValue) ? 100 : Math.min(Math.max(limitValue, 1), 200);

    const params = new URLSearchParams();
    params.set('limit', String(limit));

    const severity = safeText(severityInput.value).trim();
    if (severity) params.set('severity', severity);

    const eventType = safeText(eventTypeInput.value).trim();
    if (eventType) params.set('eventType', eventType);

    return params.toString();
}

async function loadSecurityEvents() {
    if (!isUserReady) return;

    statusMessage.textContent = 'Ładowanie logów...';

    try {
        const token = await getAuthToken();
        if (!token) {
            statusMessage.textContent = 'Brak sesji użytkownika. Zaloguj się ponownie.';
            return;
        }

        const query = buildQuery();
        const response = await fetch(`/api/admin/security-events?${query}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.status === 403) {
            statusMessage.textContent = 'Brak uprawnień do podglądu logów bezpieczeństwa.';
            renderRows([]);
            return;
        }

        if (!response.ok) {
            statusMessage.textContent = `Błąd pobierania logów: HTTP ${response.status}`;
            renderRows([]);
            return;
        }

        const payload = await response.json();
        const events = Array.isArray(payload.events) ? payload.events : [];
        renderRows(events);
        statusMessage.textContent = `Załadowano ${events.length} zdarzeń.`;
    } catch (error) {
        console.error('Błąd pobierania logów bezpieczeństwa:', error);
        statusMessage.textContent = 'Nie udało się pobrać logów bezpieczeństwa.';
        renderRows([]);
    }
}

filtersForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loadSecurityEvents();
});

refreshBtn.addEventListener('click', () => {
    loadSecurityEvents();
});

monitorAuthState((user) => {
    if (!user) {
        statusMessage.textContent = 'Musisz być zalogowany, aby zobaczyć logi bezpieczeństwa.';
        renderRows([]);
        isUserReady = false;
        return;
    }

    isUserReady = true;
    loadSecurityEvents();
});
