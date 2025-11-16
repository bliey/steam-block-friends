// ==UserScript==
// @name         Steam 批量拉黑好友
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  在 Steam 用户页面添加按钮，一键拉黑该用户的所有好友
// @author       You
// @match        https://steamcommunity.com/profiles/*
// @match        https://steamcommunity.com/id/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // =======================
    // 配置区域
    // =======================
    const DELAY_MS = 800; // 每次拉黑请求之间的延迟（毫秒）
    const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）
    const MAX_RETRIES = 2; // 失败时最大重试次数
    const RETRY_DELAY = 2000; // 重试延迟（毫秒）
    
    // 全局状态
    let isCancelled = false;
    let startTime = null;

    // =======================
    // 创建按钮UI
    // =======================
    function createBlockButton() {
        // 检查按钮是否已存在
        const existingBtn = document.getElementById('steam-block-friends-btn');
        if (existingBtn) {
            console.log('[Steam 拉黑脚本] 按钮已存在，跳过创建');
            return;
        }

        // 确保 body 存在
        if (!document.body) {
            console.warn('[Steam 拉黑脚本] document.body 不存在，无法创建按钮');
            return;
        }

        const button = document.createElement('button');
        button.id = 'steam-block-friends-btn';
        button.textContent = '🚫 拉黑此用户的所有好友';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            padding: 12px 20px;
            min-width: 200px;
            max-width: 600px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            font-family: "Motiva Sans", Arial, sans-serif;
            white-space: nowrap;
            overflow: visible;
            text-align: center;
            line-height: 1.4;
        `;

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        });

        // 点击事件
        button.addEventListener('click', async () => {
            // 如果正在执行，则取消
            if (!isCancelled && (button.textContent.includes('⏳') || button.textContent.includes('准备中'))) {
                if (confirm('确定要取消当前操作吗？')) {
                    isCancelled = true;
                    button.textContent = '⏸️ 正在取消...';
                    return;
                }
                return;
            }

            // 重置取消标志
            isCancelled = false;

            if (!confirm('⚠️ 警告：此操作将拉黑当前用户的所有好友！\n\n确定要继续吗？')) {
                return;
            }

            if (!confirm('⚠️ 再次确认：此操作不可逆！\n\n你真的要继续吗？')) {
                return;
            }

            // 不禁用按钮，保持可点击以支持取消
            button.textContent = '⏳ 准备中... (点击可取消)';
            button.style.opacity = '0.6';

            try {
                await executeBlockProcess(button);
            } catch (error) {
                console.error('执行过程中出错：', error);
                if (!isCancelled) {
                    alert('❌ 执行失败，请查看控制台获取详细信息');
                }
            } finally {
                isCancelled = false;
                button.textContent = '🚫 拉黑此用户的所有好友';
                button.style.opacity = '1';
            }
        });

        try {
            document.body.appendChild(button);
            console.log('[Steam 拉黑脚本] 按钮已成功添加到页面');
        } catch (error) {
            console.error('[Steam 拉黑脚本] 添加按钮失败:', error);
        }
    }

    // =======================
    // 获取当前页面的用户 ID
    // =======================
    function getCurrentUserId() {
        const url = window.location.href;
        
        // 匹配 /profiles/76561198411291694 格式
        const profileMatch = url.match(/\/profiles\/(\d+)/);
        if (profileMatch) {
            return profileMatch[1];
        }
        
        // 匹配 /id/customURL 格式
        const idMatch = url.match(/\/id\/([^\/]+)/);
        if (idMatch) {
            return idMatch[1];
        }
        
        return null;
    }

    // =======================
    // 获取当前 sessionID（必需）
    // =======================
    function getSessionID() {
        // 尝试从全局变量获取
        if (typeof g_sessionID !== 'undefined') {
            return g_sessionID;
        }
        
        // 尝试从 cookie 获取
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sessionid') {
                return value;
            }
        }
        
        // 尝试从页面中查找
        const sessionInput = document.querySelector('input[name="sessionID"]');
        if (sessionInput) {
            return sessionInput.value;
        }
        
        return null;
    }

    // =======================
    // Steam 官方拉黑接口
    // =======================
    const BLOCK_API_URL = "https://steamcommunity.com/actions/BlockUserAjax";

    // =======================
    // 抓取指定用户的好友列表
    // =======================
    async function fetchFriends(id) {
        // 根据 ID 类型构建好友页 URL
        let url = id.startsWith("76") ?
            `https://steamcommunity.com/profiles/${id}/friends/` :
            `https://steamcommunity.com/id/${id}/friends/`;

        console.log(`正在抓取好友列表：${url}`);
        
        // 发起 GET 请求，带 cookie 登录状态
        let response = await fetch(url, { credentials: "include" });
        let html = await response.text();

        // 使用正则匹配所有 data-steamid="..."
        let matches = [...html.matchAll(/data-steamid="(\d+)"/g)];

        // 返回 SteamID 数组
        return matches.map(x => x[1]);
    }

    // =======================
    // 带超时的 fetch 请求
    // =======================
    async function fetchWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    }

    // =======================
    // 拉黑单个用户函数（带重试）
    // =======================
    async function blockUser(steamid, sessionID, retryCount = 0) {
        try {
            // 构建 POST 表单数据
            const form = new FormData();
            form.append("sessionID", sessionID); // 认证用
            form.append("steamid", steamid);     // 目标 ID
            form.append("block", 1);             // 1 = block

            // 发送请求（带超时）
            const res = await fetchWithTimeout(BLOCK_API_URL, {
                method: "POST",
                body: form,
                credentials: "include"           // 带 cookie
            }, REQUEST_TIMEOUT);

            // 获取返回文本
            const text = await res.text();

            try {
                // 尝试解析 JSON
                const json = JSON.parse(text);

                // success=1 或 true 都表示成功
                if (json === true || json.success === 1) {
                    console.log(`✔ 已成功拉黑：${steamid}`);
                    return { success: true, steamid };
                } else {
                    console.warn(`❌ 拉黑失败（返回 JSON 但不是成功）：${steamid}`, json);
                    return { success: false, steamid, error: json };
                }

            } catch (e) {
                // 返回 HTML 或无法解析
                console.error(`❌ 拉黑失败（返回 HTML）：${steamid}`);
                console.log(text.slice(0, 300));
                return { success: false, steamid, error: '返回非JSON格式' };
            }
        } catch (error) {
            // 网络错误或超时，尝试重试
            if (retryCount < MAX_RETRIES) {
                console.warn(`⚠️ 拉黑 ${steamid} 失败，${RETRY_DELAY/1000}秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`, error.message);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
                return await blockUser(steamid, sessionID, retryCount + 1);
            } else {
                console.error(`❌ 拉黑失败（已重试${MAX_RETRIES}次）：${steamid}`, error);
                return { success: false, steamid, error: error.message || '请求失败' };
            }
        }
    }

    // =======================
    // 可中断的延迟函数
    // =======================
    async function delayWithCancelCheck(ms) {
        const checkInterval = 100; // 每100ms检查一次
        const checks = Math.ceil(ms / checkInterval);
        
        for (let i = 0; i < checks; i++) {
            if (isCancelled) {
                throw new Error('操作已取消');
            }
            await new Promise(r => setTimeout(r, Math.min(checkInterval, ms - i * checkInterval)));
        }
    }

    // =======================
    // 更新按钮进度显示
    // =======================
    function updateButtonProgress(button, current, total, steamid) {
        if (!button) return;
        const percentage = Math.round((current / total) * 100);
        
        // 计算预计剩余时间
        let timeInfo = '';
        if (startTime && current > 0) {
            const elapsed = Date.now() - startTime;
            const avgTimePerItem = elapsed / current;
            const remaining = Math.round((total - current) * avgTimePerItem);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            if (minutes > 0) {
                timeInfo = ` - 剩余约${minutes}分${seconds}秒`;
            } else {
                timeInfo = ` - 剩余约${seconds}秒`;
            }
        }
        
        button.textContent = `⏳ [${current}/${total}] ${percentage}% - ${steamid}${timeInfo}`;
        // 让按钮宽度自适应文本长度
        button.style.width = 'auto';
    }

    // =======================
    // 主流程：抓好友 → 批量拉黑
    // =======================
    async function executeBlockProcess(button) {
        // 重置状态
        isCancelled = false;
        startTime = Date.now();

        // 获取当前用户 ID
        const targetId = getCurrentUserId();
        if (!targetId) {
            alert('❌ 无法获取当前用户 ID，请确保在用户资料页面');
            return;
        }

        console.log(`目标用户 ID: ${targetId}`);

        // 更新按钮状态
        if (button) {
            button.textContent = '⏳ 正在获取好友列表... (点击可取消)';
        }

        // 获取 sessionID
        const sessionID = getSessionID();
        if (!sessionID) {
            alert('❌ 无法获取 sessionID，请确保已登录 Steam');
            return;
        }

        console.log('正在抓取好友列表...');
        let friends = await fetchFriends(targetId);
        
        // 数组去重
        friends = [...new Set(friends)];
        console.log(`🔹 共找到 ${friends.length} 位好友（已去重）：`);
        console.log(friends);

        if (friends.length === 0) {
            alert('ℹ️ 该用户没有好友或好友列表不可见');
            return;
        }

        if (!confirm(`找到 ${friends.length} 位好友，确定要全部拉黑吗？`)) {
            return;
        }

        console.log('开始批量拉黑好友...');
        startTime = Date.now(); // 重新记录开始时间
        
        let successCount = 0;
        let failCount = 0;
        const failedSteamIds = [];
        const successSteamIds = [];
        
        for (let i = 0; i < friends.length; i++) {
            // 检查是否已取消
            if (isCancelled) {
                console.log('⚠️ 用户取消了操作');
                if (button) {
                    button.textContent = `⏸️ 已取消 - 成功:${successCount} 失败:${failCount}`;
                }
                alert(`操作已取消\n✅ 成功：${successCount} 个\n❌ 失败：${failCount} 个\n⏸️ 已处理：${i}/${friends.length}`);
                return;
            }

            const f = friends[i];
            const currentIndex = i + 1;
            
            // 更新按钮显示进度
            updateButtonProgress(button, currentIndex, friends.length, f);
            
            console.log(`[${currentIndex}/${friends.length}] 正在拉黑：${f}`);
            
            const result = await blockUser(f, sessionID);
            if (result.success) {
                successCount++;
                successSteamIds.push(f);
            } else {
                failCount++;
                failedSteamIds.push({ steamid: f, error: result.error });
            }
            
            // 等 800ms 避免短时间请求过多触发风控（可中断）
            if (i < friends.length - 1) {
                try {
                    await delayWithCancelCheck(DELAY_MS);
                } catch (error) {
                    if (error.message === '操作已取消') {
                        // 取消操作，跳出循环
                        break;
                    }
                    throw error;
                }
            }
        }

        // 检查是否已取消
        if (isCancelled) {
            console.log('⚠️ 用户取消了操作');
            if (button) {
                button.textContent = `⏸️ 已取消 - 成功:${successCount} 失败:${failCount}`;
            }
            const processedCount = successCount + failCount;
            alert(`操作已取消\n✅ 成功：${successCount} 个\n❌ 失败：${failCount} 个\n⏸️ 已处理：${processedCount}/${friends.length}`);
            return;
        }

        // 显示完成状态
        if (button) {
            button.textContent = `✅ 完成！成功:${successCount} 失败:${failCount}`;
        }

        // 计算总耗时
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`🎉 全部好友已处理完成！`);
        console.log(`✅ 成功：${successCount} 个`);
        console.log(`❌ 失败：${failCount} 个`);
        console.log(`⏱️ 总耗时：${totalTime} 秒`);
        
        // 显示详细统计
        let resultMessage = `处理完成！\n\n✅ 成功：${successCount} 个\n❌ 失败：${failCount} 个\n⏱️ 总耗时：${totalTime} 秒`;
        
        if (failedSteamIds.length > 0) {
            resultMessage += `\n\n失败的 SteamID：\n${failedSteamIds.slice(0, 10).map(f => f.steamid).join('\n')}`;
            if (failedSteamIds.length > 10) {
                resultMessage += `\n... 还有 ${failedSteamIds.length - 10} 个失败`;
            }
        }
        
        alert(resultMessage);
        
        // 在控制台输出完整列表
        if (failedSteamIds.length > 0) {
            console.log('❌ 失败的 SteamID 列表：', failedSteamIds);
        }
        if (successSteamIds.length > 0) {
            console.log('✅ 成功的 SteamID 列表：', successSteamIds);
        }
    }

    // =======================
    // 等待页面加载完成的辅助函数
    // =======================
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`等待元素超时: ${selector}`));
            }, timeout);
        });
    }

    // =======================
    // 初始化函数
    // =======================
    async function init() {
        console.log('[Steam 拉黑脚本] 开始初始化...', {
            url: location.href,
            readyState: document.readyState,
            hasBody: !!document.body
        });
        
        // 等待 body 元素存在
        if (!document.body) {
            console.log('[Steam 拉黑脚本] 等待 document.body...');
            await new Promise(resolve => {
                if (document.body) {
                    resolve();
                } else {
                    const observer = new MutationObserver(() => {
                        if (document.body) {
                            observer.disconnect();
                            resolve();
                        }
                    });
                    observer.observe(document.documentElement, {
                        childList: true
                    });
                    
                    // 超时保护
                    setTimeout(() => {
                        observer.disconnect();
                        resolve();
                    }, 5000);
                }
            });
        }

        // 等待页面内容加载（多次尝试）
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 尝试创建按钮
            try {
                createBlockButton();
                
                // 检查按钮是否真的创建成功
                if (document.getElementById('steam-block-friends-btn')) {
                    console.log('[Steam 拉黑脚本] 按钮创建成功！');
                    return;
                }
            } catch (error) {
                console.error(`[Steam 拉黑脚本] 第 ${i + 1} 次尝试创建按钮失败:`, error);
            }
        }
        
        console.warn('[Steam 拉黑脚本] 多次尝试后仍未成功创建按钮');
    }

    // =======================
    // 页面加载完成后初始化
    // =======================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 监听 URL 变化（Steam SPA 路由）
    let lastUrl = location.href;
    
    // 使用 pushState 和 replaceState 拦截
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('[Steam 拉黑脚本] 检测到页面变化，重新初始化');
                init();
            }
        }, 500);
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('[Steam 拉黑脚本] 检测到页面变化，重新初始化');
                init();
            }
        }, 500);
    };

    // 使用 popstate 事件监听浏览器前进/后退
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('[Steam 拉黑脚本] 检测到页面变化（popstate），重新初始化');
                init();
            }
        }, 500);
    });

})();

