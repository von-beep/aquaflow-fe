type StubPageProps = {
  title: string
  subtitle: string
}

export function StubPage({ title, subtitle }: StubPageProps) {
  return (
    <>
      <div className="pagehead">
        <div>
          <h2>{title}</h2>
          <div className="sub">{subtitle}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-b">
          <div className="empty">
            <b>Coming in a later phase</b>
            This screen is wired for navigation. Feature work starts in Phase 1+.
          </div>
        </div>
      </div>
    </>
  )
}
