"use client";

import { useState } from "react";

type ProblemTitleProps = {
  title: string;
  description: string;
  difficulty: string;
  acceptanceRate: string;
};

export default function ProblemTitle({
  title,
  description,
  difficulty,
  acceptanceRate,
}: ProblemTitleProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <h1 className="text-2xl font-bold cursor-pointer">{title}</h1>

      {hovered && (
        <div className="absolute left-0 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-10">
          <p className="text-sm text-gray-800">{description}</p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Difficulty:</strong> {difficulty}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Acceptance Rate:</strong> {acceptanceRate}
          </p>
        </div>
      )}
    </div>
  );
}
