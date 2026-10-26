(() => {
  'use strict';

  // 独立卡片窗口（card.html）的界面逻辑。
  // 早期版本是注入网页的 content script；现在不再注入任何网页。

  const SEARCH_STATS_KEY = 'edgeShortcutSearchStats';

  // ============ 快捷键数据（可自行增删） ============
  const SHORTCUTS = [
    // 标签页
    { id: 'tab-new',        keys: ['Ctrl', 'T'],           title: '新建标签页',           cat: '标签页' },
    { id: 'tab-close',      keys: ['Ctrl', 'W'],           title: '关闭当前标签页',       cat: '标签页' },
    { id: 'tab-reopen',     keys: ['Ctrl', 'Shift', 'T'],  title: '重新打开关闭的标签页', cat: '标签页' },
    { id: 'tab-next',       keys: ['Ctrl', 'Tab'],         title: '下一个标签页',         cat: '标签页' },
    { id: 'tab-prev',       keys: ['Ctrl', 'Shift', 'Tab'],title: '上一个标签页',         cat: '标签页' },
    { id: 'tab-jump',       keys: ['Ctrl', '1~8'],         title: '跳到第 N 个标签页',    cat: '标签页' },
    { id: 'tab-last',       keys: ['Ctrl', '9'],           title: '跳到最后一个标签页',   cat: '标签页' },

    // 窗口
    { id: 'win-new',        keys: ['Ctrl', 'N'],           title: '新建窗口',             cat: '窗口' },
    { id: 'win-private',    keys: ['Ctrl', 'Shift', 'N'],  title: '新建 InPrivate 窗口',  cat: '窗口' },
    { id: 'win-close',      keys: ['Ctrl', 'Shift', 'W'],  title: '关闭当前窗口',         cat: '窗口' },
    { id: 'win-fullscreen', keys: ['F11'],                 title: '切换全屏',             cat: '窗口' },

    // 导航
    { id: 'nav-back',       keys: ['Alt', '←'],            title: '后退',                 cat: '导航' },
    { id: 'nav-forward',    keys: ['Alt', '→'],            title: '前进',                 cat: '导航' },
    { id: 'nav-refresh',    keys: ['Ctrl', 'R'],           title: '刷新页面',             cat: '导航' },
    { id: 'nav-hard',       keys: ['Ctrl', 'Shift', 'R'],  title: '强制刷新（忽略缓存）', cat: '导航' },
    { id: 'nav-stop',       keys: ['Esc'],                 title: '停止加载',             cat: '导航' },
    { id: 'nav-home',       keys: ['Alt', 'Home'],         title: '打开主页',             cat: '导航' },

    // 地址栏
    { id: 'url-focus',      keys: ['Ctrl', 'L'],           title: '聚焦地址栏',           cat: '地址栏' },
    { id: 'url-focus2',     keys: ['Alt', 'D'],            title: '聚焦地址栏',           cat: '地址栏' },
    { id: 'url-newtab',     keys: ['Alt', 'Enter'],        title: '新标签页打开地址',     cat: '地址栏' },
    { id: 'url-www',        keys: ['Ctrl', 'Enter'],       title: '补全 www…com 后打开',  cat: '地址栏' },

    // 页面
    { id: 'page-find',      keys: ['Ctrl', 'F'],           title: '页内查找',             cat: '页面' },
    { id: 'page-find-next', keys: ['Ctrl', 'G'],           title: '查找下一个',           cat: '页面' },
    { id: 'page-find-prev', keys: ['Ctrl', 'Shift', 'G'],  title: '查找上一个',           cat: '页面' },
    { id: 'page-print',     keys: ['Ctrl', 'P'],           title: '打印',                 cat: '页面' },
    { id: 'page-save',      keys: ['Ctrl', 'S'],           title: '保存页面',             cat: '页面' },
    { id: 'page-open',      keys: ['Ctrl', 'O'],           title: '打开本地文件',         cat: '页面' },
    { id: 'page-source',    keys: ['Ctrl', 'U'],           title: '查看网页源代码',       cat: '页面' },

    // 缩放
    { id: 'zoom-in',        keys: ['Ctrl', '+'],           title: '放大',                 cat: '缩放' },
    { id: 'zoom-out',       keys: ['Ctrl', '-'],           title: '缩小',                 cat: '缩放' },
    { id: 'zoom-reset',     keys: ['Ctrl', '0'],           title: '恢复默认缩放',         cat: '缩放' },

    // 收藏与历史
    { id: 'fav-add',        keys: ['Ctrl', 'D'],           title: '收藏当前页',           cat: '收藏与历史' },
    { id: 'fav-all',        keys: ['Ctrl', 'Shift', 'D'],  title: '收藏所有标签页',       cat: '收藏与历史' },
    { id: 'fav-manage',     keys: ['Ctrl', 'Shift', 'O'],  title: '收藏夹管理器',         cat: '收藏与历史' },
    { id: 'hist-open',      keys: ['Ctrl', 'H'],           title: '打开历史记录',         cat: '收藏与历史' },
    { id: 'dl-open',        keys: ['Ctrl', 'J'],           title: '打开下载内容',         cat: '收藏与历史' },
    { id: 'clear-data',     keys: ['Ctrl', 'Shift', 'Delete'], title: '清除浏览数据',      cat: '收藏与历史' },

    // 开发者
    { id: 'devtools',       keys: ['F12'],                 title: '开发者工具',           cat: '开发者' },
    { id: 'devtools2',      keys: ['Ctrl', 'Shift', 'I'],  title: '开发者工具',           cat: '开发者' },
    { id: 'console',        keys: ['Ctrl', 'Shift', 'J'],  title: '打开控制台',           cat: '开发者' },
    { id: 'inspect',        keys: ['Ctrl', 'Shift', 'C'],  title: '检查元素',             cat: '开发者' },

    // Edge 特色
    { id: 'edge-capture',   keys: ['Ctrl', 'Shift', 'S'],  title: '网页捕获',             cat: 'Edge 特色' },
    { id: 'edge-split',     keys: ['Ctrl', 'Shift', 'E'],  title: '拆分屏幕',             cat: 'Edge 特色' },
    { id: 'edge-collect',   keys: ['Ctrl', 'Shift', 'Y'],  title: '集锦',                 cat: 'Edge 特色' },
    { id: 'edge-read',      keys: ['Ctrl', 'Shift', 'U'],  title: '朗读此页',             cat: 'Edge 特色' },
    { id: 'edge-favbar',    keys: ['Ctrl', 'Shift', 'B'],  title: '显示/隐藏收藏栏',      cat: 'Edge 特色' },
    { id: 'edge-paste',     keys: ['Ctrl', 'Shift', 'V'],  title: '粘贴为纯文本',         cat: 'Edge 特色' },
    { id: 'edge-menu',      keys: ['Alt', 'F'],            title: '打开设置菜单',         cat: 'Edge 特色' },
  ];

  const SORT_ORDER = ['frequency', 'default', 'category'];

  // ============ 状态 ============
  const state = {
    query: '',
    sortBy: 'frequency',
    stats: {},
  };

  // ============ DOM ============
  const listEl = document.querySelector('.list');
  const searchEl = document.querySelector('.search');
  const sortBtn = document.querySelector('.sort');
  const closeBtn = document.querySelector('.close');
  const refreshBtn = document.querySelector('.refresh');
  const restoreBtn = document.querySelector('.restore');
  const toastEl = document.querySelector('.toast');

  // ============ 工具 ============
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(response);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function loadStats() {
    try {
      const res = await sendMessage({ type: 'ESC_GET_STATS' });
      if (res && res.ok && res.stats && typeof res.stats === 'object') {
        return res.stats;
      }
      throw new Error(res?.error || '读取失败');
    } catch (e) {
      // background 不可用时退回直接读 storage
      const data = await chrome.storage.local.get(SEARCH_STATS_KEY);
      const stats = data[SEARCH_STATS_KEY];
      return (stats && typeof stats === 'object') ? stats : {};
    }
  }

  // ============ 排序 / 过滤 ============
  function getVisibleList() {
    const q = state.query.trim().toLowerCase();
    let arr = SHORTCUTS;

    if (q) {
      arr = arr.filter((s) => {
        const hay = `${s.title} ${s.cat} ${s.keys.join(' ')}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const cnt = (id) => state.stats[id] || 0;

    if (state.sortBy === 'frequency') {
      arr = [...arr].sort((a, b) => cnt(b.id) - cnt(a.id) || a.title.localeCompare(b.title, 'zh'));
    } else if (state.sortBy === 'category') {
      arr = [...arr].sort((a, b) => a.cat.localeCompare(b.cat, 'zh') || a.title.localeCompare(b.title, 'zh'));
    }

    return arr;
  }

  // ============ 渲染 ============
  function render(resetScroll = false) {
    const prevScroll = listEl.scrollTop;
    const items = getVisibleList();

    if (!items.length) {
      listEl.innerHTML = '<div class="empty">没有找到匹配的快捷键</div>';
      listEl.scrollTop = 0;
      return;
    }

    let html = '';
    let lastCat = null;

    for (const s of items) {
      if (state.sortBy === 'category' && s.cat !== lastCat) {
        html += `<div class="group">${escapeHtml(s.cat)}</div>`;
        lastCat = s.cat;
      }

      const count = state.stats[s.id] || 0;
      const keyHtml = s.keys
        .map((k) => `<kbd>${escapeHtml(k)}</kbd>`)
        .join('<span class="plus">+</span>');

      html += `
        <div class="item" data-id="${s.id}">
          <div class="keys">${keyHtml}</div>
          <div class="text">
            <div class="title">${escapeHtml(s.title)}</div>
            ${state.sortBy === 'category' ? '' : `<div class="cat">${escapeHtml(s.cat)}</div>`}
          </div>
          ${count > 0 ? `<div class="count" title="搜索次数">${count}</div>` : ''}
        </div>`;
    }

    listEl.innerHTML = html;
    listEl.scrollTop = resetScroll ? 0 : prevScroll;
  }

  function updateSortLabel() {
    sortBtn.textContent = { frequency: '频率', default: '默认', category: '分类' }[state.sortBy];
  }

  function mergeStats(incoming) {
    if (!incoming || typeof incoming !== 'object') return;
    for (const [id, raw] of Object.entries(incoming)) {
      const count = Number(raw);
      if (Number.isFinite(count) && count > (state.stats[id] || 0)) {
        state.stats[id] = count;
      }
    }
  }

  function findItem(id) {
    return listEl.querySelector(`.item[data-id="${id}"]`);
  }

  function paintCount(id) {
    const item = findItem(id);
    if (!item) return;

    const count = state.stats[id] || 0;
    let badge = item.querySelector('.count');

    if (count > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'count';
        badge.title = '搜索次数';
        item.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  }

  function flashItem(id) {
    const item = findItem(id);
    if (!item) return;

    item.classList.remove('flash');
    void item.offsetWidth;
    item.classList.add('flash');
    setTimeout(() => item.classList.remove('flash'), 600);
  }

  let toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ============ 搜索计数 ============
  // 规则：搜索框有内容时按回车，给当前可见结果的第一条 +1。
  let lastRecordAt = 0;
  let dataEpoch = 0;

  async function recordSearch(target) {
    const now = Date.now();
    if (now - lastRecordAt < 400) return;
    lastRecordAt = now;

    const epoch = dataEpoch;

    try {
      const res = await sendMessage({ type: 'ESC_RECORD_SEARCH', id: target.id });
      if (!res || !res.ok) throw new Error(res?.error || '记录失败');

      // 期间如果点了刷新/恢复，旧请求的结果不要覆盖新状态
      if (epoch !== dataEpoch) return;

      const count = Number(res.count);
      const next = Number.isFinite(count)
        ? count
        : (state.stats[target.id] || 0) + 1;
      state.stats[target.id] = Math.max(state.stats[target.id] || 0, next);

      paintCount(target.id);
      flashItem(target.id);
      showToast(`已记录搜索：${target.title}`);
    } catch (e) {
      console.warn('[快捷键卡片] 记录搜索次数失败：', e?.message || e);
      showToast('记录失败，请重试');
    }
  }

  // ============ 数据按钮 ============
  async function refreshStats() {
    if (refreshBtn.disabled) return;

    const epoch = ++dataEpoch;
    refreshBtn.disabled = true;
    restoreBtn.disabled = true;
    try {
      const stats = await loadStats();
      if (epoch !== dataEpoch) return;

      mergeStats(stats);
      render(true);
      searchEl.focus();
      showToast('已刷新');
    } catch (e) {
      console.warn('[快捷键卡片] 刷新搜索次数失败：', e?.message || e);
      showToast('刷新失败，请重试');
    } finally {
      refreshBtn.disabled = false;
      restoreBtn.disabled = false;
    }
  }

  async function restoreStats() {
    if (restoreBtn.disabled) return;
    if (!window.confirm('确定清空所有搜索次数，恢复默认数据？')) return;

    const epoch = ++dataEpoch;
    restoreBtn.disabled = true;
    refreshBtn.disabled = true;
    try {
      const res = await sendMessage({ type: 'ESC_RESET_STATS' });
      if (!res || !res.ok) throw new Error(res?.error || '恢复失败');
      if (epoch !== dataEpoch) return;

      state.stats = {};
      state.query = '';
      searchEl.value = '';
      state.sortBy = 'frequency';
      lastRecordAt = 0;
      updateSortLabel();
      render(true);
      searchEl.focus();
      showToast('已恢复默认');
    } catch (e) {
      console.warn('[快捷键卡片] 恢复默认数据失败：', e?.message || e);
      showToast('恢复失败，请重试');
    } finally {
      restoreBtn.disabled = false;
      refreshBtn.disabled = false;
    }
  }

  function closeCard() {
    try {
      chrome.windows.getCurrent((win) => {
        if (chrome.runtime.lastError || !win || win.id === undefined) {
          window.close();
          return;
        }
        // 只在真正的 popup 窗口里移除窗口；手工在普通标签页打开时不要关掉整个浏览器窗口
        if (win.type !== 'popup') {
          window.close();
          return;
        }
        chrome.windows.remove(win.id, () => {
          if (chrome.runtime.lastError) window.close();
        });
      });
    } catch (e) {
      window.close();
    }
  }

  // ============ 事件 ============
  searchEl.addEventListener('input', () => {
    state.query = searchEl.value;
    render(true);
  });

  searchEl.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;

    if (e.key === 'Enter') {
      if (e.repeat) return;
      e.preventDefault();

      const q = state.query.trim();
      if (!q) return;

      const items = getVisibleList();
      if (!items.length) {
        showToast('没有匹配的快捷键');
        return;
      }

      recordSearch(items[0]);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();

      if (searchEl.value) {
        searchEl.value = '';
        state.query = '';
        render(true);
      } else {
        closeCard();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target !== searchEl) closeCard();
  });

  sortBtn.addEventListener('click', () => {
    const index = SORT_ORDER.indexOf(state.sortBy);
    state.sortBy = SORT_ORDER[(index + 1) % SORT_ORDER.length];
    updateSortLabel();
    render(true);
    searchEl.focus();
  });

  closeBtn.addEventListener('click', closeCard);
  refreshBtn.addEventListener('click', refreshStats);
  restoreBtn.addEventListener('click', restoreStats);

  // 条目本身没有点击动作；点击列表后把焦点还给搜索框，方便继续输入/回车
  listEl.addEventListener('click', () => searchEl.focus());

  window.addEventListener('focus', () => searchEl.focus());

  // ============ 初始化 ============
  (async () => {
    updateSortLabel();
    const epoch = dataEpoch;

    try {
      const stats = await loadStats();
      if (epoch === dataEpoch) mergeStats(stats);
    } catch (e) {
      console.warn('[快捷键卡片] 读取搜索次数失败：', e?.message || e);
      if (epoch === dataEpoch) showToast('读取搜索次数失败');
    }

    // 如果加载期间已经点了刷新/恢复，不要用旧结果覆盖新状态；列表仍然先画出来
    render();
    searchEl.focus();
  })();
})();
