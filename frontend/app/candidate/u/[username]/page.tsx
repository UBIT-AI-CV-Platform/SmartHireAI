'use client'

import { useParams } from 'next/navigation'
import PublicProfileView from '@/components/social/PublicProfileView'

export default function CandidateProfilePage() {
  const params = useParams<{ username: string }>()
  return <PublicProfileView username={decodeURIComponent(params.username || '')} embedded />
}
