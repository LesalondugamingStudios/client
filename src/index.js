const { app, BrowserWindow, Menu, shell, Tray } = require('electron')
const path = require("path")
const { version } = require("../package.json")
require("dotenv").config()

async function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  })

  if(process.env.DEV) mainWindow.setIcon("./src/assets/icon.png")

  mainWindow.removeMenu()

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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => app.quitting = true)