/**
 * Extension-aware Link Component
 *
 * Automatically prefixes hrefs with extension base path when needed
 */

import Link from 'next/link'
import { ComponentProps } from 'react'
import { getNavigationPath } from '@/lib/navigation'

type LinkProps = ComponentProps<typeof Link>

export function ExtensionLink({ href, ...props }: LinkProps) {
  // Convert href to string and prefix it
  const prefixedHref = typeof href === 'string'
    ? getNavigationPath(href)
    : href

  return <Link href={prefixedHref} {...props} />
}
