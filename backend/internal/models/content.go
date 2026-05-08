package models

import (
	"encoding/json"
	"errors"
	"fmt"
)

// ContentDocument is the editable site content. Stored as one JSON blob in the
// `content` table. Schema is intentionally loose: every leaf must be either a
// {en,fr} string pair, a {en,fr} array-of-strings pair, or a nested object
// whose leaves follow the same rule. Depth is capped to keep validation cheap.
const (
	MaxContentBytes = 256 * 1024
	MaxContentDepth = 4
)

func ValidateContent(raw []byte) error {
	if len(raw) > MaxContentBytes {
		return fmt.Errorf("content too large: %d bytes (max %d)", len(raw), MaxContentBytes)
	}
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return fmt.Errorf("content must be a JSON object: %w", err)
	}
	return validateNode(doc, 0)
}

func validateNode(v any, depth int) error {
	if depth > MaxContentDepth {
		return errors.New("content too deeply nested")
	}
	switch n := v.(type) {
	case map[string]any:
		// Two valid shapes for an object: a bilingual leaf {en,fr}, or a
		// container whose values are themselves valid nodes.
		if isBilingualLeaf(n) {
			return validateBilingualLeaf(n)
		}
		for _, child := range n {
			if err := validateNode(child, depth+1); err != nil {
				return err
			}
		}
		return nil
	case []any:
		for _, item := range n {
			if err := validateNode(item, depth+1); err != nil {
				return err
			}
		}
		return nil
	case string, float64, bool, nil:
		return nil
	default:
		return fmt.Errorf("unexpected content type %T", v)
	}
}

func isBilingualLeaf(m map[string]any) bool {
	if len(m) == 0 {
		return false
	}
	for k := range m {
		if k != "en" && k != "fr" {
			return false
		}
	}
	return true
}

func validateBilingualLeaf(m map[string]any) error {
	for lang, val := range m {
		switch v := val.(type) {
		case string:
			if len(v) > 16*1024 {
				return fmt.Errorf("content[%s] string too long", lang)
			}
		case []any:
			for i, item := range v {
				s, ok := item.(string)
				if !ok {
					return fmt.Errorf("content[%s][%d] must be string", lang, i)
				}
				if len(s) > 4*1024 {
					return fmt.Errorf("content[%s][%d] string too long", lang, i)
				}
			}
		case nil:
			// allow null leaves
		default:
			return fmt.Errorf("content[%s] must be string or string[]", lang)
		}
	}
	return nil
}
