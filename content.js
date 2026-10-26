(() => {
  const BUILD = '1.3.0';
  if (window.__ESC_CARD_OVERLAY__ === BUILD) return;
  if (window.__ESC_CARD_OVERLAY__) {
    // 扩展更新后，旧 content script 的上下文可能已经失效；清掉旧节点重新初始化
    document.querySelectorAll('[data-edge-shortcut-overlay], [data-edge-shortcut-card]').forEach((el) => el.remove());
  }
  window.__ESC_CARD_OVERLAY__ = BUILD;

  const STATS_KEY = 'edgeShortcutSearchStats';
  const MODE_KEY = 'edgeShortcutCardMode';
  const GEOMETRY_KEY = 'edgeShortcutCardGeometry';
  const SORT_KEY = 'edgeShortcutCardSort';
  const RECENT_KEY = 'edgeShortcutRecent';

  const MODES = ['expanded', 'collapsed', 'hidden'];
  const SORT_ORDER = ['frequency', 'default', 'category'];

  // ============ 快捷键数据 ============
  // 以 Microsoft Edge 官方快捷键页为准；同一动作的多个按键合并为一个条目。
  // 官方页未列但保留的 Edge 特色项会在 README 中标注来源。
  const SHORTCUTS = [
    // 标签页
    { id: 'tab-new',        title: '新建标签页',           cat: '标签页', keys: [['Ctrl', 'T']] },
    { id: 'tab-close',      title: '关闭当前标签页',       cat: '标签页', keys: [['Ctrl', 'W'], ['Ctrl', 'F4']] },
    { id: 'tab-reopen',     title: '重新打开关闭的标签页', cat: '标签页', keys: [['Ctrl', 'Shift', 'T']] },
    { id: 'tab-next',       title: '下一个标签页',         cat: '标签页', keys: [['Ctrl', 'Tab'], ['Ctrl', 'PgDn']] },
    { id: 'tab-prev',       title: '上一个标签页',         cat: '标签页', keys: [['Ctrl', 'Shift', 'Tab'], ['Ctrl', 'PgUp']] },
    { id: 'tab-jump',       title: '跳到第 N 个标签页',    cat: '标签页', keys: [['Ctrl', '1~8']] },
    { id: 'tab-last',       title: '跳到最后一个标签页',   cat: '标签页', keys: [['Ctrl', '9']] },
    { id: 'tab-duplicate',  title: '复制当前标签页',       cat: '标签页', keys: [['Ctrl', 'Shift', 'K']] },
    { id: 'tab-mute',       title: '静音 / 取消静音标签页', cat: '标签页', keys: [['Ctrl', 'M']] },

    // 窗口与菜单
    { id: 'win-new',        title: '新建窗口',             cat: '窗口与菜单', keys: [['Ctrl', 'N']] },
    { id: 'win-private',    title: '新建 InPrivate 窗口',  cat: '窗口与菜单', keys: [['Ctrl', 'Shift', 'N']] },
    { id: 'win-close',      title: '关闭当前窗口',         cat: '窗口与菜单', keys: [['Ctrl', 'Shift', 'W'], ['Alt', 'F4']] },
    { id: 'win-fullscreen', title: '切换全屏',             cat: '窗口与菜单', keys: [['F11']] },
    { id: 'win-guest',      title: '其他用户登录 / 来宾浏览', cat: '窗口与菜单', keys: [['Ctrl', 'Shift', 'M']] },
    { id: 'menu-open',      title: '打开设置及更多菜单',   cat: '窗口与菜单', keys: [['Alt', 'F'], ['Alt', 'E'], ['F10', 'Enter']] },
    { id: 'menu-focus',     title: '聚焦设置及更多按钮',   cat: '窗口与菜单', keys: [['Alt'], ['F10']] },
    { id: 'context-menu',   title: '打开上下文菜单',       cat: '窗口与菜单', keys: [['Shift', 'F10']] },
    { id: 'feedback',       title: '发送反馈',             cat: '窗口与菜单', keys: [['Alt', 'Shift', 'I']] },
    { id: 'appbar-focus',   title: '聚焦应用栏工具栏第一项', cat: '窗口与菜单', keys: [['Alt', 'Shift', 'T']] },

    // 导航与滚动
    { id: 'nav-back',       title: '后退',                 cat: '导航与滚动', keys: [['Alt', '←']] },
    { id: 'nav-forward',    title: '前进',                 cat: '导航与滚动', keys: [['Alt', '→']] },
    { id: 'nav-refresh',    title: '刷新页面',             cat: '导航与滚动', keys: [['Ctrl', 'R'], ['F5']] },
    { id: 'nav-hard',       title: '强制刷新（忽略缓存）', cat: '导航与滚动', keys: [['Ctrl', 'Shift', 'R'], ['Shift', 'F5']] },
    { id: 'nav-stop',       title: '停止加载',             cat: '导航与滚动', keys: [['Esc']] },
    { id: 'nav-home',       title: '打开主页',             cat: '导航与滚动', keys: [['Alt', 'Home']] },
    { id: 'page-top',       title: '跳到页面顶部',         cat: '导航与滚动', keys: [['Home']] },
    { id: 'page-bottom',    title: '跳到页面底部',         cat: '导航与滚动', keys: [['End']] },
    { id: 'scroll-down',    title: '向下滚动一屏',         cat: '导航与滚动', keys: [['Space'], ['PgDn']] },
    { id: 'scroll-up',      title: '向上滚动一屏',         cat: '导航与滚动', keys: [['Shift', 'Space'], ['PgUp']] },

    // 地址栏
    { id: 'url-focus',      title: '聚焦地址栏',           cat: '地址栏', keys: [['Ctrl', 'L'], ['Alt', 'D'], ['F4']] },
    { id: 'url-search',     title: '在地址栏搜索',         cat: '地址栏', keys: [['Ctrl', 'E'], ['Ctrl', 'K']] },
    { id: 'url-www',        title: '补全 www…com 后打开',  cat: '地址栏', keys: [['Ctrl', 'Enter']] },
    { id: 'url-paste-search', title: '粘贴并搜索 / 访问',  cat: '地址栏', keys: [['Ctrl', 'Shift', 'L']] },
    { id: 'sidebar-search', title: '在边栏中打开搜索',     cat: '地址栏', keys: [['Ctrl', 'Shift', 'E']] },

    // 页面与查找
    { id: 'page-find',      title: '页内查找',             cat: '页面与查找', keys: [['Ctrl', 'F'], ['F3']] },
    { id: 'page-find-next', title: '查找下一个',           cat: '页面与查找', keys: [['Ctrl', 'G']] },
    { id: 'page-find-prev', title: '查找上一个',           cat: '页面与查找', keys: [['Ctrl', 'Shift', 'G']] },
    { id: 'page-print',     title: '打印',                 cat: '页面与查找', keys: [['Ctrl', 'P']] },
    { id: 'page-print-system', title: '使用系统对话框打印', cat: '页面与查找', keys: [['Ctrl', 'Shift', 'P']] },
    { id: 'page-save',      title: '保存页面',             cat: '页面与查找', keys: [['Ctrl', 'S']] },
    { id: 'page-open',      title: '打开本地文件',         cat: '页面与查找', keys: [['Ctrl', 'O']] },
    { id: 'page-source',    title: '查看网页源代码',       cat: '页面与查找', keys: [['Ctrl', 'U']] },
    { id: 'page-help',      title: '打开帮助',             cat: '页面与查找', keys: [['F1']] },

    // 焦点与窗格
    { id: 'pane-next',      title: '焦点移到下一个窗格',   cat: '焦点与窗格', keys: [['F6']] },
    { id: 'pane-prev',      title: '焦点移到上一个窗格',   cat: '焦点与窗格', keys: [['Shift', 'F6']] },
    { id: 'pane-web',       title: '焦点移到网页内容窗格', cat: '焦点与窗格', keys: [['Ctrl', 'F6']] },
    { id: 'tabstop-next',   title: '下一个制表位',         cat: '焦点与窗格', keys: [['Tab']] },
    { id: 'tabstop-prev',   title: '上一个制表位',         cat: '焦点与窗格', keys: [['Shift', 'Tab']] },
    { id: 'page-caret',     title: '插入光标浏览',         cat: '焦点与窗格', keys: [['F7']] },

    // 缩放与 PDF
    { id: 'zoom-in',        title: '放大',                 cat: '缩放与 PDF', keys: [['Ctrl', '+']] },
    { id: 'zoom-out',       title: '缩小',                 cat: '缩放与 PDF', keys: [['Ctrl', '-']] },
    { id: 'zoom-reset',     title: '恢复默认缩放',         cat: '缩放与 PDF', keys: [['Ctrl', '0']] },
    { id: 'pdf-fit',        title: 'PDF 适合页面 / 适合宽度', cat: '缩放与 PDF', keys: [['Ctrl', '\\']] },
    { id: 'pdf-rotate-left', title: 'PDF 逆时针旋转 90°',  cat: '缩放与 PDF', keys: [['Ctrl', '[']] },
    { id: 'pdf-rotate-right', title: 'PDF 顺时针旋转 90°', cat: '缩放与 PDF', keys: [['Ctrl', ']']] },

    // 收藏与历史
    { id: 'fav-add',        title: '收藏当前页',           cat: '收藏与历史', keys: [['Ctrl', 'D']] },
    { id: 'fav-all',        title: '收藏所有标签页',       cat: '收藏与历史', keys: [['Ctrl', 'Shift', 'D']] },
    { id: 'fav-open',       title: '打开收藏夹',           cat: '收藏与历史', keys: [['Ctrl', 'Shift', 'O']] },
    { id: 'fav-first',      title: '聚焦收藏夹栏第一项',   cat: '收藏与历史', keys: [['Alt', 'Shift', 'B']] },
    { id: 'fav-bar',        title: '显示 / 隐藏收藏栏',    cat: '收藏与历史', keys: [['Ctrl', 'Shift', 'B']] },
    { id: 'hist-open',      title: '打开历史记录',         cat: '收藏与历史', keys: [['Ctrl', 'H']] },
    { id: 'dl-open',        title: '打开下载内容',         cat: '收藏与历史', keys: [['Ctrl', 'J']] },
    { id: 'clear-data',     title: '清除浏览数据',         cat: '收藏与历史', keys: [['Ctrl', 'Shift', 'Delete']] },

    // 开发者与阅读
    { id: 'devtools',       title: '开发者工具',           cat: '开发者与阅读', keys: [['F12'], ['Ctrl', 'Shift', 'I']] },
    { id: 'console',        title: '打开控制台',           cat: '开发者与阅读', keys: [['Ctrl', 'Shift', 'J']] },
    { id: 'inspect',        title: '检查元素',             cat: '开发者与阅读', keys: [['Ctrl', 'Shift', 'C']] },
    { id: 'read-aloud',     title: '开始 / 停止朗读此页',  cat: '开发者与阅读', keys: [['Ctrl', 'Shift', 'U']] },
    { id: 'page-reader',    title: '沉浸式阅读器',         cat: '开发者与阅读', keys: [['F9']] },

    // Edge 特色
    { id: 'collections',    title: '打开集锦',             cat: 'Edge 特色', keys: [['Ctrl', 'Shift', 'Y']] },
    { id: 'web-capture',    title: '网页捕获',             cat: 'Edge 特色', keys: [['Ctrl', 'Shift', 'S']] },

    // 编辑（输入框上下文）
    { id: 'paste-plain',    title: '粘贴为纯文本',         cat: '编辑', keys: [['Ctrl', 'Shift', 'V']] },
    { id: 'edit-copy',      title: '复制',                 cat: '编辑', keys: [['Ctrl', 'C']] },
    { id: 'edit-paste',     title: '粘贴',                 cat: '编辑', keys: [['Ctrl', 'V']] },
    { id: 'edit-cut',       title: '剪切',                 cat: '编辑', keys: [['Ctrl', 'X']] },
    { id: 'edit-undo',      title: '撤销',                 cat: '编辑', keys: [['Ctrl', 'Z']] },
    { id: 'edit-redo',      title: '重做',                 cat: '编辑', keys: [['Ctrl', 'Y']] },
    { id: 'edit-select-all', title: '全选',                cat: '编辑', keys: [['Ctrl', 'A']] },
  ];

  const SHORTCUT_BY_ID = new Map(SHORTCUTS.map((item) => [item.id, item]));

  // 口语/英文别名，用于模糊匹配；不直接显示在列表里。
  const ALIASES = {
    'tab-new': ['新标签', '新建标签', '开个新页', 'new tab', 'open tab'],
    'tab-close': ['关标签', '关掉页面', '关闭页面', 'close tab', '关掉标签'],
    'tab-reopen': ['恢复关闭', '撤销关闭', '找回标签', '重开标签', 'undo close', 'reopen tab'],
    'tab-next': ['下个标签', '切换下一个', 'next tab'],
    'tab-prev': ['上个标签', '切换上一个', 'prev tab'],
    'tab-jump': ['切到第n个', '跳标签', 'jump tab'],
    'tab-last': ['最后标签', '最后一个', 'last tab'],
    'tab-duplicate': ['复制标签', '克隆标签', 'duplicate tab'],
    'tab-mute': ['静音', '取消静音', 'mute', '声音'],
    'win-new': ['新窗口', '打开窗口', 'new window'],
    'win-private': ['隐私窗口', '无痕', 'inprivate', 'private window'],
    'win-close': ['关窗口', '关闭所有', 'close window'],
    'win-fullscreen': ['全屏', '退出全屏', 'fullscreen'],
    'win-guest': ['来宾', '访客', '切换用户', 'guest'],
    'menu-open': ['菜单', '设置', '更多', 'settings', 'menu'],
    'menu-focus': ['聚焦菜单', '菜单按钮', 'alt menu'],
    'context-menu': ['右键菜单', '上下文菜单', 'context menu'],
    'feedback': ['反馈', '意见', 'feedback'],
    'appbar-focus': ['工具栏', '应用栏', 'app bar'],
    'nav-back': ['后退', '返回', 'back'],
    'nav-forward': ['前进', '向前', 'forward'],
    'nav-refresh': ['刷新', '重载', 'reload', 'refresh'],
    'nav-hard': ['强制刷新', '清缓存刷新', 'hard reload', '刷新缓存'],
    'nav-stop': ['停止', '停止加载', 'stop'],
    'nav-home': ['主页', '首页', 'home'],
    'page-top': ['页首', '顶部', 'top'],
    'page-bottom': ['页尾', '底部', 'bottom'],
    'scroll-down': ['下滚', '向下滚动', '翻页', 'scroll down'],
    'scroll-up': ['上滚', '向上滚动', 'scroll up'],
    'url-focus': ['地址栏', '网址栏', '聚焦地址', 'omnibox', 'url'],
    'url-search': ['搜索地址', '地址栏搜索', 'search bar', '搜索栏'],
    'url-www': ['补全网址', 'www', 'com', '自动补全'],
    'url-paste-search': ['粘贴搜索', '粘贴访问', 'paste go', 'paste search'],
    'sidebar-search': ['侧边栏搜索', '边栏搜索', 'sidebar search'],
    'page-find': ['查找', '搜索页面', '页内查找', 'find', 'ctrl f'],
    'page-find-next': ['下一个结果', '继续查找', 'find next'],
    'page-find-prev': ['上一个结果', 'find previous'],
    'page-print': ['打印', 'print'],
    'page-print-system': ['系统打印', '打印对话框', 'system print'],
    'page-save': ['保存', '另存为', 'save page'],
    'page-open': ['打开文件', '本地文件', 'open file'],
    'page-source': ['源代码', '查看源码', 'view source'],
    'page-help': ['帮助', 'help', 'f1'],
    'pane-next': ['下一个窗格', '切换窗格', 'next pane'],
    'pane-prev': ['上一个窗格', 'prev pane'],
    'pane-web': ['网页窗格', '内容窗格', 'web pane'],
    'tabstop-next': ['制表位', '下一个焦点', 'tab'],
    'tabstop-prev': ['上一个焦点', 'shift tab'],
    'page-caret': ['光标浏览', '插入光标', 'caret'],
    'zoom-in': ['放大', '变大', 'zoom in'],
    'zoom-out': ['缩小', '变小', 'zoom out'],
    'zoom-reset': ['恢复缩放', '原始大小', 'reset zoom'],
    'pdf-fit': ['pdf适应', '适合页面', '适合宽度', 'fit pdf'],
    'pdf-rotate-left': ['pdf左转', '逆时针', 'rotate left'],
    'pdf-rotate-right': ['pdf右转', '顺时针', 'rotate right'],
    'fav-add': ['收藏', '加书签', 'bookmark', 'star'],
    'fav-all': ['收藏全部', '所有标签收藏', 'bookmark all'],
    'fav-open': ['收藏夹', '书签管理', 'favorites'],
    'fav-first': ['收藏栏第一项', '第一个收藏', 'favorites bar'],
    'fav-bar': ['收藏栏', '书签栏', 'favorites bar'],
    'hist-open': ['历史', '历史记录', 'history'],
    'dl-open': ['下载', '下载内容', 'downloads'],
    'clear-data': ['清除数据', '清缓存', '删历史', 'clear data', '清浏览数据'],
    'devtools': ['开发者', '控制台', 'f12', 'devtools', '审查'],
    'console': ['控制台', 'console', 'js 控制台'],
    'inspect': ['检查元素', '审查元素', 'inspect'],
    'read-aloud': ['朗读', '大声朗读', 'read aloud'],
    'page-reader': ['阅读模式', '沉浸式', 'reader'],
    'collections': ['集锦', '收藏集', 'collections'],
    'web-capture': ['截图', '网页截图', '捕获', 'screenshot'],
    'paste-plain': ['纯文本粘贴', '无格式粘贴', 'paste plain'],
    'edit-copy': ['复制', '拷贝', 'copy'],
    'edit-paste': ['粘贴', 'paste'],
    'edit-cut': ['剪切', 'cut'],
    'edit-undo': ['撤销', 'undo'],
    'edit-redo': ['重做', 'redo'],
    'edit-select-all': ['全选', 'select all'],
  };

  const RECENT_MAX = 3;
  const EDIT_CONTEXT_IDS = ['edit-copy', 'edit-paste', 'edit-undo', 'edit-select-all'];

  // ============ 状态 ============
  const state = {
    mode: 'hidden',
    query: '',
    sortBy: 'frequency',
    stats: {},
    geometry: { expanded: null, collapsed: null },
    selectedId: null,
    recent: [],
    lastEditable: null,
    captureMode: false,
    captureKeys: [],
  };

  // 清掉旧版本可能残留的网页卡片
  document.querySelectorAll('[data-edge-shortcut-overlay], [data-edge-shortcut-card]').forEach((el) => el.remove());

  // ============ 宿主 + Shadow DOM ============
  const host = document.createElement('div');
  host.setAttribute('data-edge-shortcut-overlay', '');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  (document.documentElement || document.body).appendChild(host);

  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host {
        --bg: #ffffff;
        --bg-soft: #f7f8fa;
        --fg: #1f2328;
        --fg-muted: #6b7280;
        --border: #e6e8eb;
        --hover: #f1f3f5;
        --accent: #0b7dda;
        --accent-soft: #e8f2fd;
        --shadow: 0 12px 32px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --bg: #1f2023;
          --bg-soft: #26282c;
          --fg: #e6e7e9;
          --fg-muted: #9aa0a6;
          --border: #35373c;
          --hover: #2c2e33;
          --accent: #4da3ff;
          --accent-soft: #1e344d;
          --shadow: 0 12px 32px rgba(0,0,0,.5);
        }
      }

      *, *::before, *::after { box-sizing: border-box; }

      .card[hidden], .pill[hidden] { display: none !important; }
      .recent-row[hidden], .context-bar[hidden], .capture-row[hidden] { display: none !important; }

      .card {
        position: fixed;
        right: 24px;
        top: 50%;
        transform: translateY(-50%);
        width: 360px;
        max-width: calc(100vw - 16px);
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        background: var(--bg);
        color: var(--fg);
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: var(--shadow);
        font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
        font-size: 13px;
        line-height: 1.45;
        overflow: hidden;
        pointer-events: auto;
        user-select: none;
      }

      .header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
        padding: 10px 10px 8px;
        border-bottom: 1px solid var(--border);
        cursor: move;
      }

      .brand {
        display: flex;
        flex: 1 1 auto;
        min-width: 0;
        align-items: center;
        gap: 7px;
      }

      .logo {
        display: grid;
        flex: 0 0 auto;
        width: 28px;
        height: 22px;
        place-items: center;
        border-radius: 6px;
        background: var(--accent);
        color: #fff;
        font-size: 13px;
        line-height: 1;
      }

      .brand-title {
        overflow: hidden;
        color: var(--fg);
        font-size: 13px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .btn {
        flex: 0 0 auto;
        height: 30px;
        padding: 0 9px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-soft);
        color: var(--fg);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      .btn:hover { background: var(--hover); }
      .btn:active { transform: translateY(1px); }
      .btn:disabled { opacity: .55; cursor: default; }
      .btn.icon { width: 28px; height: 28px; padding: 0; font-size: 16px; line-height: 1; }
      .btn.small { height: 25px; padding: 0 8px; border-radius: 7px; font-size: 10.5px; }

      .search-row {
        display: flex;
        flex: 0 0 auto;
        gap: 6px;
        padding: 0 10px 8px;
      }

      .search {
        flex: 1 1 auto;
        min-width: 0;
        height: 30px;
        padding: 0 9px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-soft);
        color: var(--fg);
        font: inherit;
        outline: none;
        user-select: text;
        cursor: text;
      }

      .search:focus { border-color: var(--accent); }
      .search::placeholder { color: var(--fg-muted); }
      .search[readonly] { cursor: default; }

      .sort { height: 30px; font-size: 11px; }
      .capture { width: 30px; padding: 0; font-size: 13px; }
      .capture.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
      .card.capturing .sort { display: none; }

      .recent-row {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
        padding: 0 10px 6px;
        overflow: hidden;
      }

      .recent-label {
        flex: 0 0 auto;
        color: var(--fg-muted);
        font-size: 9.5px;
      }

      .recent-chips {
        display: flex;
        flex: 1 1 auto;
        gap: 4px;
        min-width: 0;
        overflow: hidden;
      }

      .recent-chip {
        max-width: 96px;
        height: 20px;
        padding: 0 7px;
        overflow: hidden;
        border: 1px solid #d6e7fb;
        border-radius: 10px;
        background: var(--accent-soft);
        color: var(--accent);
        font: inherit;
        font-size: 9.5px;
        font-weight: 600;
        line-height: 18px;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
      }

      .recent-chip:hover { filter: brightness(.97); }

      .context-bar {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border-bottom: 1px solid #d6e7fb;
        background: #f0f7ff;
        color: #475569;
        font-size: 9.5px;
      }

      .context-label {
        flex: 0 0 auto;
        color: var(--accent);
        font-weight: 700;
      }

      .context-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .capture-row {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        padding: 0 10px 7px;
      }

      .capture-hint {
        flex: 1 1 100%;
        color: #b45309;
        font-size: 9px;
        line-height: 1.35;
      }

      .special-key {
        flex: 1 1 auto;
        min-width: 0;
        height: 24px;
        padding: 0 6px;
        border: 1px solid var(--border);
        border-radius: 7px;
        background: var(--bg-soft);
        color: var(--fg);
        font: inherit;
        font-size: 9.5px;
      }

      .list {
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 4px 6px 6px;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }

      .list::-webkit-scrollbar { width: 8px; }
      .list::-webkit-scrollbar-thumb { border-radius: 4px; background: var(--border); }
      .list::-webkit-scrollbar-track { background: transparent; }

      .group {
        padding: 9px 8px 3px;
        color: var(--fg-muted);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: .04em;
      }

      .item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 8px;
      }

      .item:hover { background: var(--hover); }
      .item.selected {
        background: var(--accent-soft);
        box-shadow: inset 0 0 0 1px var(--accent);
      }
      .item.flash { animation: escFlash .55s ease-out; }

      @keyframes escFlash {
        0% { background: var(--accent-soft); }
        100% { background: transparent; }
      }

      .keys {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        align-items: center;
        gap: 3px;
        min-width: 96px;
      }

      kbd {
        display: inline-block;
        padding: 2px 6px;
        border: 1px solid var(--border);
        border-bottom-width: 2px;
        border-radius: 5px;
        background: var(--bg-soft);
        color: var(--fg);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        line-height: 1.3;
        white-space: nowrap;
      }

      .plus { color: var(--fg-muted); font-size: 10px; }

      .text { flex: 1 1 auto; min-width: 0; }

      .title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat {
        overflow: hidden;
        color: var(--fg-muted);
        font-size: 10.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .count {
        flex: 0 0 auto;
        min-width: 22px;
        padding: 1px 6px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 10.5px;
        font-variant-numeric: tabular-nums;
        text-align: center;
      }

      .empty {
        padding: 34px 12px;
        color: var(--fg-muted);
        text-align: center;
      }

      .footer {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 6px 10px 8px;
        border-top: 1px solid var(--border);
      }

      .hints {
        display: flex;
        flex: 1 1 150px;
        flex-direction: column;
        min-width: 0;
        color: var(--fg-muted);
        font-size: 10px;
        line-height: 1.35;
      }

      .hint-sub { font-size: 9.5px; color: var(--fg-muted); opacity: .85; }

      .actions { display: flex; flex: 0 0 auto; gap: 5px; }
      .actions[hidden] { display: none !important; }

      .pill {
        position: fixed;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 7px;
        height: 40px;
        padding: 0 14px;
        border: 0;
        border-radius: 20px;
        background: var(--accent);
        box-shadow: var(--shadow);
        color: #fff;
        font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
        pointer-events: auto;
        user-select: none;
      }

      .pill:hover { filter: brightness(1.08); }
      .pill:active { transform: translateY(-50%) scale(.98); }
      .pill-icon { font-size: 14px; }

      .toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        max-width: calc(100vw - 32px);
        padding: 7px 12px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--accent);
        box-shadow: var(--shadow);
        color: #fff;
        font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, 4px);
        transition: opacity .16s ease, transform .16s ease;
      }

      .toast.show {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    </style>

    <div class="card" hidden>
      <div class="header" title="点击切换展开/收起，拖动移动">
        <div class="brand">
          <span class="logo">⌨</span>
          <span class="brand-title">快捷键</span>
        </div>
        <button class="btn icon collapse" type="button" title="收起">−</button>
        <button class="btn icon close" type="button" title="隐藏">×</button>
      </div>

      <div class="search-row">
        <input class="search" type="text" placeholder="搜索快捷键 / 功能…" spellcheck="false" autocomplete="off" />
        <button class="btn capture" type="button" title="按组合查（逐键录入）">⌨</button>
        <button class="btn sort" type="button" title="切换排序方式">频率</button>
      </div>

      <div class="recent-row" hidden>
        <span class="recent-label">最近</span>
        <div class="recent-chips"></div>
      </div>

      <div class="context-bar" hidden>
        <span class="context-label">输入框</span>
        <span class="context-text"></span>
      </div>

      <div class="capture-row" hidden>
        <span class="capture-hint">逐个按 Ctrl → Shift → T；不要同时按，否则会触发 Edge 快捷键。</span>
        <select class="special-key" title="特殊键">
          <option value="">特殊键…</option>
          <option value="F1">F1</option>
          <option value="F2">F2</option>
          <option value="F3">F3</option>
          <option value="F4">F4</option>
          <option value="F5">F5</option>
          <option value="F6">F6</option>
          <option value="F7">F7</option>
          <option value="F8">F8</option>
          <option value="F9">F9</option>
          <option value="F10">F10</option>
          <option value="F11">F11</option>
          <option value="F12">F12</option>
          <option value="Enter">Enter</option>
          <option value="Esc">Esc</option>
          <option value="Tab">Tab</option>
          <option value="Space">Space</option>
          <option value="Home">Home</option>
          <option value="End">End</option>
          <option value="PgUp">PgUp</option>
          <option value="PgDn">PgDn</option>
          <option value="↑">↑</option>
          <option value="↓">↓</option>
          <option value="←">←</option>
          <option value="→">→</option>
          <option value="Delete">Delete</option>
        </select>
        <button class="btn small capture-done" type="button">完成</button>
      </div>

      <div class="list"></div>

      <div class="footer">
        <div class="hints">
          <span>↑↓ 选择 · Enter 记录选中项</span>
          <span class="hint-sub">空查询不计数 · 点击条目不计数</span>
        </div>
        <div class="actions">
          <button class="btn small refresh" type="button" title="重新读取搜索次数">刷新</button>
          <button class="btn small restore" type="button" title="清空搜索次数并恢复默认">恢复</button>
        </div>
      </div>
    </div>

    <button class="pill" type="button" hidden title="展开快捷键卡片">
      <span class="pill-icon">⌨</span>
      <span>快捷键</span>
    </button>

    <div class="toast" role="status" aria-live="polite"></div>
  `;

  const card = root.querySelector('.card');
  const header = root.querySelector('.header');
  const listEl = root.querySelector('.list');
  const searchEl = root.querySelector('.search');
  const sortBtn = root.querySelector('.sort');
  const captureBtn = root.querySelector('.capture');
  const recentRow = root.querySelector('.recent-row');
  const recentChips = root.querySelector('.recent-chips');
  const contextBar = root.querySelector('.context-bar');
  const contextText = root.querySelector('.context-text');
  const captureRow = root.querySelector('.capture-row');
  const specialKey = root.querySelector('.special-key');
  const captureDone = root.querySelector('.capture-done');
  const hintMain = root.querySelector('.hints span:first-child');
  const hintSub = root.querySelector('.hint-sub');
  const footerActions = root.querySelector('.actions');
  const collapseBtn = root.querySelector('.collapse');
  const closeBtn = root.querySelector('.close');
  const refreshBtn = root.querySelector('.refresh');
  const restoreBtn = root.querySelector('.restore');
  const pill = root.querySelector('.pill');
  const toastEl = root.querySelector('.toast');

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
      const data = await chrome.storage.local.get(STATS_KEY);
      const stats = data[STATS_KEY];
      return (stats && typeof stats === 'object') ? stats : {};
    }
  }

  function validMode(value) {
    return MODES.includes(value) ? value : 'hidden';
  }

  function validSort(value) {
    return SORT_ORDER.includes(value) ? value : 'frequency';
  }

  function normalizeGeometry(value) {
    const result = { expanded: null, collapsed: null };
    if (!value || typeof value !== 'object') return result;

    const expanded = value.expanded;
    if (expanded && Number.isFinite(expanded.left) && Number.isFinite(expanded.top)) {
      result.expanded = { left: expanded.left, top: expanded.top };
    }

    const collapsed = value.collapsed;
    if (collapsed && Number.isFinite(collapsed.top)) {
      result.collapsed = { top: collapsed.top };
    }

    return result;
  }

  // ============ 排序 / 模糊匹配 ============
  function normalizeSearchText(value) {
    return String(value)
      .toLowerCase()
      .replace(/[＋+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function keyTextOf(item) {
    return normalizeSearchText(item.keys.map((combo) => combo.join(' ')).join(' '));
  }

  function aliasTextOf(item) {
    return normalizeSearchText((ALIASES[item.id] || []).join(' '));
  }

  function isSubsequence(needle, haystack) {
    if (!needle) return true;
    let index = 0;
    for (const char of haystack) {
      if (char === needle[index]) index += 1;
      if (index >= needle.length) return true;
    }
    return false;
  }

  function scoreShortcut(item, tokens, normalizedQuery) {
    const title = normalizeSearchText(item.title);
    const cat = normalizeSearchText(item.cat);
    const keys = keyTextOf(item);
    const aliases = aliasTextOf(item);
    const keyParts = new Set(item.keys.flat().map((key) => normalizeSearchText(key)));

    for (const token of tokens) {
      const asciiSingle = token.length === 1 && /^[a-z0-9]$/.test(token);
      const matchedText = title.includes(token) || aliases.includes(token) || cat.includes(token);
      const matchedKey = keyParts.has(token) || (
        token.length >= 2 && [...keyParts].some((part) => part.startsWith(token))
      );

      if (asciiSingle) {
        if (!matchedKey) return -1;
        continue;
      }

      if (
        !matchedText &&
        !matchedKey &&
        !isSubsequence(token, title) &&
        !isSubsequence(token, aliases) &&
        !isSubsequence(token, cat)
      ) {
        return -1;
      }
    }

    let score = 0;
    if (keys === normalizedQuery) score += 1200;
    if (title === normalizedQuery) score += 1000;
    if (title.startsWith(normalizedQuery)) score += 800;
    if (aliases === normalizedQuery) score += 700;
    if (keys.includes(normalizedQuery)) score += 650;
    if (title.includes(normalizedQuery)) score += 550;
    if (aliases.includes(normalizedQuery)) score += 500;
    if (cat.includes(normalizedQuery)) score += 180;

    for (const token of tokens) {
      if (title.includes(token)) score += 70;
      else if (aliases.includes(token)) score += 55;
      else if (keyParts.has(token)) score += 45;
      else if (cat.includes(token)) score += 20;
      else score += 8;
    }

    return score;
  }

  function getVisibleList() {
    const rawQuery = state.query.trim();
    const cnt = (id) => state.stats[id] || 0;

    if (!rawQuery) {
      let arr = SHORTCUTS;

      if (state.sortBy === 'frequency') {
        arr = [...arr].sort((a, b) => cnt(b.id) - cnt(a.id) || a.title.localeCompare(b.title, 'zh'));
      } else if (state.sortBy === 'category') {
        arr = [...arr].sort((a, b) => a.cat.localeCompare(b.cat, 'zh') || a.title.localeCompare(b.title, 'zh'));
      }

      return arr;
    }

    const normalizedQuery = normalizeSearchText(rawQuery);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    if (!tokens.length) return SHORTCUTS;

    const sourceIndex = new Map(SHORTCUTS.map((item, index) => [item.id, index]));

    return SHORTCUTS
      .map((item) => ({ item, score: scoreShortcut(item, tokens, normalizedQuery) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        if (state.sortBy === 'frequency') {
          const byCount = cnt(b.item.id) - cnt(a.item.id);
          if (byCount) return byCount;
        } else if (state.sortBy === 'category') {
          const byCategory = a.item.cat.localeCompare(b.item.cat, 'zh');
          if (byCategory) return byCategory;
        } else {
          const bySource = sourceIndex.get(a.item.id) - sourceIndex.get(b.item.id);
          if (bySource) return bySource;
        }

        return a.item.title.localeCompare(b.item.title, 'zh');
      })
      .map((entry) => entry.item);
  }

  // ============ 渲染 / 选中 ============
  function render(resetScroll = false) {
    const prevScroll = listEl.scrollTop;
    const items = getVisibleList();
    const ids = new Set(items.map((item) => item.id));

    if (!state.selectedId || !ids.has(state.selectedId)) {
      state.selectedId = items[0]?.id || null;
    }

    if (!items.length) {
      listEl.innerHTML = '<div class="empty">没有找到匹配的快捷键</div>';
      listEl.scrollTop = 0;
      updateChromeVisibility();
      return;
    }

    let html = '';
    let lastCat = null;

    for (const s of items) {
      if (!state.query.trim() && state.sortBy === 'category' && s.cat !== lastCat) {
        html += `<div class="group">${escapeHtml(s.cat)}</div>`;
        lastCat = s.cat;
      }

      const count = state.stats[s.id] || 0;
      const primary = s.keys[0];
      const keyHtml = primary
        .map((k) => `<kbd>${escapeHtml(k)}</kbd>`)
        .join('<span class="plus">+</span>');
      const altText = s.keys.slice(1).map((combo) => combo.join(' ')).join(' / ');
      const catText = altText ? `${s.cat} · 备选 ${altText}` : s.cat;
      const selected = s.id === state.selectedId ? ' selected' : '';

      html += `
        <div class="item${selected}" data-id="${s.id}" title="${escapeHtml(s.title)} · ${escapeHtml(catText)}">
          <div class="keys">${keyHtml}</div>
          <div class="text">
            <div class="title">${escapeHtml(s.title)}</div>
            <div class="cat">${escapeHtml(catText)}</div>
          </div>
          ${count > 0 ? `<div class="count" title="搜索次数">${count}</div>` : ''}
        </div>`;
    }

    listEl.innerHTML = html;
    listEl.scrollTop = resetScroll ? 0 : prevScroll;
    updateChromeVisibility();
  }

  function paintSelection(previousId) {
    if (previousId) {
      const previous = findItem(previousId);
      if (previous) previous.classList.remove('selected');
    }

    const current = findItem(state.selectedId);
    if (!current) return;

    current.classList.add('selected');
    current.scrollIntoView({ block: 'nearest' });
  }

  function moveSelection(delta) {
    const items = getVisibleList();
    if (!items.length) return;

    const currentIndex = items.findIndex((item) => item.id === state.selectedId);
    const nextIndex = currentIndex < 0
      ? 0
      : Math.max(0, Math.min(items.length - 1, currentIndex + delta));
    const previousId = state.selectedId;
    state.selectedId = items[nextIndex].id;
    paintSelection(previousId);
  }

  function selectBoundary(which) {
    const items = getVisibleList();
    if (!items.length) return;

    const previousId = state.selectedId;
    state.selectedId = which === 'start' ? items[0].id : items[items.length - 1].id;
    paintSelection(previousId);
  }

  function updateSortLabel() {
    sortBtn.textContent = { frequency: '频率', default: '默认', category: '分类' }[state.sortBy];
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

  function updateBadges() {
    listEl.querySelectorAll('.item').forEach((item) => {
      const id = item.dataset.id;
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
    });
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
    if (state.mode !== 'expanded') return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toastEl.classList.remove('show');
  }

  // ============ 最近 / 输入框上下文 ============
  function normalizeRecent(value) {
    if (!Array.isArray(value)) return [];

    const result = [];
    for (const id of value) {
      if (typeof id === 'string' && SHORTCUT_BY_ID.has(id) && !result.includes(id)) {
        result.push(id);
      }
      if (result.length >= RECENT_MAX) break;
    }
    return result;
  }

  function updateChromeVisibility() {
    if (state.lastEditable && !state.lastEditable.isConnected) {
      state.lastEditable = null;
    }

    const expanded = state.mode === 'expanded';
    const emptyQuery = !state.query.trim();
    const showCapture = expanded && state.captureMode;

    captureRow.hidden = !showCapture;
    recentRow.hidden = !expanded || state.captureMode || !emptyQuery || recentChips.childElementCount === 0;
    contextBar.hidden = !expanded || state.captureMode || !emptyQuery || !state.lastEditable;

    if (state.captureMode) {
      hintMain.textContent = 'Backspace 删除上一个 · Enter 完成';
      hintSub.textContent = 'Esc 退出录入';
      footerActions.hidden = true;
    } else {
      hintMain.textContent = '↑↓ 选择 · Enter 记录选中项';
      hintSub.textContent = '空查询不计数 · 点击条目不计数';
      footerActions.hidden = false;
    }
  }

  function renderRecent() {
    recentChips.replaceChildren();

    for (const id of state.recent) {
      const item = SHORTCUT_BY_ID.get(id);
      if (!item) continue;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'recent-chip';
      chip.textContent = item.keys[0].join('+');
      chip.title = item.title;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToShortcut(id);
      });
      recentChips.appendChild(chip);
    }

    updateChromeVisibility();
  }

  function jumpToShortcut(id) {
    const item = findItem(id);
    if (!item) return;

    const previousId = state.selectedId;
    state.selectedId = id;
    paintSelection(previousId);
    item.scrollIntoView({ block: 'center' });
    flashItem(id);
    searchEl.focus();
  }

  function addRecent(id) {
    recentVersion += 1;
    state.recent = [id, ...state.recent.filter((item) => item !== id)].slice(0, RECENT_MAX);
    renderRecent();
    chrome.storage.local.set({ [RECENT_KEY]: state.recent }).catch(() => {});
  }

  function isEditableElement(el) {
    if (!el || el.nodeType !== 1) return false;

    const tag = el.tagName;
    if (tag === 'TEXTAREA') return !el.disabled && !el.readOnly;
    if (tag === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      const nonTextTypes = [
        'button', 'checkbox', 'radio', 'submit', 'reset', 'file',
        'color', 'range', 'image', 'hidden',
      ];
      return !nonTextTypes.includes(type) && !el.disabled && !el.readOnly;
    }

    return el.isContentEditable;
  }

  function updateContextBar() {
    if (state.lastEditable && !state.lastEditable.isConnected) {
      state.lastEditable = null;
    }

    const text = EDIT_CONTEXT_IDS
      .map((id) => SHORTCUT_BY_ID.get(id))
      .filter(Boolean)
      .map((item) => `${item.keys[0].join('+')} ${item.title}`)
      .join(' · ');

    contextText.textContent = text;
    updateChromeVisibility();
  }

  function handlePageFocus(event) {
    const target = event.target;

    // 卡片内部的焦点（Shadow DOM 会重定向到 host）不改变页面上下文
    if (target === host) return;

    state.lastEditable = isEditableElement(target) ? target : null;
    updateContextBar();
  }

  // ============ 逐键录入 ============
  function updateCaptureDisplay() {
    searchEl.value = state.captureKeys.join(' + ');
    state.query = state.captureKeys.join(' ');
    state.selectedId = null;
    render(true);
  }

  function resetCaptureState() {
    state.captureMode = false;
    state.captureKeys = [];
    searchEl.readOnly = false;
    searchEl.placeholder = '搜索快捷键 / 功能…';
    sortBtn.hidden = false;
    captureBtn.classList.remove('active');
    card.classList.remove('capturing');
  }

  function startCapture() {
    state.captureMode = true;
    state.captureKeys = [];
    state.query = '';
    state.selectedId = null;
    searchEl.value = '';
    searchEl.readOnly = true;
    searchEl.placeholder = '逐个按键，不要同时按…';
    sortBtn.hidden = true;
    captureBtn.classList.add('active');
    card.classList.add('capturing');
    updateCaptureDisplay();
    searchEl.focus();
  }

  function finishCapture() {
    if (!state.captureMode) return;

    const keys = state.captureKeys.slice();
    resetCaptureState();
    searchEl.value = keys.join(' + ');
    state.query = keys.join(' ');
    state.selectedId = null;
    render(true);
    searchEl.focus();
  }

  function exitCapture() {
    resetCaptureState();
    searchEl.value = '';
    state.query = '';
    state.selectedId = null;
    render(true);
    updateChromeVisibility();
    searchEl.focus();
  }

  function addCaptureKey(label) {
    if (!label) return;
    if (state.captureKeys.length >= 4) {
      showToast('最多录入 4 个键');
      return;
    }
    if (state.captureKeys.includes(label)) return;

    state.captureKeys.push(label);
    updateCaptureDisplay();
  }

  function handleCaptureKey(event) {
    if (!state.captureMode) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.repeat) return;

    if (event.key === 'Escape') {
      exitCapture();
      return;
    }
    if (event.key === 'Enter') {
      finishCapture();
      return;
    }
    if (event.key === 'Backspace') {
      state.captureKeys.pop();
      updateCaptureDisplay();
      return;
    }
    if (/^F([1-9]|1[0-2])$/.test(event.key)) {
      showToast('F1–F12 请用特殊键下拉或直接输入');
      return;
    }

    const map = {
      Control: 'Ctrl',
      Shift: 'Shift',
      Alt: 'Alt',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Home: 'Home',
      End: 'End',
      PageUp: 'PgUp',
      PageDown: 'PgDn',
      Tab: 'Tab',
      Delete: 'Delete',
      ' ': 'Space',
    };

    if (map[event.key]) {
      addCaptureKey(map[event.key]);
      return;
    }

    if (event.key.length === 1) {
      addCaptureKey(event.key.toUpperCase());
    }
  }

  // ============ 形态 / 位置 ============
  let dataEpoch = 0;
  let modeVersion = 0;
  let sortVersion = 0;
  let geometryVersion = 0;
  let recentVersion = 0;

  function ensureMounted() {
    if (!host.isConnected) {
      (document.documentElement || document.body).appendChild(host);
    }
  }

  function clampPosition(left, top, width, height) {
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  }

  function applyExpandedGeometry() {
    if (card.hidden) return;

    const geo = state.geometry.expanded;
    if (!geo) {
      const rect = card.getBoundingClientRect();
      const width = rect.width || 360;
      const height = rect.height || 0;
      const left = Math.max(8, window.innerWidth - width - 24);
      const top = Math.max(8, (window.innerHeight - height) / 2);
      card.style.transform = 'none';
      card.style.right = 'auto';
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      return;
    }

    card.style.transform = 'none';
    card.style.right = 'auto';

    const rect = card.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || 0;
    const next = clampPosition(geo.left, geo.top, width, height);
    card.style.left = next.left + 'px';
    card.style.top = next.top + 'px';
  }

  function applyCollapsedGeometry() {
    if (pill.hidden) return;

    const geo = state.geometry.collapsed;
    if (!geo) {
      pill.style.top = '';
      pill.style.transform = '';
      return;
    }

    pill.style.transform = 'none';
    const height = pill.offsetHeight || 40;
    const next = clampPosition(0, geo.top, 0, height);
    pill.style.top = next.top + 'px';
  }

  function applyGeometryForMode() {
    if (state.mode === 'expanded') applyExpandedGeometry();
    else if (state.mode === 'collapsed') applyCollapsedGeometry();
  }

  function saveGeometry() {
    chrome.storage.local.set({ [GEOMETRY_KEY]: state.geometry }).catch(() => {});
  }

  function applyMode(mode, opts = {}) {
    const next = validMode(mode);
    const focus = opts.focus === true;
    modeVersion += 1;
    state.mode = next;

    if (next !== 'expanded' && state.captureMode) {
      resetCaptureState();
      state.query = '';
      searchEl.value = '';
    }

    ensureMounted();
    card.hidden = next !== 'expanded';
    pill.hidden = next !== 'collapsed';

    if (next === 'expanded') {
      render(false);
      updateChromeVisibility();
      applyExpandedGeometry();
      if (focus) {
        requestAnimationFrame(() => {
          if (state.mode === 'expanded') searchEl.focus();
        });
      }
      return;
    }

    searchEl.blur();
    updateChromeVisibility();

    if (next === 'collapsed') {
      hideToast();
      applyCollapsedGeometry();
      if (focus) {
        requestAnimationFrame(() => {
          if (state.mode === 'collapsed') pill.focus();
        });
      }
      return;
    }

    pill.blur();
    hideToast();
  }

  function setMode(mode, opts = {}) {
    applyMode(mode, opts);
    chrome.storage.local.set({ [MODE_KEY]: validMode(mode) }).catch(() => {});
  }

  function cycleMode(opts = {}) {
    let next;
    if (state.mode === 'hidden') next = 'expanded';
    else if (state.mode === 'expanded') next = 'collapsed';
    else next = 'expanded';

    setMode(next, { focus: opts.focus !== false });
  }

  // ============ 搜索计数 ============
  let lastRecordAt = 0;

  async function recordSearch(target) {
    const now = Date.now();
    if (now - lastRecordAt < 400) return;
    lastRecordAt = now;

    const epoch = dataEpoch;

    try {
      const res = await sendMessage({ type: 'ESC_RECORD_SEARCH', id: target.id });
      if (!res || !res.ok) throw new Error(res?.error || '记录失败');
      if (epoch !== dataEpoch) return;

      const count = Number(res.count);
      const next = Number.isFinite(count)
        ? count
        : (state.stats[target.id] || 0) + 1;
      state.stats[target.id] = Math.max(state.stats[target.id] || 0, next);
      addRecent(target.id);

      if (state.mode === 'expanded') {
        paintCount(target.id);
        flashItem(target.id);
        showToast(`已记录搜索：${target.title}`);
      }
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

      mergeStats(stats || {});

      if (state.mode === 'expanded') {
        render(true);
        searchEl.focus();
        showToast('已刷新');
      }
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

    dataEpoch += 1;
    restoreBtn.disabled = true;
    refreshBtn.disabled = true;
    try {
      const res = await sendMessage({ type: 'ESC_RESET_STATS' });
      if (!res || !res.ok) throw new Error(res?.error || '恢复失败');

      state.stats = {};
      state.query = '';
      state.sortBy = 'frequency';
      state.recent = [];
      state.selectedId = null;
      recentVersion += 1;
      sortVersion += 1;
      lastRecordAt = 0;
      searchEl.value = '';
      updateSortLabel();
      chrome.storage.local.set({ [SORT_KEY]: state.sortBy }).catch(() => {});
      chrome.storage.local.set({ [RECENT_KEY]: [] }).catch(() => {});
      renderRecent();

      if (state.captureMode) resetCaptureState();

      if (state.mode === 'expanded') {
        render(true);
        searchEl.focus();
        showToast('已恢复默认');
      }
    } catch (e) {
      console.warn('[快捷键卡片] 恢复默认数据失败：', e?.message || e);
      showToast('恢复失败，请重试');
    } finally {
      restoreBtn.disabled = false;
      refreshBtn.disabled = false;
    }
  }

  // ============ 拖动 / 标题栏切换 ============
  let draggingCard = false;
  let cardMoved = false;
  let cardStartX = 0;
  let cardStartY = 0;
  let cardOriginLeft = 0;
  let cardOriginTop = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('button, input')) return;

    const rect = card.getBoundingClientRect();
    draggingCard = true;
    cardMoved = false;
    cardStartX = e.clientX;
    cardStartY = e.clientY;
    cardOriginLeft = rect.left;
    cardOriginTop = rect.top;

    card.style.transform = 'none';
    card.style.right = 'auto';
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    e.preventDefault();
  });

  let draggingPill = false;
  let pillStartX = 0;
  let pillStartY = 0;
  let pillOriginTop = 0;
  let pillMoved = false;
  let suppressPillClick = false;

  pill.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    const rect = pill.getBoundingClientRect();
    draggingPill = true;
    pillMoved = false;
    pillStartX = e.clientX;
    pillStartY = e.clientY;
    pillOriginTop = rect.top;

    pill.style.transform = 'none';
    pill.style.top = rect.top + 'px';
  });

  window.addEventListener('mousemove', (e) => {
    if (draggingCard && !card.hidden) {
      if (
        Math.abs(e.clientX - cardStartX) > 3 ||
        Math.abs(e.clientY - cardStartY) > 3
      ) {
        cardMoved = true;
      }

      const rect = card.getBoundingClientRect();
      const width = rect.width || 360;
      const height = rect.height || 0;
      const next = clampPosition(
        cardOriginLeft + e.clientX - cardStartX,
        cardOriginTop + e.clientY - cardStartY,
        width,
        height
      );
      card.style.left = next.left + 'px';
      card.style.top = next.top + 'px';
      return;
    }

    if (draggingPill && !pill.hidden) {
      const height = pill.offsetHeight || 40;
      if (
        Math.abs(e.clientY - pillStartY) > 3 ||
        Math.abs(e.clientX - pillStartX) > 3
      ) {
        pillMoved = true;
      }
      const next = clampPosition(0, pillOriginTop + e.clientY - pillStartY, 0, height);
      pill.style.top = next.top + 'px';
    }
  });

  // 用 capture 监听，保证 pill 自己的 mouseup stopPropagation 不会吃掉这里的位置保存
  window.addEventListener('mouseup', (e) => {
    if (draggingCard) {
      draggingCard = false;
      if (card.hidden) return;

      if (
        Math.abs(e.clientX - cardStartX) > 3 ||
        Math.abs(e.clientY - cardStartY) > 3
      ) {
        cardMoved = true;
      }

      if (cardMoved) {
        const rect = card.getBoundingClientRect();
        state.geometry.expanded = { left: rect.left, top: rect.top };
        saveGeometry();
        return;
      }

      // 没有移动：点击标题栏切换展开/收起
      const rect = header.getBoundingClientRect();
      const inHeader = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (inHeader) setMode('collapsed', { focus: true });
      return;
    }

    if (draggingPill) {
      draggingPill = false;
      if (pill.hidden) return;

      if (
        Math.abs(e.clientY - pillStartY) > 3 ||
        Math.abs(e.clientX - pillStartX) > 3
      ) {
        pillMoved = true;
      }

      if (pillMoved) {
        const rect = pill.getBoundingClientRect();
        state.geometry.collapsed = { top: rect.top };
        saveGeometry();
        suppressPillClick = true;
        setTimeout(() => { suppressPillClick = false; }, 300);
      }
    }
  }, true);

  window.addEventListener('resize', () => {
    if (state.mode === 'expanded') applyExpandedGeometry();
    else if (state.mode === 'collapsed') applyCollapsedGeometry();
  });

  // ============ 事件 ============
  card.addEventListener('click', (e) => e.stopPropagation());
  card.addEventListener('mousedown', (e) => e.stopPropagation());
  card.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  searchEl.addEventListener('input', () => {
    if (state.captureMode) return;

    state.query = searchEl.value;
    state.selectedId = null;
    render(true);
  });

  searchEl.addEventListener('keydown', (e) => {
    if (state.captureMode) {
      handleCaptureKey(e);
      return;
    }

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

      const target = items.find((item) => item.id === state.selectedId) || items[0];
      recordSearch(target);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      moveSelection(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (!state.query.trim() && (e.key === 'Home' || e.key === 'End')) {
      e.preventDefault();
      e.stopPropagation();
      selectBoundary(e.key === 'Home' ? 'start' : 'end');
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();

      if (searchEl.value) {
        searchEl.value = '';
        state.query = '';
        state.selectedId = null;
        render(true);
      } else {
        setMode('collapsed', { focus: true });
      }
    }
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target !== searchEl) {
      e.preventDefault();
      e.stopPropagation();
      setMode('collapsed', { focus: true });
    }
  });

  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setMode('hidden', { focus: false });
    }
  });

  host.addEventListener('keydown', (e) => e.stopPropagation());
  host.addEventListener('keyup', (e) => e.stopPropagation());
  host.addEventListener('keypress', (e) => e.stopPropagation());

  sortBtn.addEventListener('click', () => {
    const index = SORT_ORDER.indexOf(state.sortBy);
    state.sortBy = SORT_ORDER[(index + 1) % SORT_ORDER.length];
    sortVersion += 1;
    updateSortLabel();
    chrome.storage.local.set({ [SORT_KEY]: state.sortBy }).catch(() => {});
    render(true);
    searchEl.focus();
  });

  captureBtn.addEventListener('click', () => {
    if (state.captureMode) {
      finishCapture();
    } else {
      startCapture();
    }
  });

  captureDone.addEventListener('click', finishCapture);

  specialKey.addEventListener('change', () => {
    const value = specialKey.value;
    specialKey.value = '';
    if (!value) return;

    addCaptureKey(value);
    searchEl.focus();
  });

  collapseBtn.addEventListener('click', () => setMode('collapsed', { focus: true }));
  closeBtn.addEventListener('click', () => setMode('hidden', { focus: false }));
  refreshBtn.addEventListener('click', refreshStats);
  restoreBtn.addEventListener('click', restoreStats);

  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (item) {
      const previousId = state.selectedId;
      state.selectedId = item.dataset.id;
      paintSelection(previousId);
    }
    searchEl.focus();
  });

  document.addEventListener('focusin', handlePageFocus, true);

  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    if (suppressPillClick) {
      suppressPillClick = false;
      return;
    }
    setMode('expanded', { focus: true });
  });

  pill.addEventListener('mouseup', (e) => e.stopPropagation());
  pill.addEventListener('mousedown', (e) => e.stopPropagation());

  // ============ 消息 ============
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'ESC_TOGGLE_CARD') return;

    ensureMounted();
    cycleMode({ focus: true });
    sendResponse({ ok: true });
  });

  // ============ 存储同步 ============
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[MODE_KEY]) {
      applyMode(changes[MODE_KEY].newValue, { focus: false });
    }

    if (changes[GEOMETRY_KEY]) {
      geometryVersion += 1;
      state.geometry = normalizeGeometry(changes[GEOMETRY_KEY].newValue);
      applyGeometryForMode();
    }

    if (changes[SORT_KEY]) {
      sortVersion += 1;
      state.sortBy = validSort(changes[SORT_KEY].newValue);
      updateSortLabel();
      if (state.mode === 'expanded') render(false);
    }

    if (changes[STATS_KEY]) {
      const next = changes[STATS_KEY].newValue;
      state.stats = (next && typeof next === 'object') ? next : {};

      if (!next || Object.keys(next).length === 0) {
        dataEpoch += 1;
        if (state.mode === 'expanded') render(false);
      } else if (state.mode === 'expanded') {
        updateBadges();
      }
    }

    if (changes[RECENT_KEY]) {
      recentVersion += 1;
      state.recent = normalizeRecent(changes[RECENT_KEY].newValue);
      renderRecent();
    }
  });

  // ============ 初始化 ============
  (async () => {
    const startModeVersion = modeVersion;
    const startSortVersion = sortVersion;
    const startGeometryVersion = geometryVersion;
    const startRecentVersion = recentVersion;
    let stored = {};
    try {
      stored = await chrome.storage.local.get([MODE_KEY, GEOMETRY_KEY, SORT_KEY, RECENT_KEY]);
    } catch (e) {
      // 忽略
    }

    if (sortVersion === startSortVersion) {
      state.sortBy = validSort(stored[SORT_KEY]);
    }
    if (geometryVersion === startGeometryVersion) {
      state.geometry = normalizeGeometry(stored[GEOMETRY_KEY]);
    }
    if (recentVersion === startRecentVersion) {
      state.recent = normalizeRecent(stored[RECENT_KEY]);
    }
    if (isEditableElement(document.activeElement)) {
      state.lastEditable = document.activeElement;
    }
    updateSortLabel();
    renderRecent();
    updateContextBar();

    const epoch = dataEpoch;
    try {
      const stats = await loadStats();
      if (epoch === dataEpoch) mergeStats(stats);
    } catch (e) {
      console.warn('[快捷键卡片] 读取搜索次数失败：', e?.message || e);
    }

    // 加载期间如果用户已经按过快捷键或别的标签页改了形态，以最新状态为准
    if (modeVersion === startModeVersion) {
      state.mode = validMode(stored[MODE_KEY]);
    }

    render();
    applyMode(state.mode, { focus: false });
  })();
})();
