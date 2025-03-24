(function() {
    console.log("豆瓣 B 站视频助手已加载");

    function getDoubanTitle() {
        let titleElement = document.querySelector("span[property='v:itemreviewed']") || document.querySelector("h1");
        return titleElement ? titleElement.innerText.trim() : null;
    }

    // 获取电影/书籍的年份
    function getYear() {
        let yearElement = document.querySelector("span[property='v:initialReleaseDate']") || 
                         document.querySelector("span[property='v:date']") ||
                         document.querySelector(".year");
        if (yearElement) {
            let year = yearElement.textContent.match(/\d{4}/);
            return year ? year[0] : null;
        }
        return null;
    }

    // 获取电影/书籍的类型
    function getType() {
        let typeElement = document.querySelector("span[property='v:genre']") ||
                         document.querySelector(".info span[property='v:genre']");
        return typeElement ? typeElement.textContent.trim() : null;
    }

    // 提取中文标题的函数
    function extractChineseTitle(title) {
        if (!title) return "";
        
        // 匹配连续的中文字符（包括中文标点）
        const chineseRegex = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uff60]+/g;
        const matches = title.match(chineseRegex);
        
        if (matches && matches.length > 0) {
            // 如果找到中文，返回第一段连续的中文
            return matches[0].trim();
        }
        
        // 如果没有找到中文，返回原标题
        return title.trim();
    }

    let cachedVideos = []; // 存储所有视频
    let currentIndex = 0; // 当前显示的起始索引

    // 判断是否为电视剧
    function isTVSeries() {
        // 检查是否有集数信息
        let episodeElement = document.querySelector("span[property='v:numberOfEpisodes']") ||
                            document.querySelector(".episode");
        
        // 检查是否有季数或剧集信息
        let infoSpans = document.querySelectorAll(".info span");
        for (let span of infoSpans) {
            let text = span.textContent.toLowerCase();
            if (text.includes('集数') || text.includes('集') || 
                text.includes('季') || text.includes('season') ||
                text.includes('剧集') || text.includes('series')) {
                return true;
            }
        }
        
        return episodeElement !== null;
    }

    // 检查元素文本内容是否包含指定文字
    function hasText(selector, text) {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).some(el => el.textContent.includes(text));
    }

    function searchBilibili(query) {
        if (!query) return;
        
        // 提取中文标题作为搜索关键词
        const searchQuery = extractChineseTitle(query);
        console.log("提取的中文标题:", searchQuery);
        
        // 构建更精确的搜索关键词
        let finalQuery = `《${searchQuery}》`;  // 添加书名号
        console.log("添加书名号后的关键词:", finalQuery);
        
        // 根据页面类型添加不同的关键词
        console.log("当前页面路径:", window.location.pathname);
        
        // 检查是否在电影/电视剧页面
        const isMoviePage = window.location.pathname.includes('/movie/') || 
                           hasText('#info span.pl', '导演') ||
                           hasText('#info span.pl', '主演') ||
                           hasText('#info span.pl', '类型:') ||
                           document.querySelector('span[property="v:genre"]') !== null;
                           
        // 检查是否在图书页面
        const isBookPage = window.location.pathname.includes('/book/') ||
                          hasText('#info span.pl', '作者') ||
                          hasText('#info span.pl', '出版社');
        
        if (isMoviePage) {
            console.log("检测到电影页面");
            if (isTVSeries()) {
                console.log("检测到是电视剧");
                finalQuery += ' 电视剧';
            } else {
                console.log("检测到是电影");
                finalQuery += ' 电影';
            }
        } else if (isBookPage) {
            console.log("检测到图书页面");
            finalQuery += ' 图书';
        }
        
        console.log("最终搜索关键词:", finalQuery);
        
        let searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(finalQuery)}&order=click`;
        console.log("生成的搜索URL:", searchUrl);

        chrome.runtime.sendMessage({ action: "fetchBilibili", url: searchUrl }, response => {
            if (response.success) {
                let parser = new DOMParser();
                let doc = parser.parseFromString(response.html, "text/html");
                
                let videoElements = doc.querySelectorAll(".bili-video-card,.video-item");
                console.log("找到视频元素数量:", videoElements.length);

                cachedVideos = []; // 重置缓存
                currentIndex = 0; // 重置索引

                videoElements.forEach((el) => {
                    try {
                        let titleElement = el.querySelector(".bili-video-card__info--tit,.title,.info a");
                        let linkElement = el.querySelector("a[href*='bilibili.com/video']");
                        let authorElement = el.querySelector(".bili-video-card__info--author,.up-name,.up");
                        let viewsElement = el.querySelector(".bili-video-card__stats--item,.watch-num");
                        let thumbnailElement = el.querySelector(".bili-video-card__image img,.img img");

                        let videoUrl = "";
                        if (linkElement) {
                            videoUrl = linkElement.href || linkElement.getAttribute("href");
                            if (videoUrl && !videoUrl.startsWith("http")) {
                                videoUrl = "https:" + videoUrl;
                            }
                        }

                        let titleText = "";
                        if (titleElement) {
                            titleText = titleElement.getAttribute("title") || 
                                      titleElement.textContent.trim() ||
                                      titleElement.getAttribute("alt") ||
                                      "未知标题";
                        }

                        let thumbnailUrl = "";
                        if (thumbnailElement) {
                            thumbnailUrl = thumbnailElement.src || 
                                         thumbnailElement.getAttribute("src") ||
                                         thumbnailElement.getAttribute("data-src");
                        }

                        let views = "0";
                        if (viewsElement) {
                            views = viewsElement.textContent.trim();
                            if (!views.includes("万")) {
                                try {
                                    views = parseInt(views.replace(/[^0-9]/g, '')).toLocaleString();
                                } catch (e) {
                                    console.error("格式化播放量失败:", e);
                                }
                            }
                        }

                        if (videoUrl && titleText) {
                            cachedVideos.push({
                                title: titleText,
                                url: videoUrl,
                                author: authorElement ? authorElement.textContent.trim() : "未知作者",
                                views: views,
                                thumbnail: thumbnailUrl
                            });
                        }
                    } catch (error) {
                        console.error("处理视频元素时出错:", error);
                    }
                });

                if (cachedVideos.length > 0) {
                    insertBilibiliResults(cachedVideos.slice(0, 3), searchUrl);
                } else {
                    console.log("未找到 B 站解说视频");
                }
            } else {
                console.error("B 站搜索失败:", response.error);
            }
        });
    }

    function insertBilibiliResults(videos, searchUrl) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => doInsert());
        } else {
            doInsert();
        }

        function doInsert() {
            try {
                let container = document.createElement("div");
                container.className = "gray_ad";
                container.style.position = "relative";
                container.style.width = "100%";
                container.style.marginTop = "0";
                container.style.padding = "15px";
                container.style.backgroundColor = "#F4F4EC";
                container.style.border = "none";
                container.style.borderRadius = "0";
                container.style.boxSizing = "border-box";

                // 创建标题行容器
                let titleRow = document.createElement("div");
                titleRow.style.display = "flex";
                titleRow.style.justifyContent = "space-between";
                titleRow.style.alignItems = "center";
                titleRow.style.marginBottom = "15px";

                let title = document.createElement("h2");
                title.innerText = "b站相关视频推荐 ······";
                title.style.fontSize = "16px";
                title.style.color = "#007722";
                title.style.margin = "0";
                title.style.fontWeight = "normal";

                // 添加换一批按钮
                let refreshButton = document.createElement("a");
                refreshButton.href = "javascript:void(0);";
                refreshButton.innerText = "换一批";
                refreshButton.style.fontSize = "13px";
                refreshButton.style.color = "#37a";
                refreshButton.style.textDecoration = "none";
                refreshButton.style.cursor = "pointer";
                refreshButton.style.backgroundColor = "transparent";
                refreshButton.addEventListener("mouseover", () => {
                    refreshButton.style.color = "#37a";
                });
                refreshButton.onclick = (e) => {
                    e.preventDefault();
                    if (cachedVideos.length > currentIndex + 3) {
                        currentIndex += 3;
                        let nextVideos = cachedVideos.slice(currentIndex, currentIndex + 3);
                        // 移除旧的视频内容
                        while (videoContainer.firstChild) {
                            videoContainer.removeChild(videoContainer.firstChild);
                        }
                        // 添加新的视频内容
                        insertVideoItems(nextVideos, videoContainer);
                    } else {
                        // 如果已经是最后一批，重新开始
                        currentIndex = 0;
                        let nextVideos = cachedVideos.slice(currentIndex, currentIndex + 3);
                        while (videoContainer.firstChild) {
                            videoContainer.removeChild(videoContainer.firstChild);
                        }
                        insertVideoItems(nextVideos, videoContainer);
                    }
                };

                titleRow.appendChild(title);
                titleRow.appendChild(refreshButton);
                container.appendChild(titleRow);

                // 创建视频容器
                let videoContainer = document.createElement("div");
                container.appendChild(videoContainer);

                // 插入视频项目
                insertVideoItems(videos, videoContainer);

                // 添加 "去 B 站查看更多" 按钮
                let moreLink = document.createElement("a");
                moreLink.href = searchUrl;
                moreLink.target = "_blank";
                moreLink.innerText = "去B站查看更多 >";
                moreLink.style.fontSize = "13px";
                moreLink.style.color = "#37a";
                moreLink.style.textDecoration = "none";
                moreLink.style.display = "block";
                moreLink.style.textAlign = "right";
                moreLink.style.marginTop = "10px";
                moreLink.style.paddingTop = "10px";
                moreLink.style.borderTop = "1px solid #e8e8e8";
                moreLink.style.backgroundColor = "transparent";
                moreLink.addEventListener("mouseover", () => {
                    moreLink.style.color = "#37a";
                });
                moreLink.onclick = (e) => {
                    e.preventDefault();
                    window.open(searchUrl, "_blank");
                };
                container.appendChild(moreLink);

                // 查找插入位置
                let sidebarModule = document.querySelector("#content .aside");
                if (!sidebarModule) {
                    console.warn("未找到右侧栏，等待100ms后重试");
                    setTimeout(() => doInsert(), 100);
                    return;
                }

                // 查找或创建目标区域
                let movieSourcesSection = Array.from(sidebarModule.children).find(child => 
                    child.querySelector(".gray_ad") || 
                    (child.className === "gray_ad")
                )?.parentNode;

                if (!movieSourcesSection) {
                    movieSourcesSection = document.createElement("div");
                    sidebarModule.insertBefore(movieSourcesSection, sidebarModule.firstChild);
                }

                // 将容器插入到区域的最顶部
                movieSourcesSection.insertBefore(container, movieSourcesSection.firstChild);
            } catch (error) {
                console.error("插入B站解说模块时出错:", error);
            }
        }
    }

    // 辅助函数：插入视频项目
    function insertVideoItems(videos, container) {
        videos.forEach((video, index) => {
            if (!video || !video.url) return;

            let videoItem = document.createElement("div");
            videoItem.style.display = "flex";
            videoItem.style.alignItems = "flex-start";
            videoItem.style.marginBottom = "15px";
            videoItem.style.paddingBottom = "15px";
            videoItem.style.boxSizing = "border-box";
            if (index < videos.length - 1) {
                videoItem.style.borderBottom = "1px solid #e8e8e8";
            }

            if (video.thumbnail) {
                let thumbnail = document.createElement("img");
                thumbnail.src = video.thumbnail;
                thumbnail.style.width = "120px";
                thumbnail.style.height = "68px";
                thumbnail.style.objectFit = "cover";
                thumbnail.style.marginRight = "12px";
                thumbnail.style.cursor = "pointer";
                thumbnail.style.borderRadius = "2px";
                thumbnail.style.flexShrink = "0";
                thumbnail.onclick = (e) => {
                    e.preventDefault();
                    window.open(video.url, "_blank");
                };
                videoItem.appendChild(thumbnail);
            }

            let textContainer = document.createElement("div");
            textContainer.style.flex = "1";
            textContainer.style.minWidth = "0";
            textContainer.style.boxSizing = "border-box";

            let titleLink = document.createElement("a");
            titleLink.href = video.url;
            titleLink.target = "_blank";
            titleLink.innerText = video.title || "未知标题";
            titleLink.style.fontSize = "14px";
            titleLink.style.color = "#494949";
            titleLink.style.textDecoration = "none";
            titleLink.style.display = "block";
            titleLink.style.marginBottom = "4px";
            titleLink.style.lineHeight = "1.4";
            titleLink.style.maxHeight = "2.8em";
            titleLink.style.overflow = "hidden";
            titleLink.style.textOverflow = "ellipsis";
            titleLink.style.display = "-webkit-box";
            titleLink.style.webkitLineClamp = "2";
            titleLink.style.webkitBoxOrient = "vertical";
            titleLink.style.cursor = "pointer";
            titleLink.style.backgroundColor = "transparent";
            titleLink.addEventListener("mouseover", () => {
                titleLink.style.color = "#37a";
            });
            titleLink.addEventListener("mouseout", () => {
                titleLink.style.color = "#494949";
            });
            titleLink.onclick = (e) => {
                e.preventDefault();
                window.open(video.url, "_blank");
            };

            let metaInfo = document.createElement("div");
            metaInfo.style.fontSize = "12px";
            metaInfo.style.color = "#999";
            metaInfo.style.marginBottom = "4px";
            metaInfo.innerText = `UP主：${video.author || "未知作者"}`;

            let stats = document.createElement("div");
            stats.style.fontSize = "12px";
            stats.style.color = "#999";
            stats.innerHTML = `播放量：${video.views || "0"}`;

            textContainer.appendChild(titleLink);
            textContainer.appendChild(metaInfo);
            textContainer.appendChild(stats);
            videoItem.appendChild(textContainer);
            container.appendChild(videoItem);
        });
    }

    let title = getDoubanTitle();
    if (title) {
        console.log("豆瓣标题:", title);
        searchBilibili(title);
    } else {
        console.warn("未能获取到豆瓣页面的标题");
    }
})();
