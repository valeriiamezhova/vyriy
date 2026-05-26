// ==========================================
// 1. УПРАВЛІННЯ ВІКНАМИ ТА МЕНЮ (TOOLBAR)
// ==========================================

function toggleLayers() {
    const win = document.getElementById('layers-window');
    if (!win) return;
    const isOpen = win.style.display === 'block';
    win.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && typeof window.refreshLayersPanel === 'function') window.refreshLayersPanel();
}

function switchTab(btn, contentId) {
    const menu = btn.parentElement.closest('.dropdown-menu') ||
                 document.querySelector('.dropdown-menu[style*="block"]');
    if (menu) {
        menu.querySelectorAll('.dropdown-tab').forEach(t => t.classList.remove('active'));
        menu.querySelectorAll('.dropdown-tab-content').forEach(c => c.style.display = 'none');
    }
    btn.classList.add('active');
    const content = document.getElementById(contentId);
    if (content) content.style.display = 'block';
}

function toggleMenu(menuId) {
    const menus = ['blocks', 'media', 'bg', 'decor'];
    const targetId = 'menu-' + menuId;

    menus.forEach(id => {
        const m = document.getElementById('menu-' + id);
        if (m && 'menu-' + id !== targetId) {
            m.style.display = 'none';
            m.scrollTop = 0;
        }
        const btn = document.querySelector(`[onclick="toggleMenu('${id}')"]`);
        if (btn && 'menu-' + id !== targetId) btn.classList.remove('active');
    });

    const targetMenu = document.getElementById(targetId);
    if (targetMenu) {
        const isOpen = targetMenu.style.display === 'block';
        const activeBtn = document.querySelector(`[onclick="toggleMenu('${menuId}')"]`);
        if (!isOpen) {
            const rect = activeBtn.getBoundingClientRect();
            targetMenu.style.left = rect.left + 'px';
            targetMenu.style.top = (rect.bottom + 8) + 'px';
            targetMenu.scrollTop = 0;
        }
        targetMenu.style.display = isOpen ? 'none' : 'block';
        if (activeBtn) activeBtn.classList.toggle('active', !isOpen);
    }
}

// ==========================================
// 2. ТЕМА, ЗУМ ТА ДІЇ
// ==========================================

let isDarkTheme = false;
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    const icon = document.querySelector('.theme-icon-active');
    if (isDarkTheme) {
        icon.classList.remove('sun-icon');
        icon.classList.add('moon-icon');
        document.getElementById('theme-toggle').style.backgroundColor = '#163F5A';
        icon.style.backgroundColor = '#F6FBFF';
        document.body.classList.add('light-text-mode');
    } else {
        icon.classList.remove('moon-icon');
        icon.classList.add('sun-icon');
        document.getElementById('theme-toggle').style.backgroundColor = '#F6FBFF';
        icon.style.backgroundColor = '#163F5A';
        document.body.classList.remove('light-text-mode');
    }
}

let isZoomed = false;
function toggleZoom() {
    isZoomed = !isZoomed;
    const icon = document.getElementById('zoom-icon');
    const label = document.getElementById('zoom-label');
    const canvas = document.getElementById('page-canvas');
    if (isZoomed) {
        label.innerText = '50%';
        icon.classList.remove('zoom-out-icon');
        icon.classList.add('zoom-in-icon');
        canvas.style.transform = 'scale(0.5)';
        canvas.style.transformOrigin = 'top center';
    } else {
        label.innerText = '100%';
        icon.classList.remove('zoom-in-icon');
        icon.classList.add('zoom-out-icon');
        canvas.style.transform = 'scale(1)';
    }
}

// ==========================================
// ПОПЕРЕДНІЙ ПЕРЕГЛЯД
// ==========================================

function enterPreviewMode() {
    document.body.classList.add('preview-mode');
    document.body.classList.remove('editing-mode');
    const panel = document.getElementById('preview-panel');
    if (panel) panel.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitPreviewMode() {
    document.body.classList.remove('preview-mode');
    document.body.classList.add('editing-mode');
    const panel = document.getElementById('preview-panel');
    if (panel) panel.style.display = 'none';
}

// ==========================================
// ПУБЛІКАЦІЯ
// ==========================================

function openPublishModal() {
    document.getElementById('publish-modal').style.display = 'flex';
}

function closePublishModal() {
    document.getElementById('publish-modal').style.display = 'none';
}

function copyPublishUrl() {
    const urlEl = document.getElementById('publish-url-text');
    if (!urlEl) return;
    navigator.clipboard.writeText(urlEl.textContent).then(() => {
        const btn = document.querySelector('.publish-copy-btn');
        if (btn) { btn.textContent = 'Скопійовано'; setTimeout(() => { btn.textContent = 'Копіювати'; }, 2000); }
    });
}

// ==========================================
// UNDO / REDO
// ==========================================

const _undoStack = [];
const _redoStack = [];

function _captureState() {
    const canvas = document.getElementById('page-canvas');
    if (!canvas) return null;
    return {
        html: canvas.innerHTML,
        bg:        canvas.style.background,
        bgImg:     canvas.style.backgroundImage,
        bgSize:    canvas.style.backgroundSize,
        bgPos:     canvas.style.backgroundPosition,
    };
}

function saveState() {
    const state = _captureState();
    if (!state) return;
    // avoid saving identical consecutive states
    if (_undoStack.length && _undoStack[_undoStack.length - 1].html === state.html) return;
    _undoStack.push(state);
    if (_undoStack.length > 30) _undoStack.shift();
    _redoStack.length = 0;
    _updateUndoRedoBtns();
}

function _restoreState(state) {
    const canvas = document.getElementById('page-canvas');
    if (!canvas || !state) return;
    canvas.innerHTML = state.html;
    canvas.style.background        = state.bg;
    canvas.style.backgroundImage   = state.bgImg;
    canvas.style.backgroundSize    = state.bgSize;
    canvas.style.backgroundPosition = state.bgPos;
    _reinitAfterRestore();
    _updateUndoRedoBtns();
}

function _reinitAfterRestore() {
    // clear UI state
    if (typeof selectedBlock !== 'undefined') selectedBlock = null;
    if (typeof selectedSticker !== 'undefined') selectedSticker = null;
    if (typeof selectedPhoto !== 'undefined') selectedPhoto = null;
    const bt = document.getElementById('block-toolbar');
    if (bt) bt.style.display = 'none';
    const st = document.getElementById('sticker-toolbar');
    if (st) st.style.display = 'none';
    if (window.removeAllHandles) window.removeAllHandles();

    // re-init blocks — reset guard so initNewBlock re-binds events on restored nodes
    document.querySelectorAll('.page-editable-block').forEach(block => {
        block._blockInit = false;
        if (window.initNewBlock) window.initNewBlock(block);
    });

    // re-init stickers — reset drag guard too
    document.querySelectorAll('.page-sticker, .hero-building-sticker, .memory-tree-sticker').forEach(sticker => {
        sticker.style.pointerEvents = 'auto';
        sticker.style.cursor = 'grab';
        if (!sticker.style.zIndex) sticker.style.zIndex = 10;
        sticker._dragInit = false;
        if (window.moveToCanvas) window.moveToCanvas(sticker);
        if (window.addStickerDrag) window.addStickerDrag(sticker);
    });

    // re-init photos
    document.querySelectorAll('.photo-img').forEach(img => {
        img._photoInit = false;
        img._photoInit = true;
        if (window.bindPhotoClick) window.bindPhotoClick(img);
        if (window.bindPhotoDrag) window.bindPhotoDrag(img);
    });

    // re-init frame drops — reset guards
    document.querySelectorAll('.sticker-frame').forEach(f => {
        f._frameDropInit = false;
        if (window.initFrameDrop) window.initFrameDrop(f);
    });
    document.querySelectorAll('.hero-photo, .memory-photo').forEach(f => {
        f._photoDropInit = false;
        if (window.initPhotoFrameDrop) window.initPhotoFrameDrop(f, false);
    });
    document.querySelectorAll('.video-player').forEach(f => {
        f._photoDropInit = false;
        if (window.initPhotoFrameDrop) window.initPhotoFrameDrop(f, true);
    });

    if (window.clipStickersToCanvas) window.clipStickersToCanvas();
    if (window.refreshLayersPanel) window.refreshLayersPanel();
}

function _updateUndoRedoBtns() {
    const undoBtn = document.querySelector('[onclick="undoAction()"]');
    const redoBtn = document.querySelector('[onclick="redoAction()"]');
    if (undoBtn) undoBtn.disabled = _undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = _redoStack.length === 0;
}

function undoAction() {
    if (_undoStack.length === 0) return;
    _redoStack.push(_captureState());
    _restoreState(_undoStack.pop());
}

function redoAction() {
    if (_redoStack.length === 0) return;
    _undoStack.push(_captureState());
    _restoreState(_redoStack.pop());
}

// ==========================================
// 3. МОДАЛЬНЕ ВІКНО "ПОДІЛИТИСЯ"
// ==========================================

let currentLockStatus = 'open';
let currentAccessStatus = 'viewer';

function openShare() {
    const modal = document.getElementById('share-modal');
    const overlay = document.getElementById('share-overlay');
    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }
    const panel = document.getElementById('preview-panel');
    if (panel) panel.style.display = 'none';
}

function closeShare() {
    const modal = document.getElementById('share-modal');
    const overlay = document.getElementById('share-overlay');
    if (modal && overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }
    if (document.body.classList.contains('preview-mode')) {
        const panel = document.getElementById('preview-panel');
        if (panel) panel.style.display = 'flex';
    }
}

function toggleLockMenu() {
    const dropdown = document.getElementById('share-lock-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' ? 'block' : 'none';
    }
    const accessDropdown = document.getElementById('share-access-dropdown');
    if (accessDropdown) accessDropdown.style.display = 'none';
}

function toggleAccessMenu() {
    const dropdown = document.getElementById('share-access-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' ? 'block' : 'none';
    }
    const lockDropdown = document.getElementById('share-lock-dropdown');
    if (lockDropdown) lockDropdown.style.display = 'none';
}

function updateAccessDescription() {
    const descText = document.getElementById('share-access-desc');
    if (!descText) return;
    if (currentLockStatus === 'closed') {
        descText.innerText = 'Лише користувачі з доступом можуть переходити за цим посиланням';
    } else {
        descText.innerText = currentAccessStatus === 'editor'
            ? 'Усі користувачі, які мають це посилання, можуть редагувати'
            : 'Усі користувачі, які мають це посилання, можуть переглядати';
    }
}

function setLock(status) {
    currentLockStatus = status;
    const label = document.getElementById('lock-label');
    const icon = document.getElementById('lock-icon');
    const iconWrap = document.getElementById('lock-icon-wrap');
    const accessSelectBtn = document.getElementById('share-access-select');
    const dropdown = document.getElementById('share-lock-dropdown');
    if (status === 'open') {
        if (label) label.innerText = 'Усі, хто має посилання';
        if (icon) icon.className = 'btn-icon lock-open-icon';
        if (iconWrap) iconWrap.className = 'share-access-icon-wrap open';
        if (accessSelectBtn) accessSelectBtn.style.visibility = 'visible';
    } else if (status === 'closed') {
        if (label) label.innerText = 'Обмежений доступ';
        if (icon) icon.className = 'btn-icon lock-closed-icon';
        if (iconWrap) iconWrap.className = 'share-access-icon-wrap closed';
        if (accessSelectBtn) accessSelectBtn.style.visibility = 'hidden';
    }
    updateAccessDescription();
    if (dropdown) dropdown.style.display = 'none';
}

function setAccess(role) {
    currentAccessStatus = role;
    const label = document.getElementById('access-label');
    const dropdown = document.getElementById('share-access-dropdown');
    if (role === 'viewer') {
        if (label) label.innerText = 'Може переглядати';
    } else if (role === 'editor') {
        if (label) label.innerText = 'Може редагувати';
    }
    updateAccessDescription();
    if (dropdown) dropdown.style.display = 'none';
}

// ==========================================
// 4. ІНІЦІАЛІЗАЦІЯ DOM
// ==========================================

document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // ПАНЕЛЬ БЛОКІВ
    // ==========================================

    const blockToolbar = document.getElementById('block-toolbar');
    let selectedBlock = null;

    function selectBlock(block) {
        document.querySelectorAll('.page-editable-block').forEach(b => b.classList.remove('selected'));
        block.classList.add('selected');
        selectedBlock = block;
        const rect = block.getBoundingClientRect();
        blockToolbar.style.display = 'flex';
        blockToolbar.style.position = 'fixed';
        blockToolbar.style.top = (rect.top - 44) + 'px';
        blockToolbar.style.left = (rect.right - 120) + 'px';
        if (typeof positionAddBlockBtn === 'function') positionAddBlockBtn(block);
    }

    document.querySelectorAll('.page-editable-block').forEach(block => {
        block._blockInit = true;
        block.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.stopPropagation();
            selectBlock(this);
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.page-editable-block') &&
            !e.target.closest('.block-toolbar') &&
            !e.target.closest('.add-block-btn') &&
            !e.target.closest('.quick-add-menu')) {
            document.querySelectorAll('.page-editable-block').forEach(b => b.classList.remove('selected'));
            if (blockToolbar) blockToolbar.style.display = 'none';
            selectedBlock = null;
            if (typeof addBlockBtn !== 'undefined') addBlockBtn.style.display = 'none';
        }
    });

    function getEditableBlockSiblings(block) {
        return Array.from(block.parentNode.children).filter(el => el.classList.contains('page-editable-block'));
    }

    function repositionBlockToolbar() {
        if (!selectedBlock) return;
        const rect = selectedBlock.getBoundingClientRect();
        blockToolbar.style.top = (rect.top - 44) + 'px';
        blockToolbar.style.left = (rect.right - 120) + 'px';
        if (typeof positionAddBlockBtn === 'function') positionAddBlockBtn(selectedBlock);
    }

    document.getElementById('btn-move-up').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedBlock) return;
        const siblings = getEditableBlockSiblings(selectedBlock);
        const idx = siblings.indexOf(selectedBlock);
        if (idx > 0) {
            saveState();
            selectedBlock.parentNode.insertBefore(selectedBlock, siblings[idx - 1]);
            repositionBlockToolbar();
        }
    });

    document.getElementById('btn-move-down').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedBlock) return;
        const siblings = getEditableBlockSiblings(selectedBlock);
        const idx = siblings.indexOf(selectedBlock);
        if (idx < siblings.length - 1) {
            saveState();
            selectedBlock.parentNode.insertBefore(siblings[idx + 1], selectedBlock);
            repositionBlockToolbar();
        }
    });

    document.getElementById('btn-delete-block').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedBlock) return;
        saveState();
        selectedBlock.remove();
        blockToolbar.style.display = 'none';
        selectedBlock = null;
    });

    // ==========================================
    // TOOLBAR ДЛЯ ФОТО
    // ==========================================

    const imgToolbar = document.createElement('div');
    imgToolbar.className = 'img-toolbar';
    imgToolbar.id = 'img-toolbar-photos';
    imgToolbar.innerHTML = `
        <button class="img-toolbar-btn" id="btn-photo-crop" title="Кадрувати">
            <span class="btn-icon crop-icon"></span>
        </button>
        <button class="img-toolbar-btn" id="btn-photo-rotate" title="Перевернути">
            <span class="btn-icon rotate-icon"></span>
        </button>
        <div class="block-toolbar-divider"></div>
        <button class="img-toolbar-btn" id="btn-photo-scale" title="Масштаб">
            <span class="btn-icon maximize-2-icon"></span>
        </button>
        <button class="img-toolbar-btn img-toolbar-btn-delete" id="btn-photo-delete" title="Видалити">
            <span class="btn-icon trash-icon"></span>
        </button>
    `;
    imgToolbar.style.display = 'none';
    imgToolbar.style.position = 'fixed';
    imgToolbar.style.zIndex = '10005';
    document.body.appendChild(imgToolbar);

    let selectedPhoto = null;
    let photoRotation = 0;
    let scaleMode = false;
    let scaleClone = null;

    function bindPhotoClick(img) {
        img.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            if (scaleMode) return;
            e.stopPropagation();
            deselectAllStickers();
            selectedPhoto = this;
            const rect = this.getBoundingClientRect();
            imgToolbar.style.display = 'flex';
            imgToolbar.style.top = (rect.top + 8) + 'px';
            imgToolbar.style.left = (rect.left + 8) + 'px';
        });
    }

    document.querySelectorAll('.photo-img').forEach(img => bindPhotoClick(img));

    document.getElementById('btn-photo-crop').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedPhoto) return;
        enterCropMode(selectedPhoto);
    });

    document.getElementById('btn-photo-rotate').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedPhoto) return;
        photoRotation = (photoRotation + 90) % 360;
        const currentScale = selectedPhoto.dataset.scale ? parseFloat(selectedPhoto.dataset.scale) / 100 : 1;
        selectedPhoto.style.transform = `scale(${currentScale}) rotate(${photoRotation}deg)`;
        selectedPhoto.style.transformOrigin = 'center center';
    });

    // ==========================================
    // OVERLAY ДЛЯ РЕЖИМУ СКЕЙЛУ
    // ==========================================

    function createScaleOverlay(frame) {
        removeScaleOverlay();
        const rect = frame.getBoundingClientRect();
        const t = rect.top;
        const b = rect.bottom;
        const l = rect.left;
        const r = rect.right;
        const w = window.innerWidth;
        const h = window.innerHeight;

        const overlay = document.createElement('div');
        overlay.id = 'scale-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 10002;
        `;
        overlay.style.background = `
            linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)) no-repeat 0 0 / ${w}px ${t}px,
            linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)) no-repeat 0 ${b}px / ${w}px ${h - b}px,
            linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)) no-repeat 0 ${t}px / ${l}px ${b - t}px,
            linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)) no-repeat ${r}px ${t}px / ${w - r}px ${b - t}px
        `;

        const border = document.createElement('div');
        border.id = 'scale-border';
        border.style.cssText = `
            position: fixed;
            top: ${t}px;
            left: ${l}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 2px solid #BAE3FF;
            border-radius: 16px;
            pointer-events: none;
            z-index: 10003;
            box-sizing: border-box;
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(border);
    }

    function removeScaleOverlay() {
        const overlay = document.getElementById('scale-overlay');
        const border = document.getElementById('scale-border');
        if (overlay) overlay.remove();
        if (border) border.remove();
    }

    // ==========================================
    // КАДРУВАННЯ (CROP)
    // ==========================================

    let cropMode = false, cropTarget = null, cropDragState = null;
    let cropBox = {}, cropImgBounds = {}, cropImgElRect = {};

    function enterCropMode(img) {
        if (cropMode) exitCropMode();
        cropMode = true;
        cropTarget = img;
        imgToolbar.style.display = 'none';
        stickerToolbar.style.display = 'none';

        // Знімаємо handle-кружечки стікера і clipPath щоб не заважали crop UI
        removeAllHandles();
        img.style.clipPath = '';

        const isPhotoInFrame = img.classList.contains('photo-img');
        const scrollAnchor = (isPhotoInFrame && img.parentElement)
            ? img.parentElement.getBoundingClientRect()
            : img.getBoundingClientRect();
        const stickyOff = getStickyBottom();
        const anchorCenter = scrollAnchor.top + scrollAnchor.height / 2;
        const targetCenter = (window.innerHeight + stickyOff) / 2;
        window.scrollTo(0, window.scrollY + anchorCenter - targetCenter);

        setTimeout(function () {
            buildCropUI(img, isPhotoInFrame);
            document.body.style.overflow = 'hidden';
        }, 50);
    }

    function buildCropUI(img, isPhotoInFrame) {
        const r = img.getBoundingClientRect();
        const stickyBottom = getStickyBottom();

        cropImgElRect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };

        // Visible bounds: для photo — перетин з frame-parent; для стікерів — власні bounds
        let visL = r.left, visT = r.top, visR = r.right, visB = r.bottom;
        if (isPhotoInFrame && img.parentElement) {
            const pr = img.parentElement.getBoundingClientRect();
            visL = Math.max(visL, pr.left);
            visT = Math.max(visT, pr.top);
            visR = Math.min(visR, pr.right);
            visB = Math.min(visB, pr.bottom);
        }
        // Кламп до видимого viewport (header + toolbar)
        visT = Math.max(visT, stickyBottom + 4);
        visB = Math.min(visB, window.innerHeight - 4);
        visL = Math.max(visL, 4);
        visR = Math.min(visR, window.innerWidth - 4);

        cropImgBounds = { left: visL, top: visT, right: visR, bottom: visB };
        cropBox = { ...cropImgBounds };

        const dark = document.createElement('div');
        dark.id = 'crop-dark';
        dark.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:20001;';
        document.body.appendChild(dark);

        const sel = document.createElement('div');
        sel.id = 'crop-sel';
        sel.style.cssText = 'position:fixed;box-sizing:border-box;border:1.5px solid #BAE3FF;cursor:move;z-index:20002;';

        // thirds grid lines
        [[1,0],[2,0],[0,1],[0,2]].forEach(([ci,ri]) => {
            const l = document.createElement('div');
            l.style.cssText = ci
                ? `position:absolute;width:1px;height:100%;top:0;left:${ci*33.33}%;background:rgba(186,227,255,0.25);pointer-events:none;`
                : `position:absolute;height:1px;width:100%;left:0;top:${ri*33.33}%;background:rgba(186,227,255,0.25);pointer-events:none;`;
            sel.appendChild(l);
        });

        // 8 handles (4 corner square + 4 edge round)
        const cursors = { nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize' };
        const positions = {
            nw:'top:-5px;left:-5px', n:'top:-5px;left:calc(50% - 5px)',
            ne:'top:-5px;right:-5px', e:'top:calc(50% - 5px);right:-5px',
            se:'bottom:-5px;right:-5px', s:'bottom:-5px;left:calc(50% - 5px)',
            sw:'bottom:-5px;left:-5px', w:'top:calc(50% - 5px);left:-5px'
        };
        'nw n ne e se s sw w'.split(' ').forEach(function(p) {
            const h = document.createElement('div');
            h.className = 'crop-h';
            h.dataset.p = p;
            const isCorner = p.length === 2;
            h.style.cssText = `position:absolute;width:10px;height:10px;background:#BAE3FF;border-radius:${isCorner?'2px':'50%'};cursor:${cursors[p]};${positions[p]};`;
            h.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                cropDragState = { type:'handle', pos:p, startX:e.clientX, startY:e.clientY, box:{...cropBox} };
            });
            sel.appendChild(h);
        });

        sel.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('crop-h')) return;
            e.preventDefault(); e.stopPropagation();
            cropDragState = { type:'move', startX:e.clientX, startY:e.clientY, box:{...cropBox} };
        });
        document.body.appendChild(sel);

        const btn = document.createElement('button');
        btn.id = 'crop-ok-btn';
        btn.innerHTML = '<span class="btn-icon check-icon"></span>';
        btn.style.cssText = 'position:fixed;z-index:20003;width:36px;height:36px;border-radius:50%;border:none;background:#163F5A;cursor:pointer;display:flex;align-items:center;justify-content:center;';
        btn.addEventListener('click', function(e) { e.stopPropagation(); applyCrop(); });
        document.body.appendChild(btn);

        document.addEventListener('keydown', onCropKey);
        updateCropUI();
    }

    function updateCropUI() {
        const dark = document.getElementById('crop-dark');
        const sel  = document.getElementById('crop-sel');
        const btn  = document.getElementById('crop-ok-btn');
        if (!dark) return;
        const { left:l, top:t, right:r, bottom:b } = cropBox;
        const W = window.innerWidth, H = window.innerHeight;
        dark.style.background = `
            linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)) no-repeat 0 0/${W}px ${t}px,
            linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)) no-repeat 0 ${b}px/${W}px ${H-b}px,
            linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)) no-repeat 0 ${t}px/${l}px ${b-t}px,
            linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)) no-repeat ${r}px ${t}px/${W-r}px ${b-t}px
        `;
        if (sel) { sel.style.left=l+'px'; sel.style.top=t+'px'; sel.style.width=(r-l)+'px'; sel.style.height=(b-t)+'px'; }
        if (btn) { btn.style.left=(r-36)+'px'; btn.style.top=(b+8)+'px'; }
    }

    document.addEventListener('mousemove', function(e) {
        if (!cropDragState) return;
        const dx = e.clientX - cropDragState.startX;
        const dy = e.clientY - cropDragState.startY;
        const { left:bl, top:bt, right:br, bottom:bb } = cropDragState.box;
        const { left:il, top:it, right:ir, bottom:ib } = cropImgBounds;
        const MIN = 20;
        if (cropDragState.type === 'move') {
            const bw = br-bl, bh = bb-bt;
            cropBox.left   = Math.max(il, Math.min(ir-bw, bl+dx));
            cropBox.top    = Math.max(it, Math.min(ib-bh, bt+dy));
            cropBox.right  = cropBox.left + bw;
            cropBox.bottom = cropBox.top  + bh;
        } else {
            const p = cropDragState.pos;
            let { left, top, right, bottom } = cropDragState.box;
            if (p.includes('w')) left   = Math.max(il, Math.min(right-MIN,  bl+dx));
            if (p.includes('e')) right  = Math.min(ir, Math.max(left+MIN,   br+dx));
            if (p.includes('n')) top    = Math.max(it, Math.min(bottom-MIN, bt+dy));
            if (p.includes('s')) bottom = Math.min(ib, Math.max(top+MIN,    bb+dy));
            cropBox = { left, top, right, bottom };
        }
        updateCropUI();
    });

    document.addEventListener('mouseup', function() { if (cropDragState) cropDragState = null; });

    function onCropKey(e) {
        if (e.key === 'Escape') exitCropMode();
        if (e.key === 'Enter') applyCrop();
    }

    function applyCrop() {
        if (!cropTarget) return;
        const img = cropTarget;
        const ir  = cropImgElRect;
        const natW = img.naturalWidth, natH = img.naturalHeight;
        const boxW = ir.right - ir.left, boxH = ir.bottom - ir.top;
        const fit  = img.style.objectFit || window.getComputedStyle(img).objectFit || 'cover';

        let sx = 0, sy = 0, scX, scY;
        if (fit === 'cover') {
            const sc = Math.max(boxW/natW, boxH/natH);
            sx = (boxW - natW*sc)/2; sy = (boxH - natH*sc)/2; scX = scY = sc;
        } else if (fit === 'contain') {
            const sc = Math.min(boxW/natW, boxH/natH);
            sx = (boxW - natW*sc)/2; sy = (boxH - natH*sc)/2; scX = scY = sc;
        } else {
            scX = boxW/natW; scY = boxH/natH;
        }

        const cx = Math.max(0, Math.round((cropBox.left - ir.left - sx) / scX));
        const cy = Math.max(0, Math.round((cropBox.top  - ir.top  - sy) / scY));
        const cw = Math.max(1, Math.min(natW-cx, Math.round((cropBox.right  - cropBox.left) / scX)));
        const ch = Math.max(1, Math.min(natH-cy, Math.round((cropBox.bottom - cropBox.top)  / scY)));

        // Для стікерів — зберігаємо поточні розміри до оновлення src
        const savedW = img.offsetWidth;
        const savedH = img.offsetHeight;

        // Знімаємо clipPath (може бути від clipStickersToCanvas) щоб canvas читав повне зображення
        const prevClipPath = img.style.clipPath;
        img.style.clipPath = '';

        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        try {
            canvas.getContext('2d').drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
            img.src = canvas.toDataURL('image/png');
        } catch (e) {
            img.style.clipPath = prevClipPath;
            console.warn('Crop failed (CORS?):', e);
            exitCropMode();
            return;
        }

        if (img.classList.contains('photo-img')) {
            img.style.position  = '';
            img.style.left      = '';
            img.style.top       = '';
            img.style.width     = '100%';
            img.style.height    = '100%';
            img.style.objectFit = 'cover';
            img.style.maxWidth  = '';
            img.style.maxHeight = '';
            img.style.transform = '';
        } else {
            // стікер: розмір = розмір рамки кадрування (cropBox у viewport px)
            const newW = cropBox.right  - cropBox.left;
            const newH = cropBox.bottom - cropBox.top;
            img.style.width     = newW + 'px';
            img.style.height    = newH + 'px';
            img.style.objectFit = 'contain';
        }
        exitCropMode();
    }

    function exitCropMode() {
        cropMode = false; cropTarget = null; cropDragState = null;
        document.removeEventListener('keydown', onCropKey);
        ['crop-dark','crop-sel','crop-ok-btn'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        document.body.style.overflow = '';
        if (typeof window.clipStickersToCanvas === 'function') window.clipStickersToCanvas();
    }

    // ==========================================
    // СЛАЙДЕР МАСШТАБУ
    // ==========================================

    const scaleSliderWrap = document.createElement('div');
    scaleSliderWrap.className = 'scale-slider-wrap';
    scaleSliderWrap.innerHTML = `
        <input type="range" class="scale-slider" min="50" max="200" value="100" step="1">
        <span class="scale-value">100%</span>
        <button class="scale-confirm-btn" title="Готово">
            <span class="btn-icon check-icon"></span>
        </button>
    `;
    scaleSliderWrap.style.display = 'none';
    scaleSliderWrap.style.position = 'fixed';
    scaleSliderWrap.style.zIndex = '10004';
    document.body.appendChild(scaleSliderWrap);

    function positionScaleSlider(frame) {
        const rect = frame.getBoundingClientRect();
        scaleSliderWrap.style.left = rect.left + 'px';
        scaleSliderWrap.style.width = rect.width + 'px';
        scaleSliderWrap.style.bottom = (window.innerHeight - rect.bottom) + 'px';
        scaleSliderWrap.style.top = 'auto';
    }

    function closeScaleSlider() {
        if (!scaleMode) return;
        scaleMode = false;
        if (selectedPhoto) {
            const parent = selectedPhoto.parentElement;
            if (parent) parent.classList.remove('scale-mode');
            selectedPhoto.style.pointerEvents = '';
            selectedPhoto.style.visibility = '';

            if (scaleClone && parent) {
                const frameRect = parent.getBoundingClientRect();
                const cloneRect = scaleClone.getBoundingClientRect();
                parent.style.position = 'relative';
                parent.style.overflow = 'hidden';
                selectedPhoto.style.position = 'absolute';
                selectedPhoto.style.width = cloneRect.width + 'px';
                selectedPhoto.style.height = cloneRect.height + 'px';
                selectedPhoto.style.left = (cloneRect.left - frameRect.left) + 'px';
                selectedPhoto.style.top = (cloneRect.top - frameRect.top) + 'px';
                selectedPhoto.style.objectFit = 'fill';
                selectedPhoto.style.maxWidth = 'none';
                selectedPhoto.style.maxHeight = 'none';
                selectedPhoto.style.transform = photoRotation ? `rotate(${photoRotation}deg)` : '';
                selectedPhoto.style.transformOrigin = 'center center';
                scaleClone.remove();
                scaleClone = null;
            } else {
                selectedPhoto.style.position = '';
                selectedPhoto.style.left = '';
                selectedPhoto.style.top = '';
                selectedPhoto.style.width = '100%';
                selectedPhoto.style.height = '100%';
                selectedPhoto.style.objectFit = 'cover';
                selectedPhoto.style.maxWidth = '';
                selectedPhoto.style.maxHeight = '';
            }
        }
        removeScaleOverlay();
        scaleSliderWrap.style.display = 'none';
        document.body.style.overflow = '';
    }

    scaleSliderWrap.querySelector('.scale-slider').addEventListener('input', function () {
        const target = scaleClone;
        if (!target) return;
        const scale = this.value;
        target.dataset.scale = scale;
        scaleSliderWrap.querySelector('.scale-value').textContent = scale + '%';
        target.style.transform = `scale(${scale / 100}) rotate(${photoRotation}deg)`;
        target.style.transformOrigin = 'center center';
    });

    scaleSliderWrap.querySelector('.scale-confirm-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        closeScaleSlider();
    });

document.getElementById('btn-photo-scale').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedPhoto) return;

        if (scaleMode) {
            closeScaleSlider();
            return;
        }

        scaleMode = true;
        const _photo = selectedPhoto;
        const _parent = selectedPhoto.parentElement;
        const _rotation = photoRotation;

        const stickyOffset = getStickyBottom();
        const parentRect = _parent.getBoundingClientRect();
        const parentCenter = parentRect.top + parentRect.height / 2;
        const targetCenter = (window.innerHeight + stickyOffset) / 2;
        window.scrollTo(0, window.scrollY + parentCenter - targetCenter);

        setTimeout(function() {
            const frameRect = _parent.getBoundingClientRect();
            const naturalRatio = (_photo.naturalWidth && _photo.naturalHeight)
                ? _photo.naturalWidth / _photo.naturalHeight
                : frameRect.width / frameRect.height;

            const displayW = frameRect.width;
            const displayH = frameRect.width / naturalRatio;
            const initLeft = frameRect.left;
            const initTop = frameRect.top + (frameRect.height - displayH) / 2;

            // Ховаємо оригінал — клон floats поверх всього в body
            _photo.style.visibility = 'hidden';
            _photo.style.pointerEvents = 'none';

            // Клон — прямий нащадок body, тому жоден overflow/transform ancestor не обрізає
            scaleClone = document.createElement('img');
            scaleClone.src = _photo.src;
            scaleClone.style.cssText = `
                position: fixed;
                left: ${initLeft}px;
                top: ${initTop}px;
                width: ${displayW}px;
                height: ${displayH}px;
                max-width: none;
                max-height: none;
                transform: scale(1) rotate(${_rotation}deg);
                transform-origin: center center;
                z-index: 10001;
                pointer-events: auto;
                border-radius: 12px;
                cursor: grab;
            `;
            scaleClone.dataset.scale = 100;
            document.body.appendChild(scaleClone);

            // Drag клону
            scaleClone.addEventListener('mousedown', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
                isDraggingPhoto = true;
                dragStartX = ev.clientX - parseFloat(scaleClone.style.left);
                dragStartY = ev.clientY - parseFloat(scaleClone.style.top);
                scaleClone.style.cursor = 'grabbing';
            });

            _parent.classList.add('scale-mode');

            createScaleOverlay(_parent);
            positionScaleSlider(_parent);
            scaleSliderWrap.style.display = 'flex';
            scaleSliderWrap.querySelector('.scale-slider').value = 100;
            scaleSliderWrap.querySelector('.scale-value').textContent = '100%';
            document.body.style.overflow = 'hidden';
        }, 50);
    });
    
    // ==========================================
    // DRAG ФОТО ВСЕРЕДИНІ ФРЕЙМУ
    // ==========================================

    let isDraggingPhoto = false;
    let dragStartX, dragStartY;

    function bindPhotoDrag(img) {
        img.addEventListener('mousedown', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            if (!scaleMode) return;
            e.preventDefault();
            e.stopPropagation();
            isDraggingPhoto = true;
            dragStartX = e.clientX - (parseFloat(this.style.left) || 0);
            dragStartY = e.clientY - (parseFloat(this.style.top) || 0);
        });
    }

    document.querySelectorAll('.photo-img').forEach(img => bindPhotoDrag(img));

    document.addEventListener('mousemove', function (e) {
        if (!isDraggingPhoto || !scaleClone) return;
        scaleClone.style.left = (e.clientX - dragStartX) + 'px';
        scaleClone.style.top = (e.clientY - dragStartY) + 'px';
    });

    document.addEventListener('mouseup', function () {
        if (isDraggingPhoto && scaleClone) scaleClone.style.cursor = 'grab';
        isDraggingPhoto = false;
    });

    // ==========================================
    // ВИДАЛЕННЯ ФОТО
    // ==========================================

    document.getElementById('btn-photo-delete').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedPhoto) return;

        saveState();
        closeScaleSlider();

        const parent = selectedPhoto.parentElement;
        selectedPhoto.remove();

        if (parent && parent.classList.contains('sticker-frame')) {
            parent.innerHTML = `
                <div class="sticker-frame-placeholder">
                    <button class="frame-add-photo-btn">Фото</button>
                    <button class="frame-add-sticker-btn">Стікер</button>
                </div>
            `;
            parent.querySelector('.frame-add-photo-btn').addEventListener('click', function (e) {
                e.stopPropagation();
                activeFrame = parent;
                framePhotoInput.click();
            });
            parent.querySelector('.frame-add-sticker-btn').addEventListener('click', function (e) {
                e.stopPropagation();
                activeFrame = parent;
                frameStickerInput.click();
            });
        }

        imgToolbar.style.display = 'none';
        selectedPhoto = null;
        photoRotation = 0;
    });

    document.addEventListener('click', function (e) {
        if (scaleMode) return;
        if (!e.target.closest('#img-toolbar-photos') &&
            !e.target.classList.contains('photo-img')) {
            imgToolbar.style.display = 'none';
            selectedPhoto = null;
        }
    });

    // ==========================================
    // TOOLBAR ДЛЯ СТІКЕРІВ
    // ==========================================

    const stickerToolbar = document.createElement('div');
    stickerToolbar.className = 'img-toolbar';
    stickerToolbar.id = 'sticker-toolbar';
    stickerToolbar.innerHTML = `
        <button class="img-toolbar-btn" id="btn-sticker-layer-up" title="Підняти шар">
            <span class="btn-icon layer-up-icon"></span>
        </button>
        <button class="img-toolbar-btn" id="btn-sticker-layer-down" title="Опустити шар">
            <span class="btn-icon layer-down-icon"></span>
        </button>
        <div class="block-toolbar-divider"></div>
        <button class="img-toolbar-btn" id="btn-sticker-crop" title="Кадрувати">
            <span class="btn-icon crop-icon"></span>
        </button>
        <button class="img-toolbar-btn" id="btn-sticker-lock" title="Зафіксувати">
            <span class="btn-icon lock-icon-btn"></span>
        </button>
        <button class="img-toolbar-btn" id="btn-sticker-duplicate" title="Дублювати">
            <span class="btn-icon file-plus-icon"></span>
        </button>
        <div class="block-toolbar-divider"></div>
        <button class="img-toolbar-btn img-toolbar-btn-delete" id="btn-sticker-delete" title="Видалити">
            <span class="btn-icon trash-icon"></span>
        </button>
    `;
    stickerToolbar.style.display = 'none';
    stickerToolbar.style.position = 'fixed';
    stickerToolbar.style.zIndex = '99999';
    document.body.appendChild(stickerToolbar);

    let selectedSticker = null;
    let stickerLocked = false;

    function deselectAllStickers() {
        document.querySelectorAll('.page-sticker, .hero-building-sticker, .memory-tree-sticker').forEach(s => {
            s.classList.remove('sticker-selected');
            // Повертаємо "під текст" z-index якщо він був збережений
            if (s._underTextZ !== undefined) {
                s.style.zIndex = s._underTextZ;
                delete s._underTextZ;
            }
        });
        document.body.classList.remove('sticker-under-text-active');
        stickerToolbar.style.display = 'none';
        selectedSticker = null;
        removeAllHandles();
    }

    function getZ(sticker) {
        const z = parseInt(sticker.style.zIndex);
        return isNaN(z) ? 10 : z;
    }

    function activateStickerUnderText(sticker) {
        const z = getZ(sticker);
        if (z <= 0) {
            // Зберігаємо "під текст" z-index і тимчасово підіймаємо вище блоків (z-index: 1)
            // щоб стікер міг отримувати mousedown для перетягування
            sticker._underTextZ = z;
            sticker.style.zIndex = 2;
            document.body.classList.add('sticker-under-text-active');
        }
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest('#sticker-toolbar') &&
            !e.target.closest('.page-sticker') &&
            !e.target.closest('.hero-building-sticker') &&
            !e.target.closest('.memory-tree-sticker') &&
            !e.target.closest('.sticker-handle') &&
            !e.target.closest('.layers-window')) {
            deselectAllStickers();
        }
    });

    // ==========================================
    // ШАР-МЕНЕДЖЕР — УТИЛІТИ
    // ==========================================

    function getAllPageStickers() {
        return Array.from(document.querySelectorAll('.page-sticker, .hero-building-sticker, .memory-tree-sticker'))
            .sort((a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0));
    }

    function normalizeStickerZIndices() {
        getAllPageStickers().forEach((s, i) => { s.style.zIndex = i + 1; });
    }

    function refreshLayersPanel() {
        const layersList = document.querySelector('.layers-list');
        if (!layersList) return;

        const stickers = getAllPageStickers().reverse(); // вищий z-index = вгорі списку
        layersList.innerHTML = '';

        if (stickers.length === 0) {
            layersList.innerHTML = '<p class="layers-empty">Стікерів ще немає</p>';
            return;
        }

        // Розбиваємо на дві зони (текст має z=1, тому стікер з z≤0 опиняється під текстом)
        const aboveStickers = stickers.filter(s => ((s._underTextZ !== undefined) ? s._underTextZ : getZ(s)) > 0);
        const belowStickers = stickers.filter(s => ((s._underTextZ !== undefined) ? s._underTextZ : getZ(s)) <= 0);

        function makeLayerItem(sticker) {
            const item = document.createElement('div');
            item.className = 'layers-item';
            item.setAttribute('draggable', 'true');
            item._sticker = sticker;
            if (sticker === selectedSticker) item.classList.add('layers-item-active');
            const src = sticker.src || '';
            const name = sticker.dataset.label ||
                (src ? decodeURIComponent(src.split('/').pop().replace(/\.[^.]+$/, '')) : 'Стікер');
            item.innerHTML = `
                <span class="layers-drag-icon">⠿</span>
                <img src="${src}" class="layers-thumb">
                <span class="layers-item-name">${name}</span>
            `;
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                deselectAllStickers();
                selectedSticker = sticker;
                sticker.classList.add('sticker-selected');
                stickerLocked = sticker.dataset.locked === 'true';
                activateStickerUnderText(sticker);
                layersList.querySelectorAll('.layers-item').forEach(i => i.classList.remove('layers-item-active'));
                item.classList.add('layers-item-active');
                sticker.scrollIntoView({ behavior: 'instant', block: 'center' });
                clipStickersToCanvas();
                showStickerHandles(sticker);
                updateStickerToolbarPosition(sticker);
                refreshLayersPanel();
            });
            return item;
        }

        // Рендеримо зону "над текстом"
        aboveStickers.forEach(s => layersList.appendChild(makeLayerItem(s)));

        // Розділювач
        const divider = document.createElement('div');
        divider.className = 'layers-divider';
        divider.innerHTML = '<span class="layers-divider-label">Під текстом</span>';
        layersList.appendChild(divider);

        // Рендеримо зону "під текстом"
        belowStickers.forEach(s => layersList.appendChild(makeLayerItem(s)));

        // Переприсвоюємо z-index після drag відповідно до зони
        function reassignZIndices() {
            const dividerEl = layersList.querySelector('.layers-divider');
            const children = Array.from(layersList.children);
            const dividerPos = children.indexOf(dividerEl);
            const aboveItems = children.slice(0, dividerPos).filter(c => c.classList.contains('layers-item'));
            const belowItems = children.slice(dividerPos + 1).filter(c => c.classList.contains('layers-item'));

            // Зона "над текстом": z від aboveItems.length вниз до 1
            aboveItems.forEach(function(it, i) {
                it._sticker.style.zIndex = aboveItems.length - i;
                delete it._sticker._underTextZ;
            });

            // Зона "під текстом": z = 0, -1, -2, ... (текст має z=1, тому z≤0 — під текстом, але ≥0 — над фоном canvas)
            belowItems.forEach(function(it, i) {
                const newZ = -i;
                if (it._sticker === selectedSticker) {
                    it._sticker._underTextZ = newZ;
                    it._sticker.style.zIndex = 2;
                    document.body.classList.add('sticker-under-text-active');
                } else {
                    it._sticker.style.zIndex = newZ;
                    delete it._sticker._underTextZ;
                }
            });

            // Якщо вибраний стікер перемістився в зону "над текстом" — скасовуємо буст
            if (selectedSticker && selectedSticker._underTextZ === undefined) {
                document.body.classList.remove('sticker-under-text-active');
            }
        }

        // Drag-and-drop
        let draggingLayerItem = null;

        function clearHighlights() {
            layersList.querySelectorAll('.layers-item').forEach(i => i.style.borderTop = '');
            divider.style.outline = '';
        }

        layersList.querySelectorAll('.layers-item').forEach(function(item) {
            item.addEventListener('dragstart', function() {
                draggingLayerItem = this;
                setTimeout(() => this.style.opacity = '0.4', 0);
            });
            item.addEventListener('dragend', function() {
                this.style.opacity = '1';
                draggingLayerItem = null;
                clearHighlights();
            });
            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                clearHighlights();
                this.style.borderTop = '2px solid #82BADF';
            });
            item.addEventListener('drop', function(e) {
                e.preventDefault();
                clearHighlights();
                if (!draggingLayerItem || draggingLayerItem === this) return;
                layersList.insertBefore(draggingLayerItem, this);
                reassignZIndices();
                refreshLayersPanel();
            });
        });

        // Розділювач як зона дропу — елемент потрапляє першим "під текст"
        divider.addEventListener('dragover', function(e) {
            e.preventDefault();
            clearHighlights();
            this.outline = '';
            this.style.outline = '2px solid #82BADF';
        });
        divider.addEventListener('drop', function(e) {
            e.preventDefault();
            clearHighlights();
            if (!draggingLayerItem) return;
            // Вставляємо відразу після розділювача (перший у зоні "під текстом")
            const afterDivider = divider.nextSibling;
            layersList.insertBefore(draggingLayerItem, afterDivider);
            reassignZIndices();
            refreshLayersPanel();
        });
    }

    window.refreshLayersPanel = refreshLayersPanel;

    document.getElementById('btn-sticker-layer-up').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedSticker) return;
        const isBoosted = selectedSticker._underTextZ !== undefined;
        if (isBoosted) selectedSticker.style.zIndex = selectedSticker._underTextZ;
        const sorted = getAllPageStickers();
        const idx = sorted.indexOf(selectedSticker);
        if (idx < sorted.length - 1) {
            const higher = sorted[idx + 1];
            const tmp = getZ(selectedSticker);
            selectedSticker.style.zIndex = getZ(higher);
            higher.style.zIndex = tmp;
        } else {
            selectedSticker.style.zIndex = getZ(selectedSticker) + 1;
        }
        const newZ = getZ(selectedSticker);
        if (isBoosted) {
            if (newZ <= 0) {
                selectedSticker._underTextZ = newZ;
                selectedSticker.style.zIndex = 2;
                document.body.classList.add('sticker-under-text-active');
            } else {
                delete selectedSticker._underTextZ;
                document.body.classList.remove('sticker-under-text-active');
            }
        } else if (newZ > 0) {
            document.body.classList.remove('sticker-under-text-active');
        }
        refreshLayersPanel();
    });

    document.getElementById('btn-sticker-layer-down').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedSticker) return;
        const isBoosted = selectedSticker._underTextZ !== undefined;
        if (isBoosted) selectedSticker.style.zIndex = selectedSticker._underTextZ;
        const sorted = getAllPageStickers();
        const idx = sorted.indexOf(selectedSticker);
        if (idx > 0) {
            const lower = sorted[idx - 1];
            const tmp = getZ(selectedSticker);
            selectedSticker.style.zIndex = getZ(lower);
            lower.style.zIndex = tmp;
        } else {
            selectedSticker.style.zIndex = getZ(selectedSticker) - 1;
        }
        const newZ = getZ(selectedSticker);
        if (isBoosted) {
            if (newZ <= 0) {
                selectedSticker._underTextZ = newZ;
                selectedSticker.style.zIndex = 2;
                document.body.classList.add('sticker-under-text-active');
            } else {
                delete selectedSticker._underTextZ;
                document.body.classList.remove('sticker-under-text-active');
            }
        } else if (newZ <= 0) {
            document.body.classList.add('sticker-under-text-active');
        } else {
            document.body.classList.remove('sticker-under-text-active');
        }
        refreshLayersPanel();
    });

    document.getElementById('btn-sticker-crop').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedSticker) return;
        enterCropMode(selectedSticker);
    });

    document.getElementById('btn-sticker-lock').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedSticker) return;
        stickerLocked = !stickerLocked;
        selectedSticker.dataset.locked = stickerLocked;
        const icon = this.querySelector('.btn-icon');
        icon.className = stickerLocked ? 'btn-icon lock-icon-btn' : 'btn-icon lock-1-icon-btn';
    });

    document.getElementById('btn-sticker-duplicate').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedSticker) return;
        const clone = selectedSticker.cloneNode(true);
        const canvas = document.getElementById('page-canvas');
        const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        clone.style.position = 'absolute';
        clone.style.left = (parseInt(selectedSticker.style.left) || 0) + 20 + 'px';
        clone.style.top  = (parseInt(selectedSticker.style.top)  || 0) + 20 + 'px';
        clone.style.width = selectedSticker.offsetWidth + 'px';
        clone.style.height = selectedSticker.offsetHeight + 'px';
        clone.removeAttribute('data-locked');
        const allS = getAllPageStickers();
        clone.style.zIndex = allS.length > 0 ? Math.max(...allS.map(s => getZ(s))) + 1 : 10;
        // назва копії: "копія", "копія 1", "копія 2"...
        const baseName = selectedSticker.dataset.label ||
            (selectedSticker.src ? decodeURIComponent(selectedSticker.src.split('/').pop().replace(/\.[^.]+$/, '')) : 'Стікер');
        const copyBase = baseName.replace(/ копія(\s\d+)?$/, '');
        const existingCopies = allS.filter(s => {
            const lbl = s.dataset.label || '';
            return lbl === copyBase + ' копія' || /^копія \d+$/.test(lbl.replace(copyBase + ' ', ''));
        }).length;
        clone.dataset.label = existingCopies === 0 ? copyBase + ' копія' : copyBase + ' копія ' + existingCopies;
        if (canvas) canvas.appendChild(clone); else document.body.appendChild(clone);
        addStickerDrag(clone);
        refreshLayersPanel();
    });

    document.getElementById('btn-sticker-delete').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!selectedSticker) return;
        saveState();
        if (selectedSticker._sourceFrame) {
            const frame = selectedSticker._sourceFrame;
            frame.style.background = '';
            const ph = frame.querySelector('.sticker-frame-placeholder');
            if (ph) ph.style.display = '';
        }
        selectedSticker.remove();
        stickerToolbar.style.display = 'none';
        selectedSticker = null;
        removeAllHandles();
        refreshLayersPanel();
    });

    // ==========================================
    // ПОЗИЦІОНУВАННЯ TOOLBAR СТІКЕРА
    // ==========================================

    function getStickyBottom() {
        const headerEl = document.querySelector('.site-header');
        const toolbarEl = document.getElementById('editor-toolbar');
        return (headerEl ? headerEl.offsetHeight : 0) +
               (toolbarEl && toolbarEl.classList.contains('visible') ? toolbarEl.offsetHeight : 0);
    }

    function updateStickerToolbarPosition(sticker) {
        const rect = sticker.getBoundingClientRect();
        const stickyBottom = getStickyBottom();
        if (rect.bottom < stickyBottom || rect.top > window.innerHeight) {
            stickerToolbar.style.display = 'none';
            return;
        }
        stickerToolbar.style.display = 'flex';
        const top = Math.max(stickyBottom + 4, rect.top - 44);
        stickerToolbar.style.top = top + 'px';
        stickerToolbar.style.left = (rect.right - stickerToolbar.offsetWidth) + 'px';
    }

    function clipStickersToCanvas() {
        const stickyBottom = getStickyBottom();
        document.querySelectorAll('.page-sticker, .hero-building-sticker, .memory-tree-sticker').forEach(sticker => {
            const rect = sticker.getBoundingClientRect();
            if (rect.top < stickyBottom) {
                const clipTop = stickyBottom - rect.top;
                sticker.style.clipPath = `inset(${clipTop}px 0px 0px 0px)`;
            } else {
                sticker.style.clipPath = '';
            }
        });
    }
    window.clipStickersToCanvas = clipStickersToCanvas;

    // ==========================================
    // КРУЖЕЧКИ ТА МАСШТАБУВАННЯ СТІКЕРІВ
    // ==========================================

    function removeAllHandles() {
        document.querySelectorAll('.sticker-handle, .sticker-rotate-line').forEach(h => h.remove());
    }

    function getStickerRotation(sticker) {
        const m = (sticker.style.transform || '').match(/rotate\(([-\d.]+)deg\)/);
        return m ? parseFloat(m[1]) : 0;
    }

    function showStickerHandles(sticker) {
        removeAllHandles();

        const rotation = getStickerRotation(sticker);
        const stickyBottom = getStickyBottom();
        const bRect = sticker.getBoundingClientRect();
        if (bRect.bottom < stickyBottom || bRect.top > window.innerHeight) return;

        // Центр стікера у viewport (коректний навіть при повороті)
        const cx = bRect.left + bRect.width / 2;
        const cy = bRect.top + bRect.height / 2;

        // Фактичні (до повороту) напівширина / напіввисота
        const hw = sticker.offsetWidth / 2;
        const hh = sticker.offsetHeight / 2;
        const rad = rotation * Math.PI / 180;

        // Повертає точку (dx, dy) відносно центру стікера у viewport-координати
        function rotPt(dx, dy) {
            return {
                x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
                y: cy + dx * Math.sin(rad) + dy * Math.cos(rad)
            };
        }

        // Кутові хендли — справжні кути повернутого стікера
        const corners = [
            { pos: 'top-left',     pt: rotPt(-hw, -hh) },
            { pos: 'top-right',    pt: rotPt( hw, -hh) },
            { pos: 'bottom-left',  pt: rotPt(-hw,  hh) },
            { pos: 'bottom-right', pt: rotPt( hw,  hh) },
        ];

        corners.forEach(({ pos, pt }) => {
            if (pt.y < stickyBottom) return;
            const handle = document.createElement('div');
            handle.className = 'sticker-handle';
            handle.dataset.corner = pos;
            handle.style.position = 'fixed';
            handle.style.top  = (pt.y - 5) + 'px';
            handle.style.left = (pt.x - 5) + 'px';
            handle.style.cursor = getCursorForCorner(pos);
            document.body.appendChild(handle);
            handle.addEventListener('mousedown', function (e) {
                e.stopPropagation();
                e.preventDefault();
                startStickerResize(e, sticker, pos);
            });
        });

        // Хендл повороту — виходить від нижнього центру стікера вздовж його осі
        const rotLineLen = 22;
        const bottomCenter = rotPt(0, hh);
        const rotHandlePos = rotPt(0, hh + rotLineLen);

        if (rotHandlePos.y < window.innerHeight - 10) {
            const line = document.createElement('div');
            line.className = 'sticker-rotate-line';
            line.style.top    = bottomCenter.y + 'px';
            line.style.left   = bottomCenter.x + 'px';
            line.style.height = rotLineLen + 'px';
            // Лінія повертається разом зі стікером навколо своєї верхньої точки
            line.style.transform = `rotate(${rotation}deg)`;
            document.body.appendChild(line);

            const rotHandle = document.createElement('div');
            rotHandle.className = 'sticker-handle sticker-rotate-handle';
            rotHandle.style.position = 'fixed';
            rotHandle.style.top  = (rotHandlePos.y - 9) + 'px';
            rotHandle.style.left = (rotHandlePos.x - 9) + 'px';
            document.body.appendChild(rotHandle);

            rotHandle.addEventListener('mousedown', function (e) {
                e.stopPropagation();
                e.preventDefault();
                startStickerRotate(e, sticker);
            });
        }
    }

    function startStickerRotate(e, sticker) {
        const rect = sticker.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const startRotation = getStickerRotation(sticker);

        document.body.style.cursor = 'grabbing';

        function onMouseMove(ev) {
            const currentAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180 / Math.PI;
            let rotation = startRotation + (currentAngle - startMouseAngle);
            // Snap до кратних 45° при утриманні Shift
            if (ev.shiftKey) rotation = Math.round(rotation / 45) * 45;
            sticker.style.transform = `rotate(${rotation}deg)`;
            showStickerHandles(sticker);
            updateStickerToolbarPosition(sticker);
        }

        function onMouseUp() {
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            showStickerHandles(sticker);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function getCursorForCorner(pos) {
        return { 'top-left': 'nw-resize', 'top-right': 'ne-resize', 'bottom-left': 'sw-resize', 'bottom-right': 'se-resize' }[pos] || 'nw-resize';
    }

    function startStickerResize(e, sticker, corner) {
        const startX = e.clientX;
        const startW = sticker.offsetWidth;
        const startH = sticker.offsetHeight;
        const startLeft = parseInt(sticker.style.left) || 0;
        const startTop = parseInt(sticker.style.top) || 0;
        const aspectRatio = startW / startH;

        function onMouseMove(e) {
            const dx = e.clientX - startX;
            let newW = startW, newLeft = startLeft, newTop = startTop;
            if (corner === 'bottom-right') {
                newW = Math.max(40, startW + dx);
            } else if (corner === 'bottom-left') {
                newW = Math.max(40, startW - dx);
                newLeft = startLeft + (startW - newW);
            } else if (corner === 'top-right') {
                newW = Math.max(40, startW + dx);
                newTop = startTop + (startH - newW / aspectRatio);
            } else if (corner === 'top-left') {
                newW = Math.max(40, startW - dx);
                newLeft = startLeft + (startW - newW);
                newTop = startTop + (startH - newW / aspectRatio);
            }
            const newH = newW / aspectRatio;
            sticker.style.width = newW + 'px';
            sticker.style.height = newH + 'px';
            sticker.style.left = newLeft + 'px';
            sticker.style.top = newTop + 'px';
            showStickerHandles(sticker);
            updateStickerToolbarPosition(sticker);
            clipStickersToCanvas();
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    // ==========================================
    // DRAG СТІКЕРІВ
    // ==========================================

    function moveToCanvas(sticker) {
        const canvas = document.getElementById('page-canvas');
        if (!canvas || sticker.parentElement === canvas) return;
        const rect = sticker.getBoundingClientRect();
        const cr   = canvas.getBoundingClientRect();
        sticker.style.position = 'absolute';
        sticker.style.left   = (rect.left - cr.left) + 'px';
        sticker.style.top    = (rect.top  - cr.top)  + 'px';
        sticker.style.right  = 'auto';
        sticker.style.bottom = 'auto';
        canvas.appendChild(sticker);
    }

    function addStickerDrag(sticker) {
        if (sticker._dragInit) return;
        sticker._dragInit = true;
        let isDraggingSticker = false;
        let startX, startY, startLeft, startTop;

        sticker.addEventListener('mousedown', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            if (sticker.dataset.locked === 'true') return;
            if (e.target.classList.contains('sticker-handle')) return;
            e.preventDefault();
            e.stopPropagation();
            isDraggingSticker = true;
            moveToCanvas(sticker);
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(sticker.style.left) || 0;
            startTop  = parseInt(sticker.style.top)  || 0;
            sticker._savedZ = parseInt(sticker.style.zIndex);
            if (isNaN(sticker._savedZ)) sticker._savedZ = 10;
            sticker.style.zIndex = 99999;
            sticker.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDraggingSticker) return;
            const canvas = document.getElementById('page-canvas');
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = startLeft + dx;
            let newTop  = startTop  + dy;
            if (canvas) {
                const maxLeft = canvas.offsetWidth  - sticker.offsetWidth;
                const maxTop  = canvas.offsetHeight - sticker.offsetHeight;
                newLeft = Math.max(0, Math.min(maxLeft, newLeft));
                newTop  = Math.max(0, Math.min(maxTop,  newTop));
            }
            sticker.style.left = newLeft + 'px';
            sticker.style.top  = newTop  + 'px';
            if (sticker.classList.contains('sticker-selected')) {
                updateStickerToolbarPosition(sticker);
                showStickerHandles(sticker);
            }
            clipStickersToCanvas();
        });

        document.addEventListener('mouseup', function () {
            if (isDraggingSticker) {
                isDraggingSticker = false;
                sticker.style.cursor = 'grab';
                sticker.style.zIndex = (sticker._savedZ !== undefined) ? sticker._savedZ : 10;
            }
        });

        sticker.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.stopPropagation();
            imgToolbar.style.display = 'none';
            selectedPhoto = null;
            deselectAllStickers();
            selectedSticker = sticker;
            stickerLocked = sticker.dataset.locked === 'true';
            sticker.classList.add('sticker-selected');
            activateStickerUnderText(sticker);
            showStickerHandles(sticker);
            updateStickerToolbarPosition(sticker);
            if (typeof window.refreshLayersPanel === 'function') window.refreshLayersPanel();
        });
    }

    // ==========================================
    // ІНІЦІАЛІЗАЦІЯ СТІКЕРІВ
    // ==========================================

    let initStickerZ = 10;
    document.querySelectorAll('.page-sticker, .hero-building-sticker, .memory-tree-sticker').forEach(sticker => {
        sticker.style.pointerEvents = 'auto';
        sticker.style.cursor = 'grab';
        if (!sticker.style.zIndex) sticker.style.zIndex = initStickerZ++;
        moveToCanvas(sticker);
        addStickerDrag(sticker);
    });

    // ==========================================
    // КНОПКИ PLACEHOLDER У "СВІТ ЛЮДИНИ"
    // ==========================================

    const framePhotoInput = document.createElement('input');
    framePhotoInput.type = 'file';
    framePhotoInput.accept = 'image/*';
    framePhotoInput.style.display = 'none';
    document.body.appendChild(framePhotoInput);

    const frameStickerInput = document.createElement('input');
    frameStickerInput.type = 'file';
    frameStickerInput.accept = 'image/*';
    frameStickerInput.style.display = 'none';
    document.body.appendChild(frameStickerInput);

    let activeFrame = null;


    framePhotoInput.addEventListener('change', function () {
        console.log('change fired, activeFrame:', activeFrame, 'files:', this.files[0]);
        if (!activeFrame || !this.files[0]) return;
        const url = URL.createObjectURL(this.files[0]);
        const img = document.createElement('img');
        img.src = url;
        img.className = 'photo-img';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '12px';
        activeFrame.innerHTML = '';
        activeFrame.appendChild(img);
        bindPhotoClick(img);
        bindPhotoDrag(img);
        selectedPhoto = img;
        activeFrame = null;
        this.value = '';
    });

    frameStickerInput.addEventListener('change', function () {
        if (!activeFrame || !this.files[0]) return;
        const url = URL.createObjectURL(this.files[0]);
        const canvas = document.getElementById('page-canvas');
        const frameRect = activeFrame.getBoundingClientRect();
        const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const sticker = document.createElement('img');
        sticker.src = url;
        sticker.className = 'page-sticker';
        sticker.style.position = 'absolute';
        sticker.style.left = (frameRect.left - cr.left) + 'px';
        sticker.style.top  = (frameRect.top  - cr.top)  + 'px';
        sticker.style.width = frameRect.width + 'px';
        sticker.style.height = frameRect.height + 'px';
        sticker.style.objectFit = 'contain';
        sticker.style.cursor = 'grab';
        sticker.style.pointerEvents = 'auto';
        const allS = getAllPageStickers();
        sticker.style.zIndex = allS.length > 0 ? Math.max(...allS.map(s => getZ(s))) + 1 : 10;
        if (canvas) canvas.appendChild(sticker); else document.body.appendChild(sticker);
        addStickerDrag(sticker);
        refreshLayersPanel();
        const placeholder = activeFrame.querySelector('.sticker-frame-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        activeFrame.style.background = 'white';
        sticker._sourceFrame = activeFrame;
        activeFrame = null;
        this.value = '';
    });

    clipStickersToCanvas();

    // ==========================================
    // КНОПКИ PLACEHOLDER ДЛЯ ФОТО/ВІДЕО
    // ==========================================

    const mainPhotoInput = document.createElement('input');
    mainPhotoInput.type = 'file';
    mainPhotoInput.accept = 'image/*';
    mainPhotoInput.style.display = 'none';
    document.body.appendChild(mainPhotoInput);

    let activePlaceholder = null;

    document.querySelectorAll('.placeholder-add-photo-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            activePlaceholder = this.closest('.hero-photo') || this.closest('.memory-photo');
            mainPhotoInput.click();
        });
    });

    mainPhotoInput.addEventListener('change', function () {
        if (!activePlaceholder || !this.files[0]) return;
        const url = URL.createObjectURL(this.files[0]);
        let img = activePlaceholder.querySelector('.photo-img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'photo-img';
            activePlaceholder.insertBefore(img, activePlaceholder.querySelector('.photo-placeholder'));
        }
        img.src = url;
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        bindPhotoClick(img);
        bindPhotoDrag(img);
        activePlaceholder = null;
        this.value = '';
    });

    const mainVideoInput = document.createElement('input');
    mainVideoInput.type = 'file';
    mainVideoInput.accept = 'video/*';
    mainVideoInput.style.display = 'none';
    document.body.appendChild(mainVideoInput);

    document.querySelectorAll('.placeholder-add-video-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            activePlaceholder = this.closest('.video-player');
            mainVideoInput.click();
        });
    });

    mainVideoInput.addEventListener('change', function () {
        if (!activePlaceholder || !this.files[0]) return;
        const url = URL.createObjectURL(this.files[0]);
        const videoPlayer = activePlaceholder;
        const oldImg = videoPlayer.querySelector('.video-thumbnail');
        if (oldImg) oldImg.remove();
        const video = document.createElement('video');
        video.src = url;
        video.className = 'video-thumbnail';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.display = 'block';
        videoPlayer.insertBefore(video, videoPlayer.querySelector('.photo-placeholder'));
        initVideoPlayer(videoPlayer, video);
        activePlaceholder = null;
        this.value = '';
    });

    // ==========================================
    // КАРТКИ "СВІТ ЛЮДИНИ"
    // ==========================================

    function recalcWorldCards() {
        document.querySelectorAll('.world-grid').forEach(function (grid) {
            const cards = Array.from(grid.querySelectorAll('.world-card'));
            const total = cards.length;
            cards.forEach(function (card, index) {
                card.classList.remove('card-vertical', 'card-horizontal', 'card-full');
                const rowStart = Math.floor(index / 3) * 3;
                const rowEnd = Math.min(rowStart + 3, total);
                const countInRow = rowEnd - rowStart;
                if (countInRow === 3) card.classList.add('card-vertical');
                else if (countInRow === 2) card.classList.add('card-horizontal');
                else card.classList.add('card-full');
            });
            const section = grid.closest('.human-world-section');
            const addBtn = section ? section.querySelector('.world-add-card-btn') : null;
            if (addBtn) addBtn.style.display = total >= 9 ? 'none' : '';
        });
    }

    function addWorldCardStyles() {
        if (document.getElementById('world-card-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'world-card-dynamic-styles';
        style.textContent = `
            .world-card { transition: all 0.2s ease; }
            .world-card.card-full { width: 1280px; flex-direction: row; align-items: center; gap: 32px; }
            .world-card.card-full .sticker-frame { width: 400px; height: 200px; flex-shrink: 0; }
        `;
        document.head.appendChild(style);
    }

    addWorldCardStyles();
    recalcWorldCards();

    const addCardBtn = document.querySelector('.world-add-card-btn');
    if (addCardBtn) {
        addCardBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const grid = this.closest('.human-world-section')?.querySelector('.world-grid') || document.querySelector('.world-grid');
            if (grid.querySelectorAll('.world-card').length >= 9) return;
            const newCard = document.createElement('div');
            newCard.className = 'world-card';
            newCard.innerHTML = `
                <div class="sticker-frame">
                    <div class="sticker-frame-placeholder">
                        <button class="frame-add-photo-btn">Фото</button>
                        <button class="frame-add-sticker-btn">Стікер</button>
                    </div>
                </div>
                <div class="card-body">
                    <h3>НАЗВА:</h3>
                    <p>Додайте опис</p>
                </div>
            `;
            grid.appendChild(newCard);
            initWorldCard(newCard);
            recalcWorldCards();
        });
    }

    function initWorldCard(card) {
        card.addEventListener('mouseenter', function () {
            if (!document.body.classList.contains('editing-mode')) return;
            if (card.querySelector('.card-delete-btn')) return;
            const btn = document.createElement('button');
            btn.className = 'card-delete-btn';
            btn.innerHTML = '<span class="btn-icon close-icon"></span>';
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const grid = card.closest('.world-grid');
                if (!grid || grid.querySelectorAll('.world-card').length <= 1) return;
                card.remove();
                recalcWorldCards();
            });
            card.appendChild(btn);
        });

        card.addEventListener('mouseleave', function () {
            const btn = card.querySelector('.card-delete-btn');
            if (btn) btn.remove();
        });

        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('card-dragging');
            setTimeout(() => card.style.opacity = '0.4', 0);
        });

        card.addEventListener('dragend', function () {
            card.classList.remove('card-dragging');
            card.style.opacity = '1';
            document.querySelectorAll('.world-card').forEach(c => c.classList.remove('card-drag-over'));
            recalcWorldCards();
        });

        card.addEventListener('dragover', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.preventDefault();
            document.querySelectorAll('.world-card').forEach(c => c.classList.remove('card-drag-over'));
            card.classList.add('card-drag-over');
        });

        card.addEventListener('drop', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.preventDefault();
            const dragging = document.querySelector('.card-dragging');
            if (dragging && dragging !== card) {
                const grid = card.closest('.world-grid');
                const cards = grid ? Array.from(grid.querySelectorAll('.world-card')) : [];
                const dragIndex = cards.indexOf(dragging);
                const dropIndex = cards.indexOf(card);
                if (dragIndex < dropIndex) grid.insertBefore(dragging, card.nextSibling);
                else grid.insertBefore(dragging, card);
            }
            card.classList.remove('card-drag-over');
        });

        const stickerFrame = card.querySelector('.sticker-frame');
        if (stickerFrame && typeof initFrameDrop === 'function') initFrameDrop(stickerFrame);
        const photoBtn = card.querySelector('.frame-add-photo-btn');
        const stickerBtn = card.querySelector('.frame-add-sticker-btn');
        if (photoBtn) {
            photoBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                activeFrame = card.querySelector('.sticker-frame');
                framePhotoInput.click();
            });
        }
        if (stickerBtn) {
            stickerBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                activeFrame = card.querySelector('.sticker-frame');
                frameStickerInput.click();
            });
        }

        card.querySelectorAll('h3, p').forEach(el => {
            el.addEventListener('click', function (e) {
                if (!document.body.classList.contains('editing-mode')) return;
                if (this.contentEditable === 'true') return;
                e.stopPropagation();
                saveState();
                this.contentEditable = 'true';
                this.style.whiteSpace = 'normal';
                this.style.wordBreak = 'break-word';
                this.focus();
                this.style.outline = 'none';
                this.style.cursor = 'text';
            });
            el.addEventListener('blur', function () {
                this.contentEditable = 'false';
                this.style.cursor = '';
            });
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    this.contentEditable = 'false';
                    this.blur();
                }
            });
        });
    }

    document.querySelectorAll('.world-card').forEach(card => initWorldCard(card));

    // ==========================================
    // РЕДАГУВАННЯ ТЕКСТУ
    // ==========================================

    document.querySelectorAll('.page-editable-block h1, .page-editable-block h2, .page-editable-block h3, .page-editable-block p, .page-editable-block .dates').forEach(el => {
        el.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            if (this.contentEditable === 'true') return;
            e.stopPropagation();
            saveState();
            this.contentEditable = 'true';
            this.style.whiteSpace = 'normal';
            this.style.wordBreak = 'break-word';
            this.focus();
            this.style.outline = 'none';
            this.style.cursor = 'text';
        });
        el.addEventListener('blur', function () {
            this.contentEditable = 'false';
            this.style.cursor = '';
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                this.contentEditable = 'false';
                this.blur();
            }
        });
    });

    document.querySelectorAll('.quote-text').forEach(el => {
        el.addEventListener('input', function () {
            const maxLength = 120;
            if (this.innerText.length > maxLength) {
                this.innerText = this.innerText.substring(0, maxLength);
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(this);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    });

    function addCharLimit(selector, maxChars) {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('input', function () {
                if (!this.isContentEditable || this.contentEditable === 'false') return;
                const text = this.innerText;
                if (text.length > maxChars) {
                    this.innerText = text.substring(0, maxChars);
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(this);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                let counter = this.parentElement.querySelector('.char-counter');
                if (!counter) {
                    counter = document.createElement('div');
                    counter.className = 'char-counter';
                    this.parentElement.appendChild(counter);
                }
                const remaining = maxChars - this.innerText.length;
                counter.innerText = `${this.innerText.length} / ${maxChars}`;
                counter.style.color = remaining < 20 ? '#B43131' : '#82BADF';
            });
            el.addEventListener('blur', function () {
                const counter = this.parentElement.querySelector('.char-counter');
                if (counter) counter.remove();
            });
        });
    }

    addCharLimit('.cloud-quote-text', 260);
    addCharLimit('.family-memory-text', 1200);

    // ==========================================
    // ДОДАВАННЯ СТІКЕРІВ З МЕНЮ ДЕКОРУ
    // ==========================================

    function addStickerToCanvasAt(src, left, top) {
        saveState();
        const canvas = document.getElementById('page-canvas');
        if (!canvas) return;
        const sticker = document.createElement('img');
        sticker.src = src;
        sticker.className = 'page-sticker';
        sticker.style.position = 'absolute';
        sticker.style.width = '120px';
        sticker.style.height = '120px';
        sticker.style.objectFit = 'contain';
        sticker.style.cursor = 'grab';
        sticker.style.pointerEvents = 'auto';
        const allS = getAllPageStickers();
        sticker.style.zIndex = allS.length > 0 ? Math.max(...allS.map(s => getZ(s))) + 1 : 10;
        sticker.style.left = Math.max(0, Math.min(canvas.offsetWidth  - 120, left)) + 'px';
        sticker.style.top  = Math.max(0, Math.min(canvas.offsetHeight - 120, top))  + 'px';
        canvas.appendChild(sticker);
        addStickerDrag(sticker);
        refreshLayersPanel();
    }

    function bindDecorItem(img) {
        img.style.cursor = 'grab';
        const item = img.closest('.dropdown-grid-item') || img.parentElement;
        img.addEventListener('click', function () {
            if (!document.body.classList.contains('editing-mode')) return;
            const canvas = document.getElementById('page-canvas');
            if (!canvas) return;
            const canvasRect = canvas.getBoundingClientRect();
            const stickyH = getStickyBottom();
            const visibleCenterY = (stickyH + window.innerHeight) / 2;
            const left = Math.max(0, Math.min(canvasRect.width - 120, canvasRect.width / 2 - 60));
            const top  = Math.max(0, Math.min(canvas.offsetHeight - 120, visibleCenterY - canvasRect.top - 60));
            addStickerToCanvasAt(this.src, left, top);
            document.getElementById('menu-decor').style.display = 'none';
        });
        if (item) {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', function (e) {
                if (!document.body.classList.contains('editing-mode')) return;
                dragStickerSrc = img.src;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', img.src);
            });
            item.addEventListener('dragend', function () {
                item.classList.remove('dragging');
                dragStickerSrc = null;
            });
        }
    }

    document.querySelectorAll('#menu-decor .dropdown-grid-item img').forEach(img => bindDecorItem(img));

    // ==========================================
    // DRAG VARIABLES
    // ==========================================

    let dragStickerSrc = null;
    let dragMediaSrc   = null;
    let dragMediaIsVideo = false;

    // ==========================================
    // HELPER FUNCTIONS — вставка медіа/стікерів
    // ==========================================

    function insertPhotoIntoPlaceholder(url, container) {
        let img = container.querySelector('.photo-img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'photo-img';
            const ph = container.querySelector('.photo-placeholder');
            if (ph) container.insertBefore(img, ph); else container.appendChild(img);
        }
        img.src = url;
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        bindPhotoClick(img);
        bindPhotoDrag(img);
    }

    function formatVideoTime(s) {
        if (isNaN(s) || s < 0) s = 0;
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function initVideoPlayer(player, video) {
        const ui = player.querySelector('.video-ui');
        if (!ui) return;
        ui.style.display = '';

        const playOverlay  = ui.querySelector('.video-play-overlay');
        const playBigBtn   = ui.querySelector('.video-play-big');
        const playBtn      = ui.querySelector('.video-play-btn');
        const timeDisplay  = ui.querySelector('.video-time');
        const seekBar      = ui.querySelector('.video-seek');
        const speedSelect  = ui.querySelector('.video-speed');
        const muteBtn      = ui.querySelector('.video-mute-btn');

        let hideTimer = null;

        function showControls() {
            player.classList.remove('controls-hidden');
            clearTimeout(hideTimer);
        }
        function scheduleHide() {
            clearTimeout(hideTimer);
            if (!video.paused) {
                hideTimer = setTimeout(() => player.classList.add('controls-hidden'), 2000);
            }
        }

        player.addEventListener('mousemove', () => { showControls(); scheduleHide(); });
        player.addEventListener('mouseleave', () => { if (!video.paused) scheduleHide(); });

        function updatePlayState() {
            const playing = !video.paused && !video.ended;
            playBigBtn.classList.toggle('is-playing', playing);
            playBtn.classList.toggle('is-playing', playing);
            playOverlay.style.opacity = playing ? '0' : '1';
            if (playing) scheduleHide(); else showControls();
        }

        function updateSeek() {
            const cur = video.currentTime || 0;
            const dur = video.duration  || 0;
            const pct = dur ? (cur / dur * 100) : 0;
            timeDisplay.textContent = formatVideoTime(cur) + ' / ' + formatVideoTime(dur);
            seekBar.value = pct;
            seekBar.style.background =
                `linear-gradient(to right, #82BADF ${pct}%, rgba(255,255,255,0.3) ${pct}%)`;
        }

        function updateMute() {
            muteBtn.classList.toggle('is-muted', video.muted);
        }

        function togglePlay() { video.paused ? video.play() : video.pause(); }

        playBigBtn.addEventListener('click', togglePlay);
        playBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);

        video.addEventListener('play',        updatePlayState);
        video.addEventListener('pause',       updatePlayState);
        video.addEventListener('ended',       updatePlayState);
        video.addEventListener('timeupdate',  updateSeek);
        video.addEventListener('loadedmetadata', updateSeek);

        seekBar.addEventListener('input', function () {
            video.currentTime = (this.value / 100) * (video.duration || 0);
            updateSeek();
        });

        speedSelect.addEventListener('change', function () {
            video.playbackRate = parseFloat(this.value);
        });

        muteBtn.addEventListener('click', () => { video.muted = !video.muted; updateMute(); });

        updatePlayState();
        updateSeek();
        updateMute();
    }

    function insertVideoIntoPlaceholder(url, container) {
        const old = container.querySelector('.video-thumbnail, video');
        if (old) old.remove();
        const video = document.createElement('video');
        video.src = url;
        video.className = 'video-thumbnail';
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        const ph = container.querySelector('.photo-placeholder');
        if (ph) container.insertBefore(video, ph); else container.appendChild(video);
        initVideoPlayer(container, video);
    }

    function insertPhotoIntoFrame(url, frame) {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'photo-img';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px;';
        frame.innerHTML = '';
        frame.appendChild(img);
        bindPhotoClick(img);
        bindPhotoDrag(img);
        selectedPhoto = img;
    }

    function insertStickerIntoFrame(src, frame) {
        const canvas = document.getElementById('page-canvas');
        const frameRect = frame.getBoundingClientRect();
        const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const sticker = document.createElement('img');
        sticker.src = src;
        sticker.className = 'page-sticker';
        sticker.style.position = 'absolute';
        sticker.style.left = (frameRect.left - cr.left) + 'px';
        sticker.style.top  = (frameRect.top  - cr.top)  + 'px';
        sticker.style.width  = frameRect.width  + 'px';
        sticker.style.height = frameRect.height + 'px';
        sticker.style.objectFit = 'contain';
        sticker.style.cursor = 'grab';
        sticker.style.pointerEvents = 'auto';
        const allS = getAllPageStickers();
        sticker.style.zIndex = allS.length > 0 ? Math.max(...allS.map(s => getZ(s))) + 1 : 10;
        if (canvas) canvas.appendChild(sticker);
        addStickerDrag(sticker);
        refreshLayersPanel();
        const ph = frame.querySelector('.sticker-frame-placeholder');
        if (ph) ph.style.display = 'none';
        frame.style.background = 'white';
        sticker._sourceFrame = frame;
    }

    // ==========================================
    // FRAME DROP — sticker-frame
    // ==========================================

    function initFrameDrop(frame) {
        if (frame._frameDropInit) return;
        frame._frameDropInit = true;
        frame.addEventListener('dragover', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            const hasFiles = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files');
            if (!hasFiles && !dragStickerSrc && !dragMediaSrc) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            frame.classList.add('drop-hover');
        });
        frame.addEventListener('dragleave', function (e) {
            if (!frame.contains(e.relatedTarget)) frame.classList.remove('drop-hover');
        });
        frame.addEventListener('drop', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.preventDefault();
            e.stopPropagation();
            frame.classList.remove('drop-hover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    insertPhotoIntoFrame(URL.createObjectURL(file), frame);
                }
                return;
            }
            if (dragMediaSrc && !dragMediaIsVideo) {
                insertPhotoIntoFrame(dragMediaSrc, frame);
                dragMediaSrc = null;
                return;
            }
            if (dragStickerSrc) {
                insertStickerIntoFrame(dragStickerSrc, frame);
                dragStickerSrc = null;
            }
        });
    }

    document.querySelectorAll('.sticker-frame').forEach(frame => initFrameDrop(frame));

    // ==========================================
    // FRAME DROP — photo / video placeholders
    // ==========================================

    function initPhotoFrameDrop(frame, isVideo) {
        if (frame._photoDropInit) return;
        frame._photoDropInit = true;
        frame.addEventListener('dragover', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            const hasFiles = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files');
            if (!hasFiles && !dragMediaSrc) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            frame.classList.add('drop-hover');
        });
        frame.addEventListener('dragleave', function (e) {
            if (!frame.contains(e.relatedTarget)) frame.classList.remove('drop-hover');
        });
        frame.addEventListener('drop', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.preventDefault();
            e.stopPropagation();
            frame.classList.remove('drop-hover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                const url = URL.createObjectURL(file);
                if (!isVideo && file.type.startsWith('image/')) { insertPhotoIntoPlaceholder(url, frame); return; }
                if (isVideo  && file.type.startsWith('video/')) { insertVideoIntoPlaceholder(url, frame); return; }
                return;
            }
            if (dragMediaSrc) {
                if (!isVideo && !dragMediaIsVideo) insertPhotoIntoPlaceholder(dragMediaSrc, frame);
                else if (isVideo && dragMediaIsVideo) insertVideoIntoPlaceholder(dragMediaSrc, frame);
                dragMediaSrc = null;
            }
        });
    }

    document.querySelectorAll('.hero-photo, .memory-photo').forEach(f => initPhotoFrameDrop(f, false));
    document.querySelectorAll('.video-player').forEach(f => initPhotoFrameDrop(f, true));

    // ==========================================
    // МЕДІА ПАНЕЛЬ — "Передати файли" + галерея
    // ==========================================

    const mediaUploadInput = document.createElement('input');
    mediaUploadInput.type = 'file';
    mediaUploadInput.accept = 'image/*,video/*';
    mediaUploadInput.multiple = true;
    mediaUploadInput.style.display = 'none';
    document.body.appendChild(mediaUploadInput);

    const mediaUploadBtn = document.querySelector('#menu-media .dropdown-upload-btn');
    if (mediaUploadBtn) mediaUploadBtn.addEventListener('click', () => mediaUploadInput.click());

    function getOrCreateGrid(tabContent) {
        let grid = tabContent.querySelector('.dropdown-grid');
        if (!grid) {
            const empty = tabContent.querySelector('.dropdown-empty');
            if (empty) empty.remove();
            grid = document.createElement('div');
            grid.className = 'dropdown-grid';
            tabContent.appendChild(grid);
        }
        return grid;
    }

    mediaUploadInput.addEventListener('change', function () {
        Array.from(this.files).forEach(file => {
            const url = URL.createObjectURL(file);
            const isVideo = file.type.startsWith('video/');
            const item = document.createElement('div');
            item.className = 'dropdown-grid-item';
            const el = isVideo ? document.createElement('video') : document.createElement('img');
            el.src = url;
            if (isVideo) { el.muted = true; el.preload = 'metadata'; }
            item.appendChild(el);
            const tabContent = document.getElementById(isVideo ? 'media-video' : 'media-images');
            if (tabContent) getOrCreateGrid(tabContent).appendChild(item);
            bindMediaGalleryItem(item, url, isVideo);
        });
        this.value = '';
    });

    function bindMediaGalleryItem(item, url, isVideo) {
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'grab';
        item.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.stopPropagation();
            if (!activePlaceholder) return;
            if (!isVideo) insertPhotoIntoPlaceholder(url, activePlaceholder);
            else insertVideoIntoPlaceholder(url, activePlaceholder);
            activePlaceholder = null;
        });
        item.addEventListener('dragstart', function (e) {
            dragMediaSrc = url;
            dragMediaIsVideo = isVideo;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', url);
        });
        item.addEventListener('dragend', function () {
            item.classList.remove('dragging');
            dragMediaSrc = null;
        });
    }

    document.querySelectorAll('#media-images .dropdown-grid-item').forEach(item => {
        const img = item.querySelector('img');
        if (img) bindMediaGalleryItem(item, img.src, false);
    });
    document.querySelectorAll('#media-video .dropdown-grid-item').forEach(item => {
        const vid = item.querySelector('video');
        if (vid) bindMediaGalleryItem(item, vid.src, true);
    });

    // ==========================================
    // ФОН ПАНЕЛЬ — клік + "Передати файли"
    // ==========================================

    function applyPageBg(bgImageUrl, bgStyle) {
        const canvas = document.getElementById('page-canvas');
        if (!canvas) return;
        if (bgImageUrl) {
            canvas.style.backgroundImage = `url('${bgImageUrl}')`;
            canvas.style.backgroundSize = 'cover';
            canvas.style.backgroundPosition = 'center';
            canvas.style.background = '';
        } else {
            canvas.style.backgroundImage = '';
            canvas.style.background = bgStyle || '';
        }
    }

    function bindBgItem(item) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.stopPropagation();
            document.querySelectorAll('.bg-item').forEach(i => i.classList.remove('bg-item-active'));
            this.classList.add('bg-item-active');
            if (this.dataset.bgImage) {
                applyPageBg(this.dataset.bgImage, null);
            } else {
                applyPageBg(null, this.dataset.bg || this.style.background);
            }
        });
    }

    document.querySelectorAll('#menu-bg .bg-item').forEach(item => {
        if (!item.dataset.bg) item.dataset.bg = item.style.background;
        bindBgItem(item);
    });

    const bgUploadInput = document.createElement('input');
    bgUploadInput.type = 'file';
    bgUploadInput.accept = 'image/*';
    bgUploadInput.style.display = 'none';
    document.body.appendChild(bgUploadInput);

    const bgUploadBtn = document.querySelector('#menu-bg .dropdown-upload-btn');
    if (bgUploadBtn) bgUploadBtn.addEventListener('click', () => bgUploadInput.click());

    bgUploadInput.addEventListener('change', function () {
        if (!this.files[0]) return;
        const url = URL.createObjectURL(this.files[0]);
        const item = document.createElement('div');
        item.className = 'dropdown-grid-item bg-item';
        item.style.backgroundImage = `url('${url}')`;
        item.style.backgroundSize = 'cover';
        item.style.backgroundPosition = 'center';
        item.dataset.bgImage = url;
        const bgAdded = document.getElementById('bg-added');
        if (bgAdded) getOrCreateGrid(bgAdded).appendChild(item);
        bindBgItem(item);
        item.click();
        // перемикаємо на вкладку "Додані"
        document.querySelectorAll('#menu-bg .dropdown-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#menu-bg .dropdown-tab-content').forEach(c => c.style.display = 'none');
        const addedTab = document.querySelector('#menu-bg .dropdown-tab[onclick*="bg-added"]');
        if (addedTab) addedTab.classList.add('active');
        if (bgAdded) bgAdded.style.display = '';
        this.value = '';
    });

    // ==========================================
    // ДЕКОР ПАНЕЛЬ — "Передати файли"
    // ==========================================

    const decorUploadInput = document.createElement('input');
    decorUploadInput.type = 'file';
    decorUploadInput.accept = 'image/*';
    decorUploadInput.multiple = true;
    decorUploadInput.style.display = 'none';
    document.body.appendChild(decorUploadInput);

    const decorUploadBtn = document.querySelector('#menu-decor .dropdown-upload-btn');
    if (decorUploadBtn) decorUploadBtn.addEventListener('click', () => decorUploadInput.click());

    decorUploadInput.addEventListener('change', function () {
        const decorAdded = document.getElementById('decor-added');
        const decorGrid = decorAdded ? getOrCreateGrid(decorAdded) : null;
        Array.from(this.files).forEach(file => {
            const url = URL.createObjectURL(file);
            const item = document.createElement('div');
            item.className = 'dropdown-grid-item';
            const img = document.createElement('img');
            img.src = url;
            item.appendChild(img);
            if (decorGrid) decorGrid.appendChild(item);
            bindDecorItem(img);
        });
        // перемикаємо на вкладку "Доданий"
        document.querySelectorAll('#menu-decor .dropdown-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#menu-decor .dropdown-tab-content').forEach(c => c.style.display = 'none');
        const addedTab = document.querySelector('#menu-decor .dropdown-tab[onclick*="decor-added"]');
        if (addedTab) addedTab.classList.add('active');
        if (decorAdded) decorAdded.style.display = '';
        this.value = '';
    });

    // ==========================================
    // КНОПКА РЕДАГУВАННЯ
    // ==========================================

    const editBtn = document.querySelector('.edit-page-btn');
    if (editBtn) {
        editBtn.addEventListener('click', function () {
            const toolbar = document.getElementById('editor-toolbar');
            toolbar.classList.toggle('visible');
            document.body.classList.toggle('editing-mode');
            clipStickersToCanvas();
            _updateUndoRedoBtns();
        });
    }

    const previewBtn = document.querySelector('.btn-preview');
    if (previewBtn) previewBtn.addEventListener('click', enterPreviewMode);

    const publishBtn = document.querySelector('.btn-publish');
    if (publishBtn) publishBtn.addEventListener('click', openPublishModal);

    document.addEventListener('click', function (e) {
        const menus = ['blocks', 'media', 'bg', 'decor'];
        const isToolbarBtn = e.target.closest('.has-dropdown');
        const isDropdown = e.target.closest('.dropdown-menu');
        if (!isToolbarBtn && !isDropdown) {
            menus.forEach(id => {
                const m = document.getElementById('menu-' + id);
                if (m) { m.style.display = 'none'; m.scrollTop = 0; }
                const btn = document.querySelector(`[onclick="toggleMenu('${id}')"]`);
                if (btn) btn.classList.remove('active');
            });
        }
    });

    const cloud = document.getElementById('save-cloud');
    if (cloud) {
        const tooltip = document.createElement('div');
        tooltip.className = 'save-tooltip-global';
        tooltip.innerText = 'Чернетку збережено';
        document.body.appendChild(tooltip);
        cloud.addEventListener('mouseenter', function () {
            const rect = cloud.getBoundingClientRect();
            tooltip.style.display = 'block';
            tooltip.style.top = (rect.bottom + 8) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        });
        cloud.addEventListener('mouseleave', function () {
            tooltip.style.display = 'none';
        });
    }

    const layersWindow = document.getElementById('layers-window');
    const dragHandle = document.getElementById('layers-drag-handle');
    if (dragHandle) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        dragHandle.addEventListener('mousedown', function (e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = layersWindow.offsetLeft;
            startTop = layersWindow.offsetTop;
            dragHandle.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            layersWindow.style.left = (startLeft + e.clientX - startX) + 'px';
            layersWindow.style.top = (startTop + e.clientY - startY) + 'px';
            layersWindow.style.right = 'auto';
        });
        document.addEventListener('mouseup', function () {
            isDragging = false;
            dragHandle.style.cursor = 'grab';
        });
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.share-lock-select') && !e.target.closest('#lock-icon-wrap')) {
            const d = document.getElementById('share-lock-dropdown');
            if (d) d.style.display = 'none';
        }
        if (!e.target.closest('#share-access-select')) {
            const d = document.getElementById('share-access-dropdown');
            if (d) d.style.display = 'none';
        }
    });

    // ==========================================
    // СКРОЛ
    // ==========================================

    // ==========================================
    // ШАБЛОНИ БЛОКІВ
    // ==========================================

    const BLOCK_TYPES = [
        { id: 'hero',         label: 'Титульний блок',    icon: 'icons/block_hero.svg' },
        { id: 'bio',          label: 'Біографія',          icon: 'icons/block_bio.svg' },
        { id: 'world',        label: 'Світ людини',        icon: 'icons/block_world.svg' },
        { id: 'memory-left',  label: 'Спогади (ліво)',     icon: 'icons/block_memory_left.svg' },
        { id: 'memory-right', label: 'Спогади (право)',    icon: 'icons/block_memory_right.svg' },
        { id: 'video',        label: 'Відео',              icon: 'icons/block_video.svg' },
        { id: 'quote',        label: 'Цитата',             icon: 'icons/block_quote.svg' },
        { id: 'family',       label: 'Вшанування',         icon: 'icons/block_family.svg' },
    ];

    function getBlockTemplate(type) {
        const photoSlot = `<div class="photo-placeholder"><button class="placeholder-add-btn placeholder-add-photo-btn">Додати фото</button></div>`;
        switch (type) {
            case 'hero': return `
<section class="hero-block page-editable-block">
    <div class="hero-photo">${photoSlot}</div>
    <div class="hero-right">
        <div class="hero-info">
            <h1>Ім'я та прізвище</h1>
            <p class="dates">00.00.0000 – 00.00.0000</p>
        </div>
        <div class="quote-wrapper">
            <p class="quote-text">«Цитата»</p>
            <p class="quote-author">Автор</p>
        </div>
    </div>
</section>`;
            case 'bio': return `
<section class="bio-block page-editable-block">
    <h2 class="section-title">БІОГРАФІЯ</h2>
    <div class="bio-content">
        <div class="bio-column"><p>Текст біографії...</p></div>
        <div class="bio-column"><p>Продовження...</p></div>
    </div>
</section>`;
            case 'world': return `
<section class="human-world-section page-editable-block">
    <div class="human-world-container">
        <h2 class="section-title">СВІТ ЛЮДИНИ</h2>
        <div class="world-grid">
            <div class="world-card">
                <div class="sticker-frame"><div class="sticker-frame-placeholder"><button class="frame-add-photo-btn">Фото</button><button class="frame-add-sticker-btn">Стікер</button></div></div>
                <div class="card-body"><h3>НАЗВА:</h3><p>Додайте опис</p></div>
            </div>
        </div>
        <button class="world-add-card-btn"><span class="btn-icon plus-circle-icon"></span> Додати картку</button>
    </div>
</section>`;
            case 'memory-left': return `
<div class="memory-section-block page-editable-block">
    <div class="memory-content"><h2>СПОГАДИ</h2><p>«Текст спогаду...»</p></div>
    <div class="memory-photo">${photoSlot}</div>
</div>`;
            case 'memory-right': return `
<div class="memory-section-block page-editable-block">
    <div class="memory-photo">${photoSlot}</div>
    <div class="memory-content"><h2>СПОГАДИ</h2><p>«Текст спогаду...»</p></div>
</div>`;
            case 'video': return `
<section class="video-block page-editable-block">
    <h2 class="section-title">МИ</h2>
    <p class="video-description">«Текст...»</p>
    <div class="video-player">
        <div class="photo-placeholder"><button class="placeholder-add-btn placeholder-add-video-btn">Додати відео</button></div>
        <div class="video-ui" style="display:none">
            <div class="video-play-overlay"><button class="video-play-big"></button></div>
            <div class="video-bar">
                <div class="video-seek-row"><input type="range" class="video-seek" min="0" max="100" value="0" step="0.1"></div>
                <div class="video-bar-controls">
                    <div class="video-bar-left">
                        <button class="video-play-btn"></button>
                        <span class="video-time">0:00 / 0:00</span>
                    </div>
                    <div class="video-bar-right">
                        <select class="video-speed">
                            <option value="0.5">0.5×</option>
                            <option value="1" selected>1×</option>
                            <option value="1.5">1.5×</option>
                            <option value="2">2×</option>
                        </select>
                        <button class="video-mute-btn"></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>`;
            case 'quote': return `
<section class="quote-cloud-section page-editable-block">
    <div class="top-cloud-quote"><div class="cloud-quote-inner-box">
        <p class="cloud-quote-text">«Текст цитати»</p>
        <p class="cloud-quote-author">Автор</p>
    </div></div>
</section>`;
            case 'family': return `
<section class="family-tribute-section page-editable-block">
    <img src="img/clouds_bg.svg" alt="" class="bg-clouds-layer">
    <div class="family-tribute-container"><div class="family-memory-card">
        <h1>ВІД РОДИНИ</h1>
        <p class="family-memory-text">«Текст від родини...»</p>
    </div></div>
</section>`;
            default: return '';
        }
    }

    function initNewBlock(block) {
        if (block._blockInit) return;
        block._blockInit = true;
        // вибір блоку кліком
        block.addEventListener('click', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            e.stopPropagation();
            selectBlock(this);
        });

        // редагування тексту
        block.querySelectorAll('h1, h2, h3, p, .dates').forEach(el => {
            el.addEventListener('click', function (e) {
                if (!document.body.classList.contains('editing-mode')) return;
                if (this.contentEditable === 'true') return;
                e.stopPropagation();
                saveState();
                this.contentEditable = 'true';
                this.style.whiteSpace = 'normal';
                this.style.wordBreak = 'break-word';
                this.focus();
                this.style.outline = 'none';
                this.style.cursor = 'text';
            });
            el.addEventListener('blur', function () {
                this.contentEditable = 'false';
                this.style.cursor = '';
            });
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { this.contentEditable = 'false'; this.blur(); }
            });
        });

        // placeholder фото
        block.querySelectorAll('.placeholder-add-photo-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                activePlaceholder = this.closest('.hero-photo') || this.closest('.memory-photo');
                mainPhotoInput.click();
            });
        });
        block.querySelectorAll('.placeholder-add-video-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                activePlaceholder = this.closest('.video-player');
                mainVideoInput.click();
            });
        });
        // drag-drop для нових photo/video фреймів
        block.querySelectorAll('.hero-photo, .memory-photo').forEach(f => {
            if (typeof initPhotoFrameDrop === 'function') initPhotoFrameDrop(f, false);
        });
        block.querySelectorAll('.video-player').forEach(f => {
            if (typeof initPhotoFrameDrop === 'function') initPhotoFrameDrop(f, true);
        });

        // Світ людини
        if (block.classList.contains('human-world-section')) {
            block.querySelectorAll('.world-card').forEach(card => initWorldCard(card));
            recalcWorldCards();
            const addBtn = block.querySelector('.world-add-card-btn');
            if (addBtn) {
                addBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const grid = block.querySelector('.world-grid');
                    if (grid.querySelectorAll('.world-card').length >= 9) return;
                    const newCard = document.createElement('div');
                    newCard.className = 'world-card';
                    newCard.innerHTML = `<div class="sticker-frame"><div class="sticker-frame-placeholder"><button class="frame-add-photo-btn">Фото</button><button class="frame-add-sticker-btn">Стікер</button></div></div><div class="card-body"><h3>НАЗВА:</h3><p>Додайте опис</p></div>`;
                    grid.appendChild(newCard);
                    initWorldCard(newCard);
                    recalcWorldCards();
                });
            }
            block.querySelectorAll('.frame-add-photo-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    activeFrame = this.closest('.sticker-frame');
                    framePhotoInput.click();
                });
            });
            block.querySelectorAll('.frame-add-sticker-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    activeFrame = this.closest('.sticker-frame');
                    frameStickerInput.click();
                });
            });
        }

        // char limits
        block.querySelectorAll('.quote-text').forEach(el => {
            el.addEventListener('input', function () {
                if (this.innerText.length > 120) {
                    this.innerText = this.innerText.substring(0, 120);
                    const r = document.createRange(); const s = window.getSelection();
                    r.selectNodeContents(this); r.collapse(false); s.removeAllRanges(); s.addRange(r);
                }
            });
        });
        block.querySelectorAll('.cloud-quote-text').forEach(el => addCharLimitEl(el, 260));
        block.querySelectorAll('.family-memory-text').forEach(el => addCharLimitEl(el, 1200));
    }

    function addCharLimitEl(el, max) {
        el.addEventListener('input', function () {
            if (!this.isContentEditable || this.contentEditable === 'false') return;
            if (this.innerText.length > max) {
                this.innerText = this.innerText.substring(0, max);
                const r = document.createRange(); const s = window.getSelection();
                r.selectNodeContents(this); r.collapse(false); s.removeAllRanges(); s.addRange(r);
            }
        });
    }

    function insertBlockAfter(type, refBlock) {
        saveState();
        const html = getBlockTemplate(type);
        if (!html) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        const newBlock = tmp.firstElementChild;
        refBlock.parentNode.insertBefore(newBlock, refBlock.nextSibling);
        initNewBlock(newBlock);
        newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ==========================================
    // КНОПКА "ДОДАТИ БЛОК" + QUICK MENU
    // ==========================================

    const addBlockBtn = document.createElement('button');
    addBlockBtn.className = 'add-block-btn';
    addBlockBtn.innerHTML = '<span class="btn-icon plus-circle-icon" style="width:20px;height:20px;"></span>Додати блок';
    document.body.appendChild(addBlockBtn);

    const quickAddMenu = document.createElement('div');
    quickAddMenu.className = 'quick-add-menu';
    quickAddMenu.innerHTML = `
        <div class="quick-add-menu-label">Оберіть блок</div>
        <div class="quick-add-grid">
            ${BLOCK_TYPES.map(b => `
            <div class="quick-add-item" data-type="${b.id}">
                <img src="${b.icon}" alt="${b.label}">
                <span>${b.label}</span>
            </div>`).join('')}
        </div>`;
    document.body.appendChild(quickAddMenu);

    function positionAddBlockBtn(block) {
        if (!block) { addBlockBtn.style.display = 'none'; return; }
        const rect = block.getBoundingClientRect();
        addBlockBtn.style.display = 'flex';
        addBlockBtn.style.left = (rect.left + rect.width / 2) + 'px';
        addBlockBtn.style.top  = (rect.bottom - 24) + 'px';
    }

    function closeQuickMenu() {
        quickAddMenu.style.display = 'none';
    }

    addBlockBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (quickAddMenu.style.display === 'block') { closeQuickMenu(); return; }
        const btnRect = addBlockBtn.getBoundingClientRect();
        quickAddMenu.style.display = 'block';
        // позиція: по центру кнопки, над нею (або під, якщо немає місця)
        const menuW = 488;
        let left = btnRect.left + btnRect.width / 2 - menuW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
        const menuH = quickAddMenu.offsetHeight || 160;
        let top = btnRect.top - menuH - 12;
        if (top < getStickyBottom() + 8) top = btnRect.bottom + 12;
        quickAddMenu.style.left = left + 'px';
        quickAddMenu.style.top  = top + 'px';
    });

    quickAddMenu.querySelectorAll('.quick-add-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!selectedBlock) return;
            insertBlockAfter(this.dataset.type, selectedBlock);
            closeQuickMenu();
        });
    });

    // закриваємо quick menu при кліку поза ним
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.add-block-btn') && !e.target.closest('.quick-add-menu')) {
            closeQuickMenu();
        }
    });

    // ==========================================
    // DRAG БЛОКІВ З ПАНЕЛІ ІНСТРУМЕНТІВ
    // ==========================================

    let dragBlockType = null;
    let dropIndicator = null;

    document.querySelectorAll('#menu-blocks .dropdown-item').forEach((item, i) => {
        item.setAttribute('draggable', 'true');
        const type = BLOCK_TYPES[i] ? BLOCK_TYPES[i].id : null;
        item.addEventListener('click', function () {
            if (!document.body.classList.contains('editing-mode') || !type) return;
            const container = getBlocksContainer();
            if (!container) return;
            const html = getBlockTemplate(type);
            if (!html) return;
            const tmp = document.createElement('div');
            tmp.innerHTML = html.trim();
            const newBlock = tmp.firstElementChild;
            if (selectedBlock) {
                selectedBlock.parentNode.insertBefore(newBlock, selectedBlock.nextSibling);
            } else {
                container.appendChild(newBlock);
            }
            initNewBlock(newBlock);
            newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        item.addEventListener('dragstart', function (e) {
            if (!document.body.classList.contains('editing-mode')) return;
            dragBlockType = type;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', type);
        });
        item.addEventListener('dragend', function () {
            item.classList.remove('dragging');
            dragBlockType = null;
            removeDropIndicator();
        });
    });

    function removeDropIndicator() {
        if (dropIndicator && dropIndicator.parentNode) dropIndicator.parentNode.removeChild(dropIndicator);
        dropIndicator = null;
    }

    function getBlocksContainer() {
        const canvas = document.getElementById('page-canvas');
        if (!canvas) return null;
        const firstBlock = canvas.querySelector('.page-editable-block');
        return firstBlock ? firstBlock.parentNode : canvas;
    }

    function getDropTarget(e) {
        const canvas = document.getElementById('page-canvas');
        if (!canvas) return null;
        const blocks = Array.from(canvas.querySelectorAll('.page-editable-block'));
        const container = blocks.length > 0 ? blocks[0].parentNode : canvas;
        let insertBefore = null;
        for (const block of blocks) {
            const rect = block.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (e.clientY < mid) { insertBefore = block; break; }
        }
        return { container, blocks, insertBefore };
    }

    document.getElementById('page-canvas').addEventListener('dragover', function (e) {
        if (!dragBlockType && !dragStickerSrc) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (dragBlockType) {
            const { container, insertBefore } = getDropTarget(e);
            removeDropIndicator();
            dropIndicator = document.createElement('div');
            dropIndicator.className = 'block-drop-indicator';
            if (insertBefore) container.insertBefore(dropIndicator, insertBefore);
            else container.appendChild(dropIndicator);
        } else {
            removeDropIndicator();
        }
    });

    document.getElementById('page-canvas').addEventListener('dragleave', function (e) {
        if (!e.relatedTarget || !document.getElementById('page-canvas').contains(e.relatedTarget)) {
            removeDropIndicator();
        }
    });

    document.getElementById('page-canvas').addEventListener('drop', function (e) {
        e.preventDefault();
        if (dragStickerSrc) {
            const src = dragStickerSrc;
            dragStickerSrc = null;
            removeDropIndicator();
            const canvas = document.getElementById('page-canvas');
            const cr = canvas.getBoundingClientRect();
            addStickerToCanvasAt(src, e.clientX - cr.left - 60, e.clientY - cr.top - 60);
            return;
        }
        if (!dragBlockType) return;
        saveState();
        const type = dragBlockType;
        const { container, insertBefore } = getDropTarget(e);
        removeDropIndicator();
        const html = getBlockTemplate(type);
        if (!html) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        const newBlock = tmp.firstElementChild;
        if (insertBefore) container.insertBefore(newBlock, insertBefore);
        else container.appendChild(newBlock);
        initNewBlock(newBlock);
        newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dragBlockType = null;
    });

    window.addEventListener('scroll', function () {
        if (selectedBlock) {
            repositionBlockToolbar();
        }
        if (selectedSticker) {
            updateStickerToolbarPosition(selectedSticker);
            showStickerHandles(selectedSticker);
        }
        if (selectedPhoto && !scaleMode) {
            const rect = selectedPhoto.getBoundingClientRect();
            const stickyBottom = getStickyBottom();
            const toolbarLeft = Math.min(
                Math.max(0, rect.left + 8),
                window.innerWidth - imgToolbar.offsetWidth - 8
            );
            if (rect.bottom < stickyBottom || rect.top > window.innerHeight) {
                imgToolbar.style.display = 'none';
            } else {
                imgToolbar.style.display = 'flex';
                imgToolbar.style.top = (Math.max(stickyBottom + 4, rect.top + 8)) + 'px';
                imgToolbar.style.left = toolbarLeft + 'px';
            }
        }
        clipStickersToCanvas();
    });

    // expose internal functions for undo/redo restore
    window.initNewBlock = initNewBlock;
    window.moveToCanvas = moveToCanvas;
    window.addStickerDrag = addStickerDrag;
    window.bindPhotoClick = bindPhotoClick;
    window.bindPhotoDrag = bindPhotoDrag;
    window.initFrameDrop = initFrameDrop;
    window.initPhotoFrameDrop = initPhotoFrameDrop;
    window.clipStickersToCanvas = clipStickersToCanvas;
    window.refreshLayersPanel = refreshLayersPanel;
    window.removeAllHandles = removeAllHandles;

});