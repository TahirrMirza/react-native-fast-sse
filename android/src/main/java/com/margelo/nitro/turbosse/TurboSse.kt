package com.margelo.nitro.turbosse
  
import com.facebook.proguard.annotations.DoNotStrip
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.util.concurrent.TimeUnit

@DoNotStrip
class TurboSse : HybridTurboSseSpec() {
  private val client = OkHttpClient.Builder()
    .readTimeout(0, TimeUnit.MILLISECONDS) // Important for SSE to not timeout
    .build()

  private var currentSource: EventSource? = null
  private var closed = false
  private var _lastEventId: String = ""
  
  override var readyState: Double = 0.0

  override fun connect(
    url: String, 
    method: String, 
    headers: Map<String, String>, 
    body: String,
    onOpen: () -> Unit,
    onMessage: (event: String, id: String, data: String) -> Unit,
    onError: (message: String) -> Unit,
    onClose: () -> Unit
  ) {
    closed = false
    readyState = 0.0

    val requestBuilder = Request.Builder().url(url)
    headers.forEach { (k, v) -> requestBuilder.addHeader(k, v) }
    
    if (method.uppercase() == "POST") {
      requestBuilder.post(body.toRequestBody())
    }

    currentSource = EventSources.createFactory(client)
      .newEventSource(requestBuilder.build(), object : EventSourceListener() {
        override fun onOpen(es: EventSource, response: Response) {
          if (closed) return
          readyState = 1.0
          onOpen()
        }
        override fun onEvent(es: EventSource, id: String?, type: String?, data: String) {
          if (closed) return
          if (!id.isNullOrEmpty()) _lastEventId = id
          onMessage(type ?: "message", _lastEventId, data.trimEnd('\r', '\n'))
        }
        override fun onFailure(es: EventSource, t: Throwable?, response: Response?) {
          if (closed) return
          readyState = 2.0
          onError(t?.message ?: "Connection failed")
        }
        override fun onClosed(es: EventSource) {
          if (closed) return
          readyState = 2.0
          onClose()
        }
      })
  }

  override fun disconnect() {
    closed = true
    readyState = 2.0
    currentSource?.cancel()
    currentSource = null
  }
}
