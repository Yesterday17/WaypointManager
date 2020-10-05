// Waypoint
class Waypoint {
  constructor(name, x, y, z, color, available) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
    this.available = available;
  }

  isChunk(x, z) {
    const chunkX = this.x >> 4;
    const chunkZ = this.z >> 4;
    return chunkX === x && chunkZ === z;
  }

  get identifier() {
    return `${this.x >> 4}/${this.z >> 4}`;
  }
}

class Waypoints {
  constructor() {
    this.promise = fetch("dimension")
      .then(d => d.json())
      .then(j => {
        if (!j.includes(config.dim)) {
          config.dim = "0";
        }

        const dropdown = document.getElementById("dimension");
        j.forEach(id => {
          const opt = document.createElement("option");
          opt.value = String(id);
          opt.innerText = String(id);
          dropdown.appendChild(opt);
        });
      })
      .then(() => this.update());
  }

  async update() {
    updateDimensionDropdown();
    return fetch(`dimension/${config.dim}`)
      .then(d => d.json())
      .then(arr => {
        this.map = new Map();
        arr.forEach(p => {
          const wp = new Waypoint(p.name, p.x, p.y, p.z, p.color, p.available);
          this.map.set(wp.identifier, wp);
        });
      });
  }

  get(chunkX, chunkZ) {
    return this.getI(`${chunkX}/${chunkZ}`);
  }

  getI(identifier) {
    return this.map.get(identifier);
  }

  has(chunkX, chunkZ) {
    return this.hasI(`${chunkX}/${chunkZ}`);
  }

  hasI(identifier) {
    return this.map.has(identifier);
  }
}

const waypoints = new Waypoints();

function getCurrentChunk(x, z) {
  const chunkX = Math.floor(
    config.nowChunkX + (x - config.offsetX) / config.chunkSize
  );
  const chunkZ = Math.floor(
    config.nowChunkZ + (z - config.offsetZ) / config.chunkSize
  );

  if (waypoints.has(chunkX, chunkZ)) {
    return [waypoints.get(chunkX, chunkZ), chunkX, chunkZ];
  } else {
    return [chunkX, chunkZ];
  }
}

let ws = new WebSocket((document.location.protocol === "http:" ? "ws://" : "wss://") + document.location.host + "/ws");
// setInterval(() => ws.send('ping'), 30000);

ws.onopen = () => {
  document.getElementById('ws-status-text').innerText = "Connected";
}

ws.onclose = () => {
  document.getElementById('ws-status-text').innerText = "Disconnected";
}

ws.addEventListener('message', (event) => {
  // console.log(event.data)
  let msg = JSON.parse(event.data);
  if (msg.type === 1) {
    waypoints.map.delete(msg.identifier);
  } else if (msg.type === 0 || msg.type === 2) {
    msg.waypoint.identifier = (msg.waypoint.x >> 4).toString() + "/" + (msg.waypoint.z >> 4).toString();
    waypoints.map.set(msg.identifier, msg.waypoint);
  }
  render();
})