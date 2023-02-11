const DiscordRPC = require("discord-rpc")
const { version } = require("../../package.json")

const main = document.getElementById('main');
const app = document.createElement('webview');

app.setAttribute("id", "app")
app.setAttribute("src", "https://radio.lsdg.xyz/")

main.appendChild(app)

const clientId = '767777944096604241'
const rpc = new DiscordRPC.Client({ transport: 'ipc' })

async function setActivity() {
  if (!rpc) {
    return;
  }

  let url = app.getAttribute("src")
  if(url.startsWith("https://discord")) return rpc.clearActivity()
  
  let path = "/" + url.split("/").slice(3).join("/")
  if(!path.startsWith("/listen")) return rpc.clearActivity()

  const infos = await getTrackInfos()
  let now = Date.now()

  console.log(infos)

  let activity = {
    details: "Écoute de la musique",
    state: `${infos.track.replace("\n", " - ")}`,
    largeImageKey: "large",
    largeImageText: `LaRADIOdugaming Client - v${version}`,
    smallImageKey: infos.status == "playing" ? "play_light" : "pause_light",
    smallImageText: infos.status == "playing" ? "En cours de lecture" : "En pause"
  }

  if (infos.status == "playing") {
    activity.startTimestamp = now - infos.timestamps.n
    activity.endTimestamp = now - infos.timestamps.n + infos.timestamps.f
  }

  rpc.setActivity(activity);

  console.log("RPC updated!")
}

async function getTrackInfos() {
  return await app.executeJavaScript(`
q = {
  track: document.getElementById("track-fullname").innerText,
  timestamps: {
    n: parseInt(document.querySelector('.current-time').dataset.currenttime),
    f: parseInt(document.querySelector('.total-duration').dataset.duration)
  },
  status: document.querySelector('.fa-play-circle') ? "paused" : "playing"
}
q
  `)
}

rpc.on('ready', () => {
  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpc.login({ clientId }).then(() => console.log("Logged in")).catch(console.error)

setInterval(async () => {
  const title = await app.executeJavaScript(`document.title`)
  document.title = `LaRADIOdugaming Client - ${title.replace(" | LaRADIOdugaming", "").trim()}`
}, 1000)