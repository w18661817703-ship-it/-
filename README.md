# Emotion Purifier Shield

当前版本已经整理为适合中国大陆服务器部署的“单一 Node 服务”形态：

- 不再依赖 Vercel 作为正式线上方案
- 保持当前前端 UI 和交互方式不变
- 保持 DeepSeek 接入方式不变
- 保持 `POST /api/chat` 和 `GET /api/health`
- 使用 `npm run build` 构建前端
- 使用 `npm run start` 启动同一个 Node 服务，同时提供页面和 `/api/*`

## 当前部署架构

```text
Browser
   |
   v
 Nginx :80/:443
   |
   v
Node / Express :3001
   |- GET /api/health
   |- POST /api/chat
   |- dist/ 静态前端
```

项目结构：

```text
.
├─ server/
│  ├─ app.js
│  ├─ chat-service.js
│  ├─ daily-rate-limit.js
│  └─ index.js
├─ src/
├─ dist/
├─ ecosystem.config.cjs
├─ nginx.example.conf
├─ scripts/deploy-update.sh
├─ .env.example
├─ package.json
└─ vite.config.ts
```

## 环境变量

在项目根目录创建 `.env`：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
MODEL_NAME=deepseek-chat
PORT=3001
```

可选变量：

```bash
# 只有前后端分开域名部署时才需要
CLIENT_ORIGIN=https://your-frontend-domain.com

# 默认就是 0.0.0.0，不写也可以
HOST=0.0.0.0

# 本地开发时用于修改 Vite 代理目标
VITE_API_PROXY_TARGET=http://127.0.0.1:3001
```

说明：

- 正式线上推荐前后端同域部署，此时不要设置 `CLIENT_ORIGIN`
- `MODEL_NAME` 默认可以继续使用 `deepseek-chat`
- `DEEPSEEK_API_KEY` 保持现在的 DeepSeek 接入方式，不需要改 SDK 用法

## 本地开发

安装依赖：

```bash
npm install
```

复制环境变量模板：

```bash
cp .env.example .env
```

启动前端开发服务器：

```bash
npm run dev
```

启动本地 Node 服务：

```bash
npm run server
```

同时启动前后端：

```bash
npm run dev:all
```

本地开发时：

- 前端默认在 `http://localhost:3000`
- 后端默认在 `http://localhost:3001`
- 前端仍然通过 `/api/chat` 访问接口，由 Vite 代理转发

## 生产部署要求

正式线上只需要两条核心命令：

```bash
npm run build
npm run start
```

其中：

- `npm run build` 生成 `dist/`
- `npm run start` 启动 `server/index.js`
- 同一个 Node 进程负责页面静态资源和 `/api/*`

## 最简单的上线方案

推荐方案：

1. 一台中国大陆 Linux 云服务器
2. Ubuntu 22.04 或 24.04 LTS
3. Node.js 20 LTS
4. PM2 守护 Node 进程
5. Nginx 做 80/443 反向代理
6. 域名通过 A 记录指向服务器公网 IP

适用平台：

- 腾讯云轻量应用服务器
- 腾讯云 CVM
- 阿里云 ECS

为什么这样配：

- 结构最简单，只有一个 Node 服务
- 不改现有前端代码，不改 UI
- 不需要拆前后端，也不需要上容器编排
- 后续迁移到其他国内云主机也最容易

## 服务器部署步骤

以下步骤适合腾讯云轻量应用服务器和阿里云 ECS。

### 1. 准备服务器

建议最少：

- 2 vCPU
- 2 GB 内存
- 40 GB SSD
- Ubuntu 22.04/24.04

### 2. 放行端口

需要放行：

- `22` 用于 SSH
- `80` 用于 HTTP
- `443` 用于 HTTPS

不要对公网放行：

- `3001`

建议只让 Nginx 对外，Node 只监听本机或内网回环后的代理访问。

### 3. 安装运行环境

```bash
sudo apt update
sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

确认版本：

```bash
node -v
npm -v
pm2 -v
nginx -v
```

### 4. 上传项目并安装依赖

```bash
git clone <your-repo-url> app
cd app
npm ci
```

如果不是通过 Git，也可以直接上传整个项目目录后进入项目根目录执行：

```bash
npm ci
```

### 5. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填这三个值：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
MODEL_NAME=deepseek-chat
PORT=3001
```

如果你采用本文推荐的同域部署：

- 不要配置 `CLIENT_ORIGIN`

### 6. 构建项目

```bash
npm run build
```

### 7. 使用 PM2 启动

项目已经提供 `ecosystem.config.cjs`：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` 执行后，如果终端额外打印出一条需要 `sudo` 执行的命令，按提示再执行一次即可。

常用命令：

```bash
pm2 status
pm2 logs emotion-purifier-shield
pm2 restart emotion-purifier-shield
pm2 stop emotion-purifier-shield
```

如果你希望以后每次发版都只执行一个脚本，项目还提供了：

```bash
bash scripts/deploy-update.sh
```

这个脚本会自动执行：

- `npm ci`
- `npm run build`
- 首次启动 `pm2 start ecosystem.config.cjs`
- 或已有进程时执行 `pm2 reload ecosystem.config.cjs --update-env`
- 最后 `pm2 save`

### 8. 配置 Nginx

项目已经提供 `nginx.example.conf`，做法如下：

1. 把其中的 `server_name` 改成你的域名
2. 复制到 Nginx 配置目录
3. 重新加载 Nginx

示例命令：

```bash
sudo cp nginx.example.conf /etc/nginx/sites-available/emotion-purifier-shield.conf
sudo ln -sf /etc/nginx/sites-available/emotion-purifier-shield.conf /etc/nginx/sites-enabled/emotion-purifier-shield.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果你的系统默认不使用 `sites-available/sites-enabled`，也可以直接放到 `/etc/nginx/conf.d/`。

### 9. 先用 IP 验证

如果 Nginx 已经加载成功，可以先验证：

```bash
curl http://127.0.0.1:3001/api/health
curl http://your-server-public-ip/api/health
```

### 10. 配置 HTTPS

正式上线建议再加 HTTPS。常见做法是为 Nginx 签发证书，例如使用 Certbot。

做完后，外部访问地址就是：

```text
https://your-domain.com
```

## 域名绑定说明

### 1. 添加 DNS 记录

在你的域名 DNS 服务商面板中添加：

- `A` 记录：`@` -> 服务器公网 IP
- `A` 记录：`www` -> 服务器公网 IP

### 2. 修改 Nginx 的 `server_name`

把 `nginx.example.conf` 里的：

```nginx
server_name example.com www.example.com;
```

改成你的真实域名。

### 3. 中国大陆服务器的备案说明

如果你把网站放在中国大陆服务器，并且要用正式域名对外提供网站服务，通常需要先完成ICP备案。

也就是说：

- 服务器在中国大陆
- 域名要正式解析到这台服务器
- 要让别人通过你的正式网址访问

这三件事同时成立时，备案通常要先处理好。

### 4. 别人如何通过新网址访问

满足下面四个条件后，别人就可以直接通过新网址访问：

1. 域名 A 记录已经指向你的公网 IP
2. Nginx 的 `server_name` 已改成你的域名
3. `pm2` 中的 Node 服务已经启动
4. `80/443` 端口已放行，且大陆服务器所需备案已完成

最终访问方式：

```text
https://your-domain.com
```

接口访问方式：

```text
https://your-domain.com/api/health
https://your-domain.com/api/chat
```

## 健康检查方式

### 检查 Node 服务是否启动

```bash
curl http://127.0.0.1:3001/api/health
```

预期返回：

```json
{
  "ok": true,
  "model": "deepseek-chat"
}
```

### 检查域名反代是否生效

```bash
curl https://your-domain.com/api/health
```

### 检查聊天接口

```bash
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"把这句话改得更冷静一点\"}"
```

## API 保持不变

### `GET /api/health`

用于健康检查，返回当前模型名。

### `POST /api/chat`

请求体：

```json
{
  "message": "把这句话改得更冷静一点"
}
```

返回示例：

```json
{
  "result": "建议先把事实讲清楚，再下判断，这样更有说服力。",
  "model": "deepseek-chat"
}
```

## 部署注意事项

- 线上推荐同域部署，不要把前端和 API 拆成两个公网域名
- `CLIENT_ORIGIN` 仅在你明确需要跨域时才设置
- `3001` 只给 Nginx 反代，不建议直接暴露到公网
- 如需重启服务，优先使用 `pm2 restart emotion-purifier-shield`
- 如果重新发布代码，最简单是直接执行 `bash scripts/deploy-update.sh`

## 结论

这个仓库现在的正式上线方式应当是：

1. `npm ci`
2. `npm run build`
3. `pm2 start ecosystem.config.cjs`
4. Nginx 把域名流量转发到 `127.0.0.1:3001`

后续更新最简单的方式是：

1. `git pull`
2. `bash scripts/deploy-update.sh`

这样就满足：

- 单一 Node 服务部署
- 保留当前 UI 和交互
- 保留 DeepSeek 接入
- 保留 `/api/chat` 和 `/api/health`
- 适合中国大陆服务器正式上线
