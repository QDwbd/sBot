const TOKEN = ENV_BOT_TOKEN;
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;
const ADMIN_UID = ENV_ADMIN_UID;
const NOTIFY_INTERVAL = 12 * 3600 * 1000;
const notificationUrl = 'https://raw.githubusercontent.com/QDwbd/sBot/main/data/notification.txt';
const startMsgUrl = 'https://raw.githubusercontent.com/QDwbd/sBot/main/data/startMessage.md';
const enable_notification = true;
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
function forwardMessage(msg) {
  return requestTelegram('forwardMessage', makeReqBody(msg));
}
function deleteMessage(msg = {}) {
  return requestTelegram('deleteMessage', makeReqBody(msg));
}
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
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
  if ('message' in update) {
    await onMessage(update.message);
  }
}
async function onMessage(message) {
  if (message.text === '/start') {
    const userID = message.from.id;
    let username = message.from.first_name && message.from.last_name
      ? message.from.first_name + " " + message.from.last_name
      : message.from.first_name || "未知";
    let user = message.from.username;
    let startMsg;
    try {
      const response = await fetch(startMsgUrl);
      if (!response.ok) throw new Error('Failed to fetch start message');
      startMsg = await response.text();
    } catch (error) {
      console.error('Error fetching start message:', error);
      startMsg = 'An error occurred while fetching the start message.';
    }
    startMsg = startMsg.replace(/{{username}}/g, `\`` + username + `\``)
                       .replace(/{{user_id}}/g, `\`` + userID + `\``)
                       .replace(/{{user}}/g, user);
    let keyboard = {
      inline_keyboard: [
        [
          { text: 'AiMi的github', url: 'https://github.com/QDwbd' }
        ]
      ]
    };
    return sendMessage({
      chat_id: message.chat.id,
      text: startMsg,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
  if (message.text && /配置文件|AiMi配置/i.test(message.text)) {
    const linkText = `[AiMi配置](https://raw.githubusercontent.com/QDwbd/srule/refs/heads/main/s.conf)`;
    return sendMessage({
      chat_id: message.chat.id,
      text: linkText,
      parse_mode: 'Markdown',
    });
  }
  if (message.chat.id.toString() === ADMIN_UID) {
    if (!message?.reply_to_message?.chat) {
      return sendMessage({
        chat_id: ADMIN_UID,
        text: '拉黑 不拉黑 检测拉黑没有`/block`、`/unblock`、`/checkblock`'
      });
    }
    if (/^\/block$/.exec(message.text)) {
      return handleBlock(message);
    }
    if (/^\/unblock$/.exec(message.text)) {
      return handleUnBlock(message);
    }
    if (/^\/checkblock$/.exec(message.text)) {
      return checkBlock(message);
    }
    let guestChantId = await getGuestChatId(message);
    return copyMessage({
      chat_id: guestChantId,
      from_chat_id: message.chat.id,
      message_id: message.message_id,
    });
  }
  return handleGuestMessage(message);
}
async function getGuestChatId(message) {
  return await sBot.get('msg-map-' + message?.reply_to_message.message_id, { type: "json" });
}
async function handleGuestMessage(message) {
  let chatId = message.chat.id;
  let isBlocked = await sBot.get('isblocked-' + chatId, { type: "json" });
  if (isBlocked) {
    return sendMessage({
      chat_id: chatId,
      text: 'You are blocked',
    });
  }
  const sentMessage = await sendMessage({
    chat_id: chatId,
    text: '稍等一下-主人看到会回复你',
  });
  setTimeout(async () => {
    await deleteMessage({
      chat_id: chatId,
      message_id: sentMessage.result.message_id,
    });
  }, 360);
  let forwardReq = await forwardMessage({
    chat_id: ADMIN_UID,
    from_chat_id: message.chat.id,
    message_id: message.message_id,
  });
  if (forwardReq.ok) {
    await sBot.put('msg-map-' + forwardReq.result.message_id, chatId);
  }
  return handleNotify(message);
}
async function handleNotify(message) {
  if (enable_notification) {
    let lastMsgTime = await sBot.get('lastmsg-' + message.chat.id, { type: "json" });
    if (!lastMsgTime || Date.now() - lastMsgTime > NOTIFY_INTERVAL) {
      await sBot.put('lastmsg-' + message.chat.id, Date.now());
      return sendMessage({
        chat_id: ADMIN_UID,
        text: await fetch(notificationUrl).then(r => r.text())
      });
    }
  }
}
async function handleBlock(message) {
  let guestChantId = await getGuestChatId(message);
  if (guestChantId === ADMIN_UID) {
    return sendMessage({
      chat_id: ADMIN_UID,
      text: '不能屏蔽自己'
    });
  }
  await sBot.put('isblocked-' + guestChantId, true);
  return sendMessage({
    chat_id: ADMIN_UID,
    text: `UID:${guestChantId}屏蔽成功`,
  });
}
async function handleUnBlock(message) {
  let guestChantId = await getGuestChatId(message);
  await sBot.put('isblocked-' + guestChantId, false);
  return sendMessage({
    chat_id: ADMIN_UID,
    text: `UID:${guestChantId}解除屏蔽成功`,
  });
}
async function checkBlock(message) {
  let guestChantId = await getGuestChatId(message);
  let blocked = await sBot.get('isblocked-' + guestChantId, { type: "json" });
  return sendMessage({
    chat_id: ADMIN_UID,
    text: `UID:${guestChantId}` + (blocked ? '被屏蔽' : '没有被屏蔽')
  });
}
async function registerWebhook(event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}
async function unRegisterWebhook(event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}
