const { app, BrowserWindow, Menu, shell, Tray, ipcMain } = require('electron')
const log = require("electron-log")
const { autoUpdater } = require("electron-updater")
const path = require("path")
const { version } = require("../package.json")
require("dotenv").config()

autoUpdater.logger = log;

/**
 * @type {BrowserWindow | undefined}
 */
let mainWindow

/**
 * @type {Tray | undefined}
 */
let tray

/**
 * @type {BrowserWindow | undefined}
 */
let overlayWindow

async function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  })

  mainWindow.setTitle("LaRADIOdugaming Client")

  if(process.env.DEV) mainWindow.setIcon("./src/assets/icon.png")
  if(!process.env.DEV) mainWindow.removeMenu()

  await mainWindow.loadFile("./src/html/index.html")

  mainWindow.on("close", (e) => {
    if(!app.quitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  tray = new Tray(process.env.DEV ? "./src/assets/icon.png" : path.join(process.resourcesPath, "icon.png"))
  tray.setToolTip("LaRADIOdugaming Client")
  tray.setContextMenu(createMenuTemplate())
  tray.on("click", () => mainWindow.show())
}

function createOverlayWindow() {
  tray.setContextMenu(createMenuTemplate(false))

  overlayWindow = new BrowserWindow({
    minWidth: 381,
    minHeight: 127,
    maxWidth: 603,
    maxHeight: 201,
    frame: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true
  })

  overlayWindow.setAlwaysOnTop(true, "floating")
  overlayWindow.setAspectRatio(3.0)
  if(!process.env.DEV) overlayWindow.removeMenu()
  overlayWindow.loadFile("./src/html/overlay.html")

  overlayWindow.once("closed", () => {
    closeOverlay()
  })
}

function closeOverlay() {
  tray.setContextMenu(createMenuTemplate(true))
  overlayWindow.destroy()
  overlayWindow = undefined
}

function createMenuTemplate(activateOverlay = true) {
  return Menu.buildFromTemplate([
    { label: `LaRADIOdugaming Client v${version}`, enabled: false },
    { label: "Site", click: async () => {
      await shell.openExternal("https://radio.lsdg.xyz/")
    } },
    { type: "separator" },
    { label: `${activateOverlay ? "Ouvrir" : "Fermer"} l'overlay`, click: activateOverlay ? createOverlayWindow : closeOverlay },
    { label: "Paramètres", click: () => shell.openPath("config.json") },
    { label: "Quitter", click: () => app.quit() }
  ])
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock && !process.env.DEV) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if(mainWindow) mainWindow.show()
  })

  app.on("ready", () => {
    autoUpdater.checkForUpdatesAndNotify()
  })
  
  app.whenReady().then(async () => {
    createWindow()
  
    app.on('activate', function () {
      if(BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  
  ipcMain.on('setSoundControls', (event, args) => {
    for(let arg of args) {
      arg.icon = path.join(process.env.DEV ? "./src/assets/" : process.resourcesPath, arg.icon)
      arg.click = function() {
        mainWindow.webContents.send("soundControl", `${arg.c}`)
        return true
      }
    }
    mainWindow.setThumbarButtons(args)
  })

  app.on('web-contents-created', (webContentsCreatedEvent, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: "deny" }
    })

    webContents.on('before-input-event', (beforeInputEvent, input) => {
      const { alt, control, meta, key } = input
      if (!process.env.DEV && control && !alt && !meta && key === 'r') {
        BrowserWindow.getFocusedWindow().reload()
      }

      if ((control && !alt && !meta && key === 'z') || (!control && alt && !meta && key === 'ArrowLeft')) {
        mainWindow.webContents.send("historyControl", "undo")
      }
      if ((control && !alt && !meta && key === 'y') || (!control && alt && !meta && key === 'ArrowRight')) {
        mainWindow.webContents.send("historyControl", "redo")
      }
    })
  })
  
  app.on('window-all-closed', function () {
    if(process.platform !== 'darwin') app.quit()
  })
  
  app.on('before-quit', () => app.quitting = true)
}