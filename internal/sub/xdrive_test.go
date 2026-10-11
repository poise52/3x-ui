package sub

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/mhsanaei/3x-ui/v3/internal/database/model"
)

func TestXdriveJSONSubscriptionPreservesStorageConfiguration(t *testing.T) {
	svc := NewSubJsonService("", "", "", "", nil)
	raw := `{"network":"xdrive","security":"none","xdriveSettings":{"service":"template","remoteFolder":"shared","pollIntervalMs":300,"secrets":["user","password"],"template":{"flatten":true,"auth":{"type":"basic","username":"{secret0}","password":"{secret1}"},"put":{"method":"PUT","url":"https://storage.test/{folder}/{name}"},"get":{"method":"GET","url":"https://storage.test/{folder}/{name}"},"delete":{"method":"DELETE","url":"https://storage.test/{folder}/{name}"},"list":{"method":"PROPFIND","url":"https://storage.test/{folder}/","headers":{"Depth":"1"},"namesRegex":"<name>([^<]+)</name>"}}}}`
	stream := svc.streamData(raw, "")
	data, err := json.Marshal(stream)
	if err != nil {
		t.Fatal(err)
	}
	inbound := &model.Inbound{Protocol: model.VLESS, Port: 443, Listen: "storage.test", Settings: "{\"encryption\":\"none\"}"}
	generated := svc.genVless(&SubService{}, inbound, data, model.Client{ID: "11111111-2222-4333-8444-555555555555"}, "")
	var outbound map[string]any
	if err := json.Unmarshal(generated, &outbound); err != nil {
		t.Fatal(err)
	}
	var want map[string]any
	if err := json.Unmarshal([]byte(raw), &want); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(outbound["streamSettings"], want) {
		t.Fatalf("subscription stream = %#v, want %#v", outbound["streamSettings"], want)
	}
	inbound.StreamSettings = raw
	if link := (&SubService{}).GetLink(inbound, "drive@test"); link != "" {
		t.Fatalf("XDRIVE generated an incomplete share URI: %q", link)
	}
}
