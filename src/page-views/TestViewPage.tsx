import { Card } from '@/src/components/Card'
import { Progress } from '@/src/components/Progress'

export function TestViewPageShell({ title, stepLabel, prompt, options, progress }: { title: string; stepLabel: string; prompt: string; options: string[]; progress: number }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-center text-3xl font-semibold text-vt-text">{title}</h1>
        <Progress value={progress} />
      </div>
      <Card className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm font-semibold text-vt-muted">Question</p>
          <p className="text-sm font-semibold text-vt-muted">{stepLabel}</p>
        </div>
        <p className="text-4xl font-semibold text-vt-text">{prompt}</p>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {options.map(option => (
            <button key={option} className="rounded-vt border border-vt-border bg-vt-surface px-4 py-4 text-left text-lg font-medium text-vt-text transition hover:border-vt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary">{option}</button>
          ))}
        </div>
      </Card>
    </div>
  )
}
