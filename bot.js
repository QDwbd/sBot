const TOKEN = ENV_BOT_TOKEN; // 获取环境变量中的 Telegram 机器人 Token，用于认证和调用 Telegram API
const WEBHOOK = '/endpoint'; // 定义 Webhook 的路径，当 Telegram 服务器发送消息时会访问该路径
const SECRET = ENV_BOT_SECRET; // 获取环境变量中的 Secret Token，用于验证 Webhook 请求是否来自 Telegram
const ADMIN_UID = ENV_ADMIN_UID; // 获取管理员用户的唯一 ID，用于识别管理员
const NOTIFY_INTERVAL = 12 * 3600 * 1000; // 设置通知的时间间隔为 12 小时，单位是毫秒
const notificationUrl = 'https://raw.githubusercontent.com/QDwbd/sBot/main/data/notification.txt'; // 通知消息的 URL
const startMsgUrl = 'https://raw.githubusercontent.com/QDwbd/sBot/main/data/startMessage.md'; // 启动消息的 URL
const enable_notification = true; // 设置是否启用通知功能，true 为启用
function apiUrl(methodName, params = null) { // 构造请求 Telegram API 的 URL
  let query = ''; // 初始化查询字符串为空
  if (params) { // 如果有传递参数
    query = '?' + new URLSearchParams(params).toString(); // 将对象转换为查询字符串
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`; // 构造完整的 API 请求 URL
}
function requestTelegram(methodName, body, params = null) { // 向 Telegram API 发送请求
  return fetch(apiUrl(methodName, params), body) // 调用 apiUrl 函数，构建请求 URL
    .then(r => r.json()); // 返回 JSON 格式的响应
}
function makeReqBody(body) { // 创建请求的请求体
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }; // 设置请求方法和请求头，并将 body 转为 JSON 字符串
}
function sendMessage(msg = {}) { // 发送消息
  return requestTelegram('sendMessage', makeReqBody(msg)); // 调用 requestTelegram 函数发送 'sendMessage' 请求
}
function copyMessage(msg = {}) { // 复制消息
  return requestTelegram('copyMessage', makeReqBody(msg)); // 调用 requestTelegram 函数发送 'copyMessage' 请求
}
function forwardMessage(msg) { // 转发消息
  return requestTelegram('forwardMessage', makeReqBody(msg)); // 调用 requestTelegram 函数发送 'forwardMessage' 请求
}
function deleteMessage(msg = {}) { // 删除消息
  return requestTelegram('deleteMessage', makeReqBody(msg)); // 调用 requestTelegram 函数发送 'deleteMessage' 请求
}
addEventListener('fetch', event => { // 监听 fetch 事件
  const url = new URL(event.request.url); // 创建 URL 对象
  if (url.pathname === WEBHOOK) { // 如果路径是 /endpoint
    event.respondWith(handleWebhook(event)); // 处理 webhook 请求
  } else if (url.pathname === '/registerWebhook') { // 如果路径是注册 Webhook
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET)); // 注册 Webhook
  } else if (url.pathname === '/unRegisterWebhook') { // 如果路径是取消注册 Webhook
    event.respondWith(unRegisterWebhook(event)); // 取消注册 Webhook
  } else {
    event.respondWith(new Response('No handler for this request')); // 返回默认响应
  }
});
async function handleWebhook(event) { // 处理 Webhook 请求
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) { // 验证请求中的 Secret Token
    return new Response('Unauthorized', { status: 403 }); // 如果 Secret Token 不匹配，返回 403 Unauthorized 错误
  }
  const update = await event.request.json(); // 解析 Webhook 请求中的 JSON 数据
  event.waitUntil(onUpdate(update)); // 异步处理更新数据
  return new Response('Ok'); // 返回 'Ok' 响应
}
async function onUpdate(update) { // 处理更新的数据
  if ('message' in update) { // 如果 update 中有 message 字段
    await onMessage(update.message); // 调用 onMessage 函数处理消息
  }
}
async function onMessage(message) { // 处理消息
  if (message.text === '/start') { // 如果消息文本是 /start
    const userId = message.from.id; // 获取用户 ID
    let username = message.from.first_name && message.from.last_name
      ? message.from.first_name + " " + message.from.last_name // 获取用户的姓名
      : message.from.first_name || "未知"; // 如果没有姓氏，默认值为“未知”
    let user = message.from.username; // 获取用户的 Telegram 用户名
    let startMsg; // 定义启动消息变量
    try {
      const response = await fetch(startMsgUrl); // 尝试从 startMsgUrl 获取启动消息
      if (!response.ok) throw new Error('Failed to fetch start message'); // 如果响应失败，抛出错误
      startMsg = await response.text(); // 获取启动消息内容
    } catch (error) { // 如果获取启动消息失败
      console.error('Error fetching start message:', error); // 打印错误日志
      startMsg = 'An error occurred while fetching the start message.'; // 设置默认错误消息
    }
    startMsg = startMsg.replace(/{{username}}/g, `\`` + username + `\``) // 替换启动消息中的 {{username}} 占位符
                       .replace(/{{user_id}}/g, `\`` + userId + `\``) // 替换 {{user_id}} 占位符
                       .replace(/{{user}}/g, user); // 替换 {{user}} 占位符
    let keyboard = { // 设置按钮键盘
      inline_keyboard: [
        [
          { text: 'AiMi的github', url: 'https://github.com/QDwbd' } // 设置按钮文本和链接
        ]
      ]
    };
    return sendMessage({ // 发送启动消息
      chat_id: message.chat.id, // 设置聊天 ID
      text: startMsg, // 启动消息内容
      parse_mode: 'Markdown', // 设置消息解析模式为 Markdown
      reply_markup: keyboard, // 设置按钮键盘
    });
  }
  if (message.text && /配置文件|配置/i.test(message.text)) { // 如果消息中包含“配置文件”或“配置”
    const linkText = `[AiMi配置](https://raw.githubusercontent.com/QDwbd/srule/refs/heads/main/s.conf)`; // 配置文件链接
    return sendMessage({ // 发送配置文件链接
      chat_id: message.chat.id, // 设置聊天 ID
      text: linkText, // 配置文件链接文本
      parse_mode: 'Markdown', // 设置解析模式为 Markdown
    });
  }
  if (message.chat.id.toString() === ADMIN_UID) { // 如果消息来自管理员
    if (!message?.reply_to_message?.chat) { // 如果没有回复的消息
      return sendMessage({
        chat_id: ADMIN_UID, // 发送给管理员
        text: '拉黑 不拉黑 检测拉黑没有`/block`、`/unblock`、`/checkblock`' // 提示消息
      });
    }
    if (/^\/block$/.exec(message.text)) { // 如果消息是 /block
      return handleBlock(message); // 处理屏蔽
    }
    if (/^\/unblock$/.exec(message.text)) { // 如果消息是 /unblock
      return handleUnBlock(message); // 处理解除屏蔽
    }
    if (/^\/checkblock$/.exec(message.text)) { // 如果消息是 /checkblock
      return checkBlock(message); // 检查屏蔽状态
    }
    let guestChantId = await getGuestChatId(message); // 获取访客聊天 ID
    return copyMessage({
      chat_id: guestChantId, // 设置目标聊天 ID
      from_chat_id: message.chat.id, // 设置源聊天 ID
      message_id: message.message_id, // 设置消息 ID
    }); // 复制消息
  }
  return handleGuestMessage(message); // 处理访客消息
}
async function getGuestChatId(message) { // 获取访客聊天 ID
  return await sBot.get('msg-map-' + message?.reply_to_message.message_id, { type: "json" }); // 从存储中获取访客聊天 ID
}
async function handleGuestMessage(message) { // 处理访客消息
  let chatId = message.chat.id; // 获取聊天 ID
  let isBlocked = await sBot.get('isblocked-' + chatId, { type: "json" }); // 检查是否被屏蔽
  if (isBlocked) { // 如果被屏蔽
    return sendMessage({
      chat_id: chatId, // 发送给访客
      text: 'You are blocked', // 屏蔽提示消息
    });
  }
  const sentMessage = await sendMessage({
    chat_id: chatId, // 发送给访客
    text: '稍等一下-主人看到会回复你', // 提示访客稍等
  });
  setTimeout(async () => { // 设置延时删除消息
    await deleteMessage({
      chat_id: chatId, // 删除访客消息
      message_id: sentMessage.result.message_id, // 删除消息的 ID
    });
  }, 360);
  let forwardReq = await forwardMessage({ // 转发消息给管理员
    chat_id: ADMIN_UID, // 目标聊天 ID（管理员）
    from_chat_id: message.chat.id, // 源聊天 ID
    message_id: message.message_id, // 消息 ID
  });
  if (forwardReq.ok) { // 如果转发成功
    await sBot.put('msg-map-' + forwardReq.result.message_id, chatId); // 保存消息映射
  }
  return handleNotify(message); // 处理通知
}
async function handleNotify(message) { // 处理通知
  if (enable_notification) { // 如果启用通知
    let lastMsgTime = await sBot.get('lastmsg-' + message.chat.id, { type: "json" }); // 获取上次通知时间
    if (!lastMsgTime || Date.now() - lastMsgTime > NOTIFY_INTERVAL) { // 如果超过通知间隔时间
      await sBot.put('lastmsg-' + message.chat.id, Date.now()); // 更新通知时间
      return sendMessage({
        chat_id: ADMIN_UID, // 发送给管理员
        text: await fetch(notificationUrl).then(r => r.text()) // 获取通知内容并发送
      });
    }
  }
}
async function handleBlock(message) { // 处理屏蔽用户
  let guestChantId = await getGuestChatId(message); // 获取访客聊天 ID
  if (guestChantId === ADMIN_UID) { // 如果试图屏蔽管理员
    return sendMessage({
      chat_id: ADMIN_UID, // 发送给管理员
      text: '不能屏蔽自己' // 提示不能屏蔽自己
    });
  }
  await sBot.put('isblocked-' + guestChantId, true); // 标记为屏蔽
  return sendMessage({
    chat_id: ADMIN_UID, // 发送给管理员
    text: `UID:${guestChantId}屏蔽成功`, // 返回屏蔽成功消息
  });
}
async function handleUnBlock(message) { // 解除屏蔽用户
  let guestChantId = await getGuestChatId(message); // 获取访客聊天 ID
  await sBot.put('isblocked-' + guestChantId, false); // 标记为解除屏蔽
  return sendMessage({
    chat_id: ADMIN_UID, // 发送给管理员
    text: `UID:${guestChantId}解除屏蔽成功`, // 返回解除屏蔽成功消息
  });
}
async function checkBlock(message) { // 检查用户是否被屏蔽
  let guestChantId = await getGuestChatId(message); // 获取访客聊天 ID
  let blocked = await sBot.get('isblocked-' + guestChantId, { type: "json" }); // 获取是否屏蔽状态
  return sendMessage({
    chat_id: ADMIN_UID, // 发送给管理员
    text: `UID:${guestChantId}` + (blocked ? '被屏蔽' : '没有被屏蔽') // 返回屏蔽状态
  });
}
async function registerWebhook(event, requestUrl, suffix, secret) { // 注册 webhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`; // 构建完整的 webhook URL
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json(); // 注册 webhook
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2)); // 返回成功或失败响应
}
async function unRegisterWebhook(event) { // 取消注册 webhook
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json(); // 取消 webhook
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2)); // 返回成功或失败响应
}
