import { useEffect, useState } from 'react'
import { isAdmin } from './adminService'

/**
 * Whether the signed-in user is an admin, as the server says. Any error (including the admin
 * migration not being applied yet) is treated as "no", so the entry point simply stays hidden.
 */
export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    isAdmin()
      .then((value) => !cancelled && setAdmin(value))
      .catch(() => !cancelled && setAdmin(false))
    return () => {
      cancelled = true
    }
  }, [])

  return admin
}
