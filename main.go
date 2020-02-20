package main

import (
	"encoding/json"
	"fmt"
	"github.com/julienschmidt/httprouter"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"sync"
)

const (
	WaypointFolder = "waypoints"
	StaticFolder   = "static"
)

type Waypoint struct {
	Name      string `json:"name"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Z         int    `json:"z"`
	Color     string `json:"color"`
	Available bool   `json:"available"`
}

func (w Waypoint) String() string {
	return fmt.Sprintf("%d/%d/%d", w.X/16, w.Y/16, w.Z/16)
}

func (w Waypoint) Valid() bool {
	return w.Name != "" && w.Color != ""
}

func Map2Slice(m *sync.Map) []Waypoint {
	var s []Waypoint
	m.Range(func(k, v interface{}) bool {
		//key := k.(string)
		value := v.(Waypoint)
		s = append(s, value)
		return true
	})
	return s
}

func SerializeWaypoints(m *sync.Map) []byte {
	s := Map2Slice(m)
	if s != nil {
		data, _ := json.Marshal(s)
		return data
	} else {
		return []byte("[]")
	}
}

func LoadWaypoints(file string) *sync.Map {
	var w []Waypoint
	data, err := ioutil.ReadFile(filepath.Join(WaypointFolder, file))
	if err != nil {
		if os.IsNotExist(err) {
			w = []Waypoint{}
		} else {
			log.Panic(err)
		}
	}
	err = json.Unmarshal(data, &w)
	if err != nil {
		log.Panic(err)
	}

	var result sync.Map
	for _, v := range w {
		result.Store(v.String(), v)
	}
	return &result
}

func SaveWaypoints(file string, m *sync.Map) {
	err := ioutil.WriteFile(filepath.Join(WaypointFolder, file+".json"), SerializeWaypoints(m), 0644)
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

	var available = true
	if f.Get("available") == "false" {
		available = false
	} else {
		a, err := strconv.Atoi(f.Get("available"))
		if err == nil && a == 0 {
			available = false
		}
	}

	wp := Waypoint{
		Name:      f.Get("name"),
		X:         x,
		Y:         y,
		Z:         z,
		Color:     f.Get("color"),
		Available: available,
	}
	return wp, nil
}

func main() {
	if len(os.Args) == 1 {
		log.Panic("No auth_key provided.")
	}

	auth := os.Args[1]
	dimensions := map[string]*sync.Map{}
	infos, err := ioutil.ReadDir(WaypointFolder)
	if err != nil {
		log.Panic(err)
	}
	for _, info := range infos {
		if !info.IsDir() && filepath.Ext(info.Name()) == ".json" {
			dimensions[info.Name()[0:len(info.Name())-5]] = LoadWaypoints(info.Name())
		}
	}

	router := httprouter.New()
	router.GET("/dimension", func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		var arr []string
		for key, _ := range dimensions {
			arr = append(arr, key)
		}
		data, _ := json.Marshal(arr)
		fmt.Fprintf(w, "%s", data)
	})
	router.GET("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if ok {
			fmt.Fprintf(w, "%s", SerializeWaypoints(waypoints))
		} else {
			fmt.Fprintf(w, "[]")
		}
	})
	router.POST("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if !ok {
			waypoints = &sync.Map{}
			dimensions[dim] = waypoints
		}
		if r.Header.Get("WaypointAuth") != auth {
			w.WriteHeader(401)
			return
		}

		err := r.ParseForm()
		if err != nil {
			w.WriteHeader(500)
			fmt.Fprintf(w, "%s", err.Error())
		}

		wp, err := GenWaypointByForm(r.Form)
		if err != nil {
			w.WriteHeader(400)
			fmt.Fprintf(w, "%s", err.Error())
			return
		}
		if !wp.Valid() {
			w.WriteHeader(400)
			fmt.Fprintf(w, "invalid waypoint")
			return
		}

		if _, ok := waypoints.Load(wp.String()); ok {
			w.WriteHeader(500)
			w.Write([]byte("waypoint already exists"))
			return
		}

		waypoints.Store(wp.String(), wp)
		SaveWaypoints(dim, waypoints)
	})
	router.DELETE("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if !ok {
			w.WriteHeader(400)
			return
		}

		if r.Header.Get("WaypointAuth") != auth {
			w.WriteHeader(401)
			return
		}

		identifier := r.Header.Get("Waypoint-Identifier")
		if identifier == "" {
			w.WriteHeader(400)
			return
		}

		if _, ok := waypoints.Load(identifier); !ok {
			w.WriteHeader(500)
			return
		}

		waypoints.Delete(identifier)
		SaveWaypoints(dim, waypoints)
		w.WriteHeader(200)
	})
	router.PATCH("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if !ok {
			w.WriteHeader(400)
			return
		}

		if r.Header.Get("WaypointAuth") != auth {
			w.WriteHeader(401)
			return
		}

		identifier := r.Header.Get("Waypoint-Identifier")
		if identifier == "" {
			w.WriteHeader(400)
			return
		}

		if _, ok := waypoints.Load(identifier); !ok {
			w.WriteHeader(500)
			return
		}

		err := r.ParseForm()
		if err != nil {
			w.WriteHeader(500)
			fmt.Fprintf(w, "%s", err.Error())
			return
		}

		wp, ok := waypoints.Load(identifier)
		if !ok {
			w.WriteHeader(404)
			return
		}

		waypoints.Delete(identifier)
		var waypoint = wp.(Waypoint)
		if r.Form.Get("name") != "" {
			waypoint.Name = r.Form.Get("name")
		}
		if r.Form.Get("available") != "" {
			waypoint.Available = r.Form.Get("available")
		}
		if r.Form.Get("color") != "" {
			waypoint.Color = r.Form.Get("color")
		}

		waypoints.Store(identifier, waypoint)
		SaveWaypoints(dim, waypoints)
		w.WriteHeader(200)
	})
	router.NotFound = http.FileServer(http.Dir(StaticFolder))

	fmt.Println("Server listening on :8102")
	log.Fatal(http.ListenAndServe(":8102", router))
}
