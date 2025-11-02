"use client";
import { useCollaborativeDoc } from "../../../../hooks/useCollaborativeDoc";

export default function CommentPanel({ roomId, token }: { roomId: string; token: string }) {
  const { content, updateContent } = useCollaborativeDoc(roomId, token, "comments");

  return (
    <div className="border p-4 rounded-lg">
      <h2 className="font-semibold mb-2">Comments</h2>
      <textarea
        value={content}
        onChange={(e) => updateContent(e.target.value)}
        className="w-full h-40 border rounded-lg p-2 font-sans"
        placeholder="Leave comments..."
      />
    </div>
  );
}
