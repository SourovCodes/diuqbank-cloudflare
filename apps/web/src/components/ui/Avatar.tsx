const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
]

function colorFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return COLORS[h % COLORS.length]
}

export function Avatar({ name, image, size = 10 }: { name: string; image?: string | null; size?: number }) {
  const sizeClass = `h-${size} w-${size}`
  const textClass = size <= 8 ? 'text-sm' : 'text-base'
  if (image) {
    return <img src={image} alt={name} className={`${sizeClass} rounded-full object-cover`} />
  }
  return (
    <div className={`${sizeClass} ${colorFor(name)} ${textClass} flex shrink-0 items-center justify-center rounded-full font-bold`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
