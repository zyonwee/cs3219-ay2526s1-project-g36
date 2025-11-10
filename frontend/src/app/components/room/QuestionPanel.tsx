"use client";

type Props = {
  title?: string;
  description?: string;
  difficulty?: string;
  acceptanceRate?: number;
};

export default function QuestionPanel({ title, description, difficulty, acceptanceRate }: Props) {
  return (
    <div className="h-full w-full p-4" style={{ overflow: "auto" }}>
      <div className="border rounded-lg p-4 shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-2">{title ?? "Question"}</h2>
        {difficulty && (
          <div className="text-sm text-gray-600 mb-2">Difficulty: {difficulty}</div>
        )}
        {typeof acceptanceRate === "number" && (
          <div className="text-sm text-gray-600 mb-4">Acceptance Rate: {Math.round(acceptanceRate)}%</div>
        )}
        <div className="text-gray-800 whitespace-pre-wrap">
          {description ?? "No description available."}
        </div>
      </div>
    </div>
  );
}

