import { type Plugin, type WebSocketClient } from "vite"

const virtualName = "virtual:runtime-error-overlay"

export function vitePluginErrorOverlay(
  options: {
    filter?: (error: Error) => boolean
    patchConsoleError?: boolean
  } = {}
): Plugin {
  return {
    name: "vite-plugin-error-overlay",
    apply: "serve",
    transformIndexHtml() {
      return [
        {
          tag: "script",
          // TODO: base?
          attrs: { type: "module", src: "/@id/__x00__" + virtualName },
        },
      ]
    },
    resolveId(source, _importer, _options) {
      return source === virtualName ? "\0" + virtualName : undefined
    },
    load(id, _options) {
      if (id === "\0" + virtualName) {
        return `(${clientScriptFn.toString()})(${JSON.stringify(options)})`
      }
      return
    },
    configureServer(server) {
      server.hot.on("custom:runtime-error", (...args: any[]) => {
        const [data, client] = args as [unknown, WebSocketClient]
        const error = Object.assign(new Error(), data)
        if (options?.filter?.(error) ?? true) {
          client.send({
            type: "error",
            err: {
              message: error.message,
              stack: error.stack ?? "", // TODO: solve sourcemap
            },
          })
        }
      })
    },
  }
}

function clientScriptFn(options: { patchConsoleError?: boolean }) {
  if (import.meta.hot) {
    import.meta.hot.on("vite:error", (payload) => {
      sendIframeErrorWithRetry(
        {
          type: "IFRAME_ERROR",
          error: {
            message: payload.err.message,
            stack: payload.err.stack,
            cause: "vite-build-error",
          },
          messageId: crypto.randomUUID(),
        },
        0
      )
    })

    window.addEventListener("error", (evt) => {
      sendError(evt.error)
    })

    window.addEventListener("unhandledrejection", (evt) => {
      sendError(evt.reason)
    })

    window.addEventListener("message", (evt) => {
      if (evt.data.type === "ACK") {
        const pendingMessages = new Map(
          Object.entries(JSON.parse(window.localStorage.getItem("pendingMessages") || "{}"))
        )
        pendingMessages.delete(evt.data.messageId)
        window.localStorage.setItem("pendingMessages", JSON.stringify(Object.fromEntries(pendingMessages)))
      }
    })

    // monkey-patch console.error to collect errors handled by error boundaries
    // https://github.com/facebook/react/blob/9defcd56bc3cd53ac2901ed93f29218007010434/packages/react-reconciler/src/ReactFiberErrorLogger.js#L24-L31
    // https://github.com/vercel/next.js/blob/904908cf33bda1dfc50d81a19f3fc60c2c20f8da/packages/next/src/client/components/react-dev-overlay/internal/helpers/hydration-error-info.ts#L56
    if (options.patchConsoleError) {
      const oldFn = console.error
      console.error = function (...args) {
        for (const arg of args) {
          if (arg instanceof Error) {
            sendError(arg)
          }
        }
        oldFn.apply(this, args)
      }
    }

    type EditorMessage = {
      type: string
      error?: { message: string; stack: string; cause: unknown }
      messageId?: string
    }

    async function sendIframeErrorWithRetry(payload: EditorMessage, retryCount: number) {
      const pendingMessagesData = window.localStorage.getItem("pendingMessages") || "{}"
      const pendingMessages = new Map(Object.entries(JSON.parse(pendingMessagesData)))

      if (pendingMessages.has(payload.messageId!)) {
        return
      }

      if (retryCount > 3) {
        return
      }

      pendingMessages.set(payload.messageId!, payload)
      window.localStorage.setItem("pendingMessages", JSON.stringify(Object.fromEntries(pendingMessages)))

      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
      window.parent.postMessage(payload, "*")
    }

    function sendError(e: unknown) {
      const error = e instanceof Error ? e : new Error("(unknown error)", { cause: e })
      const serialized = {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      }
      import.meta.hot?.send("custom:runtime-error", serialized)

      sendIframeErrorWithRetry(
        {
          type: "IFRAME_ERROR",
          error: serialized,
          messageId: crypto.randomUUID(),
        },
        0
      )
    }
  }
}
