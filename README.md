# Steam 批量拉黑用户 (Tampermonkey 脚本)

## 功能简介

该脚本可在 Steam 用户页面添加一个按钮，一键批量拉黑该用户的所有好友。
主要特点：

* 一键批量拉黑好友，操作进度实时显示。
* 可中途取消操作。
* 自动处理请求重试与超时。
* UI 界面简洁，支持进度显示与预计剩余时间（没什么屌用）。

⚠️ **注意**：此操作不可逆，拉黑用户后需要自己拉回来。

---

## 安装方法

1.未安装 Tampermonkey 则安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展  
2.已安装 Tampermonkey 则[点击](https://raw.githubusercontent.com/bliey/steam-block-friends/main/steam-block-friends.user.js) 安装脚本

---

## 使用说明

1. 打开目标用户的 Steam 个人资料页（`/profiles/SteamID` 或 `/id/CustomURL`）。
2. 点击页面右上角的 **按钮**。
3. 系统会提示确认操作，点击确认即可开始批量拉黑。
4. 操作过程中，按钮显示当前进度和预计剩余时间。
5. 若想中途停止操作，可再次点击按钮并确认取消。

---

## 注意事项

* 脚本需要登录 Steam 才能正常工作。

---

## 免责声明

本脚本仅供学习与研究使用，使用过程中万一导致账号限制或其他风险，我不承担任何责任。请谨慎操作。


