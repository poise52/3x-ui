package maskcompat

import "strings"

// UpgradeXdnsFields preserves old XDNS entries across the v26.10.10 field renames.
func UpgradeXdnsFields(finalmask any) bool {
	changed := UpgradeLegacyXdns(finalmask)
	fm, _ := finalmask.(map[string]any)
	masks, _ := fm["udp"].([]any)
	for _, entry := range masks {
		mask, _ := entry.(map[string]any)
		kind, _ := mask["type"].(string)
		if !strings.EqualFold(kind, "xdns") {
			continue
		}
		settings, _ := mask["settings"].(map[string]any)
		domains, _ := settings["domains"].([]any)
		for _, entry := range domains {
			domain, _ := entry.(map[string]any)
			name, ok := domain["name"].(string)
			if !ok {
				continue
			}
			if _, exists := domain["names"]; !exists {
				domain["names"] = []any{name}
			}
			delete(domain, "name")
			changed = true
		}
		resolvers, _ := settings["resolvers"].([]any)
		for _, entry := range resolvers {
			resolver, _ := entry.(map[string]any)
			old, _ := resolver["settings"].(map[string]any)
			addr, ok := old["addr"].(string)
			if !ok {
				continue
			}
			if _, exists := resolver["addrs"]; !exists {
				kind, _ := resolver["type"].(string)
				if kind == "" {
					kind = "udp"
				}
				if !strings.Contains(addr, "://") {
					addr = kind + "://" + addr
				}
				resolver["addrs"] = []any{addr}
			}
			delete(resolver, "type")
			delete(resolver, "settings")
			changed = true
		}
	}
	return changed
}
