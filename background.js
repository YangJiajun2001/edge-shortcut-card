// 独立卡片窗口：打开/聚焦/关闭，以及跨标签页共享的搜索次数。
const CARD_URL = chrome.runtime.getURL('card.html');

const SEARCH_STATS_KEY = 'edgeShortcutSearchStats';
const LEGACY_STATS_KEY = 'edgeShortcutStats';
const LEGACY_POS_KEY = 'edgeShortcutCardPos';
const WINDOW_ID_KEY = 'edgeShortcutCardWindowId';
const BOUNDS_KEY = 'edgeShortcutCardBounds';

const CARD_WIDTH = 380;
const CARD_HEIGHT = 640;

// storage.session 只在浏览器会话内有效；旧版本没有该 API 时退回 local。
const windowIdStore = chrome.storage.session || chrome.storage.local;

let cardWindowId = null;
let showInFlight = null;
let statsWriteChain = Promise.resolve();
let boundsSaveTimer = null;
let pendingBounds = null;

// ==================== 卡片窗口 ====================

async function getStoredWindowId() {
  try {
    const data = await windowIdStore.get(WINDOW_ID_KEY);
    const id = data?.[WINDOW_ID_KEY];
    return Number.isInteger(id) ? id : null;
  } catch (e) {
    return null;
  }
}

async function setStoredWindowId(id) {
  try {
    await windowIdStore.set({ [WINDOW_ID_KEY]: id });
  } catch (e) {
    // 窗口仍然可用，只是下次 service worker 重启后可能找不到它
  }
}

async function clearStoredWindowId() {
  try {
    await windowIdStore.remove(WINDOW_ID_KEY);
  } catch (e) {
    // 忽略
  }
}

async function getWindow(id) {
  try {
    return await chrome.windows.get(id);
  } catch (e) {
    return null;
  }
}

function validBounds(bounds) {
  return Boolean(
    bounds &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width >= 320 &&
    bounds.height >= 400
  );
}

async function getStoredBounds() {
  try {
    const data = await chrome.storage.local.get(BOUNDS_KEY);
    const bounds = data?.[BOUNDS_KEY];
    return validBounds(bounds) ? bounds : null;
  } catch (e) {
    return null;
  }
}

async function defaultBounds(tab) {
  const bounds = { width: CARD_WIDTH, height: CARD_HEIGHT };

  try {
    const parent = tab?.windowId
      ? await chrome.windows.get(tab.windowId)
      : await chrome.windows.getLastFocused();

    if (
      parent &&
      Number.isFinite(parent.left) &&
      Number.isFinite(parent.top) &&
      Number.isFinite(parent.width) &&
      Number.isFinite(parent.height)
    ) {
      bounds.left = Math.round(parent.left + Math.max(0, (parent.width - CARD_WIDTH) / 2));
      bounds.top = Math.round(parent.top + Math.max(0, (parent.height - CARD_HEIGHT) / 3));
    }
  } catch (e) {
    // 拿不到父窗口位置时交给浏览器决定
  }

  return bounds;
}

async function doShowCard(tab) {
  const id = cardWindowId ?? await getStoredWindowId();

  if (id !== null) {
    const win = await getWindow(id);
    if (win) {
      cardWindowId = win.id;

      // 卡片始终保留：再次触发只聚焦/还原，不自动关闭，避免误触把窗口关掉
      const update = { focused: true };
      if (win.state === 'minimized') update.state = 'normal';
      try {
        await chrome.windows.update(win.id, update);
      } catch (e) {
        console.warn('[快捷键卡片] 聚焦卡片窗口失败：', e?.message || e);
      }
      return;
    }

    cardWindowId = null;
    await clearStoredWindowId();
  }

  const stored = await getStoredBounds();
  const bounds = stored || await defaultBounds(tab);

  const options = {
    url: CARD_URL,
    type: 'popup',
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    focused: true,
  };
  if (Number.isFinite(bounds.left)) options.left = Math.round(bounds.left);
  if (Number.isFinite(bounds.top)) options.top = Math.round(bounds.top);

  try {
    const win = await chrome.windows.create(options);
    if (win?.id !== undefined) {
      cardWindowId = win.id;
      await setStoredWindowId(win.id);
    }
  } catch (e) {
    console.warn('[快捷键卡片] 打开卡片窗口失败：', e?.message || e);
  }
}

function showCard(tab) {
  if (showInFlight) return showInFlight;

  showInFlight = doShowCard(tab).finally(() => {
    showInFlight = null;
  });
  return showInFlight;
}

chrome.action.onClicked.addListener((tab) => {
  showCard(tab).catch((e) => {
    console.warn('[快捷键卡片] 打开卡片失败：', e?.message || e);
  });
});

chrome.windows.onRemoved.addListener((id) => {
  if (cardWindowId === id) {
    cardWindowId = null;
    clearStoredWindowId();
  }
});

// 记住用户拖动/缩放后的窗口位置；该事件在旧版 Edge 中可能不存在
if (chrome.windows.onBoundsChanged) {
  chrome.windows.onBoundsChanged.addListener((win) => {
    saveBoundsIfCard(win).catch(() => {});
  });
}

async function saveBoundsIfCard(win) {
  const id = cardWindowId ?? await getStoredWindowId();
  if (id !== win.id) return;
  cardWindowId = win.id;

  const bounds = {
    left: win.left,
    top: win.top,
    width: win.width,
    height: win.height,
  };
  if (!validBounds(bounds)) return;

  pendingBounds = bounds;
  if (boundsSaveTimer) return;

  boundsSaveTimer = setTimeout(() => {
    boundsSaveTimer = null;
    const next = pendingBounds;
    pendingBounds = null;
    if (!next) return;
    chrome.storage.local.set({ [BOUNDS_KEY]: next }).catch(() => {});
  }, 250);
}

// ==================== 搜索次数 ====================
// 所有写入都走同一条队列，避免多个上下文同时修改时互相覆盖。

function enqueueStats(task) {
  const run = statsWriteChain.then(task);
  statsWriteChain = run.catch(() => {});
  return run;
}

function incrementSearchStat(id) {
  return enqueueStats(async () => {
    const data = await chrome.storage.local.get(SEARCH_STATS_KEY);
    const stored = data?.[SEARCH_STATS_KEY];
    const stats = (stored && typeof stored === 'object') ? stored : {};

    stats[id] = (Number(stats[id]) || 0) + 1;
    await chrome.storage.local.set({ [SEARCH_STATS_KEY]: stats });
    return stats[id];
  });
}

function readSearchStats() {
  return enqueueStats(async () => {
    const data = await chrome.storage.local.get(SEARCH_STATS_KEY);
    const stored = data?.[SEARCH_STATS_KEY];
    return (stored && typeof stored === 'object') ? stored : {};
  });
}

function resetSearchStats() {
  return enqueueStats(async () => {
    await chrome.storage.local.set({ [SEARCH_STATS_KEY]: {} });

    // 旧版本的“点击次数”和网页卡片位置不再使用，一并清掉；清理失败也不影响恢复默认
    await chrome.storage.local.remove([LEGACY_STATS_KEY, LEGACY_POS_KEY]).catch(() => {});
    return {};
  });
}

function respond(sendResponse, payload) {
  try {
    sendResponse(payload);
  } catch (e) {
    // 页面已经关闭
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return;

  if (msg.type === 'ESC_RECORD_SEARCH') {
    if (typeof msg.id !== 'string' || !/^[a-z0-9-]{1,64}$/i.test(msg.id)) {
      respond(sendResponse, { ok: false, error: 'invalid id' });
      return;
    }

    incrementSearchStat(msg.id)
      .then((count) => respond(sendResponse, { ok: true, count }))
      .catch((e) => {
        console.warn('[快捷键卡片] 记录搜索次数失败：', e?.message || e);
        respond(sendResponse, { ok: false, error: String(e?.message || e) });
      });
    return true;
  }

  if (msg.type === 'ESC_GET_STATS') {
    readSearchStats()
      .then((stats) => respond(sendResponse, { ok: true, stats }))
      .catch((e) => {
        respond(sendResponse, { ok: false, error: String(e?.message || e) });
      });
    return true;
  }

  if (msg.type === 'ESC_RESET_STATS') {
    resetSearchStats()
      .then(() => respond(sendResponse, { ok: true }))
      .catch((e) => {
        console.warn('[快捷键卡片] 恢复默认数据失败：', e?.message || e);
        respond(sendResponse, { ok: false, error: String(e?.message || e) });
      });
    return true;
  }
});
