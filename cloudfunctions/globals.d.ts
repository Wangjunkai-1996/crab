declare module 'wx-server-sdk' {
  const cloud: any
  export = cloud
}

declare module 'node:crypto' {
  export const createHash: any
  export const randomBytes: any
  export const randomUUID: any
  export const scryptSync: any
  export const timingSafeEqual: any
}

declare const process: {
  env: Record<string, string | undefined>
}

declare const Buffer: any

