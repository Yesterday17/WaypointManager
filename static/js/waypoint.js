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
    return (
      this.x >= x * 16 &&
      this.x < (x + 1) * 16 &&
      this.z >= z * 16 &&
      this.z < (z + 1) * 16
    );
  }

  get identifier() {
    return `${parseInt(this.x / 16)}/${parseInt(this.z / 16)}`;
  }
}

const waypoints = [];
let waypointPromise;

async function initWaypoints() {
  waypointPromise = fetch("dimension")
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
    .then(loadWaypoints);
}

async function loadWaypoints() {
  updateDimensionDropdown();
  return fetch(`dimension/${config.dim}`)
    .then(d => d.json())
    .then(arr => {
      waypoints.splice(0, waypoints.length);
      waypoints.push(
        ...arr.map(
          p => new Waypoint(p.name, p.x, p.y, p.z, p.color, p.available)
        )
      );
    });
}

function getCurrentChunk(x, z) {
  const chunkX = Math.floor(
    config.nowChunkX + (x - config.offsetX) / config.chunkSize
  );
  const chunkZ = Math.floor(
    config.nowChunkZ + (z - config.offsetZ) / config.chunkSize
  );

  const active = waypoints.filter(p => p.isChunk(chunkX, chunkZ));
  if (active.length > 0) {
    return [active[0], chunkX, chunkZ];
  } else {
    return [chunkX, chunkZ];
  }
}

initWaypoints();
