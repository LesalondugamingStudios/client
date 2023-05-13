const { default: fetch } = require("node-fetch")
const api = "https://radio.lsdg.xyz/api/v1/"

class RadioAPIError extends Error {
  constructor(message) {
    super(message)
    this.name = "RadioAPIError"
  }
}

const PATH = {
  CurrentUser: "user",
  Filters: "filters",
  Franchises: "franchises",
  Holders: "holders",
  Musics: "musics",
  Lyrics: "lyrics"
}

class RadioAPI {
  constructor() {
    this.cache = new Map()
  }

  async getCurrentUser(sessionID) {
    return await this._fetch(PATH.CurrentUser, sessionID)
  }
  
  async getFranchises(sessionID, id = "") {
    return await this._fetch(this._join(PATH.Franchises, id), sessionID)
  }

  async getFranchiseHolders(sessionID, id) {
    return await this._fetch(this._join(PATH.Franchises, id, PATH.Holders), sessionID)
  }

  async getFranchiseMusics(sessionID, id) {
    return await this._fetch(this._join(PATH.Franchises, id, PATH.Musics), sessionID)
  }

  async getHolders(sessionID, id = "") {
    return await this._fetch(this._join(PATH.Holders, id), sessionID)
  }

  async getHolderMusics(sessionID, id) {
    return await this._fetch(this._join(PATH.Holders, id, PATH.Musics), sessionID)
  }

  async getMusics(sessionID, id = "") {
    return await this._fetch(this._join(PATH.Musics, id), sessionID)
  }

  async getMusicLyrics(sessionID, id) {
    return await this._fetch(this._join(PATH.Musics, id, PATH.Lyrics), sessionID)
  }

  async getFilters(sessionID, id = "") {
    return await this._fetch(this._join(PATH.Filters, id), sessionID)
  }

  async _fetch(path, sessionID) {
    if(!sessionID) throw new TypeError("Session ID not provided")

    let getCache = this.cache.get(path)
    if(getCache && getCache.time + 600000 < Date.now()) return getCache.data

    let res = await fetch(api + path, { headers: { "Cookie": `sid=${encodeURIComponent(sessionID)}` } })
    let json = await res.json()

    if(!res.ok) throw new RadioAPIError(json.message)

    this.cache.set(path, { data: json, time: Date.now() })
    return json
  }

  _join(...args) {
    return args.filter(a => a).join("/")
  }
}

module.exports = { RadioAPI }