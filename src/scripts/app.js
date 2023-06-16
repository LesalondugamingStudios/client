let CONTROLSENABLED = false
let CONTROLISPLAYING = false

const DiscordRPC = require("discord-rpc")
const { ipcRenderer } = require("electron")
const { version } = require("../../package.json")

const main = document.getElementById('main');
const app = document.createElement('webview');

app.setAttribute("id", "app")
app.setAttribute("src", "https://radio.lsdg.xyz/")

main.appendChild(app)

const clientId = '767777944096604241'
const rpc = new DiscordRPC.Client({ transport: 'ipc' })

let albumCoverList = ["1"]

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
    largeImageKey: infos.album && albumCoverList.includes(infos.album) ? `album_${infos.album}` : "large",
    largeImageText: `LaRADIOdugaming Client - v${version}`,
    smallImageKey: infos.status == "loop" ? "loop_light" : (infos.status == "playing" ? "play_light" : "pause_light"),
    smallImageText: infos.status == "loop" ? "Lecture en boucle" : (infos.status == "playing" ? "En cours de lecture" : "En pause"),
    buttons: [{
      label: "Écouter",
      url: `https://radio.lsdg.xyz/listen?m=${infos.id}`
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
  return await app.executeJavaScript(`
q = {
  id: parseInt(new URLSearchParams(location.search).get("m")),
  track: document.getElementById("track-fullname").innerText,
  composers: document.getElementById("track-composer").innerText,
  timestamps: {
    n: parseInt(document.querySelector('.current-time').dataset.currenttime),
    f: parseInt(document.querySelector('.total-duration').dataset.duration)
  },
  album,
  status: document.querySelector('.fa-play-circle') ? "paused" : (document.querySelector(".loop-track").classList.contains("active") ? "loop" : "playing")
}
q
  `)
}

async function getStatus() {
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
  rpc.clearActivity()
  ipcRenderer.send('setSoundControls', [])
}

rpc.on('ready', () => {
  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpc.login({ clientId }).then(() => console.log("Logged in")).catch(console.error)

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