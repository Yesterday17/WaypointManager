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

function adjustScale(diff) {
  config.scale += diff;
  config.recalculateNowChunks();
  config.persist();
  render();
}

document.addEventListener("wheel", event => {
  adjustScale(0.1 * (event.deltaY > 0 ? -1 : 1));
});

function switchDimension() {
  const dim = document.getElementById("dimension").value;
  persist("dim", dim);
  waypointPromise = loadWaypoints(dim);
  render();
}

function updateDimensionDropdown(dim) {
  document.getElementById("dimension").value = dim;
}

function toggleRmenu() {
  if (config.rmenu) {
    document.getElementById("rmenu").classList.add("hide");
    document.getElementById("menu-toggle-availbility").classList.add("hide");
    document.getElementById("menu-edit-color").classList.add("hide");
    document.getElementById("menu-add-waypoint").classList.add("hide");
    config.rmenu = false;
  } else {
    if (config.atWaypointChunk) {
      document
        .getElementById("menu-toggle-availbility")
        .classList.remove("hide");
      document.getElementById("menu-edit-color").classList.remove("hide");
    } else {
      document.getElementById("menu-add-waypoint").classList.remove("hide");
    }

    document.getElementById("rmenu").classList.remove("hide");
    document.getElementById("rmenu").style.top = event.y + "px";
    document.getElementById("rmenu").style.left = event.x + "px";
    config.rmenu = true;
  }
}

function toggleAvailbility() {
  //TODO: API
  toggleRmenu();
  if (config.atWaypointChunk) {
    config.activeChunk.available = !config.activeChunk.available;
    render();
  }
}

function editColor() {
  // TODO
}

function addWaypoint() {
  //TODO
}
