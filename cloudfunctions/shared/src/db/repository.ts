import { getCollection } from './cloudbase'

interface ListOptions {
  orderBy?: Array<{
    field: string
    order: 'asc' | 'desc'
  }>
  limit?: number
  skip?: number
}

export async function findOneByField(collectionName: string, field: string, value: unknown) {
  const result = await getCollection(collectionName)
    .where({ [field]: value })
    .limit(1)
    .get()

  return result.data[0] ?? null
}

export async function listByWhere(
  collectionName: string,
  where: Record<string, unknown> = {},
  options: ListOptions = {},
) {
  let query: any = Object.keys(where).length > 0
    ? getCollection(collectionName).where(where)
    : getCollection(collectionName)

  for (const orderBy of options.orderBy ?? []) {
    query = query.orderBy(orderBy.field, orderBy.order)
  }

  if (Number.isFinite(options.skip) && Number(options.skip) > 0) {
    query = query.skip(Number(options.skip))
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const result = await query.get()
  return result.data ?? []
}

export async function listDocuments(collectionName: string, options: ListOptions = {}) {
  return listByWhere(collectionName, {}, options)
}

export async function addDocument(collectionName: string, data: Record<string, unknown>) {
  return getCollection(collectionName).add({ data })
}

export async function updateDocumentById(collectionName: string, documentId: string, data: Record<string, unknown>) {
  return getCollection(collectionName).doc(documentId).update({ data })
}

export async function countByWhere(collectionName: string, where: Record<string, unknown> = {}) {
  const query: any = Object.keys(where).length > 0
    ? getCollection(collectionName).where(where)
    : getCollection(collectionName)

  return query.count()
}
