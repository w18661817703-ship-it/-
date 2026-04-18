# Emotion Purifier Shield

前端保留 Vite，AI 接口使用 `/api` 目录中的 Vercel Functions，模型调用走 DeepSeek。

## 产品定位

这是一个“高情商输出过滤”工具。

输入用户原始评论后，系统会把其中过激、粗暴、容易被举报或无法过审的表达，
改写成：

- 不带脏字
- 不包含人身侮辱、歧视、威胁或恶意诅咒
- 保留不满、批评和否定态度
- 更克制、更像成年人说话
- 更容易通过平台审核

## 环境变量

在项目根目录创建 `.env`：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
```

## 启动

1. 安装依赖

```bash
npm install
```

2. 仅启动前端

```bash
npm run dev
```

3. 仅启动本地 Express 后端

```bash
npm run server
```

4. 同时启动前后端

```bash
npm run dev:all
```

前端默认运行在 `http://localhost:3000`，本地后端默认运行在 `http://localhost:3001`。
