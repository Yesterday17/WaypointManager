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
}

const waypoints = [];
let waypointPromise = loadWaypoints();

async function loadWaypoints() {
  return fetch("api/get")
    .then(d => d.json())
    .then(arr => {
      waypoints.splice(waypoints.length);
      waypoints.push(
        ...arr.map(
          p => new Waypoint(p.name, p.x, p.y, p.z, p.color, p.available)
        )
      );
    });
}
