<div align="center">

# Torrent Creator & Upload Autofill
### Automatic Description, ScrForm Filler (Python + Tampermonkey)

</div>

## ✨ Features

**🚀 Zero-Click Upload Pipeline**  
Your browser script talks directly to your PC/VPS and auto-fills the **Title** and **Description** (description is auto-copied to clipboard), then **automatically selects and attaches** the generated `.torrent` file. No dragging. No manual work.

**📸 Smart Auto-Screenshots & MediaInfo**  
Automatically generates **6 perfectly spaced screenshots** using FFmpeg and uploads them to **ImgBB / FreeImage**, and also extracts MediaInfo from the video.  
If you select a **folder**, the script creates a `.torrent` for the entire folder, then randomly picks one media file from any subfolder to generate screenshots and MediaInfo.

**🧲 Instant Torrent Creation**  
Uses **mkbrr** to create **private, hashed .torrent files** in seconds. Works for single files **or full folders**.

**🎬 Built-in IMDb Search**  
Includes a **custom popup IMDb finder** so you can grab the correct IMDb ID **without leaving the upload page**.

**🖼️ Auto Cover Fetch & Optimize**  
Automatically pulls the cover image and **compresses it under 256KB (JPG)**.

## 🛠️ Configuration Features

![Config screenshot](https://i.ibb.co.com/kgFr7DxZ/image.png)

This config lets you control how the script works: you can set how many screenshots it takes, choose between **imgbb** or **freeimage** as the image host, enable or disable lossless quality, decide whether to create the torrent file, copy the generated description to your clipboard, or save it as a `.txt` file. You can also enable the Windows file picker instead of using the command line, set your tracker announce URL, and turn on the built-in HTTP server for Tampermonkey sync.

![Multiple servers config](https://iili.io/fmEdzEQ.md.png)

You can add **multiple servers** in the Tampermonkey script by editing the `SERVERS` list. Add as many as you want, and the UI will update automatically.  
Just make sure to also add each server’s IP or domain in the header using `// @connect YourIP` (like the localhost example), otherwise Tampermonkey will block the request.

## 🎬 Demo Video — How It Works

## 🎬 Demo Video — How It Works
[![Demo Video](https://img.youtube.com/vi/2A_cUIe8jIo/0.jpg)](https://www.youtube.com/watch?v=2A_cUIe8jIo)

## ⚙️ How It Works

The **Python script** creates the `.torrent` file, generates the description, makes a `latest.json` file with all data and starts a **temporary HTTP server** in that folder.

Then the **Tampermonkey script** pulls the `latest.json` file & torrent file from that server and automatically fills the upload page.

**Why an HTTP server?**  
Because this was mainly built to work with my **VPS (used as a Seedbox)**. Pulling files over HTTP to my local PC is fast, simple, and reliable for uploading.

Once you exit the script, the **temporary HTTP server stops automatically**.

## 📜 The Script

**1. Python Script** (Save as `main.py`)  
→ Source: https://github.com/xNabil/torrent-creator/blob/main/main.py

**2. Tampermonkey Script** (Add to Browser)  
→ Install: https://greasyfork.org/en/scripts/565356-torrent-autofill

## 🛠️ Requirements & Installation

**Requirements:**

- Python
- mkbrr
- FFmpeg
- MediaInfo

### 🪟 Windows

#### Automatic Installation

I made a batch script that installs **Python, mkbrr, FFmpeg, and MediaInfo** and automatically adds them to the system PATH.

Download `winsetup.cmd` from my GitHub repo:  
https://github.com/xNabil/torrent-creator/

Run it as **Administrator**. Admin rights are required to add everything to the system PATH.

You may need to run it **2–3 times**. (Because after installing a tool and adding it to PATH, the current CMD session doesn’t always refresh instantly.)

#### Manual Installation

**1) Install Python**  
Download: https://python.org  
Install it and make sure to tick **"Add Python to PATH"**

**Install required Python library**  
```bash
pip install requests
```

**2) Install mkbrr**  
Download: https://github.com/autobrr/mkbrr/releases  
Get: `mkbrr_1.20.0_windows_x86_64.zip`  
Extract it and copy `mkbrr.exe` to `C:\Windows`

**Verify:**  
```bash
mkbrr --help
```

**3) Install FFmpeg**  
```bash
winget install -e --id Gyan.FFmpeg.Essentials --accept-package-agreements --accept-source-agreements
```

**Check:**  
```bash
ffmpeg -version
ffprobe -version
```

**4) Install MediaInfo**  
```bash
winget install -e --id MediaArea.MediaInfo --accept-package-agreements --accept-source-agreements
```

**Check:**  
```bash
mediainfo --Version
```

### 🐧 Linux / VPS (Debian/Ubuntu) (One-line)

```bash
sudo apt update && sudo apt install -y python3 python3-requests ffmpeg mediainfo xclip curl && \
curl -L https://github.com/autobrr/mkbrr/releases/latest/download/mkbrr-linux-amd64 -o /usr/local/bin/mkbrr && \
chmod +x /usr/local/bin/mkbrr
```

## ✅ That’s it

## ⚡ Usage Guide

**Step 1: Open the Upload Page**  
https://www.torrentbd.net/torrents-upload.php

![Upload page dashboard](https://iili.io/fm0BiUQ.png)

**Step 2: Run the Python Script**

```bash
python main.py
```

Select your video file or folder. The script will automatically generate screenshots, create the `.torrent` file, and start a local server.

![Script running](https://iili.io/fm0BQ5B.png)

**Step 3: Sync in Browser**  
Go back to the upload page. You will see the dashboard fill in the **title, description, and .torrent file** automatically.

**Note:** The title is taken from your file/folder name, so make sure everything is correct before uploading.

![Filled form](https://iili.io/fm0BLJV.png)

**TMDB Search**  
Click the TMDB search button to open a mini IMDb/TMDB popup. Search and select your title — it will automatically fill the link, fetch the cover image, compress it under **256KB (JPG)**, and set it as the torrent cover.

![TMDB popup 1](https://iili.io/fm0NlnI.png)  
![TMDB popup 2](https://iili.io/fm0BZOP.png)

**Cleanup**  
After you exit the script, it will stop the HTTP server and delete the `latest.json` file automatically.
```
