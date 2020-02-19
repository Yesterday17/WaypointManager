// Utils
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor() {
  return (
    "#" + [0, 0, 0, 0, 0, 0].map(() => random(0, 15).toString(16)).join("")
  );
}

function loadStringFromPersist(key, def) {
  const result = localStorage.getItem(key);
  if (result) {
    return result;
  } else {
    return def;
  }
}

function loadNumberFromPersist(key, def) {
  const result = Number(loadStringFromPersist(key, def));
  if (!isNaN(result)) {
    return result;
  } else {
    return def;
  }
}

function persist(key, value) {
  localStorage.setItem(key, String(value));
}
