/**
 * B站推荐历史 - Service Worker
 * 后台运行，监听B站推荐API请求，自动保存推荐数据
 */

// Service Worker 中不能使用 importScripts 导入其他脚本
// 我们需要在这里重新实现需要的存储函数

// ==================== 存储工具函数 ====================

const STORAGE_KEYS = {
  HISTORY: 'recommend_history',
  SETTINGS: 'user_settings',
  STATS: 'statistics'
};

const DEFAULT_SETTINGS = {
  maxHistory: 2,
  autoSave: true,
  showNotification: true
};

/**
 * 保存推荐历史记录
 */
async function saveHistory(record) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    let history = result[STORAGE_KEYS.HISTORY] || [];
    
    history.unshift(record);
    
    const settings = await getSettings();
    if (history.length > settings.maxHistory) {
      history.splice(settings.maxHistory);
    }
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: history
    });
    
    console.log('✅ 推荐历史已保存:', record.id);
    return true;
    
  } catch (error) {
    console.error('❌ 保存历史失败:', error);
    return false;
  }
}

/**
 * 获取历史记录
 */
async function getHistory(limit = null) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    let history = result[STORAGE_KEYS.HISTORY] || [];
    
    if (limit && limit > 0) {
      history = history.slice(0, limit);
    }
    
    return history;
    
  } catch (error) {
    console.error('❌ 获取历史失败:', error);
    return [];
  }
}

/**
 * 删除指定历史记录
 */
async function deleteHistory(id) {
  try {
    const history = await getHistory();
    const filteredHistory = history.filter(record => record.id !== id);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: filteredHistory
    });
    
    console.log('✅ 历史记录已删除:', id);
    return true;
    
  } catch (error) {
    console.error('❌ 删除历史失败:', error);
    return false;
  }
}

/**
 * 清空所有历史记录
 */
async function clearHistory() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: []
    });
    
    console.log('✅ 所有历史记录已清空');
    return true;
    
  } catch (error) {
    console.error('❌ 清空历史失败:', error);
    return false;
  }
}

/**
 * 获取用户设置
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    
  } catch (error) {
    console.error('❌ 获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存用户设置
 */
async function saveSettings(settings) {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: newSettings
    });
    
    console.log('✅ 设置已保存:', newSettings);
    return true;
    
  } catch (error) {
    console.error('❌ 保存设置失败:', error);
    return false;
  }
}

/**
 * 获取统计信息
 */
async function getStats() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    const defaultStats = {
      totalSaved: 0,
      totalViews: 0,
      lastSaveTime: null,
      lastViewTime: null
    };
    
    return result[STORAGE_KEYS.STATS] || defaultStats;
    
  } catch (error) {
    console.error('❌ 获取统计失败:', error);
    return defaultStats;
  }
}

/**
 * 更新统计信息
 */
async function updateStats(updates) {
  try {
    const currentStats = await getStats();
    const newStats = { ...currentStats, ...updates };
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.STATS]: newStats
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ 更新统计失败:', error);
    return false;
  }
}

/**
 * 生成唯一ID
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== Service Worker 生命周期 ====================

/**
 * 安装事件 - Service Worker 首次安装时触发
 */
self.addEventListener('install', (event) => {
  console.log('🚀 B站推荐历史扩展 - Service Worker 安装中...');
  
  // 跳过等待，立即激活
  self.skipWaiting();
});

/**
 * 激活事件 - Service Worker 激活时触发
 */
self.addEventListener('activate', (event) => {
  console.log('✅ B站推荐历史扩展 - Service Worker 已激活');
  
  // 立即接管所有页面
  event.waitUntil(self.clients.claim());
  
  // 初始化设置
  initializeSettings();
});

/**
 * 初始化默认设置
 */
async function initializeSettings() {
  const settings = await getSettings();
  console.log('📋 当前设置:', settings);
}

/**
 * 解析推荐数据
 * @param {Array} items - API返回的推荐列表
 * @returns {Array} 解析后的数据
 */
function parseRecommendData(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  
  return items.map(item => {
    return {
      bvid: item.bvid || '',
      title: item.title || '',
      cover: item.pic || item.cover || '',
      author: item.owner?.name || '',
      authorMid: item.owner?.mid || '',
      authorFace: item.owner?.face || '',
      duration: item.duration || 0,
      play: item.stat?.view || 0,
      danmaku: item.stat?.danmaku || 0,
      like: item.stat?.like || 0,
      coin: item.stat?.coin || 0,
      favorite: item.stat?.favorite || 0,
      share: item.stat?.share || 0,
      pubdate: item.pubdate || 0,
      rcmdReason: item.rcmd_reason?.content || '',
      uri: item.uri || `https://www.bilibili.com/video/${item.bvid}`
    };
  });
}

// ==================== 消息处理 ====================

/**
 * 监听来自其他组件的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 收到消息:', message.type);
  
  // 使用异步处理
  handleMessage(message, sender).then(sendResponse);
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理消息
 * @param {Object} message - 消息对象
 * @param {Object} sender - 发送者信息
 * @returns {Promise<Object>} 响应数据
 */
async function handleMessage(message, sender) {
  switch (message.type) {
    
    case 'SAVE_RECOMMEND_DATA':
      // Content Script 拦截到推荐数据，请求保存
      return await handleSaveRecommendData(message.data);
    
    case 'GET_HISTORY':
      // 获取历史记录
      const history = await getHistory(message.limit);
      return { success: true, data: history };
    
    case 'DELETE_HISTORY':
      // 删除历史记录
      const deleted = await deleteHistory(message.id);
      return { success: deleted };
    
    case 'CLEAR_HISTORY':
      // 清空所有历史
      const cleared = await clearHistory();
      return { success: cleared };
    
    case 'GET_SETTINGS':
      // 获取设置
      const settings = await getSettings();
      return { success: true, data: settings };
    
    case 'SAVE_SETTINGS':
      // 保存设置
      const saved = await saveSettings(message.data);
      return { success: saved };
    
    case 'GET_STATS':
      // 获取统计信息
      const stats = await getStats();
      return { success: true, data: stats };
    
    default:
      console.warn('⚠️ 未知的消息类型:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * 处理保存推荐数据请求
 * @param {Object} rawData - 原始API数据
 * @returns {Promise<Object>} 处理结果
 */
async function handleSaveRecommendData(rawData) {
  try {
    // 检查设置
    const settings = await getSettings();
    if (!settings.autoSave) {
      return { success: false, message: '自动保存已禁用' };
    }
    
    // 解析数据
    const recommendData = parseRecommendData(rawData.item || rawData);
    
    if (recommendData.length === 0) {
      return { success: false, message: '没有有效的推荐数据' };
    }
    
    // 创建记录
    const record = {
      id: generateId(),
      timestamp: Date.now(),
      items: recommendData,
      source: rawData.source || 'unknown',
      url: rawData.url || ''
    };
    
    // 保存
    const success = await saveHistory(record);
    
    if (success) {
      // 更新统计
      const stats = await getStats();
      await updateStats({
        totalSaved: stats.totalSaved + 1,
        lastSaveTime: Date.now()
      });
      
      console.log('✅ 推荐数据已保存 (来自 Content Script)');
      
      return { 
        success: true, 
        message: `成功保存 ${recommendData.length} 个推荐`,
        recordId: record.id
      };
    }
    
    return { success: false, message: '保存失败' };
    
  } catch (error) {
    console.error('❌ 保存推荐数据失败:', error);
    return { success: false, error: error.message };
  }
}

// ==================== 工具函数 ====================

/**
 * 记录日志（带时间戳）
 * @param {string} message - 日志消息
 * @param {any} data - 附加数据
 */
function log(message, data = null) {
  const time = new Date().toLocaleTimeString('zh-CN');
  if (data) {
    console.log(`[${time}] ${message}`, data);
  } else {
    console.log(`[${time}] ${message}`);
  }
}

console.log('🎉 B站推荐历史 Service Worker 已加载');