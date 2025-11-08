一个基于cloudflare worker的telegram 消息转发bot
## 特点
- 基于cloudflare worker搭建，能够实现以下效果
    - 搭建成本低，一个js文件即可完成搭建
    - 不需要额外的域名，利用worker自带域名即可
    - 基于worker kv实现永久数据储存
    - 稳定，全球cdn转发

## 搭建方法
1. 从[@BotFather](https://t.me/BotFather)获取token，并且可以发送`/setjoingroups`来禁止此Bot被添加到群组
2. 从[uuidgenerator](https://www.uuidgenerator.net/)获取一个随机uuid作为secret
3. 从[@username_to_id_bot](https://t.me/username_to_id_bot)获取你的用户id
4. 创建一个群组并改为话题模式.从[@nmnmfunbot](https://t.me/nmnmfunbot)自己获取自己群id
5. 登录[cloudflare](https://workers.cloudflare.com/)，创建一个worker
6. 配置worker的变量
    - 增加一个`ENV_BOT_TOKEN`变量，数值为从步骤1中获得的token
    - 增加一个`ENV_BOT_SECRET`变量，数值为从步骤2中获得的secret
    - 增加一个`ENV_ADMIN_UID`变量，数值为从步骤3中获得的用户id
7. 绑定kv数据库，创建一个Namespace Name为`sBot`的kv数据库，在setting -> variable中设置`KV Namespace Bindings`：sBot -> sBot
8. 点击`Quick Edit`，复制[这个文件](./worker.js)到编辑器中保存
9. 通过打开`https://xxx.workers.dev/registerWebhook`来注册websoket
```
registerWebhook
```

## 使用方法
- 当其他用户给bot发消息，会被转发到bot创建者
- 用户回复普通文字给转发的消息时，会回复到原消息发送者
- 用户回复`/block`, `/unblock`, `/checkblock`等命令会执行相关指令，******不会******回复到原消息发送者


## 下面是另一个机器人部署方法-和上面不太相关----------------------------------------------------------------------------------------------------------------------


## 新机器人（群组话题单对单）
Telegram Bot 使用教程
这是一个基于 Telegram Bot API 的消息转发机器人，实现了用户私聊消息转发到群组话题，并支持管理员回复私聊。

功能简介
支持 /start 命令，回复欢迎消息

私聊用户发送消息，自动转发到指定群组的讨论话题

管理员在话题发或回复消息，机器人将私聊发消息给用户

支持关键词回复，如“配置文件”或“aimi配置”

自动创建群组讨论话题管理用户私聊

话题回复  ```/ban```  或者  ```/unban```  可封或解封用户

##  快速开始
1. 从[@BotFather](https://t.me/BotFather)获取token
2. 从[uuidgenerator](https://www.uuidgenerator.net/)获取一个随机uuid作为secret
3. 从[@username_to_id_bot](https://t.me/username_to_id_bot)获取你的用户id
4. 创建一个群并改为话题模式.从[@nmnmfunbot](https://t.me/nmnmfunbot)获取你的群id.管理员账号不能设为匿名管理！！！！！！
5. 登录[cloudflare](https://workers.cloudflare.com/)，创建一个worker
6. 配置worker的变量
    - 增加一个`ENV_BOT_TOKEN`变量，数值为获得的token
    - 增加一个`ENV_BOT_SECRET`变量，数值为获得的secret
    - 增加一个`ENV_ADMIN_UID`变量，数值为你的用户id
    - 增加一个`ENV_GROUP_CHAT_ID`变量，你的机器人会在此群组创建话题和转发消息，Telegram群组ID一般为负数
7. 在cf的worker绑定kv数据库，先创建一个Namespace Name为`sBot`的kv数据库，在worker的setting -> variable中设置`KV Namespace Bindings`：sBot -> sBot

##  管理员账号不能设为匿名管理！！！！！！

##  部署机器人

将项目部署到支持 fetch 事件监听的环境，如 Cloudflare Workers。复制[这个文件](./newbot.js)到编辑器中

设置 Webhook 地址，例如 https://your.domain.com/endpoint，并确保 Telegram Bot API 使用你的 ENV_BOT_SECRET 作为 secret_token。

示例设置 Webhook：
```
https://api.telegram.org/bot<你的BOT_TOKEN>/setWebhook?url=https://your.domain.com/endpoint&secret_token=<你的BOT_SECRET>
```

##  运行效果
用户私聊机器人发送消息，机器人自动转发到群组对应的话题

管理员在话题回复或发消息，机器人会转发给私聊对应用户
