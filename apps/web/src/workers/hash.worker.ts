import MD5 from 'crypto-js/md5'
import { stableStringify } from '@nav/utils'

self.onmessage = (e: MessageEvent) => {
  try {
    const data = e.data
    const canonicalString = stableStringify(data)
    const hash = MD5(canonicalString).toString()
    self.postMessage({ success: true, hash })
  } catch (error) {
    self.postMessage({ success: false, error: String(error) })
  }
}
