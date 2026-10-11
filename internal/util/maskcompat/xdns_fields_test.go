package maskcompat

import (
	"reflect"
	"testing"
)

func TestUpgradeXdnsFieldsPreservesDomainsAndResolverProtocols(t *testing.T) {
	fm := map[string]any{"udp": []any{map[string]any{"type": "xdns", "settings": map[string]any{
		"domains":   []any{map[string]any{"name": "t.example.com", "types": []any{float64(16)}, "edns0": float64(1232)}},
		"resolvers": []any{map[string]any{"type": "tcp", "settings": map[string]any{"addr": "8.8.8.8:53"}}},
	}}}}
	if !UpgradeXdnsFields(fm) {
		t.Fatal("old XDNS fields were not upgraded")
	}
	settings := fm["udp"].([]any)[0].(map[string]any)["settings"].(map[string]any)
	want := map[string]any{
		"domains":   []any{map[string]any{"names": []any{"t.example.com"}, "types": []any{float64(16)}, "edns0": float64(1232)}},
		"resolvers": []any{map[string]any{"addrs": []any{"tcp://8.8.8.8:53"}}},
	}
	if !reflect.DeepEqual(settings, want) {
		t.Fatalf("settings = %#v, want %#v", settings, want)
	}
	if UpgradeXdnsFields(fm) {
		t.Fatal("upgrade must be idempotent")
	}
}
