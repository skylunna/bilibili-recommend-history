# B站推荐历史回溯 Chrome 扩展

## 🎉 项目简介

这是一个Chrome浏览器扩展，用于保存B站推荐内容的历史记录，让你可以随时回溯查看之前的推荐。

## ✨ 功能特点

- 🔄 **自动保存** - 刷新推荐时自动捕获并保存
- 📅 **按日期分组** - 清晰的时间线展示
- 🔍 **搜索功能** - 快速查找视频标题或UP主
- 📊 **统计信息** - 记录数量、存储使用一目了然
- ⚙️ **灵活设置** - 可配置自动保存、通知、最大记录数
- 💾 **数据导出** - 支持导出为JSON格式
- 🎨 **精美UI** - 现代化设计，暗黑模式支持

## 📦 项目结构

```
bilibili-recommend-history/
├── manifest.json              # 扩展配置文件 ✅
│
├── icons/                     # 图标资源 ✅
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── utils/                     # 工具函数 ✅
│   └── storage.js             # Chrome Storage API 封装 (334行)
│
├── background/                # 后台脚本 ✅
│   └── service-worker.js      # 数据捕获和消息处理 (352行)
│
├── content/                   # 内容脚本 ✅
│   ├── content.js             # API拦截和UI注入 (398行)
│   └── content.css            # 注入页面样式 (210行)
│
├── sidebar/                   # 侧边栏 ✅
│   ├── sidebar.html           # 历史记录界面
│   ├── sidebar.js             # 侧边栏逻辑 (521行)
│   └── sidebar.css            # 侧边栏样式
│
└── popup/                     # 弹出窗口 ✅
    ├── popup.html             # 统计和设置界面
    ├── popup.js               # 弹出窗口逻辑 (395行)
    └── popup.css              # 弹出窗口样式
```

## 🚀 安装方法

### 开发版安装（当前）

1. **下载项目文件**
   - 将所有文件放到一个文件夹中

2. **打开Chrome扩展管理页面**
   - 地址栏输入：`chrome://extensions/`
   - 或者：更多工具 → 扩展程序

3. **开启开发者模式**
   - 右上角打开"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

5. **完成！**
   - 扩展图标会出现在工具栏
   - 访问 bilibili.com 即可使用

## 📖 使用指南

### 1️⃣ 自动保存推荐

1. 访问 [B站首页](https://www.bilibili.com)
2. 点击推荐区域的"换一换"按钮
3. 扩展会自动捕获并保存推荐内容
4. 页面会出现"推荐历史"按钮

### 2️⃣ 查看历史记录

**方式一：页面按钮**
- 点击页面上的"推荐历史"按钮
- 侧边栏滑出显示历史记录

**方式二：扩展图标**
- 点击工具栏的扩展图标
- 查看统计信息和快捷操作

### 3️⃣ 搜索和管理

- 在侧边栏搜索框输入关键词
- 点击视频卡片跳转到B站
- 点击删除按钮移除记录
- 在 Popup 中清空所有历史

### 4️⃣ 设置调整

在 Popup 中可以调整：
- ✅ **自动保存** - 开启/关闭自动保存
- 🔔 **显示通知** - 保存成功时的通知
- 📊 **最大记录数** - 10/20/50/100 条

### 5️⃣ 数据导出

1. 点击 Popup 中的"导出数据"按钮
2. 选择保存位置
3. 获得 JSON 格式的历史记录文件

## 🛠️ 技术实现

### 核心技术

- **Manifest V3** - Chrome 扩展最新标准
- **Service Worker** - 后台数据处理
- **Content Script** - 页面交互和API拦截
- **Chrome Storage API** - 本地数据存储

### 关键功能实现

#### 1. API 拦截

通过重写 `window.fetch` 拦截B站推荐API：

```javascript
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return originalFetch.apply(this, args).then(response => {
    if (isRecommendApi(url)) {
      const clonedResponse = response.clone();
      // 发送数据给 Service Worker
    }
    return response;
  });
};
```

#### 2. 数据存储

使用 Chrome Storage Local API：

```javascript
// 保存数据
await chrome.storage.local.set({
  recommend_history: history
});

// 读取数据
const result = await chrome.storage.local.get('recommend_history');
```

#### 3. 消息通信

组件间通过 Chrome Runtime API 通信：

```javascript
// 发送消息
chrome.runtime.sendMessage({
  type: 'SAVE_RECOMMEND_DATA',
  data: recommendData
});

// 接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理消息
});
```

## 📊 数据结构

### 历史记录格式

```javascript
{
  id: "1704067200000_abc123",
  timestamp: 1704067200000,
  items: [
    {
      bvid: "BV1xx411c7mD",
      title: "视频标题",
      cover: "封面URL",
      author: "UP主名称",
      play: 100000,
      danmaku: 500,
      // ... 更多字段
    }
  ],
  source: "refresh"
}
```

## 🔧 开发文档

项目包含详细的开发文档：

- `docs-manifest.md` - manifest.json 配置说明
- `docs-storage.md` - 存储工具使用指南
- `docs-service-worker.md` - Service Worker 开发文档
- `docs-content-script.md` - Content Script 开发文档
- `docs-sidebar.md` - 侧边栏开发文档

## ⚠️ 注意事项

### 存储限制

- Chrome Storage Local 限制：**5MB**
- 建议定期清理旧数据
- 可以通过导出备份数据

### 隐私说明

- 所有数据仅保存在本地
- 不会上传到任何服务器
- 不会收集用户隐私信息

### 兼容性

- 支持 Chrome 88+ 版本
- 使用 Manifest V3 标准
- 仅在 bilibili.com 生效

## 🐛 常见问题

### Q: 按钮没有显示？
**A:** 刷新页面，或检查是否在 bilibili.com 首页

### Q: 数据没有保存？
**A:** 检查是否开启了"自动保存"设置

### Q: 如何备份数据？
**A:** 使用 Popup 中的"导出数据"功能

### Q: 存储空间不足？
**A:** 清理旧记录或减少最大保存数量

## 📝 更新日志

### v1.0.0 (2024-05-14)
- ✅ 初始版本发布
- ✅ 自动保存推荐记录
- ✅ 侧边栏查看历史
- ✅ 搜索和管理功能
- ✅ 数据导出功能
- ✅ 设置选项
- ✅ 统计信息展示

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境搭建

1. Clone 项目
2. 在 Chrome 中加载扩展
3. 修改代码后点击"重新加载"
4. 测试功能是否正常

### 代码规范

- 使用 ES6+ 语法
- 添加详细注释
- 遵循现有代码风格

## 📄 开源协议

MIT License

## 👨‍💻 作者

Your Name

## 🙏 致谢

感谢所有贡献者和使用者！

---

**如有问题或建议，欢迎提交 Issue！** 🎉