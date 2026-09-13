import { Avatar, type ResolvedAvatar } from "@/domain/member/Avatar";
import type { SavedMember } from "@/domain/member/SavedMember";

const avatars = new Avatar();

export function MemberAvatarView({
  member,
  size = "md",
}: {
  member: SavedMember;
  size?: "sm" | "md";
}) {
  return <ResolvedAvatarView avatar={avatars.resolve(member)} name={member.name} size={size} />;
}

export function ResolvedAvatarView({
  avatar,
  name,
  size = "md",
}: {
  avatar: ResolvedAvatar;
  name: string;
  size?: "sm" | "md";
}) {
  const className = `member-avatar member-avatar-${size}`;
  if (avatar.mode === "preset") {
    return (
      <span className={`${className} is-preset`} title={avatar.label} aria-label={`${name}, ${avatar.label}`}>
        {avatar.glyph}
      </span>
    );
  }
  return (
    <span
      className={`${className} is-initials`}
      style={{ background: avatar.color }}
      aria-label={`${name}, initials ${avatar.initials}`}
    >
      {avatar.initials}
    </span>
  );
}
