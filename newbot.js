const TOKEN = ENV_BOT_TOKEN;
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;
const ADMIN_UID = Number(ENV_ADMIN_UID);
const GROUP_CHAT_ID = Number(ENV_GROUP_CHAT_ID);
const startMsgUrl = 'https://raw.githubusercontent.com/QDwbd/sBot/main/data/startMessage.md';
function apiUrl(methodName, params = null) {
  let query = '';
  if (params) {
    query = '?' + new URLSearchParams(params).toString();
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`;
}
function requestTelegram(methodName, body, params = null) {
  return fetch(apiUrl(methodName, params), body).then(r => r.json());
}
function makeReqBody(body) {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}
function sendMessage(msg = {}) {
  return requestTelegram('sendMessage', makeReqBody(msg));
}
function copyMessage(msg = {}) {
  return requestTelegram('copyMessage', makeReqBody(msg));
}
function forwardMessage(msg = {}) {
  return requestTelegram('forwardMessage', makeReqBody(msg));
}
function createForumTopic(chat_id, name) {
  return requestTelegram('createForumTopic', makeReqBody({ chat_id, name }));
}
function deleteMessage(msg = {}) {
  return requestTelegram('deleteMessage', makeReqBody(msg));
}
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else {
    event.respondWith(new Response('No handler for this request'));
  }
});
async function handleWebhook(event) {
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }
  const update = await event.request.json();
  event.waitUntil(onUpdate(update));
  return new Response('Ok');
}
async function onUpdate(update) {
  if (update.message) {
    await onMessage(update.message);
  }
}
async function onMessage(message) {
  const userId = message.from.id;
  if (
    message.chat.id === GROUP_CHAT_ID &&
    message.message_thread_id &&
    userId === ADMIN_UID &&
    message.text
  ) {
    const text = message.text.trim().toLowerCase();
    if (text === '/ban' || text === '/unban') {
      const topicId = message.message_thread_id;
      const targetUserId = await sBot.get(`topic-to-user-${topicId}`, { type: 'json' });
      if (!targetUserId) {
        await sendMessage({
          chat_id: GROUP_CHAT_ID,
          message_thread_id: topicId,
          text: '该话题没有绑定用户，无法执行操作。',
        });
        return;
      }
      if (text === '/ban') {
        await sBot.put(`blacklist-${targetUserId}`, true);
        await sendMessage({
          chat_id: GROUP_CHAT_ID,
          message_thread_id: topicId,
          text: `用户 ${targetUserId} 已被拉黑。`,
        });
      } else {
        await sBot.delete(`blacklist-${targetUserId}`);
        await sendMessage({
          chat_id: GROUP_CHAT_ID,
          message_thread_id: topicId,
          text: `用户 ${targetUserId} 已被解除拉黑。`,
        });
      }
      return;
    }
  }
  const isBlacklisted = await sBot.get(`blacklist-${userId}`, { type: 'json' });
  if (isBlacklisted) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '您已被拉黑，无法使用此机器人服务。',
    });
    return;
  }
  if (message.text === '/start') {
    return await handleStartCommand(message);
  }
  if (message.text && /配置文件|aimi配置/i.test(message.text)) {
    return sendMessage({
      chat_id: message.chat.id,
      text: `[AiMi配置](https://raw.githubusercontent.com/QDwbd/srule/refs/heads/main/s.conf)`,
      parse_mode: 'Markdown',
    });
  }
  if (message.chat.type === 'private') {
    await handlePrivateMessage(message);
  } else if (message.chat.id === GROUP_CHAT_ID) {
    if (message.from.id === ADMIN_UID && message.message_thread_id) {
      await handleAdminMessageInTopic(message);
    }
  }
}
async function handleStartCommand(message) {
  const userId = message.from.id;
  let username = (message.from.first_name && message.from.last_name)
    ? message.from.first_name + " " + message.from.last_name
    : message.from.first_name || "未知";
  let user = message.from.username || "";
  let startMsg;
  try {
    const response = await fetch(startMsgUrl);
    if (!response.ok) throw new Error('Failed to fetch start message');
    startMsg = await response.text();
  } catch (error) {
    console.error('Error fetching start message:', error);
    startMsg = 'An error occurred while fetching the start message.';
  }
  startMsg = startMsg.replace(/{{username}}/g, username)
                     .replace(/{{user_id}}/g, userId)
                     .replace(/{{user}}/g, user);
  try {
    let topicId = await sBot.get(`topic-for-${userId}`, { type: 'json' });
    if (!topicId || !(await isTopicValid(topicId))) {
      const createRes = await createForumTopic(GROUP_CHAT_ID, username);
      if (createRes.ok) {
        topicId = createRes.result.message_thread_id;
        await sBot.put(`topic-for-${userId}`, topicId);
        await sBot.put(`topic-to-user-${topicId}`, userId);
      } else {
        throw new Error('创建话题失败');
      }
    } else {
      await sBot.put(`topic-to-user-${topicId}`, userId);
    }
  } catch (err) {
    console.error('创建或验证话题失败:', err);
  }
  let keyboard = {
    inline_keyboard: [
      [{ text: 'AiMi的github', url: 'https://github.com/QDwbd' }]
    ]
  };
  return sendMessage({
    chat_id: message.chat.id,
    text: startMsg,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}
async function handlePrivateMessage(message) {
  const userId = message.from.id;
  try {
    let topicId = await sBot.get(`topic-for-${userId}`, { type: 'json' });
    if (!topicId) {
      await sendMessage({
        chat_id: userId,
        text: '您还未发送 /start ，请先发送该命令以创建会话话题。',
      });
      return;
    }
    await sBot.put(`topic-to-user-${topicId}`, userId);
    const forwardRes = await forwardMessage({
      chat_id: GROUP_CHAT_ID,
      message_thread_id: topicId,
      from_chat_id: userId,
      message_id: message.message_id,
    });
    if (forwardRes.ok) {
      await sBot.put(`msg-map-${forwardRes.result.message_id}`, userId);
    }
  } catch (err) {
    console.error('转发消息失败:', err);
    await sendMessage({ chat_id: userId, text: '机器人内部错误，稍后再试。' });
  }
}
async function isTopicValid(topicId) {
  try {
    const res = await requestTelegram('sendMessage', makeReqBody({
      chat_id: GROUP_CHAT_ID,
      message_thread_id: topicId,
      text: '.',
    }));
    if (res.ok) {
      await deleteMessage({ chat_id: GROUP_CHAT_ID, message_id: res.result.message_id });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
async function handleAdminMessageInTopic(message) {
  const topicId = message.message_thread_id;
  if (!topicId) return;
  const userId = await sBot.get(`topic-to-user-${topicId}`, { type: 'json' });
  if (!userId) return;
  await copyMessage({
    chat_id: userId,
    from_chat_id: GROUP_CHAT_ID,
    message_id: message.message_id,
  });
}
