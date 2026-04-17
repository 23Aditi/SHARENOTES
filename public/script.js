/* ===== Configuration ===== */
const API_BASE = 'https://sharenotes-k3oa.onrender.com/api/books';
const AUTH_BASE = 'https://sharenotes-k3oa.onrender.com/api/auth';

/* ===== Auth Token Management ===== */
function getAccessToken() { return localStorage.getItem('sn_access'); }
function getRefreshToken() { return localStorage.getItem('sn_refresh'); }
function setTokens(access, refresh) { localStorage.setItem('sn_access', access); localStorage.setItem('sn_refresh', refresh); }
function clearTokens() { localStorage.removeItem('sn_access'); localStorage.removeItem('sn_refresh'); }

let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
    const rt = getRefreshToken();
    if (!rt) throw new Error('No refresh token');
    const res = await fetch(`${AUTH_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Token refresh failed'); }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data;
}

async function authFetch(url, options = {}) {
    const token = getAccessToken();
    if (token) { options.headers = options.headers || {}; options.headers['Authorization'] = `Bearer ${token}`; }
    let response = await fetch(url, options);
    if (response.status === 401 && getRefreshToken()) {
        if (isRefreshing) {
            try { await refreshPromise; } catch { redirectToLogin(); throw new Error('Session expired'); }
            options.headers['Authorization'] = `Bearer ${getAccessToken()}`;
            return fetch(url, options);
        }
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
        try {
            await refreshPromise;
            options.headers['Authorization'] = `Bearer ${getAccessToken()}`;
            return fetch(url, options);
        } catch (err) { clearTokens(); redirectToLogin(); throw err; }
        finally { isRefreshing = false; refreshPromise = null; }
    }
    return response;
}

function redirectToLogin() { window.location.href = 'login.html'; }

/* ===== Auth Actions ===== */
async function checkAuth() {
    const access = getAccessToken();
    const refresh = getRefreshToken();
    if (!access || !refresh) { redirectToLogin(); return; }
    try {
        const res = await authFetch(`${AUTH_BASE}/me`);
        if (!res.ok) { redirectToLogin(); return; }
        const user = await res.json();
        state.currentUser = user;
        updateUserUI(user);
        setupAutoRefresh();
        fetchNotes();
    } catch (err) {
        if (!window.location.href.includes('login')) { console.error('Auth check failed:', err); redirectToLogin(); }
    }
}

async function handleLogout() {
    closeUserMenu();
    const rt = getRefreshToken();
    try {
        if (rt) {
            await fetch(`${AUTH_BASE}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt }),
            });
        }
    } catch (e) { /* best-effort */ }
    clearTokens();
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    window.location.href = 'login.html';
}

let autoRefreshTimer = null;
function setupAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(async () => {
        try { await refreshAccessToken(); } catch { clearTokens(); redirectToLogin(); }
    }, 13 * 60 * 1000);
}

/* ===== User UI ===== */
let userMenuOpen = false;

function updateUserUI(user) {
    if (!user) return;
    const initial = (user.name || '?').charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('dropdownName').textContent = user.name || 'User';
    document.getElementById('dropdownEmail').textContent = user.email || '';
    if (user.department) {
        const deptEl = document.getElementById('dropdownDept');
        if (deptEl) deptEl.textContent = user.department;
    }
}

function toggleUserMenu() {
    userMenuOpen = !userMenuOpen;
    const dd = document.getElementById('userDropdown');
    const chev = document.getElementById('userChevron');
    const btn = document.getElementById('userMenuBtn');
    if (userMenuOpen) {
        dd.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-1');
        dd.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        if (chev) chev.style.transform = 'rotate(180deg)';
        btn.setAttribute('aria-expanded', 'true');
    } else {
        dd.classList.add('opacity-0', 'pointer-events-none', 'translate-y-1');
        dd.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        if (chev) chev.style.transform = 'rotate(0deg)';
        btn.setAttribute('aria-expanded', 'false');
    }
}

function closeUserMenu() {
    if (!userMenuOpen) return;
    userMenuOpen = false;
    const dd = document.getElementById('userDropdown');
    const chev = document.getElementById('userChevron');
    const btn = document.getElementById('userMenuBtn');
    dd.classList.add('opacity-0', 'pointer-events-none', 'translate-y-1');
    dd.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
    if (chev) chev.style.transform = 'rotate(0deg)';
    btn.setAttribute('aria-expanded', 'false');
}

/* ===== File Type Definitions ===== */
const FILE_TYPES = {
    pdf:  { label: 'PDF',   icon: 'fa-file-pdf',        color: '#ef4444', category: 'pdf' },
    doc:  { label: 'DOC',   icon: 'fa-file-word',       color: '#3b82f6', category: 'docs' },
    docx: { label: 'DOCX',  icon: 'fa-file-word',       color: '#3b82f6', category: 'docs' },
    xls:  { label: 'XLS',   icon: 'fa-file-excel',      color: '#22c55e', category: 'docs' },
    xlsx: { label: 'XLSX',  icon: 'fa-file-excel',      color: '#22c55e', category: 'docs' },
    ppt:  { label: 'PPT',   icon: 'fa-file-powerpoint', color: '#f97316', category: 'docs' },
    pptx: { label: 'PPTX',  icon: 'fa-file-powerpoint', color: '#f97316', category: 'docs' },
    jpg:  { label: 'JPG',   icon: 'fa-file-image',      color: '#a855f7', category: 'images' },
    jpeg: { label: 'JPEG',  icon: 'fa-file-image',      color: '#a855f7', category: 'images' },
    png:  { label: 'PNG',   icon: 'fa-file-image',      color: '#a855f7', category: 'images' },
    gif:  { label: 'GIF',   icon: 'fa-file-image',      color: '#a855f7', category: 'images' },
    svg:  { label: 'SVG',   icon: 'fa-file-image',      color: '#a855f7', category: 'images' },
    webp: { label: 'WEBP',  icon: 'fa-file-image',      color: '#a855f7', category: 'images' },
    js:   { label: 'JS',    icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    ts:   { label: 'TS',    icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    py:   { label: 'PY',    icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    java: { label: 'JAVA',  icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    cpp:  { label: 'CPP',   icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    c:    { label: 'C',     icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    html: { label: 'HTML',  icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    css:  { label: 'CSS',   icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    json: { label: 'JSON',  icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    xml:  { label: 'XML',   icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    sql:  { label: 'SQL',   icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    rb:   { label: 'RB',    icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    go:   { label: 'GO',    icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    rs:   { label: 'RUST',  icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    php:  { label: 'PHP',   icon: 'fa-file-code',       color: '#14b8a6', category: 'code' },
    txt:  { label: 'TXT',   icon: 'fa-file-lines',      color: '#6b7280', category: 'other' },
    md:   { label: 'MD',    icon: 'fa-file-lines',      color: '#6b7280', category: 'other' },
    zip:  { label: 'ZIP',   icon: 'fa-file-zipper',     color: '#eab308', category: 'other' },
    rar:  { label: 'RAR',   icon: 'fa-file-zipper',     color: '#eab308', category: 'other' },
};
const DEFAULT_TYPE = { label: 'FILE', icon: 'fa-file', color: '#6b7280', category: 'other' };

const FILE_FILTERS = [
    { key: 'all',    label: 'All Notes',  icon: 'fa-layer-group' },
    { key: 'pdf',    label: 'PDF',        icon: 'fa-file-pdf' },
    { key: 'docs',   label: 'Documents',  icon: 'fa-file-word' },
    { key: 'code',   label: 'Code',       icon: 'fa-file-code' },
    { key: 'images', label: 'Images',     icon: 'fa-file-image' },
    { key: 'other',  label: 'Other',      icon: 'fa-file' },
];

const DEPARTMENTS = ['IT', 'EnTC', 'ECE', 'AIDS', 'CE', 'FY (COMMON)'];

/* ===== Application State ===== */
let state = {
    notes: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    searchQuery: '',
    filterType: 'all',         // file-type filter (client-side)
    deptFilter: '',            // department API filter
    yearFilter: '',            // year API filter
    semFilter: '',             // semester API filter
    limit: 12,
    isLoading: false,
    editingNote: null,
    deletingId: null,
    selectedFile: null,
    uploadXHR: null,
    currentUser: null,
    viewMode: 'all',           // 'all' | 'mine'
};

/* ===== Utility Functions ===== */
function getExtension(fileKey) {
    if (!fileKey) return '';
    const parts = fileKey.split('/');
    const name = parts[parts.length - 1];
    const dot = name.lastIndexOf('.');
    return dot !== -1 ? name.substring(dot + 1).toLowerCase() : '';
}

function getFileTypeInfo(fileKey) { return FILE_TYPES[getExtension(fileKey)] || DEFAULT_TYPE; }

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function debounce(fn, delay) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

/* ===== API Functions ===== */

async function fetchNotes() {
    state.isLoading = true;
    renderNotes();

    try {
        let url, params;
        if (state.viewMode === 'mine') {
            params = new URLSearchParams({ page: state.currentPage, limit: state.limit, search: state.searchQuery });
            url = `${API_BASE}/mine?${params}`;
        } else {
            params = new URLSearchParams({ page: state.currentPage, limit: state.limit, search: state.searchQuery });
            if (state.deptFilter) params.set('department', state.deptFilter);
            if (state.yearFilter) params.set('year', state.yearFilter);
            if (state.semFilter) params.set('semester', state.semFilter);
            url = `${API_BASE}?${params}`;
        }

        const res = await authFetch(url);
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        const data = await res.json();
        state.notes = data.data || [];
        state.totalPages = data.totalPages || 1;
        state.total = data.total || 0;
    } catch (err) {
        console.error('Fetch error:', err);
        if (err.message.includes('Failed to fetch')) showToast('Cannot connect to server. Is the backend running?', 'error');
        else showToast('Failed to load notes', 'error');
        state.notes = []; state.total = 0; state.totalPages = 1;
    } finally {
        state.isLoading = false;
        renderNotes();
        renderPagination();
        renderResultsInfo();
    }
}

async function getUploadUrl(name, type) {
    const res = await authFetch(`${API_BASE}/upload-url?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, { method: 'POST' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to get upload URL'); }
    return res.json();
}

function uploadFileToS3(url, file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        state.uploadXHR = xhr;
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('File upload failed')); };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
    });
}

async function saveNote(title, description, fileKey, year, department, subject, semester, unitName) {
    const res = await authFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, fileKey, year, department, subject, semester, unitName }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to save note'); }
    return res.json();
}

async function getDownloadUrl(id) {
    const res = await authFetch(`${API_BASE}/${id}/download-url`);
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to get download URL'); }
    return res.json();
}

async function deleteNote(id) {
    const res = await authFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to delete note'); }
    return res.json();
}

async function updateNote(id, title, description) {
    const res = await authFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to update note'); }
    return res.json();
}

async function reactToNote(id, type) {
    // type: 'like' | 'dislike'
    const res = await authFetch(`${API_BASE}/${id}/${type}`, { method: 'POST' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `Failed to ${type}`); }
    return res.json();
}

/* ===== Render Functions ===== */

function renderNotes() {
    const grid = document.getElementById('notesGrid');
    const empty = document.getElementById('emptyState');
    const isMyNotes = state.viewMode === 'mine';

    if (state.isLoading) {
        grid.innerHTML = Array.from({ length: 8 }, () => `
            <div class="note-card" style="animation:none">
                <div class="skeleton" style="height:3px"></div>
                <div class="p-4 flex-1 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <div class="skeleton" style="height:22px;width:60px;border-radius:6px"></div>
                        <div class="skeleton" style="height:14px;width:50px"></div>
                    </div>
                    <div class="skeleton" style="height:18px;width:85%"></div>
                    <div class="skeleton" style="height:14px;width:100%"></div>
                    <div class="skeleton" style="height:14px;width:60%"></div>
                    <div class="flex-1"></div>
                    <div class="flex gap-2">
                        <div class="skeleton" style="height:34px;width:34px;border-radius:8px"></div>
                        <div class="skeleton" style="height:34px;width:34px;border-radius:8px"></div>
                        <div class="skeleton" style="height:34px;width:34px;border-radius:8px"></div>
                    </div>
                </div>
            </div>
        `).join('');
        empty.classList.add('hidden');
        return;
    }

    let filtered = state.notes;
    if (state.filterType !== 'all') {
        filtered = state.notes.filter(n => getFileTypeInfo(n.fileKey).category === state.filterType);
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        const isSearching = state.searchQuery.trim() !== '';
        const isFiltering = state.filterType !== 'all';
        document.getElementById('emptyTitle').textContent = isSearching
            ? `No results for "${state.searchQuery}"`
            : isFiltering ? `No ${FILE_FILTERS.find(f => f.key === state.filterType)?.label || ''} notes found`
            : isMyNotes ? 'You haven\'t shared any notes yet' : 'No notes found';
        document.getElementById('emptyDesc').textContent = isSearching
            ? 'Try different keywords or clear the search'
            : isFiltering ? 'Try selecting a different category or search instead'
            : isMyNotes ? 'Upload your first note and help fellow students!' : 'Try adjusting your department or year filters.';
        document.getElementById('emptyAction').classList.toggle('hidden', isSearching || isFiltering);
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    const userId = state.currentUser?._id;

    grid.innerHTML = filtered.map((note, i) => {
        const ft = getFileTypeInfo(note.fileKey);
        const ext = getExtension(note.fileKey).toUpperCase() || 'FILE';
        const meta = [note.subject, note.department, note.semester ? `Sem ${note.semester}` : ''].filter(Boolean).join(' · ');

        const reaction = note.userReaction; // 'like' | 'dislike' | null
        const isLiked = reaction === 'like';
        const isDisliked = reaction === 'dislike';
        const likeCount = note.likeCount || 0;
        const dislikeCount = note.dislikeCount || 0;
        const downloadCount = note.downloadCount || 0;
        const isOwner = userId && note.userId && (note.userId === userId || note.userId?._id === userId || note.userId?.toString() === userId?.toString());

        return `
            <article class="note-card" style="animation-delay:${i * 0.05}s" id="card-${note._id}">
                <div class="card-accent-bar" style="background:${ft.color}"></div>
                <div class="p-4 flex-1 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                        <span class="file-badge" style="background:${ft.color}15;color:${ft.color}">
                            <i class="fa-solid ${ft.icon} text-[0.65rem]"></i>
                            ${ext}
                        </span>
                        <span class="text-xs" style="color:var(--muted)">${formatDate(note.createdAt)}</span>
                    </div>
                    <h3 class="font-display font-semibold text-sm leading-snug" style="color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(note.title)}</h3>
                    <p class="text-xs leading-relaxed" style="color:var(--text-sec);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(note.description)}</p>
                    ${meta ? `<p class="text-xs font-medium" style="color:var(--muted)">${escapeHtml(meta)}</p>` : ''}

                    <!-- Stats row -->
                    <div class="flex items-center gap-3 text-xs" style="color:var(--muted)">
                        <span title="Downloads"><i class="fa-solid fa-download mr-1"></i>${downloadCount}</span>
                        <span title="Likes"><i class="fa-solid fa-thumbs-up mr-1" style="color:${isLiked ? 'var(--accent)' : 'inherit'}"></i>${likeCount}</span>
                        <span title="Dislikes"><i class="fa-solid fa-thumbs-down mr-1" style="color:${isDisliked ? 'var(--danger)' : 'inherit'}"></i>${dislikeCount}</span>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex items-center gap-2 mt-auto pt-2" style="border-top:1px solid var(--border)">
                        <button class="card-action download" onclick="handleDownload('${note._id}')" title="Download" aria-label="Download note">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button
                            class="card-action like ${isLiked ? 'active-like' : ''}"
                            id="like-btn-${note._id}"
                            onclick="handleReact('${note._id}', 'like')"
                            title="${isLiked ? 'Unlike' : 'Like'}"
                            aria-label="${isLiked ? 'Unlike' : 'Like'} note"
                            style="${isLiked ? 'color:var(--accent);background:var(--accent-dim)' : ''}"
                        >
                            <i class="fa-solid fa-thumbs-up"></i>
                        </button>
                        <button
                            class="card-action dislike ${isDisliked ? 'active-dislike' : ''}"
                            id="dislike-btn-${note._id}"
                            onclick="handleReact('${note._id}', 'dislike')"
                            title="${isDisliked ? 'Remove dislike' : 'Dislike'}"
                            aria-label="${isDisliked ? 'Remove dislike' : 'Dislike'} note"
                            style="${isDisliked ? 'color:var(--danger);background:var(--danger-dim)' : ''}"
                        >
                            <i class="fa-solid fa-thumbs-down"></i>
                        </button>
                        ${isOwner ? `
                        <button class="card-action edit" onclick="openEditModal('${note._id}')" title="Edit" aria-label="Edit note">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="card-action delete" onclick="openDeleteModal('${note._id}')" title="Delete" aria-label="Delete note">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderPagination() {
    const container = document.getElementById('pagination');
    if (state.totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '';
    html += `<button class="page-btn" onclick="changePage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled' : ''} aria-label="Previous page"><i class="fa-solid fa-chevron-left text-xs"></i></button>`;
    const pages = generatePageNumbers(state.currentPage, state.totalPages);
    pages.forEach(p => {
        if (p === '...') html += `<span class="px-1 text-sm" style="color:var(--muted)">...</span>`;
        else html += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="changePage(${p})">${p}</button>`;
    });
    html += `<button class="page-btn" onclick="changePage(${state.currentPage + 1})" ${state.currentPage === state.totalPages ? 'disabled' : ''} aria-label="Next page"><i class="fa-solid fa-chevron-right text-xs"></i></button>`;
    container.innerHTML = html;
}

function generatePageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current <= 3) pages.push(1, 2, 3, 4, '...', total);
    else if (current >= total - 2) pages.push(1, '...', total - 3, total - 2, total - 1, total);
    else pages.push(1, '...', current - 1, current, current + 1, '...', total);
    return pages;
}

function renderFileFilters() {
    document.getElementById('fileFilterBar').innerHTML = FILE_FILTERS.map(f => `
        <button class="filter-tab ${state.filterType === f.key ? 'active' : ''}" onclick="setFileFilter('${f.key}')">
            <i class="fa-solid ${f.icon} mr-1.5 text-xs"></i>${f.label}
        </button>
    `).join('');
}

function renderDeptFilters() {
    const bar = document.getElementById('deptFilterBar');
    if (!bar) return;
    // Hide dept filter in "My Notes" mode (show all departments)
    if (state.viewMode === 'mine') { bar.innerHTML = ''; return; }

    const depts = ['', ...DEPARTMENTS];
    bar.innerHTML = depts.map(d => {
        const label = d || 'My Dept';
        const isActive = state.deptFilter === d;
        return `<button class="filter-tab ${isActive ? 'active' : ''}" onclick="setDeptFilter('${d}')">${escapeHtml(label)}</button>`;
    }).join('');
}

function renderViewToggle() {
    const myBtn = document.getElementById('myNotesBtn');
    const allBtn = document.getElementById('allNotesBtn');
    if (!myBtn || !allBtn) return;
    if (state.viewMode === 'mine') {
        myBtn.classList.add('active');
        allBtn.classList.remove('active');
    } else {
        allBtn.classList.add('active');
        myBtn.classList.remove('active');
    }
}

function renderResultsInfo() {
    const el = document.getElementById('resultsInfo');
    if (state.isLoading) { el.textContent = 'Loading...'; return; }
    if (state.total === 0) { el.textContent = ''; return; }
    const filteredCount = state.filterType !== 'all'
        ? state.notes.filter(n => getFileTypeInfo(n.fileKey).category === state.filterType).length
        : state.notes.length;
    const filterLabel = state.filterType !== 'all' ? ` matching ${FILE_FILTERS.find(f => f.key === state.filterType)?.label || ''} filter` : '';
    const modeLabel = state.viewMode === 'mine' ? 'your ' : '';
    el.textContent = `Showing ${filteredCount} of ${state.total} ${modeLabel}note${state.total !== 1 ? 's' : ''}${filterLabel}`;
}

/* ===== Toast Notifications ===== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('removing'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
}

/* ===== Modal Controls ===== */
function openUploadModal() { resetUploadForm(); document.getElementById('uploadModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeUploadModal() {
    if (state.uploadXHR) { state.uploadXHR.abort(); state.uploadXHR = null; }
    document.getElementById('uploadModal').classList.remove('active'); document.body.style.overflow = ''; resetUploadForm();
}
function resetUploadForm() {
    state.selectedFile = null;
    ['fileInput','uploadTitle','uploadDesc','uploadSubject','uploadUnit'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['uploadYear','uploadSemester','uploadDept'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('dropZone').classList.remove('has-file');
    document.getElementById('dropContent').classList.remove('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('uploadPercent').textContent = '0%';
    document.getElementById('uploadSubmitBtn').disabled = true;
    document.getElementById('uploadCancelBtn').textContent = 'Cancel';
}
function openEditModal(id) {
    const note = state.notes.find(n => n._id === id);
    if (!note) return;
    state.editingNote = note;
    document.getElementById('editTitle').value = note.title;
    document.getElementById('editDesc').value = note.description;
    document.getElementById('editModal').classList.add('active'); document.body.style.overflow = 'hidden';
}
function closeEditModal() { document.getElementById('editModal').classList.remove('active'); document.body.style.overflow = ''; state.editingNote = null; }
function openDeleteModal(id) { state.deletingId = id; document.getElementById('deleteModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeDeleteModal() { document.getElementById('deleteModal').classList.remove('active'); document.body.style.overflow = ''; state.deletingId = null; }

/* ===== Event Handlers ===== */

const debouncedSearch = debounce(() => { state.currentPage = 1; fetchNotes(); }, 350);
function handleSearchInput(e) { state.searchQuery = e.target.value; debouncedSearch(); }

function setFileFilter(type) { state.filterType = type; renderFileFilters(); renderNotes(); renderResultsInfo(); }

function setDeptFilter(dept) {
    state.deptFilter = dept;
    state.currentPage = 1;
    renderDeptFilters();
    fetchNotes();
}

function setViewMode(mode) {
    if (state.viewMode === mode) return;
    state.viewMode = mode;
    state.currentPage = 1;
    state.searchQuery = '';
    document.getElementById('searchInput').value = '';
    // Reset API filters when switching modes
    if (mode === 'mine') { state.deptFilter = ''; state.yearFilter = ''; state.semFilter = ''; }
    renderViewToggle();
    renderDeptFilters();
    fetchNotes();
    closeUserMenu();
}

function changePage(page) {
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    fetchNotes();
    window.scrollTo({ top: 300, behavior: 'smooth' });
}

async function handleUpload() {
    const file = state.selectedFile;
    const title = document.getElementById('uploadTitle').value.trim();
    const desc = document.getElementById('uploadDesc').value.trim();
    const year = document.getElementById('uploadYear').value;
    const semester = document.getElementById('uploadSemester').value;
    const department = document.getElementById('uploadDept').value;
    const subject = document.getElementById('uploadSubject').value.trim();
    const unitName = document.getElementById('uploadUnit').value.trim();

    if (!file || !title || !desc || !year || !semester || !department || !subject || !unitName) {
        showToast('Please fill in all fields and select a file', 'error');
        return;
    }

    const submitBtn = document.getElementById('uploadSubmitBtn');
    const cancelBtn = document.getElementById('uploadCancelBtn');
    const progressWrap = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const percentEl = document.getElementById('uploadPercent');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2 text-xs"></i>Uploading...';
    cancelBtn.textContent = 'Abort';
    progressWrap.classList.remove('hidden');

    try {
        showToast('Preparing upload...', 'info');
        const { url, fileKey } = await getUploadUrl(file.name, file.type || 'application/octet-stream');
        await uploadFileToS3(url, file, (percent) => { progressFill.style.width = percent + '%'; percentEl.textContent = percent + '%'; });
        progressFill.style.width = '100%'; percentEl.textContent = 'Saving...';
        await saveNote(title, desc, fileKey, year, department, subject, Number(semester), unitName);
        showToast('Note shared successfully!', 'success');
        closeUploadModal();
        state.currentPage = 1;
        fetchNotes();
    } catch (err) {
        if (err.name === 'AbortError') showToast('Upload cancelled', 'info');
        else { console.error('Upload error:', err); showToast(err.message || 'Upload failed. Please try again.', 'error'); }
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket mr-2 text-xs"></i>Upload';
        cancelBtn.textContent = 'Cancel';
    } finally { state.uploadXHR = null; }
}

async function handleDownload(id) {
    try {
        showToast('Generating download link...', 'info');
        const { url } = await getDownloadUrl(id);
        // Update download count optimistically in state
        const note = state.notes.find(n => n._id === id);
        if (note) {
            note.downloadCount = (note.downloadCount || 0) + 1;
            // Re-render just the stats row if possible; full re-render is fine too
        }
        window.open(url, '_blank');
    } catch (err) { console.error('Download error:', err); showToast(err.message || 'Failed to download', 'error'); }
}

async function handleReact(id, type) {
    // Optimistic UI update
    const note = state.notes.find(n => n._id === id);
    if (!note) return;

    const prevReaction = note.userReaction;
    const prevLike = note.likeCount || 0;
    const prevDislike = note.dislikeCount || 0;

    // Calculate optimistic new state
    if (prevReaction === type) {
        // Undo reaction
        note.userReaction = null;
        if (type === 'like') note.likeCount = Math.max(0, prevLike - 1);
        else note.dislikeCount = Math.max(0, prevDislike - 1);
    } else if (prevReaction && prevReaction !== type) {
        // Switch reaction
        note.userReaction = type;
        if (type === 'like') { note.likeCount = prevLike + 1; note.dislikeCount = Math.max(0, prevDislike - 1); }
        else { note.dislikeCount = prevDislike + 1; note.likeCount = Math.max(0, prevLike - 1); }
    } else {
        // New reaction
        note.userReaction = type;
        if (type === 'like') note.likeCount = prevLike + 1;
        else note.dislikeCount = prevDislike + 1;
    }

    renderNotes(); // optimistic render

    try {
        await reactToNote(id, type);
        // Server is source of truth — re-fetch to sync counts
        // (We don't re-fetch to avoid flicker; optimistic is accurate per server logic)
    } catch (err) {
        // Rollback on error
        note.userReaction = prevReaction;
        note.likeCount = prevLike;
        note.dislikeCount = prevDislike;
        renderNotes();
        console.error('React error:', err);
        showToast(err.message || `Failed to ${type}`, 'error');
    }
}

async function handleEdit() {
    if (!state.editingNote) return;
    const title = document.getElementById('editTitle').value.trim();
    const desc = document.getElementById('editDesc').value.trim();
    if (!title && !desc) { showToast('No changes to save', 'info'); return; }
    try {
        await updateNote(state.editingNote._id, title, desc);
        showToast('Note updated successfully', 'success');
        closeEditModal();
        fetchNotes();
    } catch (err) { console.error('Edit error:', err); showToast(err.message || 'Failed to update note', 'error'); }
}

async function handleDelete() {
    if (!state.deletingId) return;
    try {
        await deleteNote(state.deletingId);
        showToast('Note deleted', 'success');
        closeDeleteModal();
        fetchNotes();
    } catch (err) { console.error('Delete error:', err); showToast(err.message || 'Failed to delete note', 'error'); }
}

function resetToHome() {
    state.searchQuery = ''; state.filterType = 'all'; state.currentPage = 1;
    state.deptFilter = ''; state.yearFilter = ''; state.semFilter = '';
    state.viewMode = 'all';
    document.getElementById('searchInput').value = '';
    renderFileFilters();
    renderDeptFilters();
    renderViewToggle();
    fetchNotes();
    window.scrollTo({ top: 0 });
}

/* ===== Initialization ===== */
function init() {
    // Animated hero title
    const title = 'SHARENOTES';
    document.getElementById('heroTitle').innerHTML = title.split('').map((ch, i) =>
        `<span class="hero-letter" style="animation-delay:${0.1 + i * 0.05}s;color:${i < 4 ? 'var(--accent)' : 'var(--text)'}">${ch}</span>`
    ).join('');

    renderFileFilters();
    renderDeptFilters();
    renderViewToggle();

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearchInput);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !isInputFocused()) { e.preventDefault(); document.getElementById('searchInput').focus(); }
        if (e.key === 'Escape') { closeUploadModal(); closeEditModal(); closeDeleteModal(); closeUserMenu(); document.getElementById('searchInput').blur(); }
    });

    // File drop zone
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) selectFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) selectFile(fileInput.files[0]); });

    // Upload form validation
    ['uploadTitle','uploadDesc','uploadSubject','uploadUnit'].forEach(id => document.getElementById(id).addEventListener('input', validateUploadForm));
    ['uploadYear','uploadSemester','uploadDept'].forEach(id => document.getElementById(id).addEventListener('change', validateUploadForm));

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; resetUploadForm(); }
        });
    });

    // Close user menu on outside click
    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('userMenuWrap');
        if (wrap && !wrap.contains(e.target)) closeUserMenu();
    });

    // Back to top
    const btt = document.getElementById('backToTop');
    window.addEventListener('scroll', () => { btt.classList.toggle('visible', window.scrollY > 400); }, { passive: true });

    // Auth check
    checkAuth();
}

function isInputFocused() {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function selectFile(file) {
    state.selectedFile = file;
    const ft = getFileTypeInfo(file.name);
    const ext = getExtension(file.name).toUpperCase() || 'FILE';
    document.getElementById('dropZone').classList.add('has-file');
    document.getElementById('dropContent').classList.add('hidden');
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('fileName').innerHTML = `<i class="fa-solid ${ft.icon} mr-1.5" style="color:${ft.color}"></i>${escapeHtml(file.name)}`;
    document.getElementById('fileMeta').textContent = `${ext} file — ${formatSize(file.size)}`;
    validateUploadForm();
}

function validateUploadForm() {
    const file = state.selectedFile;
    const title = document.getElementById('uploadTitle').value.trim();
    const desc = document.getElementById('uploadDesc').value.trim();
    const year = document.getElementById('uploadYear').value;
    const semester = document.getElementById('uploadSemester').value;
    const department = document.getElementById('uploadDept').value;
    const subject = document.getElementById('uploadSubject').value.trim();
    const unitName = document.getElementById('uploadUnit').value.trim();
    document.getElementById('uploadSubmitBtn').disabled = !(file && title && desc && year && semester && department && subject && unitName);
}

document.addEventListener('DOMContentLoaded', init);