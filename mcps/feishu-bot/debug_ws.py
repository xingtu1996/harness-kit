#!/usr/bin/env python3
"""调试飞书长连接"""
import sys
import traceback

import lark_oapi as lark

import os

from config import FEISHU_APP_ID, FEISHU_APP_SECRET

APP_ID = FEISHU_APP_ID
APP_SECRET = FEISHU_APP_SECRET

print("1. 测试获取 tenant_access_token...")
import requests
resp = requests.post(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    json={"app_id": APP_ID, "app_secret": APP_SECRET},
)
data = resp.json()
print(f"   code={data.get('code')}, msg={data.get('msg')}")
if data.get("code") != 0:
    print("   App ID/Secret 无效，退出")
    sys.exit(1)
print("   token 获取成功!")

print("\n2. 测试长连接...")

def on_message(event):
    print(f"   >>> 收到消息事件: {event}")

handler = (
    lark.EventDispatcherHandler.builder("", "")
    .register_p2_im_message_receive_v1(on_message)
    .build()
)

print("   创建 ws.Client...")
try:
    ws = lark.ws.Client(
        APP_ID,
        APP_SECRET,
        handler=handler,
        log_level=lark.LogLevel.DEBUG,
    )
    print("   ws.Client 创建成功，启动 start()...")
    print("   (如果连接成功，会看到 DEBUG 日志；等待10秒看是否有消息)")
    # start() 是阻塞的，用线程跑
    import threading
    t = threading.Thread(target=ws.start, daemon=True)
    t.start()
    t.join(timeout=10)
    if t.is_alive():
        print("   长连接运行中（10秒后仍存活）")
    else:
        print("   长连接已退出!")
except Exception as e:
    print(f"   错误: {e}")
    traceback.print_exc()
