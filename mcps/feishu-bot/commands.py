"""小途 - 命令路由"""
import time
from datetime import datetime
from context import context_manager
from config import BOT_NAME

# 命令注册表
COMMANDS = {}


def command(name: str, description: str):
    """命令注册装饰器。"""
    def decorator(func):
        COMMANDS[name] = {"func": func, "description": description}
        return func
    return decorator


@command("/help", "查看所有可用命令")
def cmd_help(args: str, chat_id: str, sender_id: str) -> str:
    lines = [f"我是{BOT_NAME}，boss的自媒体运营助手。", ""]
    lines.append("可用命令：")
    for cmd, info in sorted(COMMANDS.items()):
        lines.append(f"  {cmd} — {info['description']}")
    lines.append("")
    lines.append("直接发消息就是跟我对话，@我就行。")
    return "\n".join(lines)


@command("/status", "查看小途运行状态")
def cmd_status(args: str, chat_id: str, sender_id: str) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return (
        f"【{BOT_NAME}状态】\n"
        f"运行时间：正常\n"
        f"当前时间：{now}\n"
        f"长连接：已连接\n"
        f"LLM：待配置API Key\n"
        f"上下文：{'有' if context_manager.get(chat_id) else '空'}"
    )


@command("/clear", "清空当前群的对话上下文")
def cmd_clear(args: str, chat_id: str, sender_id: str) -> str:
    context_manager.clear(chat_id)
    return "对话上下文已清空，我们重新开始吧boss。"


@command("/tasks", "查看待办任务（占位，待接入多维表格）")
def cmd_tasks(args: str, chat_id: str, sender_id: str) -> str:
    return (
        "【待办任务】\n"
        "（待接入飞书多维表格后显示真实数据）\n\n"
        "当前规划中：\n"
        "1. 接入豆包LLM实现智能回复\n"
        "2. 创建发布清单/选题库多维表格\n"
        "3. 蒸馏豆包工作harness体系\n"
        "4. 个人名片页优化"
    )


@command("/newtask", "创建新任务（用法：/newtask 任务内容）")
def cmd_newtask(args: str, chat_id: str, sender_id: str) -> str:
    if not args.strip():
        return "用法：/newtask 任务内容\n例如：/newtask 写一篇关于AI Agent的文章"
    return f"已记录任务：{args.strip()}\n（待接入多维表格后自动同步）"


def handle_command(text: str, chat_id: str, sender_id: str) -> str | None:
    """处理命令。如果是命令返回回复，否则返回None。"""
    text = text.strip()
    if not text.startswith("/"):
        return None

    parts = text.split(maxsplit=1)
    cmd = parts[0].lower()
    args = parts[1] if len(parts) > 1 else ""

    if cmd in COMMANDS:
        return COMMANDS[cmd]["func"](args, chat_id, sender_id)
    return f"未知命令：{cmd}，发送 /help 查看可用命令。"
