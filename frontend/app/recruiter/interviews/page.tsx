import { redirect } from 'next/navigation'

// Interviews now live as a tab inside the Inbox.
export default function RecruiterInterviewsRedirect() {
  redirect('/recruiter/inbox?tab=interviews')
}
