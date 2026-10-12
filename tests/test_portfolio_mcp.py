"""
Portfolio MCP Server Live Integration Tests
Target: https://www.mr-nagabhushanaraju-s.engineer/api/mcp
Protocol: Streamable HTTP MCP (JSON-RPC 2.0)
"""

import pytest
import requests

PORTFOLIO_MCP_URL = "https://www.mr-nagabhushanaraju-s.engineer/api/mcp"

def call_mcp(method: str, params: dict = None, request_id: int = 1):
    payload = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params or {}
    }
    headers = {"Content-Type": "application/json"}
    r = requests.post(PORTFOLIO_MCP_URL, json=payload, headers=headers, timeout=12)
    return r


class TestPortfolioMcpIntegration:

    def test_mcp_discovery_manifest(self):
        r = requests.get(PORTFOLIO_MCP_URL, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("name") == "nagabhushana-raju-portfolio"
        assert "tools" in data
        assert len(data["tools"]) >= 5

    def test_mcp_tools_list_rpc(self):
        r = call_mcp("tools/list")
        assert r.status_code == 200
        data = r.json()
        assert "result" in data
        tools = data["result"].get("tools", [])
        tool_names = [t["name"] for t in tools]
        assert "get_profile" in tool_names
        assert "list_projects" in tool_names
        assert "list_credentials" in tool_names
        assert "search_portfolio" in tool_names

    def test_mcp_get_profile_tool_call(self):
        r = call_mcp("tools/call", {"name": "get_profile", "arguments": {}})
        assert r.status_code == 200
        data = r.json()
        assert "result" in data
        content = data["result"].get("content", [])
        assert len(content) > 0
        text = content[0].get("text", "")
        assert "Nagabhushana Raju" in text

    def test_mcp_list_projects_tool_call(self):
        r = call_mcp("tools/call", {"name": "list_projects", "arguments": {"featuredOnly": True}})
        assert r.status_code == 200
        data = r.json()
        assert "result" in data
        content = data["result"].get("content", [])
        assert len(content) > 0
        text = content[0].get("text", "")
        assert len(text) > 20

    def test_mcp_search_portfolio_tool_call(self):
        r = call_mcp("tools/call", {"name": "search_portfolio", "arguments": {"query": "AI"}})
        assert r.status_code == 200
        data = r.json()
        assert "result" in data
        content = data["result"].get("content", [])
        assert len(content) > 0
