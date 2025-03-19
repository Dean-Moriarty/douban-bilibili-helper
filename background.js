chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchBilibili") {
        fetch(request.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })
        .then(response => response.text())
        .then(data => {
            console.log("成功获取B站搜索结果");
            sendResponse({ success: true, html: data });
        })
        .catch(error => {
            console.error("获取B站搜索结果失败:", error);
            sendResponse({ success: false, error: error.message });
        });
        
        return true; // 保持消息通道打开
    }
});
