package main

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/grafov/bcast"
	"github.com/julienschmidt/httprouter"
)

type PushType int

const (
	PushTypeCreate PushType = iota
	PushTypeDelete
	PushTypePatch
)

type websocketClients struct {
	group       *bcast.Group
	broadcaster *bcast.Member
}

type pushWaypoint struct {
	PushType   PushType  `json:"type"`
	Identifier string    `json:"identifier"`
	Dim        string    `json:"dim"`
	Wp         *Waypoint `json:"waypoint"`
}

func (w *websocketClients) PushJSON(v pushWaypoint) {
	w.broadcaster.Send(v)
}

func (w *websocketClients) Register() *bcast.Member {
	return w.group.Join()
}

var wsClients = func() websocketClients {
	group := bcast.NewGroup()

	return websocketClients{
		group:       group,
		broadcaster: group.Join(),
	}
}()

var upgrader = websocket.Upgrader{}

func wsConnect(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	go func() {
		self := wsClients.Register()
		for {
			push, success := self.Recv().(pushWaypoint)
			if !success {
				break
			}

			err = c.WriteJSON(push)
			if err != nil {
				break
			}
		}
		_ = c.Close()
	}()
}
