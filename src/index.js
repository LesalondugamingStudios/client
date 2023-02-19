const { app, BrowserWindow, Menu, shell, Tray, ipcMain } = require('electron')
const { autoUpdater } = require("electron-updater")
const path = require("path")
const { version } = require("../package.json")
require("dotenv").config()

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
    { label: "Quitter LaRADIOdugaming Client", click: () => app.quit() }
  ])

  const tray = new Tray(process.env.DEV ? "./src/assets/icon.png" : path.join(process.resourcesPath, "icon.png"))
  tray.setToolTip("LaRADIOdugaming Client")
  tray.setContextMenu(ctxMenu)
  tray.on("click", () => mainWindow.show())
}

app.whenReady().then(async () => {
  await autoUpdater.checkForUpdatesAndNotify()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => app.quitting = true)