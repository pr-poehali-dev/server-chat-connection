export const IMAGE_AVATARS = [
  { id: 'otter', url: 'https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/1bc611de-d2f8-4d23-9f4d-1e37819484b6.jpg', label: 'Выдра' },
  { id: 'leopard', url: 'https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/1584b0ad-8554-4e87-b3c3-4b9535c9fee3.jpg', label: 'Барс' },
  { id: 'mink', url: 'https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/c72c86aa-562f-405b-bcfa-1278585f5616.jpg', label: 'Норка' },
  { id: 'deer', url: 'https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/9135f522-a761-4e29-9277-aaff660f47cf.jpg', label: 'Олень' },
  { id: 'fox', url: 'https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/ef3363b3-c219-49c4-aa5e-a5bb050f8c72.jpg', label: 'Лиса' },
];

interface AvatarImgProps {
  avatar: string;
  size?: number;
  className?: string;
}

export function AvatarImg({ avatar, size = 40, className = '' }: AvatarImgProps) {
  const img = IMAGE_AVATARS.find(a => a.id === avatar);
  const style = { width: size, height: size };

  if (img) {
    return (
      <div style={style} className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0 ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{avatar}</span>
    </div>
  );
}

export default AvatarImg;
