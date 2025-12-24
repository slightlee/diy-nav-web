/**
 * Storage Error Types
 * Custom error class for storage operations with typed error codes
 */

/**
 * Error codes for storage operations
 */
export enum StorageErrorCode {
  /** Configuration is invalid or missing required fields */
  CONFIGURATION_INVALID = 'CONFIGURATION_INVALID',
  /** Storage provider is not available or not supported */
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  /** File upload failed */
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  /** File not found in storage */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  /** File download failed */
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  /** File deletion failed */
  DELETE_FAILED = 'DELETE_FAILED',
  /** Provider does not support this operation */
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',
  /** Network or authentication error */
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Custom error class for storage operations
 * Provides typed error codes for better error handling
 *
 * @example
 * try {
 *   await storage.upload(key, data)
 * } catch (e) {
 *   if (e instanceof StorageError) {
 *     if (e.code === StorageErrorCode.UPLOAD_FAILED) {
 *       // Handle upload failure
 *     }
 *   }
 * }
 */
export class StorageError extends Error {
  readonly name = 'StorageError'

  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: Error
  ) {
    super(message)

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError)
    }
  }

  /**
   * Create a configuration error
   */
  static configInvalid(message: string): StorageError {
    return new StorageError(message, StorageErrorCode.CONFIGURATION_INVALID)
  }

  /**
   * Create a file not found error
   */
  static fileNotFound(key: string): StorageError {
    return new StorageError(`File not found: ${key}`, StorageErrorCode.FILE_NOT_FOUND)
  }

  /**
   * Create an upload failed error
   */
  static uploadFailed(key: string, cause?: Error): StorageError {
    return new StorageError(`Upload failed: ${key}`, StorageErrorCode.UPLOAD_FAILED, cause)
  }

  /**
   * Create an operation not supported error
   */
  static notSupported(operation: string, provider: string): StorageError {
    return new StorageError(
      `${operation} is not supported by ${provider} provider`,
      StorageErrorCode.OPERATION_NOT_SUPPORTED
    )
  }

  /**
   * Create a network/authentication error
   */
  static networkError(message: string, cause?: Error): StorageError {
    return new StorageError(message, StorageErrorCode.NETWORK_ERROR, cause)
  }
}

/**
 * Check if an error is a "not found" type error (404)
 * Works with WebDAV and S3 errors
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof StorageError) {
    return error.code === StorageErrorCode.FILE_NOT_FOUND
  }

  // Check for HTTP-like status codes (WebDAV, S3)
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    // WebDAV returns status 404
    if (err.status === 404 || err.statusCode === 404) {
      return true
    }
    // AWS S3 errors
    if (err.name === 'NotFound' || err.Code === 'NoSuchKey') {
      return true
    }
    // Check nested response
    if (typeof err.response === 'object' && err.response !== null) {
      const resp = err.response as Record<string, unknown>
      if (resp.status === 404 || resp.statusCode === 404) {
        return true
      }
    }
  }

  return false
}
