# ShopNova 电商系统

ShopNova 是一套基于 React、TypeScript、Vite 和 Supabase 的电商系统源码，包含前台商城、后台管理、数据库迁移、Supabase Edge Functions、开发测试支付，以及 Stripe / PayPal 真实支付接入基础。

## 功能范围

- 前台商城：主页、分类、商品列表、商品详情、购物车、结算、订单成功、账户中心、登录、注册、Google 登录。
- 后台管理：仪表盘、订单、商品、分类、标签、图片、内容、翻译、站点配置、支付、客户、风险订单、数据分析、系统设置。
- 商品能力：图片、SKU、价格、库存、参数、标签、评论、SEO、上下架和软删除。
- 支付能力：保留开发测试支付；Stripe / PayPal 通过 Supabase Edge Functions 创建真实支付会话。
- 后台服务：客户管理、支付配置、支付密钥、风险订单、数据分析、系统设置等关键后台操作已逐步迁移到 Edge Functions。
- 多语言和内容：支持前台内容编辑、多语言文本维护、JSON 导入导出和 AI 翻译。
- 部署：前端支持 Docker + Nginx 部署，Supabase 数据库和 Edge Functions 单独部署。

## 文档

本项目只保留 3 份主要文档：

- [README.md](README.md)：项目总览。
- [docs/USAGE.md](docs/USAGE.md)：使用说明，给管理员和交付客户看。
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)：部署说明和上线检查清单。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` 至少需要：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

常用检查命令：

```bash
npm run typecheck
npm run lint
npm run build
```

## 默认测试账号

```text
管理员：  admin@test.com / 123456
普通用户：customer@test.com / 123456
```

正式交付或上线前必须修改默认密码。

## 生产提醒

开发测试支付可以保留用于测试，但不能当作真实支付。真实收款请配置 Stripe 或 PayPal，并完成支付成功、失败、取消、Webhook 回调、订单状态更新和支付流水状态更新测试。

支付密钥、Supabase Service Role Key、AI Key 等敏感配置不能写入前端源码，必须放在 Supabase Edge Function secrets 或后端加密存储中。
