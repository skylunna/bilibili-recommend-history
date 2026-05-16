/**
 * B站推荐历史 - Sidebar 脚本
 * 侧边栏的交互逻辑
 */

// ==================== 全局变量 ====================

let allHistory = [];        // 所有历史记录
let filteredHistory = [];   // 过滤后的记录
let currentSearchTerm = ''; // 当前搜索词

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎨 侧边栏已加载');
  
  // 初始化事件监听
  initEventListeners();
  
  // 加载历史记录
  await loadHistory();
  
  // 监听来自 Content Script 的消息
  window.addEventListener('message', handleMessage);
});

/**
 * 初始化所有事件监听
 */
function initEventListeners() {
  // 关闭按钮
  document.getElementById('closeBtn').addEventListener('click', closeSidebar);
  
  // 搜索框
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', handleSearch);
  
  // 清除搜索按钮
  document.getElementById('clearSearch').addEventListener('click', clearSearch);
  
  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadHistory();
  });
  
  // 清空所有按钮
  document.getElementById('clearAllBtn').addEventListener('click', clearAllHistory);
}

// ==================== 历史记录加载 ====================

/**
 * 加载历史记录
 */
async function loadHistory() {
  try {
    showLoading();
    
    // 从 Service Worker 获取历史
    const response = await chrome.runtime.sendMessage({
      type: 'GET_HISTORY'
    });
    
    if (response && response.success) {
      allHistory = response.data || [];
      filteredHistory = allHistory;
      
      // 更新UI
      renderHistory();
      updateStats();
      
      console.log('✅ 加载了', allHistory.length, '条历史记录');
    } else {
      showError('加载失败');
    }
    
  } catch (error) {
    console.error('❌ 加载历史失败:', error);
    showError('加载失败: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * 渲染历史记录列表
 */
function renderHistory() {
  const container = document.getElementById('historyItems');
  const emptyState = document.getElementById('emptyState');
  
  // 清空容器
  container.innerHTML = '';
  
  // 如果没有记录，显示空状态
  if (filteredHistory.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // 按时间分组
  const groupedHistory = groupByDate(filteredHistory);
  
  // 渲染每个分组
  for (const [date, records] of Object.entries(groupedHistory)) {
    // 日期标题
    const dateHeader = createDateHeader(date);
    container.appendChild(dateHeader);
    
    // 渲染该日期下的所有记录
    records.forEach(record => {
      const recordCard = createRecordCard(record);
      container.appendChild(recordCard);
    });
  }
}

/**
 * 按日期分组
 * @param {Array} history - 历史记录数组
 * @returns {Object} 分组后的对象
 */
function groupByDate(history) {
  const groups = {};
  
  history.forEach(record => {
    const date = formatDate(record.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
  });
  
  return groups;
}

/**
 * 创建日期标题
 * @param {string} date - 日期字符串
 * @returns {HTMLElement}
 */
function createDateHeader(date) {
  const header = document.createElement('div');
  header.className = 'date-header';
  header.textContent = date;
  return header;
}

/**
 * 创建历史记录卡片
 * @param {Object} record - 历史记录对象
 * @returns {HTMLElement}
 */
function createRecordCard(record) {
  const card = document.createElement('div');
  card.className = 'history-record';
  card.dataset.id = record.id;

  const time = formatTime(record.timestamp);
  const videoCount = record.items ? record.items.length : 0;

  // 不使用内联 onclick，CSP 禁止内联事件处理器
  card.innerHTML = `
    <div class="record-header">
      <div class="record-time">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
          <path d="M7.5 3a.5.5 0 0 1 .5.5v4.293l2.354 2.353a.5.5 0 0 1-.708.708l-2.5-2.5A.5.5 0 0 1 7 8V3.5a.5.5 0 0 1 .5-.5z"/>
        </svg>
        <span>${time}</span>
      </div>
      <div class="record-actions">
        <button class="action-btn expand-btn" title="展开查看">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
        <button class="action-btn danger delete-btn" title="删除">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="record-summary">
      <span class="video-count">${videoCount} 个视频</span>
    </div>
    <div class="record-content" id="content-${record.id}" style="display: none;">
      <div class="video-list"></div>
    </div>
  `;

  card.querySelector('.expand-btn').addEventListener('click', () => expandRecord(record.id));
  card.querySelector('.delete-btn').addEventListener('click', () => deleteRecord(record.id));

  appendVideoItems(card.querySelector('.video-list'), record.items || []);

  return card;
}

/**
 * 向容器追加视频列表项（使用 DOM 方法避免内联事件处理器）
 * @param {HTMLElement} container - 目标容器
 * @param {Array} videos - 视频数组
 */
function appendVideoItems(container, videos) {
  if (!videos || videos.length === 0) {
    const p = document.createElement('p');
    p.className = 'no-videos';
    p.textContent = '暂无视频';
    container.appendChild(p);
    return;
  }

  videos.slice(0, 10).forEach(video => {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `
      <img class="video-cover" src="${ensureHttps(video.cover)}" alt="${escapeHtml(video.title)}" loading="lazy" />
      <div class="video-info">
        <h4 class="video-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</h4>
        <div class="video-meta">
          <span class="video-author">${escapeHtml(video.author)}</span>
          <span class="video-stats">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
            </svg>
            ${formatNumber(video.play)}
          </span>
        </div>
      </div>
    `;
    item.addEventListener('click', () => openVideo(video.bvid));
    container.appendChild(item);
  });
}

// ==================== 交互功能 ====================

/**
 * 展开/收起记录
 * @param {string} recordId - 记录ID
 */
window.expandRecord = function(recordId) {
  const content = document.getElementById(`content-${recordId}`);
  const card = document.querySelector(`[data-id="${recordId}"]`);
  const expandBtn = card.querySelector('.expand-btn');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    card.classList.add('expanded');
    expandBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.646 11.354a.5.5 0 0 0 .708 0l6-6a.5.5 0 0 0-.708-.708L8 10.293 2.354 4.646a.5.5 0 1 0-.708.708l6 6z"/>
      </svg>
    `;
  } else {
    content.style.display = 'none';
    card.classList.remove('expanded');
    expandBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
      </svg>
    `;
  }
};

/**
 * 删除单条记录
 * @param {string} recordId - 记录ID
 */
window.deleteRecord = async function(recordId) {
  if (!confirm('确定要删除这条历史记录吗？')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_HISTORY',
      id: recordId
    });
    
    if (response && response.success) {
      // 从数组中移除
      allHistory = allHistory.filter(r => r.id !== recordId);
      filteredHistory = filteredHistory.filter(r => r.id !== recordId);
      
      // 重新渲染
      renderHistory();
      updateStats();
      
      console.log('✅ 记录已删除');
    }
  } catch (error) {
    console.error('❌ 删除失败:', error);
    alert('删除失败: ' + error.message);
  }
};

/**
 * 打开视频
 * @param {string} bvid - 视频BV号
 */
window.openVideo = function(bvid) {
  const url = `https://www.bilibili.com/video/${bvid}`;
  window.open(url, '_blank');
};

/**
 * 清空所有历史
 */
async function clearAllHistory() {
  if (!confirm('确定要清空所有历史记录吗？此操作无法撤销！')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CLEAR_HISTORY'
    });
    
    if (response && response.success) {
      allHistory = [];
      filteredHistory = [];
      renderHistory();
      updateStats();
      
      console.log('✅ 所有历史已清空');
    }
  } catch (error) {
    console.error('❌ 清空失败:', error);
    alert('清空失败: ' + error.message);
  }
}

// ==================== 搜索功能 ====================

/**
 * 处理搜索
 * @param {Event} event - 输入事件
 */
function handleSearch(event) {
  const searchTerm = event.target.value.trim().toLowerCase();
  currentSearchTerm = searchTerm;
  
  // 显示/隐藏清除按钮
  const clearBtn = document.getElementById('clearSearch');
  clearBtn.style.display = searchTerm ? 'block' : 'none';
  
  if (!searchTerm) {
    // 搜索为空，显示所有
    filteredHistory = allHistory;
  } else {
    // 过滤历史
    filteredHistory = allHistory.filter(record => {
      // 搜索视频标题或UP主名
      return record.items && record.items.some(video => {
        const titleMatch = video.title && video.title.toLowerCase().includes(searchTerm);
        const authorMatch = video.author && video.author.toLowerCase().includes(searchTerm);
        return titleMatch || authorMatch;
      });
    });
  }
  
  renderHistory();
}

/**
 * 清除搜索
 */
function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  currentSearchTerm = '';
  
  document.getElementById('clearSearch').style.display = 'none';
  
  filteredHistory = allHistory;
  renderHistory();
}

// ==================== 统计信息 ====================

/**
 * 更新统计信息
 */
async function updateStats() {
  // 更新总数
  document.getElementById('totalCount').textContent = allHistory.length;
  document.getElementById('totalHistory').textContent = allHistory.length;
  
  // 获取存储信息
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_STATS'
    });
    
    if (response && response.success) {
      const stats = response.data;
      
      // 计算存储使用百分比（简化计算）
      const estimatedSize = JSON.stringify(allHistory).length;
      const maxSize = 5 * 1024 * 1024; // 5MB
      const percentage = ((estimatedSize / maxSize) * 100).toFixed(1);
      
      document.getElementById('storageUsed').textContent = percentage;
    }
  } catch (error) {
    console.error('❌ 获取统计失败:', error);
  }
}

// ==================== UI 状态 ====================

/**
 * 显示加载动画
 */
function showLoading() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('historyItems').style.display = 'none';
}

/**
 * 隐藏加载动画
 */
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('historyItems').style.display = 'block';
}

/**
 * 显示错误
 * @param {string} message - 错误消息
 */
function showError(message) {
  const emptyState = document.getElementById('emptyState');
  emptyState.style.display = 'flex';
  emptyState.querySelector('h3').textContent = '加载失败';
  emptyState.querySelector('p').textContent = message;
}

/**
 * 关闭侧边栏
 */
function closeSidebar() {
  // 向父窗口发送关闭消息
  window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
}

/**
 * 处理来自外部的消息
 * @param {MessageEvent} event - 消息事件
 */
function handleMessage(event) {
  if (event.data.type === 'REFRESH_HISTORY') {
    console.log('📝 收到刷新请求');
    loadHistory();
  }
}

// ==================== 工具函数 ====================

/**
 * 格式化日期
 * @param {number} timestamp - 时间戳
 * @returns {string}
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 判断是今天、昨天还是其他
  if (isSameDay(date, today)) {
    return '今天';
  } else if (isSameDay(date, yesterday)) {
    return '昨天';
  } else {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * 格式化时间
 * @param {number} timestamp - 时间戳
 * @returns {string}
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 判断两个日期是否是同一天
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * 将图片 URL 强制升级为 HTTPS，避免 Mixed Content 警告
 * @param {string} url
 * @returns {string}
 */
function ensureHttps(url) {
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  return url.replace(/^http:\/\//, 'https://');
}

/**
 * 转义 HTML 特殊字符，防止 XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 格式化数字
 * @param {number} num - 数字
 * @returns {string}
 */
function formatNumber(num) {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

console.log('✅ Sidebar 脚本加载完成');