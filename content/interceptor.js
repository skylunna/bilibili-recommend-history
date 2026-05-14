/**
 * B站推荐历史 - 页面拦截器
 * 运行在 MAIN world，可以真正拦截页面发出的 fetch/XHR 请求
 * 通过 window.postMessage 将数据传给隔离世界的 content.js
 */
(function () {
  function isRecommendApi(url) {
    return typeof url === 'string' &&
      url.includes('api.bilibili.com') &&
      url.includes('feed/rcmd');
  }

  function sendToContentScript(item, url) {
    window.postMessage({
      source: 'bili-recommend-history-interceptor',
      type: 'RECOMMEND_DATA',
      data: { item, url }
    }, '*');
  }

  // 拦截 Fetch API
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0] instanceof Request ? args[0].url : args[0];
    return originalFetch.apply(this, args).then(async (response) => {
      if (isRecommendApi(url)) {
        try {
          const data = await response.clone().json();
          if (data && data.code === 0 && data.data && data.data.item) {
            sendToContentScript(data.data.item, url);
          }
        } catch (e) {
          // 忽略解析错误，不影响正常响应
        }
      }
      return response;
    });
  };

  // 拦截 XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._biliUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._biliUrl && isRecommendApi(this._biliUrl)) {
      const capturedUrl = this._biliUrl;
      this.addEventListener('load', function () {
        try {
          const data = JSON.parse(this.responseText);
          if (data && data.code === 0 && data.data && data.data.item) {
            sendToContentScript(data.data.item, capturedUrl);
          }
        } catch (e) {
          // 忽略解析错误
        }
      });
    }
    return originalSend.apply(this, args);
  };
})();
