// UI-related code
function updateULChunkXZ(x, z) {
  document.getElementById("ul-chunk-xz").innerText = `X: ${x}, Z: ${z}`;
}

function showWaypointDetailBox(show) {
  const detail = document.getElementById("detail");
  if (show) {
    detail.classList.remove("hide");
  } else {
    detail.classList.add("hide");
  }
}

function updateWaypointDetailBox(p) {
  document.getElementById("detail-name").innerText = p.name;
  document.getElementById("detail-x").innerText = p.x;
  document.getElementById("detail-y").innerText = p.y;
  document.getElementById("detail-z").innerText = p.z;
}

function adjustScale(diff) {
  config.scale += diff;
  config.recalculateNowChunks();
  persist();
  render();
}
