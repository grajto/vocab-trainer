import { nextHandler } from '@payloadcms/next'
import config from '../../../src/payload/payload.config'

export const { GET, POST } = nextHandler({ config })
