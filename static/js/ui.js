// UI-related code
function showWaypointDetailBox(show) {
  const detail = document.getElementById("detail");
  if (show) {
    detail.classList.remove("hide");
  } else {
    detail.classList.add("hide");
  }
}

function updateWaypointDetailBox(p) {
  if (!p.name || p.name === "") {
    document.getElementById("detail-name").parentNode.classList.add("hide");
    document.getElementById("detail-y").parentNode.classList.add("hide");
  } else {
    document.getElementById("detail-name").parentNode.classList.remove("hide");
    document.getElementById("detail-y").parentNode.classList.remove("hide");
  }

  document.getElementById("detail-name").innerText = p.name;
  document.getElementById("detail-x").innerText = p.x;
  document.getElementById("detail-y").innerText = p.y;
  document.getElementById("detail-z").innerText = p.z;
}

function adjustScale(diff, isButton = true) {
  config.scale += diff;
  if (isButton) {
    config.recalculateNowChunks(
      -diff * CHUNK_RENDER_SIZE * Math.ceil(config.nowChunksX / 2),
      -diff * CHUNK_RENDER_SIZE * Math.ceil(config.nowChunksZ / 2)
    );
  } else {
    config.recalculateNowChunks(
      -diff *
        CHUNK_RENDER_SIZE *
        Math.ceil(config.activeChunk.x / 16 - config.nowChunkX),
      -diff *
        CHUNK_RENDER_SIZE *
        Math.ceil(config.activeChunk.z / 16 - config.nowChunkZ)
    );
  }
  config.persist();
  render();
}

document.addEventListener("wheel", event => {
  adjustScale(0.1 * (event.deltaY > 0 ? -1 : 1), false);
});

function switchDimension() {
  config.dim = document.getElementById("dimension").value;
  waypoints.update();
  config.persist();
  render();
}

function updateDimensionDropdown() {
  document.getElementById("dimension").value = config.dim;
}

function toggleRmenu() {
  if (config.rmenu) {
    document.getElementById("rmenu").classList.add("hide");
    document
      .getElementById("menu-toggle-availbility")
      .parentElement.classList.add("hide");
    document
      .getElementById("menu-edit-color")
      .parentElement.classList.add("hide");
    document
      .getElementById("menu-add-waypoint")
      .parentElement.classList.add("hide");
    config.rmenu = false;
  } else {
    if (config.atWaypointChunk) {
      document
        .getElementById("menu-toggle-availbility")
        .parentElement.classList.remove("hide");
      document
        .getElementById("menu-edit-color")
        .parentElement.classList.remove("hide");
    } else {
      document
        .getElementById("menu-add-waypoint")
        .parentElement.classList.remove("hide");
    }

    document.getElementById("rmenu").classList.remove("hide");
    document.getElementById("rmenu").style.top = event.y + "px";
    document.getElementById("rmenu").style.left = event.x + "px";
    config.rmenu = true;
  }
}

function toggleAvailbility() {
  toggleRmenu();
  const ch = config.activeChunk;
  if (config.atWaypointChunk) {
    fetch(`dimension/${config.dim}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        WaypointAuth: config.auth,
        "Waypoint-Identifier": config.activeChunk.identifier
      },
      body: `available=${!config.activeChunk.available}`
    }).then(resp => {
      if (resp.status == 200) {
        ch.available = !ch.available;
        render();
      }
    });
  }
}

function editColor() {
  // TODO
  toggleRmenu();
}

function addWaypoint() {
  //TODO
  toggleRmenu();
}
