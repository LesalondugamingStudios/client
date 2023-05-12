const { app, BrowserWindow, Menu, shell, Tray, ipcMain } = require('electron')
const log = require("electron-log")
const { autoUpdater } = require("electron-updater")
const express = require("express")
const path = require("path")
const { version } = require("../package.json")
const { default: fetch } = require('node-fetch')
const { RadioAPI } = require('./api')
require("dotenv").config()

const expressApp = express()
const api = new RadioAPI()

autoUpdater.logger = log;

/**
 * @type {BrowserWindow | undefined}
 */
let mainWindow

/**
 * Session Cookie de la radio
 */
let sessionID = ""

async function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#181818',
      symbolColor: '#ffffff',
      height: 35
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

  ipcMain.handle("login", (event) => {
    return sessionID
  })

  ipcMain.handle("api", async (event, args) => {
    if(!api[args]) return false
    if(!sessionID) return false
    return await api[args](sessionID)
  })

  app.on('web-contents-created', (webContentsCreatedEvent, webContents) => {
    webContents.on('before-input-event', (beforeInputEvent, input) => {
      const { code, alt, control, meta } = input
      if (!process.env.DEV && control && !alt && !meta && code === 'KeyR') {
        BrowserWindow.getFocusedWindow().reload()
      }
    })
  })
  
  app.on('window-all-closed', function () {
    if(process.platform !== 'darwin') app.quit()
  })
  
  app.on('before-quit', () => app.quitting = true)

  expressApp.get("/", async (req, res) => {
    if(sessionID) return res.status(400).send({ code: 400, message: "Déjà connecté" })

    const { id, accessToken, expiresIn } = req.query
    if(!accessToken) return res.sendFile(path.join(__dirname, "./html/login.html"))

    let response = await fetch("https://radio.lsdg.xyz/api/v1/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deviceType: "windowsApp", accessToken, expirationDate: new Date(Date.now() + (expiresIn * 1000) - 30000) })
    })

    let json = await response.json()

    if(!response.ok) return res.status(response.status).send({ code: response.status, message: json.message })

    if(!json.authorization) return res.status(500).send({ code: 500, message: "Pas d'autorisation." })

    sessionID = json.authorization
    res.send({ ok: true })
  })

  expressApp.get("/ok", (req, res) => res.send(`<style>body{font-family: "Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";color: #ffffff;}</style><br><br><br><br><center><h1>Connexion en cours, vous allez être redirigé ...</h1></center>`))

  expressApp.listen(62452)
}