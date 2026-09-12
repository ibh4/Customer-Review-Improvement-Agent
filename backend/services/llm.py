"""LLM 统一封装（不绑定单一 SDK）。

- LLM_PROVIDER=dashscope -> 阿里云百炼 qwen3.8max（OpenAI 兼容协议）
- LLM_PROVIDER=openai    -> 任意 OpenAI 兼容端点（LLM_BASE_URL）
- LLM_PROVIDER=mock      -> 无 Key 的默认模式：chat_json 返回 None，
  上层 Agent 自动走规则模板（heuristic）生成合理结果，Demo 完全可操作。

Key 只从环境变量读取，绝不写入代码。
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

from backend.app.config import settings

log = logging.getLogger("r2p.llm")

_DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"


def llm_mode() -> str:
    if settings.LLM_PROVIDER in ("dashscope", "openai") and settings.LLM_API_KEY:
        return "real"
    return "mock"


class LLMClient:
    """极简 OpenAI 兼容 chat client，支持 JSON 输出。"""

    def __init__(self) -> None:
        self.mode = llm_mode()
        self.model = settings.LLM_MODEL
        if self.mode == "real":
            self.base_url = (settings.LLM_BASE_URL or _DASHSCOPE_BASE).rstrip("/")
            if settings.LLM_PROVIDER == "dashscope" and not settings.LLM_BASE_URL:
                self.base_url = _DASHSCOPE_BASE
            self.headers = {"Authorization": f"Bearer {settings.LLM_API_KEY}"}
        else:
            self.base_url, self.headers = "", {}

    def chat_json(self, system: str, user: str, timeout: float = 45.0,
                  max_tokens: int = 1200) -> Optional[dict[str, Any]]:
        """返回结构化 dict；mock 模式或任何失败返回 None（上层走 heuristic）。"""
        if self.mode != "real":
            return None

    def analyze_review(self, review_text: str, product_context: str = "") -> dict[str, Any] | None:
        """Structured single-review analysis used by the interactive Agent panel."""
        system = (
            "你是 Review2Product 商品评价分析 Agent。请分析一条商品评价，并用简体中文返回结果。"
            "必须严格返回 JSON，字段只能是：summary, sentiment, rating_estimate, pain_points, "
            "root_cause, affected_scenario, recommended_action, evidence_phrases, confidence。"
            "sentiment 使用 positive/neutral/negative；rating_estimate 为 1-5 整数；confidence 为 0-1；"
            "evidence_phrases 引用评价中的短语。"
        )
        user = f"Product context: {product_context or 'unknown'}\nReview:\n{review_text[:12000]}"
        return self.chat_json(system, user, timeout=45.0, max_tokens=1000)
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        try:
            resp = httpx.post(f"{self.base_url}/chat/completions", json=payload,
                              headers=self.headers, timeout=timeout)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            log.warning("LLM 调用失败，降级 heuristic：%s", e)
            return None


_client: LLMClient | None = None


def get_llm() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
        log.info("LLM mode = %s (provider=%s, model=%s)", _client.mode, settings.LLM_PROVIDER, _client.model)
    return _client
