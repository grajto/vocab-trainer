import { RootPage } from '@payloadcms/next/views'
import { getPayload } from 'payload'
import { renderToReadableStream } from 'react-dom/server'

import configPromise from '../../../../src/payload/payload.config'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    segments?: string[]
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const payload = await getPayload({ config: configPromise })
  const searchParams = Object.fromEntries(new URL(request.url).searchParams)
  const element = await RootPage({
    config: configPromise,
    importMap: payload.importMap,
    params: Promise.resolve({ segments: params.segments ?? [] }),
    searchParams: Promise.resolve(searchParams),
  })
  const stream = await renderToReadableStream(element)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
