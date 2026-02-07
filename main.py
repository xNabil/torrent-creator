import os
import sys
import shutil
import subprocess
import requests
import concurrent.futures
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import filedialog
import random
import json
import threading
import atexit
from http.server import HTTPServer, SimpleHTTPRequestHandler

# ========================= CONFIGURATION =========================
# --- API Keys ---
IMGBB_API_KEY = "IMGBB API KEY"   # CHANGE THIS! GET Free API KEY at https://api.imgbb.com/
FREEIMAGE_API_KEY = "6d207e02198a847aa98d0a2a901485a5"

# --- Settings ---
IMAGE_HOST = "freeimage"           # "imgbb" or "freeimage"
                                   # imgbb → max file size 32 MB
                                   # freeimage → max file size 64 MB

SCREENSHOT_COUNT = 6               # Number of screenshots to take
LOSSLESS_SCREENSHOT = True         # If True, capture screenshots in lossless / max quality      
CREATE_TORRENT_FILE = True         # This creates the .torrent file
SKIP_TXT = True                    # If True, the script will NOT save the description as a .txt file                      
TRACKER_ANNOUNCE = "https://tracker.torrentbd.net/announce"
PRIVATE_TORRENT = True 
COPY_TO_CLIPBOARD = True           # Copies description in your clipboard
USE_WP_PROXY = False  
USE_GUI_FILE_PICKER = False        # If True, use the Windows file picker instead of the command line to select files     

# --- AUTO DELETE SETTINGS ---
# If True, deletes the generated .torrent (and .txt if created) when the script closes.
# latest.json is ALWAYS deleted on exit/start regardless of this setting.
AUTO_DELETE_CREATED_FILES = False 

# --- SERVER SETTINGS ---
START_HTTP_SERVER = True               # True = Start local server for Tampermonkey sync
HTTP_PORT = 8090                       # Port for the local server
# ================================================================

VIDEO_EXTS = {'.mkv', '.mp4', '.avi', '.mov', '.m4v', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.ts', '.m2ts'}

# Global variables for path tracking
LATEST_JSON = None    
GENERATED_TORRENT = None # Tracks the specific .torrent file created
GENERATED_TXT = None     # Tracks the specific .txt file created

class c:
    RESET   = '\033[0m'
    BOLD    = '\033[1m'
    DIM     = '\033[2m'
    PURPLE  = '\033[95m'
    CYAN    = '\033[96m'
    GREEN   = '\033[92m'
    YELLOW  = '\033[93m'
    RED     = '\033[91m'
    GRAY    = '\033[90m'
    WHITE   = '\033[97m'

# --- HTTP SERVER LOGIC ---
class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super(CORSRequestHandler, self).end_headers()

    def log_message(self, format, *args):
        return 

def start_server_thread(directory, port):
    def run():
        try:
            os.chdir(directory)
            server_address = ('', port)
            httpd = HTTPServer(server_address, CORSRequestHandler)
            print(f"\n{c.GREEN}⚡ HTTP Server Running on http://localhost:{port}{c.RESET}")
            print(f"{c.DIM}   Serving: {directory}{c.RESET}")
            httpd.serve_forever()
        except OSError:
            print(f"\n{c.RED}Error: Port {port} is busy.{c.RESET}")
        except Exception as e:
            print(f"\n{c.RED}Server error: {e}{c.RESET}")

    t = threading.Thread(target=run, daemon=True)
    t.start()

# --- CLEANUP LOGIC ---
def cleanup_sync_files():
    """Deletes sync files and optionally generated files on exit"""
    try:
        # 1. Always delete the sync file (latest.json)
        if LATEST_JSON and LATEST_JSON.exists(): 
            LATEST_JSON.unlink()

        # 2. Delete actual content files if configured
        if AUTO_DELETE_CREATED_FILES:
            if GENERATED_TORRENT and GENERATED_TORRENT.exists():
                GENERATED_TORRENT.unlink()
                print(f"{c.YELLOW}Auto-deleted: {GENERATED_TORRENT.name}{c.RESET}")
            
            if GENERATED_TXT and GENERATED_TXT.exists():
                GENERATED_TXT.unlink()
                print(f"{c.YELLOW}Auto-deleted: {GENERATED_TXT.name}{c.RESET}")
    except: pass

# Register cleanup to run automatically when script exits
atexit.register(cleanup_sync_files)

def clear(): os.system('cls' if os.name == 'nt' else 'clear')

def banner():
    clear()
    print(f"""
{c.PURPLE}{c.BOLD}
╔══════════════════════════════════════════════════════════════════╗
║                Torrent Auto Description Maker                    ║
║             By xnabil (https://github.com/xNabil)                ║
╚══════════════════════════════════════════════════════════════════╝
{c.RESET}""")

def log(msg: str, icon: str = "•", color: str = c.CYAN):
    t = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{t}] {icon} {msg}{c.RESET}")

def success(msg): log(msg, "Success", c.GREEN)
def error(msg):   log(msg, "Error", c.RED)

def hide_window():
    if os.name == 'nt':
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = subprocess.SW_HIDE
        return si
    return None

def copy_to_clipboard(text: str):
    if not COPY_TO_CLIPBOARD: return
    try:
        if os.name == 'nt':
            subprocess.run('clip', input=text.encode('utf-8'), check=True)
        elif sys.platform == 'darwin':
            subprocess.run('pbcopy', input=text.encode('utf-8'), check=True)
        else:
            subprocess.run(['xclip', '-selection', 'clipboard'], input=text.encode('utf-8'), check=True)
        success("Description copied to clipboard!")
    except:
        pass

def create_torrent(target: Path) -> bool:
    global GENERATED_TORRENT
    if not CREATE_TORRENT_FILE:
        log("Skipping torrent creation (disabled)", "Skip")
        return True
    if not shutil.which("mkbrr"):
        error("mkbrr not found! → https://github.com/autobrr/mkbrr")
        return False
    
    log("Creating torrent file...", "Torrent")
    out = target.parent / f"{target.name}.torrent"
    GENERATED_TORRENT = out # Track for auto-deletion
    
    cmd = ["mkbrr", "create", "-t", TRACKER_ANNOUNCE,
           f"--private={'true' if PRIVATE_TORRENT else 'false'}", "-o", str(out), str(target)]
    
    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        bufsize=1, universal_newlines=True, startupinfo=hide_window()
    )
    
    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None: break
        if line:
            line = line.strip()
            if "Hashing pieces" in line or "%" in line or "Wrote" in line:
                print(f"\r{c.CYAN}{line}{c.RESET}", end="", flush=True)
    
    print()
    returncode = process.wait()
    
    if returncode == 0 and out.exists():
        success(f"Torrent created: {out.name}")
        return True
    else:
        error("Torrent creation failed!")
        return False

def get_mediainfo(path: Path) -> str:
    cmd = ["mediainfo", str(path)]
    if not shutil.which("mediainfo"):
        exe = Path(__file__).parent / "MediaInfo.exe"
        if exe.exists(): cmd = [str(exe), str(path)]
        else: return "MediaInfo not available"
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, startupinfo=hide_window(), timeout=120)
        return result.stdout if result.returncode == 0 else "Failed"
    except: return "Failed"

def take_screenshots(video: Path, count: int = SCREENSHOT_COUNT) -> list[Path]:
    log(f"Taking {count} full-size screenshots (20% → 80%)...", "Camera")
    try:
        duration = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(video)
        ], startupinfo=hide_window()).decode().strip())
    except: return []

    if duration <= 0: return []

    start_percent, end_percent = 0.20, 0.80
    total_range = end_percent - start_percent
    files = []
    max_size_mb = 32 if IMAGE_HOST.lower() == "imgbb" else 64

    for i in range(1, count + 1):
        progress = i / (count + 1)
        timestamp = duration * (start_percent + (total_range * progress))
        ext = "png" if LOSSLESS_SCREENSHOT else "jpg"
        output_file = Path(f"ss_{i:02d}.{ext}")

        cmd = ["ffmpeg", "-ss", f"{timestamp:.3f}", "-i", str(video),
               "-vframes", "1", "-q:v", "1", "-y", str(output_file)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, startupinfo=hide_window())

        if output_file.exists():
            size_mb = output_file.stat().st_size / (1024 * 1024)
            if LOSSLESS_SCREENSHOT and ext == "png" and size_mb > max_size_mb:
                output_file.unlink()
                jpeg_file = Path(f"ss_{i:02d}.jpg")
                cmd_jpg = ["ffmpeg", "-ss", f"{timestamp:.3f}", "-i", str(video),
                           "-vframes", "1", "-q:v", "1", "-y", str(jpeg_file)]
                subprocess.run(cmd_jpg, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, startupinfo=hide_window())
                if jpeg_file.exists():
                    files.append(jpeg_file)
                    print(f"   {c.YELLOW}Success {i}/{count} → JPEG (PNG too big){c.RESET}")
                continue
            files.append(output_file)
            fmt = "PNG" if ext == "png" else "JPG"
            print(f"   {c.GREEN}Success {i}/{count} → {fmt} ({size_mb:.1f} MB){c.RESET}")
        else:
            print(f"   {c.RED}Failed {i}/{count}{c.RESET}")
    return files

def upload_image(img: Path) -> str | None:
    try:
        if IMAGE_HOST.lower() == "imgbb":
            if IMGBB_API_KEY == "YOUR IMGBB API KEY": return None
            r = requests.post("https://api.imgbb.com/1/upload", params={"key": IMGBB_API_KEY}, files={"image": open(img, "rb")}, timeout=60)
            if r.status_code == 200: return r.json()["data"]["url"]
        elif IMAGE_HOST.lower() == "freeimage":
            r = requests.post("https://freeimage.host/api/1/upload", params={"key": FREEIMAGE_API_KEY}, files={"source": open(img, "rb")}, data={"format": "json"}, timeout=60)
            if r.status_code == 200: return r.json().get("image", {}).get("url")
    except: pass
    return None

def print_progress(done: int, total: int):
    bar_length = 10
    filled = int(bar_length * done // total)
    bar = "█" * filled + "▒" * (bar_length - filled)
    print(f"\r{c.CYAN}Uploading {total} screenshots... [{bar}] {done}/{total} uploaded{c.RESET}", end="", flush=True)
    if done == total: print()

def gui_select_target() -> tuple[Path, bool]:
    root = tk.Tk(); root.withdraw(); root.update()
    while True:
        banner()
        print(f"{c.BOLD}{c.CYAN}Choose an option:{c.RESET}")
        print(f"  {c.WHITE}1{c.RESET} - Select a single video file")
        print(f"  {c.WHITE}2{c.RESET} - Select an entire folder")
        print(f"  {c.GRAY}(q to quit){c.RESET}\n")
        choice = input(f"{c.BOLD}Enter 1 or 2: {c.RESET}").strip().lower()
        if choice == 'q': sys.exit(0)
        if choice == '1':
            f = filedialog.askopenfilename(title="Select a Video File", filetypes=[("Video Files", "*.mkv *.mp4 *.avi")])
            if f: return Path(f), False
        elif choice == '2':
            f = filedialog.askdirectory(title="Select Folder")
            if f: return Path(f), True

def cli_select_target() -> tuple[Path, bool]:
    current = Path.cwd().resolve()
    while True:
        banner()
        print(f"{c.BOLD}{c.CYAN}Current directory: {current}{c.RESET}")
        items = sorted([p for p in current.iterdir() if p.is_dir() or p.suffix.lower() in VIDEO_EXTS])
        if not items:
            choice = input(f"{c.BOLD}Enter 0 to go back or q to quit: {c.RESET}").strip().lower()
            if choice == '0' and current != Path.cwd().resolve(): current = current.parent; continue
            elif choice == 'q': sys.exit(0)
            else: continue
        for i, item in enumerate(items, 1):
            typ = f"{c.PURPLE}Dir{c.RESET}" if item.is_dir() else f"{c.CYAN}File{c.RESET}"
            print(f"  {c.WHITE}{i}{c.RESET}. {item.name} ({typ})")
        print(f"  {c.WHITE}0{c.RESET}. Go back" if current != Path.cwd().resolve() else f"  {c.WHITE}0{c.RESET}. Quit")
        choice = input(f"{c.BOLD}Enter number: {c.RESET}").strip().lower()
        if choice == 'q': sys.exit(0)
        if choice == '0':
            if current == Path.cwd().resolve(): sys.exit(0)
            current = current.parent; continue
        try:
            num = int(choice)
            if 1 <= num <= len(items):
                selected = items[num - 1]
                if selected.is_dir():
                    sub = input(f"{c.BOLD}Navigate (n) or select (s)? {c.RESET}").strip().lower()
                    if sub == 'n': current = selected
                    elif sub == 's': return selected, True
                else: return selected, False
        except: pass

def select_target() -> tuple[Path, bool]:
    return gui_select_target() if USE_GUI_FILE_PICKER else cli_select_target()

def main():
    # Use globals so cleanup function can access these paths
    global LATEST_JSON, GENERATED_TXT 
    
    target_path, is_folder = select_target()
    if not target_path or not target_path.exists(): return

    # --- STARTUP CLEANUP LOGIC ---
    # Define paths immediately so we can clean old files before processing
    sync_dir = target_path.parent
    LATEST_JSON = sync_dir / "latest.json"
    
    # Delete any lingering latest.json from previous crashes/runs
    if LATEST_JSON.exists(): LATEST_JSON.unlink()
    # -----------------------------

    clear(); banner()
    print(f"{c.BOLD}{c.PURPLE}Selected → {target_path.name}{c.RESET} {'(Folder Mode)' if is_folder else ''}\n")

    if not create_torrent(target_path):
        if CREATE_TORRENT_FILE: input("\nPress Enter to exit..."); return

    if is_folder:
        video_files = [f for f in target_path.rglob('*') if f.is_file() and f.suffix.lower() in VIDEO_EXTS]
        video_for_ss = random.choice(video_files) if video_files else None
    else:
        video_for_ss = target_path

    if not video_for_ss: error("No video found!"); return

    mediainfo_text = get_mediainfo(video_for_ss)
    screenshots = take_screenshots(video_for_ss, SCREENSHOT_COUNT)

    uploaded_direct_urls = []
    if screenshots:
        print_progress(0, len(screenshots))
        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            futures = {executor.submit(upload_image, img): img for img in screenshots}
            done_count = 0
            for future in concurrent.futures.as_completed(futures):
                if res := future.result(): uploaded_direct_urls.append(res)
                done_count += 1
                print_progress(done_count, len(screenshots))

    for f in Path(".").glob("ss_*.*"):
        try: f.unlink()
        except: pass

    ss_bbcode = "\n".join([f"[img]{u}[/img]" for u in uploaded_direct_urls])
    description = f"[hr]\n[center][b][size=5][color=#00acc1]MediaInfo[/color][/size][/b][/center]\n[hr]\n[font=Times New Roman]\n[mediainfo]\n{mediainfo_text}\n[/mediainfo]\n[/font]\n[hr]\n[center][b][size=5][color=#00acc1]Screenshots[/color][/size][/b]\n[size=2][color=#9e9e9e]Straight from the source - untouched frames.[/color][/size][/center]\n[hr]\n[center]\n{ss_bbcode}\n[/center]\n[hr]"

    if not SKIP_TXT:
        save_name = f"{target_path.name}_description.txt" if is_folder else f"{target_path.stem}_TBD_Description.txt"
        txt_path = target_path.parent / save_name
        txt_path.write_text(description, encoding="utf-8")
        GENERATED_TXT = txt_path # Track for auto-deletion
        success(f"Saved → {save_name}")

    copy_to_clipboard(description)

    # ================= HTTP SERVER SYNC =================
    if START_HTTP_SERVER:
        try:
            # 1. Clean old (Safety check, though handled at start)
            # cleanup_sync_files()

            # 2. Save JSON with direct torrent reference
            torrent_filename = f"{target_path.name}.torrent"
            payload = {
                "ready": True, 
                "title": target_path.name, 
                "description": description,
                "torrentFile": torrent_filename # <--- The key modification
            }

            with open(LATEST_JSON, "w", encoding="utf-8") as f:
                json.dump(payload, f)
            
            # 3. NO COPYING. We just serve the existing file directly.
            success(f"Sync files ready for Localhost!")
            
            # 4. Start Server
            start_server_thread(sync_dir, HTTP_PORT)

        except Exception as e:
            error(f"HTTP Sync Failed: {e}")
    # ====================================================

    print(f"\n{c.BOLD}{c.GREEN}ALL DONE!{c.RESET}")
    print(f"{c.DIM}When you exit, sync files & generated torrents will be deleted.{c.RESET}")
    input(f"\nPress Enter to exit...")

if __name__ == "__main__":
    try: main()
    except KeyboardInterrupt: print(f"\n\n{c.YELLOW}Cancelled.{c.RESET}")
