package xray

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"golang.org/x/net/proxy"
)

func TestXrayAPI_E2E_XdriveVlessCarriesHTTP(t *testing.T) {
	bin := os.Getenv("XRAY_E2E_BINARY")
	if bin == "" {
		t.Skip("set XRAY_E2E_BINARY to run the real XDRIVE transport")
	}
	storage := t.TempDir()
	id := "11111111-2222-4333-8444-555555555555"
	stream := map[string]any{"network": "xdrive", "security": "none", "xdriveSettings": map[string]any{
		"service": "local", "remoteFolder": storage, "pollIntervalMs": 10, "flushIntervalMs": 10,
	}}
	server := startE2ECore(t, []any{map[string]any{
		"listen": "127.0.0.1", "port": freePort(t), "protocol": "vless", "tag": "storage",
		"settings":       map[string]any{"decryption": "none", "clients": []any{map[string]any{"id": id, "email": "drive@test"}}},
		"streamSettings": stream,
	}})
	if err := server.api.DelOutbound("direct"); err != nil {
		t.Fatal(err)
	}
	if err := server.api.AddOutbound([]byte(`{"tag":"direct","protocol":"freedom","settings":{"finalRules":[{"action":"allow","ip":["127.0.0.1/32"]}]}}`)); err != nil {
		t.Fatal(err)
	}
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/drive" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte("vless through XDRIVE shared storage"))
	}))
	defer origin.Close()
	port := freePort(t)
	config := map[string]any{
		"log":      map[string]any{"loglevel": "warning"},
		"inbounds": []any{map[string]any{"listen": "127.0.0.1", "port": port, "protocol": "socks", "settings": map[string]any{"auth": "noauth"}}},
		"outbounds": []any{map[string]any{"protocol": "vless", "settings": map[string]any{"vnext": []any{map[string]any{
			"address": "127.0.0.1", "port": 443, "users": []any{map[string]any{"id": id, "encryption": "none"}},
		}}}, "streamSettings": stream}},
	}
	data, err := json.Marshal(config)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "client.json")
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(bin, "-c", path)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cmd.Process.Kill(); cmd.Wait() })
	waitForPort(t, port)
	dialer, err := proxy.SOCKS5("tcp", fmt.Sprintf("127.0.0.1:%d", port), nil, proxy.Direct)
	if err != nil {
		t.Fatal(err)
	}
	contextDialer, ok := dialer.(proxy.ContextDialer)
	if !ok {
		t.Fatal("SOCKS dialer does not support contexts")
	}
	transport := &http.Transport{DialContext: contextDialer.DialContext}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 15 * time.Second}
	resp, err := client.Get(origin.URL + "/drive")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusOK || string(body) != "vless through XDRIVE shared storage" {
		t.Fatalf("response = %d %q", resp.StatusCode, body)
	}
}
