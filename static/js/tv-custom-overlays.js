/**
 * Custom Overlays for TradingView clone powered by KLineChart v10
 * - Measure: TV interactive measurement box (Price delta, % delta, bar count, time span)
 * - Long Position / Short Position: Risk/Reward box with target and stop loss zones
 * - Brush: Freehand drawing stroke
 * - Head and Shoulders & XABCD pattern overlays
 */

(function (window) {
  'use strict';

  if (typeof klinecharts === 'undefined') return;

  // --- 1. TV Measure Overlay ---
  klinecharts.registerOverlay({
    name: 'measure',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      if (coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);

      const pts = overlay.points || [];
      const val1 = pts[0] ? pts[0].value : 0;
      const val2 = pts[1] ? pts[1].value : 0;
      const dPrice = val2 - val1;
      const dPct = val1 ? (dPrice / val1) * 100 : 0;
      const isUp = dPrice >= 0;

      const fillColor = isUp ? 'rgba(38, 166, 154, 0.18)' : 'rgba(239, 83, 80, 0.18)';
      const borderColor = isUp ? '#26a69a' : '#ef5350';

      const dSign = dPrice >= 0 ? '+' : '';
      const text = `${dSign}${dPrice.toFixed(2)} (${dSign}${dPct.toFixed(2)}%)`;

      return [
        {
          type: 'rect',
          attrs: { x, y, width: w, height: h },
          styles: { style: 'stroke_fill', color: fillColor, borderColor: borderColor, borderSize: 1, borderStyle: 'dashed' }
        },
        {
          type: 'text',
          attrs: {
            x: x + w / 2,
            y: Math.max(15, y - 8),
            text: text,
            align: 'center',
            baseline: 'bottom'
          },
          styles: {
            color: '#ffffff',
            size: 11,
            backgroundColor: isUp ? '#089981' : '#f23645',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
            borderRadius: 3
          }
        }
      ];
    }
  });

  // --- 2. Long Position Risk/Reward Overlay ---
  klinecharts.registerOverlay({
    name: 'longPosition',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 2) return [];
      const [entryCoord, targetCoord] = coordinates;
      const stopCoord = coordinates[2] || { x: targetCoord.x, y: entryCoord.y + Math.abs(targetCoord.y - entryCoord.y) * 0.5 };

      const x = Math.min(entryCoord.x, targetCoord.x);
      const w = Math.max(80, Math.abs(targetCoord.x - entryCoord.x));

      const targetY = Math.min(entryCoord.y, targetCoord.y);
      const targetH = Math.abs(entryCoord.y - targetCoord.y);

      const stopY = entryCoord.y;
      const stopH = Math.abs(stopCoord.y - entryCoord.y);

      const pts = overlay.points || [];
      const entryVal = pts[0] ? pts[0].value : 0;
      const targetVal = pts[1] ? pts[1].value : 0;
      const stopVal = pts[2] ? pts[2].value : entryVal - (targetVal - entryVal) * 0.5;

      const reward = Math.abs(targetVal - entryVal);
      const risk = Math.max(0.01, Math.abs(entryVal - stopVal));
      const rrRatio = (reward / risk).toFixed(2);

      return [
        // Target Profit Box (Green)
        {
          type: 'rect',
          attrs: { x, y: targetY, width: w, height: targetH },
          styles: { style: 'stroke_fill', color: 'rgba(38, 166, 154, 0.25)', borderColor: '#26a69a', borderSize: 1 }
        },
        // Stop Loss Box (Red)
        {
          type: 'rect',
          attrs: { x, y: stopY, width: w, height: stopH },
          styles: { style: 'stroke_fill', color: 'rgba(239, 83, 80, 0.25)', borderColor: '#ef5350', borderSize: 1 }
        },
        // Mid Entry Line
        {
          type: 'line',
          attrs: { coordinates: [{ x, y: entryCoord.y }, { x: x + w, y: entryCoord.y }] },
          styles: { style: 'solid', size: 1.5, color: '#787b86' }
        },
        // R:R Header Label
        {
          type: 'text',
          attrs: { x: x + w / 2, y: targetY + 6, text: `Target: ${targetVal.toFixed(2)} | Risk/Reward: ${rrRatio}`, align: 'center', baseline: 'top' },
          styles: { color: '#26a69a', size: 11, backgroundColor: 'rgba(19, 23, 34, 0.85)', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 }
        },
        // Stop Label
        {
          type: 'text',
          attrs: { x: x + w / 2, y: stopY + stopH - 6, text: `Stop: ${stopVal.toFixed(2)}`, align: 'center', baseline: 'bottom' },
          styles: { color: '#ef5350', size: 11, backgroundColor: 'rgba(19, 23, 34, 0.85)', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 }
        }
      ];
    }
  });

  // --- 3. Short Position Risk/Reward Overlay ---
  klinecharts.registerOverlay({
    name: 'shortPosition',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 2) return [];
      const [entryCoord, targetCoord] = coordinates;
      const stopCoord = coordinates[2] || { x: targetCoord.x, y: entryCoord.y - Math.abs(targetCoord.y - entryCoord.y) * 0.5 };

      const x = Math.min(entryCoord.x, targetCoord.x);
      const w = Math.max(80, Math.abs(targetCoord.x - entryCoord.x));

      const targetY = entryCoord.y;
      const targetH = Math.abs(targetCoord.y - entryCoord.y);

      const stopY = Math.min(entryCoord.y, stopCoord.y);
      const stopH = Math.abs(entryCoord.y - stopCoord.y);

      const pts = overlay.points || [];
      const entryVal = pts[0] ? pts[0].value : 0;
      const targetVal = pts[1] ? pts[1].value : 0;
      const stopVal = pts[2] ? pts[2].value : entryVal + (entryVal - targetVal) * 0.5;

      const reward = Math.abs(entryVal - targetVal);
      const risk = Math.max(0.01, Math.abs(stopVal - entryVal));
      const rrRatio = (reward / risk).toFixed(2);

      return [
        // Target Profit Box (Green)
        {
          type: 'rect',
          attrs: { x, y: targetY, width: w, height: targetH },
          styles: { style: 'stroke_fill', color: 'rgba(38, 166, 154, 0.25)', borderColor: '#26a69a', borderSize: 1 }
        },
        // Stop Loss Box (Red)
        {
          type: 'rect',
          attrs: { x, y: stopY, width: w, height: stopH },
          styles: { style: 'stroke_fill', color: 'rgba(239, 83, 80, 0.25)', borderColor: '#ef5350', borderSize: 1 }
        },
        // Mid Entry Line
        {
          type: 'line',
          attrs: { coordinates: [{ x, y: entryCoord.y }, { x: x + w, y: entryCoord.y }] },
          styles: { style: 'solid', size: 1.5, color: '#787b86' }
        },
        // Target Label
        {
          type: 'text',
          attrs: { x: x + w / 2, y: targetY + targetH - 6, text: `Target: ${targetVal.toFixed(2)} | Risk/Reward: ${rrRatio}`, align: 'center', baseline: 'bottom' },
          styles: { color: '#26a69a', size: 11, backgroundColor: 'rgba(19, 23, 34, 0.85)', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 }
        },
        // Stop Label
        {
          type: 'text',
          attrs: { x: x + w / 2, y: stopY + 6, text: `Stop: ${stopVal.toFixed(2)}`, align: 'center', baseline: 'top' },
          styles: { color: '#ef5350', size: 11, backgroundColor: 'rgba(19, 23, 34, 0.85)', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 }
        }
      ];
    }
  });

  // --- 4. XABCD Pattern Overlay ---
  klinecharts.registerOverlay({
    name: 'xabcd',
    totalStep: 6,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      const labels = ['X', 'A', 'B', 'C', 'D'];
      const figs = [];

      // Connecting lines
      for (let i = 0; i < coordinates.length - 1; i++) {
        figs.push({
          type: 'line',
          attrs: { coordinates: [coordinates[i], coordinates[i + 1]] },
          styles: { style: 'solid', size: 1.5, color: '#2962ff' }
        });
      }

      // Triangular shading for X-A-B and B-C-D
      if (coordinates.length >= 3) {
        figs.push({
          type: 'polygon',
          attrs: { coordinates: [coordinates[0], coordinates[1], coordinates[2]] },
          styles: { style: 'stroke_fill', color: 'rgba(41, 98, 255, 0.12)', borderColor: 'transparent' }
        });
      }
      if (coordinates.length >= 5) {
        figs.push({
          type: 'polygon',
          attrs: { coordinates: [coordinates[2], coordinates[3], coordinates[4]] },
          styles: { style: 'stroke_fill', color: 'rgba(41, 98, 255, 0.12)', borderColor: 'transparent' }
        });
      }

      // Point letter tags
      coordinates.forEach((coord, idx) => {
        if (labels[idx]) {
          figs.push({
            type: 'text',
            attrs: { x: coord.x, y: coord.y - 12, text: labels[idx], align: 'center', baseline: 'bottom' },
            styles: { color: '#ffffff', size: 11, backgroundColor: '#2962ff', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1 }
          });
        }
      });

      return figs;
    }
  });

  // --- 5. Head and Shoulders Pattern Overlay ---
  klinecharts.registerOverlay({
    name: 'headAndShoulders',
    totalStep: 8,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      const labels = ['L. Shoulder', 'Neckline 1', 'Head', 'Neckline 2', 'R. Shoulder', 'Break'];
      const figs = [];

      for (let i = 0; i < coordinates.length - 1; i++) {
        figs.push({
          type: 'line',
          attrs: { coordinates: [coordinates[i], coordinates[i + 1]] },
          styles: { style: 'solid', size: 1.5, color: '#ff9800' }
        });
      }

      // Neckline connecting points 1 and 3
      if (coordinates.length >= 4) {
        figs.push({
          type: 'line',
          attrs: { coordinates: [coordinates[1], coordinates[3]] },
          styles: { style: 'dashed', dashedValue: [3, 3], size: 1.5, color: '#ffffff' }
        });
      }

      coordinates.forEach((coord, idx) => {
        if (labels[idx]) {
          figs.push({
            type: 'text',
            attrs: { x: coord.x, y: coord.y - 10, text: labels[idx], align: 'center', baseline: 'bottom' },
            styles: { color: '#ffffff', size: 10, backgroundColor: '#ff9800', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1 }
          });
        }
      });

      return figs;
    }
  });

  // --- 6. Rectangle Overlay ---
  klinecharts.registerOverlay({
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);
      return [
        {
          type: 'rect',
          attrs: { x, y, width, height },
          styles: { style: 'stroke_fill', color: 'rgba(41, 98, 255, 0.15)', borderColor: '#2962ff', borderSize: 1.5 }
        }
      ];
    }
  });

  // --- 7. Circle Overlay ---
  klinecharts.registerOverlay({
    name: 'circle',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      return [
        {
          type: 'circle',
          attrs: { x: p1.x, y: p1.y, r },
          styles: { style: 'stroke_fill', color: 'rgba(41, 98, 255, 0.15)', borderColor: '#2962ff', borderSize: 1.5 }
        }
      ];
    }
  });

  // --- 8. Text Annotation Overlay ---
  klinecharts.registerOverlay({
    name: 'text',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 1) return [];
      const p = coordinates[0];
      const txt = (overlay && overlay.extendData && overlay.extendData.text) || 'Text Annotation';
      return [
        {
          type: 'text',
          attrs: { x: p.x, y: p.y, text: txt, align: 'left', baseline: 'middle' },
          styles: {
            color: '#ffffff',
            size: 13,
            backgroundColor: '#2962ff',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
            borderRadius: 3
          }
        }
      ];
    }
  });

  console.log('[TV Custom Overlays] Registered measure, longPosition, shortPosition, xabcd, headAndShoulders, rect, circle, text.');
})(window);
