import requests
import json


class OllamaClient:
    """Simple wrapper around the Ollama HTTP API."""

    def __init__(self, base_url: str = "http://localhost:11434") -> None:
        self.base_url = base_url.rstrip("/")

    def list_models(self) -> list[str]:
        """Return a list of available model names."""
        url = f"{self.base_url}/api/tags"
        try:
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as exc:  # pragma: no cover - network
            raise RuntimeError(str(exc)) from exc
        models = [m.get("name") for m in data.get("models", []) if m.get("name")]
        return models

    def generate(
        self,
        model: str,
        prompt: str,
        images: list[str] | None = None,
        stream: bool = False,
    ):
        """Generate text from a prompt.

        If ``stream`` is True this returns an iterator yielding newline
        delimited JSON strings as produced by Ollama.
        """
        url = f"{self.base_url}/api/generate"
        payload: dict[str, object] = {"model": model, "prompt": prompt, "stream": stream}
        if images:
            payload["images"] = images
        try:
            if stream:
                with requests.post(url, json=payload, stream=True, timeout=60) as r:
                    r.raise_for_status()
                    for line in r.iter_lines(decode_unicode=True):
                        if line:
                            yield line
            else:
                r = requests.post(url, json=payload, timeout=60)
                r.raise_for_status()
                return r.json()
        except requests.RequestException as exc:  # pragma: no cover - network
            raise RuntimeError(str(exc)) from exc

    def chat(self, model: str, messages: list[dict[str, str]], stream: bool = False):
        """Send a chat conversation to Ollama.

        ``messages`` should be a list of dicts with ``role`` and ``content``.
        """
        url = f"{self.base_url}/api/chat"
        payload: dict[str, object] = {"model": model, "messages": messages, "stream": stream}
        try:
            if stream:
                with requests.post(url, json=payload, stream=True, timeout=60) as r:
                    r.raise_for_status()
                    for line in r.iter_lines(decode_unicode=True):
                        if line:
                            yield line
            else:
                r = requests.post(url, json=payload, timeout=60)
                r.raise_for_status()
                return r.json()
        except requests.RequestException as exc:  # pragma: no cover - network
            raise RuntimeError(str(exc)) from exc

    def is_running(self) -> bool:
        """Return True if the Ollama server is responsive."""
        url = f"{self.base_url}/api/tags"
        try:
            resp = requests.get(url, timeout=2)
            resp.raise_for_status()
            return True
        except requests.RequestException:  # pragma: no cover - network
            return False
