import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PersistenceManager } from '@/infrastructure/persistence/PersistenceManager'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { key, data, strategy } = await req.json()

    // Validate input
    if (!key || data === undefined) {
      return NextResponse.json(
        { error: 'Missing key or data' },
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
        persistence.setStrategy(strategy)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid storage strategy' },
          { status: 400 }
        )
      }
    }

    // Save data
    await persistence.save(scopedKey, data, true) // Immediate save for API calls

    return NextResponse.json({
      success: true,
      key: scopedKey,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Persistence save error:', error)
    return NextResponse.json(
      { error: 'Failed to save data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}