import { getPayload as _getPayload } from 'payload'
import config from '../payload/payload.config'

export async function getPayload() {
  return _getPayload({ config })
}
