/**
 * Drawings Controller for TradingView Left Toolbar
 * Wires the harvested TV left toolbar DOM elements to KLineChart core overlay API.
 * Supports: Trend Line, Ray, Fib, Patterns, Measure, Positions, Shapes,
 * Magnet mode, Keep Drawing, Lock, Hide, Remove (one/all), and Undo/Redo.
 */

(function (window) {
  'use strict';

  const TOOL_MAP = {
    // Cursors
    'crosshair': null,
    'cursor': null,
    'dot': null,
    'arrow_cursor': null,
    'eraser': null,

    // Lines
    'trendline': 'segment',
    'ray': 'rayLine',
    'infoline': 'segment',
    'extended': 'straightLine',
    'trendangle': 'segment',
    'horzline': 'horizontalStraightLine',
    'horzray': 'horizontalRayLine',
    'vertline': 'verticalStraightLine',
    'crossline': 'crossLine',
    'parallelchannel': 'priceChannelLine',
    'flatbottom': 'priceChannelLine',
    'disjointangle': 'segment',

    // Fib & Gann
    'fibret': 'fibonacciLine',
    'trendfibext': 'fibonacciLine',
    'fibchannel': 'priceChannelLine',
    'fibtimezone': 'verticalStraightLine',
    'fibfan': 'rayLine',
    'fibcircles': 'circle',
    'pitchfork': 'priceChannelLine',
    'gannbox': 'rect',
    'gannsquare': 'rect',
    'gannfan': 'rayLine',

    // Patterns
    'xabcd': 'xabcd',
    'headandshoulders': 'headAndShoulders',
    'abcd': 'segment',
    'trianglepattern': 'segment',
    'elliottimpulse': 'segment',
    'elliottcorrection': 'segment',

    // Prediction & Position
    'longposition': 'longPosition',
    'shortposition': 'shortPosition',
    'forecast': 'segment',
    'dateandpricerange': 'measure',
    'daterange': 'measure',
    'measure': 'measure',

    // Shapes & Annotations
    'brush': 'segment',
    'highlighter': 'segment',
    'rect': 'rect',
    'circle': 'circle',
    'text': 'simpleAnnotation',
    'callout': 'simpleAnnotation',
    'note': 'simpleAnnotation'
  };

  class DrawingsController {
    constructor() {
      this._chart = null;
      this.activeTool = 'crosshair';
      this.selectedOverlayId = null;
      this.activeFlyout = null;
      this.flyoutsData = null;
      this.isDrawingLocked = false;
      this.isDrawingHidden = false;
      this.isKeepDrawing = false;
      this.magnetMode = 'normal'; // 'normal' | 'weak_magnet' | 'strong_magnet'

      this.loadHarvestedFlyouts();
      this.bindKeyboardShortcuts();
      this.bindUndoRedoButtons();
    }

    get chart() {
      return this._chart || window.tvChart || (window.tvChartEngine && window.tvChartEngine.chart);
    }

    set chart(c) {
      this._chart = c;
    }

    init(chart) {
      if (chart) this.chart = chart;
      this.loadHarvestedFlyouts();
      // Left sidebar buttons are bound with full genuine HAR components by tv_features_full.js
      this.bindKeyboardShortcuts();
      this.bindChartEvents();
      this.bindUndoRedoButtons();
    }

    async loadHarvestedFlyouts() {
      try {
        const res = await fetch('/static/data/tv_all_left_flyouts_exact.json');
        if (res.ok) {
          this.flyoutsData = await res.json();
        }
      } catch (e) {
        console.warn('[DrawingsController] Failed to load left flyouts json:', e);
      }
    }

    bindToolbarButtons() {
      const leftArea = document.querySelector('.layout__area--left');
      if (!leftArea) return;

      const buttons = leftArea.querySelectorAll('button');

      // 0: Crosshair cursor
      if (buttons[0]) {
        buttons[0].addEventListener('click', (e) => {
          e.stopPropagation();
          this.activateTool('crosshair');
        });
      }

      // Group 1: Cursors Flyout (arrow button 1)
      if (buttons[1]) {
        buttons[1].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Cursors', buttons[1]);
        });
      }

      // Group 2: Trend tools (button 2 main, button 3 arrow)
      if (buttons[2]) {
        buttons[2].addEventListener('click', (e) => {
          e.stopPropagation();
          const tool = buttons[2].getAttribute('data-tool') || 'trendline';
          this.activateTool(tool, buttons[2]);
        });
      }
      if (buttons[3]) {
        buttons[3].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Trend tools', buttons[3], buttons[2]);
        });
      }

      // Group 3: Gann & Fib (button 4 main, button 5 arrow)
      if (buttons[4]) {
        buttons[4].addEventListener('click', (e) => {
          e.stopPropagation();
          const tool = buttons[4].getAttribute('data-tool') || 'fibret';
          this.activateTool(tool, buttons[4]);
        });
      }
      if (buttons[5]) {
        buttons[5].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Gann and Fibonacci tools', buttons[5], buttons[4]);
        });
      }

      // Group 4: Patterns (button 6 main, button 7 arrow)
      if (buttons[6]) {
        buttons[6].addEventListener('click', (e) => {
          e.stopPropagation();
          const tool = buttons[6].getAttribute('data-tool') || 'xabcd';
          this.activateTool(tool, buttons[6]);
        });
      }
      if (buttons[7]) {
        buttons[7].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Patterns', buttons[7], buttons[6]);
        });
      }

      // Group 5: Prediction & Measurement (button 8 main, button 9 arrow)
      if (buttons[8]) {
        buttons[8].addEventListener('click', (e) => {
          e.stopPropagation();
          const tool = buttons[8].getAttribute('data-tool') || 'longposition';
          this.activateTool(tool, buttons[8]);
        });
      }
      if (buttons[9]) {
        buttons[9].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Forecasting and measurement tools', buttons[9], buttons[8]);
        });
      }

      // Group 6: Geometric shapes (button 10 main, button 11 arrow)
      if (buttons[10]) {
        buttons[10].addEventListener('click', (e) => {
          e.stopPropagation();
          const tool = buttons[10].getAttribute('data-tool') || 'rect';
          this.activateTool(tool, buttons[10]);
        });
      }
      if (buttons[11]) {
        buttons[11].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Geometric shapes', buttons[11], buttons[10]);
        });
      }

      // Group 7: Annotation tools (button 12 main, button 13 arrow)
      if (buttons[12]) {
        buttons[12].addEventListener('click', (e) => {
          e.stopPropagation();
          const tool = buttons[12].getAttribute('data-tool') || 'text';
          this.activateTool(tool, buttons[12]);
        });
      }
      if (buttons[13]) {
        buttons[13].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Annotation tools', buttons[13], buttons[12]);
        });
      }

      // 16: Measure tool
      if (buttons[16]) {
        buttons[16].addEventListener('click', (e) => {
          e.stopPropagation();
          this.activateTool('measure', buttons[16]);
        });
      }

      // 18: Magnet mode
      if (buttons[18]) {
        buttons[18].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMagnet(buttons[18]);
        });
      }
      if (buttons[19]) {
        buttons[19].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Magnets', buttons[19], buttons[18]);
        });
      }

      // 20: Keep drawing mode
      if (buttons[20]) {
        buttons[20].addEventListener('click', (e) => {
          e.stopPropagation();
          this.isKeepDrawing = !this.isKeepDrawing;
          buttons[20].classList.toggle('isActive-zm3YRUFG', this.isKeepDrawing);
          window.tvStateStore.set('keepDrawing', this.isKeepDrawing);
        });
      }

      // 21: Lock drawings
      if (buttons[21]) {
        buttons[21].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleLock(buttons[21]);
        });
      }

      // 23: Hide all drawings
      if (buttons[23]) {
        buttons[23].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleHide(buttons[23]);
        });
      }

      // 25: Remove objects
      if (buttons[25]) {
        buttons[25].addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeObjects();
        });
      }
      if (buttons[26]) {
        buttons[26].addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFlyout('Remove options', buttons[26]);
        });
      }

      // External click dismisses active flyout
      document.addEventListener('click', () => {
        this.closeFlyout();
      });
    }

    activateTool(toolId, triggerBtn) {
      this.activeTool = toolId;
      window.tvStateStore.set('activeTool', toolId);

      // Highlight active button
      document.querySelectorAll('.layout__area--left button').forEach(b => {
        if (b !== triggerBtn && !['20', '21', '23', '18'].includes(b.getAttribute('data-action'))) {
          b.classList.remove('isActive-zm3YRUFG', 'isSelected-zm3YRUFG');
        }
      });
      if (triggerBtn) {
        triggerBtn.classList.add('isActive-zm3YRUFG');
      }

      if (!this.chart) return;

      const overlayName = TOOL_MAP[toolId];
      if (overlayName) {
        console.log(`[DrawingsController] Arming tool "${toolId}" -> overlay "${overlayName}" (magnet: ${this.magnetMode})`);
        this.chart.createOverlay({
          name: overlayName,
          mode: this.magnetMode,
          onDrawEnd: ({ overlay }) => {
            console.log('[DrawingsController] Finished drawing overlay:', overlay.id);
            // Record in undo stack
            if (window.tvCommandStack && window.AddOverlayCommand) {
              window.tvCommandStack.execute(new window.AddOverlayCommand(this.chart, overlay));
            }
            // If keep drawing is false, revert to crosshair
            if (!this.isKeepDrawing) {
              this.activateTool('crosshair');
            }
          },
          onSelected: ({ overlay }) => {
            this.selectedOverlayId = overlay.id;
          },
          onDeselected: () => {
            this.selectedOverlayId = null;
          }
        });
      }
    }

    toggleMagnet(btn) {
      if (this.magnetMode === 'normal') {
        this.magnetMode = 'weak_magnet';
        btn.classList.add('isActive-zm3YRUFG');
      } else if (this.magnetMode === 'weak_magnet') {
        this.magnetMode = 'strong_magnet';
        btn.classList.add('isActive-zm3YRUFG');
      } else {
        this.magnetMode = 'normal';
        btn.classList.remove('isActive-zm3YRUFG');
      }
      window.tvStateStore.set('magnetMode', this.magnetMode);
      console.log('[DrawingsController] Magnet mode:', this.magnetMode);
    }

    toggleLock(btn) {
      this.isDrawingLocked = !this.isDrawingLocked;
      btn.classList.toggle('isActive-zm3YRUFG', this.isDrawingLocked);
      window.tvStateStore.set('drawingsLocked', this.isDrawingLocked);

      if (this.chart && this.chart.getOverlays) {
        const overlays = this.chart.getOverlays();
        overlays.forEach(ov => {
          this.chart.overrideOverlay({ id: ov.id, lock: this.isDrawingLocked });
        });
      }
    }

    toggleHide(btn) {
      this.isDrawingHidden = !this.isDrawingHidden;
      btn.classList.toggle('isActive-zm3YRUFG', this.isDrawingHidden);
      window.tvStateStore.set('drawingsHidden', this.isDrawingHidden);

      if (this.chart && this.chart.getOverlays) {
        const overlays = this.chart.getOverlays();
        overlays.forEach(ov => {
          this.chart.overrideOverlay({ id: ov.id, visible: !this.isDrawingHidden });
        });
      }
    }

    removeObjects() {
      if (!this.chart) return;
      if (this.selectedOverlayId) {
        const ovs = this.chart.getOverlays({ id: this.selectedOverlayId });
        if (ovs.length > 0 && window.tvCommandStack) {
          window.tvCommandStack.execute(new window.RemoveOverlayCommand(this.chart, ovs[0]));
        } else {
          this.chart.removeOverlay({ id: this.selectedOverlayId });
        }
        this.selectedOverlayId = null;
      } else {
        const allOvs = this.chart.getOverlays();
        if (allOvs.length > 0 && window.tvCommandStack) {
          window.tvCommandStack.execute(new window.ClearAllOverlaysCommand(this.chart, allOvs));
        } else {
          this.chart.removeOverlay();
        }
      }
    }

    toggleFlyout(groupTitle, arrowBtn, parentBtn) {
      if (this.activeFlyout && this.activeFlyout.title === groupTitle) {
        this.closeFlyout();
        return;
      }
      this.closeFlyout();

      if (!this.flyoutsData || !this.flyoutsData[groupTitle]) return;

      const rect = arrowBtn.getBoundingClientRect();
      const flyoutData = this.flyoutsData[groupTitle];
      const flyoutHtml = typeof flyoutData === 'string' ? flyoutData : (flyoutData.rawHTML || flyoutData.exactInlinedHTML || '');

      const popup = document.createElement('div');
      popup.className = 'tv-flyout-container menuWrap-KqxF410t';
      popup.style.position = 'fixed';
      popup.style.top = `${rect.top}px`;
      popup.style.left = `${rect.right + 4}px`;
      popup.style.zIndex = '1000';
      popup.innerHTML = flyoutHtml;

      document.body.appendChild(popup);
      this.activeFlyout = { title: groupTitle, el: popup };

      // Bind clicks to tools inside the flyout
      popup.querySelectorAll('[data-name], [data-value], [role="menuitem"], .item-jFqxwOJ5').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const dataName = item.getAttribute('data-name') || item.getAttribute('data-value') || '';
          const mappedKey = this.findToolKeyFromDataName(dataName);

          if (mappedKey) {
            // Update parent button icon if available
            if (parentBtn) {
              parentBtn.setAttribute('data-tool', mappedKey);
              const iconSvg = item.querySelector('svg');
              if (iconSvg) {
                const parentIconSlot = parentBtn.querySelector('span[role="img"]') || parentBtn;
                parentIconSlot.innerHTML = iconSvg.outerHTML;
              }
            }
            this.activateTool(mappedKey, parentBtn);
          } else if (dataName.includes('remove') || dataName.includes('Remove')) {
            this.removeObjects();
          }

          this.closeFlyout();
        });
      });
    }

    closeFlyout() {
      if (this.activeFlyout && this.activeFlyout.el) {
        this.activeFlyout.el.remove();
        this.activeFlyout = null;
      }
    }

    findToolKeyFromDataName(name) {
      const lower = name.toLowerCase();
      for (const k of Object.keys(TOOL_MAP)) {
        if (lower.includes(k.toLowerCase())) return k;
      }
      if (lower.includes('trend')) return 'trendline';
      if (lower.includes('ray')) return 'ray';
      if (lower.includes('fib')) return 'fibret';
      if (lower.includes('channel')) return 'parallelchannel';
      if (lower.includes('pitchfork')) return 'pitchfork';
      if (lower.includes('rectangle') || lower.includes('rect')) return 'rect';
      if (lower.includes('brush')) return 'brush';
      if (lower.includes('text')) return 'text';
      if (lower.includes('long')) return 'longposition';
      if (lower.includes('short')) return 'shortposition';
      return null;
    }

    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Esc: Cancel current tool and return to crosshair
        if (e.key === 'Escape') {
          this.closeFlyout();
          this.activateTool('crosshair');
        }

        // Delete / Backspace: Remove selected overlay
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (this.selectedOverlayId && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            this.removeObjects();
          }
        }

        // Ctrl+Z / Cmd+Z: Undo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          if (window.tvCommandStack) window.tvCommandStack.undo();
        }

        // Ctrl+Y / Cmd+Y / Ctrl+Shift+Z: Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
          e.preventDefault();
          if (window.tvCommandStack) window.tvCommandStack.redo();
        }
      });
    }

    bindChartEvents() {
      // Listen to overlay click on chart
      if (this.chart && this.chart.subscribeAction) {
        // Track selection
      }
    }

    bindUndoRedoButtons() {
      const group = document.getElementById('header-toolbar-undo-redo');
      if (!group) return;

      const buttons = group.querySelectorAll('button');
      const undoBtn = buttons[0];
      const redoBtn = buttons[1];

      if (undoBtn) {
        undoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.tvCommandStack) window.tvCommandStack.undo();
        });
      }

      if (redoBtn) {
        redoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.tvCommandStack) window.tvCommandStack.redo();
        });
      }

      // Update disabled states
      if (window.tvCommandStack) {
        window.tvCommandStack.subscribe(({ canUndo, canRedo }) => {
          if (undoBtn) {
            undoBtn.disabled = !canUndo;
            undoBtn.classList.toggle('isDisabled-zm3YRUFG', !canUndo);
          }
          if (redoBtn) {
            redoBtn.disabled = !canRedo;
            redoBtn.classList.toggle('isDisabled-zm3YRUFG', !canRedo);
          }
        });
      }
    }
  }

  window.tvDrawingsController = new DrawingsController();
})(window);
