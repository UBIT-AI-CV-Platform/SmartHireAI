import { redirect } from 'next/navigation'

// Feed is merged into the Dashboard.
export default function CandidateFeedRedirect() {
  redirect('/candidate')
}
