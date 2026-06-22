# ShopNova 部署说明

本文档说明如何部署 Supabase、Edge Functions 和 Docker 前端服务，并包含上线检查清单。

## 1. 环境变量

复制模板：

```bash
cp .env.example .env
```

前端构建和 Docker 需要：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_PORT=8080
```

Supabase 部署和 Edge Function secrets 需要：

```env
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_SITE_URL=https://your-shop-domain.com
PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project-ref.supabase.co/functions/v1
PAYMENT_SECRETS_KEY=replace_with_a_long_random_value
AI_TRANSLATION_API_KEY=
AI_TRANSLATION_ENDPOINT=https://api.openai.com/v1/chat/completions
AI_TRANSLATION_MODEL=gpt-4o-mini
```

可选支付 fallback secrets：

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_SECRET=
```

规则：

- `.env` 只放部署机器，不提交到仓库。
- `VITE_*` 是前端公开变量，会进入浏览器。
- `SUPABASE_SERVICE_ROLE_KEY`、支付密钥、`PAYMENT_SECRETS_KEY`、`AI_TRANSLATION_API_KEY` 只能放后端或 Edge Function secrets。
- Google Web Client ID、PayPal Client ID 这类公开配置可以放后台配置页。

## 2. Supabase 数据库迁移

安装并登录 Supabase CLI：

```bash
supabase login
supabase link --project-ref your-project-ref
```

推送迁移：

```bash
supabase db push
```

项目迁移包含用户、客户、商品、分类、标签、SKU、图片、评论、订单、支付、媒体、内容、翻译、站点配置、风险订单、支付设置、支付密钥、Google 登录和后台会话相关表结构。

## 3. Edge Function Secrets

设置必需 secrets：

```bash
supabase secrets set \
  SUPABASE_URL=https://your-project-ref.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  PUBLIC_SITE_URL=https://your-shop-domain.com \
  PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project-ref.supabase.co/functions/v1 \
  PAYMENT_SECRETS_KEY=replace_with_a_long_random_value \
  AI_TRANSLATION_API_KEY=your_ai_api_key \
  AI_TRANSLATION_ENDPOINT=https://api.openai.com/v1/chat/completions \
  AI_TRANSLATION_MODEL=gpt-4o-mini
```

如果不用后台支付密钥面板保存真实支付密钥，可以再设置：

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_or_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  PAYPAL_CLIENT_SECRET=paypal_secret_xxx
```

## 4. Edge Functions 部署

部署全部函数：

```bash
supabase functions deploy custom-auth
supabase functions deploy google-login
supabase functions deploy ai-translate

supabase functions deploy payment-admin
supabase functions deploy payment-secrets
supabase functions deploy create-payment-session
supabase functions deploy stripe-webhook
supabase functions deploy paypal-webhook
supabase functions deploy paypal-return

supabase functions deploy customer-admin
supabase functions deploy risk-admin
supabase functions deploy analytics-admin
supabase functions deploy settings-admin
```

## 5. Google 登录配置

Google Cloud Console 创建 OAuth Client：

- Application type：`Web application`
- Authorized JavaScript origins：
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - `https://your-shop-domain.com`

后台配置：

1. 打开 `系统设置`。
2. 进入 `第三方登录`。
3. 开启 Google 登录。
4. 保存 Google Web Client ID。
5. 可选填写 Workspace 域名限制。
6. 保持自动创建客户账号开启。

## 6. Stripe 和 PayPal

后台进入 `支付管理`：

- 启用 Stripe 或 PayPal。
- 选择 test 或 live 环境。
- 保存公开配置，例如 PayPal Client ID、结算币种。
- 通过支付密钥面板保存 Secret Key、Webhook Secret、PayPal Client Secret。

Webhook 地址：

```text
Stripe: https://your-project-ref.supabase.co/functions/v1/stripe-webhook
PayPal: https://your-project-ref.supabase.co/functions/v1/paypal-webhook
PayPal return:
https://your-project-ref.supabase.co/functions/v1/paypal-return
```

## 7. Docker 部署前端

服务器安装 Docker 和 Docker Compose 插件后，上传或拉取项目：

```bash
git clone <your-repo-url> ShopNova
cd ShopNova
cp .env.example .env
```

编辑 `.env`，至少填写：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_PORT=8080
```

构建并启动：

```bash
docker compose build --no-cache
docker compose up -d
```

访问：

```text
http://server-ip:8080
```

查看状态和日志：

```bash
docker compose ps
docker compose logs -f shopnova-web
```

更新版本：

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

## 8. Vercel 部署前端

如果只是先做样品站、演示站，推荐先用 Vercel 部署前端。这样不用配置 VPS、Nginx、Docker 和 HTTPS。

### 8.1 导入 GitHub 仓库

1. 打开 Vercel。
2. 登录你的 GitHub 账号。
3. 点击 `Add New Project`。
4. 选择仓库：

```text
disowning/ShopNova
```

5. Framework Preset 选择：

```text
Vite
```

6. Build Command 使用默认：

```text
npm run build
```

7. Output Directory 使用默认：

```text
dist
```

### 8.2 填写 Vercel 环境变量

在 Vercel 项目的 `Settings` -> `Environment Variables` 里添加：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

这两个值在 Supabase 后台获取：

- `VITE_SUPABASE_URL`：Supabase Project URL。
- `VITE_SUPABASE_ANON_KEY`：Supabase anon / publishable key。

保存后点击部署。

### 8.3 部署后要回填 Supabase Secrets

Vercel 部署完成后，你会得到一个域名，例如：

```text
https://shopnova-demo.vercel.app
```

把这个域名写回 Supabase Edge Function secrets：

```bash
supabase secrets set PUBLIC_SITE_URL=https://shopnova-demo.vercel.app
```

如果真实支付需要跳转回站点，也要在 Stripe / PayPal 后台配置这个正式域名。

### 8.4 样品站最小检查

部署完成后检查：

- 首页能打开。
- 商品列表能加载。
- 登录页能打开。
- 后台管理员能登录。
- 开发测试支付能完成一笔订单。
- 支付管理、客户管理、风险订单、数据分析、系统设置页面能正常打开。

## 9. 域名和 HTTPS

Docker 容器内部使用 Nginx 监听 80，宿主机通过 `APP_PORT` 暴露。正式环境建议外层再加 Nginx、Caddy、Traefik 或云负载均衡做域名和 HTTPS。

外层 Nginx 示例：

```nginx
server {
  listen 80;
  server_name your-shop-domain.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

启用 HTTPS 后同步更新：

- `PUBLIC_SITE_URL`
- Google Authorized JavaScript origins
- Stripe / PayPal webhook 地址
- 支付平台 return / cancel URL

## 10. 上线检查清单

- `.env` 已填写正确 Supabase URL 和 anon key。
- `supabase db push` 已成功执行。
- 所有 Edge Functions 已部署。
- Edge Function secrets 已设置。
- 默认管理员和测试客户密码已修改。
- 开发测试支付明确标注，生产不用时已关闭。
- Stripe test mode 已完成成功、失败、取消、Webhook 回调测试。
- PayPal test mode 已完成成功、失败、取消、Webhook 回调测试。
- Google 登录已完成首次创建客户、同邮箱绑定、封禁用户拒绝登录测试。
- 后台订单、支付流水、客户统计、风险订单、数据分析均能正常读取。
- 域名和 HTTPS 已配置。
- Supabase RLS 和后台权限已复查。

## 11. 最短部署顺序

```bash
supabase db push

supabase secrets set ...

supabase functions deploy custom-auth
supabase functions deploy google-login
supabase functions deploy ai-translate
supabase functions deploy payment-admin
supabase functions deploy payment-secrets
supabase functions deploy create-payment-session
supabase functions deploy stripe-webhook
supabase functions deploy paypal-webhook
supabase functions deploy paypal-return
supabase functions deploy customer-admin
supabase functions deploy risk-admin
supabase functions deploy analytics-admin
supabase functions deploy settings-admin

docker compose build --no-cache
docker compose up -d
```
