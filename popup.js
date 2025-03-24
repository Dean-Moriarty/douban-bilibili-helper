document.getElementById("openDouban").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://movie.douban.com/" });
});

// 监听插件图标点击事件
document.addEventListener('DOMContentLoaded', function() {
    // 可以在这里添加更多功能
    console.log('豆瓣 B 站解说助手已启动');
});
