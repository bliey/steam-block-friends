# Steam Bulk Block Users / Steam 批量拉黑用户 (Tampermonkey Script)

## Features / 功能简介

This script adds a button on Steam user pages to **bulk block all friends of that user** with one click.
该脚本可在 Steam 用户页面添加一个按钮，一键批量拉黑该用户的所有好友。

**Main features / 主要特点：**

* One-click bulk blocking with real-time progress display.
  一键批量拉黑好友，操作进度实时显示。
* Can cancel the operation midway.
  可中途取消操作。
* Automatically handles request retries and timeouts.
  自动处理请求重试与超时。
* Clean UI with progress display and estimated remaining time (mostly fancy).
  UI 界面简洁，支持进度显示和预计剩余时间（没什么卵用）。

⚠️ **Note / 注意**: This operation is irreversible. Once a user is blocked, you need to unblock them manually.
⚠️ **注意**：此操作不可逆，拉黑用户后需要自己手动拉回来。

---

## Installation / 安装方法

| Language     | Install / 安装                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| 🇺🇸 English | [Click here](https://raw.githubusercontent.com/bliey/steam-block-friends/main/steam-block-friends.user.js) |
| 🇨🇳 中文      | [点击这里](https://raw.githubusercontent.com/bliey/steam-block-friends/main/steam-block-friends.user.js)       |

**Instructions / 使用说明：**

1. Open the target user’s Steam profile page (`/profiles/SteamID` or `/id/CustomURL`).
   打开目标用户的 Steam 个人资料页（`/profiles/SteamID` 或 `/id/CustomURL`）。
2. Click the **button** in the top-right corner of the page.
   点击页面右上角的 **按钮**。
3. Confirm the operation when prompted to start bulk blocking.
   系统会提示确认操作，点击确认即可开始批量拉黑。
4. During the operation, the button will display progress and estimated remaining time.
   操作过程中，按钮显示当前进度和预计剩余时间。
5. To stop midway, click the button again and confirm cancellation.
   若想中途停止操作，可再次点击按钮并确认取消。

---

## Notes / 注意事项

* The script requires you to be logged into Steam to work properly.
  脚本需要登录 Steam 才能正常工作。

---

## Disclaimer / 免责声明

This script is for learning and research purposes only. I am **not responsible** for any account restrictions or other risks that may occur during use. Use it with caution.
本脚本仅供学习与研究使用，使用过程中万一导致账号限制或其他风险，我不承担任何责任。请谨慎操作。
