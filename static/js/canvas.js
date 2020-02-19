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
    if (config.showCursorInfo) {
      updateWaypointDetailBox({
        name: "",
        x: String(chunkX * 16 + 8),
        y: "",
        z: String(chunkZ * 16 + 8)
      });
    }
    showWaypointDetailBox(!!config.showCursorInfo);
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

canvas.addEventListener("mousedown", event => {
  event.preventDefault();
  config.drag = true;
  showWaypointDetailBox(!!config.showCursorInfo);
});

canvas.addEventListener("mousemove", event => {
  event.preventDefault();
  if (config.drag) {
    updateDrag(event.movementX, event.movementY);
  } else {
    // Hover
    updateWaypointDetail(event.x, event.y);
  }
});

canvas.addEventListener("mouseup", event => {
  event.preventDefault();
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
  waypointsToDraw.forEach(p => {
    chunk(p.i, p.j, p.waypoint.color, true);
    chunkText(p.i, p.j, p.waypoint.name, p.waypoint.available);
  });
}

function chunk(x, z, color = "white", isTextChunk = false) {
  ctx.fillStyle = color;
  ctx.strokeRect(
    config.offsetX + x * config.chunkSize,
    config.offsetZ + z * config.chunkSize,
    config.chunkSize - isTextChunk,
    config.chunkSize - isTextChunk
  );
  ctx.fillRect(
    config.offsetX + x * config.chunkSize,
    config.offsetZ + z * config.chunkSize,
    config.chunkSize - isTextChunk,
    config.chunkSize - isTextChunk
  );
}

function chunkText(
  x,
  z,
  text = "",
  available,
  textColor = "white",
  textStrokeColor = "black"
) {
  let backup_stroke = ctx.strokeStyle;
  let backup_lw = ctx.lineWidth;

  ctx.lineWidth = 3;
  ctx.font = "24px Monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = textColor;
  ctx.strokeStyle = textStrokeColor;

  if (available) {
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
  }

  ctx.strokeStyle = backup_stroke;
  ctx.lineWidth = backup_lw;
}
