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
  if (p.name === "") {
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
