import { redirect } from 'next/navigation'

// Interviews now live as a tab inside the Inbox.
export default function CandidateInterviewsRedirect() {
  redirect('/candidate/inbox?tab=interviews')
}
