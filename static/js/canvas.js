const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
if (!ctx) {
  alert("Could not get canvas context!");
  throw "Could not get canvas context.";
}
ctx.translate(0.5, 0.5);

window.onload = window.onresize = function resize() {
  canvas.width = config.canvasX = window.innerWidth;
  canvas.height = config.canvasY = window.innerHeight;

  config.recalculateNowChunks();
  render();
};

function updateWaypointDetail(x, z) {
  if (config.edit) {
    return;
  }
  let chunk = getCurrentChunk(x, z);
  if (chunk.length === 3) {
    config.activeChunk = chunk[0];
  } else {
    if (config.showCursorInfo) {
      config.activeChunk = {
        x: chunk[0] * 16,
        z: chunk[1] * 16
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
  config.offsetX %= config.chunkSize;

  config.nowChunkZ -= parseInt(config.offsetZ / config.chunkSize);
  config.offsetZ %= config.chunkSize;

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
  if (config.rmenu || config.edit) {
    return;
  }
  touchMove(event.touches[0]);
});

canvas.addEventListener("touchend", event => {
  event.preventDefault();
  config.persist();
});

canvas.addEventListener("mousedown", event => {
  event.preventDefault();
  showWaypointDetailBox(!!config.showCursorInfo);
  if (!event.ctrlKey) {
    config.drag = true;
  }
});

canvas.addEventListener("mousemove", event => {
  if (config.rmenu || config.edit) {
    return;
  }

  event.preventDefault();
  config.mouseX = event.x;
  config.mouseY = event.y;
  fixCursor(event);
  updateWaypointDetail(event.x, event.y);
  if (config.drag) {
    updateDrag(event.movementX, event.movementY);
  }
});

function mouseUp(event) {
  event.preventDefault();
  config.drag = false;
  config.persist();
}

canvas.addEventListener("mouseup", mouseUp);

canvas.addEventListener("mouseleave", mouseUp);

canvas.addEventListener("mouseout", mouseUp);

async function render() {
  // Wait for waypoints
  await waypoints.promise;
  if (config.activeChunk === undefined) updateWaypointDetail(100, 100);

  // Clear
  ctx.clearRect(0, 0, config.canvasX, config.canvasY);

  // Chunks
  const chunks = [];
  for (let i = -1; i < config.nowChunksX - 1; i++) {
    for (let j = -1; j < config.nowChunksZ - 1; j++) {
      const chunkX = config.nowChunkX + i;
      const chunkZ = config.nowChunkZ + j;

      if (waypoints.has(chunkX, chunkZ)) {
        const wp = waypoints.get(chunkX, chunkZ);
        chunkColor(i, j, wp);
        chunks.push([i, j, wp]);
      }
    }
  }

  for (let i = -1; i < config.nowChunksX; i++) {
    ctx.beginPath();
    ctx.moveTo(
      config.offsetX + i * config.chunkSize,
      config.offsetZ - config.chunkSize
    );
    ctx.lineTo(
      config.offsetX + i * config.chunkSize,
      config.offsetZ + config.nowChunksZ * config.chunkSize
    );
    ctx.stroke();
    ctx.closePath();
  }

  for (let i = -1; i < config.nowChunksZ; i++) {
    ctx.beginPath();
    ctx.moveTo(
      config.offsetX - config.chunkSize,
      config.offsetZ + i * config.chunkSize
    );
    ctx.lineTo(
      config.offsetX + config.nowChunksX * config.chunkSize,
      config.offsetZ + i * config.chunkSize
    );
    ctx.stroke();
    ctx.closePath();
  }

  chunks.forEach(([x, z, wp]) => wp.available && chunkText(x, z, wp));
}

function chunkColor(x, z, wp) {
  ctx.fillStyle = wp.color;
  ctx.fillRect(
    config.offsetX + x * config.chunkSize,
    config.offsetZ + z * config.chunkSize,
    config.chunkSize,
    config.chunkSize
  );
}

function chunkText(x, z, wp, textColor = "white", textStrokeColor = "black") {
  let backup_stroke = ctx.strokeStyle;
  let backup_lw = ctx.lineWidth;

  if (config.scale < 1) {
    ctx.lineWidth = 1.5;
  } else {
    ctx.lineWidth = 3;
  }
  ctx.font = String(parseInt(16 * config.scale)) + "px Monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = textColor;
  ctx.strokeStyle = textStrokeColor;

  ctx.strokeText(
    wp.name,
    config.offsetX + x * config.chunkSize + config.chunkSize / 2,
    config.offsetZ + z * config.chunkSize + config.chunkSize / 2
  );
  ctx.fillText(
    wp.name,
    config.offsetX + x * config.chunkSize + config.chunkSize / 2,
    config.offsetZ + z * config.chunkSize + config.chunkSize / 2
  );

  ctx.strokeStyle = backup_stroke;
  ctx.lineWidth = backup_lw;
}

function fixCursor(event) {
  if (event.ctrlKey) {
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
  if (event.ctrlKey) {
    event.preventDefault();
    if (config.auth === "") {
      config.auth = prompt("Please input server auth:", "");
      if (config.auth === "" || config.auth === null) {
        alert("Invalid auth.");
        return;
      }

      if (config.atWaypointChunk) {
        // TODO: Edit menu
        alert("Edit panel not supported!");
      } else {
        addWaypoint(event.x, event.z);
      }
    }
  }
});

canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
  config.mouseX = event.x;
  config.mouseY = event.y;
  updateWaypointDetail(event.x, event.y);
  toggleRmenu();
});
