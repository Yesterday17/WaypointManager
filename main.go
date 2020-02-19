package main

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"sync"
)

const (
	WaypointFile = "waypoints.json"
	StaticFolder = "static"
)

type Waypoint struct {
	Name  string `json:"name"`
	X     int    `json:"x"`
	Y     int    `json:"y"`
	Z     int    `json:"z"`
	Color string `json:"color"`
}

func (w Waypoint) String() string {
	return w.Name + strconv.Itoa(w.X) + strconv.Itoa(w.Y) + strconv.Itoa(w.Z) + w.Color
}

func (w Waypoint) Valid() bool {
	return w.Name != "" && w.Color != ""
}

func Map2Slice(m sync.Map) []Waypoint {
	var s []Waypoint
	m.Range(func(k, v interface{}) bool {
		//key := k.(string)
		value := v.(Waypoint)
		s = append(s, value)
		return true
	})
	return s
}

func SerializeWaypoints(m sync.Map) []byte {
	s := Map2Slice(m)
	data, _ := json.Marshal(s)
	return data
}

func LoadWaypoints(file string) (result sync.Map) {
	w := []Waypoint{}
	data, err := ioutil.ReadFile(file)
	if err == nil {
		err = json.Unmarshal(data, &w)
		if err != nil {
			log.Panic(err)
		}

		for _, v := range w {
			result.Store(v.String(), v)
		}
	}
	return
}

func SaveWaypoints(file string, m sync.Map) {
	err := ioutil.WriteFile(file, SerializeWaypoints(m), 0644)
	if err != nil {
		log.Panic(err)
	}
}

func GenWaypointByForm(f url.Values) (Waypoint, error) {
	x, err := strconv.Atoi(f.Get("x"))
	if err != nil {
		return Waypoint{}, err
	}

	y, err := strconv.Atoi(f.Get("y"))
	if err != nil {
		return Waypoint{}, err
	}

	z, err := strconv.Atoi(f.Get("z"))
	if err != nil {
		return Waypoint{}, err
	}

	wp := Waypoint{
		Name:  f.Get("name"),
		X:     x,
		Y:     y,
		Z:     z,
		Color: f.Get("color"),
	}

	if !wp.Valid() {
		return Waypoint{}, errors.New("invalid waypoint")
	}
	return wp, nil
}

func main() {
	if len(os.Args) == 1 {
		log.Panic("No auth_key provided.")
	}

	auth := os.Args[1]
	waypoints := LoadWaypoints(WaypointFile)

	http.HandleFunc("/api/get", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		_, _ = w.Write(SerializeWaypoints(waypoints))
	})

	http.HandleFunc("/api/add", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			w.WriteHeader(405)
			return
		}
		if r.Header.Get("WaypointAuth") != auth {
			w.WriteHeader(401)
			return
		}

		err := r.ParseForm()
		if err != nil {
			w.WriteHeader(500)
			_, _ = w.Write([]byte(err.Error()))
		}

		wp, err := GenWaypointByForm(r.Form)
		if err != nil {
			w.WriteHeader(400)
			_, _ = w.Write([]byte(err.Error()))
			return
		}

		if _, ok := waypoints.Load(wp.String()); ok {
			w.WriteHeader(500)
			return
		}

		waypoints.Store(wp.String(), wp)
		SaveWaypoints(WaypointFile, waypoints)
		w.WriteHeader(200)
	})

	http.HandleFunc("/api/del", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			w.WriteHeader(405)
			return
		}
		if r.Header.Get("WaypointAuth") != auth {
			w.WriteHeader(401)
			return
		}

		err := r.ParseForm()
		if err != nil {
			w.WriteHeader(500)
			_, _ = w.Write([]byte(err.Error()))
		}

		wp, err := GenWaypointByForm(r.Form)
		if err != nil {
			w.WriteHeader(400)
			_, _ = w.Write([]byte(err.Error()))
			return
		}

		if _, ok := waypoints.Load(wp.String()); !ok {
			w.WriteHeader(500)
			return
		}

		waypoints.Delete(wp.String())
		SaveWaypoints(WaypointFile, waypoints)
		w.WriteHeader(200)
	})

	http.Handle("/", http.FileServer(http.Dir(StaticFolder)))

	if err := http.ListenAndServe(":8102", nil); err != nil {
		log.Panic(err)
	}
}
