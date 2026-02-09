import OpenAI from 'openai'

export type OpenAIClientInfo = {
  client: OpenAI
  apiKey: string | undefined
  baseURL: string
}

export function createOpenAIClient(): OpenAIClientInfo {
  const apiKey = process.env.OPENAI_API_KEY
  const client = new OpenAI({
    apiKey,
    organization: process.env.OPENAI_ORG,
    project: process.env.OPENAI_PROJECT,
  })
  const baseURL = (client as unknown as { baseURL?: string }).baseURL ?? 'default'
  return { client, apiKey, baseURL }
}

export function logOpenAIEnv(info: OpenAIClientInfo) {
  const keyPrefix = info.apiKey ? `${info.apiKey.slice(0, 6)}***` : 'missing'
  console.info('[AI] env', {
    hasKey: !!info.apiKey,
    keyPrefix,
    keyLength: info.apiKey?.length ?? 0,
    org: process.env.OPENAI_ORG || null,
    project: process.env.OPENAI_PROJECT || null,
    baseURL: info.baseURL,
  })
}
