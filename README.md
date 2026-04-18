# Emotion Purifier Shield

前端保留 Vite，后端新增 Express，通过 DeepSeek API 生成“高情商阴阳怪气回复”。

## 环境变量

在项目根目录创建 `.env`：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
```

默认模型使用 `deepseek-chat`。

## 启动

1. 安装依赖

```bash
npm install
```

2. 仅启动前端

```bash
npm run dev
```

3. 仅启动后端

```bash
npm run server
```

4. 同时启动前后端

```bash
npm run dev:all
```

前端默认运行在 `http://localhost:3000`，后端默认运行在 `http://localhost:3001`。
