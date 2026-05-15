/**
 * B站推荐历史 - Content Script
 * 注入到B站页面，拦截API响应，添加历史按钮
 */

// ==================== 全局变量 ====================

let sidebarOpen = false;
let sidebarIframe = null;
let historyButton = null;
let pendingRecord = null; // 暂存当前页面的推荐，等下次换一换时保存

// ==================== 页面加载完成后初始化 ====================

// 等待页面加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * 初始化函数
 */
function init() {
  console.log('🚀 B站推荐历史扩展已加载');

  // 1. 监听来自页面拦截器（MAIN world）的推荐数据
  listenToInterceptor();

  // 2. 等待推荐区域加载后添加按钮
  waitForRecommendArea();

  // 3. 监听来自 Service Worker 的消息
  listenToMessages();
}

// ==================== 拦截器消息接收 ====================

/**
 * 从 DOM 中提取当前页面已渲染的推荐视频（处理 SSR 场景）
 * content.js 在 document_end 运行时，SSR 渲染的卡片已在 DOM 中
 */
function tryCaptureDOMInitialData() {
  const cards = document.querySelectorAll('.bili-video-card');
  if (cards.length === 0) return;

  const items = [];
  cards.forEach(card => {
    const linkEl = card.querySelector('a[href*="/video/"]');
    if (!linkEl) return;

    const href = linkEl.getAttribute('href') || '';
    const bvidMatch = href.match(/\/video\/(BV[0-9A-Za-z]+)/);
    if (!bvidMatch) return;

    const bvid = bvidMatch[1];
    const titleEl = card.querySelector('.bili-video-card__info--tit');
    const coverEl = card.querySelector('img');
    const authorEl = card.querySelector('.bili-video-card__info--author');

    items.push({
      bvid,
      title: titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || '',
      pic: coverEl?.getAttribute('data-src') || coverEl?.src || '',
      owner: { name: authorEl?.textContent?.trim() || '', mid: 0, face: '' },
      stat: { view: 0, danmaku: 0, like: 0 },
      duration: 0,
      pubdate: 0,
      rcmd_reason: null,
      uri: `https://www.bilibili.com/video/${bvid}`
    });
  });

  if (items.length > 0) {
    pendingRecord = { item: items, url: window.location.href };
    console.log('📸 从DOM提取初始推荐数据，共', items.length, '个视频');
  }
}

/**
 * 监听来自 MAIN world 拦截器的推荐数据
 */
function listenToInterceptor() {
  // SSR 场景：页面初始推荐不走 API，直接从 DOM 解析作为待保存的初始状态
  tryCaptureDOMInitialData();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'bili-recommend-history-interceptor') return;
    if (event.data.type !== 'RECOMMEND_DATA') return;

    const { item, url } = event.data.data;

    if (pendingRecord !== null) {
      // 有待保存的批次（来自 DOM 解析或上次 API 响应）：保存它，将当前批存为新的 pending
      const toSave = pendingRecord;
      pendingRecord = { item, url };
      console.log('📦 保存前一批推荐数据，共', toSave.item.length, '个视频');
      saveRecommendData(toSave.item, toSave.url);
    } else {
      // 无 pending（CSR 场景，DOM 无初始卡片）：直接保存
      console.log('📦 保存推荐数据，共', item.length, '个视频');
      saveRecommendData(item, url);
    }
  });

  // 通知拦截器 content.js 已就绪，触发补发缓存的页面初始加载数据
  window.postMessage({ source: 'bili-recommend-history-content-ready' }, '*');
}

function saveRecommendData(item, url) {
  chrome.runtime.sendMessage({
    type: 'SAVE_RECOMMEND_DATA',
    data: { item, source: 'refresh', url }
  }).then(response => {
    if (response && response.success) {
      console.log('✅ 数据已保存:', response.message);
      updateHistoryButton();
    }
  }).catch(err => {
    console.error('❌ 保存数据失败:', err);
  });
}

// ==================== UI 注入 ====================

/**
 * 等待推荐区域加载
 */
function waitForRecommendArea() {
  // 尝试查找推荐区域
  const checkInterval = setInterval(() => {
    const recommendArea = findRecommendArea();
    
    if (recommendArea) {
      console.log('✅ 找到推荐区域');
      clearInterval(checkInterval);
      
      // 添加历史按钮
      addHistoryButton(recommendArea);
    }
  }, 500); // 每500ms检查一次
  
  // 10秒后停止检查
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);
}

/**
 * 查找推荐区域
 * @returns {Element|null} 推荐区域元素
 */
function findRecommendArea() {
  // B站首页推荐区域的多种可能选择器
  const selectors = [
    '.bili-feed4',                    // 新版首页
    '.recommended-container_floor-aside',  // 旧版首页
    '.feed-card',                     // feed卡片
    '.container.is-version8'          // 版本8
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  return null;
}

/**
 * 添加历史按钮
 * @param {Element} targetArea - 目标区域
 */
function addHistoryButton(targetArea) {
  // 避免重复添加
  if (historyButton) {
    return;
  }
  
  // 创建按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'bili-recommend-history-btn';
  buttonContainer.className = 'bili-history-btn-container';
  
  // 创建按钮
  const button = document.createElement('button');
  button.className = 'bili-history-btn';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
      <path d="M8 4v4.4l3.5 2.1-.8 1.3L6.5 9V4z"/>
    </svg>
    <span>推荐历史</span>
    <span class="history-count"></span>
  `;
  
  button.title = '查看推荐历史';
  
  // 点击事件
  button.addEventListener('click', () => {
    toggleSidebar();
  });
  
  buttonContainer.appendChild(button);
  
  // 插入到页面
  // 尝试找到合适的插入位置
  const headerArea = document.querySelector('.bili-header__channel') || 
                     document.querySelector('.channel-menu') ||
                     targetArea;
  
  if (headerArea) {
    headerArea.appendChild(buttonContainer);
    historyButton = button;
    console.log('✅ 历史按钮已添加');
    
    // 更新按钮显示的历史数量
    updateHistoryButton();
  }
}

/**
 * 更新历史按钮状态
 */
async function updateHistoryButton() {
  if (!historyButton) return;
  
  try {
    // 获取历史数量
    const response = await chrome.runtime.sendMessage({
      type: 'GET_HISTORY',
      limit: 100
    });
    
    if (response && response.success) {
      const count = response.data.length;
      const countBadge = historyButton.querySelector('.history-count');
      
      if (count > 0) {
        countBadge.textContent = count;
        countBadge.style.display = 'inline-block';
      } else {
        countBadge.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('❌ 更新按钮状态失败:', error);
  }
}

// ==================== 侧边栏 ====================

/**
 * 切换侧边栏显示/隐藏
 */
function toggleSidebar() {
  if (sidebarOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/**
 * 打开侧边栏
 */
function openSidebar() {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'bili-history-overlay';
  overlay.className = 'bili-history-overlay';
  overlay.addEventListener('click', closeSidebar);

  // 创建侧边栏容器
  const sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'bili-history-sidebar';
  sidebarContainer.className = 'bili-history-sidebar';

  // 创建 iframe（每次重新创建以确保刷新数据）
  sidebarIframe = document.createElement('iframe');
  sidebarIframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
  sidebarIframe.className = 'bili-history-iframe';

  sidebarContainer.appendChild(sidebarIframe);
  document.body.appendChild(overlay);
  document.body.appendChild(sidebarContainer);

  sidebarOpen = true;
  console.log('✅ 侧边栏已打开');
}

/**
 * 关闭侧边栏
 */
function closeSidebar() {
  const overlay = document.getElementById('bili-history-overlay');
  const sidebar = document.getElementById('bili-history-sidebar');

  if (overlay) overlay.remove();
  if (sidebar) sidebar.remove();

  // 重置引用，下次打开时重新创建
  sidebarIframe = null;
  sidebarOpen = false;

  console.log('✅ 侧边栏已关闭');
}

// ==================== 消息监听 ====================

/**
 * 监听来自其他组件的消息
 */
function listenToMessages() {
  // 来自 Service Worker / popup 的消息
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('📨 收到消息:', message.type);

    switch (message.type) {
      case 'HISTORY_UPDATED':
        updateHistoryButton();
        if (sidebarOpen && sidebarIframe) {
          sidebarIframe.contentWindow.postMessage({ type: 'REFRESH_HISTORY' }, '*');
        }
        break;

      case 'OPEN_VIDEO':
        if (message.data && message.data.bvid) {
          window.open(`https://www.bilibili.com/video/${message.data.bvid}`, '_blank');
        }
        break;

      default:
        console.warn('⚠️ 未知的消息类型:', message.type);
    }

    sendResponse({ success: true });
  });

  // 来自 sidebar iframe 的消息（通过 window.postMessage）
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    // 只处理 sidebar 发来的关闭请求，拦截器消息已在 listenToInterceptor 中处理
    if (event.data.type === 'CLOSE_SIDEBAR') {
      closeSidebar();
    }
  });
}

// ==================== 页面监听 ====================

/**
 * 监听页面变化（处理B站的单页应用导航）
 */
const observer = new MutationObserver(() => {
  // 检查是否需要重新添加按钮
  if (!document.getElementById('bili-recommend-history-btn')) {
    const recommendArea = findRecommendArea();
    if (recommendArea) {
      historyButton = null;
      addHistoryButton(recommendArea);
    }
  }
});

// 开始观察
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// ==================== 工具函数 ====================

/**
 * 格式化数字（播放量等）
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长
 */
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

console.log('🎉 Content Script 初始化完成');