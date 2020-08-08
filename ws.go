package main

import (
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/grafov/bcast"
	"github.com/julienschmidt/httprouter"
)

type PushType int

const (
	PushTypeCreate PushType = iota
	PushTypeDelete
	PushTypePatch

	pingPeriod = (pongWait * 9) / 10
	pongWait   = 60 * time.Second
	writeWait  = 10 * time.Second
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
	go group.Broadcast(0)

	return websocketClients{
		group:       group,
		broadcaster: group.Join(),
	}
}()

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func wsConnect(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer func() {
			ticker.Stop()
			c.Close()
		}()

		self := wsClients.Register()
		for {
			select {
			case message, ok := <-self.Read:
				if !ok {
					c.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}

				c.SetWriteDeadline(time.Now().Add(writeWait))
				push, success := message.(pushWaypoint)
				if !success {
					return
				}

				err = c.WriteJSON(push)
				if err != nil {
					return
				}
			case <-ticker.C:
				if err := c.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
					return
				}
			}
		}
	}()

	defer c.Close()
	c.SetReadDeadline(time.Now().Add(pongWait))
	c.SetPongHandler(func(string) error {
		c.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			break
		}
	}
}
