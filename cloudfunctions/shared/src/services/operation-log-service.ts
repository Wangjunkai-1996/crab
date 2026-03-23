import { COLLECTIONS } from '../constants/collections'
import { addDocument } from '../db/repository'
import { logger } from '../logger'
import { OperationLogInput } from '../types'
import { createResourceId } from '../utils/id'
import { now } from '../utils/time'

export async function writeOperationLog(input: OperationLogInput) {
  try {
    await addDocument(COLLECTIONS.OPERATION_LOGS, {
      logId: createResourceId('oplog'),
      operatorType: input.operatorType,
      operatorId: input.operatorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      requestId: input.requestId,
      beforeSnapshot: input.beforeSnapshot ?? null,
      afterSnapshot: input.afterSnapshot ?? null,
      remark: input.remark ?? '',
      createdAt: now(),
    })
  } catch (error) {
    logger.error('operation log write failed', {
      requestId: input.requestId,
      action: input.action,
      error,
    })
  }
}

