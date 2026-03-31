import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CharacterWithAuthor } from '@/types'

interface UseCharactersOptions {
  search?: string
  tags?: string[]
  publicOnly?: boolean
  authorId?: string
}

export function useCharacters(options: UseCharactersOptions = {}) {
  const { search = '', tags = [], publicOnly = false, authorId } = options

  return useQuery({
    queryKey: ['characters', { search, tags, publicOnly, authorId }],
    queryFn: async () => {
      let query = supabase
        .from('characters')
        .select(`
          *,
          author:profiles!characters_author_id_fkey(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (publicOnly) {
        query = query.eq('is_public', true)
      }

      if (authorId) {
        query = query.eq('author_id', authorId)
      }

      if (search.trim()) {
        const searchTerm = search.trim()
        
        // 1. Fetch available tags to find fuzzy matches
        let tagQuery = supabase.from('characters').select('tags')
        if (publicOnly) tagQuery = tagQuery.eq('is_public', true)
        if (authorId) tagQuery = tagQuery.eq('author_id', authorId)
        
        const { data: tagData } = await tagQuery
        const allTags = new Set<string>()
        ;(tagData as any[])?.forEach((row: any) => row.tags?.forEach((t: string) => allTags.add(t)))
        
        const matchingTags = Array.from(allTags).filter(t => 
          t.toLowerCase().includes(searchTerm.toLowerCase())
        )

        // 2. Build the OR query: name OR description OR tags
        let orQuery = `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        if (matchingTags.length > 0) {
          // PostgREST array overlap syntax
          const formattedTags = matchingTags.map(t => `"${t}"`).join(',')
          orQuery += `,tags.ov.{${formattedTags}}`
        }

        query = query.or(orQuery)
      }

      // Mandatory AND filter for clicked tags
      if (tags.length > 0) {
        query = query.contains('tags', tags)
      }

      const { data, error } = await query.limit(60)
      if (error) throw error
      return (data ?? []) as CharacterWithAuthor[]
    },
  })
}

export const deleteCharacter = async (charId: string) => {
  const { error } = await supabase.from('characters').delete().eq('id', charId)
  if (error) throw error
}

export function useAllPublicTags() {
  return useQuery({
    queryKey: ['public-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('tags')
        .eq('is_public', true)

      if (error) throw error

      const rows = (data ?? []) as { tags: string[] }[]
      const tagCounts = new Map<string, number>()
      for (const row of rows) {
        for (const tag of row.tags ?? []) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
        }
      }

      return Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag)
    },
    staleTime: 1000 * 10,
  })
}
