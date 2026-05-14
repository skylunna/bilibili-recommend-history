/**
 * B站推荐历史 - 存储工具模块
 * 封装 Chrome Storage API，提供便捷的数据操作方法
 */

// ==================== 常量定义 ====================

const STORAGE_KEYS = {
  HISTORY: 'recommend_history',      // 推荐历史记录
  SETTINGS: 'user_settings',         // 用户设置
  STATS: 'statistics'                // 统计信息
};

const DEFAULT_SETTINGS = {
  maxHistory: 20,                    // 最多保存20条历史
  autoSave: true,                    // 自动保存
  showNotification: true             // 显示通知
};

// ==================== 核心存储方法 ====================

/**
 * 保存推荐历史记录
 * @param {Object} record - 推荐记录对象
 * @returns {Promise<boolean>} 是否成功
 */
async function saveHistory(record) {
  try {
    // 1. 获取现有历史
    const history = await getHistory();
    
    // 2. 添加新记录到开头
    history.unshift(record);
    
    // 3. 获取设置，限制最大数量
    const settings = await getSettings();
    if (history.length > settings.maxHistory) {
      history.splice(settings.maxHistory); // 删除超出部分
    }
    
    // 4. 保存到 Chrome Storage
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
 * 获取推荐历史记录
 * @param {number} limit - 限制返回数量（可选）
 * @returns {Promise<Array>} 历史记录数组
 */
async function getHistory(limit = null) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    let history = result[STORAGE_KEYS.HISTORY] || [];
    
    // 如果指定了限制数量
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
 * 根据ID获取单条历史记录
 * @param {string} id - 记录ID
 * @returns {Promise<Object|null>} 历史记录对象
 */
async function getHistoryById(id) {
  try {
    const history = await getHistory();
    return history.find(record => record.id === id) || null;
    
  } catch (error) {
    console.error('❌ 获取历史记录失败:', error);
    return null;
  }
}

/**
 * 删除指定的历史记录
 * @param {string} id - 记录ID
 * @returns {Promise<boolean>} 是否成功
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
 * @returns {Promise<boolean>} 是否成功
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

// ==================== 设置管理 ====================

/**
 * 获取用户设置
 * @returns {Promise<Object>} 设置对象
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    
    // 如果没有设置，返回默认值
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    
  } catch (error) {
    console.error('❌ 获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存用户设置
 * @param {Object} settings - 设置对象
 * @returns {Promise<boolean>} 是否成功
 */
async function saveSettings(settings) {
  try {
    // 合并默认设置和新设置
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
 * 重置设置为默认值
 * @returns {Promise<boolean>} 是否成功
 */
async function resetSettings() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
    });
    
    console.log('✅ 设置已重置为默认值');
    return true;
    
  } catch (error) {
    console.error('❌ 重置设置失败:', error);
    return false;
  }
}

// ==================== 统计信息 ====================

/**
 * 获取统计信息
 * @returns {Promise<Object>} 统计数据
 */
async function getStats() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    const defaultStats = {
      totalSaved: 0,           // 总保存次数
      totalViews: 0,           // 总查看次数
      lastSaveTime: null,      // 最后保存时间
      lastViewTime: null       // 最后查看时间
    };
    
    return result[STORAGE_KEYS.STATS] || defaultStats;
    
  } catch (error) {
    console.error('❌ 获取统计失败:', error);
    return defaultStats;
  }
}

/**
 * 更新统计信息
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<boolean>} 是否成功
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

// ==================== 工具方法 ====================

/**
 * 获取存储使用情况
 * @returns {Promise<Object>} 存储信息
 */
async function getStorageInfo() {
  try {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const maxBytes = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB
    
    return {
      used: bytesInUse,
      max: maxBytes,
      percentage: ((bytesInUse / maxBytes) * 100).toFixed(2),
      available: maxBytes - bytesInUse
    };
    
  } catch (error) {
    console.error('❌ 获取存储信息失败:', error);
    return null;
  }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化时间戳
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化的时间字符串
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// ==================== 导出 ====================

// 判断运行环境，选择合适的导出方式
if (typeof module !== 'undefined' && module.exports) {
  // Node.js 环境
  module.exports = {
    saveHistory,
    getHistory,
    getHistoryById,
    deleteHistory,
    clearHistory,
    getSettings,
    saveSettings,
    resetSettings,
    getStats,
    updateStats,
    getStorageInfo,
    generateId,
    formatTime,
    STORAGE_KEYS,
    DEFAULT_SETTINGS
  };
} else {
  // 浏览器环境 - 挂载到全局
  window.StorageUtils = {
    saveHistory,
    getHistory,
    getHistoryById,
    deleteHistory,
    clearHistory,
    getSettings,
    saveSettings,
    resetSettings,
    getStats,
    updateStats,
    getStorageInfo,
    generateId,
    formatTime,
    STORAGE_KEYS,
    DEFAULT_SETTINGS
  };
}
