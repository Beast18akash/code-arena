import React from 'react'

const AuthLayout = ({ children } : { children: React.ReactNode }) => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-background'>
        {children}
    </div>
  )
}

export default AuthLayout