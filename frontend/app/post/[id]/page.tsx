'use client'

import { useParams } from 'next/navigation'
import SinglePostView from '@/components/social/SinglePostView'

export default function PostPage() {
  const params = useParams<{ id: string }>()
  return <SinglePostView postId={params.id} />
}
