import { ERROR_CODES } from '../constants/error-codes'
import { AppError } from '../errors/app-error'
import { logger } from '../logger'
import { errorResponse, successResponse } from '../response'
import { ActionHandler, ActionMap, CloudFunctionRequest } from '../types'
import { getFallbackRequestId, normalizeRequest } from '../utils/request'

interface RouterOptions {
  functionName: string
  actions: ActionMap
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}

export function createActionRouter(options: RouterOptions) {
  return async function main(event: CloudFunctionRequest = {}) {
    let requestId = getFallbackRequestId(event)

    try {
      const request = normalizeRequest(event)
      requestId = request.requestId
      const handler = options.actions[request.action]

      logger.info('cloud function request received', {
        functionName: options.functionName,
        action: request.action,
        requestId,
        source: request.meta.source ?? '',
      })

      if (!handler) {
        throw new AppError({
          code: ERROR_CODES.ACTION_NOT_FOUND,
          message: `未支持的 action: ${request.action}`,
        })
      }

      const data = await handler(request)

      logger.info('cloud function request completed', {
        functionName: options.functionName,
        action: request.action,
        requestId,
      })

      return successResponse(data, requestId)
    } catch (error) {
      logger.error('cloud function request failed', {
        functionName: options.functionName,
        requestId,
        error: serializeError(error),
      })

      return errorResponse(error, requestId)
    }
  }
}

export function createNotImplementedHandler(functionName: string, action: string): ActionHandler {
  return async () => {
    throw new AppError({
      code: ERROR_CODES.NOT_IMPLEMENTED,
      message: `${functionName}.${action} 暂未实现`,
      data: {
        todoKey: `${functionName}.${action}`,
      },
    })
  }
}
