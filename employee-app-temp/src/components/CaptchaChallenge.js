import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

function safeScriptValue(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export default function CaptchaChallenge({
  siteKey,
  hostname,
  action,
  onToken,
}) {
  const html = useMemo(() => `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>
<body style="margin:0;padding:0;background:transparent">
<div id="turnstile"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
<script>
  const siteKey = ${safeScriptValue(siteKey)};
  const action = ${safeScriptValue(action)};
  function send(type, token) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, token: token || "" }));
  }
  function renderChallenge() {
    if (!window.turnstile || window.__vorldxTurnstileRendered) return;
    window.__vorldxTurnstileRendered = true;
    window.turnstile.render("#turnstile", {
      sitekey: siteKey,
      action,
      theme: "light",
      callback: (token) => send("token", token),
      "expired-callback": () => send("expired"),
      "error-callback": () => send("error")
    });
  }
  const timer = window.setInterval(() => {
    if (window.turnstile) {
      window.clearInterval(timer);
      renderChallenge();
    }
  }, 100);
  window.setTimeout(() => window.clearInterval(timer), 15000);
</script>
</body></html>`, [action, siteKey]);

  function handleMessage(event) {
    try {
      const result = JSON.parse(event.nativeEvent.data);
      onToken(result.type === "token" ? result.token : "");
    } catch {
      onToken("");
    }
  }

  if (!siteKey || !hostname) return null;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: `https://${hostname}/` }}
        originWhitelist={["https://*", "about:blank"]}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) =>
          request.url.startsWith(`https://${hostname}/`) ||
          request.url.startsWith("https://challenges.cloudflare.com/") ||
          request.url.startsWith("about:")
        }
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 74,
    overflow: "hidden",
    alignSelf: "flex-start",
    minWidth: 300,
    maxWidth: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
