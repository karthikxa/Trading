/**
 * Command Stack for Undo / Redo in TradingView Chart
 * Manages drawing overlay additions, removals, modifications and style changes.
 */

(function (window) {
  'use strict';

  class CommandStack {
    constructor(maxDepth = 50) {
      this.maxDepth = maxDepth;
      this.undoStack = [];
      this.redoStack = [];
      this.listeners = new Set();
    }

    execute(command) {
      if (!command || typeof command.execute !== 'function') return;
      try {
        command.execute();
        this.undoStack.push(command);
        if (this.undoStack.length > this.maxDepth) {
          this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo on new action
        this.notify();
      } catch (e) {
        console.error('[CommandStack] Error executing command:', e);
      }
    }

    undo() {
      if (this.undoStack.length === 0) return false;
      const command = this.undoStack.pop();
      try {
        command.undo();
        this.redoStack.push(command);
        this.notify();
        return true;
      } catch (e) {
        console.error('[CommandStack] Error undoing command:', e);
        return false;
      }
    }

    redo() {
      if (this.redoStack.length === 0) return false;
      const command = this.redoStack.pop();
      try {
        command.execute();
        this.undoStack.push(command);
        this.notify();
        return true;
      } catch (e) {
        console.error('[CommandStack] Error redoing command:', e);
        return false;
      }
    }

    canUndo() {
      return this.undoStack.length > 0;
    }

    canRedo() {
      return this.redoStack.length > 0;
    }

    clear() {
      this.undoStack = [];
      this.redoStack = [];
      this.notify();
    }

    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }

    notify() {
      const state = { canUndo: this.canUndo(), canRedo: this.canRedo() };
      for (const cb of this.listeners) {
        try { cb(state); } catch (e) {}
      }
    }
  }

  // --- Concrete Commands ---

  class AddOverlayCommand {
    constructor(chart, overlayCreate) {
      this.chart = chart;
      this.overlayCreate = overlayCreate;
      this.overlayId = overlayCreate.id || null;
    }

    execute() {
      if (!this.chart) return;
      if (this.overlayId) {
        const id = this.chart.createOverlay(this.overlayCreate);
        if (id) this.overlayId = id;
      }
    }

    undo() {
      if (!this.chart || !this.overlayId) return;
      this.chart.removeOverlay({ id: this.overlayId });
    }
  }

  class RemoveOverlayCommand {
    constructor(chart, overlaySnapshot) {
      this.chart = chart;
      this.snapshot = Object.assign({}, overlaySnapshot);
    }

    execute() {
      if (!this.chart || !this.snapshot.id) return;
      this.chart.removeOverlay({ id: this.snapshot.id });
    }

    undo() {
      if (!this.chart) return;
      this.chart.createOverlay(this.snapshot);
    }
  }

  class ClearAllOverlaysCommand {
    constructor(chart, overlaysSnapshot) {
      this.chart = chart;
      this.snapshots = overlaysSnapshot.slice();
    }

    execute() {
      if (!this.chart) return;
      this.chart.removeOverlay();
    }

    undo() {
      if (!this.chart || !this.snapshots) return;
      for (const snap of this.snapshots) {
        this.chart.createOverlay(snap);
      }
    }
  }

  window.tvCommandStack = new CommandStack();
  window.AddOverlayCommand = AddOverlayCommand;
  window.RemoveOverlayCommand = RemoveOverlayCommand;
  window.ClearAllOverlaysCommand = ClearAllOverlaysCommand;
})(window);
