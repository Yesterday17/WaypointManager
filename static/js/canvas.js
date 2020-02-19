const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
if (!ctx) {
  alert("Could not get canvas context!");
  throw "Could not get canvas context.";
}

window.onload = window.onresize = function resize() {
  canvas.width = config.canvasX = window.innerWidth;
  canvas.height = config.canvasY = window.innerHeight;

  config.recalculateNowChunks();

  updateULChunkXZ(config.nowChunkX * 16, config.nowChunkZ * 16);
  render();
};

function updateWaypointDetail(x, z) {
  const chunkX = Math.floor(
    config.nowChunkX + (x - config.offsetX) / config.chunkSize
  );
  const chunkZ = Math.floor(
    config.nowChunkZ + (z - config.offsetZ) / config.chunkSize
  );

  const active = waypoints.filter(p => p.isChunk(chunkX, chunkZ));
  if (active.length > 0) {
    updateWaypointDetailBox(active[0]);
    showWaypointDetailBox(true);
  } else {
    showWaypointDetailBox(false);
  }
}

function updateDrag(x, z) {
  // Drag
  config.offsetX += x;
  config.offsetZ += z;

  config.nowChunkX -= parseInt(config.offsetX / config.chunkSize);
  config.offsetX = config.offsetX % config.chunkSize;

  config.nowChunkZ -= parseInt(config.offsetZ / config.chunkSize);
  config.offsetZ = config.offsetZ % config.chunkSize;

  updateULChunkXZ(config.nowChunkX * 16, config.nowChunkZ * 16);

  render();
}

canvas.addEventListener("mousedown", event => {
  config.drag = true;
  showWaypointDetailBox(false);
});

let prevTouch;
function touchMove(touch) {
  updateDrag(touch.pageX - prevTouch.pageX, touch.pageY - prevTouch.pageY);
  prevTouch = touch;
}

canvas.addEventListener("touchstart", event => {
  prevTouch = event.touches[0];
  updateWaypointDetail(prevTouch.pageX, prevTouch.pageY);
});

canvas.addEventListener("touchmove", event => {
  event.preventDefault();
  touchMove(event.touches[0]);
});

canvas.addEventListener("touchend", event => {
  event.preventDefault();
  config.persist();
});

canvas.addEventListener("mousemove", event => {
  if (config.drag) {
    updateDrag(event.movementX, event.movementY);
  } else {
    // Hover
    updateWaypointDetail(event.x, event.y);
  }
});

canvas.addEventListener("mouseup", event => {
  config.drag = false;
  config.persist();
});

async function render() {
  // Wait for waypoints
  await waypointPromise;

  // Clear
  ctx.clearRect(0, 0, config.canvasX, config.canvasY);

  // Active waypoints
  const waypointsToDraw = [];

  // Chunks
  for (let i = -1; i < config.nowChunksX - 1; i++) {
    for (let j = -1; j < config.nowChunksZ - 1; j++) {
      const chunkX = config.nowChunkX + i;
      const chunkZ = config.nowChunkZ + j;

      const active = waypoints.filter(p => p.isChunk(chunkX, chunkZ));
      if (active.length > 0) {
        const p = active[0];
        waypointsToDraw.push({ i, j, waypoint: active[0] });
      } else {
        chunk(i, j);
      }
    }
  }

  // Waypoints
  waypointsToDraw.forEach(p =>
    // chunk(p.i, p.j, p.waypoint.color, `(${p.waypoint.x}, ${p.waypoint.z})`)
    chunk(p.i, p.j, p.waypoint.color, p.waypoint.name)
  );
}

function chunk(
  x,
  z,
  color = "white",
  text = "",
  textColor = "white",
  textStrokeColor = "black"
) {
  ctx.fillStyle = color;
  ctx.strokeRect(
    config.offsetX + x * config.chunkSize,
    config.offsetZ + z * config.chunkSize,
    config.chunkSize - (text === "" ? 0 : 1),
    config.chunkSize - (text === "" ? 0 : 1)
  );
  ctx.fillRect(
    config.offsetX + x * config.chunkSize,
    config.offsetZ + z * config.chunkSize,
    config.chunkSize - (text === "" ? 0 : 1),
    config.chunkSize - (text === "" ? 0 : 1)
  );

  if (text !== "") {
    let s = ctx.strokeStyle;
    let lw = ctx.lineWidth;
    ctx.lineWidth = 3;
    ctx.font = "24px Monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = textStrokeColor;
    ctx.strokeText(
      text,
      config.offsetX + x * config.chunkSize + config.chunkSize / 2,
      config.offsetZ + z * config.chunkSize + config.chunkSize / 2
    );
    ctx.fillText(
      text,
      config.offsetX + x * config.chunkSize + config.chunkSize / 2,
      config.offsetZ + z * config.chunkSize + config.chunkSize / 2
    );
    ctx.strokeStyle = s;
    ctx.lineWidth = lw;
  }
}
