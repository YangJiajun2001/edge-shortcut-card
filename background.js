// 工具栏图标 / Alt+Shift+K：通知当前标签页在“隐藏 → 展开 → 收起 → 展开”之间切换。
function clearBadge() {
  try {
    const result = chrome.action.setBadgeText({ text: '' });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (e) {
    // 忽略
  }
}

async function toggleOnTab(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'ESC_TOGGLE_CARD' });
    return;
  } catch (e) {
    // 页面在扩展安装/更新前就打开时，content script 还不存在：补注入一次再发消息
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
  });
  await chrome.tabs.sendMessage(tabId, { type: 'ESC_TOGGLE_CARD' });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await toggleOnTab(tab.id);
    clearBadge();
  } catch (e) {
    console.warn('[快捷键卡片] 当前页面无法显示卡片（可能是 edge:// 等受限页面）');
    try {
      await chrome.action.setBadgeBackgroundColor({ color: '#b91c1c' });
      await chrome.action.setBadgeText({ text: '!' });
      setTimeout(clearBadge, 1500);
    } catch (badgeError) {
      // 忽略徽标失败
    }
  }
});

// 新安装默认显示收起胶囊；更新已有用户不强制改形态。
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== 'install') return;

  try {
    const key = 'edgeShortcutCardMode';
    const data = await chrome.storage.local.get(key);
    if (!data[key]) {
      await chrome.storage.local.set({ [key]: 'collapsed' });
    }
  } catch (e) {
    // 忽略
  }
});

// ==================== 搜索次数 ====================
// 所有写入都走同一条队列，避免多个标签页同时修改时互相覆盖。
const SEARCH_STATS_KEY = 'edgeShortcutSearchStats';
const LEGACY_STATS_KEY = 'edgeShortcutStats';
const LEGACY_POS_KEY = 'edgeShortcutCardPos';

let statsWriteChain = Promise.resolve();

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
    // 旧版本的“点击次数”和网页卡片位置不再使用，一并清掉
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
