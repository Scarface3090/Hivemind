
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-white">
      <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      <div className="text-sm text-gray-300">{message}</div>
    </div>
  )
}
