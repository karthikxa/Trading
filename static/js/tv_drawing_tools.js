/**
 * TradingView Genuine Drawing Tools & Floating Format Toolbar Engine
 * Powered by TradingView Lightweight Charts Coordinate Sync & Authentic Canvas Overlay
 */

class TVDrawingEngine {
  constructor(chartContainerId, sidebarSelector) {
    this.containerId = chartContainerId;
    this.container = document.getElementById(chartContainerId);
    this.sidebar = document.querySelector(sidebarSelector) || document.getElementById('drawing-toolbar');
    window.drawingEngine = window.tvDrawingEngine = this;

    this.icons = {};
    this.activeTool = 'crosshair';
    this.activeDrawing = null;
    this.drawings = [];
    
    // Placement state
    this.isDrawing = false;
    this.isPlacing = false;
    this.pendingDrawing = null;
    this.placementStep = 0; // 0: idle, 1: point 1 placed, 2: point 2 placed (for 3-pt tools)
    this.startPoint = null;
    this.currentPoint = null;

    // Handle dragging state
    this.draggingHandle = null; // { drawing, handleKey: 'p1'|'p2'|'p3'|'target'|'stop' }
    this.isDraggingBody = false;
    this.dragStart = null;
    this.hoverHandle = null;

    // Tool flags
    this.magnetMode = false;
    this.stayInDrawingMode = false;
    this.lockAll = false;
    this.hideAll = false;

    // Default drawing style options matching TradingView
    this.currentStyle = {
      color: '#2962ff',
      width: 2,
      style: 'solid', // solid, dashed, dotted
      opacity: 1.0,
      fillColor: 'rgba(41, 98, 255, 0.12)',
      locked: false,
    };

    this.palette = [
      '#131722', '#787b86', '#2962ff', '#089981', '#f23645',
      '#ff9800', '#ffeb3b', '#e91e63', '#9c27b0', '#00bcd4'
    ];

    this.init();
  }

  async init() {
    this.ensureContainer();

    try {
      const res = await fetch('/static/tv_drawing_tool_icons.json');
      if (res.ok) {
        this.icons = await res.json();
      }
    } catch (e) {
      console.warn('Could not load tv_drawing_tool_icons.json:', e);
    }

    this.createCanvasOverlay();
    this.createFloatingToolbar();
    this.setupSidebarTools();
    this.setupEvents();
    this.setupChartSync();
  }

  ensureContainer() {
    if (!this.container) {
      this.container = document.getElementById(this.containerId) || document.querySelector('.chart-markup-table') || document.body;
    }
  }

  // ── Overlay Canvas for Interactive Drawings ──
  createCanvasOverlay() {
    this.ensureContainer();
    if (!this.container) return;

    // Check if canvas already exists
    const existing = document.querySelector('.tv-drawing-canvas-overlay');
    if (existing) {
      this.canvas = existing;
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      return;
    }

    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tv-drawing-canvas-overlay';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none'; // toggled when drawing or interacting
    this.canvas.style.zIndex = '25';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => this.resizeCanvas());
      ro.observe(this.container);
    }
  }

  resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.syncFromChart();
    this.redraw();
  }

  // ── Lightweight Charts Coordinate Synchronization ──
  setupChartSync() {
    const checkChart = () => {
      if (window.tradingChart && window.tradingChart.chart) {
        try {
          window.tradingChart.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            this.syncFromChart();
          });
        } catch (e) {
          console.warn('Could not hook timeScale change:', e);
        }
      } else {
        setTimeout(checkChart, 250);
      }
    };
    checkChart();
  }

  chartCoordsFromPixel(x, y) {
    let price = null;
    let logical = null;
    if (window.tradingChart) {
      if (window.tradingChart.candleSeries) {
        try { price = window.tradingChart.candleSeries.coordinateToPrice(y); } catch (e) {}
      }
      if (window.tradingChart.chart) {
        try { logical = window.tradingChart.chart.timeScale().coordinateToLogical(x); } catch (e) {}
      }
    }
    // Fallback estimation if chart is not yet initialized
    if (price === null || isNaN(price)) {
      price = 23146.15 + (260 - y) * 1.5;
    }
    if (logical === null || isNaN(logical)) {
      logical = Math.round(x / 10);
    }
    return { price, logical };
  }

  pixelFromChartCoords(price, logical) {
    let x = null;
    let y = null;
    if (window.tradingChart) {
      if (window.tradingChart.candleSeries && price !== null && price !== undefined) {
        try { y = window.tradingChart.candleSeries.priceToCoordinate(price); } catch (e) {}
      }
      if (window.tradingChart.chart && logical !== null && logical !== undefined) {
        try { x = window.tradingChart.chart.timeScale().logicalToCoordinate(logical); } catch (e) {}
      }
    }
    return { x, y };
  }

  syncPointToChart(pt) {
    if (!pt) return;
    const chartCoords = this.chartCoordsFromPixel(pt.x, pt.y);
    pt.price = chartCoords.price;
    pt.logical = chartCoords.logical;
  }

  syncFromChart() {
    if (!window.tradingChart || !window.tradingChart.candleSeries || !window.tradingChart.chart) return;

    this.drawings.forEach(d => {
      ['p', 'p1', 'p2', 'p3'].forEach(k => {
        if (d[k] && d[k].price !== undefined && d[k].logical !== undefined) {
          const px = this.pixelFromChartCoords(d[k].price, d[k].logical);
          if (px.x !== null && !isNaN(px.x)) d[k].x = px.x;
          if (px.y !== null && !isNaN(px.y)) d[k].y = px.y;
        }
      });
      if (d.type === 'horzline' && d.price !== undefined) {
        const px = this.pixelFromChartCoords(d.price, 0);
        if (px.y !== null && !isNaN(px.y)) d.y = px.y;
      }
      if (d.type === 'vertline' && d.logical !== undefined) {
        const px = this.pixelFromChartCoords(23000, d.logical);
        if (px.x !== null && !isNaN(px.x)) d.x = px.x;
      }
      if (d.type === 'crossline') {
        if (d.price !== undefined) {
          const px = this.pixelFromChartCoords(d.price, 0);
          if (px.y !== null && !isNaN(px.y)) d.y = px.y;
        }
        if (d.logical !== undefined) {
          const px = this.pixelFromChartCoords(23000, d.logical);
          if (px.x !== null && !isNaN(px.x)) d.x = px.x;
        }
      }
    });

    this.redraw();
  }

  getCurrentPrice(y) {
    if (window.tradingChart && window.tradingChart.candleSeries) {
      try {
        const p = window.tradingChart.candleSeries.coordinateToPrice(y);
        if (p !== null && !isNaN(p)) return p;
      } catch (e) {}
    }
    return 23146.15 + (260 - y) * 1.5;
  }

  formatPrice(p) {
    if (p === null || p === undefined || isNaN(p)) return '23,146.15';
    return Number(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Setup Left Sidebar ──
  setupSidebarTools() {
    if (!this.sidebar) return;

    const existingButtons = this.sidebar.querySelectorAll('.tv-tool-btn, .button-Pa6R9wGK');
    if (existingButtons.length > 0) {
      existingButtons.forEach(btn => {
        const tool = btn.getAttribute('data-tool');
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (tool === 'magnet') {
            this.magnetMode = !this.magnetMode;
            btn.classList.toggle('active-dark', this.magnetMode);
            btn.classList.toggle('isActive-zm3YRUFG', this.magnetMode);
          } else if (tool === 'stay') {
            this.stayInDrawingMode = !this.stayInDrawingMode;
            btn.classList.toggle('active-dark', this.stayInDrawingMode);
            btn.classList.toggle('isActive-zm3YRUFG', this.stayInDrawingMode);
          } else if (tool === 'lock') {
            this.lockAll = !this.lockAll;
            btn.classList.toggle('active', this.lockAll);
            btn.classList.toggle('isActive-zm3YRUFG', this.lockAll);
          } else if (tool === 'hide') {
            this.hideAll = !this.hideAll;
            btn.classList.toggle('active', this.hideAll);
            btn.classList.toggle('isActive-zm3YRUFG', this.hideAll);
            this.redraw();
          } else if (tool === 'trash') {
            this.drawings = [];
            this.activeDrawing = null;
            this.redraw();
            this.hideFloatingToolbar();
            window.updateObjectTreeAndDataWindow?.();
          } else if (tool) {
            existingButtons.forEach(b => {
              const bTool = b.getAttribute('data-tool');
              if (!['magnet', 'stay', 'lock', 'hide', 'trash'].includes(bTool)) {
                b.classList.remove('active', 'isActive-zm3YRUFG');
              }
            });
            btn.classList.add('active', 'isActive-zm3YRUFG');
            this.selectTool(tool, btn);
          }
        });
      });
    }
  }

  getSvg(name) {
    if (this.icons && this.icons[name]) {
      return this.icons[name];
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/></svg>`;
  }

  selectTool(toolId, btnElement) {
    if (toolId === 'fib') toolId = 'fibret';
    this.activeTool = toolId;
    this.cancelPending();

    // Visual button highlighting
    document.querySelectorAll('.tv-tool-btn, .button-Pa6R9wGK').forEach(b => b.classList.remove('active', 'isActive-zm3YRUFG'));
    if (btnElement) btnElement.classList.add('active', 'isActive-zm3YRUFG');

    // Update canvas pointer-events
    if (['crosshair', 'dot', 'arrow_cursor'].includes(toolId)) {
      this.canvas.style.pointerEvents = this.activeDrawing ? 'auto' : 'none';
      this.canvas.style.cursor = 'default';
      if (!this.activeDrawing) this.hideFloatingToolbar();
    } else {
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.cursor = toolId === 'eraser' ? 'cell' : (toolId === 'text' ? 'text' : 'crosshair');
      this.hideFloatingToolbar();
    }
  }

  setEmojiTool(emoji) {
    this.activeTool = 'emoji';
    this.activeEmoji = emoji;
    this.cancelPending();
    if (this.canvas) {
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.cursor = 'crosshair';
    }
    this.hideFloatingToolbar();
  }

  cancelPending() {
    this.isPlacing = false;
    this.pendingDrawing = null;
    this.placementStep = 0;
    this.isDrawing = false;
    this.redraw();
  }

  // ── Authentic TradingView Floating Format Toolbar ──
  createFloatingToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'tv-floating-drawing-toolbar';
    this.toolbar.style.display = 'none';

    this.toolbar.innerHTML = `
      <div class="tv-ftb-handle" title="Drag toolbar">
        <svg width="6" height="14" viewBox="0 0 6 14"><circle cx="1.5" cy="2" r="1.2" fill="#787b86"/><circle cx="4.5" cy="2" r="1.2" fill="#787b86"/><circle cx="1.5" cy="7" r="1.2" fill="#787b86"/><circle cx="4.5" cy="7" r="1.2" fill="#787b86"/><circle cx="1.5" cy="12" r="1.2" fill="#787b86"/><circle cx="4.5" cy="12" r="1.2" fill="#787b86"/></svg>
      </div>

      <!-- Line Color Swatch -->
      <div class="tv-ftb-color-btn" id="ftbColorBtn" title="Line color">
        <span class="tv-ftb-color-indicator" id="ftbColorIndicator" style="background-color: #2962ff;"></span>
        <div class="tv-ftb-palette" id="ftbPalette">
          ${this.palette.map(c => `
            <div class="tv-palette-cell" data-color="${c}" style="background-color: ${c};"></div>
          `).join('')}
        </div>
      </div>

      <!-- Line Width Dropdown -->
      <div class="tv-ftb-dropdown" id="ftbWidthDropdown" title="Line width">
        <span id="ftbWidthDisplay" style="font-size: 11px; font-weight: 600;">2px</span>
        <div class="tv-ftb-menu" id="ftbWidthMenu">
          <div class="tv-ftb-menu-item" data-width="1"><span class="line-sample" style="height: 1px;"></span> 1px</div>
          <div class="tv-ftb-menu-item" data-width="2"><span class="line-sample" style="height: 2px;"></span> 2px</div>
          <div class="tv-ftb-menu-item" data-width="3"><span class="line-sample" style="height: 3px;"></span> 3px</div>
          <div class="tv-ftb-menu-item" data-width="4"><span class="line-sample" style="height: 4px;"></span> 4px</div>
        </div>
      </div>

      <!-- Line Style Dropdown -->
      <div class="tv-ftb-dropdown" id="ftbStyleDropdown" title="Line style">
        <span id="ftbStyleDisplay">―</span>
        <div class="tv-ftb-menu" id="ftbStyleMenu">
          <div class="tv-ftb-menu-item" data-style="solid">― Solid</div>
          <div class="tv-ftb-menu-item" data-style="dashed">- - Dashed</div>
          <div class="tv-ftb-menu-item" data-style="dotted">··· Dotted</div>
        </div>
      </div>

      <div class="tv-ftb-sep"></div>

      <!-- Settings Button (Hexagonal Nut Icon matching Image 2) -->
      <button class="tv-ftb-icon-btn" id="ftbSettingsBtn" title="Settings (double-click)">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3">
          <polygon points="9,2.5 14.5,5.6 14.5,12.4 9,15.5 3.5,12.4 3.5,5.6" stroke-linejoin="round"/>
          <circle cx="9" cy="9" r="2.8"/>
        </svg>
      </button>

      <!-- Lock Toggle (Outline Padlock matching Image 2) -->
      <button class="tv-ftb-icon-btn" id="ftbLockBtn" title="Lock drawing">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4.5" y="8" width="9" height="7.5" rx="1.5"/>
          <path d="M6.5 8V5.5a2.5 2.5 0 0 1 5 0V8"/>
        </svg>
      </button>

      <!-- Delete Button (Outline Trash Can matching Image 2) -->
      <button class="tv-ftb-icon-btn" id="ftbDeleteBtn" title="Delete (Delete/Backspace)">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 5.5h10M5.5 5.5l.7 9a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-9M7.5 5.5V3.8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v1.7"/>
        </svg>
      </button>
    `;

    document.body.appendChild(this.toolbar);

    // Draggable toolbar handle
    this.makeDraggable(this.toolbar, this.toolbar.querySelector('.tv-ftb-handle'));

    // Color picker
    const colorBtn = this.toolbar.querySelector('#ftbColorBtn');
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.tvSettingsDialog) {
        window.tvSettingsDialog.openColorPickerPopover(colorBtn, (c, a) => {
          this.currentStyle.color = c;
          this.currentStyle.fillColor = `${c}22`;
          this.toolbar.querySelector('#ftbColorIndicator').style.backgroundColor = c;
          if (this.activeDrawing) {
            this.activeDrawing.style.color = c;
            this.activeDrawing.style.fillColor = `${c}22`;
            this.redraw();
          }
        });
      }
    });

    // Width selector
    const widthBtn = this.toolbar.querySelector('#ftbWidthDropdown');
    const widthMenu = this.toolbar.querySelector('#ftbWidthMenu');
    widthBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      widthMenu.classList.toggle('open');
    });

    widthMenu.querySelectorAll('.tv-ftb-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const w = parseInt(item.getAttribute('data-width'), 10);
        this.currentStyle.width = w;
        this.toolbar.querySelector('#ftbWidthDisplay').textContent = `${w}px`;
        widthMenu.classList.remove('open');
        if (this.activeDrawing) {
          this.activeDrawing.style.width = w;
          this.redraw();
        }
      });
    });

    // Style selector
    const styleBtn = this.toolbar.querySelector('#ftbStyleDropdown');
    const styleMenu = this.toolbar.querySelector('#ftbStyleMenu');
    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      styleMenu.classList.toggle('open');
    });

    styleMenu.querySelectorAll('.tv-ftb-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const st = item.getAttribute('data-style');
        this.currentStyle.style = st;
        this.toolbar.querySelector('#ftbStyleDisplay').textContent = st === 'solid' ? '―' : st === 'dashed' ? '- -' : '···';
        styleMenu.classList.remove('open');
        if (this.activeDrawing) {
          this.activeDrawing.style.style = st;
          this.redraw();
        }
      });
    });

    // Settings button
    const settingsBtn = this.toolbar.querySelector('#ftbSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeDrawing && window.tvSettingsDialog) {
          window.tvSettingsDialog.open(this.activeDrawing);
        } else if (window.tvSettingsDialog) {
          window.tvSettingsDialog.openChartSettings();
        }
      });
    }

    // Lock toggle
    this.toolbar.querySelector('#ftbLockBtn').addEventListener('click', () => {
      if (this.activeDrawing) {
        this.activeDrawing.locked = !this.activeDrawing.locked;
        this.toolbar.querySelector('#ftbLockBtn').classList.toggle('active', this.activeDrawing.locked);
      }
    });

    // Delete active drawing
    this.toolbar.querySelector('#ftbDeleteBtn').addEventListener('click', () => {
      if (this.activeDrawing) {
        this.drawings = this.drawings.filter(d => d !== this.activeDrawing);
        this.activeDrawing = null;
        this.redraw();
        this.hideFloatingToolbar();
        window.updateObjectTreeAndDataWindow?.();
      }
    });

    document.addEventListener('click', () => {
      const p = this.toolbar.querySelector('#ftbPalette');
      if (p) p.classList.remove('open');
      if (widthMenu) widthMenu.classList.remove('open');
      if (styleMenu) styleMenu.classList.remove('open');
    });
  }

  syncFloatingToolbar() {
    if (!this.toolbar || !this.activeDrawing) return;
    const style = this.activeDrawing.style || {};
    const colorInd = this.toolbar.querySelector('#ftbColorIndicator');
    if (colorInd && style.color) colorInd.style.backgroundColor = style.color;
    const widthDisp = this.toolbar.querySelector('#ftbWidthDisplay');
    if (widthDisp && style.width) widthDisp.textContent = `${style.width}px`;
    const styleDisp = this.toolbar.querySelector('#ftbStyleDisplay');
    if (styleDisp && style.style) {
      styleDisp.textContent = style.style === 'dashed' ? '- -' : (style.style === 'dotted' ? '···' : '―');
    }
    const lockBtn = this.toolbar.querySelector('#ftbLockBtn');
    if (lockBtn) lockBtn.classList.toggle('active', !!this.activeDrawing.locked);
  }

  showFloatingToolbar(toolId, x, y) {
    if (!this.toolbar) return;
    if (x !== undefined && y !== undefined) {
      this.toolbar.style.left = `${Math.max(60, Math.min(window.innerWidth - 280, x - 100))}px`;
      this.toolbar.style.top = `${Math.max(60, y - 55)}px`;
      this.toolbar.style.bottom = 'auto';
    } else {
      this.toolbar.style.left = '65px';
      this.toolbar.style.top = 'auto';
      this.toolbar.style.bottom = '45px';
    }
    this.toolbar.style.display = 'flex';
    this.syncFloatingToolbar();
  }

  hideFloatingToolbar() {
    if (this.toolbar) this.toolbar.style.display = 'none';
  }

  makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    (handle || element).onmousedown = (e) => {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = () => {
        document.onmouseup = null;
        document.onmousemove = null;
      };
      document.onmousemove = (me) => {
        me.preventDefault();
        pos1 = pos3 - me.clientX;
        pos2 = pos4 - me.clientY;
        pos3 = me.clientX;
        pos4 = me.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
      };
    };
  }

  // ── Events Setup ──
  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    // Dynamic Hover Hit-Testing on Chart Container:
    // Ensures drawings & handles are detected immediately on mouseover, flipping pointerEvents to 'auto'
    const onContainerHover = (e) => {
      if (!this.canvas) return;
      const coords = this.getCanvasCoords(e);

      // If user is currently dragging an anchor handle, body, or placing a drawing
      if (this.draggingHandle || this.isDraggingBody || this.isPlacing || this.isDrawing) {
        this.canvas.style.pointerEvents = 'auto';
        return;
      }

      // If an active drawing tool is selected (not cursor crosshair)
      if (!['crosshair', 'dot', 'arrow_cursor'].includes(this.activeTool)) {
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.cursor = this.activeTool === 'eraser' ? 'cell' : (this.activeTool === 'text' ? 'text' : 'crosshair');
        return;
      }

      // In cursor mode: test if mouse is over any drawing handle or drawing body
      const handle = this.getHandleAt(coords);
      if (handle) {
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.cursor = 'grab';
        return;
      }

      const hit = this.hitTest(coords);
      if (hit) {
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.cursor = (hit === this.activeDrawing && !hit.locked) ? 'move' : 'pointer';
        return;
      }

      // Not over any drawing: allow chart dragging and zooming!
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.cursor = 'default';
    };

    if (this.container) {
      this.container.addEventListener('mousemove', onContainerHover);
      this.container.addEventListener('pointermove', onContainerHover);
      this.container.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    }

    // Window level listeners to ensure dragging is smooth and never gets interrupted
    window.addEventListener('mousemove', (e) => {
      if (this.draggingHandle || this.isDraggingBody || (this.isDrawing && this.currentDrawing)) {
        this.onMouseMove(e);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.draggingHandle || this.isDraggingBody || this.isDrawing) {
        this.onMouseUp(e);
      }
    });

    // Cancel on Escape or delete on Delete/Backspace
    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        this.cancelPending();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.activeDrawing && !this.activeDrawing.locked) {
        this.drawings = this.drawings.filter(d => d !== this.activeDrawing);
        this.activeDrawing = null;
        this.hideFloatingToolbar();
        this.redraw();
        window.updateObjectTreeAndDataWindow?.();
      }
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // ── Hit Testing & Handle Detection ──
  getHandleAt(coords) {
    const threshold = 10;
    if (!this.activeDrawing || this.activeDrawing.locked) return null;

    const d = this.activeDrawing;
    const checkPoint = (pt, key) => {
      if (pt && Math.hypot(coords.x - pt.x, coords.y - pt.y) <= threshold) {
        return { drawing: d, handleKey: key };
      }
      return null;
    };

    if (d.p1) { const h = checkPoint(d.p1, 'p1'); if (h) return h; }
    if (d.p2) { const h = checkPoint(d.p2, 'p2'); if (h) return h; }
    if (d.p3) { const h = checkPoint(d.p3, 'p3'); if (h) return h; }
    if (d.p) { const h = checkPoint(d.p, 'p'); if (h) return h; }

    // Position tool handles
    if (d.type === 'longposition' || d.type === 'shortposition') {
      const isLong = d.type === 'longposition';
      const targetY = isLong ? d.p1.y - (d.targetHeight || 70) : d.p1.y + (d.targetHeight || 70);
      const stopY = isLong ? d.p1.y + (d.stopHeight || 35) : d.p1.y - (d.stopHeight || 35);
      const midX = (d.p1.x + (d.p2 ? d.p2.x : d.p1.x + 120)) / 2;

      if (Math.hypot(coords.x - midX, coords.y - targetY) <= threshold) {
        return { drawing: d, handleKey: 'target' };
      }
      if (Math.hypot(coords.x - midX, coords.y - stopY) <= threshold) {
        return { drawing: d, handleKey: 'stop' };
      }
    }

    return null;
  }

  hitTest(coords) {
    const threshold = 12;

    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (d.type === 'text') {
        const tw = Math.max(50, (d.text || '').length * 9);
        if (coords.x >= d.p.x - 6 && coords.x <= d.p.x + tw + 10 &&
            coords.y >= d.p.y - 18 && coords.y <= d.p.y + 10) {
          return d;
        }
      } else if (d.type === 'horzline') {
        if (Math.abs(coords.y - d.y) < threshold) return d;
      } else if (d.type === 'vertline') {
        if (Math.abs(coords.x - d.x) < threshold) return d;
      } else if (d.type === 'crossline') {
        if (Math.abs(coords.x - d.x) < threshold || Math.abs(coords.y - d.y) < threshold) return d;
      } else if (d.type === 'rectangle' || d.type === 'measure') {
        const x1 = Math.min(d.p1.x, d.p2.x), x2 = Math.max(d.p1.x, d.p2.x);
        const y1 = Math.min(d.p1.y, d.p2.y), y2 = Math.max(d.p1.y, d.p2.y);
        if (coords.x >= x1 - 6 && coords.x <= x2 + 6 && coords.y >= y1 - 6 && coords.y <= y2 + 6) return d;
      } else if (d.type === 'fibret' || d.type === 'fib') {
        const x1 = (d.style && d.style.extendLeft) ? 0 : Math.min(d.p1.x, d.p2.x) - 10;
        const x2 = (d.style && d.style.extendRight) ? (this.canvas ? this.canvas.width : 4000) : Math.max(d.p1.x, d.p2.x) + 180;
        const y1 = Math.min(d.p1.y, d.p2.y) - 20, y2 = Math.max(d.p1.y, d.p2.y) + 20;
        if (coords.x >= x1 && coords.x <= x2 && coords.y >= y1 && coords.y <= y2) return d;
      } else if (d.type === 'longposition' || d.type === 'shortposition') {
        const x1 = Math.min(d.p1.x, d.p2.x), x2 = Math.max(d.p1.x, d.p2.x);
        const isLong = d.type === 'longposition';
        const topY = isLong ? d.p1.y - (d.targetHeight || 70) : d.p1.y - (d.stopHeight || 35);
        const botY = isLong ? d.p1.y + (d.stopHeight || 35) : d.p1.y + (d.targetHeight || 70);
        if (coords.x >= x1 - 6 && coords.x <= x2 + 6 && coords.y >= topY - 6 && coords.y <= botY + 6) return d;
      } else if (d.p1 && d.p2) {
        if (d.type === 'extended' || (d.style && d.style.extendLeft && d.style.extendRight)) {
          if (this.distToLine(coords, d.p1, d.p2) < threshold) return d;
        } else if (d.type === 'ray' || d.type === 'horzray' || (d.style && d.style.extendRight)) {
          if (this.distToRay(coords, d.p1, d.p2) < threshold) return d;
        } else if (d.style && d.style.extendLeft) {
          if (this.distToRay(coords, d.p2, d.p1) < threshold) return d;
        } else {
          const dist = this.distToSegment(coords, d.p1, d.p2);
          if (dist < threshold) return d;
        }
      } else if (d.p) {
        if (Math.hypot(coords.x - d.p.x, coords.y - d.p.y) < 28) return d;
      } else if (d.points && d.points.length > 0) {
        const brushThresh = threshold + ((d.style && d.style.width) || 2);
        for (let i = 0; i < d.points.length; i++) {
          const pt = d.points[i];
          if (Math.hypot(coords.x - pt.x, coords.y - pt.y) <= brushThresh) {
            return d;
          }
        }
      }
    }
    return null;
  }

  distToSegment(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  distToRay(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, t);
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  distToLine(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  drawArrowHead(ctx, fromX, fromY, toX, toY, color) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - 14 * Math.cos(angle - Math.PI / 6), toY - 14 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - 14 * Math.cos(angle + Math.PI / 6), toY - 14 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Inline Text Editor ──
  spawnInlineTextEditor(x, y, existingDrawing = null) {
    const old = document.querySelector('.tv-canvas-text-editor');
    if (old) old.remove();

    const editor = document.createElement('div');
    editor.className = 'tv-canvas-text-editor';
    editor.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${Math.max(10, y - 16)}px;
      z-index: 1000;
      display: flex;
      align-items: center;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type text here...';
    input.value = existingDrawing ? existingDrawing.text : '';
    input.style.cssText = `
      background: #ffffff;
      color: ${(existingDrawing && existingDrawing.style.color) || this.currentStyle.color || '#131722'};
      border: 1.5px solid #2962ff;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif;
      font-weight: 500;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      outline: none;
      min-width: 140px;
    `;

    editor.appendChild(input);
    const parent = this.canvas.parentElement || this.container || document.body;
    parent.appendChild(editor);

    input.focus();
    input.select();

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const val = input.value.trim();
      if (val) {
        if (existingDrawing) {
          existingDrawing.text = val;
          this.activeDrawing = existingDrawing;
        } else {
          const pt = { x, y };
          this.syncPointToChart(pt);
          const newD = {
            id: Date.now(),
            type: 'text',
            text: val,
            p: pt,
            style: { ...this.currentStyle, fontSize: 14, color: this.currentStyle.color || '#131722' }
          };
          this.drawings.push(newD);
          this.activeDrawing = newD;
        }
        this.redraw();
        this.showFloatingToolbar('text', x, y);
        window.updateObjectTreeAndDataWindow?.();
      }
      editor.remove();
      if (!this.stayInDrawingMode && !existingDrawing) {
        this.selectTool('crosshair');
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        committed = true;
        editor.remove();
      }
    });

    input.addEventListener('blur', () => setTimeout(commit, 140));
  }

  onDoubleClick(e) {
    const coords = this.getCanvasCoords(e);
    const hit = this.hitTest(coords);
    if (hit) {
      if (hit.type === 'text') {
        this.spawnInlineTextEditor(hit.p.x, hit.p.y, hit);
      } else if (window.tvSettingsDialog) {
        window.tvSettingsDialog.open(hit);
      }
    } else {
      if (window.tvSettingsDialog) {
        window.tvSettingsDialog.openChartSettings();
      }
    }
  }

  // ── Mouse Interaction Handling ──
  onMouseDown(e) {
    const coords = this.getCanvasCoords(e);

    // 1. Eraser Tool
    if (this.activeTool === 'eraser') {
      const hit = this.hitTest(coords);
      if (hit) {
        this.drawings = this.drawings.filter(d => d !== hit);
        if (this.activeDrawing === hit) this.activeDrawing = null;
        this.redraw();
        window.updateObjectTreeAndDataWindow?.();
      }
      return;
    }

    // 2. Text Tool
    if (this.activeTool === 'text') {
      this.spawnInlineTextEditor(coords.x, coords.y);
      return;
    }

    // 3. Check if clicking on an anchor handle of the active drawing
    const handleHit = this.getHandleAt(coords);
    if (handleHit) {
      this.draggingHandle = handleHit;
      this.dragStart = { x: coords.x, y: coords.y };
      return;
    }

    // 4. Cursor Selection Mode
    if (['crosshair', 'dot', 'arrow_cursor'].includes(this.activeTool)) {
      const hit = this.hitTest(coords);
      if (hit) {
        this.activeDrawing = hit;
        this.isDraggingBody = true;
        this.dragStart = { x: coords.x, y: coords.y };
        this.showFloatingToolbar(hit.type, coords.x, coords.y);
        this.canvas.style.pointerEvents = 'auto';
        this.redraw();
      } else {
        this.activeDrawing = null;
        this.hideFloatingToolbar();
        this.canvas.style.pointerEvents = 'none';
        this.redraw();
      }
      return;
    }

    // 5. Single-click tools (Horizontal Line, Vertical Line, Cross Line, Emoji)
    if (this.activeTool === 'horzline') {
      const price = this.getCurrentPrice(coords.y);
      const d = { id: Date.now(), type: 'horzline', y: coords.y, price, style: { ...this.currentStyle } };
      this.drawings.push(d);
      this.activeDrawing = d;
      this.finalizeToolAction(d, coords);
      return;
    }

    if (this.activeTool === 'vertline') {
      const chartC = this.chartCoordsFromPixel(coords.x, coords.y);
      const d = { id: Date.now(), type: 'vertline', x: coords.x, logical: chartC.logical, style: { ...this.currentStyle } };
      this.drawings.push(d);
      this.activeDrawing = d;
      this.finalizeToolAction(d, coords);
      return;
    }

    if (this.activeTool === 'crossline') {
      const chartC = this.chartCoordsFromPixel(coords.x, coords.y);
      const d = { id: Date.now(), type: 'crossline', x: coords.x, y: coords.y, price: chartC.price, logical: chartC.logical, style: { ...this.currentStyle } };
      this.drawings.push(d);
      this.activeDrawing = d;
      this.finalizeToolAction(d, coords);
      return;
    }

    if (['emoji', 'icon', 'sticker'].includes(this.activeTool)) {
      const pt = { x: coords.x, y: coords.y };
      this.syncPointToChart(pt);
      const d = { id: Date.now(), type: 'emoji', emoji: this.activeEmoji || '🦄', p: pt, size: 36, style: { ...this.currentStyle } };
      this.drawings.push(d);
      this.activeDrawing = d;
      this.finalizeToolAction(d, coords);
      return;
    }

    // 6. Freehand Brush & Highlighter
    if (this.activeTool === 'brush' || this.activeTool === 'highlighter') {
      this.isDrawing = true;
      this.currentDrawing = {
        id: Date.now(),
        type: this.activeTool,
        points: [coords],
        style: { ...this.currentStyle, width: this.activeTool === 'highlighter' ? 10 : this.currentStyle.width, opacity: this.activeTool === 'highlighter' ? 0.35 : 1 }
      };
      return;
    }

    // 7. Multi-Point / Two-Click Tools
    // 3-Point Tools: parallelchannel, pitchfork, trendfibext, triangle
    const is3Point = ['parallelchannel', 'pitchfork', 'trendfibext', 'triangle'].includes(this.activeTool);

    if (!this.isPlacing) {
      // Step 1: Anchor point 1 set
      const p1 = { x: coords.x, y: coords.y };
      this.syncPointToChart(p1);

      this.pendingDrawing = {
        id: Date.now(),
        type: this.activeTool,
        p1: p1,
        p2: { x: coords.x, y: coords.y },
        style: { ...this.currentStyle }
      };
      this.isPlacing = true;
      this.placementStep = 1;
      this.startPoint = coords;
      this.isDrawing = true;
    } else if (this.placementStep === 1) {
      // Step 2: Anchor point 2 set
      const p2 = { x: coords.x, y: coords.y };
      this.syncPointToChart(p2);
      this.pendingDrawing.p2 = p2;

      if (is3Point) {
        this.placementStep = 2;
        this.pendingDrawing.p3 = { x: coords.x, y: coords.y };
        this.redraw();
      } else {
        // Finalize 2-point tool
        this.finalizeDrawing(this.pendingDrawing, coords);
      }
    } else if (this.placementStep === 2 && is3Point) {
      // Step 3: Anchor point 3 set
      const p3 = { x: coords.x, y: coords.y };
      this.syncPointToChart(p3);
      this.pendingDrawing.p3 = p3;
      this.finalizeDrawing(this.pendingDrawing, coords);
    }
  }

  onMouseMove(e) {
    const coords = this.getCanvasCoords(e);

    // 1. Dragging an Anchor Handle
    if (this.draggingHandle) {
      const d = this.draggingHandle.drawing;
      const key = this.draggingHandle.handleKey;

      if (key === 'target') {
        const isLong = d.type === 'longposition';
        const h = Math.abs(coords.y - d.p1.y);
        d.targetHeight = Math.max(15, h);
      } else if (key === 'stop') {
        const isLong = d.type === 'longposition';
        const h = Math.abs(coords.y - d.p1.y);
        d.stopHeight = Math.max(15, h);
      } else if (d[key]) {
        d[key].x = coords.x;
        d[key].y = coords.y;
        this.syncPointToChart(d[key]);
      }
      this.redraw();
      return;
    }

    // 2. Dragging Entire Drawing Body
    if (this.isDraggingBody && this.activeDrawing && !this.activeDrawing.locked && this.dragStart) {
      const dx = coords.x - this.dragStart.x;
      const dy = coords.y - this.dragStart.y;
      this.dragStart = { x: coords.x, y: coords.y };

      const d = this.activeDrawing;
      ['p', 'p1', 'p2', 'p3'].forEach(k => {
        if (d[k]) {
          d[k].x += dx;
          d[k].y += dy;
          this.syncPointToChart(d[k]);
        }
      });
      if (d.y !== undefined) {
        d.y += dy;
        d.price = this.getCurrentPrice(d.y);
      }
      if (d.x !== undefined) {
        d.x += dx;
        const c = this.chartCoordsFromPixel(d.x, 0);
        d.logical = c.logical;
      }
      if (d.points) {
        d.points.forEach(pt => { pt.x += dx; pt.y += dy; });
      }
      this.redraw();
      return;
    }

    // 3. Freehand Brush & Highlighter
    if (this.isDrawing && this.currentDrawing) {
      this.currentDrawing.points.push(coords);
      this.redraw();
      this.drawFreehand(this.currentDrawing);
      return;
    }

    // 4. Elastic Placement Preview
    if (this.isPlacing && this.pendingDrawing) {
      if (this.placementStep === 1) {
        this.pendingDrawing.p2 = { x: coords.x, y: coords.y };
      } else if (this.placementStep === 2) {
        this.pendingDrawing.p3 = { x: coords.x, y: coords.y };
      }
      this.redraw();
      this.renderDrawing(this.pendingDrawing, true);
      return;
    }

    // 5. Cursor Hover Handles Detection
    if (this.activeDrawing && !this.activeDrawing.locked) {
      const h = this.getHandleAt(coords);
      if (h) {
        this.canvas.style.cursor = 'grab';
        return;
      }
      const hit = this.hitTest(coords);
      if (hit === this.activeDrawing) {
        this.canvas.style.cursor = 'move';
        return;
      }
    }

    if (['crosshair', 'dot', 'arrow_cursor'].includes(this.activeTool)) {
      const hit = this.hitTest(coords);
      if (hit) {
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.cursor = 'pointer';
      } else if (!this.activeDrawing) {
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.cursor = 'default';
      }
    }
  }

  onMouseUp(e) {
    if (this.draggingHandle) {
      this.draggingHandle = null;
      this.dragStart = null;
      return;
    }

    if (this.isDraggingBody) {
      this.isDraggingBody = false;
      this.dragStart = null;
      return;
    }

    // Finish freehand brush
    if (this.currentDrawing) {
      this.drawings.push(this.currentDrawing);
      this.activeDrawing = this.currentDrawing;
      const firstPt = this.currentDrawing.points && this.currentDrawing.points[0];
      this.currentDrawing = null;
      this.isDrawing = false;
      this.redraw();
      this.showFloatingToolbar('brush', firstPt ? firstPt.x : undefined, firstPt ? firstPt.y : undefined);
      window.updateObjectTreeAndDataWindow?.();
      if (!this.stayInDrawingMode) this.selectTool('crosshair');
      return;
    }

    // If mouse was dragged significantly during Step 1, finalize immediately (Click-and-Drag mode)
    if (this.isPlacing && this.placementStep === 1 && this.startPoint) {
      const coords = this.getCanvasCoords(e);
      const dist = Math.hypot(coords.x - this.startPoint.x, coords.y - this.startPoint.y);
      const is3Point = ['parallelchannel', 'pitchfork', 'trendfibext', 'triangle'].includes(this.activeTool);

      if (dist > 15 && !is3Point) {
        const p2 = { x: coords.x, y: coords.y };
        this.syncPointToChart(p2);
        this.pendingDrawing.p2 = p2;
        this.finalizeDrawing(this.pendingDrawing, coords);
      }
    }
  }

  finalizeDrawing(drawing, coords) {
    this.isPlacing = false;
    this.placementStep = 0;
    this.isDrawing = false;
    this.pendingDrawing = null;

    this.drawings.push(drawing);
    this.activeDrawing = drawing;
    this.redraw();
    this.showFloatingToolbar(drawing.type, coords.x, coords.y);
    window.updateObjectTreeAndDataWindow?.();

    if (!this.stayInDrawingMode) {
      this.selectTool('crosshair');
    }
  }

  finalizeToolAction(drawing, coords) {
    this.redraw();
    this.showFloatingToolbar(drawing.type, coords.x, coords.y);
    window.updateObjectTreeAndDataWindow?.();
    if (!this.stayInDrawingMode) {
      this.selectTool('crosshair');
    }
  }

  // ── Redraw Entire Canvas ──
  redraw() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    if (this.hideAll) return;

    this.drawings.forEach(d => this.renderDrawing(d));

    // If pending drawing in progress, render it
    if (this.isPlacing && this.pendingDrawing) {
      this.renderDrawing(this.pendingDrawing, true);
    }
  }

  // ── Render Specific Drawing Object ──
  renderDrawing(d, isPreview = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = d.style.color || '#2962ff';
    ctx.fillStyle = d.style.fillColor || d.style.color || '#2962ff';
    ctx.lineWidth = d.style.width || 2;

    if (d.style.style === 'dashed') ctx.setLineDash([6, 6]);
    else if (d.style.style === 'dotted') ctx.setLineDash([2, 4]);
    else ctx.setLineDash([]);

    const w = this.canvas.getBoundingClientRect().width;
    const h = this.canvas.getBoundingClientRect().height;

    // ─────────────────────────────────────────────────────────────
    // 1. TREND LINE, RAY, EXTENDED, INFO LINE, ARROW, TREND ANGLE
    // ─────────────────────────────────────────────────────────────
    if (['trendline', 'ray', 'extended', 'arrow', 'infoline', 'trendangle'].includes(d.type)) {
      ctx.beginPath();
      const dx = d.p2.x - d.p1.x;
      const dy = d.p2.y - d.p1.y;
      const scale = Math.max(w, h) * 2;

      const isExtendLeft = d.type === 'extended' || d.style.extendLeft;
      const isExtendRight = d.type === 'ray' || d.type === 'extended' || d.style.extendRight;

      if (isExtendLeft && isExtendRight) {
        ctx.moveTo(d.p1.x - dx * scale, d.p1.y - dy * scale);
        ctx.lineTo(d.p2.x + dx * scale, d.p2.y + dy * scale);
      } else if (isExtendLeft) {
        ctx.moveTo(d.p1.x - dx * scale, d.p1.y - dy * scale);
        ctx.lineTo(d.p2.x, d.p2.y);
      } else if (isExtendRight) {
        ctx.moveTo(d.p1.x, d.p1.y);
        ctx.lineTo(d.p2.x + dx * scale, d.p2.y + dy * scale);
      } else {
        ctx.moveTo(d.p1.x, d.p1.y);
        ctx.lineTo(d.p2.x, d.p2.y);
      }
      ctx.stroke();

      // Text on Line
      if (d.style.text) {
        ctx.save();
        ctx.fillStyle = d.style.textColor || d.style.color || '#2962ff';
        const isBold = d.style.bold ? 'bold ' : '';
        const fontSize = d.style.fontSize || 12;
        ctx.font = `${isBold}${fontSize}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif`;
        const midX = (d.p1.x + d.p2.x) / 2;
        const midY = (d.p1.y + d.p2.y) / 2;
        ctx.textAlign = 'center';
        ctx.fillText(d.style.text, midX, midY - 8);
        ctx.restore();
      }

      // Show Price on Line End
      if (d.style.showPrice && d.type !== 'horzline' && d.type !== 'horzray') {
        const p2Price = d.p2.price || this.getCurrentPrice(d.p2.y);
        const priceStr = this.formatPrice(p2Price);
        ctx.save();
        ctx.fillStyle = d.style.color || '#2962ff';
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
        const pw = ctx.measureText(priceStr).width;
        ctx.fillRect(d.p2.x + 8, d.p2.y - 10, pw + 10, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(priceStr, d.p2.x + 13, d.p2.y + 4);
        ctx.restore();
      }

      // Arrow heads (Left End and Right End)
      if (d.type === 'arrow' || d.style.rightEnd === 'arrow') {
        this.drawArrowHead(ctx, d.p1.x, d.p1.y, d.p2.x, d.p2.y, d.style.color || '#2962ff');
      }
      if (d.style.leftEnd === 'arrow') {
        this.drawArrowHead(ctx, d.p2.x, d.p2.y, d.p1.x, d.p1.y, d.style.color || '#2962ff');
      }

      // Middle point dot if enabled
      if (d.style.middlePoint) {
        ctx.save();
        ctx.fillStyle = d.style.color || '#2962ff';
        ctx.beginPath();
        ctx.arc((d.p1.x + d.p2.x) / 2, (d.p1.y + d.p2.y) / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Info Line & Stats Readout Badge
      const showStats = d.type === 'infoline' || d.type === 'trendangle' || d.style.alwaysStats || d.style.showStats || d.style.priceRange || d.style.barsRange || d.style.dateRange || d.style.distance || d.style.showAngle;
      if (showStats) {
        const midX = (d.p1.x + d.p2.x) / 2;
        const midY = (d.p1.y + d.p2.y) / 2;
        const angle = Math.round(Math.atan2(d.p1.y - d.p2.y, d.p2.x - d.p1.x) * 180 / Math.PI);
        const p1Price = d.p1.price || this.getCurrentPrice(d.p1.y);
        const p2Price = d.p2.price || this.getCurrentPrice(d.p2.y);
        const pDiff = p2Price - p1Price;
        const pPct = p1Price ? ((pDiff / p1Price) * 100) : 0;
        const bars = Math.abs(Math.round(((d.p2.logical || 0) - (d.p1.logical || 0)))) || Math.round(Math.abs(d.p2.x - d.p1.x) / 10);
        const dist = Math.round(Math.hypot(d.p2.x - d.p1.x, d.p2.y - d.p1.y));

        let badgeParts = [];
        if (d.type === 'infoline' || d.type === 'trendangle' || d.style.priceRange) {
          badgeParts.push(`${pDiff >= 0 ? '+' : ''}${pDiff.toFixed(2)} (${pDiff >= 0 ? '+' : ''}${pPct.toFixed(2)}%)`);
        }
        if (d.type === 'infoline' || d.type === 'trendangle' || d.style.barsRange) {
          badgeParts.push(`${bars} bars`);
        }
        if (d.style.distance) {
          badgeParts.push(`${dist}px`);
        }
        if (d.type === 'infoline' || d.type === 'trendangle' || d.style.showAngle) {
          badgeParts.push(`${angle}°`);
        }
        if (badgeParts.length === 0) {
          badgeParts.push(`${pDiff >= 0 ? '+' : ''}${pDiff.toFixed(2)} · ${bars} bars`);
        }

        const badgeText = badgeParts.join(' · ');
        let badgeX = midX;
        let badgeY = midY - 24;

        if (d.style.statsPos === 'Left') {
          badgeX = d.p1.x;
          badgeY = d.p1.y - 24;
        } else if (d.style.statsPos === 'Right') {
          badgeX = d.p2.x;
          badgeY = d.p2.y - 24;
        }

        ctx.save();
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
        const tw = ctx.measureText(badgeText).width;
        ctx.fillStyle = '#1e222d';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(badgeX - tw / 2 - 8, badgeY - 14, tw + 16, 22, 4) : ctx.rect(badgeX - tw / 2 - 8, badgeY - 14, tw + 16, 22);
        ctx.fill();

        ctx.fillStyle = pDiff >= 0 ? '#089981' : '#f23645';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, badgeX, badgeY + 2);
        ctx.restore();
      }

      // Handles
      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
        this.drawHandle(d.p2.x, d.p2.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. HORIZONTAL LINE (Full width with live price pill tag)
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'horzline') {
      ctx.beginPath();
      ctx.moveTo(0, d.y);
      ctx.lineTo(w, d.y);
      ctx.stroke();

      // Price Tag on Right Axis
      const priceVal = d.price || this.getCurrentPrice(d.y);
      const priceStr = this.formatPrice(priceVal);

      ctx.save();
      ctx.fillStyle = d.style.color || '#2962ff';
      ctx.fillRect(w - 76, d.y - 10, 76, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(priceStr, w - 38, d.y + 4);
      ctx.restore();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(w / 2, d.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. HORIZONTAL RAY
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'horzray') {
      ctx.beginPath();
      ctx.moveTo(d.p1.x, d.p1.y);
      ctx.lineTo(w, d.p1.y);
      ctx.stroke();

      const priceVal = d.p1.price || this.getCurrentPrice(d.p1.y);
      const priceStr = this.formatPrice(priceVal);

      ctx.save();
      ctx.fillStyle = d.style.color || '#2962ff';
      ctx.fillRect(w - 76, d.p1.y - 10, 76, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(priceStr, w - 38, d.p1.y + 4);
      ctx.restore();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. VERTICAL LINE
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'vertline') {
      ctx.beginPath();
      ctx.moveTo(d.x, 0);
      ctx.lineTo(d.x, h);
      ctx.stroke();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.x, h / 2);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. CROSS LINE
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'crossline') {
      ctx.beginPath();
      ctx.moveTo(0, d.y); ctx.lineTo(w, d.y);
      ctx.moveTo(d.x, 0); ctx.lineTo(d.x, h);
      ctx.stroke();

      const priceVal = d.price || this.getCurrentPrice(d.y);
      const priceStr = this.formatPrice(priceVal);

      ctx.save();
      ctx.fillStyle = d.style.color || '#2962ff';
      ctx.fillRect(w - 76, d.y - 10, 76, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(priceStr, w - 38, d.y + 4);
      ctx.restore();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.x, d.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. FIBONACCI RETRACEMENT (Authentic TV Shaded Levels & Prices)
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'fibret' || d.type === 'fib') {
      const x1 = Math.min(d.p1.x, d.p2.x);
      const x2 = Math.max(d.p1.x, d.p2.x);
      const leftX = d.style.extendLeft ? 0 : x1;
      const rightX = d.style.extendRight ? w : Math.max(x2, x1 + 180);
      const y1 = d.p1.y;
      const y2 = d.p2.y;
      const rangeY = y2 - y1;

      const p1Price = d.p1.price || this.getCurrentPrice(y1);
      const p2Price = d.p2.price || this.getCurrentPrice(y2);
      const rangePrice = p2Price - p1Price;

      const rawLevels = d.style.levels || [
        { l: 0.0,   c: '#787b86', active: true },
        { l: 0.236, c: '#f23645', active: true },
        { l: 0.382, c: '#ff9800', active: true },
        { l: 0.5,   c: '#089981', active: true },
        { l: 0.618, c: '#00897b', active: true },
        { l: 0.786, c: '#2962ff', active: true },
        { l: 1.0,   c: '#787b86', active: true },
        { l: 1.618, c: '#2962ff', active: true }
      ];
      const FIB_LEVELS = rawLevels.filter(lvl => lvl.active !== false);

      const isReverse = !!d.style.reverse;
      const showBg = d.style.showBackground !== false;
      const bgOpacity = d.style.bgOpacity !== undefined ? d.style.bgOpacity : 0.08;
      const baseColor = d.style.useOneColor ? (d.style.oneColor || d.style.color || '#2962ff') : null;

      // Draw Shaded Bands between consecutive levels
      if (showBg && FIB_LEVELS.length > 1) {
        for (let i = 1; i < FIB_LEVELS.length; i++) {
          const topL = FIB_LEVELS[i - 1];
          const botL = FIB_LEVELS[i];
          const topY = isReverse ? (y2 - rangeY * topL.l) : (y1 + rangeY * topL.l);
          const botY = isReverse ? (y2 - rangeY * botL.l) : (y1 + rangeY * botL.l);

          const c = baseColor || botL.c;
          const alphaHex = Math.round(bgOpacity * 255).toString(16).padStart(2, '0');
          ctx.fillStyle = `${c}${alphaHex}`;
          ctx.fillRect(leftX, Math.min(topY, botY), rightX - leftX, Math.abs(botY - topY));
        }
      }

      // Draw Level Lines & Readout Badges
      FIB_LEVELS.forEach(lvl => {
        const y = isReverse ? (y2 - rangeY * lvl.l) : (y1 + rangeY * lvl.l);
        const lvlPrice = isReverse ? (p2Price - rangePrice * lvl.l) : (p1Price + rangePrice * lvl.l);
        const lvlColor = baseColor || lvl.c;

        ctx.strokeStyle = lvlColor;
        ctx.lineWidth = d.style.width || 1;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        ctx.stroke();

        // Level text
        if (d.style.showLevels !== false) {
          ctx.fillStyle = lvlColor;
          ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
          
          let textX = leftX + 6;
          let textAlign = 'left';
          if (d.style.labelsPosH === 'Center') {
            textX = (leftX + rightX) / 2;
            textAlign = 'center';
          } else if (d.style.labelsPosH === 'Right') {
            textX = rightX - 6;
            textAlign = 'right';
          }

          let textY = y - 4;
          if (d.style.labelsPosV === 'Middle') {
            textY = y + 3;
          } else if (d.style.labelsPosV === 'Bottom') {
            textY = y + 12;
          }

          ctx.textAlign = textAlign;
          const formatStr = d.style.levelsFormat === 'percent' ? `${(lvl.l * 100).toFixed(1)}%` : `${lvl.l}`;
          const pricePart = d.style.showPrices !== false ? ` (${this.formatPrice(lvlPrice)})` : '';
          ctx.fillText(`${formatStr}${pricePart}`, textX, textY);
        }
      });

      // Diagonal Trend Line connecting Anchor 1 & 2
      if (d.style.showTrendLine !== false) {
        ctx.save();
        ctx.strokeStyle = d.style.color || '#2962ff';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(d.p1.x, d.p1.y);
        ctx.lineTo(d.p2.x, d.p2.y);
        ctx.stroke();
        ctx.restore();
      }

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
        this.drawHandle(d.p2.x, d.p2.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 7. PARALLEL CHANNEL
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'parallelchannel') {
      const p1 = d.p1;
      const p2 = d.p2;
      const p3 = d.p3 || { x: p1.x, y: p1.y + 40 };
      const offX = p3.x - p1.x;
      const offY = p3.y - p1.y;

      // Base line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Parallel line
      ctx.beginPath();
      ctx.moveTo(p1.x + offX, p1.y + offY);
      ctx.lineTo(p2.x + offX, p2.y + offY);
      ctx.stroke();

      // Dashed Midline
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(p1.x + offX / 2, p1.y + offY / 2);
      ctx.lineTo(p2.x + offX / 2, p2.y + offY / 2);
      ctx.stroke();
      ctx.restore();

      // Fill channel
      ctx.fillStyle = d.style.fillColor || 'rgba(41, 98, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p2.x + offX, p2.y + offY);
      ctx.lineTo(p1.x + offX, p1.y + offY);
      ctx.closePath();
      ctx.fill();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(p1.x, p1.y);
        this.drawHandle(p2.x, p2.y);
        this.drawHandle(p1.x + offX, p1.y + offY);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 8. ANDREWS' PITCHFORK
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'pitchfork') {
      const p1 = d.p1;
      const p2 = d.p2;
      const p3 = d.p3 || { x: p2.x, y: p2.y + 60 };

      // Midpoint between p2 and p3
      const midX = (p2.x + p3.x) / 2;
      const midY = (p2.y + p3.y) / 2;
      const dx = midX - p1.x;
      const dy = midY - p1.y;
      const scale = Math.max(w, h) * 2;

      // Median line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x + dx * scale, p1.y + dy * scale);
      ctx.stroke();

      // Prongs
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x + dx * scale, p2.y + dy * scale);
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p3.x + dx * scale, p3.y + dy * scale);
      ctx.stroke();

      // Connecting base line
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
      ctx.restore();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(p1.x, p1.y);
        this.drawHandle(p2.x, p2.y);
        this.drawHandle(p3.x, p3.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. RECTANGLE
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'rectangle') {
      const x = Math.min(d.p1.x, d.p2.x);
      const y = Math.min(d.p1.y, d.p2.y);
      const width = Math.abs(d.p2.x - d.p1.x);
      const height = Math.abs(d.p2.y - d.p1.y);

      ctx.fillStyle = d.style.fillColor || 'rgba(41, 98, 255, 0.12)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(x, y);
        this.drawHandle(x + width, y + height);
        this.drawHandle(x + width, y);
        this.drawHandle(x, y + height);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 10. CIRCLE & ELLIPSE
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'circle') {
      const r = Math.hypot(d.p2.x - d.p1.x, d.p2.y - d.p1.y);
      ctx.fillStyle = d.style.fillColor || 'rgba(41, 98, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(d.p1.x, d.p1.y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
        this.drawHandle(d.p2.x, d.p2.y);
      }
    } else if (d.type === 'ellipse') {
      const rx = Math.abs(d.p2.x - d.p1.x);
      const ry = Math.abs(d.p2.y - d.p1.y);
      ctx.fillStyle = d.style.fillColor || 'rgba(41, 98, 255, 0.12)';
      ctx.beginPath();
      ctx.ellipse(d.p1.x, d.p1.y, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
        this.drawHandle(d.p2.x, d.p2.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 11. TRIANGLE
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'triangle') {
      const p3 = d.p3 || { x: d.p1.x - (d.p2.x - d.p1.x), y: d.p2.y };
      ctx.fillStyle = d.style.fillColor || 'rgba(41, 98, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(d.p1.x, d.p1.y);
      ctx.lineTo(d.p2.x, d.p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
        this.drawHandle(d.p2.x, d.p2.y);
        this.drawHandle(p3.x, p3.y);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 12. LONG POSITION & SHORT POSITION
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'longposition' || d.type === 'shortposition') {
      const isLong = d.type === 'longposition';
      const x = Math.min(d.p1.x, d.p2 ? d.p2.x : d.p1.x + 120);
      const width = Math.max(80, Math.abs((d.p2 ? d.p2.x : d.p1.x + 120) - d.p1.x));
      const entryY = d.p1.y;
      const targetH = d.targetHeight || 70;
      const stopH = d.stopHeight || 35;

      const targetY = isLong ? entryY - targetH : entryY + targetH;
      const stopY = isLong ? entryY + stopH : entryY - stopH;

      const entryPrice = d.p1.price || this.getCurrentPrice(entryY);
      const targetPrice = this.getCurrentPrice(targetY);
      const stopPrice = this.getCurrentPrice(stopY);
      const rr = (Math.abs(targetPrice - entryPrice) / Math.max(0.01, Math.abs(entryPrice - stopPrice))).toFixed(2);

      // Target green box
      ctx.fillStyle = 'rgba(8, 153, 129, 0.18)';
      ctx.strokeStyle = '#089981';
      ctx.lineWidth = 1.5;
      const tTop = Math.min(entryY, targetY);
      ctx.fillRect(x, tTop, width, targetH);
      ctx.strokeRect(x, tTop, width, targetH);

      // Stop loss red box
      ctx.fillStyle = 'rgba(242, 54, 69, 0.18)';
      ctx.strokeStyle = '#f23645';
      const sTop = Math.min(entryY, stopY);
      ctx.fillRect(x, sTop, width, stopH);
      ctx.strokeRect(x, sTop, width, stopH);

      // Entry line
      ctx.strokeStyle = '#131722';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, entryY);
      ctx.lineTo(x + width, entryY);
      ctx.stroke();

      // Risk / Reward Badge
      ctx.save();
      ctx.fillStyle = '#1e222d';
      const badgeW = 120;
      ctx.fillRect(x + width / 2 - badgeW / 2, entryY - 11, badgeW, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Risk/Reward: ${rr}`, x + width / 2, entryY + 4);
      ctx.restore();

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(x + width / 2, targetY);
        this.drawHandle(x + width / 2, stopY);
        this.drawHandle(d.p1.x, entryY);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 13. MEASURE TOOL
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'measure') {
      const x1 = Math.min(d.p1.x, d.p2.x);
      const x2 = Math.max(d.p1.x, d.p2.x);
      const y1 = Math.min(d.p1.y, d.p2.y);
      const y2 = Math.max(d.p1.y, d.p2.y);

      ctx.fillStyle = 'rgba(41, 98, 255, 0.12)';
      ctx.strokeStyle = '#2962ff';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const p1Price = d.p1.price || this.getCurrentPrice(d.p1.y);
      const p2Price = d.p2.price || this.getCurrentPrice(d.p2.y);
      const diff = p2Price - p1Price;
      const pct = p1Price ? ((diff / p1Price) * 100).toFixed(2) : '0.00';
      const bars = Math.abs(Math.round(((d.p2.logical || 0) - (d.p1.logical || 0)))) || Math.round((x2 - x1) / 10);

      ctx.save();
      ctx.fillStyle = '#2962ff';
      const txt = `${bars} bars, ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diff >= 0 ? '+' : ''}${pct}%)`;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      const tw = ctx.measureText(txt).width;
      ctx.fillRect(x2 + 8, y2 - 12, tw + 14, 22);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(txt, x2 + 15, y2 + 3);
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 14. TEXT, CALLOUT & ANNOTATIONS
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'text') {
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
      ctx.fillStyle = d.style.color || '#131722';
      ctx.textAlign = 'left';
      ctx.fillText(d.text || '', d.p.x, d.p.y);

      if (d === this.activeDrawing && !isPreview) {
        const tw = ctx.measureText(d.text || '').width;
        ctx.save();
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(d.p.x - 4, d.p.y - 15, tw + 8, 20);
        ctx.restore();
        this.drawHandle(d.p.x - 4, d.p.y - 15);
        this.drawHandle(d.p.x + tw + 4, d.p.y + 5);
      }
    } else if (d.type === 'callout') {
      const bw = 90, bh = 32;
      const bx = d.p2.x, by = d.p2.y;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = d.style.color || '#2962ff';

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 6) : ctx.rect(bx, by, bw, bh);
      ctx.fill();
      ctx.stroke();

      // Arrow line to anchor 1
      ctx.beginPath();
      ctx.moveTo(bx, by + bh / 2);
      ctx.lineTo(d.p1.x, d.p1.y);
      ctx.stroke();

      ctx.fillStyle = '#131722';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.text || 'Callout', bx + bw / 2, by + 20);

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p1.x, d.p1.y);
        this.drawHandle(bx + bw / 2, by + bh / 2);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 15. EMOJI & STICKERS
    // ─────────────────────────────────────────────────────────────
    else if (d.type === 'emoji' || d.type === 'icon' || d.type === 'sticker') {
      ctx.font = `${d.size || 36}px -apple-system, "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.emoji || '🦄', d.p.x, d.p.y);

      if (d === this.activeDrawing && !isPreview) {
        this.drawHandle(d.p.x - 18, d.p.y - 18);
        this.drawHandle(d.p.x + 18, d.p.y + 18);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 16. FREEHAND BRUSH / HIGHLIGHTER
    // ─────────────────────────────────────────────────────────────
    else if (d.points && d.points.length > 0) {
      this.drawFreehand(d);
    }

    ctx.restore();
  }

  drawFreehand(d) {
    if (!d.points || d.points.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = d.style.color || '#2962ff';
    ctx.fillStyle = d.style.color || '#2962ff';
    ctx.lineWidth = d.style.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (d.style.opacity) ctx.globalAlpha = d.style.opacity;

    if (d.points.length === 1) {
      ctx.beginPath();
      ctx.arc(d.points[0].x, d.points[0].y, Math.max(2, (d.style.width || 2) / 2), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(d.points[0].x, d.points[0].y);
      for (let i = 1; i < d.points.length; i++) {
        ctx.lineTo(d.points[i].x, d.points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHandle(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// Instantiate engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.tvDrawingEngine = new TVDrawingEngine('tvChartContainer', '.layout__area--left, .tv-drawing-sidebar');
});
