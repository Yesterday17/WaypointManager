package main

import (
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

type JourneyMapWaypoint struct {
	Name       string `json:"name"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
	Z          int    `json:"z"`
	R          byte   `json:"r"`
	G          byte   `json:"g"`
	B          byte   `json:"b"`
	Enable     bool   `json:"enable"`
	Dimensions []int  `json:"dimensions"`
}

func RGB2Hex(r, g, b byte) string {
	return "#" + hex.EncodeToString([]byte{r, g, b})
}

func Bool2Int(b bool) (result int) {
	if b {
		result = 1
	}
	return
}

func Post(address string, dim int, auth string, wp url.Values) error {
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/dimension/%d", address, dim), strings.NewReader(wp.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("WaypointAuth", auth)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}

	fmt.Printf("[DIM-%d] %s [%d]\n", dim, wp.Get("name"), resp.StatusCode)
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if string(data) != "" {
		fmt.Printf("%s\n", string(data))
	}
	return resp.Body.Close()
}

func main() {
	var address, auth, folder string
	flag.StringVar(&address, "addr", "", "WaypointManager Server address.")
	flag.StringVar(&auth, "auth", "", "Auth token to modify server waypoints.")
	flag.StringVar(&folder, "folder", "", "Folder of JourneyMap waypoints.")
	flag.Parse()

	if address == "" || auth == "" || folder == "" {
		flag.PrintDefaults()
		return
	}

	files, err := ioutil.ReadDir(folder)
	if err != nil {
		log.Panic(err)
	}

	var waypoints []url.Values
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".json" && file.Name()[0] != '{' {
			data, err := ioutil.ReadFile(filepath.Join(folder, file.Name()))
			if err != nil {
				log.Println(err)
			}

			var w JourneyMapWaypoint
			err = json.Unmarshal(data, &w)
			if err != nil {
				log.Println(err)
			}

			wp := url.Values{}
			wp.Set("name", w.Name)
			wp.Set("x", fmt.Sprintf("%d", w.X))
			wp.Set("y", fmt.Sprintf("%d", w.Y))
			wp.Set("z", fmt.Sprintf("%d", w.Z))
			wp.Set("color", RGB2Hex(w.R, w.G, w.B))
			wp.Set("available", fmt.Sprintf("%d", Bool2Int(w.Enable)))

			for _, dim := range w.Dimensions {
				err := Post(address, dim, auth, wp)
				if err != nil {
					fmt.Println(err)
				}
			}

			waypoints = append(waypoints, wp)
		}
	}
}
