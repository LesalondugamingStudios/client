const { app, BrowserWindow, Menu, shell, Tray, ipcMain, globalShortcut } = require('electron')
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

async function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  })

  if(process.env.DEV) mainWindow.setIcon("./src/assets/icon.png")
  if(!process.env.DEV) mainWindow.removeMenu()

  await mainWindow.loadFile("./src/html/index.html")

  mainWindow.on("close", (e) => {
    if(!app.quitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  const ctxMenu = Menu.buildFromTemplate([
    { label: `LaRADIOdugaming Client v${version}`, enabled: false },
    { label: "Site", click: async () => {
      await shell.openExternal("https://radio.lsdg.xyz/")
    } },
    { type: "separator" },
    { label: "Quitter", click: () => app.quit() }
  ])

  const tray = new Tray(process.env.DEV ? "./src/assets/icon.png" : path.join(process.resourcesPath, "icon.png"))
  tray.setToolTip("LaRADIOdugaming Client")
  tray.setContextMenu(ctxMenu)
  tray.on("click", () => mainWindow.show())
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
    webContents.on('before-input-event', (beforeInputEvent, input) => {
      const { code, alt, control, meta } = input
      // Shortcut: toggle devTools
      if (!process.env.DEV && control && !alt && !meta && code === 'KeyR') {
        BrowserWindow.getFocusedWindow().reload()
      }
    })
  })
  
  app.on('window-all-closed', function () {
    if(process.platform !== 'darwin') app.quit()
  })
  
  app.on('before-quit', () => app.quitting = true)
}