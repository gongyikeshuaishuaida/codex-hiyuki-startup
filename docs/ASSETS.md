# 素材与版本

当前运行视觉配置：`assets/config.js` 中的 `version: 13`，13.5 秒。

| 文件 | 用途 | 来源 / 处理 |
| --- | --- | --- |
| `hiyuki-native-hd-poster.png` | 默认高清定格 | 官方视频同一连续镜头的原帧，1920×1080 |
| `hiyuki-native-hd-motion.mp4` | 连续挥刀及后续 | 官方镜头 77.4–81.8 秒，133 个原生帧、30fps、无音轨 |
| `artwork.jpg` | 应用内静态背景 | 同一高清原帧的 JPEG |
| `avatar.jpg` | 默认头像 | 绯雪主题头像 |
| `hiyuki-line-plate.png`、`contours.js` | 角色描线 | 根据同一姿态制作的风格化光构及路径；含 AI 辅助处理 |
| `ice-crystal-v5.png` | 透明六角冰晶 | AI 辅助制作的冰晶图形，配合 Canvas 雪花动画 |
| `icons/` | 启动、设置入口图标 | 项目主题入口图标，不是官方应用安装包 |

原生高清片段来源：鸣潮官方 **Wuthering Waves Story Cinematics | Destination Mirrored in Snow**，
[官方视频页面](https://www.youtube.com/watch?v=gA22Rqj9NJg)。
从 2560×1440 原片的中心区域 `[320,180,2240,1260]` 取 1920×1080 连续画面。
起始定格与首帧动作一致，不以重新绘制的脸型替代彩色原帧。

角色资料参考：鸣潮官方[共鸣者档案前瞻·绯雪](https://www.bilibili.com/opus/1184303232912982024)。
右侧默认中文文案为当前主题演示内容，可在设置中修改主要台词。

仓库不包含整段官方原视频、用户下载的第三方视频、浏览器 Cookie、用户文件路径、抖音配乐或制作过程聊天录屏。
