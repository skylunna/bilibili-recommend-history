/**
 * B站推荐历史 - Popup 脚本
 * 弹出窗口的交互逻辑
 */

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎨 Popup 已加载');
  
  // 加载统计数据
  await loadStats();
  
  // 加载设置
  await loadSettings();
  
  // 初始化事件监听
  initEventListeners();
});

// ==================== 统计数据 ====================

/**
 * 加载统计数据
 */
async function loadStats() {
  try {
    // 获取历史记录
    const historyResponse = await chrome.runtime.sendMessage({
      type: 'GET_HISTORY'
    });
    
    // 获取统计信息
    const statsResponse = await chrome.runtime.sendMessage({
      type: 'GET_STATS'
    });
    
    if (historyResponse && historyResponse.success) {
      const history = historyResponse.data || [];
      
      // 计算总记录数
      const totalSaved = history.length;
      document.getElementById('totalSaved').textContent = totalSaved;
      
      // 计算总视频数
      const totalVideos = history.reduce((sum, record) => {
        return sum + (record.items ? record.items.length : 0);
      }, 0);
      document.getElementById('totalVideos').textContent = totalVideos;
      
      // 显示最后保存时间
      if (statsResponse && statsResponse.success) {
        const stats = statsResponse.data;
        if (stats.lastSaveTime) {
          document.getElementById('lastSaveTime').textContent = 
            formatRelativeTime(stats.lastSaveTime);
        } else {
          document.getElementById('lastSaveTime').textContent = '还没有保存';
        }
      }
      
      // 计算存储使用
      updateStorageInfo(history);
    }
    
  } catch (error) {
    console.error('❌ 加载统计失败:', error);
  }
}

/**
 * 更新存储信息
 * @param {Array} history - 历史记录数组
 */
function updateStorageInfo(history) {
  // 估算大小
  const estimatedSize = new Blob([JSON.stringify(history)]).size;
  const maxSize = 5 * 1024 * 1024; // 5MB
  const percentage = Math.min(((estimatedSize / maxSize) * 100), 100);
  
  // 更新显示
  document.getElementById('storageUsed').textContent = percentage.toFixed(1);
  document.getElementById('storageFill').style.width = percentage + '%';
  
  // 根据使用量改变颜色
  const fillElement = document.getElementById('storageFill');
  if (percentage > 80) {
    fillElement.style.background = '#e74c3c'; // 红色
  } else if (percentage > 50) {
    fillElement.style.background = '#f39c12'; // 橙色
  } else {
    fillElement.style.background = '#00a1d6'; // 蓝色
  }
}

// ==================== 设置管理 ====================

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS'
    });
    
    if (response && response.success) {
      const settings = response.data;
      
      // 应用设置到UI
      document.getElementById('autoSave').checked = settings.autoSave;
      document.getElementById('showNotification').checked = settings.showNotification;
      document.getElementById('maxHistory').value = String(settings.maxHistory);
    }
    
  } catch (error) {
    console.error('❌ 加载设置失败:', error);
  }
}

/**
 * 保存设置
 * @param {Object} updates - 要更新的设置
 */
async function saveSettings(updates) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      data: updates
    });
    
    if (response && response.success) {
      console.log('✅ 设置已保存');
      
      // 显示保存成功提示
      showToast('设置已保存');
    }
    
  } catch (error) {
    console.error('❌ 保存设置失败:', error);
    showToast('保存失败', 'error');
  }
}

// ==================== 事件监听 ====================

/**
 * 初始化所有事件监听
 */
function initEventListeners() {
  // 设置变更
  document.getElementById('autoSave').addEventListener('change', (e) => {
    saveSettings({ autoSave: e.target.checked });
  });
  
  document.getElementById('showNotification').addEventListener('change', (e) => {
    saveSettings({ showNotification: e.target.checked });
  });
  
  document.getElementById('maxHistory').addEventListener('change', (e) => {
    saveSettings({ maxHistory: parseInt(e.target.value) });
  });
  
  // 快捷操作按钮
  document.getElementById('openBilibili').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.bilibili.com' });
  });
  
  document.getElementById('exportHistory').addEventListener('click', exportHistory);
  document.getElementById('clearAll').addEventListener('click', clearAllHistory);
  
  // 底部链接
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });
  
  document.getElementById('feedbackLink').addEventListener('click', (e) => {
    e.preventDefault();
    showFeedback();
  });
  
  document.getElementById('aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    showAbout();
  });
}

// ==================== 操作功能 ====================

/**
 * 导出历史数据
 */
async function exportHistory() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_HISTORY'
    });
    
    if (response && response.success) {
      const history = response.data;
      
      // 转换为JSON
      const dataStr = JSON.stringify(history, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bilibili-history-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      showToast('导出成功');
      console.log('✅ 历史已导出');
    }
    
  } catch (error) {
    console.error('❌ 导出失败:', error);
    showToast('导出失败', 'error');
  }
}

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
      // 重新加载统计
      await loadStats();
      
      showToast('已清空所有历史');
      console.log('✅ 所有历史已清空');
    }
    
  } catch (error) {
    console.error('❌ 清空失败:', error);
    showToast('清空失败', 'error');
  }
}

/**
 * 显示帮助
 */
function showHelp() {
  const helpText = `
【使用方法】

1. 访问 B站首页 (bilibili.com)
2. 点击推荐刷新按钮
3. 推荐内容会自动保存
4. 点击页面上的"推荐历史"按钮查看

【快捷键】
暂无快捷键

【注意事项】
- 最多保存 ${document.getElementById('maxHistory').value} 条记录
- 存储空间有限，建议定期清理
- 关闭自动保存后不会记录新的推荐
  `;
  
  alert(helpText);
}

/**
 * 显示反馈
 */
function showFeedback() {
  const feedbackText = `
【反馈渠道】

如有问题或建议，欢迎反馈：

方式一：通过 GitHub Issues
方式二：发送邮件至开发者
方式三：在扩展商店评论

感谢您的支持！
  `;
  
  alert(feedbackText);
}

/**
 * 显示关于
 */
function showAbout() {
  const aboutText = `
【B站推荐历史】

版本: v1.0.0
作者: Your Name
许可: MIT License

功能介绍：
- 自动保存B站推荐记录
- 按时间查看历史
- 搜索和管理记录
- 导出数据备份

开源地址：
https://github.com/yourusername/bilibili-recommend-history
  `;
  
  alert(aboutText);
}

// ==================== UI 工具 ====================

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 success/error
 */
function showToast(message, type = 'success') {
  // 创建提示元素
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // 显示动画
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // 3秒后移除
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==================== 工具函数 ====================

/**
 * 格式化相对时间
 * @param {number} timestamp - 时间戳
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes} 分钟前`;
  } else if (hours < 24) {
    return `${hours} 小时前`;
  } else if (days < 7) {
    return `${days} 天前`;
  } else {
    // 显示具体日期
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
}

/**
 * 格式化数字
 * @param {number} num - 数字
 * @returns {string}
 */
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  return num.toString();
}

console.log('✅ Popup 脚本加载完成');