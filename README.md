# Compound RSVP

WeChat 报名系统，Cloudflare Pages + Pages Functions + D1，全部跑在免费额度内。交付物是一个网址，扫码即填、无需注册。同一个项目里跑两代独立的报名流程：

- **vol.1**（2026-06，已上线）— 「未來人計劃」，muShanghai × Compound 联名，含采血时段预约（`bookings`/`slots`）。前端 `public/index.html`。
- **vol.2**（2026-07-11）— 「未來人 Day 0」，Compound 独立品牌，蓝色视觉系统，WeChat 优先、推荐码解锁定价，两版设计待选。**这是当前活动，也是本仓库最新一轮工作的重点。**

两代流程数据库完全独立（vol.2 用 `registrations_v2` 表），互不影响，可以放心改 vol.2 而不会碰坏 vol.1 的历史数据。

## vol.2 现状：两版设计，待选一版上线

- `public/index-a-editorial.html` — **Editorial Duotone**：摄影主导、大幅海报感、克制留白，更接近印刷邀请函的气质。
- `public/index-b-console.html` — **Data Console / Dossier**：结构化面板、台账式价格对比表、reticle 取景框做成了真实的输入框聚焦动画，更「精密仪器」感。

两版共用同一套蓝色品牌色板（见 `docs/poster/assets/palette.css`）、字体系统、后端接口。设计预览见 `design/concepts/`，两版桌面端与移动端截图见 `qa/`。

**选一版上线的步骤：**
1. 本地跑起来对比：见下方「本地开发」。
2. 选定后，把选中的文件另存/改名为 `public/index.html`（或保留旧的 vol.1 `index.html`，把 vol.2 放在自定义域名/子路径下分开分发——自行决定）。
3. 按下面「上线前必做」清单处理推荐码和收款二维码。
4. 部署。

完整字段说明、接口契约、上线清单、日常运维命令，都在 **[`部署指南.md`](./部署指南.md)** 里——这是最权威的操作文档，请优先看那份，这份 README 只是导览。

## 本地开发

```bash
npm install
npm run db:local      # 建本地 D1（含 vol.1 + vol.2 的表结构）
npm run dev            # http://127.0.0.1:8788
```

打开 `http://127.0.0.1:8788/index-a-editorial.html` 或 `.../index-b-console.html` 预览 vol.2 两版设计（真实接口、真实本地数据库，不是静态 mock）。

## 目录结构

```
functions/            Cloudflare Pages Functions（后端 API）
  _middleware.js       /admin 与 /api/admin/* 的 Basic Auth 网关
  _lib/pricing.js       vol.2 定价唯一真相来源（推荐码表、三级定价、席位/检测时段/运动偏好选项）
  api/register.js       vol.1 报名（含采血时段预约）
  api/register-v2.js    vol.2 报名（权威计价，服务端做最终校验）
  api/quote-v2.js        vol.2 实时估价（不下发完整推荐码表到浏览器）
  api/slots.js            vol.1 时段剩余席位查询
  api/admin/*             后台数据：JSON 列表 + CSV 导出（vol.1、vol.2 分开）
public/                静态前端
  index.html             vol.1 报名页（已上线）
  index-a-editorial.html  vol.2 设计稿 A
  index-b-console.html    vol.2 设计稿 B
  legal/                  服务协议 / 隐私政策 / 健康知情同意书（两代共用）
  assets/                  logo、海报图、微信收款二维码占位图
schema.sql             建表（幂等，可安全重跑）
migrations/             历史 ALTER 记录（给已存在的库追加字段用）
docs/                   本轮 vol.2 工作的参考资料（见下）
design/、qa/             vol.2 两版设计的效果图与验证截图
部署指南.md              唯一权威的部署与运维文档
```

## docs/ 里是什么

这些是策划这版活动、以及两版设计稿据以生成的原始参考资料，不是代码的一部分：

- `event-content-brief.md` — 活动方给的最终文案与表单字段清单（两版设计稿的内容依据）
- `pricing-strategy.md` — 三级定价策略的原始策划文档（邀请制 VIP / 同道带朋友 / 公开募集）
- `luma-event-page.md` — 活动最初的 Luma 页面文案（早期版本，供对照）
- `poster/` — 最终定稿海报（v8 蓝色肖像版）的可编辑 HTML 源文件、渲染脚本、字体/色板/logo 素材，方便以后换活动主题图时复用同一套视觉系统

## 上线前必做（详见部署指南.md）

1. `functions/_lib/pricing.js` 里的 `REFERRAL_CODES` 现在是占位示例（`VIP`、`FRIEND` 等），换成真实推荐码。
2. `public/assets/wechat-qr-placeholder.svg` 现在是程序生成的占位图（长得像二维码但扫不出东西），换成真实收款/企业微信二维码。
3. 选定一版设计，改名为 `public/index.html`。
4. `npm run db:remote` 建生产库表 → `npx wrangler pages deploy`。

## 关于这个仓库

内容涉及活动定价策略与产品结构，仓库设为公开是团队内部决定。真实密钥（后台密码等）通过 `.gitignore` 排除，从未进入过版本历史；示例推荐码本身也只是占位符，不是真实业务密钥。
