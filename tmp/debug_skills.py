import sys
import os
from pathlib import Path
import json

# Add backend to path
sys.path.append(r'c:\TOMO\openclaw-ez-control\backend')

from openclaw_config_manager import OpenClawConfigManager

manager = OpenClawConfigManager()
summary = manager.get_skills_summary()

print("--- SEARCH_DIRS DIAGNOSTIC ---")
# Since search_dirs isn't returned, we'll look at the results
for skill in summary['skills']:
    print(f"ID: {skill['id']}, Category: {skill['category']}, Path: {skill['path']}")

config = manager.load()
agents = config.get("agents", {})
print("\n--- AGENT CONFIG ---")
print(f"Agents Type: {type(agents)}")
if isinstance(agents, dict):
    print(f"Agents keys: {agents.keys()}")
    print(f"List length: {len(agents.get('list', []))}")
    for a in agents.get('list', []):
        print(f"  Agent ID: {a.get('id')}, Workspace: {a.get('workspace')}")
else:
    print(f"Agents content: {agents}")

print("\n--- Path check ---")
p = Path.home() / ".openclaw" / "workspace" / "skills"
print(f"Expected workspace skills path: {p}")
print(f"Exists: {p.exists()}")
