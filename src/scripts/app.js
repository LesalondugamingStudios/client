let CONTROLSENABLED = false
let CONTROLISPLAYING = false

const DiscordRPC = require("discord-rpc")
const { ipcRenderer } = require("electron")
const WebSocket = require("ws")
const { version } = require("../../package.json")
const { readFileSync } = require("fs")

const main = document.getElementById('main');
const app = document.createElement('webview');

app.setAttribute("id", "app")
app.setAttribute("src", "https://radio.lsdg.xyz/")

main.appendChild(app)

const clientId = '767777944096604241'
const rpc = new DiscordRPC.Client({ transport: 'ipc' })

const theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? "light" : "dark"

async function setActivity() {
  if (!rpc) {
    return;
  }

  let url = app.getAttribute("src")
  if(url.startsWith("https://discord")) return reset()
  
  let path = "/" + url.split("/").slice(3).join("/")
  if(!path.startsWith("/listen")) return reset()

  const infos = await getTrackInfos()
  let now = Date.now()

  let activity = {
    details: `${infos.track.replace("\n", " - ")}`,
    state: `Par ${infos.composers || "Artiste inconnu"}`,
    largeImageKey: infos.album ? `https://radio.lsdg.xyz/api/v1/albums/${infos.album}/cover` : "large",
    largeImageText: `LaRADIOdugaming Client - v${version}`,
    smallImageKey: infos.status == "loop" ? "loop_light" : (infos.status == "playing" ? "play_light" : "pause_light"),
    smallImageText: infos.status == "loop" ? "Lecture en boucle" : (infos.status == "playing" ? "En cours de lecture" : "En pause"),
    buttons: [{
      label: "Écouter",
      url: `https://radio.lsdg.xyz/listen?m=${infos.id}${infos.album ? `&album=${infos.album}` : ""}`
    }]
  }

  if (infos.status != "paused") {
    activity.startTimestamp = now - infos.timestamps.n
    activity.endTimestamp = now - infos.timestamps.n + infos.timestamps.f
  }

  rpc.setActivity(activity);

  console.log("RPC updated!")
}

async function getTrackInfos() {
  let url = app.getAttribute("src")
  let path = "/" + url.split("/").slice(3).join("/")

  if(url.startsWith("https://discord") || !path.startsWith("/listen")) return null

  return await app.executeJavaScript(`
q = {
  id: parseInt(new URLSearchParams(location.search).get("m")),
  track: document.getElementById("track-fullname").innerText,
  source: currentMusic.sources[0].id,
  composers: document.getElementById("track-composer").innerText,
  timestamps: {
    n: parseInt(document.querySelector('.current-time').dataset.currenttime),
    f: parseInt(document.querySelector('.total-duration').dataset.duration)
  },
  album,
  status: document.querySelector('.fa-play-circle') ? "paused" : (document.querySelector(".loop-track").classList.contains("active") ? "loop" : "playing")
}
q
  `).catch(() => {})
}

async function getStatus() {
  let url = app.getAttribute("src")
  let path = "/" + url.split("/").slice(3).join("/")

  if(url.startsWith("https://discord") && !path.startsWith("/listen")) return null

  return await app.executeJavaScript(`
q = {
  isLoop: document.querySelector(".loop-track").classList.contains("active"),
  isPlaying: !document.querySelector('.fa-play-circle')
}
q
`)
}

function reset() {
  CONTROLSENABLED = false
  if(JSON.parse(readFileSync("./config.json")).discordPresence) rpc.clearActivity()
  ipcRenderer.send('setSoundControls', [])
}

// Discord RPC
if(JSON.parse(readFileSync("./config.json")).discordPresence) {
  rpc.on('ready', async () => {
    setActivity();

    setInterval(() => {
      setActivity();
    }, 15e3);
  });

  rpc.login({ clientId }).then(() => console.log("Logged in")).catch(console.error)
}

// Sound Control Events
ipcRenderer.on('soundControl', (event, arg) => {
  console.log(`Received soundControl ${arg}`)
  switch(arg) {
    case "backward":
      app.executeJavaScript(`$(".prev-track").click(); true`)
      break
    case "play":
    case "pause":
      app.executeJavaScript(`$(".playpause-track").click(); true`)
      break
    case "forward":
      app.executeJavaScript(`$(".next-track").click(); true`)
      break
  }

  return true
})

// Control for history (Ctrl+Z)
ipcRenderer.on('historyControl', (event, arg) => {
  if(arg == "undo") app.executeJavaScript(`history.back()`)
  if(arg == "redo") app.executeJavaScript(`history.forward()`)
})

// Loop
setInterval(async () => {
  const title = await app.executeJavaScript(`document.title`)
  document.title = `${title.replace("| LaRADIOdugaming", "- LaRADIOdugaming Client").trim()}`

  let url = app.getAttribute("src")
  if(url.startsWith("https://discord")) return reset()
  
  let path = "/" + url.split("/").slice(3).join("/")
  if(!path.startsWith("/listen")) return reset()

  const infos = await getStatus()
  if(CONTROLSENABLED && CONTROLISPLAYING == infos.isPlaying) return
  CONTROLSENABLED = true
  CONTROLISPLAYING = infos.isPlaying
  ipcRenderer.send('setSoundControls', [
    { icon: `backward_${theme}.png`, c: "backward" },
    { icon: `${infos.isPlaying ? "pause" : "play"}_${theme}.png`, c: infos.isPlaying ? "pause" : "play" },
    { icon: `forward_${theme}.png`, c: "forward" },
  ])
}, 500)

// Websocket
if(JSON.parse(readFileSync("./config.json")).websocketAPI) {
  const wss = new WebSocket.WebSocketServer({ port: 5081 });

  wss.on('connection', function(ws) {
    console.log("New Client")
    ws.on('error', console.error);

    ws.on('message', data => {
      console.log(data)
    })

    ws.send(JSON.stringify({ type: "handshake", message: "complete" }))
  });

  wss.on("error", console.error)

  setInterval(async () => {
    let infos = await getTrackInfos().catch(() => {})

    wss.clients.forEach(client => {
      if(client.readyState == WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "musicListen", data: infos ? infos : null }))
      }
    })
  }, 1000)
}