// ==UserScript==
// @name         Torrent Autofill
// @namespace    http://tampermonkey.net/
// @version      21.0
// @description  Compact Dashboard + Header Icons + IMDb + Smart Fetch
// @author       xnabil (JOYBOY)
// @match        https://www.torrentbd.net/torrents-upload.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      imdb.com
// @connect      media-imdb.com
// @connect      amazon.com
// @connect      images-na.ssl-images-amazon.com
// @connect      m.media-amazon.com
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    // Add as many as you want. The UI updates automatically.
    // (You also need to add the IP in the top like in line 17 "// @connect YourIP")
    const SERVERS = {
        "Localhost": "http://localhost:8090",
     // Example  "Backup Laptop": "http://192.168.1.50:8090",
    };

    const MAX_IMG_SIZE = 256 * 1024; // 256 KB

    // --- STATE ---
    let settings = {
        autoRefresh: GM_getValue('autoRefresh', false),
        autoCover: GM_getValue('autoCover', true),
        minimized: GM_getValue('minimized', false)
    };
    let refreshInterval = null;
    let isProcessing = false;

    // --- CSS ---
    GM_addStyle(`
        :root { --taf-bg: rgba(15, 23, 42, 0.95); --taf-border: rgba(255,255,255,0.1); --taf-text: #e2e8f0; --taf-primary: #38bdf8; --taf-success: #22c55e; --taf-error: #ef4444; }
        @keyframes tafSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes tafFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tafZoom { from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }

        /* COMPACT PANEL */
        #taf-panel {
            position: fixed; bottom: 20px; right: 20px; width: 240px;
            background: var(--taf-bg); border: 1px solid var(--taf-border);
            border-radius: 12px; z-index: 9999; font-family: 'Segoe UI', sans-serif;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6); backdrop-filter: blur(10px);
            display: ${settings.minimized ? 'none' : 'block'};
            animation: tafSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* HEADER (The new control center) */
        .taf-head {
            padding: 10px 14px; border-bottom: 1px solid var(--taf-border);
            display: flex; justify-content: space-between; align-items: center;
            background: rgba(255,255,255,0.03); border-radius: 12px 12px 0 0;
        }
        .taf-head-left { display: flex; align-items: center; gap: 10px; }
        .taf-head-right { display: flex; align-items: center; gap: 12px; }

        /* ICONS */
        .taf-icon-btn { cursor: pointer; color: #94a3b8; transition: 0.2s; font-size: 14px; }
        .taf-icon-btn:hover { color: #fff; transform: scale(1.1); }

        /* STATUS DOT (The expander) */
        #taf-status-dot {
            width: 10px; height: 10px; border-radius: 50%; background: #475569;
            cursor: pointer; box-shadow: 0 0 0 2px rgba(255,255,255,0.05); transition: 0.3s;
        }
        #taf-status-dot.online { background: var(--taf-success); box-shadow: 0 0 8px var(--taf-success); }
        #taf-status-dot.offline { background: var(--taf-error); }

        .taf-title { font-weight: 700; color: var(--taf-primary); font-size: 12px; letter-spacing: 0.5px; user-select: none; }
        .taf-body { padding: 14px; }

        /* SERVER LIST (Hidden by default) */
        #taf-server-details {
            display: none; margin-bottom: 12px; border: 1px solid var(--taf-border);
            border-radius: 6px; overflow: hidden; background: rgba(0,0,0,0.3);
        }
        #taf-server-details.open { display: block; animation: tafFadeIn 0.2s; }

        .taf-server-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 6px 10px; border-bottom: 1px solid var(--taf-border); font-size: 11px; color: #cbd5e1;
        }
        .taf-server-row:last-child { border-bottom: none; }
        .taf-mini-dot { width: 6px; height: 6px; border-radius: 50%; background: #475569; }
        .taf-mini-dot.online { background: var(--taf-success); }
        .taf-mini-dot.offline { background: var(--taf-error); }

        /* CONTROLS */
        .taf-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; color: #cbd5e1; }
        .taf-switch { position: relative; width: 28px; height: 16px; }
        .taf-switch input { opacity: 0; width: 0; height: 0; }
        .taf-slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #334155; border-radius: 34px; transition: .2s; cursor: pointer; }
        .taf-slider:before { content: ""; position: absolute; height: 12px; width: 12px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: .2s; }
        input:checked + .taf-slider { background: var(--taf-primary); }
        input:checked + .taf-slider:before { transform: translateX(12px); }

        #taf-btn-pull {
            width: 100%; padding: 8px; background: var(--taf-primary); color: #0f172a;
            border: none; border-radius: 6px; cursor: pointer; font-weight: 700;
            font-size: 11px; text-transform: uppercase; margin-top: 5px; transition: filter 0.2s;
        }
        #taf-btn-pull:hover { filter: brightness(1.1); }

        #taf-file-input { display: none; }

        #taf-fab { position: fixed; bottom: 20px; right: 20px; width: 44px; height: 44px; background: var(--taf-bg); border: 1px solid var(--taf-border); border-radius: 50%; display: ${settings.minimized ? 'flex' : 'none'}; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; color: var(--taf-primary); font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: transform 0.2s; }
        #taf-fab:hover { transform: scale(1.1); }

        /* FIXED IMDB MODAL */
        #taf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: none !important; backdrop-filter: blur(2px); }
        #taf-overlay.show { display: block !important; animation: tafFadeIn 0.15s; }

        #taf-modal {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 450px; background: #1e293b; border: 1px solid #334155;
            border-radius: 12px; z-index: 10001; padding: 20px; display: none !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); flex-direction: column; max-height: 85vh;
        }
        #taf-modal.show { display: flex !important; animation: tafZoom 0.2s cubic-bezier(0.16, 1, 0.3, 1); }

        #taf-search-input { width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 12px; border-radius: 8px; font-size: 15px; outline: none; margin-bottom: 10px; box-sizing: border-box; }
        #taf-search-input:focus { border-color: var(--taf-primary); }
        #taf-results { overflow-y: auto; flex-grow: 1; padding-right: 5px; max-height: 60vh; }
        #taf-results::-webkit-scrollbar { width: 6px; }
        #taf-results::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

        .taf-res { display: flex; padding: 12px; cursor: pointer; border-bottom: 1px solid #334155; align-items: center; transition: 0.1s; border-radius: 6px; }
        .taf-res:hover { background: #334155; }
        .taf-res img { width: 40px; height: 56px; margin-right: 15px; object-fit: cover; border-radius: 4px; background: #000; }

        #taf-imdb-trigger { background: #f5c518; border: none; border-radius: 4px; padding: 0 12px; font-weight: 700; cursor: pointer; margin-left: 10px; height: 36px; color: #0f172a; transition: 0.1s; }
        #taf-imdb-trigger:hover { filter: brightness(1.1); }

        /* PREVIEW */
        #taf-cover-container { margin-top: 5px; display: none; text-align: left; padding-left: 5px; }
        #taf-cover-preview { display: inline-block; max-width: 100px; max-height: 140px; border: 2px solid var(--taf-primary); border-radius: 6px; cursor: zoom-in; box-shadow: 0 4px 8px rgba(0,0,0,0.4); }
        #taf-lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 2147483647; display: none; justify-content: center; align-items: center; }
        #taf-lightbox.active { display: flex; }
        #taf-lightbox img { max-width: 90vh; max-height: 90vh; border-radius: 4px; }
        #taf-lb-close { position: absolute; top: 20px; right: 30px; font-size: 40px; color: #fff; cursor: pointer; }
    `);

    // --- UI BUILDER ---
    function buildUI() {
        const fab = document.createElement('div');
        fab.id = 'taf-fab'; fab.innerHTML = '⚡';
        document.body.appendChild(fab);

        const panel = document.createElement('div');
        panel.id = 'taf-panel';

        // Dynamic Server List (Hidden initially)
        let serverListHtml = '';
        Object.keys(SERVERS).forEach(name => {
            serverListHtml += `
                <div class="taf-server-row">
                    <span>${name}</span>
                    <div class="taf-mini-dot" id="mini-status-${name}"></div>
                </div>`;
        });

        panel.innerHTML = `
            <div class="taf-head">
                <div class="taf-head-left">
                    <div id="taf-status-dot" title="Click to view servers"></div>
                    <span class="taf-title">AUTOFILL</span>
                </div>
                <div class="taf-head-right">
                    <div id="taf-upload-trigger" class="taf-icon-btn" title="Manual Upload">📂</div>
                    <div id="taf-close-panel" class="taf-icon-btn" title="Minimize">✕</div>
                </div>
            </div>
            <div class="taf-body">
                <div id="taf-server-details">
                    ${serverListHtml}
                </div>
                <div class="taf-row">
                    <span>Auto-Sync</span>
                    <label class="taf-switch"><input type="checkbox" id="t-auto" ${settings.autoRefresh ? 'checked' : ''}><span class="taf-slider"></span></label>
                </div>
                <div class="taf-row">
                    <span>Auto-Cover</span>
                    <label class="taf-switch"><input type="checkbox" id="t-cover" ${settings.autoCover ? 'checked' : ''}><span class="taf-slider"></span></label>
                </div>
                <button id="taf-btn-pull">Sync Now</button>
                <input type="file" id="taf-file-input" accept=".json,.torrent">
            </div>
        `;
        document.body.appendChild(panel);

        // Preview & Lightbox
        const lb = document.createElement('div');
        lb.id = 'taf-lightbox';
        lb.innerHTML = `<span id="taf-lb-close">×</span><div id="taf-lb-content"></div>`;
        document.body.appendChild(lb);

        const coverInputDiv = document.querySelector('input[name="image1"]').closest('.file-field');
        const previewDiv = document.createElement('div');
        previewDiv.id = 'taf-cover-container';
        previewDiv.innerHTML = `<img id="taf-cover-preview" src="" title="Click to Expand"><div style="font-size:10px; color:#64748b; margin-top:2px;" id="taf-cover-info"></div>`;
        coverInputDiv.parentNode.insertBefore(previewDiv, coverInputDiv.nextSibling);

        // --- EVENT LISTENERS ---
        const update = (k, v) => { settings[k] = v; GM_setValue(k, v); };
        const toggle = () => {
            const min = !settings.minimized;
            update('minimized', min);
            panel.style.display = min ? 'none' : 'block';
            fab.style.display = min ? 'flex' : 'none';
        };

        fab.onclick = toggle;
        document.getElementById('taf-close-panel').onclick = toggle;

        // Toggle Server List
        document.getElementById('taf-status-dot').onclick = () => {
            document.getElementById('taf-server-details').classList.toggle('open');
        };

        document.getElementById('t-auto').onchange = (e) => { update('autoRefresh', e.target.checked); handleAuto(); };
        document.getElementById('t-cover').onchange = (e) => update('autoCover', e.target.checked);
        document.getElementById('taf-btn-pull').onclick = () => scanServers(true);

        // Manual Upload via Icon
        const fileInput = document.getElementById('taf-file-input');
        document.getElementById('taf-upload-trigger').onclick = () => fileInput.click();
        fileInput.onchange = handleManualUpload;

        // Lightbox
        const closeLB = () => lb.classList.remove('active');
        document.getElementById('taf-cover-preview').onclick = (e) => {
            document.getElementById('taf-lb-content').innerHTML = `<img src="${e.target.src}">`;
            lb.classList.add('active');
        };
        document.getElementById('taf-lb-close').onclick = closeLB;
        lb.onclick = (e) => { if(e.target === lb) closeLB(); };
    }

    // --- MANUAL UPLOAD ---
    function handleManualUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    fillForm(data);
                    alert("✅ JSON Loaded!");
                } catch(err) { alert("❌ Invalid JSON"); }
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.torrent')) {
            const dt = new DataTransfer(); dt.items.add(file);
            const input = document.getElementById('myFile');
            input.files = dt.files;
            input.closest('.file-field').querySelector('.file-path').value = file.name;
            alert("✅ Torrent Attached!");
        }
        e.target.value = '';
    }

    // --- IMDB SEARCH (STRICT MODE) ---
    function injectImdbSearch() {
        const target = document.getElementById('imdb_url');
        const btn = document.createElement('button');
        btn.id = 'taf-imdb-trigger'; btn.innerText = 'IMDb Search'; btn.type = 'button';
        target.parentNode.insertBefore(btn, target.nextSibling);

        const overlay = document.createElement('div'); overlay.id = 'taf-overlay';
        const modal = document.createElement('div'); modal.id = 'taf-modal';
        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; width:100%;">
                <span style="font-weight:700; color:#f5c518; font-size:16px;">IMDb Search</span>
                <span id="taf-modal-close" style="cursor:pointer; color:#94a3b8;">✕</span>
            </div>
            <input type="text" id="taf-search-input" placeholder="Type title..." autocomplete="off">
            <div id="taf-results"></div>
        `;
        document.body.append(overlay, modal);

        const close = () => {
            overlay.classList.remove('show');
            modal.classList.remove('show');
        };
        const open = () => {
            overlay.classList.add('show');
            modal.classList.add('show');
            const input = document.getElementById('taf-search-input');
            requestAnimationFrame(() => {
                input.focus();
                setTimeout(() => {
                    const val = document.getElementById('torrent_name').value;
                    if(val) {
                        const clean = val.replace(/(\.|-|\s)(2160p|1080p|720p|S\d+|E\d+|WEB|Bluray).*/i, '').replace(/[.-]/g, ' ');
                        if(input.value !== clean) { input.value = clean; doSearch(clean); }
                    }
                }, 50);
            });
        };

        btn.onclick = open;
        overlay.onclick = close;
        document.getElementById('taf-modal-close').onclick = close;

        let t;
        document.getElementById('taf-search-input').oninput = (e) => { clearTimeout(t); t = setTimeout(() => doSearch(e.target.value), 400); };
    }

    function doSearch(q) {
        if(q.length<3) return;
        GM_xmlhttpRequest({
            method: "GET", url: `https://v3.sg.media-imdb.com/suggestion/${q[0].toLowerCase()}/${encodeURIComponent(q)}.json`,
            onload: (res) => {
                const d = JSON.parse(res.responseText);
                const div = document.getElementById('taf-results');
                div.innerHTML = '';
                (d.d||[]).forEach(i => {
                    const row = document.createElement('div'); row.className = 'taf-res';
                    const img = i.i ? i.i.imageUrl : '';
                    row.innerHTML = `<img src="${img}"><div><b>${i.l}</b><br><small style="color:#64748b">${i.y||''} • ${i.q||''}</small></div>`;
                    row.onclick = () => { selectImdb(i); document.getElementById('taf-overlay').click(); };
                    div.appendChild(row);
                });
            }
        });
    }

    function selectImdb(item) {
        const field = document.getElementById('imdb_url');
        field.value = `https://www.imdb.com/title/${item.id}/`;
        field.dispatchEvent(new Event('input'));
        if (settings.autoCover && item.i && item.i.imageUrl) processCoverImage(item.i.imageUrl);
        document.getElementById('taf-overlay').click();
    }

    // --- COVER PROCESSING ---
    function processCoverImage(url) {
        const cleanUrl = url.split("._V1_")[0];
        const targetUrl = cleanUrl + "._V1_SX600.jpg";

        GM_xmlhttpRequest({
            method: "GET", url: targetUrl, responseType: "blob",
            onload: (res) => {
                if (res.status === 200 && res.response.size > 0) handleImageBlob(res.response);
                else {
                    GM_xmlhttpRequest({
                        method: "GET", url: url, responseType: "blob",
                        onload: (r2) => { if (r2.status === 200) handleImageBlob(r2.response); }
                    });
                }
            }
        });
    }

    function handleImageBlob(blob) {
        if (blob.size <= MAX_IMG_SIZE) injectCoverFile(blob);
        else compressImage(blob);
    }

    function compressImage(blob) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_W = 800;
            let w = img.width; let h = img.height;
            if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; }
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob((newBlob) => {
                if (!newBlob || newBlob.size > MAX_IMG_SIZE) {
                    canvas.toBlob((finalBlob) => injectCoverFile(finalBlob), 'image/jpeg', 0.65);
                } else { injectCoverFile(newBlob); }
            }, 'image/jpeg', 0.85);
            URL.revokeObjectURL(url);
        };
    }

    function injectCoverFile(blob) {
        if(!blob) return;
        const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
        const dt = new DataTransfer(); dt.items.add(file);

        const input = document.querySelector('input[name="image1"]');
        input.files = dt.files;
        input.closest('.file-field').querySelector('.file-path').value = "cover.jpg";

        const preview = document.getElementById('taf-cover-preview');
        document.getElementById('taf-cover-container').style.display = 'block';
        document.getElementById('taf-cover-info').textContent = `${(blob.size/1024).toFixed(1)} KB`;
        preview.src = URL.createObjectURL(blob);
    }

    // --- SYNC LOGIC ---
    function updateStatus(name, isOnline) {
        const miniDot = document.getElementById(`mini-status-${name}`);
        if (miniDot) miniDot.className = `taf-mini-dot ${isOnline ? 'online' : 'offline'}`;

        // Update Main Status Dot (Green if ANY server is online)
        const mainDot = document.getElementById('taf-status-dot');
        const anyOnline = document.querySelector('.taf-mini-dot.online');
        mainDot.className = anyOnline ? 'online' : 'offline';
    }

    function scanServers(manual = false) {
        if (isProcessing) return;
        if (manual) document.getElementById('taf-btn-pull').textContent = "...";

        let foundSource = false;

        Object.entries(SERVERS).forEach(([name, url]) => {
            GM_xmlhttpRequest({
                method: "GET", url: `${url}/latest.json?t=${Date.now()}`, timeout: 2000,
                onload: (res) => {
                    if (res.status === 200) {
                        updateStatus(name, true);
                        if (!foundSource && !isProcessing) {
                            foundSource = true;
                            const data = JSON.parse(res.responseText);
                            fetchTorrentAndFill(url, data, manual);
                        }
                    } else updateStatus(name, false);
                },
                onerror: () => updateStatus(name, false),
                ontimeout: () => updateStatus(name, false)
            });
        });

        setTimeout(() => { if(manual) document.getElementById('taf-btn-pull').textContent = "Sync Now"; }, 1000);
    }

    function fetchTorrentAndFill(baseUrl, data, manual) {
        const tInput = document.getElementById('torrent_name');
        const cleanTitle = data.title.replace(/\.(mkv|mp4|avi|webm|ts|m4v)$/i, "");
        if (tInput.value === cleanTitle && !manual) return;

        isProcessing = true;
        fillForm(data);

        // --- NEW EFFICIENT LOGIC: Use specific torrent filename from JSON ---
        const torrentFileName = data.torrentFile || "latest.torrent";
        const downloadUrl = `${baseUrl}/${encodeURIComponent(torrentFileName)}?t=${Date.now()}`;

        GM_xmlhttpRequest({
            method: "GET", url: downloadUrl, responseType: 'blob',
            onload: (r) => {
                const f = new File([r.response], torrentFileName, {type: "application/x-bittorrent"});
                const dt = new DataTransfer(); dt.items.add(f);
                const fInput = document.getElementById('myFile');
                fInput.files = dt.files;
                fInput.closest('.file-field').querySelector('.file-path').value = f.name;
                isProcessing = false;

                if (settings.autoRefresh) {
                    settings.autoRefresh = false;
                    GM_setValue('autoRefresh', false);
                    document.getElementById('t-auto').checked = false;
                    handleAuto();
                }
            }
        });
    }

    function fillForm(data) {
        const tInput = document.getElementById('torrent_name');
        const cleanTitle = data.title.replace(/\.(mkv|mp4|avi|webm|ts|m4v)$/i, "");
        tInput.value = cleanTitle; tInput.dispatchEvent(new Event('input'));

        const desc = document.getElementById('torr-descr');
        desc.value = data.description; desc.dispatchEvent(new Event('input'));
    }

    function handleAuto() {
        if (refreshInterval) clearInterval(refreshInterval);
        if (settings.autoRefresh) refreshInterval = setInterval(() => scanServers(false), 2000);
    }

    buildUI();
    injectImdbSearch();
    if (settings.autoRefresh) handleAuto();

})();
