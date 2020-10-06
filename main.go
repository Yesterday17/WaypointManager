package main

import (
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/julienschmidt/httprouter"
)

const (
	WaypointFolder = "waypoints"
	StaticFolder   = "static"
)

var rnd = rand.NewSource(time.Now().Unix())

type Waypoint struct {
	Name      string `json:"name"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Z         int    `json:"z"`
	Color     string `json:"color"`
	Available bool   `json:"available"`
}

func (w Waypoint) String() string {
	return fmt.Sprintf("%d/%d", w.X>>4, w.Z>>4)
}

func (w Waypoint) Valid() bool {
	return w.Name != "" && w.Color != ""
}

func Map2Slice(m *sync.Map) []Waypoint {
	var s []Waypoint
	m.Range(func(k, v interface{}) bool {
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

func GetBoolFromString(str string) bool {
	if str == "false" {
		return false
	}
	a, err := strconv.Atoi(str)
	return err != nil || a == 1
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

	var color = f.Get("color")
	if color == "" {
		// Random color
		color = fmt.Sprintf("#%s", hex.EncodeToString([]byte{
			byte(rnd.Int63() % 256),
			byte(rnd.Int63() % 256),
			byte(rnd.Int63() % 256),
		}))
	}

	wp := Waypoint{
		Name:      f.Get("name"),
		X:         x,
		Y:         y,
		Z:         z,
		Color:     color,
		Available: GetBoolFromString(f.Get("available")),
	}
	return wp, nil
}

func main() {
	var auth, port, frontend string
	var cors bool
	flag.StringVar(&auth, "auth", "", "Auth key for managing waypoints.")
	flag.StringVar(&port, "port", "8102", "Port that WaypointManger listen.")
	flag.BoolVar(&cors, "cors", true, "Whether allow COR requests.")
	flag.StringVar(&frontend, "frontend", "", "Frontend site to redirect.")
	flag.Parse()

	if auth == "" {
		log.Panic("No auth_key provided.")
	}

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
		for key := range dimensions {
			arr = append(arr, key)
		}
		data, _ := json.Marshal(arr)
		if cors {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		fmt.Fprintf(w, "%s", data)
	})

	// Get waypoints
	router.GET("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if cors {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		if ok {
			fmt.Fprintf(w, "%s", SerializeWaypoints(waypoints))
		} else {
			fmt.Fprintf(w, "[]")
		}
	})

	// Create waypoint
	router.POST("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if !ok {
			waypoints = &sync.Map{}
			dimensions[dim] = waypoints
		}
		if r.Header.Get("Waypoint-Auth") != auth {
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

		if cors {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.WriteHeader(200)

		go wsClients.PushJSON(pushWaypoint{
			PushType:   PushTypeCreate,
			Identifier: wp.String(),
			Dim:        dim,
			Wp:         &wp,
		})
	})

	// Delete waypoint
	router.DELETE("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if !ok {
			w.WriteHeader(400)
			return
		}

		if r.Header.Get("Waypoint-Auth") != auth {
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

		if cors {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.WriteHeader(200)

		go wsClients.PushJSON(pushWaypoint{
			PushType:   PushTypeDelete,
			Identifier: identifier,
			Dim:        dim,
			Wp:         nil,
		})
	})

	// Patch waypoint
	router.PATCH("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dim := ps.ByName("dim")
		waypoints, ok := dimensions[dim]
		if !ok {
			w.WriteHeader(400)
			return
		}

		if r.Header.Get("Waypoint-Auth") != auth {
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
			var available = true
			if r.Form.Get("available") == "false" {
				available = false
			} else {
				available = GetBoolFromString(r.Form.Get("available"))
			}
			waypoint.Available = available
		}
		if r.Form.Get("color") != "" {
			waypoint.Color = r.Form.Get("color")
		}

		waypoints.Store(identifier, waypoint)
		SaveWaypoints(dim, waypoints)

		if cors {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.WriteHeader(200)

		go wsClients.PushJSON(pushWaypoint{
			PushType:   PushTypePatch,
			Identifier: identifier,
			Dim:        dim,
			Wp:         &waypoint,
		})
	})

	// Options
	router.OPTIONS("/dimension/:dim", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if cors {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, PATCH, DELETE, GET")
		w.Header().Set("Access-Control-Allow-Headers", "Waypoint-Auth, Waypoint-Identifier")
		w.Header().Set("Access-Control-Max-Age", "86400")
		w.WriteHeader(200)
	})

	// Listen websocket
	router.GET("/ws", wsConnect)

	if frontend == "" || !cors {
		// No frontend host provided or cors is disabled
		router.NotFound = http.FileServer(http.Dir(StaticFolder))
	} else {
		router.NotFound = http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
			request.URL.Host = frontend
			http.Redirect(writer, request, request.URL.String(), 301)
		})
	}

	fmt.Println("Server listening on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
