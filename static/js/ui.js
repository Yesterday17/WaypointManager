// UI-related code
function showWaypointDetailBox(toShow) {
  if (toShow) {
    show("detail");
  } else {
    hide("detail");
  }
}

function toggleEdit(isNew) {
  if (config.edit) {
    hide("edit");
    hideParent("edit-x");
    hideParent("edit-y");
    hideParent("edit-z");
  } else {
    show("edit");
    if (isNew) {
      showParent("edit-x");
      showParent("edit-y");
      showParent("edit-z");
    }
  }
  config.edit = !config.edit;
}

const pickr = Pickr.create({
  el: "#edit-color > div",
  theme: "nano",
  components: {
    preview: true,
    opacity: true,
    hue: true,

    interaction: {
      input: true,
      clear: true,
      save: true
    }
  }
});

function editWaypoint(wp = config.activeChunk) {
  toggleRmenu();
  document.getElementById("edit-name").value = wp.name;
  document.getElementById("edit-x").value = wp.x;
  document.getElementById("edit-y").value = wp.y;
  document.getElementById("edit-z").value = wp.z;
  pickr.setColor(wp.color);
  document.getElementById("edit-available").checked = wp.available;
  toggleEdit(wp !== config.activeChunk);
}

function submitEdit() {
  const isEdit = document
    .getElementById("edit-x")
    .parentElement.classList.contains("hide");
  toggleEdit();
  if (config.auth === "") return;

  const ch = config.activeChunk;
  const name = document.getElementById("edit-name").value;
  const x = document.getElementById("edit-x").value;
  const y = document.getElementById("edit-y").value;
  const z = document.getElementById("edit-z").value;
  const color = pickr
    .getColor()
    .toHEXA()
    .toString();
  const available = document.getElementById("edit-available").checked;
  if (isEdit) {
    // edit
    patch(config.auth, config.dim, ch.identifier, {
      color,
      name,
      available
    }).then(resp => {
      if (resp.status === 200) {
        ch.color = color;
        ch.name = name;
        ch.available = available;
        render();
      }
    });
  } else {
    // new
    const ch = new Waypoint(name, x, y, z, color, available);
    post(config.auth, config.dim, ch.identifier, {
      name,
      x,
      y,
      z,
      color,
      available
    }).then(resp => {
      if (resp.status === 200) {
        waypoints.map.set(ch.identifier, ch);
        render();
      }
    });
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
  // if (config.scale <=0.7 || config.scale >= 2.0) return;
  let original = config.scale;
  config.scale = Math.sqrt(Math.pow(config.scale, 2) * (1 + diff));
  diff = config.scale - original;
  if ((diff < 0 && config.scale < 0.7) || (diff > 0 && config.scale > 2.5)) {
    config.scale = original;
    return;
  }
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
  adjustScale(0.2 * (event.deltaY > 0 ? -1 : 1), false);
});

function switchDimension() {
  config.dim = document.getElementById("dimension").value;
  waypoints.promise = waypoints.update();
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
  if (config.edit) {
    return;
  }
  if (config.rmenu) {
    hide("rmenu");
    hideParent("menu-toggle-availability");
    hideParent("menu-edit");
    showParent("menu-remove");
    hideParent("menu-add-waypoint");
    config.rmenu = false;
  } else {
    if (config.atWaypointChunk) {
      showParent("menu-toggle-availability");
      showParent("menu-edit");
      showParent("menu-remove");
    } else {
      showParent("menu-add-waypoint");
      hideParent("menu-remove");
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
    patch(config.auth, config.dim, ch.identifier, {
      available: !ch.available
    }).then(resp => {
      if (resp.status === 200) {
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
    if (name === ch.name || name === "" || name === null) {
      return;
    }
    patch(config.auth, config.dim, ch.identifier, {
      name
    }).then(resp => {
      if (resp.status === 200) {
        ch.name = name;
        render();
      }
    });
  }
}

function removeWaypoint() {
  toggleRmenu();
  if (config.auth === "") return;
  const ch = config.activeChunk;
  if (config.atWaypointChunk) {
    const color = randomColor();
    Delete(config.auth, config.dim, ch.identifier).then(resp => {
      if (resp.status === 200) {
        waypoints.map.delete(ch.identifier);
        render();
      }
    });
  }
}

function addWaypoint(x, z) {
  if (config.auth === "") {
    toggleRmenu();
    return;
  }
  if (typeof x === "undefined" || typeof z === "undefined") {
    if (config.atWaypointChunk) {
      return;
    }
    x = config.activeChunk.x;
    z = config.activeChunk.z;
  }
  editWaypoint(new Waypoint("New Waypoint", x, 80, z, randomColor(), true));
}
