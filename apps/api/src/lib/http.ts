import axios from 'axios'
import axiosRetry from 'axios-retry'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { config } from '../config.js'

// Create a centralized Axios instance
export const httpClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': config.app?.name || 'DIY-Nav'
  }
})

// Axios automatically respects HTTP_PROXY and HTTPS_PROXY environment variables.
// No manual agent configuration is needed for Big Tech standard deployments.

// Configure Resilience (Retries)
axiosRetry(httpClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED'
  }
})
