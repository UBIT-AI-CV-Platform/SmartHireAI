'use client'

import { useParams } from 'next/navigation'
import PublicProfileView from '@/components/social/PublicProfileView'

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(params.username || '')
  return <PublicProfileView username={username} />
}
