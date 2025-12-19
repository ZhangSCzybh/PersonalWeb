document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded and DOM is ready');

    // 翻转文字效果
    const flipWords = ["再也不会", "ZAIYEBUHUI"];
    let currentWordIndex = 0;
    const flipWordElement = document.getElementById('flip-word');
    
    if (flipWordElement) {
        // 初始化第一个词
        const spans = flipWordElement.querySelectorAll('span');
        spans[0].classList.add('active');
        spans[1].classList.add('inactive');
        
        // 定时切换词语
        setInterval(() => {
            // 移除当前活动状态
            spans[currentWordIndex].classList.remove('active');
            spans[currentWordIndex].classList.add('inactive');
            
            // 切换到下一个词
            currentWordIndex = (currentWordIndex + 1) % flipWords.length;
            
            // 添加新的活动状态
            spans[currentWordIndex].classList.remove('inactive');
            spans[currentWordIndex].classList.add('active');
        }, 3000); // 每3秒切换一次
    }

    // 二维码弹窗相关代码 - 只在首页存在时执行
    const wechatModal = document.getElementById('wechat-modal');
    const douyinModal = document.getElementById('douyin-modal');
    const instagramModal = document.getElementById('instagram-modal');
    const wechatIcon = document.getElementById('wechat-icon');
    const douyinIcon = document.getElementById('douyin-icon');
    const instagramIcon = document.getElementById('instagram-icon');
    const closeBtns = document.querySelectorAll('.close');

    if (wechatIcon && wechatModal) {
        // 点击微信图标显示弹窗
        wechatIcon.addEventListener('click', function(e) {
            e.preventDefault();
            wechatModal.style.display = "block";
        });
    }

    if (douyinIcon && douyinModal) {
        // 点击抖音图标显示弹窗
        douyinIcon.addEventListener('click', function(e) {
            e.preventDefault();
            douyinModal.style.display = "block";
        });
    }

    if (instagramIcon && instagramModal) {
        // 点击Instagram图标显示弹窗
        instagramIcon.addEventListener('click', function(e) {
            e.preventDefault();
            instagramModal.style.display = "block";
        });
    }

    // 点击关闭按钮隐藏弹窗
    if (closeBtns.length > 0) {
        closeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                if (wechatModal) wechatModal.style.display = "none";
                if (douyinModal) douyinModal.style.display = "none";
                if (instagramModal) instagramModal.style.display = "none";
            });
        });
    }

    // 点击弹窗外部区域关闭弹窗
    window.addEventListener('click', function(event) {
        if (event.target === wechatModal) {
            wechatModal.style.display = "none";
        }
        if (event.target === douyinModal) {
            douyinModal.style.display = "none";
        }
        if (event.target === instagramModal) {
            instagramModal.style.display = "none";
        }
    });
    

    // AI 对话相关代码 - 只在首页存在时执行
    const chatButton = document.getElementById('chat-button');
    const chatDialog = document.getElementById('chat-dialog');
    const closeChat = document.querySelector('.close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.querySelector('.chat-messages');

    // 如果AI对话元素不存在，直接返回
    if (!chatButton || !chatDialog || !chatInput || !sendButton || !chatMessages) {
        // 不是首页，跳过AI对话相关代码
    } else {
        // 存储对话历史
        let conversationHistory = [{
            role: "system",
            content: "你一个AI助手，一个由再也不会开发的AI助手。你的回答应该专业、友好、准确。当涉及代码时，应该提供详细的解释和示例。请用中文回复。"
        }];

        // 打字机效果函数
        async function typeWriter(element, text) {
            const tokens = marked.lexer(text);
            let html = '';
            let currentIndex = 0;
            
            for (const token of tokens) {
                if (token.type === 'paragraph') {
                    const words = token.text.split('');  // 修改为按字符分割
                    for (const char of words) {
                        html += char;
                        element.innerHTML = marked.parse(html);
                        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        await new Promise(resolve => setTimeout(resolve, 20));  // 减少延迟时间
                    }
                } else if (token.type === 'code') {
                    // 代码块一次性显示
                    html += '```' + (token.lang || '') + '\n' + token.text + '\n```\n';
                    element.innerHTML = marked.parse(html);
                    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    Prism.highlightAllUnder(element);  // 重新应用代码高亮
                } else {
                    html += marked.parse(token.raw);
                    element.innerHTML = html;
                    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
            }
        }

        // 发送消息到 360智脑 API
        async function sendToOpenAI(messages) {
            try {
                const response = await fetch('https://api.360.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer fk2673363969.QHiisYhw8lOLBNeZamiSN7ilXfeNe6p-fb078d07'
                    },
                    body: JSON.stringify({
                        model: "360GPT_S2_V9",
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 2000,
                        stream: true
                    })
                });

                if (!response.ok) {
                    throw new Error('API 请求失败');
                }

                return response;
            } catch (error) {
                console.error('Error:', error);
                throw error;
            }
        }

        // 处理流式响应
        async function handleStream(response, messageContent) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let markdown = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value);
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0].delta.content;
                                if (content) {
                                    markdown += content;
                                    messageContent.innerHTML = marked.parse(markdown);
                                    Prism.highlightAllUnder(messageContent);
                                    messageContent.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error reading stream:', error);
                throw error;
            }

            return markdown;
        }

        // 发送消息
        async function sendMessage() {
            const message = chatInput.value.trim();
            if (message) {
                // 禁用输入和发送按钮
                chatInput.disabled = true;
                sendButton.disabled = true;
                sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                // 添加用户消息
                const userMessage = document.createElement('div');
                userMessage.className = 'message user';
                userMessage.innerHTML = `
                    <div class="message-content">
                        <p>${marked.parse(message)}</p>
                    </div>
                `;
                chatMessages.appendChild(userMessage);

                // 更新对话历史
                conversationHistory.push({
                    role: "user",
                    content: message
                });

                // 清空输入框
                chatInput.value = '';
                chatInput.style.height = 'auto';

                // 滚动到底部
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // 添加 AI 消息容器
                const aiMessage = document.createElement('div');
                aiMessage.className = 'message ai';
                aiMessage.innerHTML = `
                    <div class="avatar">
                        <img src="images/image.png" alt="AI">
                    </div>
                    <div class="message-content">
                        <div class="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                `;
                chatMessages.appendChild(aiMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;

                try {
                    const response = await sendToOpenAI(conversationHistory);
                    const messageContent = aiMessage.querySelector('.message-content');
                    messageContent.innerHTML = '<div class="markdown-content"></div>';
                    
                    const aiResponse = await handleStream(response, messageContent.querySelector('.markdown-content'));
                    
                    // 更新对话历史
                    conversationHistory.push({
                        role: "assistant",
                        content: aiResponse
                    });

                    // 如果对话历史太长，删除较早的消息
                    if (conversationHistory.length > 10) {
                        conversationHistory = [
                            conversationHistory[0],
                            ...conversationHistory.slice(-4)
                        ];
                    }

                } catch (error) {
                    console.error('Error:', error);
                    const messageContent = aiMessage.querySelector('.message-content');
                    messageContent.innerHTML = '<p class="error">抱歉，我遇到了一些问题，请稍后再试。</p>';
                } finally {
                    // 恢复输入和发送按钮
                    chatInput.disabled = false;
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
                    chatInput.focus();
                }
            }
        }

        // 打开对话框
        chatButton.addEventListener('click', () => {
            console.log('Chat button clicked');
            chatDialog.style.display = 'block';
            chatInput.focus();
        });

        // 关闭对话框
        if (closeChat) {
            closeChat.addEventListener('click', () => {
                chatDialog.style.display = 'none';
            });
        }

        // 点击非对话框区域关闭对话框
        document.addEventListener('click', (event) => {
            if (chatDialog && chatDialog.style.display === 'block' && 
                chatDialog.querySelector('.chat-dialog-content') &&
                !chatDialog.querySelector('.chat-dialog-content').contains(event.target) && 
                chatButton && !chatButton.contains(event.target)) {
                chatDialog.style.display = 'none';
            }
        });

        // 阻止对话框内部点击事件冒泡
        if (chatDialog) {
            const chatDialogContent = chatDialog.querySelector('.chat-dialog-content');
            if (chatDialogContent) {
                chatDialogContent.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
            }
        }

        // 发送按钮点击事件
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }

        // 输入框回车发送
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        // 自动调整输入框高度
        if (chatInput) {
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
            });
        }
    }

    // 自我介绍卡片相关代码
    const aboutModal = document.getElementById('about-modal');
    const aboutClose = document.querySelector('.about-close');
    const contactLink = document.querySelector('a[href="#"].nav-link');

    if (contactLink && aboutModal) {
        // 点击联系我链接显示弹窗
        contactLink.addEventListener('click', function(e) {
            e.preventDefault();
            aboutModal.style.display = 'flex';
            setTimeout(() => {
                aboutModal.classList.add('active');
            }, 10);
        });
    }

    if (aboutClose && aboutModal) {
        // 点击关闭按钮隐藏弹窗
        aboutClose.addEventListener('click', function() {
            aboutModal.classList.remove('active');
            setTimeout(() => {
                aboutModal.style.display = 'none';
            }, 300);
        });
    }

    if (aboutModal) {
        // 点击弹窗外部区域关闭弹窗
        aboutModal.addEventListener('click', function(e) {
            if (e.target === aboutModal) {
                aboutModal.classList.remove('active');
                setTimeout(() => {
                    aboutModal.style.display = 'none';
                }, 300);
            }
        });
    }

    // ESC 键关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && aboutModal && aboutModal.classList.contains('active')) {
            aboutModal.classList.remove('active');
            setTimeout(() => {
                aboutModal.style.display = 'none';
            }, 300);
        }
    });


    // 登录功能相关代码
    // 登录功能相关代码
            const authButton = document.getElementById('auth-button');
            const loginModal = document.getElementById('loginModal');
            const loginClose = document.querySelector('.login-close');
            const loginCancel = document.getElementById('loginCancel');
            const loginSubmit = document.getElementById('loginSubmit');
            const loginError = document.getElementById('loginError');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            // 检查登录状态
            function checkLoginStatus() {
                const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
                if (isLoggedIn) {
                    authButton.textContent = 'Logout';
                } else {
                    authButton.textContent = 'Login';
                }
            }

            // 显示登录弹窗
            function showLoginModal() {
                loginModal.classList.add('active');
            }

            // 隐藏登录弹窗
            function hideLoginModal() {
                loginModal.classList.remove('active');
                // 清空输入框和错误信息
                usernameInput.value = '';
                passwordInput.value = '';
                loginError.style.display = 'none';
            }

            // 处理登录
            function handleLogin() {
                const username = usernameInput.value.trim();
                const password = passwordInput.value.trim();

                // 简单的mock验证 (用户名: admin, 密码: 123456)
                if (username === 'zybh' && password === 'zaiyebuhui') {
                    // 登录成功
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userRole', 'admin'); // 设置用户角色
                    authButton.textContent = 'Logout';
                    hideLoginModal();
                } else if (username === 'dashboard' && password === 'dashboard') {
                    // dashboard账号登录成功
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userRole', 'dashboard'); // 设置dashboard用户角色
                    authButton.textContent = 'Logout';
                    hideLoginModal();
                    // 重定向到dashboard页面
                    window.location.href = '/dashboard.html';
                } else if (username === 'vehicles' && password === 'vehicles') {
                    // vehicles账号登录成功
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userRole', 'vehicles'); // 设置vehicles用户角色
                    authButton.textContent = 'Logout';
                    hideLoginModal();
                    // 重定向到records页面
                    window.location.href = '/records.html';
                } else {
                    // 登录失败
                    loginError.textContent = '用户名或密码错误';
                    loginError.style.display = 'block';
                }
            }

            // 处理登出
            function handleLogout() {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole'); // 清除用户角色信息
                authButton.textContent = 'Login';
                // 如果当前在受保护页面，则重定向到首页
                const protectedPages = ['/favorites.html', '/bill.html', '/dashboard.html', '/records.html', '/analytics.html', '/vehicles.html'];
                const currentPage = window.location.pathname;
                if (protectedPages.includes(currentPage)) {
                    window.location.href = '/index.html';
                }
            }

            // 事件监听器
            authButton.addEventListener('click', function() {
                const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
                if (isLoggedIn) {
                    handleLogout();
                } else {
                    showLoginModal();
                }
            });

            loginClose.addEventListener('click', hideLoginModal);
            loginCancel.addEventListener('click', hideLoginModal);

            loginSubmit.addEventListener('click', handleLogin);

            // 回车键登录
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });

            // 初始化检查登录状态
            checkLoginStatus();
});