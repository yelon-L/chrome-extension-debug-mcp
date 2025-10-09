---
trigger: always_on
---

1. 不要将以下的chrome kill掉.如果发现chrome关闭了, 使用以下命令来启动
```
google-chrome \
  --user-data-dir=/home/p/chrome-mcp-test \
  --no-first-run \
  --no-default-browser-check \
  --autoplay-policy=no-user-gesture-required \
  --remote-debugging-port=9222 \
  --disable-features=VizDisplayCompositor \
  http://127.0.0.1:8081/hls.html
```