import { redirect } from 'next/navigation'

// Network is folded into the Dashboard (search + Who to follow).
export default function CandidatePeopleRedirect() {
  redirect('/candidate')
}
