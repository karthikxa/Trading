/**
 * TradingView HAR Assets & Components Hub
 * Displays all 726 requests, 274 CSS bundles, 695 unique SVGs, and 183 WebSocket frames
 */

document.addEventListener('DOMContentLoaded', () => {
  const hubBtn = document.getElementById('tvHarHubBtn');
  const ribbonHubBtn = document.getElementById('ribbonHarHubBtn');
  const modalBackdrop = document.getElementById('tvHubModalBackdrop');
  const closeBtn = document.getElementById('tvHubModalClose');

  if (!modalBackdrop) return;

  // Open modal
  const openHub = () => {
    modalBackdrop.style.display = 'flex';
    loadTabContent(currentTab);
  };

  const closeHub = () => {
    modalBackdrop.style.display = 'none';
  };

  if (hubBtn) hubBtn.addEventListener('click', openHub);
  if (ribbonHubBtn) ribbonHubBtn.addEventListener('click', openHub);
  if (closeBtn) closeBtn.addEventListener('click', closeHub);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeHub();
  });

  // Tab switching
  let currentTab = 'drawings';
  const tabButtons = document.querySelectorAll('.tv-hub-tab-btn');
  const tabPanes = document.querySelectorAll('.tv-hub-tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      currentTab = tabId;
      const targetPane = document.getElementById(`tvHubTab_${tabId}`);
      if (targetPane) targetPane.classList.add('active');
      loadTabContent(tabId);
    });
  });

  // Data Caches
  let cachedDrawings = null;
  let cachedLogos = null;
  let cachedSvgs = null;
  let cachedCss = null;
  let cachedRequests = null;
  let cachedWs = null;

  function loadTabContent(tab) {
    if (tab === 'drawings' && !cachedDrawings) fetchDrawings();
    if (tab === 'logos' && !cachedLogos) fetchLogos();
    if (tab === 'svgs' && !cachedSvgs) fetchSvgs();
    if (tab === 'css' && !cachedCss) fetchCss();
    if (tab === 'network' && !cachedRequests) fetchRequests();
    if (tab === 'ws' && !cachedWs) fetchWs();
  }

  // ── Tab 0: Official Drawing Tools (91) ──
  async function fetchDrawings() {
    const grid = document.getElementById('tvHubDrawingsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="tv-hub-loading">Loading 91 TradingView Drawing Tools...</div>';

    try {
      const res = await fetch('/api/tv/drawing-icons');
      cachedDrawings = await res.json();
      renderDrawings(cachedDrawings);
    } catch (e) {
      grid.innerHTML = `<div class="tv-hub-error">Failed to load drawing icons: ${e.message}</div>`;
    }
  }

  function renderDrawings(iconsMap) {
    const grid = document.getElementById('tvHubDrawingsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const entries = Object.entries(iconsMap || {});
    if (entries.length === 0) {
      grid.innerHTML = '<div class="tv-hub-empty">No drawing tools found.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach(([name, svgCode]) => {
      const card = document.createElement('div');
      card.className = 'tv-svg-card';
      card.title = name;

      card.innerHTML = `
        <div class="tv-svg-preview-wrap" style="color:#2962ff;">
          ${svgCode}
        </div>
        <div class="tv-svg-card-info">
          <span class="tv-svg-name">${name.replace('LineTool', '')}</span>
          <span class="tv-svg-badge">Vector</span>
        </div>
      `;

      card.addEventListener('click', () => {
        showCustomSvgPreview(name, svgCode);
      });
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);

    const countLabel = document.getElementById('tvDrawingsCountLabel');
    if (countLabel) countLabel.textContent = `Showing all ${entries.length} official drawing tools`;
  }

  const drawingsSearch = document.getElementById('tvDrawingsSearchInput');
  if (drawingsSearch) {
    drawingsSearch.addEventListener('input', (e) => {
      if (!cachedDrawings) return;
      const q = e.target.value.toLowerCase().trim();
      const filtered = {};
      Object.entries(cachedDrawings).forEach(([k, v]) => {
        if (k.toLowerCase().includes(q)) filtered[k] = v;
      });
      renderDrawings(filtered);
    });
  }

  // ── Tab 0.5: Official Logos (174) ──
  async function fetchLogos() {
    const grid = document.getElementById('tvHubLogosGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="tv-hub-loading">Loading 174 Official Stock & Index Logos...</div>';

    try {
      const res = await fetch('/api/tv/logos-catalog');
      cachedLogos = await res.json();
      renderLogos(cachedLogos);
    } catch (e) {
      grid.innerHTML = `<div class="tv-hub-error">Failed to load logos: ${e.message}</div>`;
    }
  }

  function renderLogos(catalog) {
    const grid = document.getElementById('tvHubLogosGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const entries = Object.entries(catalog || {});
    if (entries.length === 0) {
      grid.innerHTML = '<div class="tv-hub-empty">No logos found.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach(([path, info]) => {
      const card = document.createElement('div');
      card.className = 'tv-svg-card';
      const cleanName = info.filename.replace('.svg', '').replace(/_/g, ' ').replace('indices ', '').replace('source ', '');
      card.title = cleanName;

      card.innerHTML = `
        <div class="tv-svg-preview-wrap" style="background:#f8f9fd;">
          <img src="/static/tv_logos/${info.filename}" class="tv-svg-img" alt="${cleanName}" loading="lazy" />
        </div>
        <div class="tv-svg-card-info">
          <span class="tv-svg-name">${cleanName}</span>
          <span class="tv-svg-badge">${(info.size / 1024).toFixed(1)}k</span>
        </div>
      `;

      card.addEventListener('click', () => {
        showLogoPreview(cleanName, `/static/tv_logos/${info.filename}`);
      });
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);

    const countLabel = document.getElementById('tvLogosCountLabel');
    if (countLabel) countLabel.textContent = `Showing all ${entries.length} official vector logos`;
  }

  const logosSearch = document.getElementById('tvLogosSearchInput');
  if (logosSearch) {
    logosSearch.addEventListener('input', (e) => {
      if (!cachedLogos) return;
      const q = e.target.value.toLowerCase().trim();
      const filtered = {};
      Object.entries(cachedLogos).forEach(([k, v]) => {
        if (k.toLowerCase().includes(q) || v.filename.toLowerCase().includes(q)) filtered[k] = v;
      });
      renderLogos(filtered);
    });
  }

  function showCustomSvgPreview(title, svgCode) {
    const modal = document.getElementById('tvSvgPreviewModal');
    const titleEl = document.getElementById('tvSvgPreviewTitle');
    const codeEl = document.getElementById('tvSvgCodeView');
    const imgEl = document.getElementById('tvSvgLargeImg');
    const copyBtn = document.getElementById('tvSvgCopyBtn');
    if (!modal) return;

    if (titleEl) titleEl.textContent = title;
    if (codeEl) codeEl.textContent = svgCode;
    if (imgEl) {
      imgEl.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(svgCode);
        copyBtn.textContent = 'Copied to Clipboard!';
        setTimeout(() => { copyBtn.textContent = 'Copy SVG Code'; }, 1500);
      };
    }

    modal.style.display = 'flex';
  }

  function showLogoPreview(title, imgUrl) {
    const modal = document.getElementById('tvSvgPreviewModal');
    const titleEl = document.getElementById('tvSvgPreviewTitle');
    const codeEl = document.getElementById('tvSvgCodeView');
    const imgEl = document.getElementById('tvSvgLargeImg');
    const copyBtn = document.getElementById('tvSvgCopyBtn');
    if (!modal) return;

    if (titleEl) titleEl.textContent = title;
    if (imgEl) imgEl.src = imgUrl;

    fetch(imgUrl).then(r => r.text()).then(code => {
      if (codeEl) codeEl.textContent = code;
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(code);
          copyBtn.textContent = 'Copied to Clipboard!';
          setTimeout(() => { copyBtn.textContent = 'Copy SVG Code'; }, 1500);
        };
      }
    });

    modal.style.display = 'flex';
  }

  // ── Tab 1: SVGs (695) ──
  async function fetchSvgs() {
    const grid = document.getElementById('tvHubSvgGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="tv-hub-loading">Loading 695 TradingView Vector SVGs...</div>';

    try {
      const res = await fetch('/api/tv/svg-catalog');
      cachedSvgs = await res.json();
      renderSvgs(cachedSvgs);
    } catch (e) {
      grid.innerHTML = `<div class="tv-hub-error">Failed to load SVGs: ${e.message}</div>`;
    }
  }

  function renderSvgs(items) {
    const grid = document.getElementById('tvHubSvgGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!items || items.length === 0) {
      grid.innerHTML = '<div class="tv-hub-empty">No SVGs matched your search.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    items.slice(0, 300).forEach(item => {
      const card = document.createElement('div');
      card.className = 'tv-svg-card';
      card.title = `${item.filename} (${item.width}×${item.height})`;

      card.innerHTML = `
        <div class="tv-svg-preview-wrap">
          <img src="/static/tv_icons/${item.filename}" class="tv-svg-img" alt="${item.filename}" loading="lazy" />
        </div>
        <div class="tv-svg-card-info">
          <span class="tv-svg-name">${item.filename.replace('.svg', '').replace(/_/g, ' ')}</span>
          <span class="tv-svg-badge">${item.width}×${item.height}</span>
        </div>
      `;

      card.addEventListener('click', () => showSvgPreview(item));
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);

    const countLabel = document.getElementById('tvSvgCountLabel');
    if (countLabel) countLabel.textContent = `Showing ${Math.min(300, items.length)} of ${items.length} SVGs`;
  }

  // Filter SVGs
  const svgSearch = document.getElementById('tvSvgSearchInput');
  const svgCatFilters = document.querySelectorAll('.tv-svg-cat-pill');

  let activeCat = 'all';

  if (svgSearch) {
    svgSearch.addEventListener('input', (e) => {
      filterSvgs(e.target.value, activeCat);
    });
  }

  svgCatFilters.forEach(pill => {
    pill.addEventListener('click', () => {
      svgCatFilters.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCat = pill.getAttribute('data-cat');
      filterSvgs(svgSearch ? svgSearch.value : '', activeCat);
    });
  });

  function filterSvgs(query, cat) {
    if (!cachedSvgs) return;
    const q = (query || '').toLowerCase().trim();
    const filtered = cachedSvgs.filter(item => {
      const matchCat = cat === 'all' || item.category === cat;
      const matchQ = !q || item.filename.toLowerCase().includes(q) || (item.raw_file && item.raw_file.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
    renderSvgs(filtered);
  }

  function showSvgPreview(item) {
    fetch(`/api/tv/svg/${item.filename}`)
      .then(r => r.text())
      .then(code => {
        const previewModal = document.getElementById('tvSvgPreviewModal');
        const codeEl = document.getElementById('tvSvgCodeView');
        const imgEl = document.getElementById('tvSvgLargeImg');
        const titleEl = document.getElementById('tvSvgPreviewTitle');

        if (titleEl) titleEl.textContent = `${item.filename} (${item.width}×${item.height})`;
        if (imgEl) imgEl.src = `/static/tv_icons/${item.filename}`;
        if (codeEl) codeEl.textContent = code;
        if (previewModal) previewModal.style.display = 'flex';
      });
  }

  const closePreviewBtn = document.getElementById('tvSvgPreviewClose');
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', () => {
      document.getElementById('tvSvgPreviewModal').style.display = 'none';
    });
  }

  const copyCodeBtn = document.getElementById('tvSvgCopyBtn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const codeEl = document.getElementById('tvSvgCodeView');
      if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          copyCodeBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyCodeBtn.textContent = 'Copy SVG Code'; }, 1500);
        });
      }
    });
  }

  // ── Tab 2: CSS Bundles (274) ──
  async function fetchCss() {
    const list = document.getElementById('tvHubCssList');
    if (!list) return;
    list.innerHTML = '<div class="tv-hub-loading">Loading 274 CSS Bundles...</div>';

    try {
      const res = await fetch('/api/tv/css-bundles');
      cachedCss = await res.json();
      renderCss(cachedCss);
    } catch (e) {
      list.innerHTML = `<div class="tv-hub-error">Failed to load CSS bundles: ${e.message}</div>`;
    }
  }

  function renderCss(items) {
    const list = document.getElementById('tvHubCssList');
    if (!list) return;
    list.innerHTML = '';

    if (!items || items.length === 0) {
      list.innerHTML = '<div class="tv-hub-empty">No CSS bundles matched.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'tv-hub-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Bundle File</th>
          <th>Size</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td style="color:#787b86;font-size:11px;">${idx + 1}</td>
            <td style="font-weight:600;color:#131722;font-family:monospace;">${it.filename}</td>
            <td><span class="tv-size-pill">${(it.size / 1024).toFixed(1)} KB</span></td>
            <td><a href="${it.url}" target="_blank" class="tv-view-btn">View CSS</a></td>
          </tr>
        `).join('')}
      </tbody>
    `;
    list.appendChild(table);

    const countLabel = document.getElementById('tvCssCountLabel');
    if (countLabel) countLabel.textContent = `${items.length} CSS Bundles (Total: ${(items.reduce((a,b)=>a+b.size,0)/1024).toFixed(1)} KB)`;
  }

  const cssSearch = document.getElementById('tvCssSearchInput');
  if (cssSearch) {
    cssSearch.addEventListener('input', (e) => {
      if (!cachedCss) return;
      const q = e.target.value.toLowerCase().trim();
      const filtered = cachedCss.filter(x => x.filename.toLowerCase().includes(q));
      renderCss(filtered);
    });
  }

  // ── Tab 3: Network HAR (726) ──
  async function fetchRequests() {
    const list = document.getElementById('tvHubNetworkList');
    if (!list) return;
    list.innerHTML = '<div class="tv-hub-loading">Loading 726 Network Requests...</div>';

    try {
      const res = await fetch('/api/tv/requests?limit=726');
      const data = await res.json();
      cachedRequests = data.items || [];
      renderRequests(cachedRequests);
    } catch (e) {
      list.innerHTML = `<div class="tv-hub-error">Failed to load HAR requests: ${e.message}</div>`;
    }
  }

  function renderRequests(items) {
    const list = document.getElementById('tvHubNetworkList');
    if (!list) return;
    list.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'tv-hub-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Method</th>
          <th>Status</th>
          <th>URL Path</th>
          <th>MIME Type</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        ${items.slice(0, 200).map(it => {
          const methodClass = it.method === 'GET' ? 'method-get' : 'method-post';
          const statusClass = it.status >= 200 && it.status < 300 ? 'status-ok' : 'status-other';
          const urlShort = it.url.replace(/^https?:\/\//, '');
          return `
            <tr>
              <td><span class="tv-method-badge ${methodClass}">${it.method}</span></td>
              <td><span class="tv-status-code ${statusClass}">${it.status}</span></td>
              <td class="tv-url-cell" title="${it.url}">${urlShort}</td>
              <td style="color:#787b86;font-size:11px;">${(it.mime || '').split(';')[0]}</td>
              <td><span class="tv-size-pill">${it.size ? (it.size / 1024).toFixed(1) + ' KB' : '-'}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;
    list.appendChild(table);

    const countLabel = document.getElementById('tvNetCountLabel');
    if (countLabel) countLabel.textContent = `Showing ${Math.min(200, items.length)} of ${items.length} HTTP Requests`;
  }

  const netSearch = document.getElementById('tvNetSearchInput');
  if (netSearch) {
    netSearch.addEventListener('input', (e) => {
      if (!cachedRequests) return;
      const q = e.target.value.toLowerCase().trim();
      const filtered = cachedRequests.filter(x => x.url.toLowerCase().includes(q) || x.method.toLowerCase().includes(q));
      renderRequests(filtered);
    });
  }

  // ── Tab 4: WebSocket Stream (183) ──
  async function fetchWs() {
    const list = document.getElementById('tvHubWsList');
    if (!list) return;
    list.innerHTML = '<div class="tv-hub-loading">Loading 183 WebSocket Frames...</div>';

    try {
      const res = await fetch('/api/tv/ws-frames?limit=200');
      cachedWs = await res.json();
      renderWs(cachedWs);
    } catch (e) {
      list.innerHTML = `<div class="tv-hub-error">Failed to load WebSocket frames: ${e.message}</div>`;
    }
  }

  function renderWs(frames) {
    const list = document.getElementById('tvHubWsList');
    if (!list) return;
    list.innerHTML = '';

    const feed = document.createElement('div');
    feed.className = 'tv-ws-feed';

    frames.forEach((f, idx) => {
      const isSend = f.type === 'send';
      const item = document.createElement('div');
      item.className = `tv-ws-frame-card ${isSend ? 'frame-send' : 'frame-receive'}`;

      let preview = (f.data || '').slice(0, 150);
      let full = f.data || '';

      item.innerHTML = `
        <div class="tv-ws-frame-hdr">
          <span class="tv-ws-badge ${isSend ? 'badge-send' : 'badge-receive'}">
            ${isSend ? '↑ SEND' : '↓ RECEIVE'} #${idx + 1}
          </span>
          <span class="tv-ws-time">${f.time ? new Date(f.time * 1000).toLocaleTimeString() : ''} (${(f.data || '').length} bytes)</span>
        </div>
        <div class="tv-ws-frame-content">${escapeHtml(preview)}${preview.length < full.length ? '...' : ''}</div>
      `;

      item.addEventListener('click', () => {
        alert(`WebSocket Frame #${idx + 1} (${isSend ? 'CLIENT SEND' : 'SERVER RECEIVE'}):\n\n${full}`);
      });

      feed.appendChild(item);
    });

    list.appendChild(feed);

    const countLabel = document.getElementById('tvWsCountLabel');
    if (countLabel) countLabel.textContent = `${frames.length} WebSocket Frames Recorded`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});
