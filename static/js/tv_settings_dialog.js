/**
 * TradingView Authentic Object & Chart Settings Dialog Engine
 * Implements 100% authentic TradingView UI, Components, and Typography:
 * - Floating non-blocking dialog (NO dark blur backdrop, chart is 100% visible)
 * - Custom TradingView Checkbox component with SVG checkmark
 * - Custom TradingView Select triggers with popover menus
 * - TradingView 40-color Palette Popover with Opacity slider and custom picker
 * - Flat borderless rows matching TradingView (NO gray card boxes)
 * - Dedicated "Text" tab for Trend Line, Rays, Extended lines, Shapes
 * - Point 1 & Point 2 numerical price/bar Coordinates tab
 * - Authentic Timeframe Visibility tab
 * - "Template ▾", "Cancel", and "Ok" footer actions
 */

class TVSettingsDialog {
  constructor() {
    this.activeModal = null;
    this.activeTarget = null; // drawing, indicator, or 'chart'
    this.targetType = null;   // 'drawing' | 'indicator' | 'chart'
    this.originalState = null;
    this.activeTab = 'style';
    this.activePopover = null;

    // Authentic TradingView 40-color palette (10 columns x 4 rows)
    this.tvPalette = [
      // Greyscale
      '#ffffff', '#d1d4dc', '#9598a1', '#787b86', '#5d606b', '#434651', '#363a45', '#2a2e39', '#1e222d', '#131722',
      // Saturated primaries
      '#f7525f', '#ff9800', '#ffeb3b', '#4caf50', '#089981', '#00bcd4', '#2962ff', '#673ab7', '#9c27b0', '#e91e63',
      // Light tints
      '#fccbcc', '#ffe0b2', '#fff9c4', '#c8e6c9', '#b2dfdb', '#b2ebf2', '#bbd9fb', '#d1c4e9', '#e1bee7', '#f8bbd0',
      // Dark shades
      '#b71c1c', '#e65100', '#f9a825', '#1b5e20', '#004d40', '#006064', '#0d47a1', '#311b92', '#4a148c', '#880e4f'
    ];

    // Global click listener to close popovers and modal on external click
    document.addEventListener('mousedown', (e) => {
      // Dismiss popovers when clicking outside
      if (this.activePopover && !this.activePopover.contains(e.target)) {
        this.closePopover();
      }
    }, true);

    // Load authentic TradingView extracted Chart Settings tabs & Drawing Dialogs
    this.exactChartTabs = null;
    fetch('/static/data/tv_exact_chart_settings_tabs.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => { this.exactChartTabs = data; })
      .catch(() => {});

    this.exactDrawingDialogs = null;
    fetch('/static/data/tv_exact_drawing_dialogs.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => { this.exactDrawingDialogs = data; })
      .catch(() => {});
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. OPEN DRAWING SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  open(drawing) {
    if (!drawing) return;
    this.close();

    this.activeTarget = drawing;
    this.targetType = 'drawing';
    this.originalState = JSON.parse(JSON.stringify(drawing));
    this.activeTab = 'style';

    this.renderModal();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. OPEN INDICATOR SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  openIndicator(indicator) {
    if (!indicator) return;
    this.close();

    this.activeTarget = indicator;
    this.targetType = 'indicator';
    this.originalState = {
      name: indicator.name,
      type: indicator.type,
      color: indicator.color,
      lineWidth: indicator.lineWidth || 2,
      period: indicator.period || 20,
      source: indicator.source || 'close',
      stdDev: indicator.stdDev || 2.0,
      atrPeriod: indicator.atrPeriod || 10,
      factor: indicator.factor || 3.0
    };
    this.activeTab = 'inputs';

    this.renderModal();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. OPEN CHART / GRAPH SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  openChartSettings() {
    this.close();

    this.activeTarget = 'chart';
    this.targetType = 'chart';
    this.activeTab = 'symbol';

    this.originalState = {
      upColor: '#089981',
      downColor: '#f23645',
      bgType: 'solid',
      bgColor: '#ffffff',
      gridColor: '#f0f3fa',
      showGrid: true,
      crosshairColor: '#787b86'
    };

    this.renderModal();
  }

  close() {
    this.closePopover();
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
    const backdrop = document.getElementById('tv-settings-backdrop');
    if (backdrop) backdrop.remove();
    this.activeTarget = null;
    this.originalState = null;
  }

  closePopover() {
    if (this.activePopover) {
      this.activePopover.remove();
      this.activePopover = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. RENDER MODAL CONTAINER (Authentic TradingView Floating Dialog)
  // ─────────────────────────────────────────────────────────────────────────
  renderModal() {
    // Non-blocking transparent backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'tv-settings-backdrop';
    backdrop.className = 'tv-settings-modal-backdrop';
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) this.close();
    });

    const modal = document.createElement('div');
    modal.className = 'tv-settings-dialog';
    modal.id = 'tv-settings-dialog';

    let title = 'Settings';
    let tabs = ['Style', 'Coordinates', 'Visibility'];

    if (this.targetType === 'drawing') {
      const d = this.activeTarget;
      const titles = {
        trendline: 'Trend Line',
        ray: 'Ray',
        infoline: 'Info Line',
        extended: 'Extended Line',
        trendangle: 'Trend Angle',
        arrow: 'Arrow',
        horzline: 'Horizontal Line',
        horzray: 'Horizontal Ray',
        vertline: 'Vertical Line',
        crossline: 'Cross Line',
        fibret: 'Fib Retracement',
        fib: 'Fib Retracement',
        trendfibext: 'Trend-Based Fib Extension',
        parallelchannel: 'Parallel Channel',
        pitchfork: 'Andrews\' Pitchfork',
        rectangle: 'Rectangle',
        circle: 'Circle',
        ellipse: 'Ellipse',
        triangle: 'Triangle',
        text: 'Text',
        callout: 'Callout',
        pricelabel: 'Price Label',
        longposition: 'Long Position',
        shortposition: 'Short Position',
        brush: 'Brush',
        highlighter: 'Highlighter'
      };
      title = titles[d.type] || (d.type.charAt(0).toUpperCase() + d.type.slice(1));

      // TradingView exact tabs by drawing tool family:
      if (['trendline', 'ray', 'infoline', 'extended', 'trendangle', 'arrow', 'horzline', 'horzray', 'vertline', 'crossline', 'rectangle', 'circle', 'ellipse', 'triangle'].includes(d.type)) {
        tabs = ['Style', 'Text', 'Coordinates', 'Visibility'];
      } else if (['fib', 'fibret', 'trendfibext', 'parallelchannel', 'pitchfork'].includes(d.type)) {
        tabs = ['Style', 'Coordinates', 'Visibility'];
      } else if (['text', 'callout', 'pricelabel'].includes(d.type)) {
        tabs = ['Text', 'Coordinates', 'Visibility'];
        if (this.activeTab === 'style') this.activeTab = 'text';
      } else if (['brush', 'highlighter'].includes(d.type)) {
        tabs = ['Style', 'Visibility'];
      } else if (d.type === 'longposition' || d.type === 'shortposition') {
        tabs = ['Inputs', 'Style', 'Visibility'];
        if (this.activeTab === 'coordinates') this.activeTab = 'inputs';
      }
    } else if (this.targetType === 'indicator') {
      title = this.activeTarget.name || 'Indicator Settings';
      tabs = ['Inputs', 'Style', 'Visibility'];
      if (this.activeTab === 'style' && !this.originalState.inputsViewed) this.activeTab = 'inputs';
    } else if (this.targetType === 'chart') {
      title = 'Chart Settings';
      tabs = ['Symbol', 'Status line', 'Scales and lines', 'Canvas', 'Trading', 'Alerts', 'Events'];
      const validKeys = tabs.map(t => t.toLowerCase().replace(/[\s&]/g, ''));
      if (!validKeys.includes(this.activeTab.replace(/[\s&]/g, ''))) {
        this.activeTab = 'symbol';
      }
    }

    modal.innerHTML = `
      <!-- Header -->
      <div class="tv-settings-header" id="tvSettingsDragHandle">
        <div class="tv-settings-title">${title}</div>
        <button class="tv-settings-close-btn" id="tvSettingsCloseBtn" title="Close (Esc)">
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="tv-settings-tabs">
        ${tabs.map(t => {
          const tabKey = t.toLowerCase().replace(/[\s&]/g, '');
          const isActive = this.activeTab === tabKey;
          return `<button class="tv-settings-tab ${isActive ? 'active' : ''}" data-tab="${tabKey}">${t}</button>`;
        }).join('')}
      </div>

      <!-- Body Container -->
      <div class="tv-settings-body" id="tvSettingsBody"></div>

      <!-- Footer Buttons -->
      <div class="tv-settings-footer">
        <button class="tv-settings-template-btn" id="tvSettingsTemplateBtn">
          Template
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="tv-settings-footer-actions">
          <button class="tv-btn-cancel" id="tvSettingsCancelBtn">Cancel</button>
          <button class="tv-btn-ok" id="tvSettingsOkBtn">Ok</button>
        </div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    this.activeModal = modal;

    // Draggable header
    this.makeDraggable(modal, modal.querySelector('#tvSettingsDragHandle'));

    // Header and footer actions
    modal.querySelector('#tvSettingsCloseBtn').addEventListener('click', () => this.close());
    modal.querySelector('#tvSettingsCancelBtn').addEventListener('click', () => this.cancel());
    modal.querySelector('#tvSettingsOkBtn').addEventListener('click', () => this.save());
    modal.querySelector('#tvSettingsTemplateBtn').addEventListener('click', (e) => this.openTemplatePopover(e.currentTarget));

    // Tab buttons
    modal.querySelectorAll('.tv-settings-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tv-settings-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.getAttribute('data-tab');
        this.renderTabBody();
      });
    });

    // Render active tab content
    this.renderTabBody();
  }

  makeDraggable(dialog, handle) {
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = dialog.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      dialog.style.transform = 'none';
      dialog.style.left = `${initialLeft}px`;
      dialog.style.top = `${initialTop}px`;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      dialog.style.left = `${Math.max(10, Math.min(window.innerWidth - dialog.offsetWidth - 10, initialLeft + dx))}px`;
      dialog.style.top = `${Math.max(10, Math.min(window.innerHeight - dialog.offsetHeight - 10, initialTop + dy))}px`;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. COMPONENT HELPERS (TradingView Checkbox, Select, Color Picker)
  // ─────────────────────────────────────────────────────────────────────────
  createCheckbox(id, label, isChecked = true) {
    return `
      <label class="tv-checkbox-wrap ${isChecked ? 'checked' : ''}" id="${id}Wrap" data-target-id="${id}">
        <span class="tv-checkbox-box">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1.5 4L3.8 6.3L8.5 1.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <input type="checkbox" id="${id}" ${isChecked ? 'checked' : ''} style="display:none;" />
        <span class="tv-checkbox-text">${label}</span>
      </label>
    `;
  }

  createColorPicker(id, color = '#2962ff', opacity = 1) {
    return `
      <button type="button" class="tv-color-swatch-btn" id="${id}" data-color="${color}" data-opacity="${opacity}" title="Select color">
        <span class="tv-color-swatch-inner" style="background-color: ${color};"></span>
      </button>
    `;
  }

  createSelect(id, value, options) {
    const activeOpt = options.find(o => String(o.val) === String(value)) || options[0];
    return `
      <div class="tv-select-trigger" id="${id}" data-value="${activeOpt.val}" data-options='${JSON.stringify(options)}'>
        <span class="tv-select-display">${activeOpt.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `;
  }

  attachCheckboxListeners(container, onChange) {
    container.querySelectorAll('.tv-checkbox-wrap').forEach(wrap => {
      wrap.addEventListener('click', (e) => {
        e.preventDefault();
        const input = wrap.querySelector('input[type="checkbox"]');
        const next = !input.checked;
        input.checked = next;
        wrap.classList.toggle('checked', next);
        if (onChange) onChange(input.id, next);
        this.triggerUpdate();
      });
    });
  }

  attachColorPickerListeners(container, onChange) {
    container.querySelectorAll('.tv-color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openColorPickerPopover(btn, (newColor, newOpacity) => {
          btn.setAttribute('data-color', newColor);
          btn.setAttribute('data-opacity', newOpacity);
          btn.querySelector('.tv-color-swatch-inner').style.backgroundColor = newColor;
          if (onChange) onChange(btn.id, newColor, newOpacity);
          this.triggerUpdate();
        });
      });
    });
  }

  openColorPickerPopover(targetEl, onColorSelect) {
    this.closePopover();
    const rect = targetEl.getBoundingClientRect();

    const panel = document.createElement('div');
    panel.className = 'tv-color-picker-panel';
    panel.id = 'tvColorPickerPanel';

    let currentHex = targetEl.getAttribute('data-color') || '#2962ff';
    let currentOpacity = parseFloat(targetEl.getAttribute('data-opacity') || '1');

    panel.innerHTML = `
      <div class="tv-palette-grid">
        ${this.tvPalette.map(hex => `
          <div class="tv-palette-tile ${hex.toLowerCase() === currentHex.toLowerCase() ? 'selected' : ''}" data-hex="${hex}" style="background-color: ${hex};" title="${hex}"></div>
        `).join('')}
      </div>
      <div class="tv-opacity-row">
        <span style="font-size: 12px; color: #787b86;">Opacity</span>
        <input type="range" class="tv-opacity-slider" min="0" max="100" value="${Math.round(currentOpacity * 100)}" />
        <span class="tv-opacity-val">${Math.round(currentOpacity * 100)}%</span>
      </div>
    `;

    document.body.appendChild(panel);
    this.activePopover = panel;

    // Positioning
    panel.style.top = `${Math.min(window.innerHeight - panel.offsetHeight - 10, rect.bottom + 6)}px`;
    panel.style.left = `${Math.max(10, Math.min(window.innerWidth - panel.offsetWidth - 10, rect.left - 80))}px`;

    // Swatch click
    panel.querySelectorAll('.tv-palette-tile').forEach(tile => {
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        currentHex = tile.getAttribute('data-hex');
        panel.querySelectorAll('.tv-palette-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        onColorSelect(currentHex, currentOpacity);
      });
    });

    // Opacity slider
    const slider = panel.querySelector('.tv-opacity-slider');
    const valText = panel.querySelector('.tv-opacity-val');
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      currentOpacity = val / 100;
      valText.textContent = `${val}%`;
      onColorSelect(currentHex, currentOpacity);
    });
  }

  attachSelectListeners(container, onSelectChange) {
    container.querySelectorAll('.tv-select-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSelectPopover(trigger, (newVal, newLabel) => {
          trigger.setAttribute('data-value', newVal);
          trigger.querySelector('.tv-select-display').textContent = newLabel;
          if (onSelectChange) onSelectChange(trigger.id, newVal);
          this.triggerUpdate();
        });
      });
    });
  }

  openSelectPopover(trigger, onPick) {
    this.closePopover();
    const rect = trigger.getBoundingClientRect();
    const options = JSON.parse(trigger.getAttribute('data-options') || '[]');
    const currentVal = trigger.getAttribute('data-value');

    const menu = document.createElement('div');
    menu.className = 'tv-popover-menu';
    menu.id = 'tvSelectPopoverMenu';

    menu.innerHTML = options.map(opt => `
      <div class="tv-popover-menu-item ${String(opt.val) === String(currentVal) ? 'selected' : ''}" data-val="${opt.val}" data-label="${opt.label}">
        ${opt.label}
      </div>
    `).join('');

    document.body.appendChild(menu);
    this.activePopover = menu;

    menu.style.top = `${Math.min(window.innerHeight - menu.offsetHeight - 10, rect.bottom + 4)}px`;
    menu.style.left = `${Math.max(10, Math.min(window.innerWidth - menu.offsetWidth - 10, rect.left))}px`;
    menu.style.minWidth = `${rect.width}px`;

    menu.querySelectorAll('.tv-popover-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = item.getAttribute('data-val');
        const l = item.getAttribute('data-label');
        onPick(v, l);
        this.closePopover();
      });
    });
  }

  openTemplatePopover(targetEl) {
    this.closePopover();
    const rect = targetEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'tv-popover-menu';
    menu.id = 'tvTemplatePopoverMenu';
    menu.innerHTML = `
      <div class="tv-popover-menu-item" data-action="apply-defaults">Apply Defaults</div>
      <div class="tv-popover-menu-item" data-action="save-as">Save as...</div>
      <div class="tv-popover-menu-item" data-action="reset">Reset Settings</div>
    `;
    document.body.appendChild(menu);
    this.activePopover = menu;

    menu.style.top = `${Math.max(10, rect.top - 105)}px`;
    menu.style.left = `${rect.left}px`;

    menu.querySelectorAll('.tv-popover-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = item.getAttribute('data-action');
        this.closePopover();
        if (act === 'apply-defaults' || act === 'reset') {
          this.resetDefaults();
        } else if (act === 'save-as') {
          const name = prompt('Template name:', 'My Template');
          if (name && this.activeTarget) {
            try {
              localStorage.setItem(`tv_tmpl_${this.activeTarget.type || 'chart'}_${name}`, JSON.stringify(this.activeTarget.style || {}));
            } catch(e){}
          }
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. RENDER ACTIVE TAB BODY
  // ─────────────────────────────────────────────────────────────────────────
  renderTabBody() {
    const container = document.getElementById('tvSettingsBody');
    if (!container) return;
    container.innerHTML = '';

    if (this.targetType === 'drawing') {
      const d = this.activeTarget;

      // 100% Exact Authentic TradingView DOM if extracted for this drawing tool
      if (this.exactDrawingDialogs) {
        const typeKey = (d.type || '').toLowerCase().replace(/[\s\-_]/g, '');
        const matchedEntry = Object.entries(this.exactDrawingDialogs).find(([name]) => {
          const cleanName = name.toLowerCase().replace(/[\s\-_]/g, '');
          return cleanName.includes(typeKey) || typeKey.includes(cleanName);
        });
        if (matchedEntry && matchedEntry[1] && matchedEntry[1].tabs) {
          const tabData = matchedEntry[1].tabs.find(t => {
            const tName = (t.name || '').toLowerCase().replace(/[\s\-_]/g, '');
            return tName === this.activeTab;
          });
          if (tabData && tabData.bodyHTML) {
            container.innerHTML = tabData.bodyHTML;
            return;
          }
        }
      }

      if (this.activeTab === 'style') {
        this.renderDrawingStyleTab(container, d);
      } else if (this.activeTab === 'text') {
        this.renderDrawingTextTab(container, d);
      } else if (this.activeTab === 'coordinates') {
        this.renderDrawingCoordinatesTab(container, d);
      } else if (this.activeTab === 'inputs') {
        this.renderPositionInputsTab(container, d);
      } else if (this.activeTab === 'visibility') {
        this.renderVisibilityTab(container);
      }
    } else if (this.targetType === 'indicator') {
      const ind = this.activeTarget;
      if (this.activeTab === 'inputs') {
        this.renderIndicatorInputsTab(container, ind);
      } else if (this.activeTab === 'style') {
        this.renderIndicatorStyleTab(container, ind);
      } else if (this.activeTab === 'visibility') {
        this.renderVisibilityTab(container);
      }
    } else if (this.targetType === 'chart') {
      const tab = this.activeTab.replace(/[\s&]/g, '');
      const exactKey = tab === 'scales' ? 'scalesandlines' : tab;

      // 100% Exact Authentic TradingView DOM & Styles from real extraction
      if (this.exactChartTabs && this.exactChartTabs[exactKey] && this.exactChartTabs[exactKey].html) {
        container.innerHTML = this.exactChartTabs[exactKey].html;
        return;
      }

      if (tab === 'symbol') {
        this.renderChartSymbolTab(container);
      } else if (tab === 'statusline') {
        this.renderChartStatusLineTab(container);
      } else if (tab === 'scales' || tab === 'scalesandlines') {
        this.renderChartScalesTab(container);
      } else if (tab === 'canvas') {
        this.renderChartCanvasTab(container);
      } else if (tab === 'trading') {
        this.renderChartTradingTab(container);
      } else if (tab === 'alerts') {
        this.renderChartAlertsTab(container);
      } else if (tab === 'events') {
        this.renderChartEventsTab(container);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. DRAWING STYLE TAB (Lines, Fib, Shapes, Brush, etc.)
  // ─────────────────────────────────────────────────────────────────────────
  renderDrawingStyleTab(container, d) {
    const style = d.style;

    // ── FIBONACCI RETRACEMENT ──
    if (d.type === 'fib' || d.type === 'fibret' || d.type === 'trendfibext') {
      const full24Levels = [
        // Column 1
        { l: 0.0,   c: '#787b86', active: true },
        { l: 0.236, c: '#f23645', active: true },
        { l: 0.382, c: '#ff9800', active: true },
        { l: 0.5,   c: '#089981', active: true },
        { l: 0.618, c: '#00897b', active: true },
        { l: 0.786, c: '#2962ff', active: true },
        { l: 1.0,   c: '#787b86', active: true },
        { l: 1.618, c: '#2962ff', active: true },
        { l: 2.618, c: '#9c27b0', active: false },
        { l: 3.618, c: '#e91e63', active: false },
        { l: 4.236, c: '#00bcd4', active: false },
        { l: 4.414, c: '#e91e63', active: false },
        // Column 2
        { l: 0.146, c: '#ff9800', active: false },
        { l: 0.272, c: '#e91e63', active: false },
        { l: 0.472, c: '#9c27b0', active: false },
        { l: 0.65,  c: '#089981', active: false },
        { l: 0.886, c: '#2962ff', active: false },
        { l: 1.13,  c: '#00bcd4', active: false },
        { l: 1.272, c: '#089981', active: false },
        { l: 1.414, c: '#ff9800', active: false },
        { l: 2.0,   c: '#787b86', active: false },
        { l: 2.272, c: '#2962ff', active: false },
        { l: 2.414, c: '#e91e63', active: false },
        { l: 3.414, c: '#9c27b0', active: false }
      ];
      if (!style.levels || style.levels.length < 24) {
        style.levels = full24Levels;
      }

      container.innerHTML = `
        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('fibTrendLineCheck', 'Trend line', style.showTrendLine !== false)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createColorPicker('fibTrendLineColor', style.color || '#2962ff')}
            ${this.createSelect('fibTrendLineWidth', style.width || 2, [
              { val: 1, label: '1px' }, { val: 2, label: '2px' }, { val: 3, label: '3px' }, { val: 4, label: '4px' }
            ])}
            ${this.createSelect('fibTrendLineStyle', style.style || 'dashed', [
              { val: 'solid', label: '― Solid' }, { val: 'dashed', label: '- - Dashed' }, { val: 'dotted', label: '··· Dotted' }
            ])}
          </div>
        </div>

        <div style="border-top: 1px solid #f0f3fa; margin: 4px 0;"></div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('fibUseOneColor', 'Use one color', !!style.useOneColor)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createColorPicker('fibOneColorPicker', style.oneColor || '#2962ff')}
          </div>
        </div>

        <div class="tv-fib-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          ${style.levels.map((lvl, idx) => `
            <div class="tv-fib-grid-item" style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              ${this.createCheckbox(`fibLvl_${idx}`, '', lvl.active)}
              <input type="number" step="0.001" value="${lvl.l}" data-lvl-idx="${idx}" class="tv-number-input tv-fib-lvl-val" style="width: 72px; height: 30px; font-size: 13px;" />
              ${this.createColorPicker(`fibLvlColor_${idx}`, lvl.c)}
            </div>
          `).join('')}
        </div>

        <div style="border-top: 1px solid #f0f3fa; margin: 4px 0;"></div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('fibBackgroundCheck', 'Background', style.showBackground !== false)}
          </div>
          <div class="tv-dialog-row-right" style="width: 180px;">
            <input type="range" id="fibBgOpacity" class="tv-opacity-slider" min="0" max="100" value="${Math.round((style.bgOpacity || 0.08) * 100)}" />
            <span id="fibBgOpacityVal" style="font-size: 13px; color: #787b86; width: 36px; text-align: right;">${Math.round((style.bgOpacity || 0.08) * 100)}%</span>
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('fibExtendLeft', 'Extend lines left', !!style.extendLeft)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('fibExtendRight', 'Extend lines right', !!style.extendRight)}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('fibReverse', 'Reverse', !!style.reverse)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('fibLogScale', 'Fib levels based on log scale', !!style.logScale)}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('fibPricesCheck', 'Prices', style.showPrices !== false)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('fibLevelsCheck', 'Levels', style.showLevels !== false)}
            ${this.createSelect('fibLevelsFormat', style.levelsFormat || 'values', [
              { val: 'values', label: 'Values' }, { val: 'percent', label: 'Percentages' }
            ])}
          </div>
        </div>

        <div class="tv-dialog-row">
          <span class="tv-dialog-label-dim">Labels</span>
          <div class="tv-dialog-row-right">
            ${this.createSelect('fibLabelsH', style.labelsPosH || 'Left', [
              { val: 'Left', label: 'Left' }, { val: 'Center', label: 'Center' }, { val: 'Right', label: 'Right' }
            ])}
            ${this.createSelect('fibLabelsV', style.labelsPosV || 'Top', [
              { val: 'Top', label: 'Top' }, { val: 'Middle', label: 'Middle' }, { val: 'Bottom', label: 'Bottom' }
            ])}
          </div>
        </div>
      `;

      this.attachCheckboxListeners(container, (id, val) => {
        if (id === 'fibTrendLineCheck') style.showTrendLine = val;
        else if (id === 'fibUseOneColor') style.useOneColor = val;
        else if (id === 'fibBackgroundCheck') style.showBackground = val;
        else if (id === 'fibExtendLeft') style.extendLeft = val;
        else if (id === 'fibExtendRight') style.extendRight = val;
        else if (id === 'fibReverse') style.reverse = val;
        else if (id === 'fibLogScale') style.logScale = val;
        else if (id === 'fibPricesCheck') style.showPrices = val;
        else if (id === 'fibLevelsCheck') style.showLevels = val;
        else if (id.startsWith('fibLvl_')) {
          const idx = parseInt(id.replace('fibLvl_', ''), 10);
          style.levels[idx].active = val;
        }
      });

      this.attachColorPickerListeners(container, (id, color) => {
        if (id === 'fibTrendLineColor') style.color = color;
        else if (id === 'fibOneColorPicker') style.oneColor = color;
        else if (id.startsWith('fibLvlColor_')) {
          const idx = parseInt(id.replace('fibLvlColor_', ''), 10);
          style.levels[idx].c = color;
        }
      });

      this.attachSelectListeners(container, (id, val) => {
        if (id === 'fibTrendLineWidth') style.width = parseInt(val, 10);
        else if (id === 'fibTrendLineStyle') style.style = val;
        else if (id === 'fibLevelsFormat') style.levelsFormat = val;
        else if (id === 'fibLabelsH') style.labelsPosH = val;
        else if (id === 'fibLabelsV') style.labelsPosV = val;
      });

      container.querySelector('#fibBgOpacity').addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        style.bgOpacity = val / 100;
        container.querySelector('#fibBgOpacityVal').textContent = `${val}%`;
        this.triggerUpdate();
      });

      container.querySelectorAll('.tv-fib-lvl-val').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(e.target.getAttribute('data-lvl-idx'), 10);
          style.levels[idx].l = parseFloat(e.target.value) || 0;
          this.triggerUpdate();
        });
      });

      return;
    }

    // ── LINE TOOLS (Trend Line, Ray, Horz Line, etc.) ──
    if (['trendline', 'ray', 'extended', 'infoline', 'trendangle', 'arrow', 'horzline', 'horzray', 'vertline', 'crossline'].includes(d.type)) {
      container.innerHTML = `
        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('lineEnable', 'Line', true)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createColorPicker('lineColorBtn', style.color || '#2962ff')}
            ${this.createSelect('lineWidthSelect', style.width || 2, [
              { val: 1, label: '1px' }, { val: 2, label: '2px' }, { val: 3, label: '3px' }, { val: 4, label: '4px' }
            ])}
            ${this.createSelect('lineStyleSelect', style.style || 'solid', [
              { val: 'solid', label: '― Solid' }, { val: 'dashed', label: '- - Dashed' }, { val: 'dotted', label: '··· Dotted' }
            ])}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            <span class="tv-dialog-label-dim" style="width: 70px;">Left End</span>
            ${this.createSelect('lineLeftEnd', style.leftEnd || 'normal', [
              { val: 'normal', label: 'Normal' }, { val: 'arrow', label: 'Arrow' }
            ])}
          </div>
          <div class="tv-dialog-row-right">
            <span class="tv-dialog-label-dim" style="width: 70px;">Right End</span>
            ${this.createSelect('lineRightEnd', style.rightEnd || (d.type === 'arrow' ? 'arrow' : 'normal'), [
              { val: 'normal', label: 'Normal' }, { val: 'arrow', label: 'Arrow' }
            ])}
          </div>
        </div>

        <div style="border-top: 1px solid #f0f3fa; margin: 4px 0;"></div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('lineExtendLeft', 'Extend lines left', !!(style.extendLeft || d.type === 'extended'))}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('lineExtendRight', 'Extend lines right', !!(style.extendRight || d.type === 'ray' || d.type === 'horzray' || d.type === 'extended'))}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('lineMiddlePoint', 'Middle point', !!style.middlePoint)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('linePriceLabels', 'Price labels', !!(style.showPrice || d.type === 'horzline'))}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('linePriceRange', 'Price range', !!style.priceRange)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('lineBarsRange', 'Bars range', !!(style.barsRange || d.type === 'infoline'))}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('lineDateRange', 'Date/time range', !!style.dateRange)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('lineDistance', 'Distance', !!style.distance)}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('lineAngle', 'Angle', !!(style.showAngle || d.type === 'trendangle'))}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createCheckbox('lineAlwaysStats', 'Always show stats', !!style.alwaysStats)}
          </div>
        </div>

        <div class="tv-dialog-row" style="margin-top: 6px;">
          <span class="tv-dialog-label-dim">Stats position</span>
          ${this.createSelect('lineStatsPos', style.statsPos || 'Center', [
            { val: 'Left', label: 'Left' }, { val: 'Center', label: 'Center' }, { val: 'Right', label: 'Right' }
          ])}
        </div>
      `;

      this.attachCheckboxListeners(container, (id, val) => {
        if (id === 'lineExtendLeft') style.extendLeft = val;
        else if (id === 'lineExtendRight') style.extendRight = val;
        else if (id === 'lineMiddlePoint') style.middlePoint = val;
        else if (id === 'linePriceLabels') style.showPrice = val;
        else if (id === 'linePriceRange') style.priceRange = val;
        else if (id === 'lineBarsRange') style.barsRange = val;
        else if (id === 'lineDateRange') style.dateRange = val;
        else if (id === 'lineDistance') style.distance = val;
        else if (id === 'lineAngle') style.showAngle = val;
        else if (id === 'lineAlwaysStats') style.alwaysStats = val;
      });

      this.attachColorPickerListeners(container, (id, color) => {
        if (id === 'lineColorBtn') style.color = color;
      });

      this.attachSelectListeners(container, (id, val) => {
        if (id === 'lineWidthSelect') style.width = parseInt(val, 10);
        else if (id === 'lineStyleSelect') style.style = val;
        else if (id === 'lineLeftEnd') style.leftEnd = val;
        else if (id === 'lineRightEnd') style.rightEnd = val;
        else if (id === 'lineStatsPos') style.statsPos = val;
      });

      return;
    }

    // ── GEOMETRIC SHAPES (Rectangle, Circle, Ellipse, Triangle) ──
    if (['rectangle', 'circle', 'ellipse', 'triangle'].includes(d.type)) {
      container.innerHTML = `
        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('shapeBorderCheck', 'Border', true)}
          </div>
          <div class="tv-dialog-row-right">
            ${this.createColorPicker('shapeBorderColor', style.color || '#2962ff')}
            ${this.createSelect('shapeBorderWidth', style.width || 2, [
              { val: 1, label: '1px' }, { val: 2, label: '2px' }, { val: 3, label: '3px' }, { val: 4, label: '4px' }
            ])}
            ${this.createSelect('shapeBorderStyle', style.style || 'solid', [
              { val: 'solid', label: '― Solid' }, { val: 'dashed', label: '- - Dashed' }
            ])}
          </div>
        </div>

        <div class="tv-dialog-row">
          <div class="tv-dialog-row-left">
            ${this.createCheckbox('shapeBgCheck', 'Background', style.showBackground !== false)}
          </div>
          <div class="tv-dialog-row-right" style="width: 200px;">
            ${this.createColorPicker('shapeBgColor', style.fillColor || style.color || '#2962ff')}
            <input type="range" id="shapeBgOpacity" class="tv-opacity-slider" min="0" max="100" value="${Math.round((style.bgOpacity || 0.12) * 100)}" />
            <span id="shapeBgOpacityVal" style="font-size: 13px; color: #787b86; width: 36px; text-align: right;">${Math.round((style.bgOpacity || 0.12) * 100)}%</span>
          </div>
        </div>

        ${d.type === 'rectangle' ? `
          <div class="tv-dialog-row">
            <div class="tv-dialog-row-left">
              ${this.createCheckbox('rectExtendRight', 'Extend right', !!style.extendRight)}
            </div>
            <div class="tv-dialog-row-right">
              ${this.createCheckbox('rectExtendLeft', 'Extend left', !!style.extendLeft)}
            </div>
          </div>
        ` : ''}
      `;

      this.attachCheckboxListeners(container, (id, val) => {
        if (id === 'shapeBgCheck') style.showBackground = val;
        else if (id === 'rectExtendRight') style.extendRight = val;
        else if (id === 'rectExtendLeft') style.extendLeft = val;
      });

      this.attachColorPickerListeners(container, (id, color) => {
        if (id === 'shapeBorderColor') style.color = color;
        else if (id === 'shapeBgColor') style.fillColor = color;
      });

      this.attachSelectListeners(container, (id, val) => {
        if (id === 'shapeBorderWidth') style.width = parseInt(val, 10);
        else if (id === 'shapeBorderStyle') style.style = val;
      });

      container.querySelector('#shapeBgOpacity').addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        style.bgOpacity = val / 100;
        container.querySelector('#shapeBgOpacityVal').textContent = `${val}%`;
        this.triggerUpdate();
      });

      return;
    }

    // ── BRUSH & HIGHLIGHTER ──
    if (['brush', 'highlighter'].includes(d.type)) {
      container.innerHTML = `
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Color</span>
          ${this.createColorPicker('brushColorBtn', style.color || '#2962ff')}
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Thickness (${style.width || 2}px)</span>
          <input type="range" id="brushWidthSlider" class="tv-opacity-slider" style="width: 220px;" min="1" max="24" value="${style.width || 2}" />
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Opacity (${Math.round((style.opacity || 1) * 100)}%)</span>
          <input type="range" id="brushOpacitySlider" class="tv-opacity-slider" style="width: 220px;" min="10" max="100" value="${Math.round((style.opacity || 1) * 100)}" />
        </div>
      `;

      this.attachColorPickerListeners(container, (id, color) => {
        style.color = color;
      });

      container.querySelector('#brushWidthSlider').addEventListener('input', (e) => {
        style.width = parseInt(e.target.value, 10);
        this.triggerUpdate();
      });

      container.querySelector('#brushOpacitySlider').addEventListener('input', (e) => {
        style.opacity = parseInt(e.target.value, 10) / 100;
        this.triggerUpdate();
      });

      return;
    }

    // Fallback simple line style
    container.innerHTML = `
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Color</span>
        ${this.createColorPicker('defaultColorBtn', style.color || '#2962ff')}
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Line width</span>
        ${this.createSelect('defaultWidthSelect', style.width || 2, [
          { val: 1, label: '1px' }, { val: 2, label: '2px' }, { val: 3, label: '3px' }, { val: 4, label: '4px' }
        ])}
      </div>
    `;

    this.attachColorPickerListeners(container, (id, color) => {
      style.color = color;
    });

    this.attachSelectListeners(container, (id, val) => {
      style.width = parseInt(val, 10);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. DEDICATED TEXT TAB (Authentic TradingView Text Tab for Lines & Shapes)
  // ─────────────────────────────────────────────────────────────────────────
  renderDrawingTextTab(container, d) {
    const style = d.style;
    const hasText = !!style.text || !!d.text;
    const currentText = style.text || d.text || '';

    container.innerHTML = `
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('enableTextCheck', 'Text', hasText || d.type === 'text')}
        </div>
      </div>

      <div style="margin-top: 4px;">
        <textarea class="tv-textarea" id="textInputContent" placeholder="Text">${currentText}</textarea>
      </div>

      <div class="tv-dialog-row" style="margin-top: 10px;">
        <span class="tv-dialog-label">Font & Style</span>
        <div class="tv-dialog-row-right">
          ${this.createSelect('textFontSizeSelect', style.fontSize || 14, [
            { val: 10, label: '10' }, { val: 11, label: '11' }, { val: 12, label: '12' },
            { val: 14, label: '14' }, { val: 16, label: '16' }, { val: 20, label: '20' },
            { val: 24, label: '24' }, { val: 28, label: '28' }, { val: 36, label: '36' }
          ])}
          ${this.createColorPicker('textColorBtn', style.textColor || style.color || '#131722')}
          <button type="button" class="tv-toggle-btn ${style.bold ? 'active' : ''}" id="textBoldToggle" title="Bold">
            <b>B</b>
          </button>
          <button type="button" class="tv-toggle-btn ${style.italic ? 'active' : ''}" id="textItalicToggle" title="Italic">
            <i>I</i>
          </button>
        </div>
      </div>

      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Text alignment</span>
        <div class="tv-dialog-row-right">
          ${this.createSelect('textAlignSelect', style.textAlign || 'Center', [
            { val: 'Left', label: 'Left' }, { val: 'Center', label: 'Center' }, { val: 'Right', label: 'Right' }
          ])}
          ${this.createSelect('textVAlignSelect', style.textVAlign || 'Top', [
            { val: 'Top', label: 'Top' }, { val: 'Middle', label: 'Middle' }, { val: 'Bottom', label: 'Bottom' }
          ])}
        </div>
      </div>

      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Text orientation</span>
        <div class="tv-dialog-row-right">
          ${this.createSelect('textOrientSelect', style.orientation || 'Along the line', [
            { val: 'Horizontal', label: 'Horizontal' }, { val: 'Along the line', label: 'Along the line' }
          ])}
        </div>
      </div>
    `;

    // Textarea input
    const textarea = container.querySelector('#textInputContent');
    textarea.addEventListener('input', (e) => {
      style.text = e.target.value;
      if (d.type === 'text' || d.type === 'callout') d.text = e.target.value;
      this.triggerUpdate();
    });

    this.attachCheckboxListeners(container, (id, val) => {
      if (id === 'enableTextCheck' && !val) {
        style.text = '';
        textarea.value = '';
        this.triggerUpdate();
      }
    });

    this.attachColorPickerListeners(container, (id, color) => {
      if (id === 'textColorBtn') style.textColor = color;
    });

    this.attachSelectListeners(container, (id, val) => {
      if (id === 'textFontSizeSelect') style.fontSize = parseInt(val, 10);
      else if (id === 'textAlignSelect') style.textAlign = val;
      else if (id === 'textVAlignSelect') style.textVAlign = val;
      else if (id === 'textOrientSelect') style.orientation = val;
    });

    // Bold / Italic toggles
    const boldBtn = container.querySelector('#textBoldToggle');
    boldBtn.addEventListener('click', () => {
      style.bold = !style.bold;
      boldBtn.classList.toggle('active', style.bold);
      this.triggerUpdate();
    });

    const italicBtn = container.querySelector('#textItalicToggle');
    italicBtn.addEventListener('click', () => {
      style.italic = !style.italic;
      italicBtn.classList.toggle('active', style.italic);
      this.triggerUpdate();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. COORDINATES TAB (Precise Point 1 & Point 2 Price & Bar #)
  // ─────────────────────────────────────────────────────────────────────────
  renderDrawingCoordinatesTab(container, d) {
    const p1Price = (d.p1 && d.p1.price) ? d.p1.price.toFixed(2) : (d.p ? d.p.price.toFixed(2) : '23146.15');
    const p1Bar = (d.p1 && d.p1.logical !== undefined) ? d.p1.logical : (d.p ? d.p.logical : 240);
    const p2Price = (d.p2 && d.p2.price) ? d.p2.price.toFixed(2) : '24000.00';
    const p2Bar = (d.p2 && d.p2.logical !== undefined) ? d.p2.logical : 280;

    container.innerHTML = `
      <div style="font-weight: 600; font-size: 13px; color: #787b86; text-transform: uppercase; margin-bottom: 4px;">Point 1</div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Price</span>
        <input type="number" step="0.05" class="tv-number-input" id="coordPrice1" value="${p1Price}" style="width: 140px;" />
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Bar #</span>
        <input type="number" step="1" class="tv-number-input" id="coordBar1" value="${p1Bar}" style="width: 140px;" />
      </div>

      ${d.p2 ? `
        <div style="font-weight: 600; font-size: 13px; color: #787b86; text-transform: uppercase; margin: 12px 0 4px;">Point 2</div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Price</span>
          <input type="number" step="0.05" class="tv-number-input" id="coordPrice2" value="${p2Price}" style="width: 140px;" />
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Bar #</span>
          <input type="number" step="1" class="tv-number-input" id="coordBar2" value="${p2Bar}" style="width: 140px;" />
        </div>
      ` : ''}
    `;

    const p1PriceInput = container.querySelector('#coordPrice1');
    const p1BarInput = container.querySelector('#coordBar1');
    const p2PriceInput = container.querySelector('#coordPrice2');
    const p2BarInput = container.querySelector('#coordBar2');

    const updateCoords = () => {
      const pt1 = d.p1 || d.p;
      if (pt1) {
        pt1.price = parseFloat(p1PriceInput.value) || pt1.price;
        pt1.logical = parseInt(p1BarInput.value, 10) || pt1.logical;
        if (window.tvDrawingEngine) {
          const px = window.tvDrawingEngine.pixelFromChartCoords(pt1.price, pt1.logical);
          if (px.x !== null) pt1.x = px.x;
          if (px.y !== null) pt1.y = px.y;
        }
      }
      if (d.p2 && p2PriceInput && p2BarInput) {
        d.p2.price = parseFloat(p2PriceInput.value) || d.p2.price;
        d.p2.logical = parseInt(p2BarInput.value, 10) || d.p2.logical;
        if (window.tvDrawingEngine) {
          const px = window.tvDrawingEngine.pixelFromChartCoords(d.p2.price, d.p2.logical);
          if (px.x !== null) d.p2.x = px.x;
          if (px.y !== null) d.p2.y = px.y;
        }
      }
      this.triggerUpdate();
    };

    [p1PriceInput, p1BarInput, p2PriceInput, p2BarInput].filter(Boolean).forEach(inp => {
      inp.addEventListener('change', updateCoords);
      inp.addEventListener('input', updateCoords);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 10. VISIBILITY TAB (Authentic TradingView Timeframes)
  // ─────────────────────────────────────────────────────────────────────────
  renderVisibilityTab(container) {
    const timeframes = [
      { name: 'Ticks', active: true },
      { name: 'Seconds', active: true, range: '1 — 59' },
      { name: 'Minutes', active: true, range: '1 — 59' },
      { name: 'Hours', active: true, range: '1 — 24' },
      { name: 'Days', active: true },
      { name: 'Weeks', active: true },
      { name: 'Months', active: true },
      { name: 'Ranges', active: true }
    ];

    container.innerHTML = timeframes.map((tf, i) => `
      <div class="tv-visibility-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox(`visCheck_${i}`, tf.name, tf.active)}
        </div>
        ${tf.range ? `<span style="font-size: 13px; color: #787b86;">${tf.range}</span>` : ''}
      </div>
    `).join('');

    this.attachCheckboxListeners(container);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 11. POSITION INPUTS TAB (Long / Short Position)
  // ─────────────────────────────────────────────────────────────────────────
  renderPositionInputsTab(container, d) {
    const entryPrice = d.p1 ? (d.p1.price || 23146) : 23146;
    const targetH = d.targetHeight || 70;
    const stopH = d.stopHeight || 35;
    const profitPrice = (entryPrice + (d.type === 'longposition' ? targetH * 1.5 : -targetH * 1.5)).toFixed(2);
    const stopPrice = (entryPrice - (d.type === 'longposition' ? stopH * 1.5 : -stopH * 1.5)).toFixed(2);

    container.innerHTML = `
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Account size</span>
        <input type="number" class="tv-number-input" id="posAccount" value="100000" style="width: 140px;" />
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Risk %</span>
        <input type="number" step="0.1" class="tv-number-input" id="posRisk" value="1.0" style="width: 140px;" />
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Entry price</span>
        <input type="number" step="0.05" class="tv-number-input" id="posEntry" value="${entryPrice.toFixed(2)}" style="width: 140px;" />
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Profit target</span>
        <input type="number" step="0.05" class="tv-number-input" id="posTarget" value="${profitPrice}" style="width: 140px;" />
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Stop loss</span>
        <input type="number" step="0.05" class="tv-number-input" id="posStop" value="${stopPrice}" style="width: 140px;" />
      </div>
    `;

    const entryInp = container.querySelector('#posEntry');
    const targetInp = container.querySelector('#posTarget');
    const stopInp = container.querySelector('#posStop');

    const updatePos = () => {
      const ep = parseFloat(entryInp.value) || entryPrice;
      const tp = parseFloat(targetInp.value) || parseFloat(profitPrice);
      const sp = parseFloat(stopInp.value) || parseFloat(stopPrice);
      if (d.p1) d.p1.price = ep;
      d.targetHeight = Math.abs(tp - ep) / 1.5;
      d.stopHeight = Math.abs(ep - sp) / 1.5;
      this.triggerUpdate();
    };

    [entryInp, targetInp, stopInp].forEach(inp => inp.addEventListener('input', updatePos));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 12. INDICATOR INPUTS & STYLE TABS
  // ─────────────────────────────────────────────────────────────────────────
  renderIndicatorInputsTab(container, ind) {
    const t = ind.type.toLowerCase();

    if (t === 'bb') {
      container.innerHTML = `
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Length</span>
          <input type="number" class="tv-number-input" id="indLength" value="${ind.period || 20}" />
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Source</span>
          ${this.createSelect('indSource', ind.source || 'close', [
            { val: 'close', label: 'Close' }, { val: 'open', label: 'Open' }, { val: 'high', label: 'High' }, { val: 'low', label: 'Low' }, { val: 'hl2', label: '(H+L)/2' }
          ])}
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">StdDev</span>
          <input type="number" step="0.1" class="tv-number-input" id="indStdDev" value="${ind.stdDev || 2.0}" />
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Offset</span>
          <input type="number" class="tv-number-input" id="indOffset" value="0" />
        </div>
      `;

      container.querySelector('#indLength').addEventListener('input', (e) => {
        ind.period = parseInt(e.target.value, 10) || 20;
        this.triggerUpdate();
      });
      container.querySelector('#indStdDev').addEventListener('input', (e) => {
        ind.stdDev = parseFloat(e.target.value) || 2.0;
        this.triggerUpdate();
      });
      this.attachSelectListeners(container, (id, val) => {
        if (id === 'indSource') ind.source = val;
      });
      return;
    }

    if (t === 'rsi') {
      container.innerHTML = `
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">RSI Length</span>
          <input type="number" class="tv-number-input" id="indRsiLength" value="${ind.period || 14}" />
        </div>
        <div class="tv-dialog-row">
          <span class="tv-dialog-label">Source</span>
          ${this.createSelect('indRsiSource', ind.source || 'close', [
            { val: 'close', label: 'Close' }, { val: 'open', label: 'Open' }
          ])}
        </div>
      `;

      container.querySelector('#indRsiLength').addEventListener('input', (e) => {
        ind.period = parseInt(e.target.value, 10) || 14;
        this.triggerUpdate();
      });
      this.attachSelectListeners(container, (id, val) => {
        if (id === 'indRsiSource') ind.source = val;
      });
      return;
    }

    // Default Moving Averages (SMA / EMA)
    container.innerHTML = `
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Length</span>
        <input type="number" class="tv-number-input" id="indLen" value="${ind.period || 20}" />
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Source</span>
        ${this.createSelect('indSrc', ind.source || 'close', [
          { val: 'close', label: 'Close' }, { val: 'open', label: 'Open' }, { val: 'high', label: 'High' }, { val: 'low', label: 'Low' }
        ])}
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Offset</span>
        <input type="number" class="tv-number-input" id="indOff" value="0" />
      </div>
    `;

    container.querySelector('#indLen').addEventListener('input', (e) => {
      ind.period = parseInt(e.target.value, 10) || 20;
      this.triggerUpdate();
    });
    this.attachSelectListeners(container, (id, val) => {
      if (id === 'indSrc') ind.source = val;
    });
  }

  renderIndicatorStyleTab(container, ind) {
    container.innerHTML = `
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('indPlotCheck', ind.name || 'Plot', true)}
        </div>
        <div class="tv-dialog-row-right">
          ${this.createColorPicker('indColorBtn', ind.color || '#2962ff')}
          ${this.createSelect('indLineWidthSelect', ind.lineWidth || 2, [
            { val: 1, label: '1px' }, { val: 2, label: '2px' }, { val: 3, label: '3px' }, { val: 4, label: '4px' }
          ])}
          ${this.createSelect('indLineStyleSelect', 'solid', [
            { val: 'solid', label: '― Line' }, { val: 'stepline', label: 'Step line' }
          ])}
        </div>
      </div>
    `;

    this.attachCheckboxListeners(container);
    this.attachColorPickerListeners(container, (id, color) => {
      ind.color = color;
      if (ind.series) {
        try { ind.series.applyOptions({ color: color }); } catch (e) {}
      }
    });
    this.attachSelectListeners(container, (id, val) => {
      if (id === 'indLineWidthSelect') {
        ind.lineWidth = parseInt(val, 10);
        if (ind.series) {
          try { ind.series.applyOptions({ lineWidth: ind.lineWidth }); } catch (e) {}
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 13. CHART SETTINGS TABS (Symbol, Status line, Scales, Canvas)
  // ─────────────────────────────────────────────────────────────────────────
  renderChartSymbolTab(container) {
    container.innerHTML = `
      <div style="font-weight: 600; font-size: 13px; color: #787b86; text-transform: uppercase; margin-bottom: 6px;">Candlesticks</div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Body Up / Down</span>
        <div class="tv-dialog-row-right">
          ${this.createColorPicker('candleBodyUp', '#089981')}
          ${this.createColorPicker('candleBodyDown', '#f23645')}
        </div>
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Borders Up / Down</span>
        <div class="tv-dialog-row-right">
          ${this.createColorPicker('candleBorderUp', '#089981')}
          ${this.createColorPicker('candleBorderDown', '#f23645')}
        </div>
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Wicks Up / Down</span>
        <div class="tv-dialog-row-right">
          ${this.createColorPicker('candleWickUp', '#089981')}
          ${this.createColorPicker('candleWickDown', '#f23645')}
        </div>
      </div>
    `;

    this.attachColorPickerListeners(container, (id, color) => {
      if (!window.tradingChart || !window.tradingChart.candleSeries) return;
      const opts = {};
      if (id === 'candleBodyUp') opts.upColor = color;
      else if (id === 'candleBodyDown') opts.downColor = color;
      else if (id === 'candleBorderUp') opts.borderUpColor = color;
      else if (id === 'candleBorderDown') opts.borderDownColor = color;
      else if (id === 'candleWickUp') opts.wickUpColor = color;
      else if (id === 'candleWickDown') opts.wickDownColor = color;
      try {
        window.tradingChart.candleSeries.applyOptions(opts);
      } catch (e) {}
    });
  }

  renderChartStatusLineTab(container) {
    container.innerHTML = `
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('slSymbol', 'Symbol', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('slOpenMarket', 'Open market status', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('slOHLC', 'OHLC values', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('slBarChange', 'Bar change values', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('slIndicatorTitles', 'Indicator titles', true)}
        </div>
      </div>
    `;

    this.attachCheckboxListeners(container);
  }

  renderChartScalesTab(container) {
    container.innerHTML = `
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('scaleSymbolName', 'Symbol name label', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('scaleSymbolLastVal', 'Symbol last value label', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('scaleIndicatorLastVal', 'Indicator last value label', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('scaleCountdown', 'Countdown to bar close', true)}
        </div>
      </div>
    `;

    this.attachCheckboxListeners(container);
  }

  renderChartCanvasTab(container) {
    container.innerHTML = `
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Background</span>
        <div class="tv-dialog-row-right">
          ${this.createSelect('canvasBgType', 'Solid', [
            { val: 'Solid', label: 'Solid' }, { val: 'Gradient', label: 'Gradient' }
          ])}
          ${this.createColorPicker('canvasBgColor', '#ffffff')}
        </div>
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Grid lines</span>
        <div class="tv-dialog-row-right">
          ${this.createColorPicker('canvasGridColor', '#f0f3fa')}
          ${this.createSelect('canvasGridStyle', 'solid', [
            { val: 'solid', label: '― Solid' }, { val: 'dashed', label: '- - Dashed' }
          ])}
        </div>
      </div>
      <div class="tv-dialog-row">
        <span class="tv-dialog-label">Crosshair</span>
        <div class="tv-dialog-row-right">
          ${this.createColorPicker('canvasCrosshairColor', '#787b86')}
        </div>
      </div>
    `;

    this.attachSelectListeners(container);
    this.attachColorPickerListeners(container, (id, color) => {
      if (!window.tradingChart || !window.tradingChart.chart) return;
      try {
        if (id === 'canvasBgColor') {
          window.tradingChart.chart.applyOptions({
            layout: { background: { type: 'solid', color: color } }
          });
        } else if (id === 'canvasGridColor') {
          window.tradingChart.chart.applyOptions({
            grid: {
              vertLines: { color: color },
              horzLines: { color: color }
            }
          });
        }
      } catch (e) {}
    });
  }

  renderChartTradingTab(container) {
    container.innerHTML = `
      <div class="tv-settings-section-title">BUTTONS</div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('tradingBuySellButtons', 'Buy/Sell buttons', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('tradingInstantOrder', 'Instant order placement', false)}
        </div>
      </div>
      <div class="tv-settings-section-title" style="margin-top: 12px;">LINES & NOTIFICATIONS</div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('tradingPositionsLine', 'Positions', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('tradingOrdersLine', 'Orders', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('tradingExecutions', 'Execution notifications', true)}
        </div>
      </div>
    `;
    this.attachCheckboxListeners(container);
  }

  renderChartAlertsTab(container) {
    container.innerHTML = `
      <div class="tv-settings-section-title">ALERT LINES</div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('alertsShowLines', 'Alert lines', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('alertsShowTriggered', 'Triggered alert lines', true)}
        </div>
      </div>
      <div class="tv-settings-section-title" style="margin-top: 12px;">NOTIFICATIONS</div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('alertsPlaySound', 'Play sound on trigger', true)}
        </div>
      </div>
    `;
    this.attachCheckboxListeners(container);
  }

  renderChartEventsTab(container) {
    container.innerHTML = `
      <div class="tv-settings-section-title">CORPORATE ACTIONS & EVENTS</div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('eventsDividends', 'Dividends on chart ("D")', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('eventsSplits', 'Splits on chart ("S")', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('eventsEarnings', 'Earnings on chart ("E")', true)}
        </div>
      </div>
      <div class="tv-dialog-row">
        <div class="tv-dialog-row-left">
          ${this.createCheckbox('eventsNews', 'News events ("N")', true)}
        </div>
      </div>
    `;
    this.attachCheckboxListeners(container);
  }
  // 14. SAVE / CANCEL / RESET / LIVE RECALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  triggerUpdate() {
    if (this.targetType === 'drawing') {
      if (window.tvDrawingEngine) {
        window.tvDrawingEngine.redraw();
        window.tvDrawingEngine.syncFloatingToolbar();
      }
    } else if (this.targetType === 'indicator') {
      if (window.tradingChart && window.tradingChart.recalcIndicator) {
        window.tradingChart.recalcIndicator(this.activeTarget);
      }
    }
  }

  save() {
    this.close();
  }

  cancel() {
    if (this.originalState && this.activeTarget) {
      if (this.targetType === 'drawing') {
        Object.assign(this.activeTarget, this.originalState);
        this.triggerUpdate();
      } else if (this.targetType === 'indicator') {
        Object.assign(this.activeTarget, this.originalState);
        this.triggerUpdate();
      }
    }
    this.close();
  }

  resetDefaults() {
    if (this.targetType === 'drawing' && this.activeTarget) {
      this.activeTarget.style.color = '#2962ff';
      this.activeTarget.style.width = 2;
      this.activeTarget.style.style = 'solid';
      this.activeTarget.style.showTrendLine = true;
      this.activeTarget.style.showBackground = true;
      this.activeTarget.style.bgOpacity = 0.08;
      this.activeTarget.style.extendRight = false;
      this.activeTarget.style.reverse = false;
      this.renderTabBody();
      this.triggerUpdate();
    }
  }
}

// Instantiate and expose globally
window.tvSettingsDialog = new TVSettingsDialog();
