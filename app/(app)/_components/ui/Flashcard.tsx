export function Flashcard({ front, back }: { front: string; back?: string }) {
  return (
    <div className="flashcard">
      <div className="flashcard__front">{front}</div>
      {back ? <div className="flashcard__back">{back}</div> : null}
    </div>
  )
}
