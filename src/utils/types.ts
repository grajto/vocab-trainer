import type { ReactNode } from 'react'

export type NavItem = {
  label: string
  href: string
  icon?: ReactNode
}

export type SetSummary = {
  id: string
  name: string
  cardCount: number
  updatedLabel: string
}

export type StudyCard = {
  id: string
  prompt: string
  answer: string
  options?: string[]
}
