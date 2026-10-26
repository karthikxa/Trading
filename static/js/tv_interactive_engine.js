/**
 * ==============================================================================
 * TradingView 1:1 Complete Universal Interactive Runtime Engine (v4)
 * ==============================================================================
 * 
 * Delivers fully functional, non-static, interactive components across the website:
 * 1. 100% Authentic Emoji, Stickers & Icons Picker (Matching Images 1 & 2):
 *    - Top Category Tabs: Smiles (😀), Animals & Nature (🦄), Food (🍔), Sports (⚽),
 *      Travel (🚀), Objects (💡), Symbols (❤️), Flags (🚩).
 *    - Active state: Blue rounded border box + blue underline (as shown in screenshots).
 *    - Smooth category navigation & scrolling.
 *    - Bottom Tabs: Emojis, Stickers, Icons.
 *    - Selecting an emoji/sticker updates the left toolbar button to that icon (Image 2)
 *      and arms the canvas drawing engine to stamp it anywhere on the chart.
 * 2. Left Drawing Toolbar Tools:
 *    - Trendlines, Gann/Fib, Patterns, Prediction, Shapes, Annotations.
 *    - Clicking any tool sets the active blue border, updates the icon, and arms the drawing engine.
 *    - Toggles: Magnet (dark rounded square), Stay in drawing mode, Lock, Hide, Trash.
 * 3. Top-Left "K 11" Main Menu (Matching Image 2):
 *    - Products & Markets, Screeners & Tools, News & Community, Pricing & Plans.
 *    - Live Dark Theme toggle, Drawings Panel toggle, and seamless multi-page navigation.
 * 4. Header & Right Sidebar controls:
 *    - Symbol search, Timeframe intervals, Candle styles, Indicators, Watchlist switching.
 */

(function () {
  'use strict';

  // ── 1. Comprehensive Emoji & Category Data ──
  const EMOJI_CATEGORIES = [
    {
      id: 'smiles',
      icon: '😀',
      name: 'SMILES & PEOPLE',
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
        '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
        '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
        '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
        '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
        '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
        '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
        '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️',
        '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
        '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
        '🤝', '🙏', '✍️', '💅', '🤳', '💪'
      ]
    },
    {
      id: 'animals',
      icon: '🦄',
      name: 'ANIMALS & NATURE',
      emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
        '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
        '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
        '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
        '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
        '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
        '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘',
        '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄',
        '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮',
        '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇',
        '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐾',
        '🐉', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿',
        '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🐚',
        '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻'
      ]
    },
    {
      id: 'food',
      icon: '🍔',
      name: 'FOOD & DRINK',
      emojis: [
        '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
        '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
        '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
        '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
        '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔',
        '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗',
        '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟',
        '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🍧', '🍨', '🍦', '🥧',
        '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪',
        '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤',
        '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉'
      ]
    },
    {
      id: 'activities',
      icon: '⚽',
      name: 'ACTIVITIES & SPORTS',
      emojis: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
        '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
        '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
        '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
        '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗',
        '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️',
        '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧',
        '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻'
      ]
    },
    {
      id: 'travel',
      icon: '🚀',
      name: 'TRAVEL & PLACES',
      emojis: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
        '🛻', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨',
        '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞',
        '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️',
        '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵',
        '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🛟', '⛽', '🚧', '🚦',
        '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠',
        '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️'
      ]
    },
    {
      id: 'objects',
      icon: '💡',
      name: 'OBJECTS & TOOLS',
      emojis: [
        '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🕹️', '💽', '💾',
        '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞',
        '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️',
        '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡',
        '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙',
        '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️',
        '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫',
        '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '🔮', '🧿'
      ]
    },
    {
      id: 'symbols',
      icon: '❤️',
      name: 'SYMBOLS & SIGNS',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
        '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
        '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
        '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
        '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', 'vs', '🉑', '💮', '🉐',
        '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑',
        '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢'
      ]
    },
    {
      id: 'flags',
      icon: '🚩',
      name: 'FLAGS',
      emojis: [
        '🚩', '🏁', '🎌', '🏴', '🏳️', '🏴‍☠️', '🇮🇳', '🇺🇸', '🇬🇧', '🇪🇺',
        '🇯🇵', '🇨🇳', '🇩🇪', '🇫🇷', '🇨🇦', '🇦🇺', '🇧🇷', '🇷🇺', '🇰🇷', '🇮🇹',
        '🇪🇸', '🇨🇭', '🇸🇬', '🇭🇰', '🇿🇦', '🇦🇪', '🇸🇦', '🇲🇽', '🇮🇩', '🇹🇷'
      ]
    }
  ];

  const STICKERS_DATA = [
    { title: 'Bullish Bull', icon: '🐂', desc: 'Bull Market' },
    { title: 'Bearish Bear', icon: '🐻', desc: 'Bear Market' },
    { title: 'To The Moon', icon: '🚀', desc: 'Rocket Rally' },
    { title: 'Diamond Hands', icon: '💎', desc: 'HODL Strong' },
    { title: 'Profit Bag', icon: '💰', desc: 'Take Profit' },
    { title: 'Whale Alert', icon: '🐋', desc: 'Crypto Whale' },
    { title: 'Ape Strong', icon: '🦍', desc: 'Community' },
    { title: 'Full Moon', icon: '🌕', desc: 'Lunar Cycle' },
    { title: 'Breakout Flash', icon: '⚡', desc: 'Volatility' },
    { title: 'Target Hit', icon: '🎯', desc: 'Take Profit' },
    { title: 'Stop Loss', icon: '🛑', desc: 'Risk Stop' },
    { title: 'Trophy Winner', icon: '🏆', desc: 'Trade Won' },
    { title: 'Alarm Bell', icon: '🔔', desc: 'Price Trigger' },
    { title: 'Fire Trend', icon: '🔥', desc: 'Hot Momentum' },
    { title: 'Key Level', icon: '🔑', desc: 'Support/Res' },
    { title: 'Magic Setup', icon: '✨', desc: 'A+ Setup' }
  ];

  const ICONS_DATA = [
    { title: 'Trend Up', icon: '📈', desc: 'Uptrend' },
    { title: 'Trend Down', icon: '📉', desc: 'Downtrend' },
    { title: 'Chart Bar', icon: '📊', desc: 'Volume Spike' },
    { title: 'Green Candle', icon: '🟢', desc: 'Bull Candle' },
    { title: 'Red Candle', icon: '🔴', desc: 'Bear Candle' },
    { title: 'Checkmark', icon: '✅', desc: 'Confirmed' },
    { title: 'Cross Marker', icon: '❌', desc: 'Invalidated' },
    { title: 'Warning Flag', icon: '⚠️', desc: 'High Risk' },
    { title: 'Target Star', icon: '⭐', desc: 'Favorite' },
    { title: 'Pin Location', icon: '📍', desc: 'Key Price' }
  ];

  // ── 2. Interactive Runtime Engine Class ──
  class TVInteractiveEngine {
    constructor() {
      this.components = {};
      this.currentOverlay = null;
      this.currentTrigger = null;
      this.activeEmojiCategory = 'smiles';
      this.activeBottomTab = 'emojis';

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }

    async init() {
      console.log("%c[TV Interactive Engine v4]%c Initializing full interactive suite…", "background:#2962ff;color:#fff;font-weight:bold;padding:3px 8px;border-radius:4px;", "");
      await this.loadComponents();
      this.ensureOverlapManager();
      this.setupGlobalEvents();
      this.bindLeftSidebar();
      this.bindTopLeftMenu();
      this.bindHeaderControls();
      this.bindRightSidebar();
      console.log("%c[TV Interactive Engine v4]%c ALL SYSTEMS ONLINE & FULLY INTERACTIVE!", "background:#089981;color:#fff;font-weight:bold;padding:3px 8px;border-radius:4px;", "");
    }

    async loadComponents() {
      try {
        const res = await fetch('/static/tv_interactive_components.json');
        if (res.ok) {
          const data = await res.json();
          if (data && data.components) {
            data.components.forEach(c => {
              this.components[c.name] = c;
            });
          }
        }
      } catch (e) {
        console.warn("[TV Interactive Engine] tv_interactive_components.json loading fallback:", e);
      }
    }

    ensureOverlapManager() {
      let root = document.getElementById('overlap-manager-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'overlap-manager-root';
        root.style.position = 'absolute';
        root.style.top = '0';
        root.style.left = '0';
        root.style.width = '100%';
        root.style.height = '100%';
        root.style.pointerEvents = 'none';
        root.style.zIndex = '1000';
        document.body.appendChild(root);
      }
      this.overlapRoot = root;
    }

    setupGlobalEvents() {
      document.addEventListener('mousedown', (e) => {
        if (!this.currentOverlay) return;
        if (this.currentOverlay.contains(e.target)) return;
        if (this.currentTrigger && this.currentTrigger.contains(e.target)) return;
        this.closeOverlay();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentOverlay) {
          this.closeOverlay();
        }
      });
    }

    closeOverlay() {
      if (this.currentOverlay) {
        this.currentOverlay.remove();
        this.currentOverlay = null;
      }
      this.currentTrigger = null;
    }

    // ==========================================================================
    // 3. EMOJI, STICKERS & ICONS PICKER (Matches Images 1 & 2 Perfectly)
    // ==========================================================================
    openEmojiPicker(triggerBtn) {
      this.closeOverlay();

      const rect = triggerBtn.getBoundingClientRect();
      const picker = document.createElement('div');
      picker.className = 'tv-emojipicker-popup';
      picker.style.cssText = `
        position: fixed;
        left: 53px;
        top: ${Math.max(10, Math.min(window.innerHeight - 590, rect.top - 100))}px;
        width: 354px;
        height: 580px;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
        border: 1px solid #e0e3eb;
        z-index: 1050;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif;
        color: #131722;
      `;

      picker.innerHTML = `
        <!-- TOP CATEGORY TABS (Smiles, Animals, Food, Sports, Travel, Objects, Symbols, Flags) -->
        <div class="tv-ep-top-tabs" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px 6px 12px;
          border-bottom: 1px solid #f0f3fa;
          background: #ffffff;
          border-radius: 8px 8px 0 0;
        ">
          ${EMOJI_CATEGORIES.map(cat => `
            <button type="button" data-cat="${cat.id}" class="tv-ep-cat-btn ${cat.id === this.activeEmojiCategory ? 'active' : ''}" style="
              background: transparent;
              border: ${cat.id === this.activeEmojiCategory ? '2px solid #2962ff' : '1px solid transparent'};
              border-radius: 6px;
              padding: 4px 6px;
              font-size: 18px;
              line-height: 1;
              cursor: pointer;
              position: relative;
              transition: all 0.15s ease;
            ">
              ${cat.icon}
              ${cat.id === this.activeEmojiCategory ? `
                <div style="position: absolute; bottom: -8px; left: 0; right: 0; height: 3px; background: #2962ff; border-radius: 2px;"></div>
              ` : ''}
            </button>
          `).join('')}
        </div>

        <!-- SCROLLABLE CONTENT BODY -->
        <div id="tvEpScrollBody" style="
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
        ">
          <!-- EMOJIS VIEW -->
          <div id="tvEpEmojisView" style="display: ${this.activeBottomTab === 'emojis' ? 'block' : 'none'};">
            ${EMOJI_CATEGORIES.map(cat => `
              <div id="ep_sec_${cat.id}" style="margin-bottom: 16px;">
                <div style="
                  font-size: 11px;
                  font-weight: 700;
                  color: #787b86;
                  text-transform: uppercase;
                  letter-spacing: 0.6px;
                  margin-bottom: 8px;
                ">
                  ${cat.name}
                </div>
                <div style="
                  display: grid;
                  grid-template-columns: repeat(10, 1fr);
                  gap: 4px;
                ">
                  ${cat.emojis.map(em => `
                    <button type="button" data-emoji="${em}" class="tv-ep-emoji-item" style="
                      background: transparent;
                      border: none;
                      border-radius: 4px;
                      font-size: 20px;
                      height: 32px;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: background 0.1s ease, transform 0.1s ease;
                    ">
                      ${em}
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- STICKERS VIEW -->
          <div id="tvEpStickersView" style="display: ${this.activeBottomTab === 'stickers' ? 'block' : 'none'};">
            <div style="font-size: 11px; font-weight: 700; color: #787b86; text-transform: uppercase; margin-bottom: 10px;">
              TRADING STICKERS
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              ${STICKERS_DATA.map(st => `
                <button type="button" data-emoji="${st.icon}" class="tv-ep-sticker-item" style="
                  background: #f8f9fd;
                  border: 1px solid #e0e3eb;
                  border-radius: 8px;
                  padding: 8px 4px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 4px;
                ">
                  <span style="font-size: 28px;">${st.icon}</span>
                  <span style="font-size: 10px; font-weight: 600; color: #131722; text-align: center;">${st.title}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- ICONS VIEW -->
          <div id="tvEpIconsView" style="display: ${this.activeBottomTab === 'icons' ? 'block' : 'none'};">
            <div style="font-size: 11px; font-weight: 700; color: #787b86; text-transform: uppercase; margin-bottom: 10px;">
              MARKET & TECHNICAL ICONS
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              ${ICONS_DATA.map(ic => `
                <button type="button" data-emoji="${ic.icon}" class="tv-ep-sticker-item" style="
                  background: #f8f9fd;
                  border: 1px solid #e0e3eb;
                  border-radius: 8px;
                  padding: 8px 4px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 4px;
                ">
                  <span style="font-size: 26px;">${ic.icon}</span>
                  <span style="font-size: 10px; font-weight: 600; color: #131722; text-align: center;">${ic.title}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- BOTTOM TABS (Emojis / Stickers / Icons) -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 10px 16px;
          border-top: 1px solid #f0f3fa;
          background: #ffffff;
          border-radius: 0 0 8px 8px;
        ">
          <button type="button" id="tabBtnEmojis" style="
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: ${this.activeBottomTab === 'emojis' ? '#2962ff' : '#787b86'};
            position: relative;
            padding-bottom: 4px;
          ">
            Emojis
            ${this.activeBottomTab === 'emojis' ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #2962ff;"></div>` : ''}
          </button>

          <button type="button" id="tabBtnStickers" style="
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: ${this.activeBottomTab === 'stickers' ? '#2962ff' : '#787b86'};
            position: relative;
            padding-bottom: 4px;
          ">
            Stickers
            ${this.activeBottomTab === 'stickers' ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #2962ff;"></div>` : ''}
          </button>

          <button type="button" id="tabBtnIcons" style="
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: ${this.activeBottomTab === 'icons' ? '#2962ff' : '#787b86'};
            position: relative;
            padding-bottom: 4px;
          ">
            Icons
            ${this.activeBottomTab === 'icons' ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #2962ff;"></div>` : ''}
          </button>
        </div>
      `;

      this.overlapRoot.appendChild(picker);
      this.currentOverlay = picker;
      this.currentTrigger = triggerBtn;

      // Bind Top Category Buttons
      picker.querySelectorAll('.tv-ep-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const catId = btn.getAttribute('data-cat');
          this.activeEmojiCategory = catId;

          // Re-render picker maintaining position
          this.openEmojiPicker(triggerBtn);

          // Scroll to category section
          setTimeout(() => {
            const sec = document.getElementById(`ep_sec_${catId}`);
            if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 30);
        });
      });

      // Bind Bottom View Tabs
      const btnEmojis = picker.querySelector('#tabBtnEmojis');
      const btnStickers = picker.querySelector('#tabBtnStickers');
      const btnIcons = picker.querySelector('#tabBtnIcons');

      btnEmojis.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeBottomTab = 'emojis';
        this.openEmojiPicker(triggerBtn);
      });

      btnStickers.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeBottomTab = 'stickers';
        this.openEmojiPicker(triggerBtn);
      });

      btnIcons.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeBottomTab = 'icons';
        this.openEmojiPicker(triggerBtn);
      });

      // Bind Emoji / Sticker / Icon Selection
      picker.querySelectorAll('[data-emoji]').forEach(item => {
        item.addEventListener('mouseenter', () => {
          item.style.background = '#f0f3fa';
          item.style.transform = 'scale(1.15)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
          item.style.transform = 'scale(1)';
        });

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const emoji = item.getAttribute('data-emoji');
          console.log(`[TV Interactive Engine] Selected Emoji: ${emoji}`);

          // 1. Update left toolbar button icon (Matches Image 2)
          const groupWrap = triggerBtn.closest('[data-name*="linetool-group"]') || triggerBtn.parentElement;
          if (groupWrap) {
            const mainBtn = groupWrap.querySelector('button:first-child');
            if (mainBtn) {
              const iconContainer = mainBtn.querySelector('span[role="img"]') || mainBtn;
              iconContainer.innerHTML = `<span style="font-size: 20px; line-height: 1;">${emoji}</span>`;
            }
            // Give group the active blue border (Image 2)
            this.setActiveDrawingGroup(groupWrap);
          }

          // 2. Arm drawing engine for stamping on chart
          if (window.tvDrawingEngine) {
            window.tvDrawingEngine.setEmojiTool(emoji);
          }

          this.closeOverlay();
        });
      });
    }

    setActiveDrawingGroup(groupWrap) {
      document.querySelectorAll('#drawing-toolbar [data-name*="linetool-group"]').forEach(g => {
        g.style.border = 'none';
        g.style.background = 'transparent';
        g.style.borderRadius = '0';
        const b = g.querySelector('button');
        if (b) b.classList.remove('isActive-zm3YRUFG', 'active');
      });

      if (groupWrap) {
        groupWrap.style.border = '2px solid #2962ff';
        groupWrap.style.borderRadius = '8px';
        groupWrap.style.background = '#e1ecfb';
        const b = groupWrap.querySelector('button');
        if (b) b.classList.add('isActive-zm3YRUFG', 'active');
      }
    }

    // ==========================================================================
    // 4. BIND LEFT DRAWING SIDEBAR
    // ==========================================================================
    bindLeftSidebar() {
      const toolbar = document.getElementById('drawing-toolbar') || document.querySelector('div[class*="drawingToolbar-"]');
      if (!toolbar) return;

      // Icons / Stickers trigger
      const iconArrow = toolbar.querySelector('button[aria-label="Icons"], button[data-tooltip="Icons"]');
      const iconMain = toolbar.querySelector('button[aria-label="Icon"], button[data-tooltip="Icon"]');
      if (iconArrow) {
        iconArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEmojiPicker(iconArrow);
        });
      }
      if (iconMain) {
        iconMain.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEmojiPicker(iconMain);
        });
      }

      // Tool flyouts
      const flyouts = [
        { label: 'Cursors', comp: 'Cursors' },
        { label: 'Trend tools', comp: 'Trend tools' },
        { label: 'Gann and Fibonacci tools', comp: 'Gann and Fibonacci tools' },
        { label: 'Patterns', comp: 'Patterns' },
        { label: 'Forecasting and measurement tools', comp: 'Forecasting and measurement tools' },
        { label: 'Geometric shapes', comp: 'Geometric shapes' },
        { label: 'Annotation tools', comp: 'Annotation tools' },
        { label: 'Magnets', comp: 'Magnets' },
        { label: 'Lock options', comp: 'Lock options' },
        { label: 'Hide options', comp: 'Hide options' },
        { label: 'Remove options', comp: 'Remove options' }
      ];

      flyouts.forEach(f => {
        const btn = toolbar.querySelector(`button[aria-label="${f.label}"], button[data-tooltip="${f.label}"]`);
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const comp = this.components[f.comp];
            if (comp && comp.exactInlinedHTML) {
              this.showToolFlyout(comp.exactInlinedHTML, btn);
            }
          });
        }
      });

      // Primary buttons
      toolbar.querySelectorAll('button:not([class*="arrow"])').forEach(btn => {
        const lbl = (btn.getAttribute('aria-label') || btn.getAttribute('data-tooltip') || btn.getAttribute('data-name') || '').toLowerCase();
        if (lbl.includes('icon')) return; // handled above

        btn.addEventListener('click', (e) => {
          e.stopPropagation();

          if (lbl.includes('magnet')) {
            const isAct = btn.style.background === 'rgb(42, 46, 57)';
            btn.style.background = isAct ? 'transparent' : '#2a2e39';
            btn.style.borderRadius = '8px';
            const svg = btn.querySelector('svg');
            if (svg) svg.style.color = isAct ? 'currentColor' : '#ffffff';
            if (window.tvDrawingEngine) window.tvDrawingEngine.magnetMode = !isAct;
            return;
          }

          if (lbl.includes('keep drawing') || lbl.includes('draw-mode')) {
            const isStay = btn.style.background === 'rgb(42, 46, 57)';
            btn.style.background = isStay ? 'transparent' : '#2a2e39';
            btn.style.borderRadius = '8px';
            if (window.tvDrawingEngine) window.tvDrawingEngine.stayInDrawingMode = !isStay;
            return;
          }

          if (lbl.includes('lock')) {
            const locked = btn.classList.toggle('isActive-zm3YRUFG');
            if (window.tvDrawingEngine) window.tvDrawingEngine.lockAll = locked;
            return;
          }

          if (lbl.includes('hide')) {
            const hidden = btn.classList.toggle('isActive-zm3YRUFG');
            if (window.tvDrawingEngine) {
              window.tvDrawingEngine.hideAll = hidden;
              window.tvDrawingEngine.redraw();
            }
            return;
          }

          if (lbl.includes('remove') || lbl.includes('trash')) {
            if (window.tvDrawingEngine) {
              window.tvDrawingEngine.drawings = [];
              window.tvDrawingEngine.redraw();
              window.tvDrawingEngine.hideFloatingToolbar();
            }
            return;
          }

          // Generic tools
          const group = btn.closest('[data-name*="linetool-group"]');
          if (group) {
            this.setActiveDrawingGroup(group);
            const toolId = group.getAttribute('data-name').replace('linetool-group-', '');
            if (window.tvDrawingEngine) {
              window.tvDrawingEngine.selectTool(toolId, btn);
            }
          }
        });
      });
    }

    showToolFlyout(html, triggerBtn) {
      this.closeOverlay();
      const rect = triggerBtn.getBoundingClientRect();
      const container = document.createElement('div');
      container.className = 'tv-mounted-tool-flyout';
      container.innerHTML = html;
      container.style.cssText = `
        position: fixed;
        left: 53px;
        top: ${Math.max(10, Math.min(window.innerHeight - 450, rect.top - 20))}px;
        z-index: 1050;
        pointer-events: auto;
      `;

      this.overlapRoot.appendChild(container);
      this.currentOverlay = container;
      this.currentTrigger = triggerBtn;

      // Wire items inside flyout
      container.querySelectorAll('button, [role="menuitem"], div[class*="item-"]').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const toolLabel = item.getAttribute('data-name') || item.innerText.trim() || item.getAttribute('aria-label');
          console.log(`[TV Interactive Engine] Activated Tool: ${toolLabel}`);

          const groupWrap = triggerBtn.closest('[data-name*="linetool-group"]') || triggerBtn.parentElement;
          if (groupWrap) {
            const mainBtn = groupWrap.querySelector('button:first-child');
            const itemSvg = item.querySelector('svg');
            if (mainBtn && itemSvg) {
              const iconContainer = mainBtn.querySelector('span[role="img"]') || mainBtn;
              iconContainer.innerHTML = itemSvg.outerHTML;
            }
            this.setActiveDrawingGroup(groupWrap);
          }

          if (window.tvDrawingEngine) {
            let toolId = 'trendline';
            const l = toolLabel.toLowerCase();
            if (l.includes('ray')) toolId = 'ray';
            else if (l.includes('extended')) toolId = 'extended';
            else if (l.includes('horizontal') || l.includes('horz')) toolId = 'horzline';
            else if (l.includes('vertical') || l.includes('vert')) toolId = 'vertline';
            else if (l.includes('rectangle') || l.includes('box')) toolId = 'rectangle';
            else if (l.includes('fib')) toolId = 'fibret';
            else if (l.includes('brush')) toolId = 'brush';
            else if (l.includes('highlighter')) toolId = 'highlighter';
            else if (l.includes('long')) toolId = 'longposition';
            else if (l.includes('short')) toolId = 'shortposition';
            else if (l.includes('measure')) toolId = 'measure';
            else if (l.includes('text')) toolId = 'text';

            window.tvDrawingEngine.selectTool(toolId);
          }

          this.closeOverlay();
        });
      });
    }

    // ==========================================================================
    // 5. BIND TOP-LEFT "K 11" MENU (Matching Image 2)
    // ==========================================================================
    bindTopLeftMenu() {
      const selectors = [
        '#main-menu-button',
        '.topLeftButton-S91GUQp3 button',
        'div[class*="userMenu-"] button',
        'button[aria-label*="menu" i]',
        'button[aria-label*="user" i]'
      ];

      let menuBtn = null;
      for (const sel of selectors) {
        menuBtn = document.querySelector(sel);
        if (menuBtn) break;
      }
      if (!menuBtn) return;

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTopLeftMenu(menuBtn);
      });
    }

    openTopLeftMenu(menuBtn) {
      this.closeOverlay();

      const menu = document.createElement('div');
      menu.className = 'tv-top-left-dropdown-v4';
      menu.style.cssText = `
        position: fixed;
        top: 38px;
        left: 0px;
        width: 290px;
        background: #ffffff;
        border-radius: 0 8px 8px 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
        border: 1px solid #e0e3eb;
        border-top: none;
        z-index: 1050;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif;
        color: #131722;
        padding: 6px 0;
        max-height: calc(100vh - 48px);
        overflow-y: auto;
      `;

      menu.innerHTML = `
        <!-- PRODUCTS & MARKETS -->
        <div style="padding: 8px 16px 4px 16px; font-size: 11px; font-weight: 700; color: #787b86; text-transform: uppercase;">
          PRODUCTS & MARKETS
        </div>
        <a href="/chart/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; background: #f0f3fa; font-weight: 600; font-size: 14px;">
          <span style="font-size: 18px;">📈</span> Supercharts
        </a>
        <a href="/markets/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">🌐</span> Markets Overview
        </a>
        <a href="/markets/indices/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">📊</span> World Indices
        </a>
        <a href="/markets/stocks-india/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 13px; font-weight: bold; background: #f0f3fa; padding: 2px 4px; border-radius: 4px;">IN</span> Indian Stocks (NSE/BSE)
        </a>

        <div style="height: 1px; background: #e0e3eb; margin: 6px 0;"></div>

        <!-- SCREENERS & TOOLS -->
        <div style="padding: 8px 16px 4px 16px; font-size: 11px; font-weight: 700; color: #787b86; text-transform: uppercase;">
          SCREENERS & TOOLS
        </div>
        <a href="/screener/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">🔍</span> Stock Screener
        </a>
        <a href="/crypto-screener/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">₿</span> Crypto Screener
        </a>
        <a href="/forex-screener/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">💱</span> Forex Screener
        </a>
        <a href="/heatmap/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">🗺️</span> Stock Heatmap
        </a>
        <a href="/calendar/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">📅</span> Economic Calendar
        </a>

        <div style="height: 1px; background: #e0e3eb; margin: 6px 0;"></div>

        <!-- NEWS & COMMUNITY -->
        <div style="padding: 8px 16px 4px 16px; font-size: 11px; font-weight: 700; color: #787b86; text-transform: uppercase;">
          NEWS & COMMUNITY
        </div>
        <a href="/news/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">📰</span> Market News
        </a>
        <a href="/community/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">👥</span> Community Ideas
        </a>
        <a href="/symbols/NSE-NIFTY/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #131722; font-size: 14px;">
          <span style="font-size: 18px;">⚡</span> NIFTY 50 Overview
        </a>
        <a href="/pricing/" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; text-decoration: none; color: #2962ff; font-weight: 600; font-size: 14px;">
          <span style="font-size: 18px;">⭐</span> Pricing & Plans
        </a>

        <div style="height: 1px; background: #e0e3eb; margin: 6px 0;"></div>

        <!-- SETTINGS & TOGGLES -->
        <div style="padding: 4px 16px;">
          <div id="toggleThemeRow" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; cursor: pointer;">
            <span style="font-size: 13px;">Dark theme</span>
            <input type="checkbox" id="themeCheckbox" style="cursor: pointer;" ${document.documentElement.classList.contains('theme-dark') ? 'checked' : ''} />
          </div>
          <div id="toggleDrawingPanelRow" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; cursor: pointer;">
            <span style="font-size: 13px;">Drawings panel</span>
            <input type="checkbox" id="drawingsCheckbox" checked style="cursor: pointer;" />
          </div>
        </div>
      `;

      this.overlapRoot.appendChild(menu);
      this.currentOverlay = menu;
      this.currentTrigger = menuBtn;

      // Bind Theme Toggle
      const themeBox = menu.querySelector('#themeCheckbox');
      menu.querySelector('#toggleThemeRow').addEventListener('click', () => {
        themeBox.checked = !themeBox.checked;
        document.documentElement.classList.toggle('theme-dark', themeBox.checked);
        document.documentElement.classList.toggle('theme-light', !themeBox.checked);
      });

      // Bind Drawing Panel Toggle
      const drawBox = menu.querySelector('#drawingsCheckbox');
      menu.querySelector('#toggleDrawingPanelRow').addEventListener('click', () => {
        drawBox.checked = !drawBox.checked;
        const panel = document.querySelector('.layout__area--left');
        if (panel) panel.style.display = drawBox.checked ? 'block' : 'none';
      });
    }

    // ==========================================================================
    // 6. BIND HEADER CONTROLS (Symbol Search, Timeframe, Candles, Indicators)
    // ==========================================================================
    bindHeaderControls() {
      // Symbol Search
      const searchTrigger = document.querySelector('#header-toolbar-symbol-search, [title="Symbol search"], button[class*="searchButton-"]');
      if (searchTrigger) {
        searchTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.openSymbolSearch) {
            window.openSymbolSearch();
          } else {
            const comp = this.components['Symbol Search Modal'];
            if (comp) this.showCenterModal(comp.exactInlinedHTML);
          }
        });
      }

      // Timeframe Intervals
      const intervalTrigger = document.querySelector('#header-toolbar-intervals, [data-tooltip="1 day"], [aria-label="1 day"]');
      if (intervalTrigger) {
        intervalTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const comp = this.components['Timeframe Intervals Dropdown'];
          if (comp) {
            this.showDropdownUnder(comp.exactInlinedHTML, intervalTrigger, (item) => {
              const tf = item.innerText.trim();
              if (window.tradingChart && window.tradingChart.setTimeframe) {
                window.tradingChart.setTimeframe(tf);
              }
              const display = intervalTrigger.querySelector('.value-H5xoxugV') || intervalTrigger;
              if (display) display.textContent = tf;
            });
          }
        });
      }

      // Candle Styles
      const candleTrigger = document.querySelector('#header-toolbar-chart-styles, [aria-label="Candles"]');
      if (candleTrigger) {
        candleTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const comp = this.components['Chart Candle Styles Dropdown'];
          if (comp) {
            this.showDropdownUnder(comp.exactInlinedHTML, candleTrigger, (item) => {
              console.log("[TV Interactive Engine] Selected Candle Style:", item.innerText.trim());
            });
          }
        });
      }

      // Indicators Dialog
      const indTrigger = document.querySelector('#header-toolbar-indicators, [data-name="open-indicators-dialog"]');
      if (indTrigger) {
        indTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const comp = this.components['Indicators & Strategies Dialog'];
          if (comp) this.showCenterModal(comp.exactInlinedHTML);
        });
      }

      // Alert Dialog
      const alertTrigger = document.querySelector('#header-toolbar-alerts, [data-tooltip="Create alert"]');
      if (alertTrigger) {
        alertTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const comp = this.components['Create Alert Dialog'];
          if (comp) this.showCenterModal(comp.exactInlinedHTML);
        });
      }

      // Chart Settings
      const setTrigger = document.querySelector('[data-tooltip="Settings"], [aria-label="Settings"]');
      if (setTrigger) {
        setTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const comp = this.components['Chart Settings Dialog'];
          if (comp) this.showCenterModal(comp.exactInlinedHTML);
        });
      }
    }

    showDropdownUnder(html, triggerBtn, onSelect) {
      this.closeOverlay();
      const rect = triggerBtn.getBoundingClientRect();
      const dd = document.createElement('div');
      dd.innerHTML = html;
      dd.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 4}px;
        left: ${rect.left}px;
        z-index: 1050;
        pointer-events: auto;
      `;

      this.overlapRoot.appendChild(dd);
      this.currentOverlay = dd;
      this.currentTrigger = triggerBtn;

      dd.querySelectorAll('button, [role="menuitem"], div[class*="item-"]').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelect) onSelect(item);
          this.closeOverlay();
        });
      });
    }

    showCenterModal(html) {
      this.closeOverlay();
      const modal = document.createElement('div');
      modal.innerHTML = html;
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1060;
        pointer-events: auto;
      `;

      this.overlapRoot.appendChild(modal);
      this.currentOverlay = modal;

      modal.querySelectorAll('[data-name="close"], button[aria-label="Close"], button[class*="close-"]').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => this.closeOverlay());
      });
    }

    // ==========================================================================
    // 7. BIND RIGHT SIDEBAR (Watchlist)
    // ==========================================================================
    bindRightSidebar() {
      // Symbols in watchlist
      document.querySelectorAll('[data-symbol-short], [data-symbol]').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          const sym = row.getAttribute('data-symbol-short') || row.getAttribute('data-symbol');
          if (sym && window.switchSymbol) {
            window.switchSymbol(sym);
          }
        });
      });
    }
  }

  // Mount globally
  window.tvInteractiveEngine = new TVInteractiveEngine();
})();
