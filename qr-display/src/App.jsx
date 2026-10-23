
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import CaptchaWidget from "./CaptchaWidget.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function assertSecureApiUrl() {
  if (import.meta.env.PROD && !API_BASE.startsWith("https://")) {
    throw new Error("Set VITE_API_BASE_URL to the HTTPS production API URL.");
  }
}

function App() {
  const [qrToken, setQrToken] = useState("");
  const [qrError, setQrError] = useState("");
  const [secret, setSecret] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetVersion, setCaptchaResetVersion] = useState(0);
  const [captchaConfig, setCaptchaConfig] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/auth/captcha-config`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) throw new Error("Could not load security settings.");
        if (!cancelled) setCaptchaConfig(result.data);
      })
      .catch(() => {
        if (!cancelled) setCaptchaConfig({ enabled: true, siteKey: "", error: true });
      });
    return () => { cancelled = true; };
  }, []);

  async function handleDisplayLogin(event) {
    event.preventDefault();
    if (!captchaConfig || captchaConfig.error || (captchaConfig.enabled && !captchaToken)) {
      setQrError("Complete the CAPTCHA security check first.");
      return;
    }

    try {
      assertSecureApiUrl();
      setLoginBusy(true);
      setQrError("");
      const response = await fetch(`${API_BASE}/qr/display/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, captchaToken }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Display authentication failed.");
      }
      setSessionReady(true);
    } catch (error) {
      setQrError(error.message || "Display authentication failed.");
    } finally {
      setLoginBusy(false);
      setCaptchaToken("");
      setCaptchaResetVersion((version) => version + 1);
    }
  }

  useEffect(() => {
    if (!sessionReady) return undefined;
    let timer;
    let cancelled = false;

    async function refreshQR() {
      let shouldRetry = true;
      try {
        assertSecureApiUrl();
        const response = await fetch(`${API_BASE}/qr/display/generate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          shouldRetry = response.status === 429 || response.status >= 500;
          throw new Error(result.message || "Could not refresh QR.");
        }
        if (!cancelled) {
          setQrToken(result.data.token);
          setQrError("");
        }
      } catch (error) {
        if (!cancelled) setQrError(error.message || "QR refresh failed.");
      } finally {
        if (shouldRetry && !cancelled) timer = window.setTimeout(refreshQR, 15000);
      }
    }

    refreshQR();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionReady]);

  if (!sessionReady) {
    return (
      <main className="grid min-h-dvh place-items-center bg-emerald-50 p-5">
        <form onSubmit={handleDisplayLogin} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-7 shadow-xl ring-1 ring-emerald-100">
          <p className="text-xs font-bold tracking-widest text-emerald-700">VORLDX ATTENDANCE</p>
          <h1 className="text-2xl font-bold text-slate-900">QR display setup</h1>
          <p className="text-sm text-slate-500">Enter the display secret to start a secure session.</p>
          <label className="block text-sm font-medium text-slate-700">
            Display secret
            <input
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          {captchaConfig?.enabled && captchaConfig.siteKey && (
            <CaptchaWidget
              siteKey={captchaConfig.siteKey}
              action="qr_display_session"
              onToken={setCaptchaToken}
              resetVersion={captchaResetVersion}
            />
          )}
          {captchaConfig?.error && <p role="alert" className="text-sm text-red-600">Security check could not load. Refresh this page.</p>}
          {qrError && <p role="alert" className="text-sm text-red-600">{qrError}</p>}
          <button
            type="submit"
            disabled={loginBusy || !captchaConfig || captchaConfig.error || (captchaConfig.enabled && !captchaToken)}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loginBusy ? "Checking…" : "Start QR display"}
          </button>
        </form>
      </main>
    );
  }
  return (
    <main className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-x-hidden bg-white px-4 py-6 sm:px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden bg-linear-to-b from-white via-white to-emerald-50/50" />

      {/* Top-right mint wave */}
      <svg
        className="pointer-events-none absolute right-0 top-0 -z-10 h-[25dvh] w-full sm:h-[32dvh]"
        viewBox="0 0 1536 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="topWave" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D9FBEA" />
            <stop offset="100%" stopColor="#42D6A0" />
          </linearGradient>
        </defs>
        <path
          d="M1030 0 H1536 V90 C1400 110 1360 185 1230 190 C1110 196 1070 100 1030 0Z"
          fill="#E9FBF3"
        />
        <path
          d="M1180 0 H1536 V0 C1480 80 1400 145 1290 175 C1190 200 1140 165 1090 120 C1130 90 1160 42 1180 0Z"
          fill="url(#topWave)"
          opacity=".8"
        />
      </svg>

      {/* Left-side flowing wave */}
      <svg
        className="pointer-events-none absolute left-0 top-[10%] -z-10 h-[54dvh] w-[42%] sm:w-[34%]"
        viewBox="0 0 600 800"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="leftWave" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D8F9E9" />
            <stop offset="100%" stopColor="#51D8A5" />
          </linearGradient>
        </defs>
        <path
          d="M0 0 H160 C90 150 190 260 240 390 C300 550 210 620 0 700Z"
          fill="#E6FAF1"
        />
        <path
          d="M0 180 C120 260 160 420 310 450 C400 470 470 420 600 390 C470 500 360 600 240 570 C120 540 70 430 0 420Z"
          fill="url(#leftWave)"
          opacity=".85"
        />
      </svg>

      {/* Bottom flowing emerald waves */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[32dvh] w-full"
        viewBox="0 0 1536 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bottomWave" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#BFF5DE" />
            <stop offset="45%" stopColor="#4BDEA8" />
            <stop offset="100%" stopColor="#009C70" />
          </linearGradient>
          <linearGradient id="bottomLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#DFFBED" />
            <stop offset="100%" stopColor="#A5F0D0" />
          </linearGradient>
        </defs>
        <path
          d="M0 70 C200 0 300 210 500 210 C700 210 740 130 940 185 C1160 250 1330 100 1536 60 V320 H0Z"
          fill="url(#bottomLight)"
          opacity=".9"
        />
        <path
          d="M0 190 C180 115 260 280 470 270 C720 255 800 170 1010 230 C1220 290 1370 155 1536 120 V320 H0Z"
          fill="url(#bottomWave)"
          opacity=".9"
        />
        <path
          d="M0 260 C240 205 340 315 600 300 C840 285 990 220 1180 270 C1330 310 1450 245 1536 230 V320 H0Z"
          fill="#00996D"
          opacity=".35"
        />
        <path
          d="M0 225 C210 155 340 305 580 285 C850 260 980 210 1180 255 C1330 290 1450 225 1536 210"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          opacity=".85"
        />
      </svg>

      {/* Main composition */}
      <section className="relative flex w-full max-w-5xl flex-col items-center text-center">
        {/* Original VorldX logo */}
        <img
          src="/vorldx-logo.png"
          alt="VorldX"
          className="mb-2 h-[clamp(64px,10dvh,112px)] w-[clamp(64px,10dvh,112px)] shrink-0 object-contain sm:mb-3"
        />

        {/* Heading */}
        <h1 className="text-balance text-[clamp(25px,4.8dvh,52px)] font-extrabold leading-[1.12] tracking-tight text-slate-900">
          Employee{" "}
          <span className="bg-linear-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
            Attendance
          </span>
        </h1>

        {/* Instruction */}
        <p className="mt-3 max-w-2xl text-pretty text-[clamp(12px,1.9dvh,19px)] leading-relaxed text-slate-600 sm:mt-3">
          Scan this QR code from the employee mobile app to mark attendance.
        </p>

        {/* Main QR card */}
        <div className="relative mt-[clamp(16px,3.5dvh,36px)] w-[min(82vw,47dvh,460px)] shrink-0 rounded-[clamp(20px,3dvh,32px)] bg-white p-[clamp(12px,2.2dvh,24px)] shadow-[0_18px_65px_rgba(16,185,129,0.18)] ring-1 ring-emerald-50 sm:w-[min(76vw,47dvh,460px)]">
          {/* Green corner brackets */}
          <span className="pointer-events-none absolute left-[5%] top-[5%] h-[9%] w-[12%] rounded-tl-xl border-l-4 border-t-4 border-emerald-500 sm:border-l-[5px] sm:border-t-[5px]" />

          <span className="pointer-events-none absolute right-[5%] top-[5%] h-[9%] w-[12%] rounded-tr-xl border-r-4 border-t-4 border-emerald-500 sm:border-r-[5px] sm:border-t-[5px]" />

          <span className="pointer-events-none absolute bottom-[5%] left-[5%] h-[9%] w-[12%] rounded-bl-xl border-b-4 border-l-4 border-emerald-500 sm:border-b-[5px] sm:border-l-[5px]" />

          <span className="pointer-events-none absolute bottom-[5%] right-[5%] h-[9%] w-[12%] rounded-br-xl border-b-4 border-r-4 border-emerald-500 sm:border-b-[5px] sm:border-r-[5px]" />

          {/* QR scales in both directions */}
          <div className="relative aspect-square w-full">
            <QRCodeSVG
            value={qrToken || "VORLDX-LOADING"}
              level="H"
              marginSize={4}
              bgColor="#FFFFFF"
              fgColor="#101820"
              className="block h-full w-full"
              style={{ shapeRendering: "crispEdges" }}
            />

            {/* Original logo at the QR centre */}
            <div className="absolute left-1/2 top-1/2 flex h-[21%] w-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-[1.5%] ring-[5px] ring-white">
              <img
                src="/vorldx-logo.png"
                alt="VorldX logo"
                className="h-full w-full object-contain"
              />
            </div>
            {qrError && (
  <p role="alert" className="mt-3 text-sm text-red-600">
    {qrError}
  </p>
)}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
