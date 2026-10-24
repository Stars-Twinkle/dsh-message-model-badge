# dsh-message-model-badge

在 **DSH（DeepSeek Harness）** 的每条回复下方显示生成它的模型与推理等级，例如 `DeepSeek-V4.1-Flash · Max`。

## 功能

- 注册到 `conversation.chat.turnTail`，每个回合渲染一次，因此历史消息也会带上标签；
- 读取当前会话的模型目录（与输入框模型选择器同源），切换模型 / 档位后即时变化；
- 右对齐、11px 弱化色，贴在操作行上方，不抢正文；
- 鼠标事件穿透，不阻挡任何操作；
- 中英文双语。

## 安装

在 DSH 的「插件管理」里添加本地 bundle，选择本目录；或使用 `plugin_manager` 的 `install_bundle`。

安装后刷新页面生效。

## 兼容性

- DSH 0.2.x（Web 端）
- 只读 `modelDirectories`，不修改任何状态

## 许可

MIT
