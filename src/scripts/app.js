const { ipcRenderer, shell } = require("electron")
const $ = require("jquery")
const { version } = require("../../package.json")

window.$ = $
const url = "https://radio.lsdg.xyz/"

$("#version").html(version)

function showMessage(title, message) {
  return `<br><br><br><br><center><h1>${title}</h1>${message ? `<p>${message}</p>` : ""}</center>`
}

const loadingText = showMessage("Chargement du client en cours ...", "Fun fact : Si le client crash, Creeper n'en sera pas tenu responsable.")
let user

function setTitle(title) {
  $("#title").html(title)
}

async function loadingScreen() {
  $("#main").html(loadingText)
  setTitle("Chargement du client")
  if(!user) await wait(1)

  let res = await fetch(url + "api/v1/")
  if(!res.ok) return $("#main").html(showMessage("Une erreur est survenue. Veuillez vous assurer d'être connecté à Internet et vérifiez si le site fonctionne correctement.", `${res.status} ${res.statusText}`))
  let content = await res.json()

  if(content.deprecated) alert("Cette version du client est obselete.")

  let loginData = await ipcRenderer.invoke("login")

  console.log(loginData)

  if(!loginData) {
    setTitle("Connexion à Discord")
    $("#main").html(showMessage("Connexion à Discord", "En attente de la connexion à votre compte.<br>La page de connexion a été ouverte dans votre navigateur."))
    await shell.openExternal("http://localhost:62452/")

    let done = false
    while(!done) {
      await wait(2)
      if(await ipcRenderer.invoke("login")) done = true
    }
  }

  user = await ipcRenderer.invoke("api", "getCurrentUser")
  landingPage()
}

loadingScreen()

function wait(sec) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), sec * 1000)
  })
}

function shuffle(array) {
  let currentIndex = array.length;
  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

async function landingPage() {
  setTitle("Accueil")

  let franchises = shuffle(await ipcRenderer.invoke("api", "getFranchises"))
  let holders = shuffle(await ipcRenderer.invoke("api", "getHolders"))
  let filters = await ipcRenderer.invoke("api", "getFilters")

  $("#main").html(`<div class="block">
    <img class="avatar" src="${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` : 'https://cdn.discordapp.com/embed/avatars/1.png'}" alt="avatar" />
    <center><h3>Bienvenue, ${user.username}</h3></center>
  </div><br>
  
  <div class="block">
    <h1>Franchises</h1>
    <div class="list">
      ${franchises.map(f => renderItem(f, "franchise")).join("<br>")}
    </div>
  </div><br>

  <div class="block">
    <h1>Jeux et animes</h1>
    <div class="list">
      ${holders.map(h => renderItem(h, "holder")).join("<br>")}
    </div>
  </div><br>

  <div class="block">
    <h1>Tes filtres</h1>
    <div class="music_list">
      ${filters.map(f => renderTextItem(f, "filter")).join("<br>")}
    </div>
  </div><br>
    `)
}

function renderItem(item, itemType) {
  return `<div class="list_items">
  <a class="${itemType}" data-id=${item.id}>
    <img class="cover" src="${resolveImage(item, "cover")}" alt="Cover image of ${resolveName(item)}">
    <p>${resolveName(item)}</p>
  </a>
</div>`
}

function renderTextItem(item, itemType) {
  return `<div class="music_list_items">
  <a class="${itemType}" data-id=${item.id}>
    ${item.name.original ? resolveName(item) : item.name}
  </a>
</div>`
}

function resolveImage(item, type){
  let defaultPath = `${url}img/${type == "cover" ? "default_cover" : "default_logo_white"}.png`
  if(!item.image) return defaultPath

  if(type == "cover") {
    return `${url}img/covers/${item.image.replace(".png", ".jpg")}`
  } else if(type == "logo") {
    return `${url}img/logos/${item.image}`
  }

  return defaultPath
}

function resolveName(item) {
  return item.name.fr || item.name.en || item.name.original
}