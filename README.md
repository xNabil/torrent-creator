Here is the updated **README.md**. I have added a dedicated **"Configuration Guide"** section that breaks down exactly what every setting does, so users understand *why* they might want to change them.

---

# 🚀 TorrentBD Auto-Upload Assistant

**A hybrid automation tool that links your local PC to the TorrentBD Upload Page.**

This project consists of two parts that work in perfect sync:

1. **Python Script (The Backend):** Runs on your PC. It processes video files, generates screenshots, creates `.torrent` files, and hosts a local synchronization server.
2. **Tampermonkey Script (The Frontend):** Runs in your browser. It connects to your local Python server to auto-fill the upload form and attach files wirelessly.

---

## ✨ Key Features

### 🐍 Python Script

* **Auto-Torrent Creation:** Uses `mkbrr` to generate private, hashed `.torrent` files automatically.
* **Smart Screenshots:** Uses `ffmpeg` to capture 6 evenly spaced, full-resolution screenshots (skipping the first/last 20% of the video to avoid intros/credits).
* **Image Hosting:** Automatically uploads screens to **ImgBB** or **FreeImage** and generates BBCode.
* **MediaInfo Extraction:** Scans the file using `MediaInfo` and formats the technical details.
* **Local Sync Server:** Starts a lightweight HTTP server on port `8090` to send data to your browser.

### 🐵 Tampermonkey Script

* **One-Click Fill:** The "Sync Now" button instantly populates the Torrent Name, Description, and **attaches the .torrent file** (bypassing the need to browse for it manually).
* **IMDb Search Modal:** A custom pop-up to search for IMDb IDs without leaving the upload tab.
* **Cover Art Optimizer:** Fetches high-res posters and automatically compresses them to <256KB to meet site limits.

---

## ⚙️ Configuration Guide

This script is highly customizable. Open `main.py` in any text editor to change these settings.

### 1. Python Script Settings (`main.py`)

| Setting | Default | What it does |
| --- | --- | --- |
| **`IMGBB_API_KEY`** | `"..."` | **REQUIRED.** You must paste your API key here for image uploading to work. Get it free [here](https://api.imgbb.com/). |
| **`IMAGE_HOST`** | `"freeimage"` | Choose where to upload screenshots. Options: `"imgbb"` (32MB limit) or `"freeimage"` (64MB limit). |
| **`SCREENSHOT_COUNT`** | `6` | The number of screenshots generated for the description. |
| **`CREATE_TORRENT_FILE`** | `True` | If `True`, the script creates a `.torrent` file using `mkbrr`. Set to `False` if you already have one. |
| **`PRIVATE_TORRENT`** | `True` | **Crucial for TorrentBD.** Ensures the "Private" flag is set inside the torrent file so it tracks your stats correctly. |
| **`AUTO_DELETE_CREATED_FILES`** | `False` | If `True`, the script deletes the generated `.torrent` and `.txt` files after you close the script to keep your folder clean. |
| **`HTTP_PORT`** | `8090` | The network port used to talk to the browser. Only change this if port 8090 is already in use by another app. |

### 2. Tampermonkey Settings (Top of Script)

| Setting | What it does |
| --- | --- |
| **`SERVERS`** | This list tells the browser where to look for the Python script. Default is `localhost`. If you run Python on a different PC (e.g., a laptop), you can add its IP address here (e.g., `http://192.168.1.50:8090`). |
| **`MAX_IMG_SIZE`** | Limits the cover image size (default 256KB) to prevent upload errors on TorrentBD. |

---

## 🛠️ Prerequisites

The Python script relies on three external command-line tools. You must have these installed and added to your system **PATH** (or placed in the same folder as the script).

1. **Python 3.10+**: [Download Here](https://www.python.org/downloads/)
2. **FFmpeg**: Used for taking screenshots. [Download Here](https://ffmpeg.org/download.html)
3. **MediaInfo (CLI)**: Used for technical specs. [Download Here](https://mediaarea.net/en/MediaInfo/Download/Windows) (Look for the CLI version).
4. **mkbrr**: Used for creating the torrent file. [Download Here](https://github.com/autobrr/mkbrr/releases).

> **⚠️ Quick Fix:** If you don't know how to edit System PATH, just copy `ffmpeg.exe`, `mediainfo.exe`, and `mkbrr.exe` into the **same folder** as `main.py`.

---

## 🚀 How to Use (The Workflow)

### Step 1: Run the Python Script

Double-click `main.py` or run it via terminal:

```bash
python main.py

```

* **Select File:** You will be asked to choose a video file or a folder.
* **Processing:** The script will generate the `.torrent`, upload screenshots, and prepare the text.
* **Server Start:** Once finished, you will see:
> `⚡ HTTP Server Running on http://localhost:8090`


* **Do not close this window!** It acts as the server for your browser.

### Step 2: Open TorrentBD

1. Go to the [TorrentBD Upload Page](https://www.torrentbd.net/torrents-upload.php).
2. You will see the **Autofill Dashboard** in the bottom right corner.
3. The status dot should be **Green** (indicating it sees your Python script running).

### Step 3: Sync & Upload

1. Click **Sync Now** on the dashboard.
2. Watch the magic happen:
* **Title** is filled.
* **Description** (Screenshots + MediaInfo) is filled.
* **Torrent File** is automatically attached.


3. Use the **IMDb Search** button (next to the IMDb field) to find the correct movie/series.
4. Click Upload.

---

## ❓ Troubleshooting

**Q: Screenshots fail to upload?**

* Check your `IMGBB_API_KEY` in `main.py`. It might be empty or invalid.
* If using ImgBB and your PNGs are huge (>32MB), switch `IMAGE_HOST` to `"freeimage"`.

**Q: "mkbrr not found" error?**

* The script cannot find the `mkbrr.exe` tool. Download it and put it in the same folder as `main.py`.

**Q: Browser says "Offline" (Red Dot)?**

* Ensure the Python script window is still open.
* Ensure you haven't changed the `HTTP_PORT` in one script but not the other.
* If using Chrome, check if an extension blocker is stopping the connection to `localhost`.

---

## 📂 File Structure

```text
/Your-Project-Folder/
│
├── main.py                # The Automation Script
├── requirements.txt       # List of python libraries
├── README.md              # This file
│
├── ffmpeg.exe             # (Optional: If not in PATH)
├── mkbrr.exe              # (Optional: If not in PATH)
└── mediainfo.exe          # (Optional: If not in PATH)

```
