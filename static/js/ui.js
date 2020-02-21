// UI-related code
function showWaypointDetailBox(toShow) {
  if (toShow) {
    show("detail");
  } else {
    hide("detail");
  }
}

function updateWaypointDetailBox(p) {
  if (!p.name || p.name === "") {
    hideParent("detail-name");
    hideParent("detail-y");
  } else {
    showParent("detail-name");
    showParent("detail-y");
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

function hide(id) {
  document.getElementById(id).classList.add("hide");
}

function hideParent(id) {
  document.getElementById(id).parentElement.classList.add("hide");
}

function show(id) {
  document.getElementById(id).classList.remove("hide");
}

function showParent(id) {
  document.getElementById(id).parentElement.classList.remove("hide");
}

function toggleRmenu() {
  if (config.rmenu) {
    hide("rmenu");
    hideParent("menu-toggle-availability");
    hideParent("menu-edit-name");
    hideParent("menu-add-waypoint");
    hideParent("menu-random-color");
    config.rmenu = false;
  } else {
    if (config.atWaypointChunk) {
      showParent("menu-toggle-availability");
      showParent("menu-edit-name");
      showParent("menu-random-color");
    } else {
      showParent("menu-add-waypoint");
    }

    show("rmenu");
    document.getElementById("rmenu").style.top = event.y + "px";
    document.getElementById("rmenu").style.left = event.x + "px";
    config.rmenu = true;
  }
}

function toggleAvailability() {
  toggleRmenu();
  if (config.auth === "") return;
  const ch = config.activeChunk;
  if (config.atWaypointChunk) {
    fetch(`dimension/${config.dim}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        WaypointAuth: config.auth,
        "Waypoint-Identifier": config.activeChunk.identifier
      },
      body: `available=${!ch.available}`
    }).then(resp => {
      if (resp.status == 200) {
        ch.available = !ch.available;
        render();
      }
    });
  }
}

function editName() {
  toggleRmenu();
  if (config.auth === "") return;
  const ch = config.activeChunk;
  if (config.atWaypointChunk) {
    const name = prompt("Please input new name:", ch.name);
    if (name === ch.name || name === "") {
      return;
    }
    fetch(`dimension/${config.dim}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        WaypointAuth: config.auth,
        "Waypoint-Identifier": config.activeChunk.identifier
      },
      body: `name=${name}`
    }).then(resp => {
      if (resp.status == 200) {
        ch.name = name;
        render();
      }
    });
  }
}

function randomWaypointColor() {
  toggleRmenu();
  if (config.auth === "") return;
  const ch = config.activeChunk;
  if (config.atWaypointChunk) {
    const color = randomColor();
    fetch(`dimension/${config.dim}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        WaypointAuth: config.auth,
        "Waypoint-Identifier": config.activeChunk.identifier
      },
      body: `color=${color}`
    }).then(resp => {
      if (resp.status == 200) {
        ch.color = color;
        render();
      }
    });
  }
}

function addWaypoint(x, z) {
  toggleRmenu();
  if (config.auth === "") return;
  if (typeof x === undefined || typeof z === undefined) {
    if (config.atWaypointChunk) {
      return;
    }
    x = config.chunk.x;
    z = config.chunk.z;
  }
  // TODO: Add
}
