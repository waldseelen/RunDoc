# apps/worker - Python FastAPI Worker for Pandoc Orchestrator
import os
import sys

# Dynamically add Python user Scripts directory to PATH so weasyprint and other engines are discoverable
try:
    if os.name == "nt":
        # Windows
        appdata = os.environ.get("APPDATA", "")
        py_version = f"Python{sys.version_info.major}{sys.version_info.minor}"
        user_scripts = os.path.join(appdata, "Python", py_version, "Scripts")
        if os.path.exists(user_scripts) and user_scripts not in os.environ.get("PATH", ""):
            os.environ["PATH"] = user_scripts + os.pathsep + os.environ["PATH"]
            
        # Also try default localappdata pip scripts
        localappdata = os.environ.get("LOCALAPPDATA", "")
        local_scripts = os.path.join(localappdata, "Programs", "Python", py_version, "Scripts")
        if os.path.exists(local_scripts) and local_scripts not in os.environ.get("PATH", ""):
            os.environ["PATH"] = local_scripts + os.pathsep + os.environ["PATH"]
except Exception:
    pass
