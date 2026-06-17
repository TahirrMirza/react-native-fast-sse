package com.margelo.nitro.turbosse
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class TurboSse : HybridTurboSseSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
