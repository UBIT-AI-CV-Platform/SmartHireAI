export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Recruiter portal shell — sidebar / topbar will be added when we build this side.
  return <div className="bg-background text-on-background min-h-screen">{children}</div>
}
