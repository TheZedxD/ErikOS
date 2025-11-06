// ErikOS - Windows 2000 Desktop Emulator
// Simple, clean implementation with full window management

class WindowManager {
    constructor() {
        this.windows = new Map();
        this.windowCounter = 0;
        this.highestZIndex = 1000;
        this.activeWindow = null;
    }

    createWindow(title, icon, content, width = 500, height = 400) {
        const windowId = `window-${this.windowCounter++}`;

        // Create window element
        const windowEl = document.createElement('div');
        windowEl.className = 'window active';
        windowEl.id = windowId;
        windowEl.style.width = `${width}px`;
        windowEl.style.height = `${height}px`;
        windowEl.style.left = `${50 + (this.windowCounter * 30) % 200}px`;
        windowEl.style.top = `${50 + (this.windowCounter * 30) % 150}px`;
        windowEl.style.zIndex = ++this.highestZIndex;

        // Create title bar
        const titleBar = document.createElement('div');
        titleBar.className = 'window-titlebar';
        titleBar.innerHTML = `
            <div class="window-title">
                <span class="window-icon">${icon}</span>
                <span>${title}</span>
            </div>
            <div class="window-controls">
                <button class="window-button minimize" title="Minimize"></button>
                <button class="window-button maximize" title="Maximize"></button>
                <button class="window-button close" title="Close"></button>
            </div>
        `;

        // Create content area
        const contentArea = document.createElement('div');
        contentArea.className = 'window-content';
        contentArea.innerHTML = content;

        windowEl.appendChild(titleBar);
        windowEl.appendChild(contentArea);
        document.getElementById('windows-container').appendChild(windowEl);

        // Store window data
        this.windows.set(windowId, {
            id: windowId,
            element: windowEl,
            title: title,
            icon: icon,
            isMinimized: false,
            isMaximized: false
        });

        // Set up event handlers
        this.setupWindowEvents(windowId);

        // Create taskbar item
        this.createTaskbarItem(windowId, title, icon);

        // Set as active window
        this.setActiveWindow(windowId);

        return windowId;
    }

    setupWindowEvents(windowId) {
        const window = this.windows.get(windowId);
        const windowEl = window.element;
        const titleBar = windowEl.querySelector('.window-titlebar');

        // Click to focus
        windowEl.addEventListener('mousedown', () => {
            this.setActiveWindow(windowId);
        });

        // Dragging
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-button')) return;
            if (window.isMaximized) return;

            isDragging = true;
            const rect = windowEl.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            windowEl.style.cursor = 'move';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            windowEl.style.left = `${Math.max(0, Math.min(x, window.innerWidth - 200))}px`;
            windowEl.style.top = `${Math.max(0, Math.min(y, window.innerHeight - 100))}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                windowEl.style.cursor = 'default';
            }
        });

        // Window controls
        const minimizeBtn = windowEl.querySelector('.minimize');
        const maximizeBtn = windowEl.querySelector('.maximize');
        const closeBtn = windowEl.querySelector('.close');

        minimizeBtn.addEventListener('click', () => this.minimizeWindow(windowId));
        maximizeBtn.addEventListener('click', () => this.toggleMaximize(windowId));
        closeBtn.addEventListener('click', () => this.closeWindow(windowId));

        // Double-click title bar to maximize
        titleBar.addEventListener('dblclick', (e) => {
            if (e.target.closest('.window-button')) return;
            this.toggleMaximize(windowId);
        });
    }

    setActiveWindow(windowId) {
        // Deactivate all windows
        this.windows.forEach((win) => {
            win.element.classList.remove('active');
            const taskbarItem = document.querySelector(`[data-window-id="${win.id}"]`);
            if (taskbarItem) taskbarItem.classList.remove('active');
        });

        // Activate selected window
        const window = this.windows.get(windowId);
        if (window) {
            window.element.classList.add('active');
            window.element.style.zIndex = ++this.highestZIndex;
            this.activeWindow = windowId;

            const taskbarItem = document.querySelector(`[data-window-id="${windowId}"]`);
            if (taskbarItem) taskbarItem.classList.add('active');
        }
    }

    minimizeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        window.element.classList.add('minimized');
        window.isMinimized = true;

        // Find next window to activate
        const otherWindows = Array.from(this.windows.values())
            .filter(w => !w.isMinimized && w.id !== windowId);

        if (otherWindows.length > 0) {
            this.setActiveWindow(otherWindows[0].id);
        }
    }

    restoreWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        window.element.classList.remove('minimized');
        window.isMinimized = false;
        this.setActiveWindow(windowId);
    }

    toggleMaximize(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        if (window.isMaximized) {
            window.element.classList.remove('maximized');
            window.isMaximized = false;
        } else {
            window.element.classList.add('maximized');
            window.isMaximized = true;
        }
    }

    closeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        // Remove window element
        window.element.remove();

        // Remove taskbar item
        const taskbarItem = document.querySelector(`[data-window-id="${windowId}"]`);
        if (taskbarItem) taskbarItem.remove();

        // Remove from map
        this.windows.delete(windowId);

        // Activate another window if available
        const remainingWindows = Array.from(this.windows.values());
        if (remainingWindows.length > 0) {
            this.setActiveWindow(remainingWindows[0].id);
        }
    }

    createTaskbarItem(windowId, title, icon) {
        const taskbarItems = document.getElementById('taskbar-items');
        const item = document.createElement('div');
        item.className = 'taskbar-item';
        item.setAttribute('data-window-id', windowId);
        item.innerHTML = `
            <span class="taskbar-item-icon">${icon}</span>
            <span class="taskbar-item-text">${title}</span>
        `;

        item.addEventListener('click', () => {
            const window = this.windows.get(windowId);
            if (window.isMinimized) {
                this.restoreWindow(windowId);
            } else if (this.activeWindow === windowId) {
                this.minimizeWindow(windowId);
            } else {
                this.setActiveWindow(windowId);
            }
        });

        taskbarItems.appendChild(item);
    }
}

// Application definitions
const apps = {
    notepad: {
        title: 'Notepad',
        icon: '📝',
        create: () => `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 5px; background: #ECE9D8; border-bottom: 1px solid #808080;">
                    <button onclick="alert('New file')" style="padding: 5px 15px;">New</button>
                    <button onclick="alert('Open file')" style="padding: 5px 15px;">Open</button>
                    <button onclick="alert('Save file')" style="padding: 5px 15px;">Save</button>
                </div>
                <textarea style="flex: 1; width: 100%; border: none; padding: 10px; font-family: 'Courier New', monospace; resize: none;" placeholder="Type your notes here..."></textarea>
            </div>
        `
    },
    paint: {
        title: 'Paint',
        icon: '🎨',
        create: () => `
            <div style="display: flex; flex-direction: column; height: 100%; align-items: center; justify-content: center;">
                <h2>🎨 Paint</h2>
                <p>Simple drawing application</p>
                <canvas width="400" height="300" style="border: 1px solid #000; background: white; margin-top: 20px;"></canvas>
                <div style="margin-top: 10px;">
                    <button onclick="this.parentElement.previousElementSibling.getContext('2d').clearRect(0, 0, 400, 300)">Clear</button>
                </div>
            </div>
        `
    },
    files: {
        title: 'My Files',
        icon: '📁',
        create: () => `
            <div style="height: 100%;">
                <div style="padding: 5px; background: #ECE9D8; border-bottom: 1px solid #808080;">
                    <button style="padding: 5px 15px;">Back</button>
                    <button style="padding: 5px 15px;">Forward</button>
                    <button style="padding: 5px 15px;">Up</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 10px;">📁 Documents</div>
                    <div style="margin-bottom: 10px;">📁 Pictures</div>
                    <div style="margin-bottom: 10px;">📁 Music</div>
                    <div style="margin-bottom: 10px;">📁 Videos</div>
                    <div style="margin-bottom: 10px;">📄 README.txt</div>
                </div>
            </div>
        `
    },
    calculator: {
        title: 'Calculator',
        icon: '🔢',
        create: () => `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
                <input type="text" id="calc-display" value="0" readonly style="width: 200px; padding: 10px; font-size: 18px; text-align: right; margin-bottom: 10px;">
                <div style="display: grid; grid-template-columns: repeat(4, 50px); gap: 5px;">
                    ${[7,8,9,'/',4,5,6,'*',1,2,3,'-',0,'.','=','+'].map(btn =>
                        `<button onclick="calcPress('${btn}')" style="padding: 15px; font-size: 16px;">${btn}</button>`
                    ).join('')}
                </div>
                <button onclick="document.getElementById('calc-display').value='0'" style="width: 100%; margin-top: 10px; padding: 10px;">Clear</button>
            </div>
        `
    },
    settings: {
        title: 'Settings',
        icon: '⚙️',
        create: () => `
            <div style="padding: 20px;">
                <h2>⚙️ Settings</h2>
                <div style="margin: 20px 0;">
                    <h3>Display</h3>
                    <label>
                        <input type="checkbox" id="dark-mode"> Dark Mode
                    </label>
                </div>
                <div style="margin: 20px 0;">
                    <h3>About</h3>
                    <p><strong>ErikOS</strong></p>
                    <p>Windows 2000 Style Desktop Emulator</p>
                    <p>Version 2.0</p>
                </div>
            </div>
        `
    }
};

// Calculator helper function
window.calcPress = function(val) {
    const display = document.getElementById('calc-display');
    if (val === '=') {
        try {
            display.value = eval(display.value) || '0';
        } catch (e) {
            display.value = 'Error';
        }
    } else {
        if (display.value === '0' || display.value === 'Error') {
            display.value = val;
        } else {
            display.value += val;
        }
    }
};

// Initialize
const windowManager = new WindowManager();

// Set up desktop icons
document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        // Remove selection from all icons
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
    });

    icon.addEventListener('dblclick', () => {
        const appId = icon.getAttribute('data-app');
        launchApp(appId);
    });
});

// Set up start menu items
document.querySelectorAll('.start-menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const appId = item.getAttribute('data-app');
        launchApp(appId);
        hideStartMenu();
    });
});

// Start button
const startButton = document.getElementById('start-button');
const startMenu = document.getElementById('start-menu');

startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('hidden');
});

// Click outside to close start menu
document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startButton) {
        hideStartMenu();
    }
});

function hideStartMenu() {
    startMenu.classList.add('hidden');
}

function launchApp(appId) {
    const app = apps[appId];
    if (app) {
        windowManager.createWindow(app.title, app.icon, app.create());
    }
}

// Clock
function updateClock() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    document.getElementById('clock').textContent = `${hours}:${minutes} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);

// Click on desktop to deselect icons
document.getElementById('desktop').addEventListener('click', (e) => {
    if (e.target.id === 'desktop' || e.target.className === 'desktop-icons') {
        document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
    }
});

console.log('ErikOS loaded successfully!');
