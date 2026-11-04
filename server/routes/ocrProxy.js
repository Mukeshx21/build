import { Router } from "express"
import http from "node:http"

const router = Router()
const OCR_BASE_URL = (
  process.env.OCR_INTERNAL_URL ||
  process.env.VITE_OCR_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "")

router.use((req, res) => {
  const targetUrl = new URL(`${OCR_BASE_URL}${req.originalUrl || req.url}`)

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 8000,
    path: `${targetUrl.pathname}${targetUrl.search}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${targetUrl.hostname}:${targetUrl.port || 8000}`,
    },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({
        error:
          "Unable to reach the OCR service. Ensure the Python OCR service is running on port 8000.",
        detail: err.message,
      })
    }
  })

  req.pipe(proxyReq)
})

export default router
