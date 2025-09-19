document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded and DOM is ready');

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
        return; // 如果不是首页，直接返回
    }

    // 存储对话历史
    let conversationHistory = [{
        role: "system",
        content: "你一个AI助手，一个由再也不会开发的AI助手。你的回答应该专业、友好、准确。当涉及代码时，应该提供详细的解释和示例。请用中文回复。"
    }];

    // ���字机效果函数
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
        chatDialog.style.display = 'block';
        chatInput.focus();
    });

    // 关闭对话框
    closeChat.addEventListener('click', () => {
        chatDialog.style.display = 'none';
    });

    // 发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);

    // 输入框回车发送
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 自动调整输入框高度
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });


    // 3D Card Effect
    const card3d = document.querySelector('.card-3d');
    if (card3d) {
        card3d.addEventListener('mousemove', (e) => {
            const card = e.currentTarget;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 30;
            const rotateY = -(x - centerX) / 30;
            
            // 使用 requestAnimationFrame 优化动画性能
            requestAnimationFrame(() => {
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        });

        card3d.addEventListener('mouseleave', (e) => {
            const card = e.currentTarget;
            requestAnimationFrame(() => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
                card.style.transition = 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
            });
        });

        card3d.addEventListener('mouseenter', (e) => {
            const card = e.currentTarget;
            card.style.transition = 'transform 0.05s ease';
        });
    }

    // Card Stack Effect
    const cardStack = document.querySelector('.card-stack');
    if (cardStack) {
        const cards = document.querySelectorAll('.card-stack-item');
        let currentIndex = 0;

        function rotateCards() {
            currentIndex = (currentIndex + 1) % cards.length;
            cards.forEach((card, index) => {
                const adjustedIndex = (index - currentIndex + cards.length) % cards.length;
                const offset = adjustedIndex * 40;
                const scale = 1 - (adjustedIndex * 0.05);
                card.style.transform = `translateY(${offset}px) scale(${scale})`;
                card.style.zIndex = (4 - adjustedIndex).toString();
                
                // 顶部卡片显示内容，其他卡片隐藏内容
                const content = card.querySelector('.card-stack-content');
                const title = content.querySelector('h3');
                const description = content.querySelector('p');
                
                if (adjustedIndex === 0) {
                    // 顶部卡片，显示内容
                    title.style.opacity = '1';
                    title.style.transform = 'translateY(0)';
                    description.style.opacity = '1';
                    description.style.transform = 'translateY(0)';
                } else {
                    // 其他卡片，隐藏内容
                    title.style.opacity = '0';
                    title.style.transform = 'translateY(20px)';
                    description.style.opacity = '0';
                    description.style.transform = 'translateY(20px)';
                }
            });
        }

        // 初始化卡片状态
        rotateCards();

        // 设置自动切换定时器
        let autoRotateInterval = setInterval(rotateCards, 3000);

        cards.forEach((card, index) => {
            card.addEventListener('mouseenter', () => {
                clearInterval(autoRotateInterval);  // 鼠标悬停时暂停自动切换
                
                // 当前卡片上移并放大，显示内容
                card.style.transform = 'translateY(-20px) scale(1.05)';
                card.style.zIndex = '5';
                
                const content = card.querySelector('.card-stack-content');
                const title = content.querySelector('h3');
                const description = content.querySelector('p');
                title.style.opacity = '1';
                title.style.transform = 'translateY(0)';
                description.style.opacity = '1';
                description.style.transform = 'translateY(0)';

                // 其他卡片向下移动并隐藏内容
                cards.forEach((otherCard, otherIndex) => {
                    if (otherIndex !== index) {
                        const offset = otherIndex > index ? 
                            (otherIndex + 1) * 40 : 
                            otherIndex * 40;
                        const scale = 1 - (otherIndex * 0.05);
                        otherCard.style.transform = `translateY(${offset}px) scale(${scale})`;
                        otherCard.style.zIndex = otherIndex.toString();
                        
                        const otherContent = otherCard.querySelector('.card-stack-content');
                        const otherTitle = otherContent.querySelector('h3');
                        const otherDescription = otherContent.querySelector('p');
                        otherTitle.style.opacity = '0';
                        otherTitle.style.transform = 'translateY(20px)';
                        otherDescription.style.opacity = '0';
                        otherDescription.style.transform = 'translateY(20px)';
                    }
                });
            });

            card.addEventListener('mouseleave', () => {
                // 恢复自动切换
                clearInterval(autoRotateInterval);  // 清除之前的定时器
                autoRotateInterval = setInterval(rotateCards, 3000);
                
                // 恢复所有卡片的原始位置和内容状态
                rotateCards();
            });
        });
    }

    // 标记当前日期
    function markCurrentDate() {
        const now = new Date();
        const currentDate = now.getDate();
        const currentMonth = now.getMonth() + 1; // JavaScript 月份从 0 开始
        const currentYear = now.getFullYear();

        // 获取日历中显示的月份和年份
        const calendarHeader = document.querySelector('.calendar-header');
        if (!calendarHeader) return; // 如果没有日历头部，直接返回
        
        const calendarMonthElement = calendarHeader.querySelector('.month');
        const calendarYearElement = calendarHeader.querySelector('.year');
        
        if (!calendarMonthElement || !calendarYearElement) return; // 如果没有月份或年份元素，直接返回
        
        const calendarMonth = calendarMonthElement.textContent;
        const calendarYear = parseInt(calendarYearElement.textContent);

        // 将中文月份转换为数字
        const monthMap = {
            '一月': 1, '二月': 2, '三月': 3, '四月': 4,
            '五月': 5, '六月': 6, '七月': 7, '八月': 8,
            '九月': 9, '十月': 10, '十一月': 11, '十二月': 12
        };
        const displayedMonth = monthMap[calendarMonth];

        // 如果当前显示的是当前月份和年份，则标记当前日期
        if (displayedMonth === currentMonth && calendarYear === currentYear) {
            const dateElements = document.querySelectorAll('.calendar-date');
            dateElements.forEach(element => {
                if (element.textContent === currentDate.toString()) {
                    element.classList.add('current');
                }
            });
        }
    }

    // 页面加载时标记当前日期
    document.addEventListener('DOMContentLoaded', markCurrentDate);

    // 点击非对话框区域关闭对话框
    document.addEventListener('click', (event) => {
        const chatDialogContent = document.querySelector('.chat-dialog-content');
        if (chatDialog && chatDialogContent && chatButton &&
            chatDialog.style.display === 'block' && 
            !chatDialogContent.contains(event.target) && 
            !chatButton.contains(event.target)) {
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
});