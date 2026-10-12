# feishu-bot · 飞书长连接机器人（参考实现）

> 一个可运行的飞书长连接机器人骨架：接收群聊消息、按命令回复、带 LLM 对话与上下文管理。

## 定位

这是 `xingtu-mcps` 里的第一个**参考服务实现**。它本身是飞书 WebSocket 长连接机器人（非严格 MCP server），用于演示"一个真实可运行的服务长什么样"。接入 MCP 时可在此基础上包一层 MCP 工具适配。

## 结构

| 文件 | 说明 |
|------|------|
| config.py | 配置（密钥全走环境变量，无硬编码）|
| bot_longconn.py | 主入口：长连接 + 消息分发 |
| commands.py | 快捷命令处理（/help /status /tasks 等）|
| context.py | 群聊上下文保留与过期 |
| llm.py | LLM 对话封装（OpenAI 兼容格式）|
| debug_ws.py | 长连接连通性调试脚本 |

## 运行

```bash
# 1. 配置环境变量（飞书开放平台应用凭证）
export FEISHU_APP_ID="你的AppID"
export FEISHU_APP_SECRET="你的AppSecret"
# 可选：LLM 配置
export ARK_API_KEY="你的Key"
export ARK_MODEL="doubao-1-5-pro-32k-250115"

# 2. 启动
python3 bot_longconn.py
```

## 安全

- 所有密钥（飞书 AppID/Secret、LLM Key）**只从环境变量读取**，代码与配置不落盘
- 系统提示词为占位示例，接入方可按自身场景改写

## MCP 适配方向

把 `commands.py` 的命令处理逻辑封装为 MCP tools（`mcp.tool()` 装饰器），即可把本机器人的能力暴露给任意 MCP 客户端。示例见仓库根 README 的适配说明。
