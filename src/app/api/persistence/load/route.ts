import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PersistenceManager } from '@/infrastructure/persistence/PersistenceManager'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const key = url.searchParams.get('key')
    const strategy = url.searchParams.get('strategy')

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      )
    }

    // Create user-scoped key
    const scopedKey = `user:${session.user.id}:${key}`

    // Get persistence manager
    const persistence = PersistenceManager.getInstance()

    // Set strategy if provided
    if (strategy) {
      try {
        persistence.setStrategy(strategy as any)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid storage strategy' },
          { status: 400 }
        )
      }
    }

    // Load data
    const data = await persistence.load(scopedKey)

    if (!data) {
      return NextResponse.json(
        { error: 'Data not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data,
      key: scopedKey,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Persistence load error:', error)
    return NextResponse.json(
      { error: 'Failed to load data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}