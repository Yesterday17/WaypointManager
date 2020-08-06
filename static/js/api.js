function wFetch(url, method, auth, identifier, body) {
  if (typeof body === "object") {
    const result = [];
    for (let key in body) {
      result.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(body[key])}`
      );
    }
    body = result.join("&");
  }

  return fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Waypoint-Auth": auth,
      "Waypoint-Identifier": identifier
    },
    body: body
  });
}

function patch(auth, dim, identifier, body) {
  return wFetch(`dimension/${dim}`, "PATCH", auth, identifier, body);
}

function post(auth, dim, identifier, body) {
  return wFetch(`dimension/${dim}`, "POST", auth, identifier, body);
}

function Delete(auth, dim, identifier) {
  return wFetch(`dimension/${dim}`, "DELETE", auth, identifier);
}
