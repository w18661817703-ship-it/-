# Emotion Purifier Shield

前端保留 Vite，后端新增 Express，通过 OpenAI API 生成“高情商阴阳怪气回复”。

## 环境变量

在项目根目录创建 `.env`：

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.2
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
```

如果你的账号暂时没有 `gpt-5.2` 访问权限，可以把 `OPENAI_MODEL` 改成 `gpt-5-mini`。

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
