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
  render();
};

function updateWaypointDetail(x, z) {
  let chunk = getCurrentChunk(x, z);
  if (chunk.length === 3) {
    config.activeChunk = chunk[0];
  } else {
    if (config.showCursorInfo) {
      config.activeChunk = {
        x: chunk[0] * 16 + 8,
        z: chunk[1] * 16 + 8
      };
    }
  }
  updateWaypointDetailBox(config.activeChunk);
  showWaypointDetailBox(!!config.showCursorInfo);
}

function updateDrag(x, z) {
  // Drag
  config.offsetX += x;
  config.offsetZ += z;

  config.nowChunkX -= parseInt(config.offsetX / config.chunkSize);
  config.offsetX = config.offsetX % config.chunkSize;

  config.nowChunkZ -= parseInt(config.offsetZ / config.chunkSize);
  config.offsetZ = config.offsetZ % config.chunkSize;

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
  showWaypointDetailBox(!!config.showCursorInfo);
  if (!event.altKey) {
    config.drag = true;
  }
});

canvas.addEventListener("mousemove", event => {
  if (config.rmenu) {
    return;
  }

  event.preventDefault();
  config.mouseX = event.x;
  config.mouseY = event.y;
  fixCursor(event);
  if (config.drag) {
    updateDrag(event.movementX, event.movementY);
  } else {
    // Hover
    updateWaypointDetail(event.x, event.y);
  }
});

function mouseUp(event) {
  event.preventDefault();
  config.drag = false;
  config.persist();

  const chunk = getCurrentChunk(config.mouseX, config.mouseY);
  if (chunk.length === 3) {
    config.activeChunk = chunk[0];
  } else {
    config.activeChunk = {
      x: chunk[0],
      z: chunk[1]
    };
  }
}

canvas.addEventListener("mouseup", mouseUp);

canvas.addEventListener("mouseleave", mouseUp);

canvas.addEventListener("mouseout", mouseUp);

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

function fixCursor(event) {
  if (event.altKey && config.atWaypointChunk) {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "";
  }
}

document.addEventListener("keydown", fixCursor);

document.addEventListener("keyup", event => {
  canvas.style.cursor = "";
});

canvas.addEventListener("click", event => {
  if (config.rmenu) {
    toggleRmenu();
  }
  if (event.altKey && config.atWaypointChunk) {
    event.preventDefault();
    // TODO: Edit menu
  }
});

canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
  toggleRmenu();
});
