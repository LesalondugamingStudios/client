const { ipcRenderer } = require("electron")
const $ = require("jquery")
const { version } = require("../../package.json")

window.$ = $
const url = "https://radio.lsdg.xyz/"

$("#version").html(version)

const loadingText = "<br><br><br><br><center><h1>Chargement du client en cours ...</h1><p>Fun fact : Si le client crash, Creeper n'en sera pas tenu responsable.</p></center>"
let user

function setTitle(title) {
  $("#title").html(title)
}

async function loadingScreen() {
  $("#main").html(loadingText)
  setTitle("Chargement du client")
  await wait(1)

  let res = await fetch(url + "api/v1/")
  if(!res.ok) return $("#main").html(`<br><br><br><br><center><h1>Une erreur est survenue. Veuillez vous assurer d'être connecté à Internet et vérifiez si le site fonctionne correctement.</h1><p>${res.status} ${res.statusText}</p></center>`)
  let content = await res.json()

  if(content.deprecated) alert("Cette version du client est obselete.")

  let loginData = await ipcRenderer.invoke("login")

  console.log(loginData)

  if(!loginData) {
    setTitle("Connexion à Discord")
    const login = document.createElement('webview');

    login.setAttribute("id", "app")
    login.setAttribute("src", "http://localhost:62452/")

    $("#main").html(login)

    let done = false
    while(!done) {
      await wait(2)
      if(login.src.endsWith("/ok")) done = true
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

  let franchises = shuffle(await ipcRenderer.invoke("api", "getFranchises")).slice(0, 10)
  let holders = shuffle(await ipcRenderer.invoke("api", "getHolders")).slice(0, 10)
  let filters = await ipcRenderer.invoke("api", "getFilters")

  $("#main").html(`<div class="block">
    <img class="avatar" src="${ user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` : 'https://cdn.discordapp.com/embed/avatars/1.png' }" alt="avatar" />
    <center><h3>Bienvenue, ${user.username}</h3></center>
  </div><br>
  
  <div class="block">
    <h1>Franchises</h1>
    <div class="list">
      ${franchises.map(f => renderItem(f, "franchise")).join("<br>")}
    </div>
  </div>
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