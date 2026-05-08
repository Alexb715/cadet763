package facebook

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const GraphVersion = "v21.0"
const GraphBaseURL = "https://graph.facebook.com/" + GraphVersion

type Client struct {
	HTTP        *http.Client
	PageID      string
	PageToken   string
	MirrorImages bool
}

func NewClient(pageID, pageToken string, mirrorImages bool) *Client {
	tr := &http.Transport{
		TLSClientConfig:     &tls.Config{MinVersion: tls.VersionTLS12},
		MaxIdleConns:        10,
		IdleConnTimeout:     30 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	}
	return &Client{
		HTTP:         &http.Client{Timeout: 15 * time.Second, Transport: tr},
		PageID:       pageID,
		PageToken:    pageToken,
		MirrorImages: mirrorImages,
	}
}

func (c *Client) Configured() bool {
	return c.PageID != "" && c.PageToken != ""
}

// FetchPage returns up to `limit` posts since the given unix timestamp.
func (c *Client) FetchPage(ctx context.Context, sinceUnix int64, limit int) (*PostsResponse, error) {
	if !c.Configured() {
		return nil, errors.New("facebook client not configured")
	}
	if limit <= 0 {
		limit = 25
	}
	q := url.Values{}
	q.Set("fields", "id,created_time,message,permalink_url,full_picture,shares,"+
		"reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)")
	q.Set("limit", fmt.Sprintf("%d", limit))
	if sinceUnix > 0 {
		q.Set("since", fmt.Sprintf("%d", sinceUnix))
	}
	q.Set("access_token", c.PageToken)

	endpoint := fmt.Sprintf("%s/%s/posts?%s", GraphBaseURL, url.PathEscape(c.PageID), q.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("graph http: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("graph %d: %s", resp.StatusCode, truncate(body, 256))
	}
	var out PostsResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("graph json: %w", err)
	}
	return &out, nil
}

// DownloadImage fetches a public CDN URL (the `full_picture` field). Returns
// the raw bytes and the declared content type. Capped to 12 MiB.
func (c *Client) DownloadImage(ctx context.Context, rawURL string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("download status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 12*1024*1024))
	if err != nil {
		return nil, "", err
	}
	return body, resp.Header.Get("Content-Type"), nil
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "..."
}

type PostsResponse struct {
	Data   []GraphPost `json:"data"`
	Paging struct {
		Next string `json:"next"`
	} `json:"paging"`
}

type GraphPost struct {
	ID           string `json:"id"`
	CreatedTime  string `json:"created_time"`
	Message      string `json:"message"`
	PermalinkURL string `json:"permalink_url"`
	FullPicture  string `json:"full_picture"`
	Shares       struct {
		Count int `json:"count"`
	} `json:"shares"`
	Reactions struct {
		Summary struct {
			TotalCount int `json:"total_count"`
		} `json:"summary"`
	} `json:"reactions"`
	Comments struct {
		Summary struct {
			TotalCount int `json:"total_count"`
		} `json:"summary"`
	} `json:"comments"`
}
