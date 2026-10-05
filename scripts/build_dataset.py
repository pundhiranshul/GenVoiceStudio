import os
import subprocess
import sys
import zipfile
import compileall
import shutil
import urllib.request
import json

export_dir = "/kaggle/working/genvoice_model"
packages_dir = f"{export_dir}/offline_packages"
wheels_dir = f"{export_dir}/wheels"
os.makedirs(export_dir, exist_ok=True)
os.makedirs(wheels_dir, exist_ok=True)

# 1. Clone codebase
print("=== 1. Cloning breeze-tts codebase ===")
subprocess.run([
    "git", "clone", "--depth=1",
    "https://github.com/breezeblue-ai/breeze-tts.git",
    f"{export_dir}/breeze-tts"
], check=True)

# 2. Download weights
print("\n=== 2. Downloading Breeze TTS 2 checkpoint ===")
subprocess.run([sys.executable, "-m", "pip", "install", "huggingface_hub", "-q"], check=True)

from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="BreezeBlue/Breeze-TTS-2",
    local_dir=f"{export_dir}/breeze-tts-2",
    ignore_patterns=["*.md", "*.gitattributes"],
    token=os.environ.get("HF_TOKEN")  # Uses the HF_TOKEN environment variable
)

# 3. Download ALL packages
print("\n=== 3. Downloading offline packages ===")
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "torchvision", "torchtext", "-q"])

subprocess.run([
    sys.executable, "-m", "pip", "install",
    "-r", f"{export_dir}/breeze-tts/requirements.txt",
    "-t", packages_dir
], check=True)

# 4. Purge Offending Packages
print("\n=== 4. Scanning and Purging specific packages ===")
# Added 'torch', 'nvidia', and 'triton' to explicitly purge PyTorch libraries and massive CUDA binaries. 
# We rely on Kaggle's native, highly-optimized PyTorch and GPU drivers instead!
purge_targets = ['joblib', 'pooch', 'store', 'torch', 'nvidia', 'triton'] 

for item in os.listdir(packages_dir):
    item_lower = item.lower()
    if any(target in item_lower for target in purge_targets):
        pkg_path = os.path.join(packages_dir, item)
        print(f"🗑️ Purging: {item}")
        subprocess.run(["rm", "-rf", pkg_path])

# 5. Precompile Python Bytecode 
print("\n=== 5. Compiling Python bytecode ===")
compileall.compile_dir(packages_dir, force=True, quiet=True)

# 6. Snipe the Pre-Compiled flash-attn Wheel
print("\n=== 6. Downloading pre-compiled flash-attn wheel ===")
req = urllib.request.Request("https://api.github.com/repos/mjun0812/flash-attention-prebuild-wheels/releases?per_page=100")
with urllib.request.urlopen(req) as response:
    releases = json.loads(response.read())

target_url = None
wheel_name = None
for release in releases:
    for asset in release.get('assets', []):
        name = asset['name']
        if "cp312" in name and "torch2.9" in name and "cu12" in name and "linux_x86_64" in name and name.endswith(".whl"):
            target_url = asset['browser_download_url']
            wheel_name = name
            break
    if target_url: break

if target_url:
    print(f"[*] Found match: {wheel_name}")
    wheel_path = os.path.join(wheels_dir, wheel_name)
    subprocess.run(["wget", "-q", "--show-progress", "-O", wheel_path, target_url], check=True)
else:
    print("🚨 Could not find a matching flash-attn wheel.")

# 7. Pack the environment
print("\n=== 7. Zipping offline_packages into a single .pack file ===")
pack_path = f"{export_dir}/offline_packages.pack"
with zipfile.ZipFile(pack_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(packages_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, packages_dir)
            zf.write(file_path, arcname=rel_path)

shutil.rmtree(packages_dir)
print(f"✅ offline_packages packed to {pack_path}")

# 8. Stream to final ZIP
print("\n=== 8. Streaming to final ZIP... ===")
zip_path = "/kaggle/working/genvoice_model.zip"

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(export_dir, topdown=False):
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, "/kaggle/working")
            zf.write(file_path, arcname=relative_path)
            os.remove(file_path)
        for d in dirs:
            try:
                os.rmdir(os.path.join(root, d))
            except OSError:
                pass

os.rmdir(export_dir)
zip_size = os.path.getsize(zip_path) / (1024 * 1024 * 1024)
print(f"\n✅ SUCCESS! genvoice_model.zip created ({zip_size:.2f} GB)")
